/** Exercise playback effects with a deterministic hook scheduler and controlled clock. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync,unlinkSync} from 'node:fs';import ts from 'typescript';
const harnessURL=new URL('../.qa-demo-hooks.mjs',import.meta.url),viewURL=new URL('../.qa-demo-playback.mjs',import.meta.url);
writeFileSync(harnessURL,`
/** Supply controlled hooks so demo timer cleanup can be verified without a browser. */
let slots=[],cursor=0,effects=[],dirty=false;
export function useState(initial){const n=cursor++;if(!slots[n])slots[n]={value:typeof initial==='function'?initial():initial};return [slots[n].value,v=>{const next=typeof v==='function'?v(slots[n].value):v;if(!Object.is(next,slots[n].value)){slots[n].value=next;dirty=true;}}];}
export function useRef(value){const n=cursor++;return (slots[n]??={current:value});}
export function useMemo(fn){cursor++;return fn();}
export function useEffect(fn,deps){const n=cursor++,old=slots[n];if(!old||deps.some((v,i)=>!Object.is(v,old.deps[i])))effects.push(()=>{old?.cleanup?.();slots[n]={deps,cleanup:fn()};});}
export function render(component,props){let tree,guard=0;do{dirty=false;cursor=0;effects=[];tree=component(props);for(const run of effects)run();if(++guard>20)throw Error('Hook render did not settle');}while(dirty);return tree;}
export function dispose(){for(const slot of slots)slot?.cleanup?.();slots=[];}
`);
const source=readFileSync(new URL('../practice-view.tsx',import.meta.url),'utf8').replace("from 'react'","from './.qa-demo-hooks.mjs'").replace("from './engine'","from './engine.ts'");
writeFileSync(viewURL,ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const hooks=await import(harnessURL.href),{default:PracticeView}=await import(viewURL.href);unlinkSync(harnessURL);unlinkSync(viewURL);
function text(e){if(typeof e==='string'||typeof e==='number')return String(e);if(Array.isArray(e))return e.map(text).join(' ');return e?.props?text(e.props.children):'';}
function find(tree,predicate){if(!tree||typeof tree!=='object')return;if(Array.isArray(tree)){for(const e of tree){const result=find(e,predicate);if(result)return result;}}else if(tree.props){if(predicate(tree))return tree;return find(tree.props.children,predicate);}}
function button(tree,label){const b=find(tree,e=>e.type==='button'&&text(e)===label);assert.ok(b,`Missing ${label}`);assert.ok(!b.props.disabled);return b;}
test('playback schedules one beat, cancels on interruption, and preserves state on takeover',()=>{
 const timers=new Map(),listeners=new Map();let serial=0;
 globalThis.window={location:{search:'?demo=1'},setTimeout:(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},clearTimeout:id=>timers.delete(id)};
 globalThis.document={hidden:false,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 let props={visible:true,onContinue:()=>{},onExit:()=>{}},tree;
 const render=()=>tree=hooks.render(PracticeView,props);
 const fire=()=>{assert.equal(timers.size,1);const [id,timer]=timers.entries().next().value;timers.delete(id);timer.fn();render();};
 try{
  render();assert.equal(timers.size,0);button(tree,'Play demo').props.onClick();render();assert.equal(timers.size,1);assert.equal([...timers.values()][0].ms,8500);
  fire();assert.ok(text(tree).includes('Read')||text(tree).includes('contain'));assert.equal([...timers.values()][0].ms,10000);
  button(tree,'Pause demo').props.onClick();render();assert.equal(timers.size,0);
  button(tree,'Next demo beat').props.onClick();render();assert.ok(text(tree).includes('Provide timely help'));assert.equal(timers.size,0);
  button(tree,'Play demo').props.onClick();render();document.hidden=true;listeners.get('visibilitychange')();render();assert.equal(timers.size,0);document.hidden=false;listeners.get('visibilitychange')();render();assert.equal(timers.size,0);
  button(tree,'Play demo').props.onClick();render();props={...props,visible:false};render();assert.equal(timers.size,0);props={...props,visible:true};render();assert.equal(timers.size,0);
  button(tree,'Play demo').props.onClick();render();find(tree,e=>e.props.className==='practice-layout').props.onClickCapture();render();assert.equal(timers.size,0);
  button(tree,'Play demo').props.onClick();render();find(tree,e=>e.type==='select'&&e.props.value===1).props.onChange({target:{value:'2'}});render();assert.equal([...timers.values()][0].ms,4250);button(tree,'Take over this practice').props.onClick();render();assert.equal(timers.size,0);assert.ok(!text(tree).includes('Demo paused'));assert.ok(text(tree).includes('Provide timely help'));
  button(tree,'Watch demo').props.onClick();render();assert.equal(timers.size,0);button(tree,'Start automated demo').props.onClick();render();let beats=0;while(timers.size&&beats++<20)fire();assert.equal(beats,14);assert.ok(text(tree).includes('Demo complete'));assert.equal(timers.size,0);
 }finally{hooks.dispose();delete globalThis.window;delete globalThis.document;}
 assert.equal(listeners.size,0);assert.equal(timers.size,0);
});
