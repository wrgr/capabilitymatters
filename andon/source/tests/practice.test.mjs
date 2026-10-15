/** Verify guided practice, transfer decisions, feedback gates, and operational evidence. */
import test from 'node:test';import assert from 'node:assert/strict';
import {createPractice,choosePractice,nextPractice,retryPractice,practiceIncident,practiceRecord,practiceChoices} from '../practice.ts';
import {fieldEvidence,metrics} from '../engine.ts';
const choose=(p,id)=>nextPractice(choosePractice(p,id));
function pilot(hypothesis=2,boundary='station'){let p=createPractice();for(const id of [boundary,'inspect','recover','resume',`trial:${hypothesis}`,'rollout'])p=choose(p,id);return p;}
test('guided choices execute the complete management loop and expose actual field evidence',()=>{
 let p=pilot();assert.equal(p.step,'verify');const i=practiceIncident(p),c=p.run.changes[0],f=fieldEvidence(p.run,c);
 assert.equal(i.evidence,true);assert.equal(i.resolution,'recovery');assert.equal(p.run.paused[i.station],false);assert.equal(c.tested,4);assert.equal(c.status,'pilot');assert.ok(f.reported>=3);assert.ok(p.facilitatorActions>0);
 const result=choosePractice(p,'standardize');assert.equal(result.feedback.blocked,Boolean(f.failures||f.recurrences));
 p=choose(p,'defer');assert.equal(p.step,'complete');assert.ok(p.attempts.some(a=>a.step==='verify'));assert.ok(p.run.logs.some(l=>l.text.startsWith('Facilitator:')));
});
test('the unfamiliar incident requires normal-work judgment rather than automatic correction',()=>{
 let p=createPractice('transfer');assert.notEqual(practiceIncident(p).station,practiceIncident(createPractice()).station);assert.equal(practiceIncident(p).evidence,false);
 p=choose(p,'item');p=choose(p,'inspect');assert.equal(practiceIncident(p).evidence,true);assert.equal(practiceIncident(p).truth,false);
 const original=structuredClone(p),released=choosePractice(p,'release'),corrected=choosePractice(p,'recover');
 assert.equal(released.run.supportMinutes,3);assert.equal(corrected.run.supportMinutes,8);assert.equal(corrected.feedback.blocked,false);assert.match(corrected.feedback.body,/5 additional/);assert.deepEqual(p,original);
 p=nextPractice(released);p=choose(p,'resume');assert.equal(p.step,'verify');assert.equal(p.run.changes.length,0);p=choose(p,'defer');assert.equal(p.step,'complete');
});
test('skipping help produces a real consequence and requires a checkpoint rewind',()=>{
 const p=createPractice();const released=choosePractice(p,'release');assert.equal(released.feedback.blocked,true);assert.equal(practiceIncident(released).status,'closed');assert.equal(nextPractice(released).step,'contain');assert.ok(released.run.time>p.run.time);const order=released.run.orders.find(o=>o.id===practiceIncident(released).orderId);assert.equal(order.customerReported,true);assert.equal(order.valid,false);
 const retry=retryPractice(released);assert.equal(retry.run.time,p.run.time);assert.equal(practiceIncident(retry).status,'open');assert.equal(retry.attempts.length,1);assert.equal(retry.feedback,null);
});
test('delayed observation misses the promise and lowers reporting willingness in the model',()=>{
 let p=choose(createPractice(),'item');const before=p.run.climate[practiceIncident(p).station];p=choosePractice(p,'wait');assert.equal(p.run.time-p.checkpoint.time,8);assert.equal(p.feedback.blocked,true);assert.ok(p.run.climate[practiceIncident(p).station]<before);assert.ok(metrics(p.run).overdueHelp>0);
});
test('recovery alone does not unlock observed-cause practice; correction follows evidence',()=>{
 let p=choose(createPractice(),'item');const correction=choosePractice(p,'recover');assert.equal(correction.feedback.blocked,true);assert.equal(practiceIncident(correction).evidence,false);
 p=retryPractice(correction);p=choose(p,'inspect');const risky=choosePractice(p,'release');assert.equal(risky.feedback.blocked,true);assert.equal(practiceIncident(risky).resolution,'release');assert.equal(nextPractice(risky).step,'recover');
});
test('claiming a process is fixed from one recovered item is rejected as an unsupported inference',()=>{let p=createPractice();for(const id of ['item','inspect','recover'])p=choose(p,id);const claim=choosePractice(p,'claim');assert.equal(claim.feedback.blocked,true);assert.equal(claim.run.changes.length,0);assert.equal(nextPractice(claim).step,'restart');});
test('an irrelevant pilot can reveal recurrence, and monitoring does not skip verification',()=>{
 let p=pilot(0);const f=fieldEvidence(p.run,p.run.changes[0]);assert.ok(f.recurrences>0||f.failures>0);const bad=choosePractice(p,'standardize');assert.equal(bad.feedback.blocked,true);assert.equal(bad.run.changes[0].status,'pilot');
 p=retryPractice(bad);const time=p.run.time;p=choose(p,'monitor');assert.equal(p.step,'verify');assert.ok(p.run.time>time);p=choose(p,'withdraw');assert.equal(p.step,'complete');assert.equal(p.run.changes[0].status,'rejected');
});
test('rejecting a trial preserves the source and still permits a documented verification loop',()=>{
 let p=createPractice();for(const id of ['item','inspect','recover','resume','trial:0','reject'])p=choose(p,id);assert.equal(p.step,'verify');assert.equal(p.run.changes[0].status,'rejected');assert.deepEqual(practiceChoices(p).map(c=>c.id),['defer','claim']);assert.equal(choose(p,'defer').step,'complete');
});
test('records distinguish learner reasoning, hints, attempts, reports and facilitator work',()=>{
 let p=createPractice();p={...p,reason:'I am protecting downstream quality while keeping the source question open.'};p=choosePractice(p,'station');const record=practiceRecord(p,'I would change the boundary if observation confirms a multi-item cause.');
 assert.ok(record.includes('downstream quality'));assert.ok(record.includes('Coaching prompts used: Yes'));assert.ok(record.includes('formative practice'));assert.ok(record.includes('Unreported quality is not revealed'));assert.ok(record.includes('facilitator'));assert.ok(!record.includes('readiness: 100'));assert.ok(record.includes('multi-item cause'));
});
test('invalid actions, duplicate submissions and unreviewed feedback cannot advance',()=>{const p=createPractice();assert.equal(choosePractice(p,'invent'),p);assert.equal(nextPractice(p),p);const a=choosePractice(p,'item');assert.equal(choosePractice(a,'station'),a);assert.equal(a.attempts.length,1);});
