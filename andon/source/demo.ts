/** Drive a narrated demonstration through real practice commands and observable evidence. */
import {fieldEvidence,SHIFT} from './engine.ts';
import {choosePractice,nextPractice,practiceIncident,practiceChoices,type Practice} from './practice.ts';
/** Select a worked decision from the current observation rather than assume success. */
export function demoChoice(p:Practice):string {
  const incident=practiceIncident(p);
  switch(p.step){
    case 'contain':return 'station';
    case 'observe':return 'inspect';
    case 'recover':return incident.evidence&&!incident.truth?'release':'recover';
    case 'restart':return 'resume';
    case 'experiment':return 'trial:2';
    case 'pilot':{
      const change=p.run.changes.find(c=>c.station===incident.station&&c.status==='trial');
      return change&&change.tested===4&&change.passes>=3?'rollout':'reject';
    }
    case 'verify':{
      const change=p.run.changes.find(c=>c.station===incident.station&&c.status==='pilot');
      if(!change||p.run.time>=SHIFT)return 'defer';
      const field=fieldEvidence(p.run,change);
      if(field.failures||field.recurrences)return 'withdraw';
      return field.reported>=3?'standardize':'defer';
    }
    case 'complete':return '';
  }
}
/** Explain the current decision with limits on what the available evidence establishes. */
export function demoNarration(p:Practice):string {
  if(p.feedback)return p.feedback.blocked?'The demo has paused because this decision needs review. Take over to revise it.':`${p.feedback.title}. ${p.feedback.body}`;
  const notes:Record<Practice['step'],string>={
    contain:'The item is already held. This worked example also contains new station starts while a possible shared-process risk is investigated. Wider containment costs capacity.',
    observe:'Andon creates an obligation to provide timely help. Assign a responder to observe actual work before treating a concern as a diagnosis.',
    recover:practiceIncident(p).evidence&&!practiceIncident(p).truth?'Observation found no deviation. Release the verified item and preserve scarce support capacity.':'Observation established a defect. Correct and verify this item; its recovery does not remove the source cause.',
    restart:'Restart the station after item recovery. Other held items still need attention, and a source countermeasure has not yet been verified.',
    experiment:'The observed identifier mismatch suggests printing and matching full identifiers. Test that specific change with four challenge cases before exposing live work.',
    pilot:'Read the actual challenge results. Three or four passes support a bounded live pilot in this demonstration; fewer passes lead to rejection. Four cases cannot prove reliability.',
    verify:'Use reported pilot exposure, related customer escapes, and repeat signals. Update only if the teaching checkpoint is met; withdraw on observed failure, or keep the limits explicit.',
    complete:'The worked loop is complete. Review the actual decisions and consequences, then try the different incident yourself. Watching is not evidence of management capability.'
  };
  return notes[p.step];
}
/** Advance one visible beat, retaining blocked feedback for an explicit human decision. */
export function advanceDemo(p:Practice):Practice {
  if(p.step==='complete'||p.feedback?.blocked)return p;
  if(p.feedback)return nextPractice(p);
  const id=demoChoice(p);
  if(!practiceChoices(p).some(c=>c.id===id))throw new Error(`Demo choice unavailable at ${p.step}: ${id}`);
  return choosePractice({...p,reason:`Demonstration: ${demoNarration(p)}`},id);
}
