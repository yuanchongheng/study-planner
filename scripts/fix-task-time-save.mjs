import fs from 'node:fs';

const path='index.html';
let h=fs.readFileSync(path,'utf8');
const before=h;

const already="saveTime=e.target.closest('[data-save-time]')";
if(!h.includes(already)){
  const start="$('timeline').addEventListener('click',e=>{let eff=";
  const pivot="saveTpl=e.target.closest('[data-save-task-template]');if(eff){";
  if(!h.includes(start))throw new Error('Missing timeline click-handler start');
  if(!h.includes(pivot))throw new Error('Missing timeline click-handler dispatch pivot');

  h=h.replace(
    start,
    "$('timeline').addEventListener('click',e=>{let saveTime=e.target.closest('[data-save-time]'),eff="
  );
  h=h.replace(
    pivot,
    "saveTpl=e.target.closest('[data-save-task-template]');if(saveTime){let box=saveTime.closest('[data-time-box]'),startInput=box?.querySelector('[data-draft-start]'),endInput=box?.querySelector('[data-draft-end]');if(startInput&&endInput)editTaskTime(saveTime.dataset.saveTime,startInput.value,endInput.value)}else if(eff){"
  );
}

if(!h.includes(already))throw new Error('Task-time save control was not wired');
if(!h.includes('editTaskTime(saveTime.dataset.saveTime'))throw new Error('Task-time save does not call editTaskTime');

if(h!==before){
  fs.writeFileSync(path,h);
  console.log('Wired timeline task-time save directly in index.html.');
}else{
  console.log('Timeline task-time save is already wired.');
}
