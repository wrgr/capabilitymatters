import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {prepare,packetFor,checkTurn} from "../live_competency_agents.mjs";
const book=JSON.parse(readFileSync("src/data/lifecycle/competency-casebook-v1.json","utf8"));
test("case briefing excludes hidden causal truth, action menus and future test events",()=>{
 for (const c of book.cases) for(const condition of c.conditions){
  const run=prepare(book,c.id,condition.id);
  const text=JSON.stringify(run.publicCase);
  assert.ok(!text.includes("hidden_hypotheses"));
  assert.ok(!text.includes("event_severity"));
  assert.ok(!Object.prototype.hasOwnProperty.call(run.publicCase,"actions"));
  assert.equal(run.publicCase.evidence.length,c.evidence.length);
 }
});
test("only own private evidence is exposed; proficiencies are distinct",()=>{
 const run=prepare(book,"ai_dispatch_logistics","integrated");
 const ops=packetFor(run,"ops",[],run.core);
 const analyst=packetFor(run,"analyst",[],run.core);
 const observer=JSON.stringify(ops.packet);
 assert.ok(observer.includes("Supervisors disagree"));
 assert.ok(!observer.includes("The denominator and event recording"));
 assert.ok(JSON.stringify(analyst.packet).includes("The denominator and event recording"));
 assert.ok(!ops.deep.includes("learning_sciences"));
});
test("consultable specialist cannot contribute before invitation",()=>{
 const run=prepare(book,"ai_dispatch_logistics","integrated");
 const scope=packetFor(run,"ops",[],run.core);
 const utterance={to:"scientist",kind:"proposal",
 speech:"I suggest that our learning scientist immediately certifies the transfer assessment.",
 evidence_refs:["E1"],expert_claims:[],proposed_action:"Certified transfer assessment",cost:1,followup_question:"Can we proceed?"};
 assert.throws(()=>checkTurn(run,"ops",run.core,scope,utterance),/Uninvited consultant/);
 assert.doesNotThrow(()=>checkTurn(run,"ops",run.core,scope,{...utterance,kind:"consult_request"}));
 assert.throws(()=>checkTurn(run,"ops",run.core,scope,{...utterance,expert_claims:["learning_sciences"]}),/Specialist authority/);
});
