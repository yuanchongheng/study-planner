import fs from 'node:fs';

const path = 'index.html';
let h = fs.readFileSync(path, 'utf8');
const before = h;
const version = '20261010-0560';

const scriptRe = /<script\s+src=["']\.\/notion-sync-v2\.js(?:\?v=[^"']*)?["']\s*><\/script>/;
if (!scriptRe.test(h)) throw new Error('Missing notion-sync-v2.js script tag in index.html');
h = h.replace(scriptRe, `<script src="./notion-sync-v2.js?v=${version}"></script>`);

const boot = `<style id="calendarBootStyle">html.calendar-boot,html.calendar-boot body{background:#17181b!important;color:#e8eaed!important}html.calendar-boot body>.app{visibility:hidden!important}html.calendar-boot body:before{content:'';position:fixed;inset:0;z-index:2147483646;background:#17181b}html.calendar-boot body:after{content:'';position:fixed;z-index:2147483647;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:#7066df;box-shadow:0 0 0 6px rgba(112,102,223,.14);animation:calendarBootPulse .8s ease-in-out infinite alternate}@keyframes calendarBootPulse{to{transform:scale(.72);opacity:.55}}html.calendar-ready body>.app{visibility:visible!important}</style><script id="calendarBootScript">(()=>{try{if(new URLSearchParams(location.search).get('calendar')==='1'){document.documentElement.classList.add('calendar-boot');setTimeout(()=>{document.documentElement.classList.remove('calendar-boot');document.documentElement.classList.add('calendar-ready')},6000)}}catch{}})();</script>`;
const bootRe = /<style id="calendarBootStyle">[\s\S]*?<\/style><script id="calendarBootScript">[\s\S]*?<\/script>/;
if (bootRe.test(h)) h = h.replace(bootRe, boot);
else h = h.replace(/<head>/i, `<head>${boot}`);

const themeBoot = `<script id="mainThemeBoot">(()=>{try{if(new URLSearchParams(location.search).get('calendar')!=='1')document.documentElement.classList.add('qoder-ui')}catch{document.documentElement.classList.add('qoder-ui')}})();</script><link id="mainThemeCss" rel="stylesheet" href="./qoder-theme.css?v=${version}">`;
const themeBootRe = /<script id="mainThemeBoot">[\s\S]*?<\/script><link id="mainThemeCss" rel="stylesheet" href="\.\/qoder-theme\.css\?v=[^"]+">/;
if(themeBootRe.test(h)) h=h.replace(themeBootRe,themeBoot);
else if(/<meta charset/i.test(h)) h=h.replace(/<meta charset/i,`${themeBoot}<meta charset`);
else h=h.replace(/<head>/i,`<head>${themeBoot}`);

function replaceBetween(text,startMarker,endMarker,replacement){
  const start=text.indexOf(startMarker);
  const end=start<0?-1:text.indexOf(endMarker,start);
  if(start<0||end<0)throw new Error(`Missing patch marker: ${startMarker}`);
  return text.slice(0,start)+replacement+text.slice(end);
}

const lastWriteWins=`async function cloudWrite(){if(!cloudAuth||!cloudConfig||cloudBusy||!cloudInitialized)return;cloudBusy=true;cloudConflict=false;cloudStatus('保存中…','warn');let snapshot=JSON.parse(JSON.stringify(state));try{await cloudEnsureToken();let rows=await cloudRows(),current=rows?.[0]||null,nextRevision=Math.max(Number(current?.revision||0)+1,Date.now()),saved;if(current){saved=await cloudRequest('/rest/v1/study_workspace?user_id=eq.'+encodeURIComponent(cloudAuth.user.id),{method:'PATCH',headers:{'Prefer':'return=representation'},body:JSON.stringify({revision:nextRevision,data:snapshot})})}else{try{saved=await cloudRequest('/rest/v1/study_workspace',{method:'POST',headers:{'Prefer':'return=representation'},body:JSON.stringify({user_id:cloudAuth.user.id,revision:nextRevision,data:snapshot})})}catch(firstError){rows=await cloudRows();current=rows?.[0]||null;if(!current)throw firstError;nextRevision=Math.max(Number(current.revision||0)+1,Date.now());saved=await cloudRequest('/rest/v1/study_workspace?user_id=eq.'+encodeURIComponent(cloudAuth.user.id),{method:'PATCH',headers:{'Prefer':'return=representation'},body:JSON.stringify({revision:nextRevision,data:snapshot})})}}if(!saved?.length)throw Error('云端保存未返回记录');remoteRevision=Number(saved[0].revision??nextRevision);localStorage.setItem(CLOUD_OWNER,cloudAuth.user.id);localStorage.setItem(CLOUD_REV,String(remoteRevision));cloudConflict=false;if(JSON.stringify(snapshot)===JSON.stringify(state)){cloudDirty=false;localStorage.removeItem(CLOUD_DIRTY);cloudStatus('已同步 · 最后修改已生效','ok');window.__notionCloudSaved?.()}else{cloudDirty=true;localStorage.setItem(CLOUD_DIRTY,cloudAuth.user.id);cloudStatus('还有修改待同步','warn')}}catch(e){cloudDirty=true;cloudConflict=false;localStorage.setItem(CLOUD_DIRTY,cloudAuth.user.id);cloudStatus('同步失败 · 本地已保存','warn');cloudTip('同步失败：'+e.message+'。恢复连接后会继续按最后修改覆盖云端。')}finally{cloudBusy=false;if(cloudDirty&&cloudAuth){clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>cloudWrite(),1800)}}}
window.__dualCloudChanged=()=>{if(!cloudInitialized||!cloudAuth)return;cloudConflict=false;cloudDirty=true;localStorage.setItem(CLOUD_DIRTY,cloudAuth.user.id);cloudStatus('修改待同步…','warn');clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>cloudWrite(),600)};
`;
h=replaceBetween(h,'async function cloudWrite(){','async function cloudRead(){',lastWriteWins);

