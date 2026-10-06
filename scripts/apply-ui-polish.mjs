import fs from 'node:fs';

const path = 'index.html';
let h = fs.readFileSync(path, 'utf8');
const before = h;
const version = '20261006-0500';

const scriptRe = /<script\s+src=["']\.\/notion-sync-v2\.js(?:\?v=[^"']*)?["']\s*><\/script>/;
if (!scriptRe.test(h)) throw new Error('Missing notion-sync-v2.js script tag in index.html');
h = h.replace(scriptRe, `<script src="./notion-sync-v2.js?v=${version}"></script>`);

const boot = `<style id="calendarBootStyle">html.calendar-boot,html.calendar-boot body{background:#17181b!important;color:#e8eaed!important}html.calendar-boot body>.app{visibility:hidden!important}html.calendar-boot body:before{content:'';position:fixed;inset:0;z-index:2147483646;background:#17181b}html.calendar-boot body:after{content:'';position:fixed;z-index:2147483647;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:#7066df;box-shadow:0 0 0 6px rgba(112,102,223,.14);animation:calendarBootPulse .8s ease-in-out infinite alternate}@keyframes calendarBootPulse{to{transform:scale(.72);opacity:.55}}html.calendar-ready body>.app{visibility:visible!important}</style><script id="calendarBootScript">(()=>{try{if(new URLSearchParams(location.search).get('calendar')==='1'){document.documentElement.classList.add('calendar-boot');setTimeout(()=>{document.documentElement.classList.remove('calendar-boot');document.documentElement.classList.add('calendar-ready')},6000)}}catch{}})();</script>`;
const bootRe = /<style id="calendarBootStyle">[\s\S]*?<\/style><script id="calendarBootScript">[\s\S]*?<\/script>/;
if (bootRe.test(h)) h = h.replace(bootRe, boot);
else h = h.replace(/<head>/i, `<head>${boot}`);

if (h !== before) {
  fs.writeFileSync(path, h);
  console.log(`Updated index.html planner script to v=${version} and installed calendar boot style.`);
} else console.log('index.html already uses the current planner version and calendar boot style.');

const calendarPath = 'google-calendar-planner-v3.js';
let calendar = fs.readFileSync(calendarPath, 'utf8');

const oldHelper = `function updateCopiedCustomTime(date,id,start,end){if(!String(id||'').startsWith('custom_'))return null;const state=bridge.state?.(),day=state?.days?.[date],groups=day?.extraTasks;if(!groups||typeof groups!=='object')return null;for(const [mode,list] of Object.entries(groups)){if(!Array.isArray(list))continue;const entry=list.find(x=>String(x?.id)===String(id));if(!entry)continue;entry.time=\`${'${start}'}—${'${end}'}\`;entry.minutes=duration({time:entry.time});return{localId:id,mode}}return null}`;
const newHelper = `function updateCopiedCustomTime(date,id,start,end){if(!String(id||'').startsWith('custom_'))return null;const state=bridge.state?.(),day=state?.days?.[date],groups=day?.extraTasks;if(!groups||typeof groups!=='object')return null;for(const [mode,list] of Object.entries(groups)){if(!Array.isArray(list))continue;const entry=list.find(x=>String(x?.id)===String(id));if(!entry)continue;entry.time=\`${'${start}'}—${'${end}'}\`;entry.minutes=duration({time:entry.time});if(day.timeOverrides&&typeof day.timeOverrides==='object'){for(const key of Object.keys(day.timeOverrides)){if(day.timeOverrides[key])delete day.timeOverrides[key][id]}}return{localId:id,mode}}return null}`;
if (calendar.includes(oldHelper)) calendar = calendar.replace(oldHelper, newHelper);
else if (!calendar.includes(newHelper)) throw new Error('Missing copied custom task time helper.');

if (!calendar.includes('function dragDayFromX(x)')) throw new Error('Missing coordinate-based calendar drag targeting.');
if (!calendar.includes("if(dragState&&dragState.moved)updateDrag(e)")) throw new Error('Missing final pointer-up drag targeting.');
if (!calendar.includes("delete day.timeOverrides[key][id]")) throw new Error('Missing manual-time override cleanup.');
fs.writeFileSync(calendarPath, calendar);
console.log('Manual calendar edits now clear stale day-start timeOverrides for copied custom tasks.');
