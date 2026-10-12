(()=>{'use strict';
if(window.__taskTimeNativeStyleStarted)return;
window.__taskTimeNativeStyleStarted=true;

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

const editState=new WeakMap();
function stateFor(input){
 let state=editState.get(input);
 if(!state){state={segment:'hour',buffer:'',lastAt:0};editState.set(input,state)}
 return state;
}
function normalizeValue(input){
 const m=String(input.value||'').match(/^(\d{2}):(\d{2})$/);
 return m?{hour:m[1],minute:m[2]}:{hour:'00',minute:'00'};
}
function setSegmentValue(input,segment,digits){
 const parts=normalizeValue(input);
 const max=segment==='hour'?23:59;
 let n=Number(digits);
 if(!Number.isFinite(n))return false;
 if(n>max){digits=digits.slice(-1);n=Number(digits)}
 const value=String(n).padStart(2,'0');
 if(segment==='hour')parts.hour=value;else parts.minute=value;
 input.value=`${parts.hour}:${parts.minute}`;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 return true;
}
function pointSegment(input,clientX){
 const r=input.getBoundingClientRect();
 const x=clientX-r.left;
 // Leave the native picker area untouched so the clock icon still behaves normally.
 const picker=27;
 const editable=Math.max(36,r.width-picker);
 if(x>=editable)return null;
 return x<editable*.48?'hour':'minute';
}
function prepareInput(input){
 if(!input||input.dataset.nativeClockEdit==='1')return;
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
 input.dataset.nativeClockEdit='1';

 input.addEventListener('pointerdown',e=>{
  const segment=pointSegment(input,e.clientX);
  if(!segment)return;
  const state=stateFor(input);
  state.segment=segment;state.buffer='';state.lastAt=0;
 },true);
 input.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const state=stateFor(input);
  if(e.key==='ArrowLeft'){state.segment='hour';state.buffer='';return}
  if(e.key==='ArrowRight'||e.key===':'||e.key==='；'){
   state.segment='minute';state.buffer='';
   if(e.key===':'||e.key==='；')e.preventDefault();
   return;
  }
  if(!/^\d$/.test(e.key))return;
  e.preventDefault();
  const now=Date.now();
  if(now-state.lastAt>1200||state.buffer.length>=2)state.buffer='';
  state.lastAt=now;
  state.buffer+=e.key;
  const segment=state.segment||'hour';
  if(!setSegmentValue(input,segment,state.buffer))return;
  if(state.buffer.length===2){
   state.buffer='';
   if(segment==='hour')state.segment='minute';
  }
 },true);
 input.addEventListener('blur',()=>{const state=stateFor(input);state.buffer='';state.lastAt=0});
 input.addEventListener('change',()=>{const state=stateFor(input);state.buffer='';state.lastAt=0});
}
function scan(root=document){
 if(root?.matches?.('input[data-draft-start],input[data-draft-end]'))prepareInput(root);
 root?.querySelectorAll?.('input[data-draft-start],input[data-draft-end]').forEach(prepareInput);
}
scan(document);
new MutationObserver(records=>{
 for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)scan(n);
}).observe(document.body,{childList:true,subtree:true});
})();
