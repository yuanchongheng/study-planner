(()=>{'use strict';
if(window.__notionPrimaryPolicyStarted)return;
window.__notionPrimaryPolicyStarted=true;
const originalFetch=window.fetch.bind(window);
const bridge=window.__notionBridge;

function withModeHint(date,modeHint,fn){
 if(!bridge||!date||!modeHint)return fn();
 const state=bridge.state?.();
 if(!state)return fn();
 state.days=state.days||{};
 const hadDay=Object.prototype.hasOwnProperty.call(state.days,date);
 const day=state.days[date]||(state.days[date]={});
 const hadMode=Object.prototype.hasOwnProperty.call(day,'mode');
 const oldMode=day.mode;
 day.mode=modeHint;
 try{return fn()}
 finally{
  if(hadMode)day.mode=oldMode;else delete day.mode;
  if(!hadDay&&Object.keys(day).length===0)delete state.days[date];
 }
}
function clearCustomOverrides(date,localId,modeHint){
 if(!bridge||!date||!localId?.startsWith('custom_'))return;
 const state=bridge.state?.(),day=state?.days?.[date];if(!day)return;
 const modes=new Set([modeHint,...Object.keys(day.timeOverrides||{}),...Object.keys(day.taskOverrides||{})].filter(Boolean));
 for(const mode of modes){
  if(day.timeOverrides?.[mode])delete day.timeOverrides[mode][localId];
  if(day.taskOverrides?.[mode])delete day.taskOverrides[mode][localId];
 }
}
if(bridge&&!bridge.__modeHintPatched){
 const upsert=bridge.upsert.bind(bridge),remove=bridge.remove.bind(bridge);
 bridge.upsert=(date,localId,modeHint,t)=>withModeHint(date,modeHint,()=>{
  const result=upsert(date,localId,modeHint,t);
  clearCustomOverrides(date,localId||result?.localId,modeHint||result?.mode);
  return result;
 });
 bridge.remove=(date,id,modeHint)=>withModeHint(date,modeHint,()=>remove(date,id,modeHint));
 bridge.__modeHintPatched=true;
}

function enforcePrimary(body){
 if(!body||body.action!=='sync')return body;
 body.policy='notion';
 if(Array.isArray(body.known)){
  body.known=body.known.map(k=>{
   if(!k?.syncId)return k;
   return {...k,sig:`__notion_primary__:${String(k.syncId)}:${String(k.pageId||'')}`};
  });
 }
 return body;
}
window.fetch=async(input,init={})=>{
 try{
  const url=typeof input==='string'?input:input?.url||'';
  if(url.includes('/functions/v1/notion-calendar-sync')&&typeof init?.body==='string'){
   const body=JSON.parse(init.body);
   if(body?.action==='sync')init={...init,body:JSON.stringify(enforcePrimary(body))};
  }
 }catch{}
 return originalFetch(input,init);
};
window.__notionPrimaryMode=true;
const style=document.createElement('style');
style.textContent=`.notion-primary-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:#eeeafd;color:#5148b4;font-size:9px;font-weight:800;border:1px solid #d7d1fa}.notion-primary-badge:before{content:'◆';font-size:7px}`;
document.head.appendChild(style);
function badge(){
 const panel=document.querySelector('.notion-panel .panel-top,.notion-panel');if(!panel||panel.querySelector('.notion-primary-badge'))return;
 const b=document.createElement('span');b.className='notion-primary-badge';b.textContent='Notion 主版本';panel.appendChild(b);
}
setTimeout(badge,600);
new MutationObserver(badge).observe(document.body,{childList:true,subtree:true});
})();