/** Exercise the actual practice buttons and render evidence, review, and mode controls. */
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import ts from 'typescript';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {createPractice,choosePractice,nextPractice,practiceIncident} from '../practice.ts';
const source=readFileSync(new URL('../practice-view.tsx',import.meta.url),'utf8').replace("from './engine'","from './engine.ts'");
const temporary=new URL('../.qa-practice-controls.mjs',import.meta.url);
writeFileSync(temporary,ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {default:PracticeView,PracticeTask,PracticeSummary}=await import(temporary.href);unlinkSync(temporary);
const render=(C,props)=>renderToStaticMarkup(React.createElement(C,props));
function text(el){if(typeof el==='string'||typeof el==='number')return String(el);if(Array.isArray(el))return el.map(text).join(' ');return el?.props?text(el.props.children):'';}
function walk(el,fn){if(!el||typeof el!=='object')return;if(Array.isArray(el))return el.forEach(x=>walk(x,fn));if(el.props){fn(el);walk(el.props.children,fn);}}
function click(tree,label){let button;walk(tree,e=>{if(e.type==='button'&&text(e).includes(label))button=e;});assert.ok(button,`Missing ${label}`);assert.equal(Boolean(button.props.disabled),false);button.props.onClick();}
test('initial practice offers a clear task, numbered checkpoints, reasoning, and actual context',()=>{const html=render(PracticeView,{visible:false,onContinue:()=>{},onExit:()=>{}});for(const label of ['Guided incident','Try it yourself','Choose the boundary','Expected condition','Worker','Not yet observed','responders free','practice-reason','Scenario clock advances'])assert.ok(html.includes(label),label);assert.ok(html.includes('aria-label="Practice checkpoints"'));assert.ok(html.includes('aria-current="step"'));assert.ok(html.includes('disabled=""'));});
test('actual practice control callbacks reach field verification and a reviewable record',()=>{
 let p=createPractice();const onChoice=id=>{p=nextPractice(choosePractice(p,id));};
 for(const label of ['Contain the station','Observe actual work','Correct &amp; verify item','Restart the station','Print and match full identifiers','Pilot in live work','Keep the pilot under review']){
  const actualLabel=label.replace('&amp;','&');click(PracticeTask({p,onChoice}),actualLabel);
 }
 assert.equal(p.step,'complete');const html=render(PracticeSummary,{p,reflection:'I need exposure and no related failure before changing the standard.',setReflection:()=>{},onContinue:()=>{},onTransfer:()=>{}});
 for(const label of ['practice-reflection','First help','Tested source improvement','facilitator','Try a different incident','Review &amp; export record'])assert.ok(html.includes(label),label);assert.ok(!html.includes('NaN'));
});
test('different-incident controls support verified release instead of prescribing correction',()=>{let p=createPractice('transfer');for(const id of ['item','inspect'])p=nextPractice(choosePractice(p,id));const html=render(PracticeTask,{p,onChoice:()=>{}});assert.ok(html.includes('Release the item'));assert.ok(html.includes('Correct &amp; verify item'));p=nextPractice(choosePractice(p,'release'));assert.equal(practiceIncident(p).resolution,'release');assert.equal(p.run.supportMinutes,3);});
test('blocked release stays at its checkpoint; retry preserves its evidence before a new attempt',()=>{let p=createPractice();click(PracticeTask({p,onChoice:id=>p=choosePractice(p,id)}),'Release without observation');assert.equal(p.step,'contain');assert.equal(p.feedback.blocked,true);assert.equal(p.attempts.length,1);});

test('demo controls are discoverable and planned choices stay actual manual buttons',()=>{const html=render(PracticeView,{visible:false,onContinue:()=>{},onExit:()=>{}});assert.ok(html.includes('Watch demo'));const p=createPractice();let chosen='';const tree=PracticeTask({p,plannedChoice:'station',onChoice:id=>chosen=id});assert.ok(render(PracticeTask,{p,plannedChoice:'station',onChoice:()=>{}}).includes('demo-planned'));click(tree,'Contain the station');assert.equal(chosen,'station');});
