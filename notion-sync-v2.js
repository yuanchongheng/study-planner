(()=>{'use strict';
const calendarMode=new URLSearchParams(location.search).get('calendar')==='1';
const hero=document.getElementById('overview');
if(hero){hero.classList.add('hidden');hero.setAttribute('aria-hidden','true')}
const notice=document.querySelector('.notice');
if(notice){notice.classList.add('hidden');notice.setAttribute('aria-hidden','true')}
document.querySelector('.side-foot')?.remove();
const legacyCalendar=document.getElementById('dragCalendar');
if(legacyCalendar){legacyCalendar.classList.add('hidden');legacyCalendar.setAttribute('aria-hidden','true')}
if(calendarMode){
 const s=document.createElement('style');
 s.textContent=`
 html,body{height:100%!important;overflow:hidden!important;background:#17181b!important}
 body>.app{display:block!important;min-height:100vh!important;background:#17181b!important}
 body>.app>.sidebar{display:none!important}
 body>.app>.content{width:100%!important;max-width:none!important;height:100vh!important;margin:0!important;padding:0!important;overflow:hidden!important;background:#17181b!important}
 body>.app>.content>*:not(#daily){display:none!important}
 body>.app>.content>#daily{display:grid!important;margin:0!important;width:100%!important;height:100vh!important;overflow:hidden!important}
 body>.app>.content>#daily>*:not(.gcal-planner):not(.gcal-persistent-sidebar){display:none!important}
 body>.app>.content>#daily>.gcal-planner,body>.app>.content>#daily>.gcal-persistent-sidebar{visibility:visible!important}
 `;
 document.head.appendChild(s);
}
const V='20261005-0470';
const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src+(src.includes('?')?'&':'?')+'v='+V;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
const revealCalendar=()=>{if(!calendarMode)return;requestAnimationFrame(()=>requestAnimationFrame(()=>{document.documentElement.classList.remove('calendar-boot');document.documentElement.classList.add('calendar-ready')}))};
const coreReady=load('./website-primary-policy.js')
 .then(()=>load('./notion-sync-core-v2.js'))
 .then(()=>load('./calendar-main-sync.js'));
if(calendarMode){
 coreReady
  .then(()=>load('./google-calendar-planner-v3.js'))
  .then(()=>load('./calendar-content-readonly.js'))
  .then(()=>load('./calendar-drag-create.js'))
  .then(()=>load('./calendar-drag-controller-v2.js'))
  .then(()=>load('./calendar-drag-sidepanel.js'))
  .then(()=>load('./google-calendar-shell-v2.js'))
  .then(()=>load('./calendar-color-lock.js'))
  .then(revealCalendar)
  .catch(()=>revealCalendar());
}else{
 coreReady.then(()=>load('./today-home.js')).catch(()=>{});
}
})();