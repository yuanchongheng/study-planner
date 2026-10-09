import fs from 'node:fs';

const path = 'index.html';
let h = fs.readFileSync(path, 'utf8');
const before = h;
const version = '20261009-0550';

const scriptRe = /<script\s+src=["']\.\/notion-sync-v2\.js(?:\?v=[^"']*)?["']\s*><\/script>/;
if (!scriptRe.test(h)) throw new Error('Missing notion-sync-v2.js script tag in index.html');
h = h.replace(scriptRe, `<script src="./notion-sync-v2.js?v=${version}"></script>`);

const boot = `<style id="calendarBootStyle">html.calendar-boot,html.calendar-boot body{background:#17181b!important;color:#e8eaed!important}html.calendar-boot body>.app{visibility:hidden!important}html.calendar-boot body:before{content:'';position:fixed;inset:0;z-index:2147483646;background:#17181b}html.calendar-boot body:after{content:'';position:fixed;z-index:2147483647;left:50%;top:50%;width:10px;height:10px;margin:-5px;border-radius:50%;background:#7066df;box-shadow:0 0 0 6px rgba(112,102,223,.14);animation:calendarBootPulse .8s ease-in-out infinite alternate}@keyframes calendarBootPulse{to{transform:scale(.72);opacity:.55}}html.calendar-ready body>.app{visibility:visible!important}</style><script id="calendarBootScript">(()=>{try{if(new URLSearchParams(location.search).get('calendar')==='1'){document.documentElement.classList.add('calendar-boot');setTimeout(()=>{document.documentElement.classList.remove('calendar-boot');document.documentElement.classList.add('calendar-ready')},6000)}}catch{}})();</script>`;
const bootRe = /<style id="calendarBootStyle">[\s\S]*?<\/style><script id="calendarBootScript">[\s\S]*?<\/script>/;
if (bootRe.test(h)) h = h.replace(bootRe, boot);
else h = h.replace(/<head>/i, `<head>${boot}`);

// Apply the main-site theme before the browser can paint the legacy inline styles.
// The stylesheet is deliberately a normal head stylesheet (not dynamically loaded),
// so first paint already uses the new UI and cannot flash the old design.
const themeBoot = `<script id="mainThemeBoot">(()=>{try{if(new URLSearchParams(location.search).get('calendar')!=='1')document.documentElement.classList.add('qoder-ui')}catch{document.documentElement.classList.add('qoder-ui')}})();</script><link id="mainThemeCss" rel="stylesheet" href="./qoder-theme.css?v=${version}">`;
const themeBootRe = /<script id="mainThemeBoot">[\s\S]*?<\/script><link id="mainThemeCss" rel="stylesheet" href="\.\/qoder-theme\.css\?v=[^"]+">/;
if(themeBootRe.test(h)) h=h.replace(themeBootRe,themeBoot);
else if(/<meta charset/i.test(h)) h=h.replace(/<meta charset/i,`${themeBoot}<meta charset`);
else h=h.replace(/<head>/i,`<head>${themeBoot}`);

if (h !== before) {
  fs.writeFileSync(path, h);
  console.log(`Updated index.html to v=${version}; main theme now loads before first paint.`);
} else console.log('index.html already uses the current no-flash theme boot.');

const calendarPath = 'google-calendar-planner-v3.js';
let calendar = fs.readFileSync(calendarPath, 'utf8');
if (!calendar.includes('function dragDayFromX(x)')) throw new Error('Missing coordinate-based calendar drag targeting.');
if (!calendar.includes("if(dragState&&dragState.moved)updateDrag(e)")) throw new Error('Missing final pointer-up drag targeting.');
if (!calendar.includes("delete day.timeOverrides[key][id]")) throw new Error('Missing manual-time override cleanup.');
console.log('Calendar drag/time override fixes verified.');

const coordinatorPath='same-device-cloud-sync.js';
const coordinator=fs.readFileSync(coordinatorPath,'utf8');
if(!coordinator.includes("navigator.locks.request(WEB_LOCK")) throw new Error('Missing same-device Web Locks coordinator.');
if(!coordinator.includes("localStorage.getItem(REV_KEY)")) throw new Error('Missing shared revision refresh.');
console.log('Same-device cloud write coordinator verified.');

const themePath='qoder-theme.css';
const theme=fs.readFileSync(themePath,'utf8');
if(!theme.includes('html.qoder-ui .hero')) throw new Error('Missing main-site hero theme.');
if(!theme.includes('--q-sidebar:#f1f5ef')) throw new Error('Main-site sidebar is not using the light palette.');
if(!theme.includes('html.qoder-ui .focus{background:#eef8f1')) throw new Error('Focus card is not using the light palette.');
if(!theme.includes('html.qoder-ui .live{background:#f2f8f3')) throw new Error('Live card is not using the light palette.');
console.log('Light-only main-site theme verified.');
