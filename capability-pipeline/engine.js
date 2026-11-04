/* Runs the published Capability Pipeline engine component. */
/* Deterministic, side-effect-free teaching engine. No network or model calls. */
(function(root){
'use strict';
const VERSION='0.1.0';
const METRICS=['fit','readiness','evidence','trust','agency','transfer','completion','gap'];
const KEYS=['budget','days',...METRICS];
const SENSORS=['completion','transfer','gap','agency'];
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
const assert=(ok,msg)=>{if(!ok)throw new Error(msg);};
// A stable keyed draw avoids dependence on DOM actions or the number of UI renders.
// Same seed + turn + channel gives the same underlying random draw across branches.
function draw(seed,turn,channel){
 let h=2166136261; const s=String(seed)+'|'+turn+'|'+channel;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}
 h+=0x6D2B79F5; let t=h; t=Math.imul(t^(t>>>15),t|1);
 t^=t+Math.imul(t^(t>>>7),t|61);
 return ((t^(t>>>14))>>>0)/4294967296;
}
function validate(c){
 assert(c&&typeof c==='object'&&!Array.isArray(c),'Scenario must be an object.');
 assert(c.schemaVersion===1,'Unsupported scenario schema.');
 for(const k of ['title','brief','mission','disclaimer']) assert(typeof c[k]==='string'&&c[k].trim().length>0&&c[k].length<=10000,`Invalid ${k}.`);
 assert(c.initial&&c.base,'Initial state and base probabilities are required.');
 for(const k of KEYS)assert(Number.isFinite(c.initial[k])&&c.initial[k]>=0&&c.initial[k]<=(METRICS.includes(k)?100:10000),`Invalid initial ${k}.`);
 for(const k of ['useful','setback','eventRate'])assert(Number.isFinite(c.base[k])&&c.base[k]>=0&&c.base[k]<=1,`Invalid probability: ${k}.`);
 assert(c.base.useful+c.base.setback<=1,'Useful + setback base probabilities must be at most 1.');
 assert(Number.isInteger(c.maxTurns)&&c.maxTurns>=8&&c.maxTurns<=100,'maxTurns must be an integer from 8 to 100.');
 assert(Number.isInteger(c.revision)&&c.revision>=1,'Revision must be a positive integer.');
 const stageIds=['understand','model','design','build','instrument','deploy','evaluate','refine'];
 assert(Array.isArray(c.steps)&&c.steps.length===8,'Keep the eight canonical steps.');
 function effects(e){assert(e&&typeof e==='object'&&!Array.isArray(e),'Effects must be an object.');for(const[k,v]of Object.entries(e))assert(KEYS.includes(k)&&Number.isFinite(v)&&Math.abs(v)<=100,`Invalid effect: ${k}.`);}
 function cost(v,name){assert(Number.isFinite(v)&&v>=0&&v<=1000,`Invalid ${name}.`);}
 c.steps.forEach((s,i)=>{
  assert(s.id===stageIds[i],`Step ${i+1} must be ${stageIds[i]}.`);
  assert(typeof s.prompt==='string'&&s.prompt.trim()&&s.prompt.length<=10000,'Step prompt is required.');
  assert(Array.isArray(s.actions)&&s.actions.length>=2&&s.actions.length<=8,'Each step needs 2–8 actions.');
  const ids=new Set();
  s.actions.forEach(a=>{
   assert(typeof a.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(a.id)&&!ids.has(a.id),'Action IDs must be unique within a step and use letters, digits, - or _.'); ids.add(a.id);
   assert(typeof a.label==='string'&&a.label.trim()&&a.label.length<=200,'Action label required (max 200 characters).');
   assert(typeof a.detail==='string'&&a.detail.length<=4000,'Action detail must be text.');
   cost(a.cost,'cost');cost(a.days,'days');assert((c.realismModel==='constraints-v3'&&['decline','pause'].includes(a.kind)?a.days>=0:a.days>=1),'Every action must consume at least one day.');effects(a.effects);
   assert(a.odds&&typeof a.odds==='object','Action odds must be an object.');
   for(const[k,v]of Object.entries(a.odds))assert(['useful','setback'].includes(k)&&Number.isFinite(v)&&Math.abs(v)<=0.5,'Odds modifiers must be between -0.5 and 0.5.');
   if(a.sensors)assert(Array.isArray(a.sensors)&&a.sensors.every(x=>SENSORS.includes(x)),'Unknown sensor.');
   if(a.next!==undefined)assert(a.next==='finish'||(Number.isInteger(a.next)&&a.next>=0&&a.next<=i+1&&a.next<8),'An action may advance one step, revisit an earlier one, or finish.');
  });
 });
 assert(Array.isArray(c.events)&&c.events.length<=40,'Use at most 40 events.'); const ids=new Set();
 c.events.forEach(e=>{
  assert(typeof e.id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(e.id)&&!ids.has(e.id),'Invalid or duplicate event ID.');ids.add(e.id);
  for(const k of ['title','text','containment'])assert(typeof e[k]==='string'&&e[k].length<=4000,`Event ${k} must be text.`);
  assert(Number.isInteger(e.from)&&Number.isInteger(e.to)&&e.from>=0&&e.to<=7&&e.from<=e.to,'Invalid event stage range.');
  assert(Number.isFinite(e.weight)&&e.weight>=0&&e.weight<=100,'Invalid event weight.');
  assert(e.riskMetric===undefined||['fit','readiness','evidence','trust','agency'].includes(e.riskMetric),'Unknown event risk metric.');
  assert(Number.isInteger(e.target)&&e.target>=0&&e.target<=e.from,'An event must return to a stage already reached.');
  assert(typeof e.required==='boolean','Event required must be boolean.'); effects(e.effects);
  cost(e.containCost,'containment cost');cost(e.containDays,'containment days');
  if(e.invalidate)assert(Array.isArray(e.invalidate)&&e.invalidate.every(x=>SENSORS.includes(x)),'Invalid sensor invalidation.');
  if(e.requiresSensor)assert(SENSORS.includes(e.requiresSensor),'Invalid required sensor.');
  if(e.repairSensor)assert(SENSORS.includes(e.repairSensor),'Invalid repair sensor.');
 });
 if(c.realismModel){assert(['adverse','central','favorable'].includes(c.sensitivity),'Choose an uncertainty scenario.');assert(c.context&&['vendor','workflow'].includes(c.context.lever),'Invalid initial lever.');for(const k of ['localPilot','wideRollout','vendorInternals','independentAssessment'])assert(typeof c.context[k]==='boolean','Invalid permission setting.');for(const step of c.steps)for(const a of step.actions){if(a.chance)assert(a.chance.length===4&&a.chance.every(x=>Number.isFinite(x)&&x>=0&&x<=1)&&a.chance[0]<=a.chance[1]&&a.chance[2]<=a.chance[3]&&a.chance[1]+a.chance[3]<=1,'Invalid action probability bounds.');}}
 if(c.eventModel==='contextual-v2'){
  c.events.forEach(e=>{assert(Number.isFinite(e.probability)&&e.probability>=0&&e.probability<=1,'Event baseline must be between 0 and 1.');assert(Number.isFinite(e.riskIncrease)&&e.riskIncrease>=0&&e.riskIncrease<=1,'Event risk increase must be between 0 and 1.');assert(e.riskMetric||e.riskIncrease===0,'Risk increase needs a named mechanism metric.');});
  for(let i=0;i<8;i++)assert(c.events.filter(e=>i>=e.from&&i<=e.to).reduce((n,e)=>n+e.probability+e.riskIncrease,0)*(c.realismModel?1.5:1)<=1+1e-9,'Maximum event probabilities at each step must total at most 100%.');
 }
 return true;
}
function initial(c,seed){validate(c);assert(typeof seed==='string'&&seed.trim()&&seed.length<=100,'Use a seed of 1–100 characters.');
 return {...(c.realismModel?{context:clone(c.context)}:{}),seed,turn:0,stage:0,values:clone(c.initial),sensors:[],observations:{},visited:[],pending:null,ended:false,endReason:'',debrief:''};}
function apply(v,e){const r=clone(v);for(const[k,x]of Object.entries(e||{}))r[k]=METRICS.includes(k)?clamp(r[k]+x):Math.max(0,r[k]+x);return r;}
function delta(before,after){return Object.fromEntries(KEYS.filter(k=>after[k]!==before[k]).map(k=>[k,+(after[k]-before[k]).toFixed(3)]));}
function action(c,s,id){const a=c.steps[s.stage].actions.find(a=>a.id===id);assert(a,'Select a valid action.');return a;}
function blocked(s,a){return (a.needs||[]).filter(k=>k==='vendorControl'?!(s.context&& (s.context.vendorInternals||s.context.lever==='workflow')):!(s.context&&s.context[k])).map(k=>({vendorControl:'Vendor control is unavailable. Pivot to a teacher-controlled workflow.',wideRollout:'No authority for wider rollout. Negotiate, keep a local scope, pause or decline.',independentAssessment:'Independent assessment access is unavailable.'}[k]||k)).join(' ');}
function affordable(s,a){return !blocked(s,a)&&s.values.budget>=a.cost&&s.values.days>=a.days;}
function plannedValues(s,a){return apply(s.values,{...a.effects,budget:-a.cost+(a.effects.budget||0),days:-a.days+(a.effects.days||0)});}
function probabilities(c,s,a){
 const v=plannedValues(s,a);
 if(c.realismModel==='constraints-v3'){
  if(['decline','pause','pivot','conclude'].includes(a.kind))return {useful:1,mixed:0,setback:0,decision:true};
  const bounds=a.chance||[0.35,0.70,0.10,0.25];
  const t={adverse:0,central:0.5,favorable:1}[c.sensitivity];
  const relevant=[v.fit,v.fit,(v.fit+v.agency)/2,v.readiness,v.evidence,v.readiness,(v.evidence+v.fit)/2,v.fit][s.stage];
  const adjustment=a.kind==='negotiate'?0:(relevant-50)*0.001;
  const useful=clamp(bounds[0]+t*(bounds[1]-bounds[0])+adjustment+(a.odds.useful||0),0,1);
  const setback=clamp(bounds[3]-t*(bounds[3]-bounds[2])-adjustment+(a.odds.setback||0),0,1-useful);
  return {useful,mixed:1-useful-setback,setback,bounds,sensitivity:c.sensitivity,relevant,adjustment};
 }
 // Teaching assumptions, not fitted coefficients. Relevant preparation influences the odds.
 const relevant=[v.fit,v.fit,(v.fit+v.agency)/2,v.readiness,v.evidence,v.readiness,(v.evidence+v.fit)/2,v.fit][s.stage];
 const resourceStress=(v.days<4?0.06:0)+(v.budget<10?0.04:0);
 let useful=clamp(c.base.useful+(relevant-50)*0.0025+(a.odds.useful||0)-resourceStress,0.08,0.82);
 let setback=clamp(c.base.setback-(relevant-50)*0.002+(a.odds.setback||0)+resourceStress,0.06,0.65);
 const total=useful+setback;
 if(total>0.92){useful*=0.92/total;setback*=0.92/total;}
 return {useful,mixed:1-useful-setback,setback,relevant,resourceStress};
}
function eventDistribution(c,s){
 if(c.eventModel==='contextual-v2')return c.events.filter(e=>s.stage>=e.from&&s.stage<=e.to&&!(e.oneShot&&s.context?.eventSeen?.includes(e.id))&&!(s.context?.lever==='workflow'&&e.id==='dependency')&&(!e.requiresSensor||s.sensors.includes(e.requiresSensor))).map(e=>({event:e,probability:(e.probability+(e.riskMetric?e.riskIncrease*(100-s.values[e.riskMetric])/100:0))*(c.realismModel?(e.id==='champion'?{adverse:0.5,central:1,favorable:1.5}[c.sensitivity]:{adverse:1.5,central:1,favorable:0.5}[c.sensitivity]):1)}));
 const pool=c.events.filter(e=>s.stage>=e.from&&s.stage<=e.to&&e.weight>0&&(!e.requiresSensor||s.sensors.includes(e.requiresSensor))).map(e=>({event:e,weight:e.weight*(e.riskMetric?1+(100-s.values[e.riskMetric])/50:1)}));
 const sum=pool.reduce((n,x)=>n+x.weight,0);
 return pool.map(x=>({...x,probability:sum?x.weight/sum:0}));
}
function sampleEvent(c,s){
 if(c.eventModel==='contextual-v2'){
  const pick=draw(s.seed,s.turn,'contextual-event'),pool=eventDistribution(c,s);let total=0;
  for(const x of pool){total+=x.probability;if(pick<total)return {event:clone(x.event),occur:pick,pick,pool};}
  return {event:null,occur:pick,pick,pool};
 }
 const occur=draw(s.seed,s.turn,'event-occurs'); const pick=draw(s.seed,s.turn,'event-select');
 const pool=eventDistribution(c,s); if(occur>=c.base.eventRate||!pool.length)return {event:null,occur,pick,pool};
 let sum=0;for(const p of pool){sum+=p.probability;if(pick<sum)return {event:clone(p.event),occur,pick,pool};}
 return {event:clone(pool[pool.length-1].event),occur,pick,pool};
}
function measure(s,tag){
 const noise=3+(100-s.values.evidence)*0.12;
 for(const k of s.sensors){
  const v=clamp(s.values[k]+(draw(s.seed,s.turn,`measure-${tag}-${k}`)*2-1)*noise);
  s.observations[k]={value:+v.toFixed(1),atTurn:s.turn,valid:true,method:'Synthetic observation; bounded uniform noise, not a confidence interval.'};
 }
}
function roll(c,state,id,rationale,prediction){
 validate(c);assert(!state.ended&&!state.pending,'Resolve the current event before another decision.');
 assert(state.turn<c.maxTurns,'Maximum turns reached.');
 assert(typeof rationale==='string'&&rationale.length<=10000,'Strategy notes must be text of at most 10,000 characters.');
 assert(prediction===null||(Number.isFinite(prediction)&&prediction>=0&&prediction<=100),'Prediction must be between 0 and 100.');
 const a=action(c,state,id);assert(affordable(state,a),'This action exceeds the remaining budget or time.');
 if(c.routingModel==='justify-v2'&&Number.isInteger(a.next)&&a.next<state.stage&&!(state.stage===7&&a.next===0))assert(rationale.trim().length>0,'Briefly justify returning directly to this earlier step.');
 const before=clone(state),s=clone(state),p=probabilities(c,s,a),u=draw(s.seed,s.turn,'outcome');
 const outcome=p.decision?'decision':u<p.useful?'useful':(u<p.useful+p.mixed?'mixed':'setback');
 s.values=plannedValues(s,a);
 const outcomeEffects=outcome==='decision'?{}:outcome==='useful'?{readiness:3,trust:2}:(outcome==='mixed'?{days:-1}:{readiness:-6,trust:-4,budget:-3,days:-1});
 s.values=apply(s.values,outcomeEffects);
 if(a.sensors){s.sensors=Array.from(new Set(a.sensors));for(const k of Object.keys(s.observations))if(!s.sensors.includes(k))s.observations[k].valid=false;}
 if(s.stage===5&&!p.decision){s.sensors=Array.from(new Set([...s.sensors,'completion']));}
 if(c.realismModel){
  if(outcome!=='useful'&&!p.decision)for(const k of ['fit','readiness','evidence','agency'])if((a.effects[k]||0)>0)s.values[k]=clamp(s.values[k]-a.effects[k]*(outcome==='mixed'?0.5:1));
  if(a.kind==='pivot'){s.context.lever='workflow';s.context.exposed=false;s.sensors=[];for(const o of Object.values(s.observations))o.valid=false;}
  if(a.kind==='negotiate'&&outcome==='useful')s.context.wideRollout=true;
  // Design and process activity cannot directly manufacture a learning gain.
  if(s.stage===5&&!p.decision){
   for(const k of ['transfer','completion','gap'])s.values[k]=before.values[k];
   if(!s.context.exposed){const impact=outcome==='useful'?{transfer:3,completion:5}:outcome==='mixed'?{completion:2,gap:2}:{transfer:-2,gap:3};s.values=apply(s.values,impact);s.context.exposed=true;}
  }
 }
 if([4,5,6].includes(s.stage)&&!p.decision)measure(s,'stage');
 const ev=p.decision?{event:null,occur:null,pick:null,pool:[]}:sampleEvent(c,s);if(ev.event){if(s.context)s.context.eventSeen.push(ev.event.id);s.values=apply(s.values,ev.event.effects);for(const k of ev.event.invalidate||[])if(s.observations[k])s.observations[k].valid=false;}
 if(!s.visited.includes(s.stage))s.visited.push(s.stage);
 const next=a.next!==undefined?a.next:(s.stage===7?(c.routingModel==='justify-v2'?0:'finish'):s.stage+1);
 s.pending={outcome,next,event:ev.event,revision:c.revision};
 const record={turn:state.turn,stage:state.stage,revision:c.revision,config:clone(c),action:clone(a),rationale:rationale.trim(),prediction:p.decision?null:prediction,probabilities:p,draw:p.decision?null:u,outcome,event:ev.event,eventDraws:{occur:ev.occur,select:ev.pick},eventProbabilities:ev.pool.map(x=>({id:x.event.id,p:x.probability})),before,rolled:clone(s),response:null,after:null,changes:delta(before.values,s.values)};
 if(c.realismModel)record.resultText=p.decision?({decline:'Engagement declined or ended: remaining resources are preserved. This is a legitimate boundary decision, not a failed intervention.',pause:'Paused. Re-entry requires written authority for a feasible scope and access to an independent outcome measure. Waiting is not modeled as automatic permission.',pivot:'Lever changed to the teacher-controlled workflow. Prior observations remain in history but are invalid for claims about the new intervention. Return to Understand; wider reach and benefit remain unproven.',conclude:'Cycle concluded with the evidence currently available.'}[a.kind]):(a.narratives||[])[['useful','mixed','setback'].indexOf(outcome)]||'No additional interpretation.';
 return {state:s,record};
}
function respond(state,record,route,rationale){
 assert(state.pending&&!state.ended,'There is no unresolved decision.');
 assert(record&&record.turn===state.turn&&record.stage===state.stage,'The record does not match this decision.');
 assert(typeof rationale==='string'&&rationale.length<=10000,'Response notes must be text of at most 10,000 characters.');
 const s=clone(state),r=clone(record),pending=s.pending,ev=pending.event;
 let target=pending.next;
 if(route==='stop')target='finish';
 else if(route==='contain'){
  assert(ev&&ev.required,'Containment is available only for a blocking event.');
  assert(s.values.budget>=ev.containCost&&s.values.days>=ev.containDays,'Not enough resources for containment. Revisit or conclude instead.');
  s.values=apply(s.values,{budget:-ev.containCost,days:-ev.containDays});
  if(ev.repairSensor&&s.sensors.includes(ev.repairSensor)){
   const old=s.sensors;s.sensors=[ev.repairSensor];measure(s,'manual-repair');s.sensors=old;
  }
 }
 else if(route==='advance')assert(!ev||!ev.required,'This event requires a revised route or a funded containment plan.');
 else if(typeof route==='string'&&route.startsWith('revisit:')){
  target=Number(route.split(':')[1]);assert(Number.isInteger(target)&&target>=0&&target<=s.stage,'Revisit an earlier or current step.');
  if(record.config.routingModel==='justify-v2'){if(target<s.stage&&!(s.stage===7&&target===0)&&!(ev&&ev.required&&target===ev.target))assert(rationale.trim().length>0,'Briefly justify why this earlier step addresses the evidence or event.');}
  else if(ev&&ev.required)assert(target===ev.target,`Address this event at ${record.config.steps[ev.target].id}, or choose containment.`);
 }
 else throw new Error('Choose a valid next route.');
 if(record.config.routingModel==='justify-v2'&&route==='advance'&&Number.isInteger(target)&&target<s.stage&&!(s.stage===7&&target===0)&&!record.rationale.trim())assert(rationale.trim().length>0,'Briefly justify returning directly to this earlier step.');
 s.turn++;s.pending=null;
 if(target==='finish'){s.ended=true;s.endReason=['decline','pause','conclude'].includes(record.action.kind)?record.resultText:route==='stop'?'Cycle concluded by the learner.':'Cycle concluded at Refine.';}
 else{s.stage=target;if(s.values.days<=0||s.values.budget<=0||s.turn>=record.config.maxTurns){s.ended=true;s.endReason='The resource or turn limit was reached. An optional debrief can be added.';}}
 r.response={route,rationale:rationale.trim(),target,changes:delta(state.values,s.values)};r.after=clone(s);
 return {state:s,record:r};
}
function stop(state,reason){assert(!state.pending,'Resolve the pending event using Conclude run.');assert(typeof reason==='string'&&reason.length<=10000,'Reason must be text of at most 10,000 characters.');const s=clone(state);s.ended=true;s.endReason=reason.trim()||'Run concluded by the learner.';return s;}
function fork(records,index){assert(Number.isInteger(index)&&index>=0&&index<records.length,'Choose a recorded decision to fork.');return {state:clone(records[index].before),records:clone(records.slice(0,index)),config:clone(records[index].config)};}
function forecastSummary(records){const resolved=records.filter(r=>Number.isFinite(r.prediction));if(!resolved.length)return null;return {n:resolved.length,brier:resolved.reduce((sum,r)=>sum+(r.prediction/100-(r.outcome==='useful'?1:0))**2,0)/resolved.length};}
function validateState(s){
 assert(s&&typeof s==='object','Missing state.');assert(typeof s.seed==='string'&&s.seed.length>0&&s.seed.length<=100,'Invalid run seed.');
 assert(Number.isInteger(s.stage)&&s.stage>=0&&s.stage<8&&Number.isInteger(s.turn)&&s.turn>=0&&s.turn<=100,'Invalid stage or turn.');
 assert(s.values&&KEYS.every(k=>Number.isFinite(s.values[k])&&s.values[k]>=0&&s.values[k]<=(METRICS.includes(k)?100:20000)),'Invalid state values.');
 assert(Array.isArray(s.sensors)&&s.sensors.every(k=>SENSORS.includes(k))&&s.observations&&typeof s.observations==='object','Invalid observations.');
 assert(Array.isArray(s.visited)&&s.visited.every(x=>Number.isInteger(x)&&x>=0&&x<8),'Invalid visited stages.');
 assert(typeof s.ended==='boolean'&&typeof s.endReason==='string'&&typeof s.debrief==='string','Invalid run status.');
 for(const[k,o]of Object.entries(s.observations))assert(SENSORS.includes(k)&&Number.isFinite(o.value)&&o.value>=0&&o.value<=100&&Number.isInteger(o.atTurn)&&o.atTurn>=0&&typeof o.valid==='boolean','Invalid observation.');
 return true;
}
function validateProject(p){
 assert(p&&p.format==='lens-pipeline-run-v1','Not a LENS run file.'); validate(p.config);validateState(p.state);
 assert(Array.isArray(p.records)&&p.records.length<=100&&Array.isArray(p.archives)&&p.archives.length<=6,'Invalid run history.');
 function validateRun(records,state){
  assert(records.length===state.turn+(state.pending?1:0),'History length and turn disagree.');
  records.forEach((r,i)=>{
   assert(r.turn===i&&Number.isInteger(r.stage)&&r.stage>=0&&r.stage<8,'Invalid record ordering.');validate(r.config);validateState(r.before);
   const generated=roll(r.config,r.before,r.action.id,r.rationale,r.prediction);
   // Recompute each draw and transition rather than trusting imported outcome labels.
   for(const k of ['draw','outcome'])assert(generated.record[k]===r[k],'Run outcome failed replay validation.');
   assert(JSON.stringify(generated.state)===JSON.stringify(r.rolled),'Rolled state failed replay validation.');
   if(i>0)assert(JSON.stringify(records[i-1].after)===JSON.stringify(r.before),'Run snapshots are discontinuous.');
   if(r.response){const after=respond(generated.state,generated.record,r.response.route,r.response.rationale);assert(JSON.stringify(after.state)===JSON.stringify(r.after),'Response failed replay validation.');}
   else assert(i===records.length-1&&state.pending,'Only the latest decision can be unresolved.');
  });
  if(records.length){const last=records[records.length-1],expected=last.after||last.rolled;
   // Debrief and explicit between-turn ending are learner annotations, not random transitions.
   const actual=clone(state),base=clone(expected);for(const k of ['debrief','ended','endReason']){delete actual[k];delete base[k];}
   assert(JSON.stringify(actual)===JSON.stringify(base),'Current state disagrees with history.');
  }
 }
 validateRun(p.records,p.state);
 p.archives.forEach(a=>{assert(typeof a.label==='string'&&a.label.length<=200,'Invalid branch label.');validate(a.config);validateState(a.state);assert(Array.isArray(a.records)&&a.records.length<=100,'Invalid archived history.');validateRun(a.records,a.state);});
 return true;
}
const exported={VERSION,METRICS,KEYS,SENSORS,clone,clamp,draw,validate,initial,apply,delta,blocked,affordable,probabilities,eventDistribution,roll,respond,stop,fork,forecastSummary,validateState,validateProject};
if(typeof module!=='undefined'&&module.exports)module.exports=exported;
root.LensEngine=exported;
})(typeof globalThis!=='undefined'?globalThis:this);
