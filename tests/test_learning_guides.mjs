import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const guides=JSON.parse(read('src/data/learning-guides.json'));
const statuses=JSON.parse(read('src/data/prototypes/status.json'));
test('every prototype brief has exactly one guide with the current availability and destination',()=>{
 const prototypeGuides=guides.filter(g=>g.kind==='prototype');
 assert.deepEqual(prototypeGuides.map(g=>g.briefId).sort(),Object.keys(statuses).sort());
 const files=['aile-1','aile-2','aile-3','lxd-1','lxd-2','lxd-3','lxd-4','lens-1','lens-canonical'];
 const briefs=files.flatMap(name=>JSON.parse(read(`src/data/problems-to-prototypes/${name}.json`)));
 for(const brief of briefs){const guide=prototypeGuides.find(g=>g.briefId===brief.id);assert.equal(guide.title,brief.title);assert.equal(guide.context,brief.gap);assert.equal(guide.example,brief.example);assert.equal(guide.evidence,brief.cycle.instrument);assert.equal(guide.url,statuses[brief.id].url||`/problems-to-prototypes/#${brief.id}`);assert.equal(guide.limits.startsWith('Design brief only'),!statuses[brief.id].workingPrototype);}
});
test('experiment directory entries all have a guide and no guide is orphaned',()=>{
 const page=read('src/pages/experiments.astro');
 const referenced=[...page.matchAll(/guide: "([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(referenced.sort(),guides.filter(g=>g.kind==='experiment').map(g=>g.id).sort());
});
test('all next-guide references resolve and all guide pages exist after building',()=>{
 const ids=new Set(guides.map(g=>g.id));assert.equal(ids.size,guides.length);
 for(const guide of guides){assert.match(guide.id,/^[a-z0-9-]+$/);for(const next of guide.next){assert(ids.has(next),`${guide.id} → ${next}`);assert.notEqual(guide.id,next);}assert(fs.existsSync(path.join(root,'dist/guides',guide.id,'index.html')),guide.id);}
});
