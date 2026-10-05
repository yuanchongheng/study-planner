(()=>{'use strict';
if(window.__calendarTaskContentFixStarted)return;
window.__calendarTaskContentFixStarted=true;
const bridge=window.__notionBridge;
if(!bridge)return;
const cats=new Set(['civil','phd','apply']);

function dayOf(date){
 const s=bridge.state?.();if(!s)return null;
 s.days=s.days||{};
 return s.days[date]||(s.days[date]={});
}
function findExtra(day,id,preferredMode){
 if(!day?.extraTasks||!id)return null;
 if(preferredMode&&Array.isArray(day.extraTasks[preferredMode])){
  const item=day.extraTasks[preferredMode].find(x=>String(x.id)===String(id));
  if(item)return {mode:preferredMode,item};
 }
 for(const [mode,list] of Object.entries(day.extraTasks)){
  if(!Array.isArray(list))continue;
  const item=list.find(x=>String(x.id)===String(id));
  if(item)return {mode,item};
 }
 return null;
}
function enforce(date,id,modeHint,t,result){
 if(!date||!t)return;
 const day=dayOf(date);if(!day)return;
 const resolvedId=String(result?.localId||id||'');
 let mode=String(result?.mode||modeHint||bridge.snapshot?.(date)?.mode||'');
 const title=String(t.title||'新任务'),description=String(t.description??''),cat=cats.has(t.cat)?t.cat:'civil';
 if(resolvedId.startsWith('custom_')){
  const found=findExtra(day,resolvedId,mode);
  if(found){
   found.item.title=title;
   found.item.description=description;
   found.item.cat=cat;
   mode=found.mode;
  }
  return;
 }
 if(!resolvedId)return;
 day.taskOverrides=day.taskOverrides||{};
 day.taskOverrides[mode]=day.taskOverrides[mode]||{};
 day.taskOverrides[mode][resolvedId]={...(day.taskOverrides[mode][resolvedId]||{}),title,description,cat};
}

if(!bridge.__taskContentPatched){
 const raw=bridge.upsert.bind(bridge);
 bridge.upsert=(date,id,modeHint,t)=>{
  const result=raw(date,id,modeHint,t);
  try{enforce(date,id,modeHint,t,result)}catch(e){console.warn('任务学习内容保存保障失败',e)}
  return result;
 };
 bridge.__taskContentPatched=true;
}

function polishEditor(root=document){
 for(const editor of root.querySelectorAll?.('.gcal-editor')||[]){
  if(editor.dataset.contentFixed==='1')continue;
  const textarea=editor.querySelector('[data-desc]');if(!textarea)continue;
  const field=textarea.closest('.gcal-field');
  const label=field?.querySelector('label');
  if(label)label.textContent='具体目标 / 学习内容';
  textarea.placeholder='例如：完成哪一套题、复盘哪些错题、阅读哪些章节、写出什么成果…';
  textarea.rows=Math.max(4,Number(textarea.rows||3));
  if(field&&!field.querySelector('.gcal-content-hint')){
   const hint=document.createElement('div');
   hint.className='gcal-content-hint';
   hint.textContent='这部分会保存到网站任务内容，并随网站主版本同步到 Notion。';
   field.appendChild(hint);
  }
  editor.dataset.contentFixed='1';
 }
}
const style=document.createElement('style');
style.textContent=`.gcal-content-hint{margin-top:6px;color:#8f9399;font-size:9px;line-height:1.55}.gcal-field textarea[data-desc]{min-height:96px!important;line-height:1.55!important}`;
document.head.appendChild(style);
polishEditor();
new MutationObserver(m=>{for(const x of m)for(const n of x.addedNodes)if(n.nodeType===1)polishEditor(n.matches?.('.gcal-editor')?n:n)}).observe(document.body,{childList:true,subtree:true});
})();