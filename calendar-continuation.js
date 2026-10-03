(()=>{'use strict';
const bridge=window.__notionBridge;if(!bridge||window.__calendarContinuationStarted)return;window.__calendarContinuationStarted=true;
const HOUR_PX=64,DAY_MINUTES=1440;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const dateObj=s=>new Date(String(s)+'T12:00:00');
const addDays=(s,n)=>{const d=dateObj(s);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const todayIso=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
const span=t=>{const p=String(t.time||'').split('—');return {start:p[0]||'09:00',end:p[1]||'09:30'}};
const mins=s=>{const m=String(s||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):0};
const style=document.createElement('style');style.textContent=`
.week-planner .ncal-times,.week-planner .ncal-day{height:${24*HOUR_PX}px!important}
.week-planner .ncal-day{background-image:repeating-linear-gradient(to bottom,transparent 0,transparent ${HOUR_PX-1}px,#eceef2 ${HOUR_PX-1}px,#eceef2 ${HOUR_PX}px)!important}
.week-planner .ncal-event.continued{background:#fff0f2;border-color:#f0c8cf}
.week-planner .ncal-event.continued .ncal-event-title:before{content:'↳ ';color:#d84b5a;font-weight:900}
.week-planner .ncal-now{height:2px!important;background:#e23f4f!important;z-index:8!important}
.week-planner .ncal-now:before{left:-5px!important;top:-4px!important;width:9px!important;height:9px!important;background:#e23f4f!important}
.week-planner .ncal-now-label{position:absolute;left:6px;top:-9px;background:#e23f4f;color:#fff;border-radius:999px;padding:2px 5px;font-size:7px;font-weight:900;line-height:1;white-space:nowrap}
`;document.head.appendChild(style);
function positionExisting(dayEl,date){
 const snap=bridge.snapshot(date);
 for(const ev of dayEl.querySelectorAll('.ncal-event:not(.continued)')){
  const id=ev.querySelector('[data-copy-task]')?.dataset.copyTask;if(!id)continue;
  const task=(snap.tasks||[]).find(t=>String(t.id)===String(id));if(!task)continue;
  const s=span(task),a=mins(s.start),b=mins(s.end),cross=b<=a;
  ev.style.top=`${(a/60)*HOUR_PX}px`;
  ev.style.height=`${Math.max(26,(((cross?DAY_MINUTES:b)-a)/60)*HOUR_PX-2)}px`;
 }
}
function addContinuations(dayEl,date){
 const prev=addDays(date,-1),snap=bridge.snapshot(prev);
 for(const t of snap.tasks||[]){
  const s=span(t),a=mins(s.start),b=mins(s.end);if(!(b<=a)||b<=0)continue;
  const cat=t.cat==='phd'?'phd':t.cat==='apply'?'apply':'civil';
  const ev=document.createElement('div');ev.className=`ncal-event continued ${cat} ${t.done?'done':''}`;
  ev.style.top='0px';ev.style.height=`${Math.max(26,(b/60)*HOUR_PX-2)}px`;ev.dataset.openEvent=prev;ev.title=`${t.title} · 前一天延续至 ${s.end}`;
  ev.innerHTML=`<div class="ncal-event-title">${t.done?'✓ ':''}${esc(t.title)}</div><div class="ncal-event-time">00:00 — ${esc(s.end)} · 前一天延续</div>`;dayEl.appendChild(ev);
 }
}
function addNowLine(dayEl){
 dayEl.querySelectorAll('.ncal-now').forEach(n=>n.remove());const now=new Date(),m=now.getHours()*60+now.getMinutes();
 const line=document.createElement('div');line.className='ncal-now';line.style.top=`${(m/60)*HOUR_PX}px`;line.innerHTML=`<span class="ncal-now-label">${pad(now.getHours())}:${pad(now.getMinutes())}</span>`;dayEl.appendChild(line);
}
function apply(){
 const box=document.querySelector('.week-planner');if(!box)return;
 const times=box.querySelector('.ncal-times');if(times&&times.dataset.fullDay!=='1'){times.innerHTML=Array.from({length:24},(_,i)=>`<div class="ncal-time" style="top:${i*HOUR_PX}px">${pad(i)}:00</div>`).join('');times.dataset.fullDay='1'}
 box.querySelectorAll('.ncal-day').forEach(day=>{const date=day.dataset.calDay;if(!date)return;day.querySelectorAll('.ncal-event.continued').forEach(n=>n.remove());positionExisting(day,date);addContinuations(day,date);if(date===todayIso())addNowLine(day);else day.querySelectorAll('.ncal-now').forEach(n=>n.remove())});
 const scroller=box.querySelector('[data-cal-scroll]');if(scroller&&scroller.dataset.fullDayAdjusted!=='1'){const now=new Date();scroller.scrollTop=Math.max(0,(now.getHours()-2)*HOUR_PX);scroller.dataset.fullDayAdjusted='1'}
}
let lastBox='';setInterval(()=>{const box=document.querySelector('.week-planner');const stamp=box?.innerHTML?.length||0;if(String(stamp)!==lastBox){lastBox=String(stamp);apply()}else{const today=document.querySelector(`.ncal-day[data-cal-day="${todayIso()}"]`);if(today)addNowLine(today)}},30000);
document.addEventListener('click',e=>{const ev=e.target.closest('.ncal-event.continued');if(!ev)return;const input=document.getElementById('date');if(input){input.value=ev.dataset.openEvent;input.dispatchEvent(new Event('change',{bubbles:true}))}document.getElementById('dragCalendar')?.scrollIntoView({behavior:'smooth',block:'start'})});
setTimeout(apply,120);setTimeout(apply,800);
})();
