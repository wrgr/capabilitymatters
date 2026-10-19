export const notebookKey='capability-matters-reflections-v1';
export type Reflection={title:string;updated:string;observation:string;reasoning:string;transfer:string;next:string};
export type Notebook=Record<string,Reflection>;
export function readNotebook():Notebook {
  try{
    const parsed=JSON.parse(localStorage.getItem(notebookKey)||'{}');
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
    const result:Notebook=Object.create(null);
    for(const [id,value] of Object.entries(parsed)){
      if(!/^[a-z0-9-]+$/.test(id)||!value||typeof value!=='object')continue;
      const entry=value as Reflection;
      if(['title','updated','observation','reasoning','transfer','next'].every(key=>typeof entry[key as keyof Reflection]==='string'))result[id]=entry;
    }
    return result;
  }catch{return {};}
}
export function writeNotebook(book:Notebook):boolean{try{localStorage.setItem(notebookKey,JSON.stringify(book));return true;}catch{return false;}}
export function downloadText(name:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
