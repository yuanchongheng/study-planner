(()=>{'use strict';
if(window.__taskTimeNativeStyleStarted)return;
window.__taskTimeNativeStyleStarted=true;

// Keep the original compact task-time control size. Only preserve the
// browser-native time input behavior so hour/minute segments can be typed
// over directly without clearing the existing value first.
const style=document.createElement('style');
style.id='taskTimeNativeCompactStyle';
style.textContent=`
.task-time-edit input[type="time"]{
 width:104px!important;
 min-width:104px!important;
 height:33px!important;
 min-height:33px!important;
 padding:5px 7px!important;
 border-radius:9px!important;
 font-size:12px!important;
 line-height:normal!important;
 font-variant-numeric:tabular-nums!important;
 color-scheme:light!important;
}
.task-time-edit input[type="time"]::-webkit-calendar-picker-indicator{
 width:auto!important;
 height:auto!important;
 opacity:1!important;
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
 for(const r of records){
  for(const n of r.addedNodes){
   if(n.nodeType===1)restoreNativeTimeInputs(n);
  }
 }
}).observe(document.body,{childList:true,subtree:true});
})();
