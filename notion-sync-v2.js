(()=>{'use strict';
const calendarMode=new URLSearchParams(location.search).get('calendar')==='1';
const hero=document.getElementById('overview');
if(hero){hero.classList.add('hidden');hero.setAttribute('aria-hidden','true')}
const notice=document.querySelector('.notice');
if(notice){notice.classList.add('hidden');notice.setAttribute('aria-hidden','true')}
document.querySelector('.side-foot')?.remove();
const legacyCalendar=document.getElementById('dragCalendar');