(()=>{'use strict';
if(window.__taskTimeNativeStyleStarted)return;
window.__taskTimeNativeStyleStarted=true;

// Keep the planner's original compact styling. This helper only guarantees
// that task start/end editors stay as native time controls, so clicking the
// hour/minute segment lets the user type a replacement value directly.
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