const startLww=`async function cloudStart(){if(!cloudConfig||!cloudAuth){cloudInitialized=false;cloudShowAuth();return}cloudInitialized=false;cloudConflict=false;cloudStatus('连接云端中…','warn');try{let oldOwner=localStorage.getItem(CLOUD_OWNER);if(oldOwner&&oldOwner!==cloudAuth.user.id){state=defaults();localStorage.removeItem(KEY);renderAll()}const rows=await cloudRows(),row=rows?.[0];if(row){if(oldOwner===cloudAuth.user.id&&localStorage.getItem(CLOUD_DIRTY)===cloudAuth.user.id){remoteRevision=Number(row.revision);cloudInitialized=true;cloudDirty=true;cloudConflict=false;await cloudWrite();return}if(cloudLocalMeaningful()&&oldOwner!==cloudAuth.user.id){let overwrite=confirm('云端已有学习记录，本设备也有本地记录。\\n\\n确定：把本设备当前记录作为最新版本上传。\\n取消：采用云端当前记录。\\n\\n建议首次连接前先导出本地 JSON 备份。');remoteRevision=Number(row.revision);if(overwrite){cloudDirty=true;cloudInitialized=true;localStorage.setItem(CLOUD_OWNER,cloudAuth.user.id);localStorage.setItem(CLOUD_DIRTY,cloudAuth.user.id);await cloudWrite()}else cloudAdopt(row)}else cloudAdopt(row)}else{remoteRevision=null;localStorage.setItem(CLOUD_OWNER,cloudAuth.user.id);localStorage.setItem(CLOUD_DIRTY,cloudAuth.user.id);cloudDirty=true;cloudInitialized=true;await cloudWrite()}cloudInitialized=true;cloudConflict=false;cloudShowAuth();if(!cloudDirty)cloudStatus('已同步 · 最后修改已生效','ok')}catch(e){cloudInitialized=false;cloudConflict=false;cloudStatus('连接失败 · 当前仅本地保存','warn');cloudTip('连接失败：'+e.message+'。恢复连接后会继续按最后修改同步。')}}
`;
h=replaceBetween(h,'async function cloudStart(){',"$('cloudConfigSave').addEventListener",startLww);

