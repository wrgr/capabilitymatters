import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewContext} from '../../../public/agentic-le/replay/brief.js';
import {snapshot} from '../../../public/agentic-le/replay/state.js';
const published=JSON.parse(fs.readFileSync(new URL('../../../public/agentic-le/cases.json',import.meta.url))).cases.map(c=>c.journal.replace(/\.json$/,''));
for(const name of [...published,'exemplar']){
 const run=JSON.parse(fs.readFileSync(new URL('../../../public/agentic-le/replay/'+name+'.json',import.meta.url)));
 const frozen=JSON.stringify(run);
 for(let seq=1;seq<=run.events.length;seq++){
  for(const [id,artifact] of Object.entries(snapshot(run,seq).artifacts)){
   const context=reviewContext(run,seq,id),decision=run.events[artifact.trigger_seq-1];
   assert.equal(context.artifact.content.body,artifact.content.body,'Brief must retain all recorded text');
   assert.equal(context.decision,decision.seq);
   assert.deepEqual(context.human,decision.payload.response.human_capabilities);
   assert.deepEqual(context.system,decision.payload.response.system_capabilities);
   assert.ok(context.contributions.every(c=>c.seq<decision.seq&&c.seq<=seq));
   assert.ok(context.checks.every(c=>c.seq<=seq&&(c.payload.artifact_hash===artifact.content_hash||c.payload.content_hash===artifact.content_hash||run.events[c.payload.artifact_seq-1]?.payload.content_hash===artifact.content_hash)));
  }
 }
 assert.equal(JSON.stringify(run),frozen);
 assert.equal(reviewContext(run,1,'build'),null);
}
const school=JSON.parse(fs.readFileSync(new URL('../../../public/agentic-le/replay/school-science.json',import.meta.url)));
assert.equal(reviewContext(school,80,'build').checks.length,0);
assert.equal(reviewContext(school,81,'build').checks.length,1);
assert.equal(reviewContext(school,81,'design').checks.length,0,'A Build check cannot validate Design');
assert.ok(reviewContext(school,30,'design').artifact.content.body.length>5000);
const rehearsal=JSON.parse(fs.readFileSync(new URL('../../../public/agentic-le/replay/exemplar.json',import.meta.url)));
assert.ok(reviewContext(rehearsal,rehearsal.events.length,'build').prerequisites.some(x=>x.stage==='design'));
assert.equal(reviewContext(school,82,'build').prerequisites.length,0);
assert.equal(reviewContext(school,38,'build').prerequisites.length,0);
assert.ok(reviewContext(school,30,'design').legacy,'New task lenses must not be assigned to historical roles');
console.log('Full brief text, source capability statements, prior contributions, exact-artifact verification and temporal visibility verified across all published journals.');
