(()=>{'use strict';
const hero=document.getElementById('overview');
if(hero){hero.classList.add('hidden');hero.setAttribute('aria-hidden','true')}
const notice=document.querySelector('.notice');
if(notice){notice.classList.add('hidden');notice.setAttribute('aria-hidden','true')}
document.querySelector('.side-foot')?.remove();
const load=src=>new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});
load('./notion-sync-core-v2.js').catch(()=>{});
load('./weekly-planner.js').then(()=>load('./calendar-continuation.js')).catch(()=>{});
load('./today-home.js').catch(()=>{});
})();