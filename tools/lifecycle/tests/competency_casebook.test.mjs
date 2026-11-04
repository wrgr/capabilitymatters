import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runCasebook} from "../competency_casebook_runner.mjs";
const book=JSON.parse(readFileSync("src/data/lifecycle/competency-casebook-v1.json","utf8"));
const saved=JSON.parse(readFileSync("data/lifecycle/competency-casebook/observations-v1.json","utf8"));
const result=runCasebook(book);
test("published casebook evidence has exact deterministic replay",()=>{
 assert.deepEqual(result,saved);
 assert.deepEqual(result.checks,{budget_exceeded:0,unavailable_expert_actions:0,altered_freezes:0,unmatched_events:0,unauthorized_role_actions:0,missing_stress_levels:0});
 assert.equal(result.case_count,3);assert.equal(result.designs,36);assert.equal(result.stress_tests,108);
 assert.equal(result.live_model_calls,0);assert.equal(result.human_participants,0);
});
test("every case has scenario-dependent specialist access, finite conditions, and matched events",()=>{
 assert.equal(new Set(book.cases.map(c=>c.id)).size,3);
 for(const c of book.cases){
  assert.ok(c.actors.some(a=>a.status==="consultable"));
  assert.ok(c.actors.some(a=>a.status==="embedded"));
  assert.ok(c.conditions.length>=3);
  assert.deepEqual(Object.keys(c.event_severity).sort(),["easy","hard","medium"]);
  for(const condition of c.conditions) {
   for(const actor of condition.consultable||[])assert.equal(c.actors.find(a=>a.id===actor)?.status,"consultable");
   assert.ok(condition.consult_rate>=0&&condition.consult_rate<=1);
  }
  const ids=c.actions.map(a=>a.id);assert.equal(new Set(ids).size,ids.length);
  for(const a of c.actions)assert.ok(c.actors.some(p=>p.id===a.owner));
 }
});
test("frozen budgets and specialist authorization are respected",()=>{
 for(const row of result.entries){
  const c=book.cases.find(c=>c.id===row.case_id);
  assert.equal(row.artifact_hash,row.tests[0].artifact_hash);
  assert.ok(row.artifact.spent<=c.budget);
  for(const a of row.artifact.actions){
   assert.ok(row.artifact.available_team.includes(a.owner));
   assert.ok(a.cost>0);
  }
  for(const obs of row.tests){
   assert.equal(obs.artifact_hash,row.artifact_hash);
   assert.equal(obs.evidence_kind,"authored_surrogate");
   for(const value of Object.values(obs.outcomes))assert.ok(Number.isFinite(value));
  }
 }
});
test("identical treatments stay identical; leadership label alone is not a competence effect",()=>{
 for(const seed of result.seeds){
  const x=result.entries.find(x=>x.case_id==="benefits_service"&&x.condition==="operations_lead"&&x.seed===seed);
  const y=result.entries.find(x=>x.case_id==="benefits_service"&&x.condition==="hcc_lead"&&x.seed===seed);
  assert.deepEqual(x.artifact.actions,y.artifact.actions);
  assert.deepEqual(x.tests.map(t=>t.outcomes),y.tests.map(t=>t.outcomes));
 }
});
test("retained casebook is explicitly mechanistic; not a live agentic study",()=>{
 assert.equal(saved.evidence_kind,"authored_policy_fixture");
 assert.match(saved.disclaimer,/not evidence of live-agent behavior/i);
 assert.equal(saved.live_model_calls,0);
});
