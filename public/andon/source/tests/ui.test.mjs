/** Validate the public Andon experiment through its simulation and rendered controls. */
import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {create,tick,advance,command,metrics} from '../engine.ts';
const src=readFileSync(new URL('../page.tsx',import.meta.url),'utf8').replace("from './engine'","from './engine.ts'").replace(/^function (Response|Process|Principles|Flow)\(/gm,'export function $1(');
const temporary=new URL('../.qa-render.mjs',import.meta.url);
writeFileSync(temporary,ts.transpileModule(src,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const {default:Page,Response,Process,Principles,Flow}=await import(temporary.href);
unlinkSync(temporary);
const render=(C,p={})=>renderToStaticMarkup(React.createElement(C,p));
function walk(el,fn){if(!el||typeof el!=='object')return;if(Array.isArray(el)){el.forEach(x=>walk(x,fn));return;}if(el.props){fn(el);walk(el.props.children,fn);}}
function txt(el){if(el===null||el===undefined||typeof el==='boolean')return '';if(typeof el==='string'||typeof el==='number')return String(el);if(Array.isArray(el))return el.map(txt).join(' ');return txt(el.props?.children);}
function click(tree,label){let found;walk(tree,e=>{if(e.type==='button'&&txt(e).includes(label))found=e;});assert.ok(found,`Missing action ${label}`);assert.equal(Boolean(found.props.disabled),false,`Disabled action ${label}`);found.props.onClick();}
function tickN(s,n){while(n--)s=tick(s);return s;}
test('initial React view renders an obvious start action, clear state, and three live stations',()=>{const html=render(Page);for(const text of ['Start shift','Ready to start','Where is the work getting stuck?','Receiving','Pick &amp; label','Dispatch','Respond to a signal','Shift setup','Capability Matters experiments'])assert.ok(html.includes(text),text);assert.ok(!html.includes('NaN'));assert.ok(html.includes('aria-label="Clock speed"'));});
test('actual UI actions complete signal → observe → evidence → correction → trial → pilot',()=>{
 let s=advance(create()),i=s.incidents[0];const act=c=>s=command(s,c);const response=()=>Response({incident:s.incidents.find(x=>x.id===i.id),s,free:2-s.jobs.length,act,next:()=>s=advance(s)});
 click(response(),'Observe actual work');assert.equal(s.jobs[0].kind,'inspect');assert.ok(render(Response,{incident:s.incidents[0],s,free:1,act,next:()=>{}}).includes('Responder assigned'));
 s=tickN(s,3);assert.ok(render(Response,{incident:s.incidents[0],s,free:2,act,next:()=>{}}).includes('OBSERVED EVIDENCE'));
 click(response(),'Correct & verify item');s=tickN(s,5);assert.equal(s.incidents[0].status,'closed');
 const process=()=>Process({s,station:i.station,setStation:()=>{},hypothesis:2,setHypothesis:()=>{},act,free:2-s.jobs.length});
 click(process(),'Run challenge trial');s=tickN(s,10);assert.ok(render(Process,{s,station:i.station,setStation:()=>{},hypothesis:2,setHypothesis:()=>{},act,free:2}).includes('CHALLENGE EVIDENCE'));
 click(process(),'Pilot in live work');assert.equal(s.changes[0].status,'pilot');assert.ok(render(Process,{s,station:i.station,setStation:()=>{},hypothesis:2,setHypothesis:()=>{},act,free:2}).includes('reported pilot orders'));
});
test('waiting state disables duplicate investigations and leaves containment available',()=>{let s=advance(create());s=command(s,{kind:'inspect',id:s.incidents[0].id});const html=render(Response,{incident:s.incidents[0],s,free:1,act:()=>{},next:()=>{}});assert.ok(html.includes('Help underway'));assert.ok(!html.includes('Observe actual work'));assert.ok(html.includes('Contain station'));});
test('model explains the measures, uncertainty, countermeasure loop, and primary sources',()=>{const html=render(Principles);for(const text of ['Management provides the means','On-time accepted service','Help within 5 minutes','Mean first response','teaching checkpoint','not calibrated','global.toyota','lean.org'])assert.ok(html.includes(text),text);assert.ok(!html.includes('NaN'));});
test('maximum shift history and late station states render without missing numeric values',()=>{let s=create();while(s.time<120){for(const i of s.incidents.filter(i=>i.status==='open'))s=command(s,{kind:'dismiss',id:i.id});s=tick(s);}const html=render(Flow,{s})+render(Process,{s,station:1,setStation:()=>{},hypothesis:0,setHypothesis:()=>{},act:()=>{},free:2});assert.ok(!html.includes('NaN'));assert.ok(html.includes('disabled=""'));assert.equal(metrics(s).delivered+metrics(s).backlog,s.orders.length);});
