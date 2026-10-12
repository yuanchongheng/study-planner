(()=>{'use strict';
if(window.__taskTimeNativeStyleStarted)return;
window.__taskTimeNativeStyleStarted=true;

const style=document.createElement('style');
style.id='taskTimeNativeStyle';
style.textContent=`
.task-time-edit{display:flex!important;align-items:flex-end!important;gap:12px!important;flex-wrap:wrap!important}
.task-time-edit label{display:flex!important;flex-direction:column!important;gap:6px!important;font-size:10px!important;color:#7f8ca0!important;font-weight:700!important}
.task-time-edit input[type="time"]{
 width:230px!important;
 min-width:230px!important;
 height:58px!important;
 min-height:58px!important;
 padding:0 16px!important;
 border:1px solid #d7dce7!important;
 border-radius:18px!important;
 background:#fff!important;
 color:#111827!important;
 font-size:20px!important;
 line-height:58px!important;
 font-variant-numeric:tabular-nums!important;
 color-scheme:light!important;
 box-shadow:none!important;
 outline:none!important;
}
.task-time-edit input[type="time"]:focus,
.task-time-edit input[type="time"]:focus-visible{
 border-color:#9b9cff!important;
 box-shadow:0 0 0 3px rgba(112,102,223,.16)!important;
 outline:none!important;
}
.task-time-edit input[type="time"]::-webkit-calendar-picker-indicator{
 width:21px!important;
 height:21px!important;
 opacity:.72!important;
 cursor:pointer!important;
}
@media(max-width:760px){
 .task-time-edit{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;align-items:end!important}
 .task-time-edit label{min-width:0!important}
 .task-time-edit input[type="time"]{width:100%!important;min-width:0!important;height:54px!important;min-height:54px!important;font-size:18px!important}
 .task-time-edit>[data-save-time]{grid-column:1/-1!important;justify-self:start!important}
 .task-time-edit>.edit-caption{grid-column:1/-1!important}
}
`;
document.head.appendChild(style);

function restoreNativeTimeInputs(root=document){
 const nodes=[];
 if(root?.matches?.('input[data-draft-start],input[data-draft-end]'))nodes.push(root);
 root?.querySelectorAll?.('input[data-draft-start],input[data-draft-end]').forEach(el=>nodes.push(el));
 for(const input of nodes){
  const value=input.value;
  if(input.type!=='time'){
   try{input.type='time'}catch{}
   if(value)input.value=value;
  }
  input.step='300';
  input.removeAttribute('inputmode');
  input.removeAttribute('maxlength');
  input.removeAttribute('placeholder');
  delete input.dataset.manualClock;
 }
}
restoreNativeTimeInputs(document);
new MutationObserver(records=>{
 for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)restoreNativeTimeInputs(n);
}).observe(document.body,{childList:true,subtree:true});
})();