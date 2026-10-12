import {snapshot} from './state.js?v=quality-3';
export function reviewContext(run,seq,id){
 const state=snapshot(run,seq),artifact=state.artifacts[id];
 if(!artifact)return null;
 const decision=state.events.find(e=>e.seq===artifact.trigger_seq),response=decision?.payload.response;
 const lensIndex=Object.fromEntries((run.role_profiles?.framework?.task_lenses||[]).map(l=>[l.id,l]));
 const contributions=(response?.evidence_refs||[]).map(n=>state.events.find(e=>e.seq===n)).filter(Boolean).map(e=>({seq:e.seq,kind:e.kind,role:e.agent,name:run.roster?.[e.agent]?.name||'Run record',message:e.payload.response?.message||e.payload.message||'',lenses:(run.role_profiles?.roles?.[e.agent]?.focus_lenses||[]).map(id=>lensIndex[id]).filter(Boolean)}));
 // A check of a previous revision or another stage cannot validate this artifact.
 const checks=state.events.filter(e=>e.kind==='verification'&&(e.payload.artifact_hash===artifact.content_hash||e.payload.content_hash===artifact.content_hash||e.payload.artifact_seq===artifactEvent(state,artifact)?.seq));
 const prerequisites=['understand','model','design'].map(stage=>({stage,artifact:state.artifacts[stage]})).filter(x=>x.artifact&&x.artifact.trigger_seq>artifact.trigger_seq);
 return {artifact,prerequisites:id==='build'?prerequisites:[],decision:decision?.seq||null,decisionText:response?.decision||'',contributions,checks,
  human:response?.human_capabilities||[],system:response?.system_capabilities||[],tradeoffs:response?.tradeoffs||[],risks:response?.risks||[],objections:response?.objections||[],flourishing:response?.flourishing||[],legacy:!run.role_profiles?.framework?.task_lenses};
}
function artifactEvent(state,artifact){return state.events.find(e=>e.kind==='artifact'&&e.payload.content_hash===artifact.content_hash);}
