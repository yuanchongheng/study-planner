(()=>{'use strict';
const calendarMode=new URLSearchParams(location.search).get('calendar')==='1';
const hero=document.getElementById('overview');
if(hero){hero.classList.add('hidden');hero.setAttribute('aria-hidden','true')}
const notice=document.querySelector('.notice');
if(notice){notice.classList.add('hidden');notice.setAttribute('aria-hidden','true')}
document.querySelector('.side-foot')?.remove();
const legacyCalendar=document.getElementById('dragCalendar');
if(legacyCalendar){legacyCalendar.classList.add('hidden');legacyCalendar.setAttribute('aria-hidden','true')}
const colorStyle=document.createElement('style');
colorStyle.textContent=`
.gcal-event.civil{background:#eeeafd!important;border-left-color:#7066df!important;color:#5148b4!important}
.gcal-event.civil.selected{outline-color:#7066df!important}
${calendarMode?`
html,body{height:100%;overflow:hidden!important;background:#fff!important}
.app{display:block!important;min-height:100vh!important}
.sidebar{display:none!important}
.content{padding:0!important;margin:0!important;max-width:none!important;width:100%!important;height:100vh!important}
.content>*:not(#daily){display:none!important}
.content>#daily{display:block!important;margin:0!important;height:100vh!important;overflow:hidden!important}
#daily>*:not(.gcal-planner){display:none!important}
#daily>.gcal-planner{display:flex!important}
.gcal-planner{margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;height:100vh!important;display:flex!important;flex-direction:column!important}
.gcal-scroll{max-height:none!important;height:auto!important;flex:1!important;min-height:0!important}
.gcal-help{flex:0 0 auto!important}
`:''}
`;
document.head.appendChild(colorStyle);
const V='20261004-0210';
const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src+(src.includes('?')?'&':'?')+'v='+V;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
load('./notion-sync-core-v2.js').catch(()=>{});
if(calendarMode){
 load('./google-calendar-planner.js')
  .then(()=>load('./google-calendar-polish.js'))
  .then(()=>load('./google-calendar-rounding.js'))
  .then(()=>load('./google-calendar-persistence.js'))
  .catch(()=>{});
}else load('./today-home.js').catch(()=>{});
})();