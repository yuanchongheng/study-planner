(()=>{'use strict';
if(window.__calendarMainSyncStarted)return;
window.__calendarMainSyncStarted=true;
const bridge=window.__notionBridge;
if(!bridge)return;
const KEY='dual-study-workspace-v1';
const CHANNEL='study-planner-live-state-v1';
const tabId=(crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`);
let applying=false,lastRaw='';
let channel=null;
try{channel='BroadcastChannel' in window?new BroadcastChannel(CHANNEL):null}catch{}

function withModeHint(date,modeHint,fn){
 if(!date||!modeHint)return fn();
 const state=bridge.state?.();if(!state)return fn();
 state.days=state.days||{};
 const hadDay=Object.prototype.hasOwnProperty.call(state.days,date);
 const day=state.days[date]||(state.days[date]={});
 const hadMode=Object.prototype.hasOwnProperty.call(day,'mode'),oldMode=day.mode;
 day.mode=modeHint;
 try{return fn()}
 finally{
  if(hadMode)day.mode=oldMode;else delete day.mode;
  if(!hadDay&&Object.keys(day).length===0)delete state.days[date];
 }
}
if(!bridge.__calendarModeHintPatched){
 const rawUpsert=bridge.upsert.bind(bridge),rawRemove=bridge.remove.bind(bridge);
 bridge.upsert=(date,localId,modeHint,t)=>withModeHint(date,modeHint,()=>rawUpsert(date,localId,modeHint,t));
 bridge.remove=(date,id,modeHint)=>withModeHint(date,modeHint,()=>rawRemove(date,id,modeHint));
 bridge.__calendarModeHintPatched=true;
}

const previousCommit=bridge.commit.bind(bridge);
function serialize(){try{return JSON.stringify(bridge.state())}catch{return''}}
function publish(){
 const raw=serialize();if(!raw)return;
 lastRaw=raw;
 try{channel?.postMessage({type:'state',from:tabId,raw,at:Date.now()})}catch{}
}
bridge.commit=()=>{
 const r=previousCommit();
 if(!applying)queueMicrotask(publish);
 return r;
};

function validState(next){return !!next&&next.version===1&&next.days&&typeof next.days==='object'}
function applyRaw(raw){
 if(!raw||raw===lastRaw)return false;
 let next;try{next=JSON.parse(raw)}catch{return false}
 if(!validState(next))return false;
 const currentRaw=serialize();
 if(currentRaw===raw){lastRaw=raw;return false}
 const state=bridge.state();
 applying=true;
 const oldCloudChanged=window.__dualCloudChanged;
 try{
  Object.keys(state).forEach(k=>delete state[k]);
  Object.assign(state,next);
  lastRaw=raw;
  // Re-render this tab without treating an incoming cross-tab update as a fresh cloud edit.
  window.__dualCloudChanged=()=>{};
  previousCommit();
 }finally{
  window.__dualCloudChanged=oldCloudChanged;
  applying=false;
 }
 window.dispatchEvent(new CustomEvent('study-planner-state-synced'));
 return true;
}

window.addEventListener('storage',e=>{
 if(e.key===KEY&&e.newValue)applyRaw(e.newValue);
});
if(channel){
 channel.onmessage=e=>{
  const m=e.data;if(!m||m.type!=='state'||m.from===tabId)return;
  applyRaw(m.raw);
 };
}
function catchUp(){
 try{const raw=localStorage.getItem(KEY);if(raw)applyRaw(raw)}catch{}
}
window.addEventListener('focus',catchUp);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)catchUp()});
setTimeout(()=>{lastRaw=serialize();catchUp()},300);
})();
