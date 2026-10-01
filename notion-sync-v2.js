(()=>{'use strict';
const READY_KEY='dual-notion-v2-ready';
const SERVER_MODE='two-way-v2';
function setup(bridge){
  if(!bridge||window.__notionV2Started)return;window.__notionV2Started=true;
  const $=id=>document.getElementById(id), pages=()=>{const s=bridge.state();s.notionSync=s.notionSync&&typeof s.notionSync==='object'?s.notionSync:{version:2,pages:{}};s.notionSync.version=2;s.notionSync.pages=s.notionSync.pages&&typeof s.notionSync.pages==='object'?s.notionSync.pages:{};return s.notionSync.pages};
  let busy=false,autoTimer=null,suppressAutoUntil=0,serverReady=localStorage.getItem(READY_KEY)==='1';
  const status=(message,kind='warn')=>{const el=$('notionStatus');if(!el)return;el.textContent=message;el.className='notion-badge '+kind};
  const message=t=>{const el=$('notionMessage');if(el)el.textContent=t};
  const nextDay=day=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)};
  const sig=t=>JSON.stringify([t.date,t.start,t.endDate,t.end,t.title,t.description,t.cat,!!t.done]);
  function findMeta(date,localId){for(const [syncId,m] of Object.entries(pages()))if(m&&m.date===date&&m.localId===localId)return {syncId,meta:m};return null}
  function payload(date,policy='ask'){
    const snap=bridge.snapshot(date),knownPages=pages();
    const tasks=snap.tasks.map(t=>{const found=findMeta(date,t.id),syncId=found?.syncId||`${date}:${t.id}`,span=bridge.timeSpan(t.time),endDate=span?.cross?nextDay(date):date;return {syncId,id:t.id,mode:snap.mode,title:t.title,description:t.description,cat:t.cat,start:t.time.split('—')[0],end:t.time.split('—')[1],endDate,done:!!t.done,sig:sig({date,start:t.time.split('—')[0],endDate,end:t.time.split('—')[1],title:t.title,description:t.description,cat:t.cat,done:!!t.done})}});
    const known=Object.entries(knownPages).filter(([,m])=>m&&(m.anchorDate===date||m.date===date)).map(([syncId,m])=>({syncId,pageId:m.pageId,sig:m.sig||'',notionEditedAt:m.notionEditedAt||'',date:m.date||'',anchorDate:m.anchorDate||date,localId:m.localId||'',mode:m.mode||''}));
    return {action:'sync',date,revision:bridge.cloud().remoteRevision,tasks,known,policy};
  }
  async function call(body){
    const c=await bridge.authContext(),res=await fetch(c.base+'/functions/v1/notion-calendar-sync',{method:'POST',headers:{'Content-Type':'application/json','apikey':c.key,'Authorization':'Bearer '+c.token},body:JSON.stringify(body),cache:'no-store'});let data;try{data=await res.json()}catch{data={}};if(!res.ok)throw Error(data.error||data.message||`HTTP ${res.status}`);return data;
  }
  async function ensureServer(manual=false){
    if(serverReady)return true;
    try{const data=await call({action:'capabilities'});if(data?.mode!==SERVER_MODE)throw Error('服务端仍是旧版');serverReady=true;localStorage.setItem(READY_KEY,'1');status('双向同步已连接','');return true}catch(e){serverReady=false;localStorage.removeItem(READY_KEY);status('需要部署双向函数','warn');if(manual)message('网页端已经升级，但 Supabase 里的 notion-calendar-sync 还是旧版。请把 GitHub 仓库 supabase/functions/notion-calendar-sync/index.ts 的代码部署到同名 Edge Function；现有 Secrets 不需要改。');return false}
  }
  function applyResult(data,requestDate){
    const store=pages(),assigned={};let changed=false;
    for(const syncId of data.removedSyncIds||[]){if(store[syncId]){delete store[syncId];changed=true}}
    for(const ch of data.remoteChanges||[]){
      const old=store[ch.syncId];
      if(ch.deleted){if(old?.localId){bridge.remove(old.date||requestDate,old.localId,old.mode||'');changed=true}delete store[ch.syncId];continue}
      const t=ch.task;if(!t)continue;
      let localId=ch.localId||old?.localId||'',mode=ch.mode||old?.mode||'';
      if(old?.localId&&old.date&&old.date!==t.date){bridge.remove(old.date,old.localId,old.mode||'');localId='';mode='';changed=true}
      const up=bridge.upsert(t.date,localId,mode,t);assigned[ch.syncId]=up;changed=true;
    }
    for(const b of data.bindings||[]){const old=store[b.syncId]||{},up=assigned[b.syncId]||{};store[b.syncId]={pageId:b.pageId,sig:b.sig,notionEditedAt:b.notionEditedAt,date:b.date,anchorDate:b.anchorDate||old.anchorDate||requestDate,localId:up.localId||b.localId||old.localId||'',mode:up.mode||b.mode||old.mode||''};changed=true}
    if(changed){suppressAutoUntil=Date.now()+7000;bridge.commit()}
    return changed;
  }
  async function syncDate(date,manual=false,policy='ask'){
    const c=bridge.cloud();if(!c.configured||!c.loggedIn||!c.initialized||c.dirty||c.conflict||c.remoteRevision===null){if(manual)message('请先让 Supabase 显示“已同步 · 所有设备可见”，再进行 Notion 双向同步。');return false}
    if(!(await ensureServer(manual)))return false;
    try{
      const data=await call(payload(date,policy));
      if(data?.mode!==SERVER_MODE){serverReady=false;localStorage.removeItem(READY_KEY);if(manual)message('Supabase 函数不是双向同步 v2，请重新部署仓库中的新版函数。');return false}
      if(data.requiresPolicy){
        status('检测到双向冲突','warn');
        if(!manual){message(`检测到 ${data.conflicts?.length||0} 项同时修改。请点击“立即双向同步”手动选择保留哪一边。`);return false}
        const names=(data.conflicts||[]).slice(0,4).map(x=>'「'+x.title+'」').join('、');
        const keepLocal=confirm(`检测到 ${data.conflicts?.length||0} 项网页与 Notion 同时修改：${names}${(data.conflicts?.length||0)>4?' 等':''}\n\n确定：保留网页版本并写入 Notion。\n取消：采用 Notion 版本并回写网页。\n\n建议重要修改前先导出 JSON 备份。`);
        return await syncDate(date,true,keepLocal?'local':'notion');
      }
      const pulled=Number(data.pulled||0),changed=applyResult(data,date);
      status('网页 ↔ Notion 已同步','');
      message(`${date} 双向同步完成：Notion 新建 ${data.created||0}、更新 ${data.updated||0}、归档 ${data.archived||0}；从 Notion 回写网页 ${pulled} 项；未变 ${data.unchanged||0}。${changed?'回写内容正在同步到 Supabase。':''}`);
      return true;
    }catch(e){status('Notion 双向同步失败','error');message(`${date} 同步失败：${e.message}。网页与 Supabase 数据会保留，可稍后重试。`);return false}
  }
  async function manualOne(){if(busy)return;busy=true;const btn=$('notionToday');if(btn)btn.disabled=true;status('双向同步中…','warn');try{if(bridge.cloud().dirty&&!bridge.cloud().conflict)await bridge.flushCloud();await syncDate(bridge.selected(),true)}finally{busy=false;if(btn)btn.disabled=false}}
  async function manualWeek(){if(busy)return;if(!confirm('将从当前日期开始连续7天执行网页 ↔ Notion 双向同步。Notion Calendar 中对这些任务的移动、完成、标题和时间修改也会回写网页。确定继续吗？'))return;busy=true;const btn=$('notionWeek');if(btn)btn.disabled=true;status('7天双向同步中…','warn');let count=0;try{if(bridge.cloud().dirty&&!bridge.cloud().conflict)await bridge.flushCloud();const start=new Date(bridge.selected()+'T12:00:00Z');for(let i=0;i<7;i++){const d=new Date(start);d.setUTCDate(start.getUTCDate()+i);const date=d.toISOString().slice(0,10);message(`正在双向同步第 ${i+1}/7 天：${date}……`);if(!(await syncDate(date,true)))break;count++;await new Promise(r=>setTimeout(r,450))}if(count===7){status('7天双向同步完成','');message('连续7天同步完成。网页和 Notion Calendar 的任务变动已经合并；后续当前日期会自动检查。')}}finally{busy=false;if(btn)btn.disabled=false}}
  $('notionToday')?.addEventListener('click',manualOne);$('notionWeek')?.addEventListener('click',manualWeek);
  window.__notionCloudSaved=()=>{if(!serverReady||Date.now()<suppressAutoUntil)return;const date=bridge.selected();clearTimeout(autoTimer);autoTimer=setTimeout(async()=>{if(busy||document.hidden)return;busy=true;try{await syncDate(date,false)}finally{busy=false}},1800)};
  window.__notionDateChanged=date=>{if(!serverReady)return;clearTimeout(autoTimer);autoTimer=setTimeout(async()=>{if(busy||document.hidden)return;busy=true;try{await syncDate(date,false)}finally{busy=false}},900)};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&serverReady&&!busy){clearTimeout(autoTimer);autoTimer=setTimeout(async()=>{busy=true;try{await syncDate(bridge.selected(),false)}finally{busy=false}},1200)}});
  setInterval(()=>{if(serverReady&&!busy&&!document.hidden){busy=true;syncDate(bridge.selected(),false).finally(()=>busy=false)}},90000);
  if(serverReady){status('双向同步待检查','warn');setTimeout(()=>window.__notionDateChanged?.(bridge.selected()),1600)}else{status('双向同步待部署','warn');message('首次启用双向同步：部署新版 Supabase Edge Function 后，点击“立即双向同步”完成连接。')}
}
window.__setupNotionV2=setup;
})();
