(()=>{'use strict';
if(window.__calendarContentReadonlyStarted)return;
window.__calendarContentReadonlyStarted=true;
const bridge=window.__notionBridge;
if(!bridge)return;

function currentTask(date,id){
  if(!date||!id)return null;
  return (bridge.snapshot(date).tasks||[]).find(t=>String(t.id)===String(id))||null;
}
if(!bridge.__calendarDescriptionReadonlyPatched){
  const raw=bridge.upsert.bind(bridge);
  bridge.upsert=(date,id,modeHint,t)=>{
    const next={...(t||{})};
    // Existing tasks keep the main site's current study content. The calendar may
    // change title/time/category/completion, but must never overwrite description.
    if(id){
      const existing=currentTask(date,id);
      if(existing)next.description=String(existing.description??'');
    }
    return raw(date,id,modeHint,next);
  };
  bridge.__calendarDescriptionReadonlyPatched=true;
}

function lockEditor(root=document){
  const editors=[];
  if(root?.matches?.('.gcal-editor'))editors.push(root);
  if(root?.querySelectorAll)editors.push(...root.querySelectorAll('.gcal-editor'));
  for(const editor of editors){
    if(editor.dataset.contentReadonly==='1')continue;
    const textarea=editor.querySelector('[data-desc]');
    if(!textarea)continue;
    const field=textarea.closest('.gcal-field');
    if(field){
      field.style.display='none';
      const note=document.createElement('div');
      note.className='gcal-content-readonly-note';
      note.innerHTML='<b>具体目标 / 学习内容</b><span>请在主网站修改。独立日历不会覆盖这部分内容。</span>';
      field.insertAdjacentElement('afterend',note);
    }
    editor.dataset.contentReadonly='1';
  }
}
const style=document.createElement('style');
style.textContent=`
.gcal-content-readonly-note{margin-top:12px;padding:11px 12px;border:1px solid #44464c;border-radius:12px;background:#292a2f;color:#c8cbd0;font-size:10px;line-height:1.55}.gcal-content-readonly-note b{display:block;margin-bottom:3px;color:#e8eaed;font-size:10px}.gcal-content-readonly-note span{color:#969a9f}
`;
document.head.appendChild(style);
lockEditor();
new MutationObserver(records=>{
  for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)lockEditor(n);
}).observe(document.body,{childList:true,subtree:true});
})();