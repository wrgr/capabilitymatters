import assert from 'node:assert/strict';
import fs from 'node:fs';
import {meetingAt,nextMeetingEvent,voiceFor,meetingKinds} from '../../../public/agentic-le/replay/conversation.js';
import {verifyRun} from '../../../public/agentic-le/replay/state.js';
const root=new URL('../../../',import.meta.url);
const voices=JSON.parse(fs.readFileSync(new URL('src/data/lifecycle/meeting-voices.json',root)));
const registry=JSON.parse(fs.readFileSync(new URL('src/data/lifecycle/roles.json',root)));
assert.deepEqual(Object.keys(voices.roles).sort(),registry.default_roles.toSorted());
for(const name of ['live-exemplar','school-science','library-access','exemplar']){
 const run=JSON.parse(fs.readFileSync(new URL('public/agentic-le/replay/'+name+'.json',root)));
 const frozen=JSON.stringify(run);
 await verifyRun(run);
 // Inspect every timeline prefix, including failures, revisions and human gates.
 for(let seq=1;seq<=run.events.length;seq++){
  const turns=meetingAt(run,seq);
  assert.equal(turns.length,run.events.slice(0,seq).filter(e=>meetingKinds.has(e.kind)).length);
  for(const turn of turns){
   const event=run.events[turn.seq-1],p=event.payload;
   assert.ok(turn.seq<=seq);
   assert.equal(turn.sourceHash,event.hash);
   assert.equal(turn.hypothetical,event.kind==='scenario'||p.hypothetical===true);
   assert.deepEqual(turn.refs.map(r=>r.seq),p.response?.evidence_refs||[]);
   assert.ok(turn.refs.every(r=>r.seq<turn.seq&&r.seq<=seq));
   if(p.response){
    for(const block of turn.blocks){
     const source=p.response[block.field];
     assert.ok(Array.isArray(source)?source.includes(block.text):source.includes(block.text),name+' #'+turn.seq+' '+block.field);
    }
    if(p.response.decision)assert.equal(turn.blocks.find(b=>b.field==='decision').text,p.response.decision);
    if(event.kind==='scenario'&&p.response.challenged_assumption)assert.equal(turn.blocks.find(b=>b.field==='challenged_assumption').text,p.response.challenged_assumption);
   }else{
    assert.equal(turn.voice,'');
    if(event.kind==='human_gate')assert.match(turn.speaker,/gate.*run record/);
   }
  }
  const filtered=meetingAt(run,seq,{role:'learning'});
  assert.ok(filtered.every(t=>t.agent==='learning'));
  const neutral=meetingAt(run,seq,{personality:false});
  assert.deepEqual(neutral.map(t=>t.blocks.map(b=>b.text)),turns.map(t=>t.blocks.map(b=>b.text)));
  assert.ok(neutral.every(t=>t.voice===''));
  const next=nextMeetingEvent(run,seq,1),previous=nextMeetingEvent(run,seq,-1);
  assert.ok(next>=seq&&next<=run.events.length&&previous<=seq&&previous>=1);
  assert.notEqual(run.events[next-1].kind,'request');
 }
 assert.equal(JSON.stringify(run),frozen,'Presentation must not mutate the source journal');
}
// Complete-sentence selection must not split decimals or change an uncertainty statement.
const run=JSON.parse(fs.readFileSync(new URL('public/agentic-le/replay/school-science.json',root)));
const event=run.events.find(e=>e.payload.response);
event.payload.response.message='The estimate is 0.5, not proof. We do not know whether it transfers. More review is needed.';
const speech=meetingAt(run,event.seq).find(t=>t.seq===event.seq).blocks[0].text;
assert.equal(speech,'The estimate is 0.5, not proof. We do not know whether it transfers.');
assert.equal(voiceFor('unknown'),null);
console.log('All four journals: meeting highlights preserve source wording, decisions, hypothetical status, cited events, timeline boundaries and immutable records; neutral voices and playback checkpoints verified.');
