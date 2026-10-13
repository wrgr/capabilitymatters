/** Guard accessible workflows, focus return, optional preferences, and readable layouts in the built site. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {extname,join,resolve} from 'node:path';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const root=resolve('dist');
const output=resolve(process.env.A11Y_OUTPUT||'docs/accessibility/latest');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{let path=new URL(req.url,'http://localhost').pathname;if(!extname(path))path=path.replace(/\/$/,'')+'/index.html';try{const data=await readFile(join(root,path));res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(data);}catch(error){res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
await mkdir(output,{recursive:true});
let browser;
const checks=[];
/** Record the tested state and fail on WCAG A/AA automated violations. */
async function audit(page,name){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();checks.push({name,violations:result.violations,incomplete:result.incomplete});await writeFile(join(output,'workflows.json'),JSON.stringify({date:new Date().toISOString(),completed:false,checks,errors:[]},null,2));assert.deepEqual(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],name);}
/** Confirm content stays within the reading viewport; independently scrolling tables are allowed. */
async function reflow(page,name){const bounds=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='absolute').slice(0,8).map(e=>({tag:e.tagName,cls:e.className,text:e.textContent.slice(0,60)}))}));assert(bounds.scrollWidth<=bounds.width,name+' '+JSON.stringify(bounds));}
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BINARY||undefined,headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Enter');assert.equal(await page.locator('main').evaluate(e=>e===document.activeElement),true);
 await page.getByText('Accessibility preferences',{exact:true}).press('Enter');
 for(const label of ['Larger text','Higher contrast','Reduced motion'])await page.getByLabel(label,{exact:true}).check();
 await page.reload();assert(await page.locator('html').evaluate(e=>['text','contrast','motion'].every(k=>e.hasAttribute('data-a11y-'+k))));
 await page.setViewportSize({width:320,height:900});await reflow(page,'homepage with preferences');await audit(page,'homepage with all preferences');
 await page.getByText('Accessibility preferences',{exact:true}).press('Enter');await page.getByRole('button',{name:'Reset preferences'}).press('Enter');assert.equal(await page.locator('html').evaluate(e=>e.hasAttribute('data-a11y-text')),false);
 await page.goto(origin+'/start-here/');await page.locator('.mobile-nav summary').press('Enter');assert(await page.locator('.mobile-nav').evaluate(e=>e.open));await page.locator('.mobile-nav summary').press('Escape');assert.equal(await page.locator('.mobile-nav').evaluate(e=>e.open),false);
 // Simulate the WCAG text-spacing values and 200% text size at the 320-CSS-pixel reflow viewport.
 const routes=['/','/start-here/','/experiments/','/case-studies/boeing-737-max-mcas/','/problems-to-prototypes/','/microgpt/','/andon/','/capability-pipeline/simulation.html','/agentic-le/replay/'];
 for(const route of routes){await page.goto(origin+route);await page.addStyleTag({content:'html{font-size:200%!important}*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});await reflow(page,route+' 200% text and spacing');}
 await page.setViewportSize({width:1280,height:900});
 await page.goto(origin+'/capability-pipeline/index.html');await page.locator('#case-tab').press('ArrowRight');assert.equal(await page.locator('#sim-tab').getAttribute('aria-selected'),'true');await page.locator('#sim-tab').press('Home');assert.equal(await page.locator('#case-tab').getAttribute('aria-selected'),'true');
 await page.goto(origin+'/capability-pipeline/simulation.html');await page.locator('[data-choice]').first().press('Enter');assert(await page.locator('[data-choice][aria-pressed=true]').evaluate(e=>e===document.activeElement));await page.locator('#roll').press('Enter');await audit(page,'pipeline after committing a strategy');
 await page.goto(origin+'/microgpt/');const lab=page.locator('#letters');await page.waitForFunction(()=>!document.querySelector('#letters [data-action=train][data-steps="100"]').disabled);await lab.locator('[data-action=train][data-steps="100"]').press('Enter');await page.waitForFunction(()=>document.querySelector('#letters [data-control=step]').textContent==='100'&&!document.querySelector('#letters [data-action=train][data-steps="100"]').disabled&&document.querySelector('#letters [data-control=status]').textContent.includes('held-out loss'),{timeout:120000});assert.match(await lab.locator('[role=status]').innerText(),/held-out loss/);assert((await lab.locator('[data-control=samples] code').count())>0);await audit(page,'MicroGPT trained letter model');
 const help=page.getByRole('button',{name:'Explain to me with more straightforward language',exact:true}).first();await help.press('Enter');assert(await page.locator('#simple-dialog').evaluate(e=>e.open));await page.keyboard.press('Escape');assert.equal(await help.evaluate(e=>e===document.activeElement),true);
 await page.goto(origin+'/rainbow-bug/');assert.equal(await page.locator('#pause-game').innerText(),'Start visual game');await page.locator('#pause-game').press('Enter');assert.equal(await page.locator('#game').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#pause-game').evaluate(e=>e===document.activeElement),true);
 await page.getByLabel('Play style',{exact:true}).selectOption('text');
 for(let level=0;level<5;level++){while(await page.locator('#adventure-routes button').count()){await page.getByRole('button',{name:/Wait, then take the safe route to rainbow/}).first().press('Enter');assert.equal(await page.locator('#adventure-heading').evaluate(e=>e===document.activeElement),true);}await page.locator('#next-adventure-level').press('Enter');}
 assert.match(await page.locator('#adventure-status').innerText(),/All five levels complete/);await audit(page,'rainbow all levels complete');await page.screenshot({path:join(output,'rainbow-adventure.png'),fullPage:true});
 await page.goto(origin+'/rainbow-bug/');await page.getByText('Accessibility preferences',{exact:true}).press('Enter');await page.getByLabel('Reduced motion',{exact:true}).check();assert.equal(await page.locator('#play-style').inputValue(),'text');await page.getByRole('button',{name:'Reset preferences'}).press('Enter');
 await page.goto(origin+'/andon/');await page.locator('#workbench').getByRole('button',{name:'Start shift',exact:true}).press('Enter');await audit(page,'Andon after first operating decision');
 await page.goto(origin+'/prototypes/ai-debate-coach/');await page.fill('#claim','Public libraries support independent learning.');await page.fill('#evidence','A fictional local survey of 20 visitors.');await page.fill('#reasoning','People need access and practice, not just resources.');await page.locator('button[type=submit]').press('Enter');await audit(page,'debate feedback');
 await page.goto(origin+'/agentic-le/replay/');await page.locator('#practice-tab').press('Home');await page.locator('#replay-tab').press('ArrowRight');assert.equal(await page.locator('#practice-tab').getAttribute('aria-selected'),'true');await page.locator('#practice-tab').press('ArrowLeft');await page.locator('#next').press('Enter');assert.match(await page.locator('#notice').innerText(),/Event 2/);await audit(page,'replay event changed');
 assert.deepEqual(errors,[]);await mkdir(output,{recursive:true});await writeFile(join(output,'workflows.json'),JSON.stringify({date:new Date().toISOString(),completed:true,checks,errors},null,2));console.log('PASS: keyboard workflows, focus, 200% text and spacing at 320px, preferences, model training, five-level nonvisual game, and state-specific axe checks.');
}finally{await browser?.close();server.close();}
