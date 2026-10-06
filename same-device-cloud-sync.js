(()=>{'use strict';
if(window.__sameDeviceCloudSyncStarted)return;
window.__sameDeviceCloudSyncStarted=true;

const REV_KEY='dual-study-cloud-revision-v1';
const OWNER_KEY='dual-study-cloud-owner-v1';
const LEASE_KEY='dual-study-cloud-write-lock-v1';
const DEVICE_KEY='dual-study-cloud-device-v1';
const WEB_LOCK='dual-study-cloud-write-v1';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const randomId=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
let deviceId='';
try{
 deviceId=localStorage.getItem(DEVICE_KEY)||randomId();
 localStorage.setItem(DEVICE_KEY,deviceId);
}catch{deviceId=randomId()}
const tabId=randomId();

if(typeof cloudWrite!=='function')return;
const nativeCloudWrite=cloudWrite;
let inside=false;

function syncSharedRevision(){
 try{
  if(typeof cloudAuth==='undefined'||!cloudAuth?.user?.id)return false;
  if(localStorage.getItem(OWNER_KEY)!==String(cloudAuth.user.id))return false;
  const shared=Number(localStorage.getItem(REV_KEY));
  if(!Number.isFinite(shared))return false;
  if(remoteRevision===null||shared>Number(remoteRevision)){
   remoteRevision=shared;
   return true;
  }
 }catch{}
 return false;
}

function recoverSameBrowserConflict(advanced){
 if(!advanced||window.__studyPlannerTaskEditing)return;
 try{
  if(typeof cloudConflict!=='undefined'&&cloudConflict){
   cloudConflict=false;
   if(typeof cloudStatus==='function')cloudStatus('同设备标签页已合并 · 正在同步','warn');
  }
 }catch{}
}

function readLease(){
 try{return JSON.parse(localStorage.getItem(LEASE_KEY)||'null')}catch{return null}
}
async function withStorageLease(fn){
 const deadline=Date.now()+7000;
 while(Date.now()<deadline){
  const now=Date.now(),current=readLease();
  if(!current||current.expires<now||current.owner===tabId){
   try{localStorage.setItem(LEASE_KEY,JSON.stringify({owner:tabId,deviceId,expires:now+10000}))}catch{return fn()}
   await sleep(24);
   const check=readLease();
   if(check?.owner===tabId){
    const heartbeat=setInterval(()=>{
     const lease=readLease();
     if(lease?.owner===tabId){
      try{localStorage.setItem(LEASE_KEY,JSON.stringify({...lease,expires:Date.now()+10000}))}catch{}
     }
    },2000);
    try{return await fn()}
    finally{
     clearInterval(heartbeat);
     const lease=readLease();
     if(lease?.owner===tabId){try{localStorage.removeItem(LEASE_KEY)}catch{}}
    }
   }
  }
  await sleep(80+Math.floor(Math.random()*100));
 }
 return fn();
}

async function coordinatedWrite(){
 if(inside)return nativeCloudWrite();
 const run=async()=>{
  inside=true;
  try{
   const advanced=syncSharedRevision();
   recoverSameBrowserConflict(advanced);
   return await nativeCloudWrite();
  }finally{inside=false}
 };
 if(globalThis.navigator?.locks?.request){
  return navigator.locks.request(WEB_LOCK,{mode:'exclusive'},run);
 }
 return withStorageLease(run);
}

cloudWrite=coordinatedWrite;

window.addEventListener('storage',e=>{
 if(e.key!==REV_KEY||!e.newValue)return;
 const advanced=syncSharedRevision();
 recoverSameBrowserConflict(advanced);
 if(!advanced||window.__studyPlannerTaskEditing)return;
 try{
  if(typeof cloudDirty!=='undefined'&&cloudDirty&&typeof cloudBusy!=='undefined'&&!cloudBusy){
   clearTimeout(cloudTimer);
   cloudTimer=setTimeout(()=>cloudWrite(),220);
  }
 }catch{}
});

window.__sameDeviceCloudSync={deviceId,tabId,syncSharedRevision};
})();