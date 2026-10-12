(()=>{'use strict';
if(window.__taskTimeNativeStyleStarted)return;
window.__taskTimeNativeStyleStarted=true;

const SELECTOR='input[data-draft-start],input[data-draft-end]';
const pad=n=>String(n).padStart(2,'0');
const style=document.createElement('style');
style.id='taskTimeNativeCompactStyle';
style.textContent=`
.task-time-edit input[data-manual-clock="1"]{
 width:104px!important;
 min-width:104px!important;
 height:33px!important;
 min-height:33px!important;
 padding:5px 29px 5px 7px!important;
 border-radius:9px!important;
 font-size:12px!important;
 line-height:normal!important;
 font-variant-numeric:tabular-nums!important;
 letter-spacing:0!important;
 color:#273b56!important;
 background-color:#fff!important;
 background-repeat:no-repeat!important;
 background-position:right 8px center!important;
 background-size:15px 15px!important;
 background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='8.5'/%3E%3Cpath d='M12 7v5l3 2'/%3E%3C/svg%3E")!important;
}
.task-time-edit input[data-manual-clock="1"]:focus{
 background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='%237066df' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='8.5'/%3E%3Cpath d='M12 7v5l3 2'/%3E%3C/svg%3E")!important;
}
`;
document.head.appendChild(style);

const editState=new WeakMap();
function stateFor(input){
 let state=editState.get(input);
 if(!state){state={segment:'hour',buffer:'',lastAt:0,handledKeyAt:0};editState.set(input,state)}
 return state;
}
function normalizeClock(value){
 let s=String(value||'').trim().replace(/：/g,':');
 if(/^\d{3,4}$/.test(s)){s=s.padStart(4,'0');s=`${s.slice(0,2)}:${s.slice(2)}`}
 const m=s.match(/^(\d{1,2}):(\d{1,2})$/);
 if(!m)return '';
 const h=Number(m[1]),mi=Number(m[2]);
 if(!Number.isInteger(h)||!Number.isInteger(mi)||h<0||h>23||mi<0||mi>59)return '';
 return `${pad(h)}:${pad(mi)}`;
}
function partsFor(input){
 const normalized=normalizeClock(input.value)||'00:00';
 const [hour,minute]=normalized.split(':');
 return {hour,minute};
}
function writeSegment(input,segment,digits){
 const parts=partsFor(input),max=segment==='hour'?23:59;
 let n=Number(digits);
 if(!Number.isFinite(n))return false;
 if(n>max){digits=digits.slice(-1);n=Number(digits)}
 if(!Number.isFinite(n)||n>max)return false;
 const value=pad(n);
 if(segment==='hour')parts.hour=value;else parts.minute=value;
 input.value=`${parts.hour}:${parts.minute}`;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 return true;
}
function segmentFromPoint(input,clientX){
 const r=input.getBoundingClientRect(),x=clientX-r.left;
 const editable=Math.max(48,r.width-27);
 if(x>=editable)return null;
 return x<editable*.52?'hour':'minute';
}
function selectSegment(input,segment){
 const range=segment==='minute'?[3,5]:[0,2];
 requestAnimationFrame(()=>{try{input.setSelectionRange(range[0],range[1])}catch{}});
}
function resetBuffer(input){
 const s=stateFor(input);s.buffer='';s.lastAt=0;
}
function enhance(input){
 if(!input?.matches?.(SELECTOR))return;
 const original=normalizeClock(input.value)||String(input.value||'');
 if(input.type!=='text'){
  try{input.type='text'}catch{}
 }
 input.value=normalizeClock(original)||original;
 input.inputMode='numeric';
 input.maxLength=5;
 input.autocomplete='off';
 input.spellcheck=false;
 input.placeholder='HH:MM';
 input.removeAttribute('readonly');
 input.dataset.manualClock='1';
}
function scan(root=document){
 if(root?.matches?.(SELECTOR))enhance(root);
 root?.querySelectorAll?.(SELECTOR).forEach(enhance);
}
function targetInput(e){const t=e.target;return t?.matches?.(SELECTOR)?t:null}

scan(document);
new MutationObserver(records=>{
 for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)scan(n);
}).observe(document.body,{childList:true,subtree:true});

document.addEventListener('focusin',e=>{
 const input=targetInput(e);if(!input)return;
 enhance(input);
 const s=stateFor(input);s.buffer='';s.lastAt=0;
},true);

document.addEventListener('pointerdown',e=>{
 const input=targetInput(e);if(!input)return;
 enhance(input);
 const segment=segmentFromPoint(input,e.clientX);
 if(!segment)return;
 const s=stateFor(input);s.segment=segment;s.buffer='';s.lastAt=0;
 selectSegment(input,segment);
},true);

document.addEventListener('keydown',e=>{
 const input=targetInput(e);if(!input||e.ctrlKey||e.metaKey||e.altKey)return;
 enhance(input);
 const s=stateFor(input);
 if(e.key==='ArrowLeft'){
  e.preventDefault();s.segment='hour';s.buffer='';selectSegment(input,'hour');return;
 }
 if(e.key==='ArrowRight'||e.key===':'||e.key==='；'){
  e.preventDefault();s.segment='minute';s.buffer='';selectSegment(input,'minute');return;
 }
 if(e.key==='Enter'){
  e.preventDefault();
  const box=input.closest('[data-time-box]');
  box?.querySelector('[data-save-time]')?.click();
  return;
 }
 if(!/^\d$/.test(e.key))return;
 e.preventDefault();e.stopImmediatePropagation();
 const now=Date.now();
 if(now-s.lastAt>1500||s.buffer.length>=2)s.buffer='';
 s.lastAt=now;s.handledKeyAt=now;s.buffer+=e.key;
 const segment=s.segment||'hour';
 if(!writeSegment(input,segment,s.buffer))return;
 if(s.buffer.length===2){
  s.buffer='';
  if(segment==='hour'){s.segment='minute';selectSegment(input,'minute')}
  else selectSegment(input,'minute');
 }else selectSegment(input,segment);
},true);

document.addEventListener('beforeinput',e=>{
 const input=targetInput(e);if(!input||e.inputType!=='insertText'||!/^\d$/.test(String(e.data||'')))return;
 const s=stateFor(input),now=Date.now();
 if(now-s.handledKeyAt<80)return;
 e.preventDefault();
 if(now-s.lastAt>1500||s.buffer.length>=2)s.buffer='';
 s.lastAt=now;s.buffer+=String(e.data);
 const segment=s.segment||'hour';
 if(!writeSegment(input,segment,s.buffer))return;
 if(s.buffer.length===2){s.buffer='';if(segment==='hour')s.segment='minute'}
 selectSegment(input,s.segment||segment);
},true);

document.addEventListener('paste',e=>{
 const input=targetInput(e);if(!input)return;
 const normalized=normalizeClock(e.clipboardData?.getData('text')||'');
 if(!normalized)return;
 e.preventDefault();e.stopImmediatePropagation();
 input.value=normalized;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 resetBuffer(input);
},true);

document.addEventListener('blur',e=>{
 const input=targetInput(e);if(!input)return;
 const normalized=normalizeClock(input.value);
 if(normalized)input.value=normalized;
 resetBuffer(input);
},true);
})();
