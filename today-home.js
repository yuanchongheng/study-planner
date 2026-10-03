(()=>{'use strict';
const bridge=window.__notionBridge;
if(!bridge||window.__todayHomeStarted)return;
window.__todayHomeStarted=true;
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>iso(new Date());
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mins=s=>{const m=String(s||'').match(/^(\d{1,2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):9999};
const span=t=>{const p=String(t.time||'').split('—');return {start:p[0]||'',end:p[1]||''}};
const nowMins=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
const weekday=['日','一','二','三','四','五','六'];
const host=document.createElement('section');
host.id='todayHome';host.className='today-home';
const style=document.createElement('style');
style.textContent=`
.today-home{margin:0 0 18px;padding:22px;border:1px solid #d9d5ff;border-radius:22px;background:linear-gradient(135deg,#f8f7ff 0%,#fff 45%,#f8fbff 100%);box-shadow:0 16px 40px rgba(69,59,154,.10)}
.today-home-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px}.today-home-kicker{font-size:10px;font-weight:900;letter-spacing:.12em;color:#6a5ed1;text-transform:uppercase}.today-home h2{margin:5px 0 3px;font-size:24px;line-height:1.15;color:#24314a}.today-home-sub{font-size:11px;color:#7d889b}.today-home-summary{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}.today-chip{padding:7px 10px;border-radius:999px;background:#fff;border:1px solid #e1e4ec;font-size:9px;font-weight:850;color:#56647a}.today-chip.strong{background:#665bd1;border-color:#665bd1;color:#fff}
.today-list{display:grid;gap:8px}.today-task{display:grid;grid-template-columns:92px minmax(0,1fr) auto;align-items:center;gap:12px;padding:12px 14px;border:1px solid #e8eaf1;border-radius:14px;background:rgba(255,255,255,.88)}.today-task.current{border-color:#7569df;background:linear-gradient(90deg,#f0edff,#fff);box-shadow:0 8px 22px rgba(85,73,186,.12)}.today-task.next{border-color:#c7c2f2;background:#fbfaff}.today-time{font-size:11px;font-weight:900;color:#59677d}.today-task.current .today-time{color:#5b50c2}.today-title{font-size:12px;font-weight:850;color:#2f3d54;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.today-meta{margin-top:3px;font-size:9px;color:#929bad}.today-badge{font-size:8px;font-weight:900;border-radius:999px;padding:6px 8px;background:#f1f3f7;color:#7d8797;white-space:nowrap}.today-task.current .today-badge{background:#655bd1;color:#fff}.today-task.next .today-badge{background:#eeeaff;color:#665bd1}.today-empty{padding:22px;border:1px dashed #dfe3ec;border-radius:14px;background:rgba(255,255,255,.72);font-size:11px;color:#8a95a7;text-align:center}.today-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.today-action{border:1px solid #dfe3ec;background:#fff;color:#57667c;border-radius:9px;padding:8px 10px;font-size:9px;font-weight:850;cursor:pointer}.today-action.primary{background:#675cd2;border-color:#675cd2;color:#fff}
@media(max-width:730px){.today-home{padding:16px;border-radius:18px}.today-home-head{display:block}.today-home-summary{justify-content:flex-start;margin-top:10px}.today-home h2{font-size:20px}.today-task{grid-template-columns:76px minmax(0,1fr);gap:8px}.today-badge{grid-column:2;justify-self:start}.today-title{white-space:normal}}
`;
document.head.appendChild(style);
const target=document.getElementById('dailyGoals')||document.querySelector('main > *:not(.hidden)')||document.querySelector('main')?.firstChild;
if(target?.parentNode)target.parentNode.insertBefore(host,target);else document.querySelector('main')?.prepend(host);
function openToday(){const input=document.getElementById('date');const d=today();if(input){input.value=d;input.dispatchEvent(new Event('change',{bubbles:true}))}document.getElementById('daily')?.scrollIntoView({behavior:'smooth',block:'start'});}
function render(){
 const d=today(),snap=bridge.snapshot(d),tasks=[...(snap.tasks||[])].sort((a,b)=>mins(span(a).start)-mins(span(b).start)),now=nowMins();
 let currentId='',nextId='';
 for(const t of tasks){const s=span(t),a=mins(s.start),b=mins(s.end);if(a<=now&&now<b){currentId=String(t.id);break}}
 if(!currentId){const next=tasks.find(t=>mins(span(t).start)>now&&!t.done);if(next)nextId=String(next.id)}
 const done=tasks.filter(t=>t.done).length;
 const current=tasks.find(t=>String(t.id)===currentId);
 const next=tasks.find(t=>String(t.id)===nextId);
 host.innerHTML=`<div class="today-home-head"><div><div class="today-home-kicker">Today</div><h2>今天的日程 · 周${weekday[new Date().getDay()]}</h2><div class="today-home-sub">${d} · 打开网站即可直接看到，不需要往下找。</div></div><div class="today-home-summary"><span class="today-chip strong">${tasks.length} 项</span><span class="today-chip">已完成 ${done}</span>${current?`<span class="today-chip">进行中：${esc(current.title)}</span>`:next?`<span class="today-chip">下一项：${esc(next.title)}</span>`:''}</div></div>${tasks.length?`<div class="today-list">${tasks.map(t=>{const s=span(t),id=String(t.id),state=id===currentId?'current':id===nextId?'next':'';return `<div class="today-task ${state}"><div class="today-time">${esc(s.start)} — ${esc(s.end)}</div><div><div class="today-title">${t.done?'✓ ':''}${esc(t.title)}</div><div class="today-meta">${esc(t.cat==='phd'?'考博 · 三高':t.cat==='apply'?'论文 / 申请':'考公')}${t.description?` · ${esc(t.description)}`:''}</div></div><span class="today-badge">${t.done?'已完成':id===currentId?'正在进行':id===nextId?'下一项':'待开始'}</span></div>`}).join('')}</div>`:'<div class="today-empty">今天还没有安排任务。可以在下面的一周日程里，从之前的任务直接复制到今天。</div>'}<div class="today-actions"><button class="today-action primary" data-open-today>编辑今天</button><button class="today-action" data-open-week>查看一周</button></div>`;
}
host.addEventListener('click',e=>{if(e.target.closest('[data-open-today]'))openToday();if(e.target.closest('[data-open-week]'))document.querySelector('.week-planner')?.scrollIntoView({behavior:'smooth',block:'start'})});
const oldCommit=bridge.commit;bridge.commit=()=>{const r=oldCommit();setTimeout(render,0);return r};
const oldCloudChanged=window.__dualCloudChanged;window.__dualCloudChanged=(...args)=>{try{oldCloudChanged?.(...args)}finally{clearTimeout(window.__todayHomeRefreshTimer);window.__todayHomeRefreshTimer=setTimeout(render,80)}};
setInterval(render,60000);
render();
})();
