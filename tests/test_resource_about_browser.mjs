/** Exercise every resource guide with keyboard, axe, mobile reflow, and script-free reading. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {extname, resolve} from 'node:path';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {execFileSync} from 'node:child_process';

const root=resolve('dist'), output=resolve(process.env.RESOURCE_ABOUT_OUTPUT || '../resource-about-qa');
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
// Share the build guard's complete inventory; a new route cannot evade browser coverage.
const routes=JSON.parse(execFileSync('python3',['scripts/check-resource-guidance.py','--list-resources'],{encoding:'utf8'})).map(page=>page.route);
const server=createServer(async(req,res)=>{
  let path=new URL(req.url,'http://localhost').pathname;
  if(!extname(path))path=path.replace(/\/$/,'')+'/index.html';
  try{const body=await readFile(resolve(root,'.'+path));res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(body);}
  catch(error){res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
await mkdir(output,{recursive:true});
let browser;
const checks=[];
/** @param {import('playwright').Page} page @param {string} name @returns {Promise<void>} Check only the added cards against WCAG A/AA rules. */
async function audit(page,name){
  const result=await new AxeBuilder({page}).include('.resource-about').withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const violations=result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));
  checks.push({name,violations});assert.deepEqual(violations,[],name);
}
/** @param {import('playwright').Page} page @returns {Promise<void>} Keep Approach findable from both main menus and preserve a way back to the site. */
async function checkApproachNavigation(page){
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:900});await page.goto(origin+'/');
    const menu=page.locator(width>=900?'.desktop-nav':'.mobile-nav');
    if(width<900)await menu.locator('summary').press('Enter');
    const link=menu.locator('a[href="/approach/"]');
    assert(await link.isVisible(),`Approach is visible in the ${width}px menu`);
    await page.screenshot({path:output+`/approach-menu-${width}.png`,fullPage:false});
    await link.press('Enter');await page.waitForURL('**/approach/');
    if(width<900)await page.locator('.mobile-nav > summary').press('Enter');
    const primary=page.getByRole('navigation',{name:width>=900?'Primary':'Primary (mobile)',exact:true});
    assert.equal(await primary.locator('a[href="/approach/"]').getAttribute('aria-current'),'page');
    const navAudit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
    const violations=navAudit.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)}));
    checks.push({name:`Full Approach page ${width}px`,violations});assert.deepEqual(violations,[]);
    assert.equal(await page.locator('.steps > li').count(),7);
    assert(await page.getByRole('heading',{name:'What we mean by capability',exact:true}).isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Approach reflows');
    await page.screenshot({path:output+`/approach-page-${width}.png`,fullPage:true});
    await primary.locator('a[href="/start-here/"]').press('Enter');
    await page.waitForURL('**/start-here/');
  }
  await page.setViewportSize({width:1440,height:1000});
}
/** @param {import('playwright').Page} page @returns {Promise<void>} Exercise every extracted narrative in all three learning modes. */
async function checkWorkedCases(page){
  await page.goto(origin+'/approach/');
  await page.getByRole('link',{name:'Explore five worked cases',exact:true}).press('Enter');
  await page.waitForURL('**/capability-pipeline/index.html#cases');
  assert.equal(await page.locator('#case-tab').getAttribute('aria-selected'),'true');
  await page.goto(origin+'/capability-pipeline/cases.html');
  assert.equal(await page.locator('.case-card').count(),5);
  const names=await page.locator('.case-card h3').allTextContents();
  for(const name of names){
    await page.locator('.case-card').filter({has:page.getByRole('heading',{name,exact:true})}).press('Enter');
    await page.locator('[data-mode="study"]').press('Enter');
    assert.deepEqual(await page.locator('#stepper .idx').allTextContents(),['01','02','03','04','05','06','07','↻']);
    const row=page.locator('#stepper .step-row').last();await row.press('Enter');
    assert(await page.locator('#stepper .step-detail').last().isVisible(),name+' refinement is keyboard accessible');
    await page.locator('[data-mode="find"]').press('Enter');
    assert.equal(await page.locator('.find-picker button').last().innerText(),'Refine');
    await page.locator('.find-picker button').first().press('Enter');
    assert(await page.locator('.find-picker .result').isVisible(),name+' find feedback');
    await page.locator('[data-mode="predict"]').press('Enter');
    await page.getByLabel('Your prediction before the reveal (optional)',{exact:true}).fill('Check conditions and evidence before deployment.');
    await page.getByRole('button',{name:'Reveal what happened',exact:true}).press('Enter');
    assert.equal(await page.locator('.step-row.locked').count(),0,name+' reveal unlocks later steps');
  }
  await page.goto(origin+'/approach/');
  await page.getByRole('link',{name:'Try the branching simulation',exact:true}).press('Enter');
  await page.waitForURL('**/capability-pipeline/index.html#simulation');
  assert.equal(await page.locator('#sim-tab').getAttribute('aria-selected'),'true');
}
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_BINARY||undefined,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await checkApproachNavigation(page);
  await checkWorkedCases(page);
  for(const route of routes){
    await page.goto(origin+route);
    const cards=page.locator('details.resource-about');await cards.first().waitFor({timeout:5000});
    const pageHtml=await page.content();
    assert(await cards.count()>0,route);
    assert.doesNotThrow(()=>execFileSync('python3',['scripts/check-resource-guidance.py','--check-html'],{input:pageHtml,stdio:['pipe','pipe','pipe']}),route+' has complete rendered guidance');
    assert(await cards.first().evaluate(e=>Boolean(document.querySelector('h1').compareDocumentPosition(e)&Node.DOCUMENT_POSITION_FOLLOWING)),route+' guide follows the title');
    for(const card of await cards.all()){
      const summary=card.locator(':scope > summary');
      assert.equal(await card.evaluate(e=>e.open),false,route+' starts collapsed');
      assert.equal(await card.locator('a').first().isVisible(),false,route+' hides links');
      await summary.press('Enter');assert(await card.evaluate(e=>e.open),route+' Enter opens');
      assert.equal(await card.locator('h2,h3').count(),3,route);
      assert.equal(await summary.evaluate(e=>e===document.activeElement),true,route+' retains focus');
      assert.notEqual(await summary.evaluate(e=>getComputedStyle(e).outlineStyle),'none',route+' visible focus');
      await summary.press('Tab');assert.equal(await card.locator('a').first().evaluate(e=>e===document.activeElement),true,route+' reaches links');
      await page.keyboard.press('Shift+Tab');await page.keyboard.press('Space');assert.equal(await card.evaluate(e=>e.open),false,route+' Space closes');
      await summary.press('Space');
    }
    await audit(page,route+' desktop expanded');
    if(route==='/show-your-work/')await page.screenshot({path:output+'/paper-desktop.png',fullPage:false});
    await page.setViewportSize({width:320,height:900});
    await page.addStyleTag({content:'html{font-size:200%!important}*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
    for(const card of await cards.all())assert(await card.evaluate(e=>e.scrollWidth<=e.clientWidth+1),route+' guide reflows with text spacing');
    await audit(page,route+' 320px expanded with 200% text');
    await page.setViewportSize({width:1440,height:1000});
    console.log('PASS '+route);
  }
  await page.goto(origin+'/capability-pipeline/cases.html');await page.emulateMedia({colorScheme:'dark'});
  await page.locator('.resource-about > summary').press('Enter');await audit(page,'case explorer dark theme');
  await page.screenshot({path:output+'/pipeline-dark.png',fullPage:false});await page.emulateMedia({colorScheme:'light'});
  // React updates must preserve an open native disclosure.
  await page.goto(origin+'/andon/');await page.locator('.resource-about > summary').press('Enter');
  await page.getByRole('button',{name:'Guided practice',exact:true}).press('Enter');assert(await page.locator('.resource-about').evaluate(e=>e.open));
  await page.screenshot({path:output+'/andon-desktop.png',fullPage:false});
  await page.goto(origin+'/llm101/explorer/');await page.locator('.resource-about > summary').press('Enter');
  await page.locator('.level-dot').first().press('Enter');assert(await page.locator('.resource-about').evaluate(e=>e.open));
  await page.locator('.topbar-tabs').getByRole('button',{name:'Glossary',exact:true}).press('Enter');assert(await page.locator('.resource-about').evaluate(e=>e.open));
  const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
  const reading=await plain.newPage();
  for(const route of ['/approach/','/prototypes/ai-debate-coach/','/rainbow-bug/','/agentic-le/cases/library-journey/','/capability-pipeline/simulation.html']){
    await reading.goto(origin+route);await reading.locator('.resource-about > summary').press('Enter');
    assert(await reading.locator('.resource-about-body').isVisible(),route+' works without JavaScript');
  }
  await reading.screenshot({path:output+'/mobile-no-javascript.png',fullPage:false});await plain.close();
  assert.deepEqual(errors,[]);console.log(`PASS ${routes.length} resource routes; keyboard, links, mobile, axe, dark theme, React state and no-JavaScript reading.`);
}finally{
  await mkdir(output,{recursive:true});await writeFile(output+'/checks.json',JSON.stringify({checks},null,2));
  await browser?.close();await new Promise(r=>server.close(r));
}
