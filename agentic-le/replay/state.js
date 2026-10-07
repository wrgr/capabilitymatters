export const stages=['understand','model','design','build','instrument','deploy','evaluate','refine'];
export const listFields=['advantages','drawbacks','tradeoffs','risks','human_capabilities','system_capabilities','flourishing','objections'];
export function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value!==null&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
export async function digest(value){const bytes=new TextEncoder().encode(canonical(value));const hash=await crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');}
export async function verifyRun(run){
 if(run?.schema_version!==1||!Array.isArray(run.events)||!run.events.length||run.events.length>3000)throw Error('Unsupported or empty run journal');
 if(!run.seed||Object.keys(run.seed).length!==5||!['title','idea','domain','people','constraints'].every(k=>typeof run.seed[k]==='string'&&run.seed[k].trim()&&run.seed[k].length<=6000))throw Error('Invalid seed');
 if(!['scripted-simulation','live-codex'].includes(run.mode))throw Error('Unknown execution mode');
 const manifest=run.events[0].payload;if(run.events[0].kind!=='seed'||['seed','mode','roster','parent'].some(k=>canonical(run[k])!==canonical(manifest[k]))||run.id!==manifest.run_id)throw Error('Run metadata differs from its journal');
 if(canonical(run.role_profiles??null)!==canonical(manifest.role_profiles??null))throw Error('Role profile metadata differs from its journal');
 let previous='0'.repeat(64);const revisions={};
 for(const [i,event] of run.events.entries()){
  const {hash,...body}=event;
  if(event.seq!==i+1||event.prev_hash!==previous||hash!==await digest(body)||!stages.includes(event.stage))throw Error('Journal integrity failed at event '+(i+1));previous=hash;
  const p=event.payload;
  if(['contribution','scenario','decision'].includes(event.kind)){
   const r=p.response;if(!r||typeof r.message!=='string'||!listFields.every(k=>Array.isArray(r[k])&&r[k].every(v=>typeof v==='string'))||!Array.isArray(r.evidence_refs)||!r.evidence_refs.every(n=>Number.isInteger(n)&&n>0&&n<event.seq))throw Error('Invalid contribution or evidence reference');
  }
  if(event.kind==='artifact'){const n=revisions[p.id]||0;if(p.revision!==n+1||p.parent_revision!==(n||null)||p.content_hash!==await digest(p.content)||!Number.isInteger(p.trigger_seq)||p.trigger_seq<=0||p.trigger_seq>=event.seq||run.events[p.trigger_seq-1].kind!=='decision')throw Error('Invalid artifact revision');revisions[p.id]=p.revision;}
 }
 return true;
}
export function snapshot(run,seq){const events=run.events.slice(0,Math.max(0,Math.min(seq,run.events.length)));const artifacts={};for(const e of events)if(e.kind==='artifact')artifacts[e.payload.id]=e.payload;return {events,artifacts};}
export function revisionsAt(run,id,seq){return run.events.slice(0,seq).filter(e=>e.kind==='artifact'&&e.payload.id===id).map(e=>e.payload);}
export function structureCheck(notes){const names={observation:'an observable event',interpretation:'an interpretation to check',opening:'an invitation to hear their account','next-step':'a feasible next step',escalation:'a system-change or escalation boundary',revision:'a response to the counterexample'};return Object.entries(names).filter(([k])=>!notes[k]?.trim()).map(([,v])=>v);}
