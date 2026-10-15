/** Exercise Andon management decisions against the existing operational simulation. */
import {create,tick,command,metrics,fieldEvidence,defaultConfig,SHIFT,stations,fixes,type State,type Incident} from './engine.ts';
export type PracticeMode='guided'|'transfer';
export type PracticeStep='contain'|'observe'|'recover'|'restart'|'experiment'|'pilot'|'verify'|'complete';
export type PracticeChoice={id:string;label:string;detail:string};
export type PracticeEvidence={label:string;value:string};
export type PracticeFeedback={title:string;body:string;blocked:boolean;evidence:PracticeEvidence[]};
export type PracticeAttempt={step:PracticeStep;action:string;label:string;reason:string;before:number;after:number;feedback:PracticeFeedback};
export type Practice={mode:PracticeMode;run:State;incidentId:number;step:PracticeStep;feedback:PracticeFeedback|null;checkpoint:State;reason:string;attempts:PracticeAttempt[];facilitatorActions:number;hintUsed:boolean};
export const practiceSteps:Record<PracticeMode,PracticeStep[]>={guided:['contain','observe','recover','restart','experiment','pilot','verify','complete'],transfer:['contain','observe','recover','restart','verify','complete']};
export const stepTitles:Record<PracticeStep,string>={contain:'Choose the boundary',observe:'Provide timely help',recover:'Act on the evidence',restart:'Check the restart',experiment:'Test the source process',pilot:'Interpret the trial',verify:'Verify in live work',complete:'Review your decisions'};
export const stepPrompts:Record<PracticeStep,string>={contain:'A worker has held an item and asked for help. Choose what work may continue while you establish the facts.',observe:'The signal is a concern, not a diagnosis. Decide how to use a responder and let that work finish.',recover:'Read the observation. Choose a response that fits the actual condition, rather than repeating a preferred action.',restart:'Check what is corrected, what remains uncertain, and which work is still held before restarting.',experiment:'Choose a countermeasure that addresses the observed cause. A local recovery does not change how the next item is processed.',pilot:'A small challenge trial is evidence to examine. Decide what it supports, accounting for field risk and extra work time.',verify:'Use field reports and confirmed repeat signals together. Decide whether to update the standard, withdraw, or keep monitoring.',complete:'Use the operational evidence to explain a decision and what would change it. Completion alone does not establish capability.'};
export const stepHints:Record<PracticeStep,string>={contain:'Every signal already holds its item. A station hold prevents new starts, but does not stop a task already underway. Wider containment may be justified if the risk spans multiple items.',observe:'Observation occupies a responder for 3 minutes and reveals the current item’s condition. Correction takes 5 minutes but does not establish a source cause by itself.',recover:'Correct a confirmed defect. If observation finds no deviation, releasing the verified item preserves support capacity. Dismissal also makes future reporting less likely.',restart:'A recovered or verified item can resume. Restarting a station does not release other held items and does not establish that the source process is fixed.',experiment:'Compare the proposed change with the cause found during observation. Use a bounded trial rather than declaring the whole process corrected.',pilot:'Four cases are a small sample. A pilot can fail in live work; rejection leaves the source unchanged. A pilot adds one minute per new start.',verify:'An updated standard requires at least 3 reported pilot orders and no observed related escape or confirmed recurrence in this teaching model. This checkpoint is not statistical proof.',complete:'Distinguish your actions from facilitator actions, and distinguish an accepted item from a verified improvement to the process.'};
/** Create an authored incident using ordinary orders, hazards, and signals from the game. */
export function createPractice(mode:PracticeMode='guided'):Practice {
  let run=create(mode==='guided'?defaultConfig:{...defaultConfig,seed:6,personas:['cautious','steady','steady'],responders:1,conditions:'strained'});
  while(!run.incidents.length&&run.time<SHIFT)run=tick(run);
  if(!run.incidents.length)throw new Error('Practice scenario produced no help signal.');
  return {mode,run,incidentId:run.incidents[0].id,step:'contain',feedback:null,checkpoint:run,reason:'',attempts:[],facilitatorActions:0,hintUsed:mode==='guided'};
}
/** Resolve the incident being practised without exposing its truth before observation. */
export function practiceIncident(p:Practice):Incident {
  const i=p.run.incidents.find(i=>i.id===p.incidentId);
  if(!i)throw new Error('Practice incident missing from its operational record.');
  return i;
}
/** Present manager actions available at the current practice checkpoint. */
export function practiceChoices(p:Practice):PracticeChoice[] {
  const i=practiceIncident(p),k=i.station;
  switch(p.step){
    case 'contain':return [{id:'item',label:'Keep this item held',detail:'Other orders may continue through the station.'},{id:'station',label:'Contain the station',detail:'Stop new starts at the next task boundary; work already underway finishes.'},{id:'release',label:'Release without observation',detail:'Clear the item hold without establishing whether it meets the standard.'}];
    case 'observe':return [{id:'inspect',label:'Observe actual work · 3m',detail:'Assign a responder, obtain evidence, and keep the item held.'},{id:'recover',label:'Correct without observation · 5m',detail:'Recover the item, without establishing what caused the concern.'},{id:'wait',label:'Delay first help by 8m',detail:'Leave the item held while other work continues.'}];
    case 'recover':return [{id:'recover',label:'Correct & verify item · 5m',detail:'Use a responder to remove a defect at this station.'},{id:'release',label:'Release the item · 0m',detail:'Use the observation to judge whether correction is needed.'},{id:'dismiss',label:'Dismiss the concern · 0m',detail:'Release the item and discourage future reporting.'}];
    case 'restart':return [{id:'resume',label:p.run.paused[k]?'Restart the station':'Continue the station',detail:'After verifying the item, return to normal work and keep watching for recurrence.'},{id:'claim',label:'Declare the source problem solved',detail:'Treat this item’s recovery or release as proof that future work is now correct.'}];
    case 'experiment':return fixes[k].map((label,n)=>({id:`trial:${n}`,label,detail:'One responder runs four synthetic challenge cases over 10 minutes.'}));
    case 'pilot':return [{id:'rollout',label:'Pilot in live work',detail:'Apply this change to future starts and gather field evidence; each start takes 1 minute more.'},{id:'reject',label:'Reject this countermeasure',detail:'Retain the original process; monitor whether the same issue returns.'}];
    case 'verify':{
      const c=p.run.changes.find(c=>c.station===k&&(c.status==='pilot'||c.status==='standard'));
      const options:PracticeChoice[]=c?[{id:'standardize',label:'Update the standard',detail:'Check the pilot’s reported exposure and related failures before adopting the new method.'},{id:'withdraw',label:'Withdraw the change',detail:'Restore the original process for future starts.'},{id:'monitor',label:'Observe another 12m',detail:'Gather additional field reports; continue to look for recurrence.'},{id:'defer',label:'Keep the pilot under review',detail:'Document the current limits without claiming the process is proved.'}]:[{id:'defer',label:'Return to monitoring',detail:'Close the item-level loop while keeping the source process under observation.'},{id:'claim',label:'Declare future work error-free',detail:'Treat this incident’s outcome as evidence of all future outcomes.'}];
      return options.filter(choice=>p.run.time<SHIFT||!['standardize','withdraw','monitor'].includes(choice.id));
    }
    case 'complete':return [];
  }
}
function feedback(title:string,body:string,blocked=false):PracticeFeedback {return {title,body,blocked,evidence:[]};}
function tickMinutes(run:State,n:number):State {while(n--&&run.time<SHIFT)run=tick(run);return run;}
/** Observe the released item until a customer report or the bounded shift end. */
function reportWindow(run:State,incidentId:number):State {
  const orderId=run.incidents.find(i=>i.id===incidentId)!.orderId;
  let s=run;
  while(s.time<SHIFT&&!s.orders.find(o=>o.id===orderId)!.customerReported)s=tick(s);
  return s;
}
function evidence(p:Practice,run:State):PracticeEvidence[] {
  const i=run.incidents.find(i=>i.id===p.incidentId)!,o=run.orders.find(o=>o.id===i.orderId)!;
  const c=run.changes.find(c=>c.station===i.station&&c.status!=='rejected'),f=c?fieldEvidence(run,c):null;
  return [{label:'Scenario time',value:`${run.time}m into shift`},{label:'First help',value:i.firstHelp===undefined?'Not assigned':`${i.firstHelp-i.opened}m after signal`},{label:'Item state',value:o.customerReported?o.valid?'Customer accepted':'Customer rejected':o.status==='delivered'?'Dispatched; report pending':o.status},{label:'Responder time so far',value:`${run.supportMinutes} responder-minutes`},{label:'Containment burden',value:`${run.pauseMinutes[i.station]} station-minutes`},...(f?[{label:'Field evidence',value:`${f.reported} reported pilot orders · ${f.failures} related escapes · ${f.recurrences} confirmed repeat signals`}]:[])];
}
function applyContain(p:Practice,id:string):{run:State;result:PracticeFeedback} {
  const i=practiceIncident(p);
  if(id==='item')return {run:p.run,result:feedback('Item contained; station continues','This preserves flow for other orders. You still owe the worker timely observation and help; you have not established the cause.')};
  if(id==='station')return {run:command(p.run,{kind:'pause',station:i.station}),result:feedback('Wider containment is now active','New starts stop at the next task boundary. This protects downstream work at a cost to upstream waiting; gather evidence before keeping the station stopped.')};
  return {run:reportWindow(command(p.run,{kind:'release',id:i.id}),i.id),result:feedback('The hold cleared without evidence','Clearing the board does not establish quality. This attempt skips the help-and-observation loop. Rewind the checkpoint to practise that loop; the attempt remains recorded.',true)};
}
function applyObservation(p:Practice,id:string):{run:State;result:PracticeFeedback} {
  const i=practiceIncident(p);
  if(id==='wait')return {run:tickMinutes(p.run,8),result:feedback('The response promise was missed','This request has received no help for 8 minutes. Reporting willingness falls in the model. A held item still needs a named response; rewind to examine that decision.',true)};
  const run=tickMinutes(command(p.run,{kind:id==='inspect'?'inspect':'recover',id:i.id}),id==='inspect'?3:5);
  if(id==='recover')return {run,result:feedback('Recovery completed, but the cause was not established','The current item was corrected and verified. You used 5 responder-minutes, but did not observe a source cause. Rewind to practise diagnosis before choosing a countermeasure.',true)};
  return {run,result:feedback('Observation is ready','A responder supplied evidence from the actual work. Read it before deciding whether correction is justified.')};
}
function applyRecovery(p:Practice,id:string):{run:State;result:PracticeFeedback} {
  const i=practiceIncident(p);
  const run=tickMinutes(command(p.run,{kind:id==='recover'?'recover':id==='dismiss'?'dismiss':'release',id:i.id}),id==='recover'?5:0);
  if(id==='dismiss')return {run,result:feedback('The item was released and reporting discouraged','Dismissal reduces reporting willingness. A quieter board after this action would not prove better quality.',true)};
  if(i.truth&&id==='release')return {run:reportWindow(run,i.id),result:feedback('A confirmed defect remains in the item','The observation established a deviation, yet release did not remove it. The scenario advanced to the customer report so you can inspect the consequence. Rewind to correct and verify the item before continuing the worked management loop.',true)};
  if(!i.truth&&id==='recover')return {run,result:feedback('Extra recovery used scarce support','The observation found normal work. Correction still releases a valid item, but consumes 5 additional responder-minutes. Continue and consider what that support could have served.')};
  return {run,result:feedback(i.truth?'Item corrected and verified':'Verified normal item released',i.truth?'Local recovery restores this item. The source process is still unchanged.':'The item met the standard. Its release preserves responder capacity and respects the request for clarification.')};
}
function applyRestart(p:Practice,id:string):{run:State;result:PracticeFeedback} {
  const i=practiceIncident(p);
  if(id==='claim')return {run:p.run,result:feedback('Item recovery is not process verification','A single corrected or verified item does not establish how the next item will perform. Keep the source question open.',true)};
  const run=p.run.paused[i.station]?command(p.run,{kind:'resume',station:i.station}):p.run;
  return {run,result:feedback('Normal work can resume','The local request is resolved. Other held items still require individual support; source improvement requires a separate learning loop.')};
}
function applyExperiment(p:Practice,id:string):{run:State;result:PracticeFeedback} {
  const i=practiceIncident(p),hypothesis=Number(id.split(':')[1]);
  let run=command(p.run,{kind:'trial',station:i.station,hypothesis});
  if(run.message)return {run,result:feedback('Trial could not start',run.message,true)};
  run=tickMinutes(run,10);
  const c=run.changes.find(c=>c.station===i.station&&c.status==='trial')!;
  return {run,result:feedback(`${c.passes} of ${c.tested} challenge cases passed`,'The synthetic cases test the proposed change, not your readiness as a manager. Inspect its relation to the observed cause, the small sample, and the cost before choosing a pilot.')};
}
/** Facilitate unrelated work during field observation, using the same help commands. */
export function facilitateField(run:State,station:number,incidentId:number,extraMinutes=0):{run:State;actions:number} {
  let s=run,actions=0;const stopAt=extraMinutes?Math.min(SHIFT,s.time+extraMinutes):SHIFT;
  while(s.time<stopAt){
    for(const i of s.incidents.filter(i=>i.status==='open'||i.status==='review')){
      const before=s.logs.length,next=command(s,{kind:i.evidence?i.truth?'recover':'release':'inspect',id:i.id});
      if(next.message)continue;
      s={...next,logs:next.logs.map((l,n)=>n>=before?{...l,text:`Facilitator: ${l.text}`}:l)};actions++;
    }
    s=tick(s);
    if(extraMinutes)continue;
    const c=s.changes.find(c=>c.station===station&&(c.status==='pilot'||c.status==='standard'));
    const target=s.orders.find(o=>o.id===s.incidents.find(i=>i.id===incidentId)!.orderId)!;
    if(c?fieldEvidence(s,c).reported>=3:target.customerReported)break;
  }
  return {run:s,actions};
}
function applyPilot(p:Practice,id:string):{run:State;result:PracticeFeedback} {
  const i=practiceIncident(p),c=p.run.changes.find(c=>c.station===i.station&&c.status==='trial')!;
  const run=command(p.run,{kind:id==='rollout'?'rollout':'reject',station:i.station});
  return {run,result:feedback(id==='rollout'?'Field pilot started':'Trial rejected',id==='rollout'?`You piloted after ${c.passes}/4 cases passed. The change adds 1 minute per new start. Live reports and investigated recurrence must now check whether it works.`:'The trial is rejected and the source method remains unchanged. This avoids rollout cost, but does not prevent the original failure from returning.')};
}
function applyVerification(p:Practice,id:string):{run:State;result:PracticeFeedback} {
  const k=practiceIncident(p).station;
  if(id==='claim')return {run:p.run,result:feedback('The observed outcome does not establish future reliability','Keep the distinction between an accepted item and a verified process. More exposure and checks are needed to support a broader claim.',true)};
  if(id==='defer')return {run:p.run,result:feedback('Limits documented; monitoring continues','You completed the incident-level review without treating a favorable outcome as proof. The unresolved source or pilot questions remain open.')};
  const run=command(p.run,{kind:id==='withdraw'?'withdraw':'standardize',station:k});
  if(run.message)return {run,result:feedback('The evidence does not support that update',run.message,true)};
  return {run,result:feedback(id==='withdraw'?'Pilot withdrawn':'Standard updated with a check',id==='withdraw'?'Future starts return to the original process. Revisit the cause and propose another bounded test.':'The teaching checkpoint is met. Adoption gives no extra points or performance bonus; the pilot’s actual effects persist and need continued monitoring.')};
}
/** Execute a learner choice and preserve operational evidence for formative feedback. */
export function choosePractice(p:Practice,id:string):Practice {
  if(p.feedback||p.step==='complete')return p;
  const choice=practiceChoices(p).find(c=>c.id===id);if(!choice)return p;
  if(id==='monitor'){
    const f=facilitateField(p.run,practiceIncident(p).station,p.incidentId,12);
    const result=feedback('Additional field exposure gathered','Review the updated reports and recurrence before deciding. More observations can reveal a failure rather than merely confirming your hypothesis.');
    result.evidence=evidence(p,f.run);
    return {...p,run:f.run,checkpoint:f.run,facilitatorActions:p.facilitatorActions+f.actions,feedback:result,attempts:[...p.attempts,{step:p.step,action:id,label:choice.label,reason:p.reason,before:p.run.time,after:f.run.time,feedback:result}]};
  }
  const handlers={contain:applyContain,observe:applyObservation,recover:applyRecovery,restart:applyRestart,experiment:applyExperiment,pilot:applyPilot,verify:applyVerification};
  const {run,result}=handlers[p.step](p,id);result.evidence=evidence(p,run);
  return {...p,run,feedback:result,attempts:[...p.attempts,{step:p.step,action:id,label:choice.label,reason:p.reason,before:p.run.time,after:run.time,feedback:result}]};
}
/** Move to the next checkpoint only after the current operational result is reviewed. */
export function nextPractice(p:Practice):Practice {
  if(!p.feedback||p.feedback.blocked)return p;
  if(p.attempts.at(-1)?.action==='monitor')return {...p,feedback:null,reason:''};
  const steps=practiceSteps[p.mode],next=steps[steps.indexOf(p.step)+1];
  if(!next)return p;
  let run=p.run,facilitatorActions=p.facilitatorActions;
  if(next==='verify'){
    const f=facilitateField(run,practiceIncident(p).station,p.incidentId);run=f.run;facilitatorActions+=f.actions;
  }
  return {...p,run,step:next,checkpoint:run,facilitatorActions,feedback:null,reason:''};
}
/** Rewind a checkpoint while retaining the attempted choice and its evidence. */
export function retryPractice(p:Practice):Practice {return {...p,run:p.checkpoint,feedback:null,reason:''};}
/** Export decision evidence without treating completion as a validated proficiency score. */
export function practiceRecord(p:Practice,reflection:string):string {
  const i=practiceIncident(p),m=metrics(p.run);
  const attempts=p.attempts.map((a,n)=>`### ${n+1}. ${stepTitles[a.step]}\n\nChoice: ${a.label}\n\nReason: ${a.reason.trim()||'Not recorded'}\n\n${a.feedback.title}: ${a.feedback.body}\n\n${a.feedback.evidence.map(e=>`- ${e.label}: ${e.value}`).join('\n')}`).join('\n\n');
  return `# Andon capability practice record\n\nMode: ${p.mode==='guided'?'Guided worked incident':'Try it yourself'}\nStation: ${stations[i.station]}\nSeed: ${p.run.config.seed}\nCheckpoint: ${stepTitles[p.step]}\nCoaching prompts used: ${p.hintUsed?'Yes':'No'}\n\nThis is formative practice, not a validated readiness score. Rewound attempts are alternative branches from their checkpoints; final measures describe the current branch, not their cumulative sum. The field-observation facilitator made ${p.facilitatorActions} support assignments; its work is separate from the learner's recorded choices. Model timings and probabilities are teaching assumptions.\n\n${attempts}\n\n## Observed operational measures\n\n${m.reported} customer reports received; ${m.rejected} rejections reported. ${m.backlog} unfinished orders. ${m.supportMinutes} responder-minutes, including facilitator work. Unreported quality is not revealed here.\n\n## Reflection: what evidence would change your next action?\n\n${reflection.trim()||'Not recorded'}\n`;
}
