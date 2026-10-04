(()=>{'use strict';
if(window.__calendarDragControllerV2Started)return;
window.__calendarDragControllerV2Started=true;
const planner=document.querySelector('.gcal-planner');
const bridge=window.__notionBridge;
if(!planner||!bridge)return;
const HOUR_PX=60,DAY_MIN=1440,SNAP=5,THRESHOLD=2;
const pad=n=>String(n).padStart(2,'0');
const span=t=>{const p=String(t?.time||'').split('—');return{start:p[0]||'09:00',end:p[1]||'10:00'}};
const mins=s=>{const m=String(s||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):0};
const dur=t=>{const s=span(t),a=mins(s.start),b=mins(s.end);return b<=a?DAY_MIN-a+b:b-a};
const snap=n=>Math.round(n/SNAP)*SNAP;
const fmt=m=>{const d=Math.floor(Math.max(0,m)/DAY_MIN),v=((Math.round(m)%DAY_MIN)+DAY_MIN)%DAY_MIN;return`${d?`次日${d>1?d+'天 ': ' '}:''}${pad(Math.floor(v/60))}:${pad(v%60)}`};
const durLabel=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),r=m%60;return h?(r?`${h}小时${r}分`:`${h}小时`):`${r}分钟`};
let state=null,tip=null,columnLabel=null;
const style=document.createElement('style');
style.textContent=`
.gcal-event{touch-action:none!important;user-select:none!important}
.gcal-event-title,.gcal-event-meta{pointer-events:none!important}
.gcal-resize{height:4px!important;left:10px!important;right:10px!important;bottom:0!important}
.gcal-resize:after{height:2px!important;width:20px!important;bottom:1px!important}
.gcal-hit-through .gcal-event{pointer-events:none!important}
.gcal-hit-through .gcal-event.gcal-drag-source{opacity:.42!important}
.gcal-live-drag-tip{position:fixed;z-index:2147483000;pointer-events:none;padding:10px 13px;border-radius:12px;background:#f1f3f4;color:#202124;box-shadow:0 8px 28px rgba(0,0,0,.38);font-size:12px;font-weight:800;line-height:1.35;white-space:nowrap}.gcal-live-drag-tip b{color:#7066df;font-weight:900}.gcal-live-drag-tip .date{color:#5f6368;margin-right:8px;font-size:10px}
.gcal-live-column-time{position:absolute;left:8px;right:8px;z-index:36;pointer-events:none;padding:6px 8px;border-radius:9px;background:#f1f3f4;color:#202124;box-shadow:0 5px 18px rgba(0,0,0,.28);font-size:10px;font-weight:850;text-align:center;white-space:nowrap}.gcal-live-column-time b{color:#7066df}
`;
document.head.appendChild(style);
function taskFor(date,id){return(bridge.snapshot(date).tasks||[]).find(t=>String(t.id)===String(id))}
function ensureTip(){if(!tip){tip=document.createElement('div');tip.className='gcal-live-drag-tip';tip.hidden=true;document.body.appendChild(tip)}return tip}
function ensureColumnLabel(day){if(columnLabel?.parentElement!==day){columnLabel?.remove();columnLabel=document.createElement('div');columnLabel.className='gcal-live-column-time';day.appendChild(columnLabel)}return columnLabel}
function nearestDay(x){const days=[...planner.querySelectorAll('.gcal-day')];if(!days.length)return null;let best=null,dist=Infinity;for(const day of days){const r=day.getBoundingClientRect();if(x>=r.left&&x<=r.right)return day;const d=x<r.left?r.left-x:x-r.right;if(d<dist){dist=d;best=day}}return best}
function computeTarget(e){const day=nearestDay(e.clientX);if(!day||!state)return null;const r=day.getBoundingClientRect();let start=snap(((e.clientY-r.top)/HOUR_PX*60)-state.grabOffset);start=Math.max(0,Math.min(DAY_MIN-SNAP,start));return{day,date:day.dataset.date,start,end:start+state.duration}}
function placeFixedTip(e,text){const t=ensureTip();t.hidden=false;t.innerHTML=text;const w=t.offsetWidth||250,h=t.offsetHeight||42;let left=e.clientX+18,top=e.clientY-54;if(left+w>innerWidth-10)left=Math.max(10,e.clientX-w-18);if(top<10)top=e.clientY+18;if(top+h>innerHeight-10)top=Math.max(10,innerHeight-h-10);t.style.left=`${left}px`;t.style.top=`${top}px`}
function showTarget(e,target){const html=`<span class="date">${target.date}</span>${fmt(target.start)} → ${fmt(target.end)} · <b>${durLabel(state.duration)}</b>`;placeFixedTip(e,html);const label=ensureColumnLabel(target.day);label.style.top=`${Math.max(2,target.start/60*HOUR_PX-31)}px`;label.innerHTML=`${fmt(target.start)} → ${fmt(target.end)} · <b>${durLabel(state.duration)}</b>`}
function cleanup(){planner.classList.remove('gcal-hit-through');state?.source?.classList.remove('gcal-drag-source');if(tip)tip.hidden=true;columnLabel?.remove();columnLabel=null;state=null}
planner.addEventListener('pointerdown',e=>{
 const ev=e.target.closest('.gcal-event');if(!ev||e.button!==0||e.target.closest('[data-resize],[data-event-copy]'))return;
 const sourceDate=ev.dataset.sourceDate,id=ev.dataset.eventId,task=taskFor(sourceDate,id);if(!task)return;
 const r=ev.getBoundingClientRect(),duration=Math.max(SNAP,dur(task));
 state={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false,source:ev,sourceDate,id,duration,grabOffset:Math.max(0,Math.min(duration-SNAP,(e.clientY-r.top)/HOUR_PX*60))};
},true);
window.addEventListener('pointermove',e=>{
 if(!state||e.pointerId!==state.pointerId)return;
 if(!state.moved&&Math.hypot(e.clientX-state.startX,e.clientY-state.startY)<THRESHOLD)return;
 if(!state.moved){state.moved=true;planner.classList.add('gcal-hit-through');state.source.classList.add('gcal-drag-source')}
 const target=computeTarget(e);if(target)showTarget(e,target);
},{capture:true,passive:true});
window.addEventListener('pointerup',e=>{if(state&&e.pointerId===state.pointerId)cleanup()},true);
window.addEventListener('pointercancel',e=>{if(state&&e.pointerId===state.pointerId)cleanup()},true);
})();