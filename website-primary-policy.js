(()=>{'use strict';
if(window.__websitePrimaryPolicyStarted)return;
window.__websitePrimaryPolicyStarted=true;
const originalFetch=window.fetch.bind(window);
window.fetch=async(input,init={})=>{
  try{
    const url=typeof input==='string'?input:input?.url||'';
    if(url.includes('/functions/v1/notion-calendar-sync')&&typeof init?.body==='string'){
      const body=JSON.parse(init.body);
      if(body?.action==='sync'){
        body.policy='local';
        init={...init,body:JSON.stringify(body)};
      }
    }
  }catch{}
  return originalFetch(input,init);
};
window.__websitePrimaryMode=true;
const style=document.createElement('style');
style.textContent=`.website-primary-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:#eeeafd;color:#5148b4;font-size:9px;font-weight:800;border:1px solid #d7d1fa}.website-primary-badge:before{content:'◆';font-size:7px}`;
document.head.appendChild(style);
function badge(){
  const panel=document.querySelector('.notion-panel .panel-top,.notion-panel');
  if(!panel||panel.querySelector('.website-primary-badge'))return;
  panel.querySelector('.notion-primary-badge')?.remove();
  const b=document.createElement('span');
  b.className='website-primary-badge';
  b.textContent='网站主版本';
  panel.appendChild(b);
}
setTimeout(badge,600);
new MutationObserver(badge).observe(document.body,{childList:true,subtree:true});
})();