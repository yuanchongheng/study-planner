(()=>{'use strict';
if(window.__mainTaskEditGuardStarted)return;
window.__mainTaskEditGuardStarted=true;
const drafts=new Map();
let restoring=false;
function formId(form){return form?.dataset?.taskForm||''}
function capture(form,focusEl){
 const id=formId(form);if(!id)return;
 const title=form.elements?.namedItem?.('title'),goal=form.elements?.namedItem?.('goal'),category=form.elements?.namedItem?.('category');
 const d={title:title?.value??'',goal:goal?.value??'',category:category?.value??'',focusName:focusEl?.name||'',start:focusEl?.selectionStart??null,end:focusEl?.selectionEnd??null};
 drafts.set(id,d);window.__studyPlannerTaskEditing=true;
}
function restoreForm(form){
 const id=formId(form),d=drafts.get(id);if(!id||!d)return;
 const title=form.elements?.namedItem?.('title'),goal=form.elements?.namedItem?.('goal'),category=form.elements?.namedItem?.('category');
 restoring=true;
 try{
  if(title&&title.value!==d.title)title.value=d.title;
  if(goal&&goal.value!==d.goal)goal.value=d.goal;
  if(category&&category.value!==d.category)category.value=d.category;
  const target=d.focusName?form.elements?.namedItem?.(d.focusName):null;
  if(target&&document.activeElement!==target){
   target.focus({preventScroll:true});
   if(typeof target.setSelectionRange==='function'&&d.start!=null){try{target.setSelectionRange(d.start,d.end??d.start)}catch{}}
  }
 }finally{restoring=false}
}
function restoreAll(root=document){
 if(root?.matches?.('[data-task-form]'))restoreForm(root);
 root?.querySelectorAll?.('[data-task-form]').forEach(restoreForm);
}
document.addEventListener('input',e=>{if(restoring)return;const form=e.target.closest?.('[data-task-form]');if(form)capture(form,e.target)},true);
document.addEventListener('change',e=>{if(restoring)return;const form=e.target.closest?.('[data-task-form]');if(form)capture(form,e.target)},true);
document.addEventListener('focusin',e=>{const form=e.target.closest?.('[data-task-form]');if(form){if(!drafts.has(formId(form)))capture(form,e.target);else restoreForm(form)}},true);
document.addEventListener('submit',e=>{const form=e.target.closest?.('[data-task-form]');if(!form)return;const id=formId(form);drafts.delete(id);setTimeout(()=>{if(!drafts.size)window.__studyPlannerTaskEditing=false},250)},true);
document.addEventListener('click',e=>{const cancel=e.target.closest?.('[data-cancel-edit]');if(cancel){const form=cancel.closest('[data-task-form]');if(form)drafts.delete(formId(form));setTimeout(()=>{if(!drafts.size)window.__studyPlannerTaskEditing=false},100)}},true);
new MutationObserver(records=>{
 let needs=false;
 for(const r of records){for(const n of r.addedNodes){if(n.nodeType===1&&(n.matches?.('[data-task-form]')||n.querySelector?.('[data-task-form]'))){needs=true;break}}if(needs)break}
 if(needs)queueMicrotask(()=>restoreAll(document));
}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('study-planner-state-synced',()=>queueMicrotask(()=>restoreAll(document)));
})();