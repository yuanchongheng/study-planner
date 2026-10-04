(()=>{'use strict';
if(window.__calendarDragSidePanelStarted)return;
window.__calendarDragSidePanelStarted=true;
const planner=document.querySelector('.gcal-planner');
const bridge=window.__notionBridge;
if(!planner||!bridge)return;
const HOUR_PX=60,DAY_MIN=1440,SNAP=5,THRESHOLD=2;
const pad=n=>String(n).padStart(2,'0');
const span=t=>{const p=String(t?.time||'').split('—');return{start:p[0]||'09:00',end:p[1]||'10:00'}};
const mins=s=>{const m=String(s||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):0};
const duration=t=>{const s=span(t),a=mins(s.start),b=mins(s.end);return b<=a?DAY_MIN-a+b:b-a};
const snap=n=>Math.round(n/SNAP)*SNAP;
const fmt=m=>{m=Math.max(0,Math.round(m));const v=((m%DAY_MIN)+DAY_MIN)%DAY_MIN;return`${pad(Math.floor(v/60))}:${pad(v%60)}`};
const durationLabel=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),r=m%60;return h?(r?`${h}小时 ${r}分钟`:`${h}小时`):`${r}分钟`};
const dateObj=s=>new Date(String(s)+'T12:00:00');
const dateLabel=s=>{const d=dateObj(s);return`${d.getMonth()+1}月${d.getDate()}日 周${'日一二三四五六'[d.getDay()]}`};
let state=null,hideTimer=null;

const panel=document.createElement('aside');
panel.className='gcal-drag-sidepanel';
panel.innerHTML=`<div class="gcal-sidepanel-kicker" data-panel-mode>移动日程</div><div class="gcal-sidepanel-title" data-panel-title>任务</div><div class="gcal-sidepanel-time"><strong data-panel-start>14:00</strong><span>→</span><strong data-panel-end>15:15</strong><em data-panel-duration>1小时 15分钟</em></div><div class="gcal-sidepanel-date" data-panel-date>10月6日 周二</div><div class="gcal-sidepanel-note">松开鼠标后保存到这个时间</div>`;
document.body.appendChild(panel);

const style=document.createElement('style');
style.textContent=`
.gcal-live-drag-tip,.gcal-live-column-time{display:none!important}
.gcal-drag-sidepanel{position:fixed;right:18px;top:92px;width:286px;z-index:2147483001;background:#1f1f1f;color:#f1f3f4;border:1px solid #3c4043;border-radius:18px;box-shadow:0 16px 44px rgba(0,0,0,.46);padding:18px 18px 16px;opacity:0;transform:translateX(18px) scale(.98);pointer-events:none;transition:opacity .14s ease,transform .14s ease;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif}
.gcal-drag-sidepanel.show{opacity:1;transform:translateX(0) scale(1)}
.gcal-sidepanel-kicker{font-size:10px;color:#9aa0a6;font-weight:750;margin-bottom:10px}.gcal-sidepanel-title{font-size:15px;font-weight:800;color:#fff;line-height:1.35;margin-bottom:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gcal-sidepanel-time{display:grid;grid-template-columns:auto 20px auto 1fr;align-items:center;column-gap:8px}.gcal-sidepanel-time strong{font-size:17px;letter-spacing:.2px;color:#fff;font-variant-numeric:tabular-nums}.gcal-sidepanel-time span{color:#777;font-size:18px;text-align:center}.gcal-sidepanel-time em{font-style:normal;color:#9aa0a6;font-size:11px;margin-left:auto;white-space:nowrap}
.gcal-sidepanel-date{margin-top:17px;padding-top:15px;border-top:1px solid #34363c;font-size:13px;color:#e8eaed;font-weight:700}.gcal-sidepanel-note{margin-top:12px;color:#777;font-size:9px}
.gcal-event{touch-action:none!important}.gcal-resize{height:4px!important;left:10px!important;right:10px!important}
@media(max-width:900px){.gcal-drag-sidepanel{right:10px;left:10px;top:auto;bottom:12px;width:auto;border-radius:16px}.gcal-sidepanel-title{margin-bottom:12px}.gcal-sidepanel-date{margin-top:12px;padding-top:11px}}
`;
document.head.appendChild(style);

