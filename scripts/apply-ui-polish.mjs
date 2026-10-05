import fs from 'node:fs';

const path = 'index.html';
let h = fs.readFileSync(path, 'utf8');
const before = h;
const version = '20261005-0460';

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

const oldDrag = `function updateDrag(e){if(!dragState)return;autoScroll(e.clientY);if(!dragState.moved&&Math.hypot(e.clientX-dragState.startX,e.clientY-dragState.startY)<DRAG_THRESHOLD)return;dragState.moved=true;const el=document.elementFromPoint(e.clientX,e.clientY),day=el?.closest?.('.gcal-day');if(!day)return;const start=Math.min(DAY_MIN-DRAG_SNAP,minuteFromPoint(day,e.clientY,DRAG_SNAP,dragState.grabOffset));dragState.targetDate=day.dataset.date;dragState.start=start;if(!dragState.ghost){dragState.ghost=document.createElement('div');dragState.ghost.className='gcal-dragghost'}if(dragState.ghost.parentElement!==day)day.appendChild(dragState.ghost);dragState.ghost.style.top=\`${'${start/60*HOUR_PX}'}px\`;dragState.ghost.style.height=\`${'${Math.max(22,Math.min(DAY_MIN-start,dragState.duration)/60*HOUR_PX-2)}'}px\`}`;
const newDrag = `function dragDayFromX(x){const days=[...box.querySelectorAll('.gcal-day')];if(!days.length)return null;let best=null,dist=Infinity;for(const day of days){const r=day.getBoundingClientRect();if(x>=r.left&&x<=r.right)return day;const d=x<r.left?r.left-x:x-r.right;if(d<dist){dist=d;best=day}}return best}\nfunction updateDrag(e){if(!dragState)return;autoScroll(e.clientY);if(!dragState.moved&&Math.hypot(e.clientX-dragState.startX,e.clientY-dragState.startY)<DRAG_THRESHOLD)return;dragState.moved=true;const day=dragDayFromX(e.clientX);if(!day)return;const start=Math.min(DAY_MIN-DRAG_SNAP,minuteFromPoint(day,e.clientY,DRAG_SNAP,dragState.grabOffset));dragState.targetDate=day.dataset.date;dragState.start=start;if(!dragState.ghost){dragState.ghost=document.createElement('div');dragState.ghost.className='gcal-dragghost'}if(dragState.ghost.parentElement!==day)day.appendChild(dragState.ghost);dragState.ghost.style.top=\`${'${start/60*HOUR_PX}'}px\`;dragState.ghost.style.height=\`${'${Math.max(22,Math.min(DAY_MIN-start,dragState.duration)/60*HOUR_PX-2)}'}px\`}`;
if (calendar.includes(oldDrag)) calendar = calendar.replace(oldDrag, newDrag);
else if (!calendar.includes('function dragDayFromX(x)')) throw new Error('Could not find the expected calendar updateDrag implementation.');

const oldPointerUp = `window.addEventListener('pointerup',()=>{if(dragState)endDrag();if(resizeState)finishResize(false)});`;
const newPointerUp = `window.addEventListener('pointerup',e=>{if(dragState&&dragState.moved)updateDrag(e);if(dragState)endDrag();if(resizeState)finishResize(false)});`;
if (calendar.includes(oldPointerUp)) calendar = calendar.replace(oldPointerUp, newPointerUp);
else if (!calendar.includes(newPointerUp)) throw new Error('Could not find the expected calendar pointerup handler.');

fs.writeFileSync(calendarPath, calendar);
console.log('Calendar drag uses coordinate targeting and final pointer-up coordinates.');
