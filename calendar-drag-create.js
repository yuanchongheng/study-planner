(()=>{'use strict';
if(window.__calendarDragCreateStarted)return;
window.__calendarDragCreateStarted=true;
const bridge=window.__notionBridge;
const planner=document.querySelector('.gcal-planner');
if(!bridge||!planner)return;
const HOUR_PX=60,DAY_MIN=1440,SNAP=5,MIN_DURATION=15,THRESHOLD=5;
const pad=n=>String(n).padStart(2,'0');
const fmt=m=>{m=Math.max(0,Math.min(DAY_MIN,Math.round(m)));if(m===DAY_MIN)return'24:00';return`${pad(Math.floor(m/60))}:${pad(m%60)}`};
const snap=m=>Math.max(0,Math.min(DAY_MIN,Math.round(m/SNAP)*SNAP));
const durationLabel=m=>{m=Math.max(0,Math.round(m));const h=Math.floor(m/60),r=m%60;return h?(r?`${h}小时${r}分`:`${h}小时`):`${r}分钟`};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let pending=null,active=null,suppressDblUntil=0;

const style=document.createElement('style');
style.textContent=`
.gcal-create-selection{position:absolute;left:4px;right:4px;z-index:35;border:2px solid #a9a1ff;border-radius:9px;background:rgba(112,102,223,.34);box-shadow:0 5px 18px rgba(0,0,0,.18);pointer-events:none;min-height:15px}
.gcal-create-selection:before{content:'新任务';position:absolute;left:7px;top:5px;color:#fff;font-size:9px;font-weight:800;opacity:.9}
.gcal-create-tip{position:absolute;right:8px;z-index:45;transform:translateY(calc(-100% - 7px));padding:7px 10px;border-radius:10px;background:#f1f3f4;color:#202124;box-shadow:0 5px 18px rgba(0,0,0,.28);font-size:10px;font-weight:750;line-height:1.25;white-space:nowrap;pointer-events:none}.gcal-create-tip b{color:#7066df;font-weight:850}.gcal-create-tip:after{content:'';position:absolute;right:14px;bottom:-5px;width:10px;height:10px;background:#f1f3f4;transform:rotate(45deg)}
.gcal-drag-create-editor .gcal-create-summary{margin:0 0 12px;padding:10px 12px;border-radius:10px;background:#eeeafd;color:#5148b4;font-size:11px;font-weight:800}
`;
document.head.appendChild(style);

function minuteFromPoint(day,y){const r=day.getBoundingClientRect();return snap((y-r.top)/HOUR_PX*60)}
function autoScroll(y){const sc=planner.querySelector('[data-scroll]');if(!sc)return;const r=sc.getBoundingClientRect(),edge=56;if(y<r.top+edge)sc.scrollTop-=Math.ceil((r.top+edge-y)/5);else if(y>r.bottom-edge)sc.scrollTop+=Math.ceil((y-(r.bottom-edge))/5)}
function rangeFrom(start,current){let a,b;if(current>=start){a=start;b=Math.max(start+MIN_DURATION,current)}else{a=Math.min(current,start-MIN_DURATION);b=start}a=Math.max(0,a);b=Math.min(DAY_MIN,b);if(b-a<MIN_DURATION){if(b===DAY_MIN)a=Math.max(0,b-MIN_DURATION);else b=Math.min(DAY_MIN,a+MIN_DURATION)}return{a,b}}
function updateVisual(e){if(!active)return;autoScroll(e.clientY);const current=minuteFromPoint(active.day,e.clientY),{a,b}=rangeFrom(active.start,current);active.a=a;active.b=b;active.sel.style.top=`${a/60*HOUR_PX}px`;active.sel.style.height=`${Math.max(15,(b-a)/60*HOUR_PX)}px`;active.tip.style.top=`${Math.max(20,b/60*HOUR_PX)}px`;active.tip.innerHTML=`${fmt(a)} → ${fmt(b)} · <b>${durationLabel(b-a)}</b>`}
function beginActive(e){if(!pending)return;const sel=document.createElement('div');sel.className='gcal-create-selection';const tip=document.createElement('div');tip.className='gcal-create-tip';pending.day.append(sel,tip);active={...pending,sel,tip,a:pending.start,b:Math.min(DAY_MIN,pending.start+MIN_DURATION)};pending=null;try{active.day.setPointerCapture?.(active.pointerId)}catch{}updateVisual(e)}
function cleanup(){if(!active)return;try{active.day.releasePointerCapture?.(active.pointerId)}catch{}active.sel?.remove();active.tip?.remove()}
function notify(msg){const t=document.querySelector('.gcal-toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1700)}
function openCreateEditor(date,start,end){
 document.querySelector('.gcal-editor-backdrop')?.remove();
 const back=document.createElement('div');back.className='gcal-editor-backdrop gcal-drag-create-editor';
 back.innerHTML=`<div class="gcal-editor"><h4>创建任务</h4><div class="gcal-create-summary">${esc(date)} · ${fmt(start)} → ${fmt(end)} · ${durationLabel(end-start)}</div><div class="gcal-field"><label>任务名称</label><input data-title autofocus placeholder="添加标题"></div><div class="gcal-row"><div class="gcal-field"><label>日期</label><input type="date" data-date value="${esc(date)}"></div><div class="gcal-field"><label>开始</label><input type="time" step="300" data-start value="${fmt(start)}"></div><div class="gcal-field"><label>结束</label><input type="time" step="300" data-end value="${fmt(end===DAY_MIN?DAY_MIN-5:end)}"></div></div><div class="gcal-field"><label>类别</label><select data-cat><option value="civil" selected>考公</option><option value="phd">考博 · 三高</option><option value="apply">论文 / 申请</option></select></div><div class="gcal-field"><label>备注</label><textarea data-desc rows="3"></textarea></div><div class="gcal-editor-actions"><button class="gcal-flat" data-cancel>取消</button><button class="gcal-save" data-save>保存</button></div></div>`;
 document.body.appendChild(back);
 const close=()=>back.remove();
 back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-cancel]'))close()});
 back.querySelector('[data-save]').addEventListener('click',()=>{
  const d=back.querySelector('[data-date]').value,s=back.querySelector('[data-start]').value,en=back.querySelector('[data-end]').value,title=back.querySelector('[data-title]').value.trim()||'新任务',cat=back.querySelector('[data-cat]').value,description=back.querySelector('[data-desc]').value;
  if(!d||!s||!en){notify('请填写日期和时间');return}
  bridge.upsert(d,'',bridge.snapshot(d).mode||'',{title,description,cat,start:s,end:en,done:false});
  bridge.commit();close();notify(`已创建 ${s}–${en}`);
 });
 setTimeout(()=>back.querySelector('[data-title]')?.focus(),0);
}

planner.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.target.closest('.gcal-event,button,.gcal-toolbar,.gcal-editor'))return;
 const day=e.target.closest('.gcal-day');if(!day)return;
 pending={pointerId:e.pointerId,day,date:day.dataset.date,start:minuteFromPoint(day,e.clientY),x:e.clientX,y:e.clientY};
},true);
window.addEventListener('pointermove',e=>{
 if(pending&&e.pointerId===pending.pointerId&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>=THRESHOLD)beginActive(e);
 if(active&&e.pointerId===active.pointerId){e.preventDefault();updateVisual(e)}
},{capture:true,passive:false});
window.addEventListener('pointerup',e=>{
 if(active&&e.pointerId===active.pointerId){e.preventDefault();const s=active;cleanup();active=null;suppressDblUntil=Date.now()+450;openCreateEditor(s.date,s.a,s.b)}
 pending=null;
},true);
window.addEventListener('pointercancel',e=>{if(active&&e.pointerId===active.pointerId){cleanup();active=null}pending=null},true);
planner.addEventListener('dblclick',e=>{if(Date.now()<suppressDblUntil){e.preventDefault();e.stopImmediatePropagation()}},true);
})();