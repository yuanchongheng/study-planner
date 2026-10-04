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
function injectButton(){
 const toolbar=planner.querySelector('.gcal-toolbar');if(!toolbar)return false;
 if(toolbar.querySelector('[data-notion-live-refresh]'))return true;
 const b=document.createElement('button');
 b.type='button';b.className='gcal-tool notion-live-refresh';b.dataset.notionLiveRefresh='1';b.textContent='↻ Notion';
 b.title='立即从 Notion 刷新当前日期';
 const view=toolbar.querySelector('.gcal-view');if(view)toolbar.insertBefore(b,view);else toolbar.appendChild(b);
 return true;
}
async function manualRefresh(){
 if(bursting)return;
 bursting=true;
 try{
  const d=primaryDate();if(!d)return;
  statusButton('同步中…','busy');
  const ok=await selectDate(d,{force:true});
  if(!ok&&bridge.cloud?.().dirty){statusButton('等待云同步','busy');return}
  await sleep(220);
  const manual=document.getElementById('notionToday');
  if(manual)manual.click();
  await sleep(2400);
  statusButton('已请求同步','ok');
  setTimeout(()=>statusButton('↻ Notion',''),1600);
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
.notion-live-refresh{border:1px solid #5f6368!important;background:#2b2c30!important;color:#d7d9dc!important;border-radius:12px!important;padding:0 12px!important;font-size:10px!important;font-weight:650!important}.notion-live-refresh:hover{background:#34363b!important;color:#fff!important}.notion-live-refresh[data-state="busy"]{opacity:.72}.notion-live-refresh[data-state="ok"]{color:#8bd3b2!important;border-color:#477866!important}
`;
document.head.appendChild(style);
injectButton();setTimeout(requestPrimary,1200);setInterval(backgroundTick,10000);
})();