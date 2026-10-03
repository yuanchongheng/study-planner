(()=>{'use strict';
if(window.__googleCalendarShellV2Started)return;
window.__googleCalendarShellV2Started=true;
const daily=document.getElementById('daily');
const planner=document.querySelector('.gcal-planner');
if(!daily||!planner)return;
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>new Date(String(s)+'T12:00:00');
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return iso(d)};
const diffDays=(a,b)=>Math.round((parse(b)-parse(a))/86400000);
const today=()=>iso(new Date());
const weekdays=['日','一','二','三','四','五','六'];
let miniView=new Date();miniView.setDate(1);
let miniSelected=today();
let lastScrollTop=null;
let syncing=false;

const style=document.createElement('style');
style.textContent=`
html,body{background:#17181b!important;color:#e8eaed!important}
#daily.gcal-shell-page{display:grid!important;grid-template-columns:276px minmax(0,1fr)!important;gap:12px!important;padding:12px!important;height:100vh!important;background:#17181b!important;overflow:hidden!important}
#daily.gcal-shell-page.sidebar-closed{grid-template-columns:0 minmax(0,1fr)!important;gap:0!important}
.gcal-persistent-sidebar{min-width:0;height:calc(100vh - 24px);overflow:auto;background:linear-gradient(180deg,#242529,#202125);border:1px solid #34363c;border-radius:24px;box-shadow:0 12px 34px rgba(0,0,0,.18);padding:15px 14px;color:#e8eaed;scrollbar-width:thin;scrollbar-color:#55585f transparent;transition:opacity .16s ease,transform .16s ease}
#daily.sidebar-closed .gcal-persistent-sidebar{opacity:0;pointer-events:none;transform:translateX(-12px)}
.gside-brand{display:flex;align-items:center;gap:10px;height:46px;padding:0 4px 10px}.gside-menu{width:36px;height:36px;border:0;border-radius:12px;background:transparent;color:#e8eaed;font-size:20px;display:grid;place-items:center;cursor:pointer}.gside-menu:hover{background:#34363b}.gside-logo{width:34px;height:34px;border-radius:11px;background:linear-gradient(135deg,#8ab4f8,#1a73e8 62%,#185abc);display:grid;place-items:center;color:#fff;font-weight:800;font-size:17px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}.gside-title{font-size:20px;font-weight:400}
.gside-create{width:100%;height:48px;border:0;border-radius:17px;background:#33353a;color:#e8eaed;display:flex;align-items:center;gap:11px;padding:0 17px;font-size:13px;font-weight:650;cursor:pointer;margin:8px 0 15px}.gside-create:hover{background:#3b3d43}.gside-create b{font-size:25px;font-weight:300;line-height:1}
.gmini{border:1px solid #35373d;border-radius:20px;background:#292a2f;padding:13px 11px 12px;margin-bottom:14px}.gmini-head{display:flex;align-items:center;justify-content:space-between;padding:0 3px 7px;font-size:12px;font-weight:650}.gmini-nav{display:flex;gap:2px}.gmini-nav button{width:28px;height:28px;border:0;border-radius:10px;background:transparent;color:#bdc1c6;cursor:pointer}.gmini-nav button:hover{background:#393b40}.gmini-week,.gmini-grid{display:grid;grid-template-columns:repeat(7,1fr);text-align:center}.gmini-week span{height:23px;display:grid;place-items:center;color:#9aa0a6;font-size:9px;font-weight:650}.gmini-day{width:29px;height:29px;justify-self:center;border:0;border-radius:10px;background:transparent;color:#bdc1c6;font-size:10px;cursor:pointer}.gmini-day:hover{background:#3a3c42}.gmini-day.muted{color:#696d73}.gmini-day.today{box-shadow:inset 0 0 0 1px #8ab4f8;color:#8ab4f8}.gmini-day.selected{background:#8ab4f8!important;color:#202124!important;border-radius:50%;font-weight:800;box-shadow:0 0 0 3px rgba(138,180,248,.1)}
.gside-section{border:1px solid #34363c;border-radius:18px;background:#26272b;padding:8px;margin-top:10px}.gside-section-title{font-size:12px;font-weight:650;padding:6px 7px 8px}.gside-cal{display:flex;align-items:center;gap:10px;height:35px;padding:0 8px;border-radius:11px;color:#c7c9cc;font-size:11px}.gside-cal:hover{background:#34363b}.gside-dot{width:12px;height:12px;border-radius:4px}.gside-dot.civil{background:#8b6fd6}.gside-dot.phd{background:#57b894}.gside-dot.apply{background:#e7bd5d}.gside-note{margin:13px 4px 0;padding:11px;border-radius:14px;background:#25262a;color:#85898f;font-size:9px;line-height:1.65}
.gcal-planner{height:calc(100vh - 24px)!important;margin:0!important;border:1px solid #34363c!important;border-radius:24px!important;background:#202124!important;box-shadow:0 12px 34px rgba(0,0,0,.16)!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;color:#e8eaed!important;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif!important}
.gcal-toolbar{height:62px!important;min-height:62px!important;padding:8px 14px!important;border-bottom:1px solid #34363c!important;background:#222327!important;gap:7px!important}.gcal-toolbar [data-create]{display:none!important}.gcal-today{height:38px!important;border:1px solid #5f6368!important;background:transparent!important;border-radius:14px!important;padding:0 16px!important;color:#e8eaed!important;font-size:11px!important;font-weight:650!important}.gcal-today:hover{background:#303134!important}.gcal-iconbtn{width:38px!important;height:38px!important;border-radius:12px!important;color:#bdc1c6!important;font-size:22px!important}.gcal-iconbtn:hover{background:#303134!important}.gcal-range{font-size:20px!important;font-weight:400!important;color:#e8eaed!important;margin-left:10px!important}.gcal-tool{height:36px!important;border:0!important;border-radius:12px!important;background:transparent!important;color:#bdc1c6!important}.gcal-tool:hover:not(:disabled){background:#303134!important}.gcal-view{height:36px!important;display:flex!important;align-items:center!important;border:1px solid #5f6368!important;border-radius:13px!important;background:transparent!important;color:#e8eaed!important;padding:0 13px!important}
.gcal-scroll{max-height:none!important;flex:1!important;min-height:0!important;overflow:auto!important;background:#202124!important;scrollbar-width:thin;scrollbar-color:#5f6368 #202124}.gcal-scroll::-webkit-scrollbar{width:10px;height:10px}.gcal-scroll::-webkit-scrollbar-thumb{background:#5f6368;border:2px solid #202124;border-radius:9px}.gcal-scroll::-webkit-scrollbar-track{background:#202124}
.gcal-grid{min-width:820px!important;grid-template-columns:62px repeat(5,minmax(152px,1fr))!important;background:#202124!important}.gcal-corner{height:70px!important;background:#222327!important;border-color:#34363c!important}.gcal-head{height:70px!important;background:#222327!important;border-color:#34363c!important;backdrop-filter:none!important}.gcal-head.today{background:#24262b!important}.gcal-daynum{width:38px!important;height:38px!important;border-radius:13px!important;color:#e8eaed!important;font-size:17px!important}.gcal-head.today .gcal-daynum{background:#8ab4f8!important;color:#202124!important;border-radius:50%!important;box-shadow:0 0 0 4px rgba(138,180,248,.10)!important}.gcal-headtxt b{color:#bdc1c6!important;font-size:10px!important;font-weight:550!important}.gcal-head.today .gcal-headtxt b{color:#8ab4f8!important}.gcal-headtxt span{color:#80868b!important}
.gcal-axis{background:#202124!important;border-color:#34363c!important}.gcal-time{color:#9aa0a6!important;font-size:9px!important}.gcal-day{background-color:#202124!important;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 59px,#36383e 59px,#36383e 60px)!important;border-color:#34363c!important}.gcal-day.today{background-color:#202124!important}.gcal-half{border-top-color:#2a2c31!important}
.gcal-event{border:0!important;border-radius:9px!important;padding:5px 23px 5px 7px!important;box-shadow:0 2px 5px rgba(0,0,0,.18)!important;color:#fff!important}.gcal-event:hover{box-shadow:0 5px 14px rgba(0,0,0,.28)!important;filter:brightness(1.06)!important}.gcal-event.civil{background:linear-gradient(135deg,#644a96,#563f82)!important}.gcal-event.phd{background:linear-gradient(135deg,#438a71,#397660)!important}.gcal-event.apply{background:linear-gradient(135deg,#a98543,#927236)!important}.gcal-event.selected{outline:2px solid #8ab4f8!important;outline-offset:1px!important}.gcal-event-title{color:#fff!important;font-size:10px!important;font-weight:650!important}.gcal-event-meta{color:rgba(255,255,255,.82)!important;font-size:8px!important}.gcal-copy{background:rgba(32,33,36,.72)!important;color:#fff!important;border-radius:7px!important}.gcal-now{background:#f28b82!important}.gcal-now:before{background:#f28b82!important}.gcal-now-label{display:none!important}.gcal-selection,.gcal-dragghost{border-radius:10px!important;background:rgba(138,180,248,.15)!important;border-color:#8ab4f8!important}.gcal-help{display:none!important}
.gcal-editor-backdrop{background:rgba(0,0,0,.46)!important}.gcal-editor{background:#303134!important;color:#e8eaed!important;border:1px solid #45474d!important;border-radius:22px!important;box-shadow:0 16px 48px rgba(0,0,0,.55)!important}.gcal-editor h4{color:#e8eaed!important}.gcal-field label{color:#9aa0a6!important}.gcal-field input,.gcal-field select,.gcal-field textarea{background:#3c4043!important;color:#e8eaed!important;border:1px solid #4b4d53!important;border-radius:12px!important}.gcal-save{background:#8ab4f8!important;color:#202124!important;border-radius:12px!important}.gcal-flat{color:#8ab4f8!important;border-radius:11px!important}.gcal-editor-actions .danger{color:#f28b82!important}
@media(max-width:900px){#daily.gcal-shell-page{grid-template-columns:232px minmax(0,1fr)!important}.gcal-range{font-size:16px!important}.gcal-tool{display:none!important}.gside-title{font-size:17px}}
@media(max-width:700px){#daily.gcal-shell-page{display:block!important;padding:8px!important}.gcal-persistent-sidebar{display:none!important}.gcal-planner{height:calc(100vh - 16px)!important;border-radius:18px!important}.gcal-grid{min-width:830px!important}.gcal-range{order:20;width:100%;margin:3px 0 0!important}}
`;
document.head.appendChild(style);

daily.classList.add('gcal-shell-page');
planner.classList.add('gcal-shell-v2');

const sidebar=document.createElement('aside');
sidebar.className='gcal-persistent-sidebar';
sidebar.innerHTML=`<div class="gside-brand"><button class="gside-menu" type="button" aria-label="折叠侧栏">☰</button><div class="gside-logo">4</div><span class="gside-title">日历</span></div><button class="gside-create" type="button"><b>＋</b><span>创建</span></button><div class="gmini"></div><div class="gside-section"><div class="gside-section-title">我的日历</div><div class="gside-cal"><span class="gside-dot civil"></span>考公</div><div class="gside-cal"><span class="gside-dot phd"></span>考博 · 三高</div><div class="gside-cal"><span class="gside-dot apply"></span>论文 / 申请</div></div><div class="gside-note">拖动空白创建 · 拖动任务移动 · 拖底边调整时长 · Alt/Option + 拖动复制</div>`;
daily.insertBefore(sidebar,planner);
const mini=sidebar.querySelector('.gmini');

function currentAnchor(){return planner.querySelector('[data-head-date]')?.dataset.headDate||null}
function targetAnchorFor(date){return addDays(date,-3)}
function visibleSelected(){const heads=[...planner.querySelectorAll('[data-head-date]')];return heads[3]?.dataset.headDate||heads[0]?.dataset.headDate||miniSelected}
function renderMini(){
 const y=miniView.getFullYear(),m=miniView.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),now=new Date();
 let cells='';
 for(let i=0;i<42;i++){
  const d=new Date(start);d.setDate(start.getDate()+i);const ds=iso(d),same=d.getMonth()===m,isToday=d.toDateString()===now.toDateString(),selected=ds===miniSelected;
  cells+=`<button class="gmini-day ${same?'':'muted'} ${isToday?'today':''} ${selected?'selected':''}" type="button" data-mini-date="${ds}">${d.getDate()}</button>`;
 }
 mini.innerHTML=`<div class="gmini-head"><span>${y}年${m+1}月</span><div class="gmini-nav"><button type="button" data-mini-prev>‹</button><button type="button" data-mini-next>›</button></div></div><div class="gmini-week">${weekdays.map(x=>`<span>${x}</span>`).join('')}</div><div class="gmini-grid">${cells}</div>`;
}
function syncMiniToMain(){
 const d=visibleSelected();if(!d)return;miniSelected=d;const x=parse(d);if(x.getFullYear()!==miniView.getFullYear()||x.getMonth()!==miniView.getMonth()){miniView=new Date(x);miniView.setDate(1)}renderMini();
}
function navTo(date){
 const current=currentAnchor();if(!current)return;
 const target=targetAnchorFor(date),delta=diffDays(current,target);if(delta===0){miniSelected=date;renderMini();return}
 const old=planner.querySelector('[data-scroll]')?.scrollTop??lastScrollTop;
 syncing=true;
 const selector=delta>0?'[data-next]':'[data-prev]',btn=()=>planner.querySelector(selector);
 for(let i=0;i<Math.abs(delta);i++)btn()?.click();
 syncing=false;
 miniSelected=date;miniView=parse(date);miniView.setDate(1);renderMini();
 requestAnimationFrame(()=>{const sc=planner.querySelector('[data-scroll]');if(sc&&old!=null){sc.scrollTop=old;lastScrollTop=old}});
}

