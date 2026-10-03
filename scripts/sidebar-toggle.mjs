import fs from 'node:fs';
const path='index.html';
let h=fs.readFileSync(path,'utf8');

h=h.replace(/\/\* SIDEBAR TOGGLE V1 START \*\/[\s\S]*?\/\* SIDEBAR TOGGLE V1 END \*\//,'');
h=h.replace(/<button[^>]*id="sidebarOverlay"[\s\S]*?<\/button>/,'');
h=h.replace(/<button[^>]*id="sidebarToggle"[\s\S]*?<\/button>/,'');
h=h.replace(/<script id="sidebarToggleScript">[\s\S]*?<\/script>/,'');

const css=String.raw`
/* SIDEBAR TOGGLE V1 START */
.app{transition:grid-template-columns .22s ease}
.sidebar{transition:transform .22s ease,padding .22s ease,box-shadow .22s ease!important}
.sidebar-toggle{flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;min-height:38px;padding:8px 11px;border:1px solid #dde3ed;border-radius:10px;background:rgba(255,255,255,.92);color:#4d5b72;font-weight:800;font-size:11px;box-shadow:0 4px 14px rgba(34,49,78,.045);transition:.16s ease}
.sidebar-toggle:hover{background:#fff;border-color:#cfd6e3;transform:translateY(-1px);box-shadow:0 8px 18px rgba(34,49,78,.075)}
.sidebar-toggle-icon{display:grid;place-items:center;width:18px;height:18px;font-size:16px;line-height:1}.sidebar-toggle-text{white-space:nowrap}.sidebar-overlay{display:none;border:0;padding:0;margin:0;background:rgba(24,35,55,.26);backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}
body.sidebar-collapsed .app{grid-template-columns:82px minmax(0,1fr)}body.sidebar-collapsed .sidebar{padding-left:10px!important;padding-right:10px!important}body.sidebar-collapsed .brand{justify-content:center!important;margin:0 0 24px!important;padding:5px 0 15px!important}body.sidebar-collapsed .brand>div:last-child,body.sidebar-collapsed .side-label,body.sidebar-collapsed .side-foot{display:none!important}body.sidebar-collapsed .sidebar nav a{font-size:0!important;justify-content:center!important;padding:12px 8px!important;min-height:44px}body.sidebar-collapsed .sidebar nav a span{font-size:9px!important;min-width:0!important;margin:0!important}body.sidebar-collapsed .sidebar nav a:hover{transform:none!important}
@media(max-width:730px){.sidebar{position:fixed!important;left:0!important;top:0!important;bottom:0!important;width:min(86vw,300px)!important;height:100vh!important;z-index:1001!important;padding:20px 16px 24px!important;overflow:auto!important;transform:translateX(-104%);border-right:1px solid #dfe4ed!important;border-bottom:0!important;box-shadow:18px 0 42px rgba(27,40,65,.14)!important}.brand{border-bottom:1px solid rgba(118,131,155,.17)!important;margin:0 4px 20px!important;padding:4px 2px 15px!important}.sidebar nav a{background:rgba(255,255,255,.52)!important;border-color:#e2e6ee!important}.sidebar nav a.active{background:#fff!important}body.sidebar-open .sidebar{transform:translateX(0)}.sidebar-overlay{position:fixed;inset:0;z-index:1000}body.sidebar-open .sidebar-overlay{display:block}.sidebar-toggle-text{display:none}.sidebar-toggle{width:38px;padding:8px;justify-content:center}body.sidebar-collapsed .app{display:block}body.sidebar-collapsed .sidebar{padding:20px 16px 24px!important}body.sidebar-collapsed .brand{justify-content:flex-start!important;margin:0 4px 20px!important;padding:4px 2px 15px!important}body.sidebar-collapsed .brand>div:last-child,body.sidebar-collapsed .side-label,body.sidebar-collapsed .side-foot{display:block!important}body.sidebar-collapsed .sidebar nav a{font-size:11px!important;justify-content:flex-start!important;padding:11px 12px!important}body.sidebar-collapsed .sidebar nav a span{font-size:9px!important;min-width:19px!important}}
/* SIDEBAR TOGGLE V1 END */
`;
const styleEnd=h.indexOf('</style>');if(styleEnd<0)throw new Error('style end not found');h=h.slice(0,styleEnd)+css+h.slice(styleEnd);

if(!h.includes('id="sidebarOverlay"'))h=h.replace('<body>','<body><button class="sidebar-overlay" id="sidebarOverlay" type="button" aria-label="关闭侧边栏"></button>');
if(!h.includes('id="sidebarToggle"')){
  const re=/<header class="topbar">/;
  if(!re.test(h))throw new Error('topbar not found');
  h=h.replace(re,'<header class="topbar"><button class="sidebar-toggle" id="sidebarToggle" type="button" aria-label="切换侧边栏" title="切换侧边栏"><span class="sidebar-toggle-icon" id="sidebarToggleIcon" aria-hidden="true">‹</span><span class="sidebar-toggle-text" id="sidebarToggleText">收起导航</span></button>');
}

const js=String.raw`(()=>{const body=document.body,btn=document.getElementById('sidebarToggle'),overlay=document.getElementById('sidebarOverlay'),icon=document.getElementById('sidebarToggleIcon'),txt=document.getElementById('sidebarToggleText'),mq=window.matchMedia('(max-width:730px)'),key='study-sidebar-collapsed-v1';if(!btn)return;document.querySelectorAll('.sidebar nav a').forEach(a=>{a.title=a.textContent.trim().replace(/\s+/g,' ')});function sync(){if(mq.matches){body.classList.remove('sidebar-collapsed');const open=body.classList.contains('sidebar-open');icon.textContent=open?'×':'☰';txt.textContent=open?'关闭导航':'打开导航';btn.setAttribute('aria-expanded',open?'true':'false');btn.title=open?'关闭侧边栏':'打开侧边栏'}else{body.classList.remove('sidebar-open');const collapsed=localStorage.getItem(key)==='1';body.classList.toggle('sidebar-collapsed',collapsed);icon.textContent=collapsed?'›':'‹';txt.textContent=collapsed?'展开导航':'收起导航';btn.setAttribute('aria-expanded',collapsed?'false':'true');btn.title=collapsed?'展开侧边栏':'收起侧边栏'}}function toggle(){if(mq.matches){body.classList.toggle('sidebar-open')}else{const next=!body.classList.contains('sidebar-collapsed');body.classList.toggle('sidebar-collapsed',next);localStorage.setItem(key,next?'1':'0')}sync()}btn.addEventListener('click',toggle);overlay?.addEventListener('click',()=>{body.classList.remove('sidebar-open');sync()});document.querySelectorAll('.sidebar nav a').forEach(a=>a.addEventListener('click',()=>{if(mq.matches){body.classList.remove('sidebar-open');sync()}}));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&body.classList.contains('sidebar-open')){body.classList.remove('sidebar-open');sync()}});mq.addEventListener?.('change',sync);sync()})();`;
new Function(js);
if(!h.includes('id="sidebarToggleScript"'))h=h.replace('</body>',`<script id="sidebarToggleScript">${js}</script></body>`);

fs.writeFileSync(path,h);
console.log('Collapsible sidebar applied');
