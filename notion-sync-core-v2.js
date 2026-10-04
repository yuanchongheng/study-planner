(()=>{'use strict';
const READY_KEY='website-notion-v1-ready';
const SERVER_MODE='website-primary-v1';
function setup(bridge){
  if(!bridge||window.__notionV2Started)return;window.__notionV2Started=true;
  const $=id=>document.getElementById(id);
  const pages=()=>{const s=bridge.state();s.notionSync=s.notionSync&&typeof s.notionSync==='object'?s.notionSync:{version:2,pages:{}};s.notionSync.version=2;s.notionSync.pages=s.notionSync.pages&&typeof s.notionSync.pages==='object'?s.notionSync.pages:{};return s.notionSync.pages};
  let busy=false,autoTimer=null,serverReady=localStorage.getItem(READY_KEY)==='1';
  const status=(text,kind='warn')=>{const el=$('notionStatus');if(!el)return;el.textContent=text;el.className='notion-badge '+kind};
  const message=text=>{const el=$('notionMessage');if(el)el.textContent=text};
  const nextDay=day=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)};
  const sig=t=>JSON.stringify([t.date,t.start,t.endDate,t.end,t.title,t.description,t.cat,!!t.done]);
  function findMeta(date,localId){for(const [syncId,m] of Object.entries(pages()))if(m&&m.date===date&&m.localId===localId)return {syncId,meta:m};return null}
  function payload(date){
    const snap=bridge.snapshot(date),knownPages=pages();
    const tasks=snap.tasks.map(t=>{const found=findMeta(date,t.id),syncId=found?.syncId||`${date}:${t.id}`,span=bridge.timeSpan(t.time),endDate=span?.cross?nextDay(date):date,start=t.time.split('—')[0],end=t.time.split('—')[1];return {syncId,id:t.id,mode:snap.mode,title:t.title,description:t.description,cat:t.cat,start,end,endDate,done:!!t.done,sig:sig({date,start,endDate,end,title:t.title,description:t.description,cat:t.cat,done:!!t.done})}});
    const known=Object.entries(knownPages).filter(([,m])=>m&&(m.anchorDate===date||m.date===date)).map(([syncId,m])=>({syncId,pageId:m.pageId,sig:m.sig||'',notionEditedAt:m.notionEditedAt||'',date:m.date||'',anchorDate:m.anchorDate||date,localId:m.localId||'',mode:m.mode||''}));
    return {action:'sync',date,revision:bridge.cloud().remoteRevision,tasks,known,policy:'local'};
  }
  async function call(body){
    const c=await bridge.authContext();
    const res=await fetch(c.base+'/functions/v1/notion-calendar-sync',{method:'POST',headers:{'Content-Type':'application/json','apikey':c.key,'Authorization':'Bearer '+c.token},body:JSON.stringify(body),cache:'no-store'});
    let data;try{data=await res.json()}catch{data={}};
    if(!res.ok)throw Error(data.error||data.message||`HTTP ${res.status}`);
    return data;
  }
  async function ensureServer(manual=false){
    if(serverReady)return true;
    try{
      const data=await call({action:'capabilities'});
      if(data?.mode!==SERVER_MODE)throw Error('服务端模式不匹配');
      serverReady=true;localStorage.setItem(READY_KEY,'1');status('网站 → Notion 已连接','');return true;
    }catch(e){
      serverReady=false;localStorage.removeItem(READY_KEY);status('Notion 推送未连接','warn');if(manual)message('网站 → Notion 推送服务暂不可用，请稍后重试。');return false;
    }
  }
  function saveBindings(data,requestDate){
    const store=pages();let changed=false;
    for(const syncId of data.removedSyncIds||[]){if(store[syncId]){delete store[syncId];changed=true}}
    for(const b of data.bindings||[]){const old=store[b.syncId]||{};store[b.syncId]={pageId:b.pageId,sig:b.sig,notionEditedAt:b.notionEditedAt,date:b.date,anchorDate:b.anchorDate||old.anchorDate||requestDate,localId:b.localId||old.localId||'',mode:b.mode||old.mode||''};changed=true}
    if(changed)bridge.commit();
  }
  async function syncDate(date,manual=false){
    const c=bridge.cloud();
    if(!c.configured||!c.loggedIn||!c.initialized||c.conflict||c.remoteRevision===null){if(manual)message('请先让 Supabase 云同步处于正常状态，再推送到 Notion。');return false}
    if(c.dirty&&bridge.flushCloud){try{await bridge.flushCloud()}catch{if(manual)message('网站数据尚未保存到 Supabase，暂未推送 Notion。');return false}}
    if(!(await ensureServer(manual)))return false;
    try{
      const data=await call(payload(date));
      if(data?.mode!==SERVER_MODE){serverReady=false;localStorage.removeItem(READY_KEY);if(manual)message('Notion 推送服务版本不匹配。');return false}
      saveBindings(data,date);
      status('网站 → Notion 已同步','');
      message(`${date} 已推送到 Notion：新建 ${data.created||0}、更新 ${data.updated||0}、删除 ${data.archived||0}、未变 ${data.unchanged||0}。Notion 的单独修改不会覆盖网站。`);
      return true;
    }catch(e){status('推送 Notion 失败','error');message(`${date} 推送失败：${e.message}。网站与 Supabase 数据不受影响。`);return false}
  }
  async function manualOne(){if(busy)return;busy=true;const btn=$('notionToday');if(btn)btn.disabled=true;status('正在推送 Notion…','warn');try{await syncDate(bridge.selected(),true)}finally{busy=false;if(btn)btn.disabled=false}}
  async function manualWeek(){if(busy)return;if(!confirm('将从当前日期开始，把连续 7 天的网站日程推送到 Notion。Notion 中这些已绑定任务会以网站版本覆盖。确定继续吗？'))return;busy=true;const btn=$('notionWeek');if(btn)btn.disabled=true;status('7 天推送中…','warn');let count=0;try{const start=new Date(bridge.selected()+'T12:00:00Z');for(let i=0;i<7;i++){const d=new Date(start);d.setUTCDate(start.getUTCDate()+i);const date=d.toISOString().slice(0,10);message(`正在推送第 ${i+1}/7 天：${date}……`);if(!(await syncDate(date,true)))break;count++;await new Promise(r=>setTimeout(r,350))}if(count===7){status('7 天已推送 Notion','');message('连续 7 天的网站日程已经推送到 Notion。')}}finally{busy=false;if(btn)btn.disabled=false}}
  $('notionToday')?.addEventListener('click',manualOne);$('notionWeek')?.addEventListener('click',manualWeek);
  window.__notionCloudSaved=()=>{const date=bridge.selected();clearTimeout(autoTimer);autoTimer=setTimeout(async()=>{if(busy||document.hidden)return;busy=true;try{await syncDate(date,false)}finally{busy=false}},1400)};
  window.__notionDateChanged=date=>{clearTimeout(autoTimer);autoTimer=setTimeout(async()=>{if(busy||document.hidden)return;busy=true;try{await syncDate(date,false)}finally{busy=false}},1200)};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy){clearTimeout(autoTimer);autoTimer=setTimeout(async()=>{busy=true;try{await syncDate(bridge.selected(),false)}finally{busy=false}},1800)}});
  setInterval(()=>{if(!busy&&!document.hidden){busy=true;syncDate(bridge.selected(),false).finally(()=>busy=false)}},120000);
  status('网站主版本 · 等待推送','warn');
  setTimeout(()=>window.__notionDateChanged?.(bridge.selected()),1800);
}
window.__setupNotionV2=setup;
if(window.__notionBridge)setup(window.__notionBridge);
})();