sidebar.querySelector('.gside-menu').addEventListener('click',()=>daily.classList.toggle('sidebar-closed'));
sidebar.querySelector('.gside-create').addEventListener('click',()=>planner.querySelector('[data-create]')?.click());
mini.addEventListener('click',e=>{
 if(e.target.closest('[data-mini-prev]')){miniView.setMonth(miniView.getMonth()-1);renderMini();return}
 if(e.target.closest('[data-mini-next]')){miniView.setMonth(miniView.getMonth()+1);renderMini();return}
 const day=e.target.closest('[data-mini-date]');if(day)navTo(day.dataset.miniDate);
});

planner.addEventListener('click',e=>{
 if(!e.target.closest('[data-today]'))return;
 const first=currentAnchor(),want=targetAnchorFor(today());
 if(first===want){e.preventDefault();e.stopImmediatePropagation();miniSelected=today();miniView=new Date();miniView.setDate(1);renderMini();}
},true);

planner.addEventListener('scroll',e=>{const sc=e.target.closest?.('[data-scroll]');if(sc)lastScrollTop=sc.scrollTop},true);
const initialScroll=()=>{const sc=planner.querySelector('[data-scroll]');if(sc&&lastScrollTop==null)lastScrollTop=sc.scrollTop};
setTimeout(initialScroll,120);

let mutationTimer=null;
new MutationObserver(()=>{
 clearTimeout(mutationTimer);mutationTimer=setTimeout(()=>{
  const sc=planner.querySelector('[data-scroll]');
  if(sc&&lastScrollTop!=null&&!syncing)sc.scrollTop=lastScrollTop;
  syncMiniToMain();
 },0);
}).observe(planner,{childList:true,subtree:false});

syncMiniToMain();
document.title='日历｜备考计划室';
})();