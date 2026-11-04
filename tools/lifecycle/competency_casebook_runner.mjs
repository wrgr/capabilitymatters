// Multi-scenario competency mediation demonstration. Authored policy fixture ONLY.
// Usage: node tools/lifecycle/competency_casebook_runner.mjs src/data/lifecycle/competency-casebook-v1.json
import fs from "node:fs";
export function runCasebook(book, seedList=[11,17,23,29]) {
 const axes=book.axes;
 function hash(obj){let s=JSON.stringify(obj),x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return (x>>>0).toString(16).padStart(8,"0")}
 function rand(seed,caseId,key){let s=`${seed}|${caseId}|${key}`,x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296}
 const entries=[],checks={budget_exceeded:0,unavailable_expert_actions:0,altered_freezes:0,unmatched_events:0,unauthorized_role_actions:0,missing_stress_levels:0};
 for(const c of book.cases)for(const seed of seedList)for(const cond of c.conditions) {
  const actors=Object.fromEntries(c.actors.map(a=>[a.id,a]));
  const transcript=[];const say=(actor,kind,text)=>transcript.push({id:"m"+String(transcript.length+1).padStart(3,"0"),actor,kind,text});
  say(cond.lead,"problem",c.public_brief);
  for(const voice of c.stakeholder_voices)say("stakeholder:"+voice.speaker,"evidence",voice.quote);
  const first=c.evidence[0];say(cond.lead,"evidence","The brief reports: "+first);
  const available=cond.consultable||[];
  let consulted=[];
  for(const id of available) {
   say(cond.lead,"consultation-question",`We have access to a ${actors[id].profession}. Should we request targeted expertise?`);
   if(rand(seed,c.id,"consult:"+id)<cond.consult_rate) {
    consulted.push(id);
    say(id,"consultation-response",`I can help within my assigned competencies; my advice must be checked against organizational resources and stakeholders.`);
   } else say(cond.lead,"access-not-used",`The available ${actors[id].profession} was not consulted; do not attribute their advice to this team.`);
  }
  const authorisedOwners=new Set([...c.actors.filter(a=>a.status==="embedded").map(a=>a.id),...consulted]);
  const proposals=[];
  for(const action of c.actions){
    if(!authorisedOwners.has(action.owner))continue;
    const p=Math.min(.98,action.prob+(cond.integration?.025:0));
    if(rand(seed,c.id,"proposal:"+action.id)<p){
      proposals.push(action);
      say(action.owner,"proposal",action.rationale);
    }
  }
  if(cond.integration){
    say(cond.lead,"integration","Before making commitments, name the learning/capability mechanism, human impacts, organizational goals, and remaining uncertainty separately.");
    say(cond.lead,"integration","We will record objections and tradeoffs without inventing expertise or altering specialist decisions.");
  }
  const ranked=proposals.map(a=>{
    const tagBonus=cond.integration ? a.tags.reduce((acc,t)=>acc+({fallback:.18,safety:.20,transfer:.18,access:.17,measurement:.14,workflow:.13,learning:.07,automation:-.20,efficiency:-.16}[t]||0),0) : 0;
    return {...a,score:a.priority+tagBonus+(rand(seed,c.id,"rank:"+a.id)-.5)*.66};
  }).sort((a,b)=>b.score-a.score);
  const decisions=[];let balance=c.budget;
  for(const a of ranked) {
    if(a.cost>balance)continue;
    balance-=a.cost;
    decisions.push({id:a.id,owner:a.owner,cost:a.cost,reason:a.rationale});
    say(a.owner,"decision",`Commit to ${a.id.replaceAll("_"," ")} at cost ${a.cost}. ${a.rationale}`);
  }
  const unresolved=c.hidden_hypotheses.map((x,i)=>({id:"u"+(i+1),question:"Has the team independently ruled out the possibility of "+x+"?",status:"unresolved/not-investigated"}));
  say(cond.lead,"freeze",`We freeze ${decisions.length} decisions, spend ${c.budget-balance} of ${c.budget} resource units, and leave causal uncertainty visible.`);
  const artifact={case_id:c.id,seed,condition:cond.id,available_team:[...authorisedOwners],consulted,actions:decisions,spent:c.budget-balance,unresolved};
  const before=hash(artifact);
  if(decisions.some(a=>!authorisedOwners.has(a.owner)))checks.unauthorized_role_actions++;
  if(decisions.some(a=>c.actors.find(x=>x.id===a.owner)?.status==="consultable"&&!consulted.includes(a.owner)))checks.unavailable_expert_actions++;
  if(artifact.spent>c.budget)checks.budget_exceeded++;
  const tests=[];
  for(const level of ["easy","medium","hard"]){
    const e=c.event_severity[level],state=c.base.slice();
    for(const a of decisions){
      const spec=c.actions.find(x=>x.id===a.id);
      spec.delta.forEach((n,i)=>state[i]+=n);
    }
    e.shock.forEach((n,i)=>state[i]+=n);
    const tags=new Set(decisions.flatMap(d=>c.actions.find(a=>a.id===d.id).tags));
    for(const t of tags)if(e.mitigations[t])e.mitigations[t].forEach((n,i)=>state[i]+=n);
    const jitter=Math.floor(rand(seed,c.id,"deployment:"+level)*5)-2;
    state[2]+=jitter;
    const values=Object.fromEntries(axes.map((a,i)=>[a,Math.round(Math.max(0,Math.min(150,state[i])))]));
    tests.push({difficulty:level,event:e.label,seed_key:hash([c.id,seed,level]),outcomes:values,artifact_hash:before,evidence_kind:"authored_surrogate"});
   }
  if(tests.length!==3)checks.missing_stress_levels++;
  if(hash(artifact)!==before)checks.altered_freezes++;
  const overlays=[
    {anchor:transcript.find(x=>x.kind==="evidence")?.id,annotation:"Which of these statements is evidence, and which is a stakeholder interpretation?"},
    {anchor:transcript.find(x=>x.kind==="consultation-question"||x.kind==="access-not-used")?.id||transcript.find(x=>x.kind==="proposal")?.id,annotation:"Does the team have relevant competence, use that competence, and integrate the result? These are different questions."},
    {anchor:transcript.find(x=>x.kind==="freeze")?.id,annotation:"Predict which unresolved problem will surface in a hard event before opening the test record."}
  ].filter(x=>x.anchor);
  entries.push({case_id:c.id,seed,condition:cond.id,condition_label:cond.label,consulted,proposals:proposals.map(a=>a.id),artifact,artifact_hash:before,transcript,overlays,tests});
 }
 for(const c of book.cases)for(const seed of seedList)for(const level of ["easy","medium","hard"]){
  const matching=entries.filter(e=>e.case_id===c.id&&e.seed===seed).map(e=>e.tests.find(t=>t.difficulty===level)?.seed_key);
  if(new Set(matching).size!==1)checks.unmatched_events++;
 }
 const summaries=[];
 for(const c of book.cases)for(const cond of c.conditions){
  const matches=entries.filter(x=>x.case_id===c.id&&x.condition===cond.id);
  const report={case_id:c.id,condition:cond.id,design_count:matches.length,consultation_rate:+(matches.filter(x=>x.consulted.length).length/matches.length).toFixed(3),average_spent:+(matches.reduce((a,b)=>a+b.artifact.spent,0)/matches.length).toFixed(2),hard_means:{}};
  for(const axis of axes)report.hard_means[axis]=+(matches.reduce((a,e)=>a+e.tests[2].outcomes[axis],0)/matches.length).toFixed(2);
  summaries.push(report);
 }
 const exemplars=entries.filter(e=>e.seed===seedList[0]);
 return {schema_version:"competency-multicase-observations-1",evidence_kind:"authored_policy_fixture",live_model_calls:0,human_participants:0,disclaimer:"All candidate actions, dialogue rules, and simulated outcomes are programmed. Not evidence of live-agent behavior, causal competency effects or human learning.",case_count:book.cases.length,designs:entries.length,stress_tests:entries.length*3,seeds:seedList,checks,summary:summaries,exemplars,entries};
}
if (process.argv[1]?.endsWith("competency_casebook_runner.mjs")) {
 const input=process.argv[2]||"src/data/lifecycle/competency-casebook-v1.json";
 const book=JSON.parse(fs.readFileSync(input,"utf8"));
 process.stdout.write(JSON.stringify(runCasebook(book),null,2)+"\n");
}
