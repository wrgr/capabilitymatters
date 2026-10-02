import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {test} from 'node:test';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const env={};
for(const p of ['teaching','scenario','engine'])runInNewContext(read(`public/capability-pipeline/${p}.js`),env);
const {CapabilityTeaching:T,LensData:D,LensEngine:E}=env;
const plain=x=>JSON.parse(JSON.stringify(x));
const old={};
runInNewContext(execFileSync('git',['show','afd4896:public/capability-pipeline/scenario.js'],{encoding:'utf8'}),old);

test('Map labels keep the same stable stage keys and legacy imports',()=>{
 const meta=JSON.parse(read('src/data/capability-cycle.json'));
 assert.equal(meta.stages.length,8);
 assert.equal(meta.stages[1].id,'model');assert.equal(meta.stages[1].label,'Map');
 assert.equal(D.cycle[1].title,'Map');
 assert.deepEqual(plain(D.cycle.map(s=>s.id)),plain(old.LensData.cycle.map(s=>s.id)));
 E.validate(old.LensData.scenario); E.validate(D.scenario);
});
test('five worked cases have eight application questions and bounded interpretation',()=>{
 assert.equal(Object.keys(T.worked).length,5);
 for(const c of Object.values(T.worked)){
  assert.equal(c.questions.length,8);assert(c.questions.every(q=>q.length>35));
  for(const k of ['why','decision','watch'])assert(c.turn[k].length>40);
 }
});
test('every stock choice and disruption has learner guidance',()=>{
 for(const step of D.scenario.steps)for(const a of step.actions){
  const key=['decline','pause','pivot','negotiate'].includes(a.kind)?a.kind:a.id;
  assert(T.choices[key],`Missing guidance for ${a.id}`);
 }
 for(const e of D.scenario.events)assert(T.events[e.id],`Missing guidance for ${e.id}`);
});
test('teaching and label edits leave simulated constraints, draws and numeric outcomes unchanged',()=>{
 for(let i=0;i<8;i++)for(const action of old.LensData.scenario.steps[i].actions){
  const c1=old.LensData.scenario,c2=D.scenario;
  const s1=E.initial(c1,'teaching-regression'),s2=E.initial(c2,'teaching-regression');
  for(const s of [s1,s2]){s.stage=i;s.turn=i;s.visited=Array.from({length:i+1},(_,n)=>n);}
  const a2=c2.steps[i].actions.find(a=>a.id===action.id);
  assert.equal(E.blocked(s1,action),E.blocked(s2,a2));
  assert.deepEqual(plain(E.probabilities(c1,s1,action)),plain(E.probabilities(c2,s2,a2)));
  if(!E.affordable(s1,action))continue;
  const r1=E.roll(c1,s1,action.id,'Check the original requirement',null),r2=E.roll(c2,s2,action.id,'Check the original requirement',null);
  assert.deepEqual(plain(r1.state),plain(r2.state));
  assert.equal(r1.record.draw,r2.record.draw);assert.deepEqual(plain(r1.record.changes),plain(r2.record.changes));
 }
});
