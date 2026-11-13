/** Andon Operations Lab v3. Fictional discrete-minute model, not calibrated operating data. */
export type Persona = 'steady' | 'sprinter' | 'cautious' | 'learner';
export const personas: Record<Persona, {name:string;description:string;duration:number;detect:number;report:number;falseAlarm:number}> = {
  steady: {name:'Experienced operator',description:'Balanced pace, strong recognition, reliable reporting.',duration:3,detect:.85,report:.9,falseAlarm:.015},
  sprinter: {name:'Throughput focused',description:'Fast work; more missed deviations and fewer requests for help.',duration:2,detect:.55,report:.55,falseAlarm:.01},
  cautious: {name:'Cautious checker',description:'Thorough but slower; more concerns that prove to be normal work.',duration:4,detect:.97,report:.97,falseAlarm:.09},
  learner: {name:'New team member',description:'Slower recognition; timely coaching improves diagnostic capability.',duration:4,detect:.62,report:.82,falseAlarm:.05},
};
export const stations = ['Receiving','Pick & label','Dispatch'];
export const standards = ['Physical receipt must match posted stock.','Full part and destination identifiers must match.','Route status must be current before dispatch.'];
export const causes = ['Premature stock posting','Truncated identifiers','Stale route source'];
export const evidenceText = [
  'Stock is posted before the physical receiving scan. Similar parts occupy neighboring bins.',
  'The printer omits the last four identifier characters; the scanner accepts a matching prefix.',
  'The route tool accepts reports without checking their age; road status has changed.',
];
export const fixes = [
  ['Add a dispatch signature','Gate stock on physical receipt','Increase the picking quota'],
  ['Refresh route data more often','Move the receiving scan','Print and match full identifiers'],
  ['Show source age and verify stale routes','Use larger labels','Post stock earlier'],
];
const relevant = [1,2,0];
export const SHIFT = 120;
export const RESPONSE_TARGET = 5;
export type Config = {seed:number;personas:Persona[];responders:number;demand:'normal'|'surge';conditions:'stable'|'strained'};
export const defaultConfig: Config = {seed:42,personas:['steady','learner','sprinter'],responders:2,demand:'normal',conditions:'stable'};
export type Order = {id:number;created:number;due:number;priority:'Routine'|'Urgent';stage:number;remaining:number;status:'queued'|'processing'|'held'|'delivered';checked:number[];defects:number[];starts:number[];deliveredAt?:number;valid?:boolean;customerReported?:boolean};
export type Incident = {id:number;orderId:number;station:number;opened:number;closed?:number;firstHelp?:number;evidence:boolean;truth:boolean;status:'open'|'working'|'review'|'closed';message:string;waited:boolean;resolution?:'recovery'|'release'|'dismiss'};
export type Job = {id:number;kind:'inspect'|'recover'|'coach'|'trial'|'assist';station:number;remaining:number;incidentId?:number;correct?:boolean};
export type Change = {station:number;hypothesis:number;tested:number;passes:number;status:'trial'|'pilot'|'standard'|'rejected';started:number;adopted?:number};
export type Log = {time:number;kind:'arrival'|'signal'|'action'|'result'|'system';text:string};
export type State = {time:number;config:Config;initialConfig:Config;orders:Order[];incidents:Incident[];jobs:Job[];changes:Change[];climate:number[];skill:number[];paused:boolean[];transition:number[];pauseMinutes:number[];supportMinutes:number;logs:Log[];samples:{time:number;backlog:number;dispatched:number;reportedRejects:number}[];nextIncident:number;nextJob:number;message:string};
/** Return a reproducible keyed random draw for paired scenario comparisons. */
export function draw(seed:number,...keys:number[]):number {let x=seed>>>0; for(const k of keys){x=Math.imul(x^k,0x45d9f3b);x^=x>>>16;} x=Math.imul(x^0x9e3779b9,0x85ebca6b);x^=x>>>13;return (x>>>0)/4294967296;}
/** Initialize a bounded shift with sanitized configuration and empty work queues. */
export function create(config:Config=defaultConfig):State {
  const c=structuredClone(config); c.seed=Math.max(1,Math.floor(c.seed)||42);c.responders=Math.max(1,Math.min(3,Math.floor(c.responders)||2));
  c.personas=stations.map((_,k)=>personas[c.personas[k]]?c.personas[k]:'steady');
  return {time:0,config:c,initialConfig:structuredClone(c),orders:[],incidents:[],jobs:[],changes:[],climate:[.85,.85,.85],skill:[0,0,0],paused:[false,false,false],transition:[0,0,0],pauseMinutes:[0,0,0],supportMinutes:0,logs:[{time:0,kind:'system',text:'Shift ready. Promise: respond within 5 minutes. Arrivals end at 09:30; shift closes at 10:00.'}],samples:[],nextIncident:1,nextJob:1,message:''};
}
function log(s:State,kind:Log['kind'],text:string){s.logs.push({time:s.time,kind,text});}
function copy(input:State):State{return {...input,orders:input.orders.map(o=>({...o,checked:[...o.checked],defects:[...o.defects],starts:[...o.starts]})),incidents:input.incidents.map(i=>({...i})),jobs:input.jobs.map(j=>({...j})),changes:input.changes.map(c=>({...c})),climate:[...input.climate],skill:[...input.skill],paused:[...input.paused],transition:[...input.transition],pauseMinutes:[...input.pauseMinutes],logs:[...input.logs],samples:[...input.samples]};}
function close(s:State,i:Incident,resolution:Incident['resolution']){i.status='closed';i.closed=s.time;i.resolution=resolution;const o=s.orders.find(o=>o.id===i.orderId);if(o?.status==='held')o.status='queued';}
/** Report support capacity under the current system conditions. */
export function capacity(s:State):number {return s.config.responders-(s.config.conditions==='strained'&&s.time>=45&&s.time<60?1:0);}
/** Count responder slots available for a new support assignment. */
export function freeCapacity(s:State):number {return Math.max(0,capacity(s)-s.jobs.length);}
/** Count observable field exposure and related failures after pilot adoption. */
export function fieldEvidence(s:State,c:Change):{reported:number;failures:number;recurrences:number} {const exposed=s.orders.filter(o=>c.adopted!==undefined&&o.starts[c.station]>c.adopted&&o.status==='delivered'&&o.customerReported);return {reported:exposed.length,failures:exposed.filter(o=>o.defects.includes(c.station)).length,recurrences:s.incidents.filter(i=>i.station===c.station&&i.opened>(c.adopted??Infinity)&&i.evidence&&i.truth).length};}
export type Metrics={arrived:number;delivered:number;valid:number;escapes:number;due:number;onTime:number;service:number|null;backlog:number;helped:number;signals:number;response:number|null;within:number;assessed:number;responseService:number|null;unanswered:number;overdueHelp:number;holdMinutes:number;reported:number;rejected:number;pending:number;pauseMinutes:number;supportMinutes:number;recurrences:number;standards:number};
/** Audit service, quality, responsiveness, and burdens with explicit denominators. */
export function metrics(s:State):Metrics {
  const shipped=s.orders.filter(o=>o.status==='delivered'); const accepted=shipped.filter(o=>o.valid); const due=s.orders.filter(o=>o.due<=s.time);
  const onTime=due.filter(o=>o.status==='delivered'&&o.valid&&o.deliveredAt!<=o.due);
  const helped=s.incidents.filter(i=>i.firstHelp!==undefined); const within=s.incidents.filter(i=>i.firstHelp!==undefined&&i.firstHelp-i.opened<=RESPONSE_TARGET).length;
  const assessed=s.incidents.filter(i=>i.firstHelp!==undefined||s.time-i.opened>=RESPONSE_TARGET||i.closed!==undefined||s.time===SHIFT);
  const reported=shipped.filter(o=>o.customerReported); const rejected=reported.filter(o=>!o.valid);
  const recurring=s.incidents.filter(i=>i.evidence&&i.truth&&s.changes.some(c=>c.station===i.station&&c.adopted!==undefined&&i.opened>c.adopted));
  return {arrived:s.orders.length,delivered:shipped.length,valid:accepted.length,escapes:shipped.length-accepted.length,due:due.length,onTime:onTime.length,service:due.length?100*onTime.length/due.length:null,backlog:s.orders.length-shipped.length,helped:helped.length,signals:s.incidents.length,response:helped.length?helped.reduce((a,i)=>a+i.firstHelp!-i.opened,0)/helped.length:null,within,assessed:assessed.length,responseService:assessed.length?100*within/assessed.length:null,unanswered:s.incidents.filter(i=>i.firstHelp===undefined).length,overdueHelp:s.incidents.filter(i=>i.firstHelp===undefined&&i.status!=='closed'&&s.time-i.opened>=RESPONSE_TARGET).length,holdMinutes:s.incidents.reduce((a,i)=>a+(i.closed??s.time)-i.opened,0),reported:reported.length,rejected:rejected.length,pending:shipped.length-reported.length,pauseMinutes:s.pauseMinutes.reduce((a,b)=>a+b,0),supportMinutes:s.supportMinutes,recurrences:recurring.length,standards:s.changes.filter(c=>c.status==='standard').length};
}
/** Identify a new signal, result, or bulletin that merits a manager decision. */
export function decisionEvent(before:State,after:State):boolean {return after.time===SHIFT||after.incidents.length>before.incidents.length||after.logs.slice(before.logs.length).some(l=>l.kind==='system'||l.kind==='result'&&!l.text.startsWith('Order ')&&!l.text.includes('accepted.'));}
/** Advance the simulation until its next meaningful decision or shift end. */
export function advance(input:State):State {let s=input;while(s.time<SHIFT){const n=tick(s);if(decisionEvent(s,n))return n;s=n;}return s;}
/** Advance one minute while conserving work, quality, and responder accounting. */
export function tick(input:State):State {
  if(input.time>=SHIFT)return input;
  const s=copy(input);s.time++;s.message='';s.supportMinutes+=s.jobs.length;
  if(s.time===20)log(s,'system','Supplier bulletin: receipts arriving through 08:40 have delayed confirmation. Watch stock discrepancies.');
  if(s.time===30&&s.config.demand==='surge')log(s,'system','Demand surge begins. Arrival probability rises from 42% to 85% per minute through 09:05.');
  if(s.time===45&&s.config.conditions==='strained')log(s,'system','One responder is diverted until 09:00. Assigned jobs finish; new help must fit the reduced capacity.');
  if(s.time===50)log(s,'system','Route bulletin: source updates are intermittent for orders arriving through 09:25.');
  if(s.time===60&&s.config.conditions==='strained')log(s,'system','Diverted responder returns. Full support capacity restored.');
  if(s.time===66&&s.config.demand==='surge')log(s,'system','Demand surge ends. Intake returns to its normal rate.');
  if(s.time===91)log(s,'system','Intake closed. Clear remaining work and review the evidence before 10:00.');
  for(const o of s.orders)if(o.status==='delivered'&&!o.customerReported&&s.time-o.deliveredAt!>=8){o.customerReported=true;log(s,'result',`Customer report #${o.id}: ${o.valid?'accepted.':'rejected: '+o.defects.map(k=>causes[k]).join(', ')+'.'}`);}
  const rate=s.config.demand==='surge'&&s.time>=30&&s.time<=65?.85:.42;
  if(s.time<=90&&draw(s.config.seed,100,s.time)<rate){const id=s.orders.length+1;const urgent=draw(s.config.seed,101,id)<.3;s.orders.push({id,created:s.time,due:s.time+(urgent?18:32),priority:urgent?'Urgent':'Routine',stage:0,remaining:0,status:'queued',checked:[],defects:[],starts:[]});log(s,'arrival',`Order #${id}: ${urgent?'urgent':'routine'}, ${urgent?18:32} minutes to deadline.`);}
  for(const j of s.jobs){
    j.remaining--;if(j.remaining>0)continue;const i=s.incidents.find(i=>i.id===j.incidentId);
    if(j.kind==='inspect'&&i){i.evidence=true;i.status='review';log(s,'result',`Investigation #${i.orderId}: ${i.truth?evidenceText[i.station]:'No deviation found; this item meets the current standard.'}`);}
    if(j.kind==='recover'&&i){const o=s.orders.find(o=>o.id===i.orderId)!;o.defects=o.defects.filter(d=>d!==i.station);close(s,i,'recovery');s.climate[i.station]=Math.min(1,s.climate[i.station]+.04);log(s,'result',`Recovery #${o.id}: corrected, verified, released. Source process is unchanged.`);}
    if(j.kind==='assist')log(s,'result',`Queue support at ${stations[j.station]} finished. Responder is available again.`);
    if(j.kind==='coach'){s.skill[j.station]=Math.min(.24,s.skill[j.station]+.08);s.climate[j.station]=Math.min(1,s.climate[j.station]+.05);log(s,'result',`Coaching complete at ${stations[j.station]}. Recognition improves; response remains a management obligation.`);}
    if(j.kind==='trial'){const c=s.changes.find(c=>c.station===j.station&&c.status==='trial');if(c){c.tested=4;for(let n=0;n<4;n++)if(draw(s.config.seed,700,j.station,c.started,n)<(j.correct?.9:.2))c.passes++;log(s,'result',`Trial at ${stations[j.station]}: ${c.passes}/4 challenge cases passed. This small sample does not prove field effectiveness.`);}}
  }
  s.jobs=s.jobs.filter(j=>j.remaining>0);
  for(const i of s.incidents)if(i.firstHelp===undefined&&i.status!=='closed'&&!i.waited&&s.time-i.opened>=8){i.waited=true;s.climate[i.station]=Math.max(.3,s.climate[i.station]-.08);log(s,'system',`Unanswered request #${i.orderId} has waited 8 minutes. Future reporting becomes less likely.`);}
  for(let k=0;k<3;k++){
    if(s.paused[k])s.pauseMinutes[k]++;
    if(s.transition[k]>0)s.transition[k]--;
    const p=personas[s.config.personas[k]];
    const busy=s.orders.find(o=>o.stage===k&&o.status==='processing');
    if(busy){busy.remaining--;if(busy.remaining<=0){busy.stage++;busy.status=busy.stage===3?'delivered':'queued';if(busy.stage===3){busy.deliveredAt=s.time;busy.valid=busy.defects.length===0;log(s,'result',`Order #${busy.id} dispatched ${s.time<=busy.due?'on time':'late'}. Customer acceptance is pending.`);}}continue;}
    if(s.paused[k]||s.transition[k]>0)continue;
    const o=s.orders.reduce<Order|undefined>((best,item)=>item.stage===k&&item.status==='queued'&&(!best||item.due<best.due)?item:best,undefined);if(!o)continue;
    if(!o.checked.includes(k)){
      o.checked.push(k);o.starts[k]=s.time;
      const disruption=(k===0&&o.created>=20&&o.created<=40)||(k===2&&o.created>=50&&o.created<=85);
      const hazard=draw(s.config.seed,200,o.id,k)<[.16,.22,.18][k];
      const extra=disruption&&draw(s.config.seed,202,o.id,k)<(s.config.conditions==='strained'?.3:.18);
      const change=s.changes.find(c=>c.station===k&&(c.status==='pilot'||c.status==='standard'));
      const prevented=change&&change.hypothesis===relevant[k]&&draw(s.config.seed,201,o.id,k)<.8;
      const defect=(hazard||extra)&&!prevented;if(defect)o.defects.push(k);
      const detected=defect&&draw(s.config.seed,300,o.id,k)<Math.min(.99,p.detect+s.skill[k]);
      const falseConcern=!defect&&draw(s.config.seed,301,o.id,k)<p.falseAlarm;
      if((detected||falseConcern)&&draw(s.config.seed,302,o.id,k)<p.report*s.climate[k]){
        o.status='held';s.incidents.push({id:s.nextIncident++,orderId:o.id,station:k,opened:s.time,evidence:false,truth:defect,status:'open',message:defect?['System quantity and physical bin disagree.','Similar identifiers; prefix scan passed.','Route recommendation may be out of date.'][k]:['Receiving check needs clarification.','Full identifier match is uncertain.','Dispatcher requests a source check.'][k],waited:false});log(s,'signal',`${stations[k]} asks for help on #${o.id}. Item held; other work continues.`);continue;
      }
    }
    o.status='processing';o.remaining=Math.max(1,p.duration+(s.jobs.some(j=>j.kind==='coach'&&j.station===k)?2:0)+(s.changes.some(c=>c.station===k&&(c.status==='pilot'||c.status==='standard'))?1:0)-(s.jobs.some(j=>j.kind==='assist'&&j.station===k)?1:0));
  }
  const m=metrics(s);s.samples.push({time:s.time,backlog:m.backlog,dispatched:m.delivered,reportedRejects:m.rejected});
  if(s.time===SHIFT)log(s,'system','Shift complete. Reveal all dispatched quality outcomes, including customer reports still pending.');
  return s;
}
type ItemCommand = {[K in 'inspect'|'recover'|'release'|'dismiss']:{kind:K;id:number}}['inspect'|'recover'|'release'|'dismiss'];
type StationCommand = {[K in 'coach'|'assist'|'pause'|'resume'|'rollout'|'reject'|'standardize'|'withdraw']:{kind:K;station:number}}['coach'|'assist'|'pause'|'resume'|'rollout'|'reject'|'standardize'|'withdraw'];
export type Command = ItemCommand|StationCommand|{kind:'swap';station:number;persona:Persona}|{kind:'trial';station:number;hypothesis:number};
/** Apply operator handover costs without changing work already underway. */
function swapOperator(s:State,station:number,persona:Persona):State {
    if(!personas[persona])return {...s,message:'Choose a valid persona.'};
    if(s.config.personas[station]===persona)return {...s,message:'That operator is already assigned.'};
    if(s.transition[station]>0||s.jobs.some(j=>j.kind==='coach'&&j.station===station))return {...s,message:'Finish the handover or coaching already underway first.'};
    s.config={...s.config,personas:s.config.personas.map((p,k)=>k===station?persona:p)};
    s.transition[station]=4;s.skill[station]=0;log(s,'action',`${stations[station]}: ${personas[persona].name} assigned. Four-minute handover; new operator starts after handover and current work finish. Coaching gain resets.`);return s;
}
/** Apply one manager action without mutating the prior shift state. */
export function command(input:State,c:Command):State {
  const s=copy(input);s.message='';const warn=(text:string)=>{s.message=text;return s;};
  if(s.time>=SHIFT)return warn('Shift ended. Replay to make another decision.');
  if('station' in c&&(!Number.isInteger(c.station)||c.station<0||c.station>2))return warn('Choose a valid station.');
  if(c.kind==='pause'||c.kind==='resume'){
    if(s.paused[c.station]===(c.kind==='pause'))return warn('Station is already in that state.');
    s.paused[c.station]=c.kind==='pause';log(s,'action',`${stations[c.station]}: ${c.kind==='pause'?'contained at next task boundary. In-progress work finishes; new starts stop.':'restarted. Held items still require an individual release or recovery.'}`);return s;
  }
  if(c.kind==='swap')return swapOperator(s,c.station,c.persona);
  if(c.kind==='coach'||c.kind==='trial'||c.kind==='assist'){
    if(freeCapacity(s)===0)return warn('No responder is free. Advance time or reconsider priorities.');
    if(c.kind==='assist'){
      if(s.jobs.some(j=>j.kind==='assist'&&j.station===c.station))return warn('Queue support is already assigned here.');
      s.jobs.push({id:s.nextJob++,kind:'assist',station:c.station,remaining:8});log(s,'action',`${stations[c.station]}: queue support assigned for 8 minutes. New tasks take 1 minute less (minimum 1).`);return s;
    }
    if(c.kind==='coach'){
      if(s.transition[c.station]>0)return warn('Finish the operator handover before coaching.');
      if(s.jobs.some(j=>j.kind==='coach'&&j.station===c.station))return warn('Coaching is already underway here.');
      if(s.skill[c.station]>=.24)return warn('Recognition has reached this model’s coaching limit.');
      s.jobs.push({id:s.nextJob++,kind:'coach',station:c.station,remaining:7});log(s,'action',`${stations[c.station]}: 7-minute coaching job assigned. Work starting during coaching takes 2 extra minutes.`);return s;
    }
    if(!s.incidents.some(i=>i.station===c.station&&i.evidence&&i.truth))return warn('Investigate a confirmed deviation here before proposing a trial.');
    if(!Number.isInteger(c.hypothesis)||!fixes[c.station][c.hypothesis])return warn('Choose a valid countermeasure.');
    if(s.changes.some(x=>x.station===c.station&&x.status!=='rejected'))return warn('Finish or withdraw the current change first.');
    s.changes=s.changes.filter(x=>x.station!==c.station);s.changes.push({station:c.station,hypothesis:c.hypothesis,tested:0,passes:0,status:'trial',started:s.time});
    s.jobs.push({id:s.nextJob++,kind:'trial',station:c.station,remaining:10,correct:c.hypothesis===relevant[c.station]});log(s,'action',`${stations[c.station]}: trial started — ${fixes[c.station][c.hypothesis]}. One responder for 10 minutes.`);return s;
  }
  if(c.kind==='rollout'||c.kind==='reject'||c.kind==='standardize'||c.kind==='withdraw'){
    const x=s.changes.find(x=>x.station===c.station&&x.status!=='rejected');
    if(!x)return warn('There is no current change here.');
    if(c.kind==='rollout'||c.kind==='reject'){
      if(x.status!=='trial'||x.tested!==4)return warn('The challenge trial must finish first.');
      x.status=c.kind==='rollout'?'pilot':'rejected';if(c.kind==='rollout')x.adopted=s.time;
      log(s,'action',`${stations[c.station]}: change ${c.kind==='rollout'?'piloted in live work (+1 minute per start)':'rejected'} after ${x.passes}/4 challenge cases.`);return s;
    }
    if(x.status==='trial')return warn('Wait for the trial to finish, then decide on rollout.');
    if(c.kind==='standardize'){
      if(x.status==='standard')return warn('The standard is already updated.');
      const f=fieldEvidence(s,x);if(f.reported<3||f.failures>0||f.recurrences>0)return warn('Update the standard only after 3 reported pilot orders and no observed related failure. This is a teaching checkpoint, not statistical proof.');
      x.status='standard';log(s,'action',`${stations[c.station]}: standard updated with a named check after ${f.reported} field reports. Continue monitoring recurrence.`);
    }else{x.status='rejected';log(s,'action',`${stations[c.station]}: pilot withdrawn; original process restored for future starts.`);}return s;
  }
  const i=s.incidents.find(i=>i.id===c.id);
  if(!i||i.status==='closed')return warn('That request is already closed.');
  if(i.status==='working')return warn('A responder is already working on this request.');
  if(c.kind==='release'||c.kind==='dismiss'){
    close(s,i,c.kind==='release'?'release':'dismiss');
    if(c.kind==='dismiss')s.climate[i.station]=Math.max(.3,s.climate[i.station]-.15);
    else if(i.evidence&&!i.truth)s.climate[i.station]=Math.min(1,s.climate[i.station]+.02);
    log(s,'action',`Order #${i.orderId}: ${c.kind==='dismiss'?'concern dismissed; reporting discouraged.':i.evidence&&!i.truth?'verified normal work released.':'released without correction; risk moves downstream.'}`);return s;
  }
  if(freeCapacity(s)===0)return warn('No responder is free. Advance time to finish assigned work.');
  if(c.kind==='inspect'&&i.evidence)return warn('Evidence is already available.');
  i.status='working';i.firstHelp??=s.time;
  const duration=c.kind==='inspect'?3:5;s.jobs.push({id:s.nextJob++,kind:c.kind,station:i.station,remaining:duration,incidentId:i.id});
  log(s,'action',`Help assigned to #${i.orderId}: ${c.kind==='inspect'?'observe actual work':'correct and verify item'} (${duration} minutes).`);return s;
}
