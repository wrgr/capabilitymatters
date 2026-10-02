// A demo is a projection of the selected journal, never a separately authored exercise.
export function caseDemo(run, cases=[]){
 const event=run.events.filter(e=>e.kind==='artifact'&&e.payload.id==='build').at(-1);
 if(!event?.payload.content.prototype_html?.trim())return null;
 const build=event.payload;
 return {seq:event.seq,revision:build.revision,content_hash:build.content_hash,source:build.content.prototype_html,product:cases.find(c=>c.run_id===run.id)?.product||null};
}
