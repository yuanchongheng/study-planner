(()=>{'use strict';
if(window.__googleCalendarPersistenceStarted)return;
window.__googleCalendarPersistenceStarted=true;
const weekday=['日','一','二','三','四','五','六'];
let observer=null,refreshTimer=null;

function buildMiniCalendar(host){
 let view=new Date();view.setDate(1);
 const monthNames=['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
 const render=()=>{
  const y=view.getFullYear(),m=view.getMonth(),first=new Date(y,m,1),start=new Date(y,m,1-first.getDay()),today=new Date();
  let cells='';
  for(let i=0;i<42;i++){
   const d=new Date(start);d.setDate(start.getDate()+i);
   const same=d.getMonth()===m,isToday=d.toDateString()===today.toDateString();
   cells+=`<span class="google-mini-day ${same?'':'muted'} ${isToday?'today':''}">${d.getDate()}</span>`;
  }
  host.innerHTML=`<div class="google-mini-head"><span>${y}年 ${monthNames[m]}</span><div class="google-mini-nav"><button type="button" data-mini-prev aria-label="上个月">‹</button><button type="button" data-mini-next aria-label="下个月">›</button></div></div><div class="google-mini-week">${weekday.map(x=>`<span>${x}</span>`).join('')}</div><div class="google-mini-grid">${cells}</div>`;
 };
 host.addEventListener('click',e=>{
  if(e.target.closest('[data-mini-prev]')){view.setMonth(view.getMonth()-1);render()}
  if(e.target.closest('[data-mini-next]')){view.setMonth(view.getMonth()+1);render()}
 });
 render();
}

function makeBrand(planner,toolbar){
 let brand=toolbar.querySelector('.google-brand');
 if(!brand){
  brand=document.createElement('div');
  brand.className='google-brand';
  brand.innerHTML='<button class="google-menu-btn" type="button" aria-label="切换侧栏">☰</button><div class="google-cal-logo">4</div><span class="google-brand-title">日历</span>';
  toolbar.prepend(brand);
 }
 const menu=brand.querySelector('.google-menu-btn');
 if(menu&&!menu.dataset.persistBound){
  menu.dataset.persistBound='1';
  menu.addEventListener('click',()=>planner.classList.toggle('sidebar-collapsed'));
 }
 return brand;
}

function makeSidebar(create){
 const sidebar=document.createElement('aside');
 sidebar.className='google-sidebar';
 if(create)sidebar.appendChild(create);
 const mini=document.createElement('div');
 mini.className='google-mini';
 buildMiniCalendar(mini);
 sidebar.appendChild(mini);
 const calendars=document.createElement('div');
 calendars.innerHTML='<div class="google-side-title">我的日历</div><div class="google-cal-list"><div class="google-cal-item"><span class="google-cal-dot civil"></span><span>考公</span></div><div class="google-cal-item"><span class="google-cal-dot phd"></span><span>考博 · 三高</span></div><div class="google-cal-item"><span class="google-cal-dot apply"></span><span>论文 / 申请</span></div></div><div class="google-side-note">拖动空白创建任务 · 拖动任务移动日期与时间 · Alt/Option + 拖动可复制</div>';
 sidebar.appendChild(calendars);
 return sidebar;
}

function rebuild(){
 const planner=document.querySelector('.gcal-planner');
 if(!planner)return false;
 planner.classList.add('google-look');
 const toolbar=planner.querySelector(':scope > .gcal-toolbar')||planner.querySelector('.gcal-toolbar');
 const scroll=planner.querySelector(':scope > .gcal-scroll')||planner.querySelector('.gcal-scroll');
 if(!toolbar||!scroll)return false;
 const existing=planner.querySelector('.google-workspace');
 if(existing&&existing.contains(scroll)&&existing.querySelector('.google-sidebar'))return true;
 planner.querySelectorAll('.google-workspace').forEach(w=>{if(!w.contains(scroll))w.remove()});
 makeBrand(planner,toolbar);
 const nav=toolbar.querySelector('.gcal-nav'),today=toolbar.querySelector('[data-today]');
 if(nav&&today&&today.nextElementSibling!==nav)toolbar.insertBefore(today,nav);
 const create=toolbar.querySelector('[data-create]');
 const workspace=document.createElement('div');
 workspace.className='google-workspace';
 const sidebar=makeSidebar(create);
 scroll.parentNode.insertBefore(workspace,scroll);
 workspace.appendChild(sidebar);
 workspace.appendChild(scroll);
 document.title='日历｜备考计划室';
 return true;
}

function schedule(){
 clearTimeout(refreshTimer);
 refreshTimer=setTimeout(rebuild,20);
}

function start(){
 const planner=document.querySelector('.gcal-planner');
 if(!planner)return false;
 rebuild();
 observer?.disconnect();
 observer=new MutationObserver(schedule);
 observer.observe(planner,{childList:true,subtree:true});
 return true;
}

if(!start()){
 let tries=0;
 const timer=setInterval(()=>{tries++;if(start()||tries>60)clearInterval(timer)},100);
}
})();