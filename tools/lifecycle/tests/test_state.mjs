import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyRun,snapshot,revisionsAt,structureCheck} from '../../../public/agentic-le/replay/state.js';
const run=JSON.parse(fs.readFileSync(new URL('../../../public/agentic-le/replay/exemplar.json',import.meta.url)));
await verifyRun(run);
const first=run.events.find(e=>e.kind==='artifact');
assert.deepEqual(snapshot(run,first.seq-1).artifacts,{});
assert.equal(snapshot(run,first.seq).artifacts.understand.revision,1);
const revised=run.events.find(e=>e.kind==='artifact'&&e.payload.id==='model'&&e.payload.revision===2);
assert.equal(revisionsAt(run,'model',revised.seq-1).length,1);
assert.equal(revisionsAt(run,'model',revised.seq).length,2);
const bad=structuredClone(run);bad.events[3].payload.response.message='altered';
await assert.rejects(()=>verifyRun(bad),/integrity/);
const wrongMode=structuredClone(run);wrongMode.mode='live-codex';
await assert.rejects(()=>verifyRun(wrongMode),/metadata/);
assert.equal(structureCheck({}).length,6);
assert.equal(structureCheck(Object.fromEntries(['observation','interpretation','opening','next-step','escalation','revision'].map(k=>[k,'present']))).length,0);
assert.equal(structureCheck({observation:'   '}).length,6);
console.log('Replay integrity, immutable revision visibility, metadata and practice structure checks passed.');

const profileGraft=structuredClone(run);profileGraft.role_profiles={registry_version:'invented'};await assert.rejects(()=>verifyRun(profileGraft),/Role profile metadata/);

// Each new case exposes only the artifacts already created at the cited event.
for(const name of ['school-science.json','library-access.json']){
 const saved=JSON.parse(fs.readFileSync(new URL('../../../public/agentic-le/replay/'+name,import.meta.url)));
 await verifyRun(saved);
 const first=saved.events.find(e=>e.kind==='artifact');
 assert.deepEqual(snapshot(saved,first.seq-1).artifacts,{});
 assert.deepEqual(Object.keys(snapshot(saved,first.seq).artifacts),['understand']);
 const build=saved.events.find(e=>e.kind==='artifact'&&e.payload.id==='build');
 assert.equal(snapshot(saved,build.seq-1).artifacts.build,undefined);
 assert.ok(snapshot(saved,build.seq).artifacts.build.content.prototype_html);
 const bad=structuredClone(saved);bad.role_profiles.roles.domain.profile_id='workforce-domain';
 await assert.rejects(()=>verifyRun(bad),/Role profile metadata/);
}
console.log('Diverse case replay visibility and pinned-domain integrity checks passed.');

// Each demo and product must derive from the same saved Build; changing cases cannot reuse another demo.
const {caseDemo}=await import('../../../public/agentic-le/replay/case-demo.js');
const {createHash}=await import('node:crypto');
const inventory=JSON.parse(fs.readFileSync(new URL('../../../public/agentic-le/cases.json',import.meta.url))).cases;
for(const c of inventory){
 const saved=JSON.parse(fs.readFileSync(new URL('../../../public/agentic-le/replay/'+c.journal,import.meta.url)));
 const demo=caseDemo(saved,inventory), build=snapshot(saved,saved.events.length).artifacts.build;
 assert.equal(demo.source,build.content.prototype_html);
 assert.equal(demo.content_hash,build.content_hash);
 assert.equal(demo.product,c.product);
 assert.equal(saved.events[demo.seq-1].payload.content_hash,demo.content_hash);
 const manifest=JSON.parse(fs.readFileSync(new URL('../../../public'+c.product+'manifest.json',import.meta.url)));
 assert.equal(manifest.run_id,saved.id);
 assert.equal(manifest.build_content_hash,demo.content_hash);
 const candidate=fs.readFileSync(new URL('../../../public'+c.product+'candidate.html',import.meta.url));
 const archived=fs.readFileSync(new URL('../../../public/agentic-le/replay/artifacts/'+demo.content_hash+'.html',import.meta.url));
 assert.deepEqual(candidate,archived);
 assert.equal(createHash('sha256').update(candidate).digest('hex'),manifest.files['candidate.html']);
 assert.equal(caseDemo({...saved,events:saved.events.slice(0,demo.seq-1)},inventory)?.seq < demo.seq || caseDemo({...saved,events:saved.events.slice(0,demo.seq-1)},inventory)===null,true);
}
assert.equal(caseDemo({events:[]},inventory),null);
assert.equal(caseDemo(run,[]).product,null);
console.log('All three case demos match their agent Build, archived preview and product manifest.');
