/** Verify the site-wide workshop's reading order, keyboard activities, preferences and responsive presentation. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const root=resolve('dist'),output=resolve(process.env.WORKSHOP_OUTPUT||'../resource-about-qa/workshop');
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.json':'application/json','.pdf':'application/pdf'};
const server=createServer(async(req,res)=>{
  let path=new URL(req.url,'http://localhost').pathname;
  if(!extname(path))path=path.replace(/\/$/,'')+'/index.html';
  try{const data=await readFile(resolve(root,'.'+path));res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(data);}
  catch(error){res.writeHead(404);res.end('Not found');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}`;
const title='Capability Matters: Learning Engineering in the context of Next-Generation Systems';
const routes=['/','/show-your-work/','/microgpt/','/approach/','/case-studies/','/experiments/','/problems-to-prototypes/','/case-studies/boeing-737-max-mcas/','/prototypes/ai-debate-coach/'];
await mkdir(output,{recursive:true});
/** @param {import('playwright').Page} page @param {string} name @returns {Promise<void>} Check overflow and automated WCAG A/AA issues in the current state. */
async function audit(page,name){
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' reflows');
  const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  assert.deepEqual(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],name);
}
/** @param {import('playwright').Page} page @returns {Promise<void>} Make every evidence explanation available through native keyboard controls. */
async function evidenceChoices(page){
  await page.goto(origin+'/');
  const choices=page.locator('.evidence-choices details');assert.equal(await choices.count(),3);
  for(const choice of await choices.all()){
    await choice.locator('summary').press('Enter');assert(await choice.evaluate(e=>e.open));
    assert(await choice.locator('p').isVisible());await choice.locator('summary').press('Space');assert.equal(await choice.evaluate(e=>e.open),false);
  }
}
/** @param {import('playwright').Page} page @param {number} width @returns {Promise<void>} Keep the complete title, guidance and reading controls in the right order. */
async function paper(page,width){
  await page.goto(origin+'/show-your-work/');
  assert.equal((await page.locator('h1').innerText()).replace(/\s+/g,' ').trim(),title);
  const order=await page.evaluate(()=>{
    const h=document.querySelector('h1'),about=document.querySelector('.resource-about'),toc=document.querySelector('#paper-contents');
    return {titleBeforeAbout:!!(h.compareDocumentPosition(about)&Node.DOCUMENT_POSITION_FOLLOWING),aboutBeforeToc:!!(about.compareDocumentPosition(toc)&Node.DOCUMENT_POSITION_FOLLOWING),open:toc.open,top:h.getBoundingClientRect().top};
  });
  assert(order.titleBeforeAbout&&order.aboutBeforeToc);assert(order.top<400,'Title is present in the opening screen');
  assert.equal(order.open,width>=960,'Contents starts collapsed on mobile');
  assert.match(await page.getByRole('link',{name:/Download the paper/}).getAttribute('href'),/^\/papers\/show-your-work\.pdf\?v=/);
  if(width<960){await page.locator('#paper-contents summary').press('Enter');assert(await page.getByRole('navigation',{name:'Paper sections'}).isVisible());await page.locator('#paper-contents summary').press('Enter');}
}
/** @param {import('playwright').Page} page @returns {Promise<void>} Preserve header access and saved reading preferences across the three pilot routes. */
async function preferences(page){
  await page.goto(origin+'/');
  assert.equal(await page.locator('header.site-nav [data-accessibility-preferences]').count(),1);
  await page.getByText('Accessibility preferences',{exact:true}).press('Enter');await page.getByLabel('Larger text',{exact:true}).check();
  await page.goto(origin+'/microgpt/');assert(await page.locator('html').evaluate(e=>e.hasAttribute('data-a11y-text')));
  await page.getByText('Accessibility preferences',{exact:true}).press('Enter');await page.getByRole('button',{name:'Reset preferences'}).press('Enter');
}
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.CHROME_BINARY||undefined,headless:true});
  const context=await browser.newContext(),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});await evidenceChoices(page);await preferences(page);
    for(const route of routes){
      if(route==='/show-your-work/')await paper(page,width);else await page.goto(origin+route);
      assert.equal(await page.locator('body.workshop-shell').count(),1,'Shared workshop theme');
      assert.equal(await page.locator('header.site-nav [data-accessibility-preferences]').count(),1,'Header preferences stay available');
      if(route==='/problems-to-prototypes/')assert.equal(await page.locator((width>=900?'.desktop-nav':'.mobile-nav')+' a[aria-current=page]').getAttribute('href'),'/problems-to-prototypes/');
      const checks=page.locator('.foundation-check');
      if(await checks.count()){
        assert.deepEqual(await checks.locator('dt').allTextContents(),['Human','Science','System']);
        if(await checks.evaluate(e=>e.tagName==='DETAILS'))await checks.locator('summary').press('Enter');
      }
      if(route==='/'||route==='/approach/'){
        assert.equal(await page.locator('.foundation-grid > div').count(),3);
        assert(await page.locator('.capability-foundations a[href*="73d7cb96"]').isVisible(),'OECD flourishing source is visible');
      }

      await audit(page,route+' '+width);await page.screenshot({path:output+'/'+(route==='/'?'home':route.split('/').filter(Boolean).join('-'))+'-'+width+'.png'});
      await page.getByText('Accessibility preferences',{exact:true}).press('Enter');
      await page.getByLabel('Higher contrast',{exact:true}).check();await page.getByLabel('Reduced motion',{exact:true}).check();
      await page.getByText('Accessibility preferences',{exact:true}).press('Enter');await audit(page,route+' contrast/motion '+width);
      await page.getByText('Accessibility preferences',{exact:true}).press('Enter');await page.getByRole('button',{name:'Reset preferences'}).press('Enter');

    }
  }
  await page.setViewportSize({width:320,height:900});
  for(const route of routes){
    await page.goto(origin+route);await page.addStyleTag({content:'html{font-size:200%!important}*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' enlarged text reflow');
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto(origin+'/problems-to-prototypes/');
  await page.getByLabel('Availability',{exact:true}).selectOption('runnable');
  const available=page.locator('.gallery .card:visible');assert(await available.count()>0);
  assert((await available.evaluateAll(cards=>cards.every(card=>card.dataset.workingPrototype==='true'))),'Working filter retains its meaning');
  await page.getByLabel('Keyword',{exact:true}).fill('no-matching-brief-xyz');assert.equal(await available.count(),0);assert(await page.locator('#none').isVisible());
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:900}}),reading=await nojs.newPage();
  await evidenceChoices(reading);await reading.goto(origin+'/show-your-work/');assert(await reading.locator('h1').isVisible());assert.equal(await reading.locator('#paper-contents').evaluate(e=>e.open),false);
  await reading.locator('#paper-contents summary').press('Enter');assert(await reading.getByRole('navigation',{name:'Paper sections'}).isVisible());
  for(const route of ['/case-studies/boeing-737-max-mcas/','/prototypes/ai-debate-coach/']){
    await reading.goto(origin+route);await reading.locator('.foundation-check summary').press('Enter');assert(await reading.locator('.foundation-check dl').isVisible(),'Foundation questions work without JavaScript');
  }
  assert.deepEqual(errors,[]);console.log('PASS: site-wide workshop, three foundations, gallery filters, title/order, desktop/mobile axe, evidence choices, persistent preferences, 320px enlarged text, and reading without JavaScript.');
}finally{await browser?.close();server.close();}
