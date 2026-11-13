/** Validate the public Andon experiment through its simulation and rendered controls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {create,tick,advance,command,metrics,draw,defaultConfig,SHIFT,capacity,freeCapacity,fieldEvidence} from '../engine.ts';
const run=(config,policy=()=>[])=>{let s=create(config);while(s.time<SHIFT){for(const c of policy(s))s=command(s,c);s=tick(s);invariants(s);}return s;};
const helpPolicy=s=>s.incidents.filter(i=>i.status==='open'||i.status==='review').map(i=>({kind:i.evidence?(i.truth?'recover':'release'):'inspect',id:i.id}));
function invariants(s){const m=metrics(s);assert.equal(m.arrived,m.delivered+m.backlog);assert.equal(m.delivered,m.valid+m.escapes);assert.ok(m.onTime<=m.due);assert.ok(m.within<=m.assessed);assert.ok(s.jobs.length<=s.config.responders);assert.equal(new Set(s.orders.map(o=>o.id)).size,s.orders.length);for(let k=0;k<3;k++)assert.ok(s.orders.filter(o=>o.stage===k&&o.status==='processing').length<=1);for(const i of s.incidents){const o=s.orders.find(o=>o.id===i.orderId);assert.ok(o);if(i.status!=='closed')assert.equal(o.status,'held');}for(const o of s.orders)if(o.status==='delivered')assert.equal(o.valid,o.defects.length===0);}
function firstSignal(){let s=create();while(!s.incidents.length)s=tick(s);return s;}
function tickN(s,n){while(n--)s=tick(s);return s;}
test('complete playable loop: signal, observe, recover, trial, pilot, field evidence, shift, replay',()=>{
 let s=firstSignal();const i=s.incidents[0],old=structuredClone(s);assert.equal(i.truth,true);
 s=command(s,{kind:'inspect',id:i.id});assert.equal(s.jobs[0].remaining,3);assert.deepEqual(old,firstSignal());assert.equal(s.incidents[0].firstHelp,s.time);
 s=tickN(s,3);assert.equal(s.incidents[0].status,'review');assert.equal(s.incidents[0].evidence,true);
 s=command(s,{kind:'recover',id:i.id});s=tickN(s,5);assert.equal(s.incidents[0].status,'closed');assert.ok(!s.orders.find(o=>o.id===i.orderId).defects.includes(i.station));assert.equal(s.climate[i.station],.89);
 s=command(s,{kind:'trial',station:i.station,hypothesis:2});assert.equal(s.jobs[0].remaining,10);s=tickN(s,10);assert.equal(s.changes[0].tested,4);
 s=command(s,{kind:'rollout',station:i.station});assert.equal(s.changes[0].status,'pilot');assert.equal(s.changes[0].adopted,s.time);
 while(s.time<SHIFT){for(const c of helpPolicy(s))s=command(s,c);s=tick(s);invariants(s);}
 assert.ok(s.orders.length>0);assert.ok(s.orders.some(o=>o.status==='delivered'));assert.ok(fieldEvidence(s,s.changes[0]).reported>0);
 assert.equal(command(s,{kind:'coach',station:0}).message,'Shift ended. Replay to make another decision.');assert.equal(tick(s),s);
 const replay=run(s.initialConfig,helpPolicy);assert.deepEqual(s.orders.map(o=>[o.created,o.due]),replay.orders.map(o=>[o.created,o.due]));
});
test('same seed preserves arrivals; responsive help and dismissal produce different outcomes',()=>{
 const responsive=run(defaultConfig,helpPolicy),dismissed=run(defaultConfig,s=>s.incidents.filter(i=>i.status==='open').map(i=>({kind:'dismiss',id:i.id})));
 assert.deepEqual(responsive.orders.map(o=>[o.created,o.due]),dismissed.orders.map(o=>[o.created,o.due]));assert.ok(metrics(responsive).escapes<metrics(dismissed).escapes);assert.ok(metrics(responsive).within>metrics(dismissed).within);assert.ok(dismissed.climate[1]<responsive.climate[1]);
});
test('responded-to requests do not lose reporting willingness while recovery is still underway',()=>{let s=firstSignal();const i=s.incidents[0];s=command(s,{kind:'inspect',id:i.id});s=tickN(s,3);s=tickN(s,6);assert.equal(s.incidents[0].waited,false);assert.equal(s.climate[i.station],.85);});
test('first response measures include unhelped closed signals as failures',()=>{let s=firstSignal();s=command(s,{kind:'dismiss',id:s.incidents[0].id});const m=metrics(s);assert.equal(m.assessed,1);assert.equal(m.within,0);assert.equal(m.unanswered,1);assert.equal(m.response,null);});
test('containment stops new starts at the boundary and does not release signaled items',()=>{let s=firstSignal();const i=s.incidents[0];s=command(s,{kind:'pause',station:i.station});const checked=s.orders.filter(o=>o.checked.includes(i.station)).length;s=tickN(s,5);assert.equal(s.orders.filter(o=>o.checked.includes(i.station)).length,checked);assert.equal(s.pauseMinutes[i.station],5);s=command(s,{kind:'resume',station:i.station});assert.equal(s.orders.find(o=>o.id===i.orderId).status,'held');});
test('scarce responders, temporary capacity loss, queue assistance and handover have real costs',()=>{
 let s=create({...defaultConfig,responders:1});s=command(s,{kind:'assist',station:1});assert.equal(freeCapacity(s),0);assert.match(command(s,{kind:'coach',station:0}).message,/No responder/);s=tickN(s,8);assert.equal(freeCapacity(s),1);assert.equal(s.supportMinutes,8);
 let v=create({...defaultConfig,conditions:'strained'});v=tickN(v,45);assert.equal(capacity(v),1);v=tickN(v,15);assert.equal(capacity(v),2);
 s.skill[1]=.16;s=command(s,{kind:'swap',station:1,persona:'steady'});assert.equal(s.transition[1],4);assert.equal(s.skill[1],0);assert.equal(s.initialConfig.personas[1],'learner');assert.equal(s.config.personas[1],'steady');
});
test('trial sampling can reject a relevant change or favor an irrelevant one',()=>{const good=[],bad=[];for(let seed=1;seed<=400;seed++){good.push(Array.from({length:4},(_,n)=>draw(seed,700,1,30,n)<.9).filter(Boolean).length);bad.push(Array.from({length:4},(_,n)=>draw(seed,700,1,30,n)<.2).filter(Boolean).length);}assert.ok(good.some(n=>n<4));assert.ok(bad.some(n=>n>=2));});
test('standard checkpoint needs field reports and flags related failures',()=>{let s=create();s.time=60;s.changes=[{station:0,hypothesis:1,tested:4,passes:4,status:'pilot',started:20,adopted:30}];assert.match(command(s,{kind:'standardize',station:0}).message,/3 reported/);s.orders=Array.from({length:3},(_,n)=>({id:n+1,created:1,due:90,stage:3,remaining:0,status:'delivered',priority:'Routine',checked:[0,1,2],defects:[],starts:[31,35,39],deliveredAt:45,valid:true,customerReported:true}));s=command(s,{kind:'standardize',station:0});assert.equal(s.changes[0].status,'standard');s=command(s,{kind:'withdraw',station:0});assert.equal(s.changes[0].status,'rejected');});
test('next-decision stops at system changes and bounded simulation always completes',()=>{let s=create({...defaultConfig,demand:'surge',conditions:'strained'});const times=[];while(s.time<SHIFT){s=advance(s);times.push(s.time);}for(const t of [20,30,45,50,60,66,91,120])assert.ok(times.includes(t),`Missing bulletin ${t}`);});
test('200 seeded shifts across personas and strained demand maintain accounting invariants',()=>{for(let seed=1;seed<=200;seed++)run({...defaultConfig,seed,demand:seed%2?'normal':'surge',conditions:seed%3?'stable':'strained',personas:seed%2?['steady','learner','sprinter']:['cautious','sprinter','steady'],responders:1+seed%3},seed%2?helpPolicy:s=>s.incidents.filter(i=>i.status==='open').map(i=>({kind:'release',id:i.id})));});
