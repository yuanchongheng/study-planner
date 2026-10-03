(()=>{'use strict';
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
`;
document.head.appendChild(colorStyle);
const V='20261004-0150';
const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src+(src.includes('?')?'&':'?')+'v='+V;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
load('./notion-sync-core-v2.js').catch(()=>{});
load('./google-calendar-planner.js').catch(()=>{});
load('./today-home.js').catch(()=>{});
})();