/** Guard disclosure content, coverage, escaping, link resolution, placement and repeatable packaging. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {resolve} from 'node:path';
import resources from '../src/data/resource-about.json' with {type:'json'};
import statuses from '../src/data/prototypes/status.json' with {type:'json'};
import {renderResourceAbout} from '../src/lib/resource-about.mjs';
import {insertResourceAbout, staticResources} from '../scripts/build-resource-about.mjs';

test('every authored guide has three native, collapsed sections and meaningful use steps', () => {
  for (const [key, data] of Object.entries(resources)) {
    const html = renderResourceAbout(key);
    assert.match(html, /^<details class="resource-about"/);
    assert.doesNotMatch(html, /<details[^>]*\sopen|aria-expanded|<script/);
    assert.equal((html.match(/<h2>/g) || []).length, 3, key);
    assert(data.what.length > 50 && data.connection.length > 120, key);
    assert(data.how.length >= 2, key);
  }
});
test('unsafe text is escaped and absent content or unsafe links fail the build', () => {
  const content = {what:'<img src=x onerror="alert(1)">',how:['Use < and &.'],connection:'Explain <script> & "quotes".'};
  const html = renderResourceAbout('test"', content);
  assert.match(html, /&lt;img/); assert.doesNotMatch(html, /<img|<script/);
  assert.match(html, /data-resource-about="test&quot;"/);
  assert.throws(() => renderResourceAbout('unknown'), /Incomplete/);
  assert.match(renderResourceAbout('nested',content,3), /<h3>What is this resource/);
  assert.throws(() => renderResourceAbout('level',content,1), /Invalid resource heading/);
  assert.throws(() => renderResourceAbout('empty', {...content,how:[]}), /Incomplete/);
  for (const href of ['javascript:alert(1)', '//example.org', 'data:text/html,test']) {
    assert.throws(() => renderResourceAbout('test', {...content,links:[{label:'Unsafe',href}]}), /Invalid/);
  }
});
test('every working prototype and field note is covered; internal guidance links resolve', () => {
  for (const entry of Object.values(statuses).filter(value => value.workingPrototype)) {
    assert(resources[entry.url.split('/').filter(Boolean).at(-1)], entry.url);
    const html = readFileSync(resolve('dist',entry.url.slice(1),'index.html'),'utf8');
    assert(html.indexOf('data-resource-about=') < html.indexOf('class="workbench-app"'), entry.url);
  }
  for (const file of readdirSync('src/content/field-notes')) assert(resources[file.replace(/\.mdx$/, '')],file);
  for (const [key,data] of Object.entries(resources)) {
    for (const {href} of data.links || []) if (href.startsWith('/')) {
      const path = new URL(href,'https://capabilitymatters.org').pathname;
      assert(existsSync(resolve('dist',path.slice(1),path.endsWith('/')?'index.html':'')), `${key}: ${href}`);
    }
  }
});
test('standalone packaging is idempotent and refuses missing or ambiguous boundaries', () => {
  for (const [file,key,boundary] of staticResources) {
    const html = readFileSync(resolve('public',file),'utf8');
    const once = insertResourceAbout(html,key,boundary);
    assert.equal(insertResourceAbout(once,key,boundary),once,file);
    assert.equal((once.match(/data-resource-about=/g)||[]).length,1,file);
    assert.match(once,/href="\/resource-about.css"/);
    assert(once.indexOf('data-resource-about=') < once.lastIndexOf(boundary),file);
  }
  assert.throws(() => insertResourceAbout('<p>No boundary</p>','pipeline','<main>'),/Expected one/);
  assert.throws(() => insertResourceAbout('<main></main><main></main>','pipeline','<main>'),/Expected one/);
});
