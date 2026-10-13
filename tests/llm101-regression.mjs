/** Exercise the same-origin LLM101 explorer through keyboard controls and its accessible dialogs. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {extname,join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import modules from '../experiments/llm101/src/data/modules.js';
const root=resolve('dist'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css'};
const server=createServer(async(req,res)=>{let path=new URL(req.url,'http://localhost').pathname;if(!extname(path))path=path.replace(/\/$/,'')+'/index.html';try{const data=await readFile(join(root,path));res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(data);}catch(error){res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const site=process.env.A11Y_ORIGIN||`http://127.0.0.1:${server.address().port}`;
const origin=site+'/llm101/explorer/';
// Bind the migration to the entire original authored lesson data, not just module counts.
assert.equal(createHash('sha256').update(JSON.stringify(modules)).digest('hex'),'8904a5c8bbaa13e5ffee6f4a3c3d7510758b9389a6ca13a1fffe1215334ffff3');
const output=process.env.A11Y_OUTPUT||'docs/accessibility/latest';
const browser=await chromium.launch({executablePath:process.env.CHROME_BINARY||undefined,headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();const errors=[],checks=[],requests=[],failedResources=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));page.on('response',r=>{if(r.url().startsWith(site)&&r.status()>=400)failedResources.push({url:r.url(),status:r.status()});});
/** Capture A/AA evidence for the visible explorer state. */
async function audit(name){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();checks.push({name,violations:result.violations,incomplete:result.incomplete});assert.deepEqual(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],name);}
/** Verify both copies of the shared controls apply and reset settings across the local frame. */
async function sharedPreferences(){
 await page.goto(site+'/llm101/');
 const iframe=page.locator('iframe[title^="LLM101"]');await iframe.scrollIntoViewIfNeeded();
 const src=new URL(await iframe.getAttribute('src'),page.url());assert.equal(src.origin,new URL(site).origin);
 assert.equal(src.pathname,'/llm101/explorer/index.html');
 assert.equal(new URL(await page.getByRole('link',{name:'Open LLM101 in a new tab'}).getAttribute('href'),page.url()).pathname,src.pathname);
 const frame=await iframe.elementHandle().then(h=>h.contentFrame());await frame.waitForSelector('.module-title');
 await page.getByText('Accessibility preferences',{exact:true}).press('Enter');
 for(const label of ['Larger text','Higher contrast','Reduced motion'])await page.getByLabel(label,{exact:true}).check();
 await frame.waitForFunction(()=>['text','contrast','motion'].every(k=>document.documentElement.hasAttribute('data-a11y-'+k)));
 for(const label of ['Larger text','Higher contrast','Reduced motion'])assert(await frame.getByLabel(label,{exact:true}).isChecked());
 await frame.getByText('Accessibility preferences',{exact:true}).press('Enter');await frame.getByRole('button',{name:'Reset preferences'}).press('Enter');
 await page.waitForFunction(()=>['text','contrast','motion'].every(k=>!document.documentElement.hasAttribute('data-a11y-'+k)));
 await audit('Same-origin wrapper and frame after shared reset');
}
/** Check every authored lesson, all five depths, and keyboard answer feedback without a mouse. */
async function allLessons(){
 for(const module of modules){
  await page.locator('.main-area .sidebar-arc-tabs').getByRole('button',{name:module.arc==='mechanistic'?'How it works':'What matters',exact:true}).press('Enter');
  await page.locator('.main-area .nav-item').filter({hasText:module.tab}).press('Enter');
  assert.equal(await page.locator('.module-title').innerText(),module.title);
  for(let depth=0;depth<5;depth++){
   await page.locator('.level-dot').nth(depth).press('Enter');
   assert.equal(await page.locator('.level-dot').nth(depth).getAttribute('aria-pressed'),'true');
   assert.equal(await page.locator('.module-view > .beat').count(),module.beats.filter(b=>b.minLevel<=depth&&depth<=b.maxLevel).length);
  }
  const answer=page.locator('.check-option').first();if(await answer.count()){await answer.press('Enter');assert.match(await page.locator('.check-explanation').first().innerText(),/Correct\.|Try reflecting/);}
  await audit('Lesson '+module.slug+' at formal depth with answer feedback');
 }
}
try{
 await sharedPreferences();
 await page.goto(origin);await page.keyboard.press('Tab');assert(await page.locator('.skip-link').evaluate(e=>e===document.activeElement));await page.keyboard.press('Enter');assert(await page.locator('main').evaluate(e=>e===document.activeElement));
 await allLessons();
 await page.locator('.main-area .sidebar-arc-tabs').getByRole('button',{name:'How it works',exact:true}).press('Enter');
 await page.locator('.main-area .nav-item').nth(1).press('Enter');
 for(let i=0;i<5;i++){await page.locator('.level-dot').nth(i).press('Enter');assert.equal(await page.locator('.level-dot').nth(i).getAttribute('aria-pressed'),'true');await audit('Prediction depth '+i);}
 assert(await page.locator('.katex-mathml').count()>0);
 assert(await page.locator('.katex-mathml').first().evaluate(e=>getComputedStyle(e).position==='absolute'));
 assert.equal(await page.locator('.math-display').first().getAttribute('tabindex'),'0');
 const term=page.locator('.term-chip').first();await term.press('Enter');assert(await page.locator('.glossary-dialog').evaluate(e=>e.open));await audit('glossary definition');await page.keyboard.press('Escape');assert(await term.evaluate(e=>e===document.activeElement));
 for(const label of ['Glossary','References','Further Reading','Pedagogy']){await page.locator('.topbar-tabs').getByRole('button',{name:label,exact:true}).press('Enter');await audit('Explorer '+label);}
 await page.setViewportSize({width:320,height:900});await page.locator('.mobile-nav').getByRole('button',{name:'Modules',exact:true}).press('Enter');assert(await page.locator('.mobile-drawer').evaluate(e=>e.open));await page.keyboard.press('Escape');assert.equal(await page.locator('.mobile-drawer').evaluate(e=>e.open),false);assert(await page.locator('.mobile-nav').getByRole('button',{name:'Modules',exact:true}).evaluate(e=>e===document.activeElement));
 await page.locator('.mobile-nav').getByRole('button',{name:'Modules',exact:true}).press('Enter');await page.locator('.mobile-drawer .nav-item').nth(1).press('Enter');assert.equal(await page.locator('.mobile-drawer').evaluate(e=>e.open),false);await audit('Mobile prediction');
 await page.getByText('Accessibility preferences',{exact:true}).press('Enter');for(const label of ['Larger text','Higher contrast','Reduced motion'])await page.getByLabel(label,{exact:true}).check();await audit('Mobile with all preferences');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.addStyleTag({content:'html{font-size:200%!important}*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await audit('Mobile 200% text and spacing');
 assert.equal(requests.some(url=>url.startsWith('https://wrgr.github.io/llm101')),false,'The migrated app must not load the legacy host');
 assert.deepEqual(failedResources,[],'Local scripts, styles and fonts must load');
 assert.deepEqual(errors,[]);await mkdir(output,{recursive:true});await writeFile(output+'/llm101-workflows.json',JSON.stringify({date:new Date().toISOString(),completed:true,origin,lessonCount:modules.length,checks,errors,failedResources},null,2));await page.screenshot({path:output+'/llm101-mobile.png',fullPage:true});console.log('PASS: same-origin frame/preferences/reset, preserved 15 lessons at five depths, LLM101 keyboard module/depth selection, glossary focus return, modal menu, all reading tabs, preferences and 320px reflow.');
}finally{await browser.close();server.close();}
