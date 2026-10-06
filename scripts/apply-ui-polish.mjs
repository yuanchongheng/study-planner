import fs from 'node:fs';

const path = 'index.html';
let h = fs.readFileSync(path, 'utf8');
const before = h;
const version = '20261006-0490';

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

if (!calendar.includes('function updateCopiedCustomTime(')) {
  const marker = 'function fragmentsFor(date){';
  const helper = `function updateCopiedCustomTime(date,id,start,end){if(!String(id||'').startsWith('custom_'))return null;const state=bridge.state?.(),day=state?.days?.[date],groups=day?.extraTasks;if(!groups||typeof groups!=='object')return null;for(const [mode,list] of Object.entries(groups)){if(!Array.isArray(list))continue;const entry=list.find(x=>String(x?.id)===String(id));if(!entry)continue;entry.time=\`${'${start}'}—${'${end}'}\`;entry.minutes=duration({time:entry.time});return{localId:id,mode}}return null}\n`;
  if (!calendar.includes(marker)) throw new Error('Missing calendar fragments marker.');
  calendar = calendar.replace(marker, helper + marker);
}

const oldSameDate = `else if(s.targetDate===s.sourceDate){r=saveTask(s.sourceDate,s.id,targetTask,bridge.snapshot(s.sourceDate).mode||'');notify('已移动任务')}`;
const newSameDate = `else if(s.targetDate===s.sourceDate){r=updateCopiedCustomTime(s.sourceDate,s.id,targetTask.start,targetTask.end)||saveTask(s.sourceDate,s.id,targetTask,bridge.snapshot(s.sourceDate).mode||'');notify('已移动任务')}`;
if (calendar.includes(oldSameDate)) calendar = calendar.replace(oldSameDate, newSameDate);
else if (!calendar.includes(newSameDate)) throw new Error('Missing same-date drag save branch.');

const oldResize = `saveTask(s.sourceDate,s.id,s.task,bridge.snapshot(s.sourceDate).mode||'');bridge.commit();render();notify(\`已调整为 ${'${durationLabel(resizeTotal(s,end))}'}\`)`;
const newResize = `updateCopiedCustomTime(s.sourceDate,s.id,s.task.start,s.task.end)||saveTask(s.sourceDate,s.id,s.task,bridge.snapshot(s.sourceDate).mode||'');bridge.commit();render();notify(\`已调整为 ${'${durationLabel(resizeTotal(s,end))}'}\`)`;
if (calendar.includes(oldResize)) calendar = calendar.replace(oldResize, newResize);
else if (!calendar.includes(newResize)) throw new Error('Missing resize save branch.');

if (!calendar.includes('function dragDayFromX(x)')) throw new Error('Missing coordinate-based calendar drag targeting.');
if (!calendar.includes("if(dragState&&dragState.moved)updateDrag(e)")) throw new Error('Missing final pointer-up drag targeting.');
fs.writeFileSync(calendarPath, calendar);
console.log('Calendar copied custom tasks now persist drag/resize by mutating their exact extraTasks record.');
