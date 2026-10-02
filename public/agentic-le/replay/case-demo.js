// A demo is a projection of the selected journal, never a separately authored exercise.
export function caseDemo(run, cases=[]){
 const event=run.events.filter(e=>e.kind==='artifact'&&e.payload.id==='build').at(-1);
 if(!event?.payload.content.prototype_html?.trim())return null;
 const build=event.payload;
 return {seq:event.seq,revision:build.revision,content_hash:build.content_hash,source:build.content.prototype_html,product:cases.find(c=>c.run_id===run.id)?.product||null};
}

export function savedRunSelection(cases, search=''){
 const id=new URLSearchParams(search).get('case')||'workforce';
 if(id==='scripted')return {id,journal:'exemplar.json'};
 const selected=cases.find(c=>c.id===id);
 if(!selected)throw Error('Unknown saved case');
 return selected;
}
