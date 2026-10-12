"""Recover an actual implementation file from a timed-out tool step, without inventing its final reply."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
from engine import Journal,CodexProvider
from file_build import accept_file

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('run',type=Path);parser.add_argument('--ordinal',type=int,required=True);parser.add_argument('--export',type=Path,required=True);args=parser.parse_args()
    journal=Journal.reopen(args.run);ordinal=args.ordinal
    request=next(e for e in journal.events if e['kind']=='request' and e['payload'].get('delivery')=='scoped-files' and e['payload']['prompt'].find(f'file-build-input-{ordinal:03d}.json')>=0)
    workspace=journal.path/f'file-build-{ordinal:03d}';source_bytes=(workspace/'candidate.html').read_bytes();source=source_bytes.decode('utf-8')
    scripts=re.findall(r'<script(?:\s[^>]*)?>(.*?)</script\s*>',source,re.S|re.I)
    if not scripts:raise ValueError('No inline candidate JavaScript to inspect')
    check=workspace/'recovered-syntax-check.js';check.write_text('\n'.join(scripts))
    result=subprocess.run(['node','--check',str(check)],capture_output=True,text=True)
    if result.returncode:raise ValueError('Recovered candidate JavaScript syntax is invalid: '+result.stderr)
    tools=[];messages=[]
    for line in (journal.path/f'provider-{ordinal:03d}.jsonl').read_text().splitlines():
        e=json.loads(line);item=e.get('item',{})
        if e.get('type')=='item.completed' and item.get('type') in ('command_execution','file_change'):tools.append(item)
        if e.get('type')=='item.completed' and item.get('type')=='agent_message':messages.append(item.get('text',''))
    (workspace/'tool-record.json').write_text(json.dumps(tools,indent=2,ensure_ascii=False))
    source_hash=hashlib.sha256(source_bytes).hexdigest()
    delivery=journal.append('verification','build','implementation',{'status':'implementation_source_recovered','implementation_request_seq':request['seq'],
        'failure_seq':journal.events[-1]['seq'],'generated_files':{'candidate.html':source_hash},'source_sha256':source_hash,'tool_records':len(tools),
        'public_progress_messages':messages,'checks':{'independent_javascript_syntax':'Passed node --check on the recovered inline source.'},
        'message':'The implementation-agent tool step wrote an actual candidate file and retained tool actions, but reached its deadline before returning a final structured contribution or build report. The unchanged file is recovered for orchestrator review; no final model reply is invented. An independent Node syntax check passed. Browser behavior, human approval and field outcomes remain unverified.'})
    run=accept_file(journal,CodexProvider(),delivery,source)
    from product import write_product
    write_product(run,journal.path/'product')
    args.export.write_text(json.dumps(run,indent=2,ensure_ascii=False))
    print(json.dumps({'run_directory':str(journal.path),'source_bytes':len(source_bytes),'events':len(journal.events),'status':journal.events[-1]['payload']['status']}))
