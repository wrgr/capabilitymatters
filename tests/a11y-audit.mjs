/** Capture WCAG A/AA rule evidence and responsive bounds for every published HTML route. */
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {extname,join,resolve} from 'node:path';
const root=resolve('dist'), output=resolve(process.env.A11Y_OUTPUT||'docs/accessibility/latest');
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'};
/** List the pages actually shipped by the static build. */
async function pages(dir){const entries=await readdir(dir,{withFileTypes:true});const all=await Promise.all(entries.map(e=>e.isDirectory()?pages(join(dir,e.name)):e.name.endsWith('.html')?[join(dir,e.name).slice(root.length)]:[]));return all.flat();}
const server=createServer(async(req,res)=>{let path=new URL(req.url,'http://localhost').pathname;if(!extname(path))path=path.replace(/\/$/,'')+'/index.html';try{const data=await readFile(join(root,decodeURIComponent(path)));res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(data);}catch(error){res.writeHead(404);res.end('Not found');}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=process.env.A11Y_ORIGIN||`http://127.0.0.1:${server.address().port}`;
let browser;
try{
 browser=await chromium.launch({executablePath:process.env.CHROME_BINARY||undefined,headless:true});
 await mkdir(output,{recursive:true});
 const routes=process.env.A11Y_ROUTES?process.env.A11Y_ROUTES.split(','):await pages(root);
 const report=[];
 let cursor=0;
 await Promise.all(Array.from({length:4},async()=>{
 while(cursor<routes.length){const route=routes[cursor++];
  const context=await browser.newContext({viewport:{width:1280,height:900}}); const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(route.startsWith('https://')?route:origin+route,{waitUntil:'networkidle'});
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  const bounds=[];
  for(const width of [1280,320]){await page.setViewportSize({width,height:900});bounds.push(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1&&getComputedStyle(e).position!=='absolute').slice(0,8).map(e=>({tag:e.tagName,cls:e.className}))})));}
  report.push({route,violations:audit.violations,incomplete:audit.incomplete,passes:audit.passes.map(p=>p.id),bounds,errors});
  console.log(route,audit.violations.map(v=>`${v.id}:${v.nodes.length}`).join(' '),bounds.some(b=>b.scrollWidth>b.width)?'OVERFLOW':'');
  await context.close();
 }
 }));
 const axeVersion=JSON.parse(await readFile(new URL('../node_modules/axe-core/package.json',import.meta.url),'utf8')).version;
 await writeFile(join(output,'audit.json'),JSON.stringify({date:new Date().toISOString(),origin,axeVersion,report},null,2));
 console.log(`Saved ${report.length} page audits to ${output}`);
}finally{await browser?.close();server.close();}
