/** Genuine OpenAI model-call team conversations, not the authored policy fixture.
 * Run: node tools/lifecycle/live_competency_agents.mjs --case ai_dispatch_logistics --condition integrated --turns 12 --out live-evidence
 * A user-facing ChatGPT subscription is not, by itself, an API credential.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
const sha = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const assert = (b,m) => { if(!b) throw Error(m); };
const str={type:'string'}, arr=x=>({type:'array',items:x});
const obj=p=>({type:'object',additionalProperties:false,properties:p,required:Object.keys(p)});
const TURN=obj({to:str,kind:{type:'string',enum:['question','answer','proposal','objection','reply','consult_request','decision']},speech:str,evidence_refs:arr(str),expert_claims:arr(str),proposed_action:str,cost:{type:'integer'},followup_question:str});
const FREEZE=obj({diagnosis:str,interventions:arr(obj({source_turn:str,owner:str,action:str,cost:{type:'integer'},rationale:str,acceptance_test:str})),unresolved_assumptions:arr(str),evidence_plan:arr(str),rejected_alternatives:arr(str)});
const EVENT=obj({event_interpretation:str,actions_supported_by_frozen_plan:arr(str),unsupported_behaviors:arr(str),plausible_sequence:arr(str),limitations:str});
const REVIEW=obj({summary:str,dimensions:arr(obj({axis:{type:'string',enum:['capability','human_conditions','organizational_performance','resilience']},rating:{type:'string',enum:['strong','mixed','fragile','unknown']},evidence:str,limitation:str})),process_observations:arr(str),potential_compensation_or_authority_violations:arr(str),unobserved_outcomes:arr(str)});
const packets={
  ai_dispatch_logistics:{
    ops:['Supervisors disagree about shift-level override and escalation authority.','Operations cannot suspend a full shift for training.'],
    analyst:['The denominator and event recording changed after rollout, confounding the apparent error increase.','Override annotations are incomplete in some records.'],
    trainer:['Current onboarding relies mainly on guided interface walkthroughs.','No reliable delayed unassisted assessment has been collected.'],
    scientist:['Changed-case unassisted transfer requires a distinct task from assisted practice.','Completion and speed do not establish independent judgment.']
  },
  benefits_service:{
    director:['Management rewards closure speed, while repeat contact creates hidden work.','Staffing for assisted service is constrained.'],
    policy:['Eligibility decisions and policy interpretation require authorized review.','Ambiguous claims must not be represented as automatic final determinations.'],
    hcc:['Current design research underrepresents people who abandon the interface.','Some applicants mistake a completed page for a resolved claim.'],
    analyst:['The dashboard omits some abandoned cases and return contacts.','Case complexity is unevenly represented.'],
    access:['Language support requires testing with affected users rather than assumed translation adequacy.','Some applicants need a non-digital or assisted route.']
  },
  controlroom_readiness:{
    safety:['Stale sensors can make a confident prioritization unsafe.','Operators retain explicit stop and escalation authority.'],
    operator:['New operators rarely diagnose ambiguous alarms without AI ranking.','Experienced staff notice contradictory cues not documented in training.'],
    systems:['The training simulator safely injects sensor staleness and communications loss.','Fallback and recovery behavior are not yet fully documented.'],
    trainer:['Existing exercises reward alarm acknowledgement speed.','A short guided practice lab is feasible.'],
    scientist:['Guided initial performance is not evidence of delayed transfer.','Varied unassisted diagnosis requires additional time and assessment.']
  }
};
function write(dir,name,value){fs.writeFileSync(path.join(dir,name),JSON.stringify(value,null,2)+'\n');}
export function prepare(book,caseId,conditionId){
  const c=book.cases.find(x=>x.id===caseId); assert(c,'Unknown case '+caseId);
  const condition=c.conditions.find(x=>x.id===conditionId);assert(condition,'Unknown condition '+conditionId);
  const roles=Object.fromEntries(c.actors.map(x=>[x.id,x]));
  const core=c.actors.filter(x=>x.status==='embedded').map(x=>x.id);
  const consultantIds=condition.consultable||[];
  assert(core.includes(condition.lead),'Nonembedded lead');
  assert(consultantIds.every(x=>roles[x]?.status==='consultable'),'Invalid consultable participant');
  const evidence=c.evidence.map((text,i)=>({id:'E'+(i+1),text}));
  const stakeholders=c.stakeholder_voices.map((x,i)=>({id:'S'+(i+1),speaker:x.speaker,text:x.quote}));
  const publicCase={id:c.id,title:c.title,brief:c.public_brief,evidence,stakeholders,budget:c.budget};
  // NEVER pass action-policy menu, effects, hidden hypotheses or test events to design agents.
  return {c,condition,roles,core,consultantIds,evidence,stakeholders,publicCase};
}
export function packetFor(run,actor,dialogue,active){
  const person=run.roles[actor];
  assert(person,'Unknown actor');
  const deep=Object.entries(person.competencies||{}).filter(([,v])=>v>=.7).map(([k])=>k);
  const allowed=[...new Set([...active,...run.consultantIds])].filter(x=>x!==actor);
  const packet={
    scenario:run.publicCase,
    identity:{id:actor,profession:person.profession,project_role:person.project_role,
      proficiencies:person.competencies,specialist_authority_scopes:deep},
    private_evidence_for_this_participant_only:packets[run.c.id]?.[actor]||[],
    addressable_colleagues:allowed.map(x=>({id:x,profession:run.roles[x].profession,
      role:run.roles[x].project_role,availability:active.includes(x)?'participating':'consultable_not_invited'})),
    public_conversation:dialogue.map(x=>({id:x.id,speaker:x.speaker,to:x.to,kind:x.kind,
      speech:x.speech,evidence_refs:x.evidence_refs,proposed_action:x.proposed_action,cost:x.cost,
      followup_question:x.followup_question}))
  };
  const instructions=[
    'You are an authentic professional participant in a fictional multidisciplinary design meeting. Speak in NATURAL LANGUAGE to one named colleague, responding to what they actually said.',
    'Do not submit a generic essay or mimic a checklist. Ask questions, offer evidence, challenge claims, address disagreement, and negotiate realistic constraints.',
    'You see public case facts, your OWN private evidence, and what colleagues have said publicly, but no private colleague packets or hidden test conditions.',
    'Your profession is not an exclusive domain. You have broad background familiarity, but may assert specialist authority only in specialist_authority_scopes; outside them, ask or qualify.',
    'Do not fabricate data or simulate expert signoff on behalf of unavailable people. You may recommend that specialized input is necessary.',
    'To request available but not-yet-invited expertise, send kind=consult_request and to=the consultant ID. No one else may silently speak for them.',
    'Do not presume training is the intervention. Explore technical, workflow, policy, learning, human and organizational explanations as appropriate.',
    'For kind=proposal put a concrete action in proposed_action and a nonnegative integer resource cost in cost. Otherwise set proposed_action to an empty string and cost to zero.',
    'Use only public evidence IDs E1.. or stakeholder IDs S1.. in evidence_refs. If your private evidence matters, explain it naturally in speech so the team can evaluate it.',
    'The JSON fields are only a transport envelope; speech should be 2-5 responsive, real-language sentences. Address exactly one colleague. No tools or web requests.',
    ...(run.condition.integration?['This team has an integration PROCEDURE (not added subject-matter expertise): check how the plan relates to capability, human conditions, organizational goals, evidence, and unresolved disagreements.']:[])
  ].join('\n');
  return {packet,instructions,deep,allowed};
}
export function checkTurn(run,speaker,active,scope,turn){
  assert(scope.allowed.includes(turn.to),'Invalid addressee');
  assert(typeof turn.speech==='string'&&turn.speech.trim().length>=25,'Insufficient substantive speech');
  assert(Array.isArray(turn.expert_claims)&&turn.expert_claims.every(x=>scope.deep.includes(x)),
    'Specialist authority claim exceeds assigned depth');
  const refs=new Set([...run.evidence,...run.stakeholders].map(x=>x.id));
  assert(Array.isArray(turn.evidence_refs)&&turn.evidence_refs.every(x=>refs.has(x)),'Invalid evidence reference');
  if(turn.kind==='consult_request') assert(run.consultantIds.includes(turn.to)&&!active.includes(turn.to),'Unauthorized consultant activation');
  else assert(active.includes(turn.to),'Uninvited consultant cannot participate');
  if(turn.kind==='proposal')assert(turn.proposed_action.trim().length>=12&&turn.cost>=0,'Invalid concrete proposal');
}
export class Provider{
  constructor(model,key){this.model=model;this.key=key;}
  async ask(prompt,resultSchema,name,receiptFile){
    assert(this.key,'Missing OPENAI_API_KEY; no model calls');
    const req={model:this.model,store:false,max_output_tokens:4000,reasoning:{effort:'low'},
      input:[{role:'developer',content:prompt.instructions},{role:'user',content:JSON.stringify(prompt.packet)}],
      text:{format:{type:'json_schema',name,strict:true,schema:resultSchema}}};
    const started=Date.now(),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),180000);
    let status,raw;
    try{const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',
      headers:{'Content-Type':'application/json',Authorization:'Bearer '+this.key},
      body:JSON.stringify(req),signal:controller.signal});status=r.status;raw=await r.text();}
    finally{clearTimeout(timeout);}
    if(status<200||status>=300){
      write(path.dirname(receiptFile),path.basename(receiptFile),{status:'provider_error',http_status:status,request_hash:sha(req),response_hash:sha(raw||''),response_excerpt:raw?.slice(0,500)});
      throw Error('OpenAI HTTP '+status+'; receipt retained');
    }
    const result=JSON.parse(raw);
    const outputs=(result.output||[]).flatMap(x=>(x.content||[]).filter(y=>y.type==='output_text').map(y=>y.text));
    assert(outputs.length,'Model returned no structured text');
    const payload=JSON.parse(outputs.join('\n'));
    write(path.dirname(receiptFile),path.basename(receiptFile),{status:'completed',
      response_id:result.id,model:result.model,usage:result.usage,request_hash:sha(req),
      response_hash:sha(raw),elapsed_ms:Date.now()-started,
      authorized_instructions:prompt.instructions,input:prompt.packet,output:payload});
    return payload;
  }
}
export async function runLive(book,{caseId='ai_dispatch_logistics',conditionId='integrated',
  turns=12,folder='live-competency-evidence',provider,model='gpt-6.1-sol'}){
  assert(provider,'No live provider supplied');
  assert(Number.isInteger(turns)&&turns>=5&&turns<=24,'Turn budget 5 to 24');
  const run=prepare(book,caseId,conditionId);
  fs.mkdirSync(folder,{recursive:true});
  const active=[...run.core],conversation=[],audit=[],consultations=[];
  const journal={schema:'live-competency-record-1',evidence_kind:'fresh_openai_responses',
    case_id:caseId,condition_id:conditionId,model_requested:model,status:'initialized',
    accepted_turns:conversation,active,consultations,audit,freeze:null,deployment:[]};
  write(folder,'journal.json',journal);
  let current=run.condition.lead;
  try{
    for(let i=0;i<turns;i++){
      const scope=packetFor(run,current,conversation,active);
      const turn=await provider.ask({instructions:scope.instructions,packet:scope.packet},TURN,'participant_turn',
        path.join(folder,'call-'+String(i+1).padStart(3,'0')+'.json'));
      checkTurn(run,current,active,scope,turn);
      const entry={id:'T'+String(i+1).padStart(3,'0'),speaker:current,...turn};
      conversation.push(entry);
      audit.push({turn_id:entry.id,declared_scopes:scope.deep,claimed_scopes:entry.expert_claims,
        private_packet_exposed_to:[current],semantic_compensation_not_eliminated:true});
      if(turn.kind==='consult_request'){active.push(turn.to);consultations.push({source_turn:entry.id,requester:current,consultant:turn.to});}
      current=turn.to;
      journal.status='conversation_in_progress';write(folder,'journal.json',journal);
    }
    const publicProposals=conversation.filter(x=>x.kind==='proposal').map(x=>({turn_id:x.id,
      owner:x.speaker,action:x.proposed_action,cost:x.cost,rationale:x.speech,evidence_refs:x.evidence_refs}));
    const freezePrompt={instructions:[
      'You are the accountable project lead freezing a decision after this finite meeting.',
      'Use ONLY actions documented in publicProposals, with their exact source turn and owner. Do not invent an expert, contribution, or repair.',
      'You may exclude proposals and preserve unresolved issues. Total cost cannot exceed the budget.',
      'Include a realistic non-training intervention if supported; a bounded incomplete solution is acceptable.',
      'No one may alter the frozen intervention during the following stress tests.'
    ].join('\n'),packet:{scenario:run.publicCase,lead:run.condition.lead,
      full_conversation:conversation,publicProposals,active_owners:active,budget:run.c.budget}};
    const artifact=await provider.ask(freezePrompt,FREEZE,'freeze_intervention',path.join(folder,'call-freeze.json'));
    let spent=0;
    for(const action of artifact.interventions){
      const origin=publicProposals.find(x=>x.turn_id===action.source_turn);
      assert(origin&&origin.owner===action.owner,'Intervention not attributable to a public proposal from its owner');
      assert(active.includes(action.owner),'Inactive intervention owner');
      assert(action.action.trim().length>10,'No concrete action');
      assert(Number.isInteger(action.cost)&&action.cost>=0,'Invalid cost');
      spent+=action.cost;
    }
    assert(spent<=run.c.budget,'Budget violation; freeze refused');
    journal.freeze={artifact,sha256:sha(artifact),spent,status:'immutable'};
    journal.status='frozen';write(folder,'frozen.json',journal.freeze);write(folder,'journal.json',journal);
    for(const difficulty of ['easy','medium','hard']){
      const event=run.c.event_severity[difficulty],context={scenario:run.publicCase,
        event:{difficulty,title:event.label},frozen_intervention:artifact,artifact_hash:journal.freeze.sha256};
      const observed=await provider.ask({instructions:[
        'You are a separate simulated-world observer, NOT a member of the design team.',
        'Reason from the specific frozen intervention under this event. Do not add interventions, improve the plan, or make numerical performance claims.',
        'Describe plausible events and unknowns, not real observations of workers or learners.'
      ].join('\n'),packet:context},EVENT,'event_observation',path.join(folder,'call-event-'+difficulty+'.json'));
      const review=await provider.ask({instructions:[
        'You are an independent expert evaluator in learning sciences and systems engineering.',
        'Evaluate process and simulated result independently from evidence. No design repair and no invented human outcomes.',
        'Report all four outcome axes separately, including unknown when evidence is insufficient.',
        'Flag cross-domain compensation if the public conversation shows substantive specialist decisions without authorized access or support.'
      ].join('\n'),packet:{...context,public_conversation:conversation,model_event_observation:observed}},
      REVIEW,'expert_evaluation',path.join(folder,'call-review-'+difficulty+'.json'));
      const axes=review.dimensions.map(x=>x.axis);
      assert(axes.length===4&&new Set(axes).size===4,'Judge omitted an outcome dimension');
      journal.deployment.push({difficulty,event:event.label,freeze_sha256:journal.freeze.sha256,
        evidence_kind:'model_simulated_consequences_not_actual_deployment',observation:observed,review});
      write(folder,'journal.json',journal);
    }
    assert(journal.deployment.every(x=>x.freeze_sha256===journal.freeze.sha256),'Freeze drift');
    journal.status='completed';write(folder,'journal.json',journal);
    return journal;
  }catch(err){journal.status='failed';journal.error={message:String(err.message).slice(0,700),
    accepted_turns:conversation.length};write(folder,'journal.json',journal);throw err;}
}
function flag(k,d){const i=process.argv.indexOf(k);return i<0?d:process.argv[i+1];}
if(process.argv[1]?.endsWith('live_competency_agents.mjs')){
  const folder=flag('--out','live-competency-evidence');
  fs.mkdirSync(folder,{recursive:true});
  const key=process.env.OPENAI_API_KEY;
  if(!key){
    write(folder,'launch-status.json',{status:'blocked_no_api_credential',model_calls:0,
      explanation:'Neither Codex login nor ChatGPT plan automatically gives this GitHub Action OPENAI_API_KEY.'});
    console.error('LIVE RUN BLOCKED: OPENAI_API_KEY not configured');process.exitCode=3;
  }else{
    const book=JSON.parse(fs.readFileSync('src/data/lifecycle/competency-casebook-v1.json','utf8'));
    const model=process.env.OPENAI_MODEL||'gpt-6.1-sol';
    const provider=new Provider(model,key);
    try{const result=await runLive(book,{caseId:flag('--case','ai_dispatch_logistics'),
      conditionId:flag('--condition','integrated'),turns:Number(flag('--turns','12')),
      folder,provider,model});
      console.log(JSON.stringify({status:result.status,case:result.case_id,condition:result.condition_id,
        model:result.model_requested,dialogue_turns:result.accepted_turns.length,
        specialist_consultations:result.consultations.length,frozen_actions:result.freeze.artifact.interventions.length,
        test_events:result.deployment.length}));
    }catch(err){console.error('Live experiment failed; artifacts and receipts retained:',err.message);process.exitCode=1;}
  }
}
