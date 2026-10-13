/** Exercise the separate LLM101 explorer through keyboard controls and its accessible dialogs. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const origin=process.env.LLM101_ORIGIN||'http://127.0.0.1:4328/llm101/';
const output=process.env.A11Y_OUTPUT||'docs/accessibility/latest';
const browser=await chromium.launch({executablePath:process.env.CHROME_BINARY||undefined,headless:true});
const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));
/** Capture A/AA evidence for the visible explorer state. */
async function audit(name){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();checks.push({name,violations:result.violations,incomplete:result.incomplete});assert.deepEqual(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],name);}
try{
 await page.goto(origin);await page.keyboard.press('Tab');assert(await page.locator('.skip-link').evaluate(e=>e===document.activeElement));await page.keyboard.press('Enter');assert(await page.locator('main').evaluate(e=>e===document.activeElement));
 await page.locator('.main-area .nav-item').nth(1).press('Enter');
 for(let i=0;i<5;i++){await page.locator('.level-dot').nth(i).press('Enter');assert.equal(await page.locator('.level-dot').nth(i).getAttribute('aria-pressed'),'true');await audit('Prediction depth '+i);}
 const term=page.locator('.term-chip').first();await term.press('Enter');assert(await page.locator('.glossary-dialog').evaluate(e=>e.open));await audit('glossary definition');await page.keyboard.press('Escape');assert(await term.evaluate(e=>e===document.activeElement));
 for(const label of ['Glossary','References','Further Reading','Pedagogy']){await page.locator('.topbar-tabs').getByRole('button',{name:label,exact:true}).press('Enter');await audit('Explorer '+label);}
 await page.setViewportSize({width:320,height:900});await page.locator('.mobile-nav').getByRole('button',{name:'Modules',exact:true}).press('Enter');assert(await page.locator('.mobile-drawer').evaluate(e=>e.open));await page.keyboard.press('Escape');assert.equal(await page.locator('.mobile-drawer').evaluate(e=>e.open),false);assert(await page.locator('.mobile-nav').getByRole('button',{name:'Modules',exact:true}).evaluate(e=>e===document.activeElement));
 await page.locator('.mobile-nav').getByRole('button',{name:'Modules',exact:true}).press('Enter');await page.locator('.mobile-drawer .nav-item').nth(1).press('Enter');assert.equal(await page.locator('.mobile-drawer').evaluate(e=>e.open),false);await audit('Mobile prediction');
 await page.getByText('Accessibility preferences',{exact:true}).press('Enter');for(const label of ['Larger text','Higher contrast','Reduced motion'])await page.getByLabel(label,{exact:true}).check();await audit('Mobile with all preferences');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.addStyleTag({content:'html{font-size:200%!important}*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await audit('Mobile 200% text and spacing');
 assert.deepEqual(errors,[]);await mkdir(output,{recursive:true});await writeFile(output+'/llm101-workflows.json',JSON.stringify({date:new Date().toISOString(),checks,errors},null,2));await page.screenshot({path:output+'/llm101-mobile.png',fullPage:true});console.log('PASS: LLM101 keyboard module/depth selection, glossary focus return, modal menu, all reading tabs, preferences and 320px reflow.');
}finally{await browser.close();}
