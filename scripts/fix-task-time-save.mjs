import fs from 'node:fs';

const path='index.html';
let h=fs.readFileSync(path,'utf8');
const before=h;

// 1) Ensure the timeline save button is handled by the primary click router.
const already="saveTime=e.target.closest('[data-save-time]')";
if(!h.includes(already)){
  const start="$('timeline').addEventListener('click',e=>{let eff=";
  const pivot="saveTpl=e.target.closest('[data-save-task-template]');if(eff){";
  if(!h.includes(start))throw new Error('Missing timeline click-handler start');
  if(!h.includes(pivot))throw new Error('Missing timeline click-handler dispatch pivot');
  h=h.replace(start,"$('timeline').addEventListener('click',e=>{let saveTime=e.target.closest('[data-save-time]'),eff=");
  h=h.replace(pivot,"saveTpl=e.target.closest('[data-save-task-template]');if(saveTime){let box=saveTime.closest('[data-time-box]'),startInput=box?.querySelector('[data-draft-start]'),endInput=box?.querySelector('[data-draft-end]');if(startInput&&endInput)editTaskTime(saveTime.dataset.saveTime,startInput.value,endInput.value)}else if(eff){");
}

// 2) Restore true manual typing for the per-task start/end fields.
// Native input[type=time] is picker-only on some browsers/devices, so use text
// inputs that still validate as HH:MM before saving.
const manualStart='<input type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" autocomplete="off" value="${esc(start)}" data-draft-start aria-label="${esc(item.title)}开始时间">';
const manualEnd='<input type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM" autocomplete="off" value="${esc(end)}" data-draft-end aria-label="${esc(item.title)}结束时间">';
h=h.replace('<input type="time" step="300" value="${esc(start)}" data-draft-start aria-label="${esc(item.title)}开始时间">',manualStart);
h=h.replace('<input type="time" step="300" value="${esc(end)}" data-draft-end aria-label="${esc(item.title)}结束时间">',manualEnd);

// 3) Accept common manual formats: 930, 0930, 9:30, 09：30 -> 09:30.
if(!h.includes('function normalizeManualClock(')){
  const marker='function editTaskTime(id,start,end){';
  if(!h.includes(marker))throw new Error('Missing editTaskTime');
  const helper="function normalizeManualClock(value){let s=String(value||'').trim().replace(/：/g,':');if(/^\\d{3,4}$/.test(s)){s=s.padStart(4,'0');s=s.slice(0,2)+':'+s.slice(2)}let m=s.match(/^(\\d{1,2}):(\\d{1,2})$/);if(!m)return s;let h=Number(m[1]),min=Number(m[2]);if(h<0||h>23||min<0||min>59)return s;return `${pad(h)}:${pad(min)}`}\n";
  h=h.replace(marker,helper+"function editTaskTime(id,start,end){start=normalizeManualClock(start);end=normalizeManualClock(end);");
}

if(!h.includes(already))throw new Error('Task-time save control was not wired');
if(!h.includes('editTaskTime(saveTime.dataset.saveTime'))throw new Error('Task-time save does not call editTaskTime');
if(!h.includes('data-draft-start aria-label')||!h.includes('type="text" inputmode="numeric" maxlength="5" placeholder="HH:MM"'))throw new Error('Manual time inputs were not restored');
if(!h.includes('function normalizeManualClock('))throw new Error('Manual clock normalization is missing');

if(h!==before){
  fs.writeFileSync(path,h);
  console.log('Restored manual HH:MM entry and task-time save.');
}else{
  console.log('Manual task-time entry is already enabled.');
}