h=h.replace("$('cloudSyncNow').addEventListener('click',async()=>{if(cloudConflict){toast('请先解决冲突，避免覆盖其他设备的修改。');return}if(cloudDirty){await cloudWrite()}else await cloudRead();if(!cloudDirty&&!cloudConflict)toast('同步检查已完成。')});","$('cloudSyncNow').addEventListener('click',async()=>{cloudConflict=false;if(cloudDirty){await cloudWrite()}else await cloudRead();if(!cloudDirty)toast('同步检查已完成。最后一次成功修改为当前版本。')});");
h=h.replace("<button type=\"button\" class=\"btn ghost\" id=\"cloudResolve\">解决同步冲突</button>","<button type=\"button\" class=\"btn ghost\" id=\"cloudResolve\">重新读取云端</button>");
h=h.replace("$('cloudResolve').addEventListener('click',async()=>{if(!cloudAuth)return;if(!cloudConflict){toast('当前没有检测到同步冲突。');return}if(!confirm('即将读取云端冲突版本。建议先点击顶部「导出全部备份」保存本地修改。确定继续吗？'))return;try{let rows=await cloudRows(),row=rows?.[0];if(!row)throw Error('云端记录不存在');let keepLocal=confirm('发现较新的云端记录。\\n\\n确定：保留当前设备的整份记录，覆盖云端最新版本。\\n取消：采用云端记录，舍弃本设备未同步的修改。\\n\\n请勿在未备份前操作。');if(keepLocal){remoteRevision=Number(row.revision);cloudConflict=false;cloudInitialized=true;cloudDirty=true;await cloudWrite()}else{cloudAdopt(row);cloudStatus('已采用云端最新记录','ok')}}catch(e){cloudTip('冲突处理失败：'+e.message)}});","$('cloudResolve').addEventListener('click',async()=>{if(!cloudAuth)return;if(cloudDirty&&!confirm('本设备还有未上传修改。重新读取云端会丢弃这些本地修改，确定继续吗？'))return;try{let rows=await cloudRows(),row=rows?.[0];if(!row)throw Error('云端记录不存在');cloudAdopt(row);cloudConflict=false;cloudStatus('已重新读取云端当前版本','ok');toast('已采用云端当前版本。')}catch(e){cloudTip('读取云端失败：'+e.message)}});");
h=h.replace('备份依然重要：云端是同步工具，不等同于历史版本备份。跨设备尽量避免同时改同一批任务。','同步策略：最后一次成功保存的修改为准，不区分设备。备份仍然重要：云端同步不等同于历史版本备份。');

// Wire the time-save button in the same timeline click handler that already
// owns all task-card actions. This avoids relying on a later-loaded helper.
if(!h.includes("saveTime=e.target.closest('[data-save-time]')")){
  const clickStart="$('timeline').addEventListener('click',e=>{let eff=";
  const dispatchPivot="saveTpl=e.target.closest('[data-save-task-template]');if(eff){";
  if(!h.includes(clickStart)||!h.includes(dispatchPivot))throw new Error('Missing timeline task action handler');
  h=h.replace(clickStart,"$('timeline').addEventListener('click',e=>{let saveTime=e.target.closest('[data-save-time]'),eff=");
  h=h.replace(dispatchPivot,"saveTpl=e.target.closest('[data-save-task-template]');if(saveTime){let box=saveTime.closest('[data-time-box]'),startInput=box?.querySelector('[data-draft-start]'),endInput=box?.querySelector('[data-draft-end]');if(startInput&&endInput)editTaskTime(saveTime.dataset.saveTime,startInput.value,endInput.value)}else if(eff){");
}
if(!h.includes("editTaskTime(saveTime.dataset.saveTime"))throw new Error('Task-time save button is not wired');

if(h.includes("revision=eq.'+remoteRevision"))throw new Error('Optimistic revision conflict filter is still present.');
if(!h.includes("Math.max(Number(current?.revision||0)+1,Date.now())"))throw new Error('Missing last-write-wins revision generation.');
if(!h.includes("最后修改已生效"))throw new Error('Missing last-write-wins status text.');

if (h !== before) {
  fs.writeFileSync(path, h);
  console.log(`Updated index.html to v=${version}; cloud sync now uses last-write-wins.`);
} else console.log('index.html already uses the current last-write-wins release.');

const calendarPath = 'google-calendar-planner-v3.js';
let calendar = fs.readFileSync(calendarPath, 'utf8');
if (!calendar.includes('function dragDayFromX(x)')) throw new Error('Missing coordinate-based calendar drag targeting.');
if (!calendar.includes("if(dragState&&dragState.moved)updateDrag(e)")) throw new Error('Missing final pointer-up drag targeting.');
if (!calendar.includes("delete day.timeOverrides[key][id]")) throw new Error('Missing manual-time override cleanup.');

const coordinatorPath='same-device-cloud-sync.js';
const coordinator=fs.readFileSync(coordinatorPath,'utf8');
if(!coordinator.includes("navigator.locks.request(WEB_LOCK")) throw new Error('Missing same-device Web Locks coordinator.');

const themePath='qoder-theme.css';
const theme=fs.readFileSync(themePath,'utf8');
if(!theme.includes('--q-sidebar:#f1f5ef')) throw new Error('Main-site sidebar is not using the light palette.');
console.log('Planner release checks passed.');
