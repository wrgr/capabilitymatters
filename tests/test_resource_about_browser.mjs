/** Exercise every resource guide with keyboard, axe, mobile reflow, and script-free reading. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import {extname, resolve} from 'node:path';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import statuses from '../src/data/prototypes/status.json' with {type:'json'};
import {staticResources} from '../scripts/build-resource-about.mjs';

const root=resolve('dist'), output=resolve(process.env.RESOURCE_ABOUT_OUTPUT || '../resource-about-qa');
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const routes=[...Object.values(statuses).filter(s=>s.workingPrototype).map(s=>s.url),
  ...staticResources.map(([file])=>'/'+file),
  '/andon/','/llm101/explorer/','/llm101/','/microgpt/','/agentic-le/','/agentic-le/roles/',
  '/agentic-le/record/','/agentic-le/paper/','/show-your-work/','/experiments/','/problems-to-prototypes/','/field-notes/','/case-studies/',
  ...(await readdir('src/content/case-studies')).map(file=>'/case-studies/'+file.replace(/\.mdx$/,'')+'/')];
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
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_BINARY||undefined,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const route of routes){
    await page.goto(origin+route);
    const cards=page.locator('details.resource-about');await cards.first().waitFor();
    assert(await cards.count()>0,route);
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
  for(const route of ['/prototypes/ai-debate-coach/','/rainbow-bug/','/agentic-le/cases/library-journey/','/capability-pipeline/simulation.html']){
    await reading.goto(origin+route);await reading.locator('.resource-about > summary').press('Enter');
    assert(await reading.locator('.resource-about-body').isVisible(),route+' works without JavaScript');
  }
  await reading.screenshot({path:output+'/mobile-no-javascript.png',fullPage:false});await plain.close();
  assert.deepEqual(errors,[]);console.log(`PASS ${routes.length} resource routes; keyboard, links, mobile, axe, dark theme, React state and no-JavaScript reading.`);
}finally{
  await mkdir(output,{recursive:true});await writeFile(output+'/checks.json',JSON.stringify({checks},null,2));
  await browser?.close();await new Promise(r=>server.close(r));
}
