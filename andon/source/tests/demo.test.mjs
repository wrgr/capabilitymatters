/** Verify automated decisions complete a real loop and respect contrary evidence. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createPractice,choosePractice,nextPractice,practiceIncident} from '../practice.ts';
import {advanceDemo,demoChoice,demoNarration} from '../demo.ts';
import {fieldEvidence} from '../engine.ts';
function reachVerify(){let p=createPractice();for(let n=0;n<20&&p.step!=='verify';n++)p=advanceDemo(p);assert.equal(p.step,'verify');return p;}
test('automated beats expose each actual consequence before completing the management loop',()=>{
 let p=createPractice(),beats=0;const actions=[];
 while(p.step!=='complete'&&beats++<25){const before=p;p=advanceDemo(p);if(!before.feedback){assert.ok(p.feedback);assert.equal(p.feedback.blocked,false);assert.ok(p.attempts.at(-1).reason.startsWith('Demonstration:'));actions.push(p.attempts.at(-1).action);}else assert.equal(p.feedback,null);}
 assert.equal(p.step,'complete');assert.equal(beats,14);assert.deepEqual(actions.slice(0,6),['station','inspect','recover','resume','trial:2','rollout']);assert.ok(p.facilitatorActions>0);assert.ok(p.run.time>28);
 const change=p.run.changes.find(c=>c.station===practiceIncident(p).station);if(actions.at(-1)==='standardize'){const f=fieldEvidence(p.run,change);assert.ok(f.reported>=3);assert.equal(f.failures+f.recurrences,0);}
 assert.equal(advanceDemo(p),p);assert.match(demoNarration(p),/Watching is not evidence/);
});
test('verification withdraws on observed related failure and defers insufficient exposure',()=>{
 const p=reachVerify(),c=p.run.changes.find(c=>c.status==='pilot');assert.ok(c);
 const failed=structuredClone(p),order=failed.run.orders.find(o=>o.starts[c.station]>c.adopted&&o.status==='delivered'&&o.customerReported);assert.ok(order);order.defects.push(c.station);assert.equal(demoChoice(failed),'withdraw');
 const unknown=structuredClone(p);for(const o of unknown.run.orders)o.customerReported=false;assert.equal(demoChoice(unknown),'defer');
});
test('blocked attempts remain visible and a normal observation selects verified release',()=>{
 const blocked=choosePractice(createPractice(),'release');assert.equal(advanceDemo(blocked),blocked);assert.match(demoNarration(blocked),/paused/);
 let p=createPractice('transfer');for(const id of ['item','inspect'])p=nextPractice(choosePractice(p,id));assert.equal(demoChoice(p),'release');assert.match(demoNarration(p),/no deviation/);
});
test('weak challenge results are rejected rather than narrated as a successful pilot',()=>{
 let p=createPractice();while(p.step!=='pilot')p=advanceDemo(p);p=structuredClone(p);p.run.changes[0].passes=1;assert.equal(demoChoice(p),'reject');const result=advanceDemo(p);assert.equal(result.feedback.blocked,false);assert.equal(result.run.changes[0].status,'rejected');
});
