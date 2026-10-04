(()=>{'use strict';
if(window.__notionCalendarLiveSyncStarted)return;
window.__notionCalendarLiveSyncStarted=true;
const planner=document.querySelector('.gcal-planner');
const bridge=window.__notionBridge;
if(!planner||!bridge)return;
let rotateIndex=0,lastRequested='',bursting=false,injectTimer=null;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const visibleDates=()=>[...new Set([...planner.querySelectorAll('[data-head-date]')].map(x=>x.dataset.headDate).filter(Boolean))];
const primaryDate=()=>{const ds=visibleDates();return ds[3]||ds.find(d=>d===new Date().toISOString().slice(0,10))||ds[0]||''};
async function ensureCloudClean(){
 const c=bridge.cloud?.();
 if(!c?.configured||!c.loggedIn||!c.initialized||c.conflict)return !c?.conflict;
 if(c.dirty&&bridge.flushCloud){try{await bridge.flushCloud()}catch{return false}}
 return !bridge.cloud?.().dirty&&!bridge.cloud?.().conflict;
}
async function selectDate(date,{force=false}={}){
 if(!date)return false;
 if(!(await ensureCloudClean()))return false;
 const input=document.getElementById('date');
 if(!input)return false;
 if(!force&&input.value===date&&lastRequested===date)return false;
 if(input.value!==date)input.value=date;
 lastRequested=date;
 input.dispatchEvent(new Event('change',{bubbles:true}));
 return true;
}
async function requestPrimary(){const d=primaryDate();if(d)await selectDate(d,{force:true})}
async function requestClickedDate(date){if(date)await selectDate(date,{force:true})}
function statusButton(text,state=''){
 const b=planner.querySelector('[data-notion-live-refresh]');if(!b)return;
 b.textContent=text;b.dataset.state=state;
}
function resultText(){
 const status=document.getElementById('notionStatus')?.textContent?.trim()||'';
 const message=document.getElementById('notionMessage')?.textContent?.trim()||'';
 return {status,message,full:[status,message].filter(Boolean).join(' · ')};
}
function showResult(text,state=''){
 const el=planner.querySelector('[data-notion-live-result]');if(!el)return;
 const raw=String(text||'').trim();
 el.textContent=raw||'等待同步结果';
 el.title=raw||'';
 el.dataset.state=state;
}
function injectButton(){
 const toolbar=planner.querySelector('.gcal-toolbar');if(!toolbar)return false;
 let b=toolbar.querySelector('[data-notion-live-refresh]');
 if(!b){
  b=document.createElement('button');
  b.type='button';b.className='gcal-tool notion-live-refresh';b.dataset.notionLiveRefresh='1';b.textContent='↻ Notion';
  b.title='立即从 Notion 刷新当前日期';
  const view=toolbar.querySelector('.gcal-view');if(view)toolbar.insertBefore(b,view);else toolbar.appendChild(b);
 }
 if(!toolbar.querySelector('[data-notion-live-result]')){
  const r=document.createElement('span');r.className='notion-live-result';r.dataset.notionLiveResult='1';r.textContent='Notion 主版本';
  b.insertAdjacentElement('afterend',r);
 }
 return true;
}
async function waitForSyncResult(before,timeout=9000){
 const start=Date.now();let last=before;
 while(Date.now()-start<timeout){
  await sleep(250);
  const now=resultText();
  if(now.full&&now.full!==before.full)last=now;
  if(now.status.includes('失败')||now.status.includes('冲突')||now.status.includes('需要部署')||now.status.includes('完成')||now.status.includes('已同步'))return now;
 }
 return last;
}
async function manualRefresh(){
 if(bursting)return;
 bursting=true;
 try{
  const d=primaryDate();if(!d)return;
  statusButton('同步中…','busy');showResult(`正在刷新 ${d}…`,'busy');
  const ok=await selectDate(d,{force:true});
  if(!ok){
   const c=bridge.cloud?.();
   const why=c?.conflict?'Supabase 有同步冲突':c?.dirty?'Supabase 尚未保存完成':'无法切换同步日期';
   statusButton('同步受阻','error');showResult(why,'error');return;
  }
  await sleep(250);
  const manual=document.getElementById('notionToday');
  if(!manual){statusButton('同步不可用','error');showResult('页面里找不到 Notion 同步入口','error');return}
  const before=resultText();manual.click();
  const after=await waitForSyncResult(before);
  const text=after.full||'同步请求已发出，但没有收到状态信息';
  const failed=/失败|冲突|需要部署|过期|错误|无法/.test(text);
  statusButton(failed?'同步失败':'同步完成',failed?'error':'ok');showResult(text,failed?'error':'ok');
  setTimeout(()=>statusButton('↻ Notion',''),2200);
 }finally{bursting=false}
}
async function backgroundTick(){
 if(document.hidden||navigator.onLine===false||bursting)return;
 const dates=visibleDates();if(!dates.length)return;
 const d=dates[rotateIndex%dates.length];rotateIndex=(rotateIndex+1)%dates.length;
 await selectDate(d,{force:true});
}
planner.addEventListener('click',e=>{
 const refresh=e.target.closest('[data-notion-live-refresh]');if(refresh){e.preventDefault();e.stopPropagation();manualRefresh();return}
 const mini=e.target.closest('[data-mini-date]');if(mini){setTimeout(()=>requestClickedDate(mini.dataset.miniDate),120);return}
 if(e.target.closest('[data-prev],[data-next],[data-today]'))setTimeout(requestPrimary,140);
},true);
document.addEventListener('click',e=>{
 const mini=e.target.closest?.('[data-mini-date]');if(mini)setTimeout(()=>requestClickedDate(mini.dataset.miniDate),120);
},true);
window.addEventListener('focus',()=>setTimeout(requestPrimary,180));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(requestPrimary,220)});
new MutationObserver(()=>{
 clearTimeout(injectTimer);injectTimer=setTimeout(async()=>{injectButton();const d=primaryDate();if(d&&d!==document.getElementById('date')?.value)await selectDate(d,{force:true})},80);
}).observe(planner,{childList:true,subtree:false});
const style=document.createElement('style');
style.textContent=`
.notion-live-refresh{border:1px solid #5f6368!important;background:#2b2c30!important;color:#d7d9dc!important;border-radius:12px!important;padding:0 12px!important;font-size:10px!important;font-weight:650!important}.notion-live-refresh:hover{background:#34363b!important;color:#fff!important}.notion-live-refresh[data-state="busy"]{opacity:.72}.notion-live-refresh[data-state="ok"]{color:#8bd3b2!important;border-color:#477866!important}.notion-live-refresh[data-state="error"]{color:#f28b82!important;border-color:#8f514d!important}.notion-live-result{display:inline-flex;align-items:center;max-width:420px;height:32px;padding:0 10px;border-radius:11px;background:#27282c;color:#9aa0a6;font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px solid #34363c}.notion-live-result[data-state="busy"]{color:#fdd663}.notion-live-result[data-state="ok"]{color:#8bd3b2}.notion-live-result[data-state="error"]{color:#f28b82;border-color:#70413e}@media(max-width:1050px){.notion-live-result{max-width:240px}}@media(max-width:760px){.notion-live-result{display:none}}
`;
document.head.appendChild(style);
injectButton();const initial=resultText();if(initial.full)showResult(initial.full);setTimeout(requestPrimary,1200);setInterval(backgroundTick,10000);
})();