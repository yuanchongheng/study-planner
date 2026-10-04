(()=>{'use strict';
if(window.__calendarDragFeedbackStarted)return;
window.__calendarDragFeedbackStarted=true;
const planner=document.querySelector('.gcal-planner');
const bridge=window.__notionBridge;
if(!planner||!bridge)return;
const HOUR_PX=60,DAY_MIN=1440,SNAP=5,THRESHOLD=2;
const pad=n=>String(n).padStart(2,'0');
const mins=s=>{const m=String(s||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):0};
const span=t=>{const p=String(t?.time||'').split('—');return{start:p[0]||'09:00',end:p[1]||'10:00'}};
const taskDuration=t=>{const s=span(t),a=mins(s.start),b=mins(s.end);return b<=a?DAY_MIN-a+b:b-a};
const snap=n=>Math.round(n/SNAP)*SNAP;
const fmtAbs=m=>{const day=Math.floor(Math.max(0,m)/DAY_MIN),v=((Math.round(m)%DAY_MIN)+DAY_MIN)%DAY_MIN;return`${day?`次日${day>1?day+'天 ': ' '}:''}${pad(Math.floor(v/60))}:${pad(v%60)}`};
const durationLabel=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),r=m%60;return h?(r?`${h}小时${r}分`:`${h}小时`):`${r}分钟`};
let state=null,tip=null;
const style=document.createElement('style');
style.textContent=`
.gcal-event{touch-action:none!important;user-select:none!important}
.gcal-event-title,.gcal-event-meta{pointer-events:none!important}
.gcal-event:hover{z-index:7!important}
.gcal-resize{height:5px!important;bottom:0!important;left:8px!important;right:8px!important}
.gcal-resize:after{height:2px!important;width:22px!important;bottom:1px!important}
.gcal-copy{width:17px!important;height:17px!important;line-height:17px!important}
.gcal-drag-time-tip{position:fixed;z-index:10020;pointer-events:none;padding:8px 11px;border-radius:11px;background:#f1f3f4;color:#202124;box-shadow:0 7px 22px rgba(0,0,0,.34);font-size:10px;font-weight:750;line-height:1.35;white-space:nowrap}.gcal-drag-time-tip b{color:#7066df;font-weight:850}.gcal-drag-time-tip .date{color:#5f6368;margin-right:6px;font-weight:650}
`;
document.head.appendChild(style);
function getTask(date,id){return(bridge.snapshot(date).tasks||[]).find(t=>String(t.id)===String(id))}
function ensureTip(){if(tip)return tip;tip=document.createElement('div');tip.className='gcal-drag-time-tip';tip.hidden=true;document.body.appendChild(tip);return tip}
function hideTip(){if(tip)tip.hidden=true}
function clampTip(x,y){const t=ensureTip();const w=t.offsetWidth||210,h=t.offsetHeight||38;let left=x+16,top=y-48;if(left+w>innerWidth-8)left=Math.max(8,x-w-16);if(top<8)top=y+16;if(top+h>innerHeight-8)top=Math.max(8,innerHeight-h-8);t.style.left=`${left}px`;t.style.top=`${top}px`}
planner.addEventListener('pointerdown',e=>{
 const ev=e.target.closest('.gcal-event');
 if(!ev||e.button!==0||e.target.closest('[data-resize],[data-event-copy]'))return;
 const date=ev.dataset.sourceDate,id=ev.dataset.eventId,task=getTask(date,id);if(!task)return;
 const r=ev.getBoundingClientRect(),dur=Math.max(SNAP,taskDuration(task));
 state={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,dragging:false,duration:dur,grabOffset:Math.max(0,Math.min(dur-SNAP,(e.clientY-r.top)/HOUR_PX*60)),date:ev.dataset.displayDate||date,start:mins(span(task).start)};
},true);
window.addEventListener('pointermove',e=>{
 if(!state||e.pointerId!==state.pointerId)return;
 if(!state.dragging&&Math.hypot(e.clientX-state.startX,e.clientY-state.startY)<THRESHOLD)return;
 state.dragging=true;
 const el=document.elementFromPoint(e.clientX,e.clientY),day=el?.closest?.('.gcal-day');if(!day)return;
 const r=day.getBoundingClientRect();let start=snap(((e.clientY-r.top)/HOUR_PX*60)-state.grabOffset);start=Math.max(0,Math.min(DAY_MIN-SNAP,start));
 state.date=day.dataset.date;state.start=start;
 const end=start+state.duration,t=ensureTip();t.hidden=false;t.innerHTML=`<span class="date">${state.date}</span>${fmtAbs(start)} → ${fmtAbs(end)} · <b>${durationLabel(state.duration)}</b>`;clampTip(e.clientX,e.clientY);
},{capture:true,passive:true});
window.addEventListener('pointerup',e=>{if(state&&e.pointerId===state.pointerId){hideTip();state=null}},true);
window.addEventListener('pointercancel',e=>{if(state&&e.pointerId===state.pointerId){hideTip();state=null}},true);
})();