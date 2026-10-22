import{d as k,w as x,r as v}from"./learning-notebook.CYbkmDts.js";const w=new Set(JSON.parse(document.documentElement.dataset.guideIds||"[]")),l=document.querySelector("#reflections"),y=document.querySelector("#notebook-status"),u=document.querySelector("#export-notebook"),m=document.querySelector("#clear-notebook");function p(){return Object.entries(v()).filter(([e])=>w.has(e)).sort((e,n)=>n[1].updated.localeCompare(e[1].updated))}function b(){l.replaceChildren();const e=p();u.disabled=m.disabled=e.length===0,document.querySelector("#empty-notebook").hidden=e.length>0;for(const[n,o]of e){const t=document.createElement("article");t.className="saved-reflection";const s=document.createElement("h2"),a=document.createElement("a");a.href=`/guides/${n}/`,a.textContent=o.title,s.append(a),t.append(s);const r=document.createElement("p");r.className="saved-date",r.textContent=`Saved ${Number.isNaN(Date.parse(o.updated))?"in this browser":new Date(o.updated).toLocaleDateString()}`,t.append(r);for(const[f,h]of[["observation","What I observed"],["reasoning","How I explain it"],["transfer","Where it might transfer"],["next","My next test"]]){const c=o[f];if(!c.trim())continue;const d=document.createElement("h3");d.textContent=h;const i=document.createElement("p");i.textContent=c,t.append(d,i)}l.append(t)}}u.addEventListener("click",()=>k("capability-matters-notebook.txt",p().map(([,e])=>`${e.title}

Observation
${e.observation}

Explanation
${e.reasoning}

Transfer
${e.transfer}

Next test
${e.next}`).join(`

--------------------

`)));m.addEventListener("click",()=>{confirm("Clear all reflections saved in this browser? Download a copy first if you want to keep them.")&&(y.textContent=x({})?"Notebook cleared.":"Browser storage is unavailable; the notebook could not be cleared.",b())});b();
