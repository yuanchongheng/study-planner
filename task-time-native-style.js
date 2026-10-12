(()=>{'use strict';
if(window.__taskTimeNativeStyleStarted)return;
window.__taskTimeNativeStyleStarted=true;

const SELECTOR='input[data-draft-start],input[data-draft-end]';
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
 if(!state){state={segment:'hour',buffer:'',lastAt:0,handledKeyAt:0};editState.set(input,state)}
 return state;
}
function ensureNative(input){
 if(!input?.matches?.(SELECTOR))return false;
 const value=input.value;
 if(input.type!=='time'){
  try{input.type='time'}catch{}
  if(value)input.value=value;
 }
 input.step='300';
 input.removeAttribute('readonly');
 input.removeAttribute('inputmode');
 input.removeAttribute('maxlength');
 input.removeAttribute('placeholder');
 delete input.dataset.manualClock;
 return true;
}
function partsFor(input){
 const m=String(input.value||'').match(/^(\d{2}):(\d{2})$/);
 return m?{hour:m[1],minute:m[2]}:{hour:'00',minute:'00'};
}
function commitDigits(input,segment,digits){
 const parts=partsFor(input),max=segment==='hour'?23:59;
 let n=Number(digits);
 if(!Number.isFinite(n))return false;
 if(n>max){digits=digits.slice(-1);n=Number(digits)}
 if(!Number.isFinite(n)||n>max)return false;
 const value=String(n).padStart(2,'0');
 if(segment==='hour')parts.hour=value;else parts.minute=value;
 const next=`${parts.hour}:${parts.minute}`;
 const apply=()=>{
  if(input.value!==next)input.value=next;
  input.dispatchEvent(new Event('input',{bubbles:true}));
 };
 apply();
 queueMicrotask(apply);
 requestAnimationFrame(()=>{if(document.contains(input)&&input.value!==next)input.value=next});
 return true;
}
function segmentFromPoint(input,clientX){
 const r=input.getBoundingClientRect(),x=clientX-r.left;
 // Keep roughly the rightmost 27px for the browser's native clock button.
 const editable=Math.max(42,r.width-27);
 if(x>=editable)return null;
 return x<editable*.50?'hour':'minute';
}
function targetInput(e){
 const t=e.target;
 return t?.matches?.(SELECTOR)?t:null;
}
function resetBuffer(input){
 const s=stateFor(input);s.buffer='';s.lastAt=0;
}

function prepare(root=document){
 if(root?.matches?.(SELECTOR))ensureNative(root);
 root?.querySelectorAll?.(SELECTOR).forEach(ensureNative);
}
prepare(document);
new MutationObserver(records=>{
 for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)prepare(n);
}).observe(document.body,{childList:true,subtree:true});

document.addEventListener('focusin',e=>{
 const input=targetInput(e);if(!input)return;
 ensureNative(input);
 const s=stateFor(input);if(!s.segment)s.segment='hour';s.buffer='';s.lastAt=0;
},true);

document.addEventListener('pointerdown',e=>{
 const input=targetInput(e);if(!input)return;
 ensureNative(input);
 const seg=segmentFromPoint(input,e.clientX);
 if(!seg)return; // native clock icon/picker area
 const s=stateFor(input);s.segment=seg;s.buffer='';s.lastAt=0;
},true);

document.addEventListener('keydown',e=>{
 const input=targetInput(e);if(!input||e.ctrlKey||e.metaKey||e.altKey)return;
 ensureNative(input);
 const s=stateFor(input);
 if(e.key==='ArrowLeft'){
  s.segment='hour';s.buffer='';
  return;
 }
 if(e.key==='ArrowRight'||e.key===':'||e.key==='；'){
  s.segment='minute';s.buffer='';
  if(e.key===':'||e.key==='；')e.preventDefault();
  return;
 }
 if(e.key==='Backspace'||e.key==='Delete'){
  s.buffer='';
  return;
 }
 if(!/^\d$/.test(e.key))return;
 e.preventDefault();
 e.stopImmediatePropagation();
 const now=Date.now();
 if(now-s.lastAt>1500||s.buffer.length>=2)s.buffer='';
 s.lastAt=now;s.handledKeyAt=now;s.buffer+=e.key;
 const seg=s.segment||'hour';
 if(!commitDigits(input,seg,s.buffer))return;
 if(s.buffer.length===2){s.buffer='';if(seg==='hour')s.segment='minute'}
},true);

// Some browsers/IME paths surface numeric editing through beforeinput instead of keydown.
document.addEventListener('beforeinput',e=>{
 const input=targetInput(e);if(!input||e.inputType!=='insertText'||!/^\d$/.test(String(e.data||'')))return;
 const s=stateFor(input),now=Date.now();
 if(now-s.handledKeyAt<80)return;
 e.preventDefault();
 if(now-s.lastAt>1500||s.buffer.length>=2)s.buffer='';
 s.lastAt=now;s.buffer+=String(e.data);
 const seg=s.segment||'hour';
 if(!commitDigits(input,seg,s.buffer))return;
 if(s.buffer.length===2){s.buffer='';if(seg==='hour')s.segment='minute'}
},true);

document.addEventListener('paste',e=>{
 const input=targetInput(e);if(!input)return;
 const raw=String(e.clipboardData?.getData('text')||'').trim();
 const m=raw.match(/^(\d{1,2}):?(\d{2})$/);if(!m)return;
 const h=Number(m[1]),min=Number(m[2]);if(h>23||min>59)return;
 e.preventDefault();e.stopImmediatePropagation();
 input.value=`${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 resetBuffer(input);
},true);

document.addEventListener('blur',e=>{const input=targetInput(e);if(input)resetBuffer(input)},true);
document.addEventListener('change',e=>{const input=targetInput(e);if(input)resetBuffer(input)},true);
})();
