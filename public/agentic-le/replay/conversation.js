import {meetingVoices} from './meeting-voices.js?v=meeting-1';
import {snapshot} from './state.js';
import {stageLabels} from './stage-labels.js';
export const meetingKinds=new Set(['seed','contribution','decision','scenario','failure','verification','human_gate','revision_link','completed']);
const label=stage=>stageLabels[stage]||stage;
export function voiceFor(role){return meetingVoices.roles[role]||null;}
// A highlight selects complete sentences without rewriting the source's claims.
// Keep the remaining text in the original contribution, reachable on every card.
function highlight(message){
 const sentences=typeof Intl.Segmenter==='function'?Array.from(new Intl.Segmenter('en',{granularity:'sentence'}).segment(message),s=>s.segment):[message];
 return sentences.slice(0,2).join('').trim();
}
export function meetingAt(run,seq,{role='all',personality=true}={}){
 const visible=snapshot(run,seq).events;
 return visible.filter(e=>meetingKinds.has(e.kind)&&(role==='all'||e.agent===role)).map(event=>{
  const p=event.payload,r=p.response,voice=voiceFor(event.agent);
  const speaker=r?(run.roster?.[event.agent]?.name||'Contributor'):event.kind==='seed'?'Seed contributor':event.kind==='human_gate'?'Human review gate · run record':event.kind==='revision_link'?'Revision trail':'Run record';
  const blocks=[];
  const add=(text,field,bridge='')=>{if(text)blocks.push({text,field,bridge});};
  if(r){
   add(highlight(r.message),'message',personality&&voice?voice.openings[(visible.filter(e=>e.agent===event.agent&&e.payload.response&&e.seq<event.seq).length)%voice.openings.length]:'');
   if(event.kind==='scenario')add(r.challenged_assumption,'challenged_assumption',personality&&voice?voice.concern:'Assumption under challenge:');
   else {
    const field=['tradeoffs','risks','objections','drawbacks'].find(key=>r[key]?.length);
    if(field)add(r[field][0],field,personality&&voice?voice.concern:'One tension to consider:');
   }
   add(r.decision,'decision',personality&&voice?voice.next:event.kind==='decision'?'Recorded decision:':'Proposed next step:');
  }else if(event.kind==='seed')add(run.seed.idea,'seed.idea','The seed idea we’re starting from:');
  else if(event.kind==='human_gate'){
   add((p.required||[]).join(' · '),'required','Human review is still pending. Before any pilot:');add(p.note,'note');
  }else if(event.kind==='verification'){add(p.message,'message','Technical review from the run record:');add(p.status,'status','Review status:');}
  else if(event.kind==='failure')add(p.message,'message','The run recorded a failure here:');
  else if(event.kind==='revision_link')add('Challenge #'+p.scenario_seq+' → decision #'+p.decision_seq+' → revisit '+label(p.return_stage)+'.','revision_link','The revision trail:');
  else if(event.kind==='completed'){add(p.claim,'claim','Here’s what this run can claim:');add(p.status.replaceAll('_',' '),'status','Recorded status:');}
  return {seq:event.seq,stage:event.stage,kind:event.kind,agent:event.agent,speaker,voice:r&&personality&&voice?voice.style:'',hypothetical:event.kind==='scenario'||p.hypothetical===true,
   sourceHash:event.hash,blocks,refs:(r?.evidence_refs||[]).filter(n=>visible.some(e=>e.seq===n)).map(n=>({seq:n,speaker:run.roster?.[visible.find(e=>e.seq===n).agent]?.name||'Run record'}))};
 });
}

// Preserve artifact and stage checkpoints while skipping provider requests in meeting playback.
export function nextMeetingEvent(run,seq,direction){
 const checkpoints=run.events.filter(e=>meetingKinds.has(e.kind)||e.kind==='artifact'||e.kind==='stage_started');
 return direction>0?(checkpoints.find(e=>e.seq>seq)?.seq||run.events.length):([...checkpoints].reverse().find(e=>e.seq<seq)?.seq||1);
}
