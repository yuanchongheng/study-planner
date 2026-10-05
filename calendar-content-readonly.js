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

function decorateEvent(ev){
  if(!ev||ev.dataset.goalReadonly==='1')return;
  const task=currentTask(ev.dataset.sourceDate,ev.dataset.eventId);
  if(!task)return;
  const description=String(task.description??'').trim();
  const goal=document.createElement('div');
  goal.className='gcal-event-goal';
  goal.textContent=description||'未填写具体目标';
  const meta=ev.querySelector('.gcal-event-meta');
  if(meta)meta.insertAdjacentElement('afterend',goal);else ev.appendChild(goal);
  ev.title=description?`具体目标 / 学习内容：${description}`:'暂无具体目标 / 学习内容';
  ev.dataset.goalReadonly='1';
}
function decorateEvents(root=document){
  if(root?.matches?.('.gcal-event'))decorateEvent(root);
  if(root?.querySelectorAll)root.querySelectorAll('.gcal-event').forEach(decorateEvent);
}

function lockEditor(root=document){
  const editors=[];
  if(root?.matches?.('.gcal-editor'))editors.push(root);
  if(root?.querySelectorAll)editors.push(...root.querySelectorAll('.gcal-editor'));
  for(const editor of editors){
    if(editor.dataset.contentReadonly==='1')continue;
    const textarea=editor.querySelector('[data-desc]');
    if(!textarea)continue;
    const description=String(textarea.value??'').trim();
    const field=textarea.closest('.gcal-field');
    if(field){
      field.style.display='none';
      const note=document.createElement('div');
      note.className='gcal-content-readonly-note';
      const label=document.createElement('b');
      label.textContent='具体目标 / 学习内容';
      const body=document.createElement('p');
      body.textContent=description||'暂无具体目标';
      const hint=document.createElement('span');
      hint.textContent='只读 · 请在主网站修改，独立日历不会覆盖这部分内容。';
      note.append(label,body,hint);
      field.insertAdjacentElement('afterend',note);
    }
    editor.dataset.contentReadonly='1';
  }
}

const style=document.createElement('style');
style.textContent=`
.gcal-event-goal{margin-top:3px;font-size:8px!important;line-height:1.28!important;color:rgba(255,255,255,.94)!important;font-weight:650;opacity:.96;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;text-overflow:ellipsis;pointer-events:none!important;word-break:break-word}
.gcal-event:hover .gcal-event-goal,.gcal-event.selected .gcal-event-goal{opacity:1}
.gcal-content-readonly-note{margin-top:12px;padding:12px 13px;border:1px solid #44464c;border-radius:12px;background:#292a2f;color:#c8cbd0;font-size:10px;line-height:1.6}.gcal-content-readonly-note b{display:block;margin-bottom:6px;color:#e8eaed;font-size:10px}.gcal-content-readonly-note p{margin:0 0 7px;color:#f1f3f4;font-size:12px;line-height:1.7;white-space:pre-wrap;word-break:break-word}.gcal-content-readonly-note span{color:#969a9f;font-size:9px}
`;
document.head.appendChild(style);
lockEditor();
decorateEvents();
new MutationObserver(records=>{
  for(const r of records){
    for(const n of r.addedNodes){
      if(n.nodeType!==1)continue;
      lockEditor(n);
      decorateEvents(n);
    }
  }
}).observe(document.body,{childList:true,subtree:true});
})();