const q=s=>panel.querySelector(s);
function taskFor(date,id){return(bridge.snapshot(date).tasks||[]).find(t=>String(t.id)===String(id))}
function nearestDay(x){const days=[...planner.querySelectorAll('.gcal-day')];if(!days.length)return null;let best=null,dist=Infinity;for(const day of days){const r=day.getBoundingClientRect();if(x>=r.left&&x<=r.right)return day;const d=x<r.left?r.left-x:x-r.right;if(d<dist){dist=d;best=day}}return best}
function showPanel(mode,title,date,start,end,total){clearTimeout(hideTimer);q('[data-panel-mode]').textContent=mode;q('[data-panel-title]').textContent=title||'未命名任务';q('[data-panel-start]').textContent=fmt(start);q('[data-panel-end]').textContent=fmt(end);q('[data-panel-duration]').textContent=durationLabel(total);q('[data-panel-date]').textContent=dateLabel(date);panel.classList.add('show')}
function linger(){clearTimeout(hideTimer);hideTimer=setTimeout(()=>panel.classList.remove('show'),1600)}
function immediateHide(){clearTimeout(hideTimer);panel.classList.remove('show')}
function dragTarget(e){const day=nearestDay(e.clientX);if(!day||!state)return null;const r=day.getBoundingClientRect();let start=snap(((e.clientY-r.top)/HOUR_PX*60)-state.grabOffset);start=Math.max(0,Math.min(DAY_MIN-SNAP,start));return{date:day.dataset.date,start,end:start+state.duration}}
function resizeTarget(e){if(!state)return null;const day=planner.querySelector(`.gcal-day[data-date="${state.displayDate}"]`)||state.day;if(!day)return null;const r=day.getBoundingClientRect();let end=snap((e.clientY-r.top)/HOUR_PX*60);end=Math.max(state.start+SNAP,Math.min(DAY_MIN,end));return{date:state.sourceDate,start:state.start,end,total:end-state.start}}

planner.addEventListener('pointerdown',e=>{
 const ev=e.target.closest('.gcal-event');if(!ev||e.button!==0)return;
 const sourceDate=ev.dataset.sourceDate,id=ev.dataset.eventId,task=taskFor(sourceDate,id);if(!task)return;
 const s=span(task),start=mins(s.start),d=Math.max(SNAP,duration(task)),r=ev.getBoundingClientRect();
 if(e.target.closest('[data-resize]')){
  state={type:'resize',pointerId:e.pointerId,sourceDate,displayDate:ev.dataset.displayDate||sourceDate,day:ev.closest('.gcal-day'),title:task.title||'未命名任务',start,duration:d,moved:true};
  showPanel('调整时长',state.title,sourceDate,start,start+d,d);
  return;
 }
 if(e.target.closest('[data-event-copy]'))return;
 state={type:'drag',pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,moved:false,sourceDate,title:task.title||'未命名任务',duration:d,grabOffset:Math.max(0,Math.min(d-SNAP,(e.clientY-r.top)/HOUR_PX*60))};
},true);

window.addEventListener('pointermove',e=>{
 if(!state||e.pointerId!==state.pointerId)return;
 if(state.type==='drag'){
  if(!state.moved&&Math.hypot(e.clientX-state.startX,e.clientY-state.startY)<THRESHOLD)return;
  state.moved=true;const t=dragTarget(e);if(!t)return;showPanel('移动日程',state.title,t.date,t.start,t.end,state.duration);
 }else{
  const t=resizeTarget(e);if(!t)return;showPanel('调整时长',state.title,t.date,t.start,t.end,t.total);
 }
},{capture:true,passive:true});
window.addEventListener('pointerup',e=>{if(state&&e.pointerId===state.pointerId){state=null;linger()}},true);
window.addEventListener('pointercancel',e=>{if(state&&e.pointerId===state.pointerId){state=null;immediateHide()}},true);
})();