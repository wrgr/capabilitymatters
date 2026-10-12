"""Focused implementation correction of a retained file, followed by orchestrator review."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import time
from engine import Journal,CodexProvider,SCHEMA,validate_response,digest,CACHE
from file_build import accept_file

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('run',type=Path);parser.add_argument('--source',type=Path,required=True);parser.add_argument('--export',type=Path,required=True);args=parser.parse_args()
    journal=Journal.reopen(args.run);review=next(e for e in reversed(journal.events) if e['kind']=='decision' and e['stage']=='build')
    if review['payload']['response']['revisit_stage']!='build':raise ValueError('No recorded Build correction requested')
    ordinal=sum(e['kind']=='request' for e in journal.events)+1;workspace=journal.path/f'file-repair-{ordinal:03d}';workspace.mkdir();shutil.copyfile(args.source,workspace/'candidate.html')
    packet=journal.path/f'file-repair-input-{ordinal:03d}.json';packet.write_text(json.dumps({'review_seq':review['seq'],'review':review['payload']['response'],'role':journal.run['role_profiles']['roles']['implementation']},indent=2))
    schema=journal.path/'contribution-schema.json';schema.write_text(json.dumps(SCHEMA));output=journal.path/f'response-{ordinal:03d}.json'
    prompt=f'''You are the Implementation specialist. This is a focused correction, not a redesign. Read only candidate.html in this workspace and the review packet at {packet}. Implement the exact blocking correction requested at event {review['seq']}: use the packet's acceptance checks and exact blocking defect as the scope. The latest review supersedes earlier correction instructions. Preserve cancellation, the existing learner journey, fictional case facts, agency, recovery and complete paper alternative. Do not add grading or change the rest of the product.
Use file and shell tools only here; no browser, network, installs, external assets or unrelated files. A check.js/helper is permitted. Run node --check on the actual updated inline script. If practical, test the coupled-control logic in a small offline helper without claiming browser checks. Write BUILD_REPORT.md with the exact correction and checks/gaps. Return the contribution schema with prototype_html empty; your source is candidate.html. Keep final message and artifact_body concise, below 1500 characters. evidence_refs should cite event {review['seq']}. No human approval, learner result, field finding or credential is established.'''
    request=journal.append('request','build','implementation',{'prompt':prompt,'trigger_seq':review['seq'],'delivery':'scoped-file-correction'})
    provider=CodexProvider();command=[provider.executable,'exec','--ephemeral','--sandbox','workspace-write','--skip-git-repo-check','--color','never','--json','-C',str(workspace),'--output-schema',str(schema),'-o',str(output),'-'];started=time.monotonic()
    try:
        with (journal.path/f'provider-{ordinal:03d}.jsonl').open('w') as receipt,(journal.path/f'provider-{ordinal:03d}.stderr.txt').open('w') as errors:
            result=subprocess.run(command,input=prompt,text=True,stdout=receipt,stderr=errors,timeout=240)
        if result.returncode:raise RuntimeError('Focused file correction did not complete; inspect retained receipt')
        response=json.loads(output.read_text());validate_response(response,len(journal.events))
        if response['prototype_html'] or review['seq'] not in response['evidence_refs']:raise ValueError('Correction must cite the review and keep source in its file')
        source_bytes=(workspace/'candidate.html').read_bytes();source=source_bytes.decode();sha=hashlib.sha256(source_bytes).hexdigest()
        tools=[]
        for line in (journal.path/f'provider-{ordinal:03d}.jsonl').read_text().splitlines():
            e=json.loads(line);it=e.get('item',{})
            if e.get('type')=='item.completed' and it.get('type') in ('command_execution','file_change'):tools.append(it)
        (workspace/'tool-record.json').write_text(json.dumps(tools,indent=2))
        key=digest({'prompt':prompt,'response':response,'source_sha256':sha});CACHE.mkdir(parents=True,exist_ok=True);(CACHE/(key+'.json')).write_text(json.dumps(response));(CACHE/(key+'.html')).write_bytes(source_bytes)
        meta={'provider':'codex-cli-files','model_requested':'configured default','elapsed_seconds':format(time.monotonic()-started,'.3f'),'receipt':f'provider-{ordinal:03d}.jsonl','response_file':output.name,'source_sha256':sha,'cache_key':key,'response_hash':digest(response),'tool_records':len(tools)}
        (CACHE/(key+'.prov.json')).write_text(json.dumps(meta,indent=2))
        contribution=journal.append('contribution','build','implementation',{'response':response,'provider':meta,'request_seq':request['seq'],'hypothetical':False,'generated_files':{'candidate.html':sha,'BUILD_REPORT.md':hashlib.sha256((workspace/'BUILD_REPORT.md').read_bytes()).hexdigest()}})
        print(f'Focused correction recorded #{contribution["seq"]}: {workspace}',flush=True)
        run=accept_file(journal,provider,contribution,source)
        from product import write_product
        write_product(run,journal.path/'product');args.export.write_text(json.dumps(run,indent=2,ensure_ascii=False));print(json.dumps({'run_directory':str(journal.path),'events':len(journal.events),'workspace':str(workspace)}))
    except Exception as error:
        if journal.events[-1]['kind']!='failure':journal.append('failure','build','implementation',{'message':str(error),'error_type':type(error).__name__,'request_seq':request['seq']})
        raise
