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
 const modes=modeHint?[modeHint]:Object.keys(day.timeOverrides||{});
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

const parseSig=s=>{try{const a=JSON.parse(String(s||''));return Array.isArray(a)&&a.length>=8?a:null}catch{return null}};
const canonicalTask=(known,sig)=>({
 syncId:known.syncId,
 id:known.localId||known.syncId,
 mode:known.mode||'',
 start:String(sig[1]||'09:00'),
 endDate:String(sig[2]||sig[0]||''),
 end:String(sig[3]||'10:00'),
 title:String(sig[4]||'未命名任务'),
 description:String(sig[5]||''),
 cat:['civil','phd','apply'].includes(sig[6])?sig[6]:'civil',
 done:!!sig[7]
});
function enforcePrimary(body){
 if(!body||body.action!=='sync'||!Array.isArray(body.tasks))return body;
 body.policy='notion';
 const known=Array.isArray(body.known)?body.known:[];
 const bySync=new Map(),byLocal=new Map();
 for(const k of known){
  if(!k?.syncId||!k?.sig)continue;
  const sig=parseSig(k.sig);if(!sig)continue;
  const c=canonicalTask(k,sig);bySync.set(String(k.syncId),c);if(k.localId)byLocal.set(String(k.localId),c);
 }
 const out=[],seen=new Set();
 for(const t of body.tasks){
  if(!t)continue;
  const c=bySync.get(String(t.syncId||''))||byLocal.get(String(t.id||''));
  if(c){out.push({...t,...c});seen.add(String(c.syncId));}
  else out.push(t);
 }
 for(const k of known){
  const c=bySync.get(String(k?.syncId||''));
  if(!c||seen.has(String(c.syncId)))continue;
  out.push(c);seen.add(String(c.syncId));
 }
 body.tasks=out;
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