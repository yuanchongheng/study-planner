(()=>{'use strict';
if(window.__calendarColorLockStarted)return;
window.__calendarColorLockStarted=true;
const style=document.createElement('style');
style.textContent=`
.gcal-event.civil{
  background:#eeeafd!important;
  border-left:4px solid #7066df!important;
  color:#5148b4!important;
  box-shadow:0 2px 6px rgba(112,102,223,.16)!important;
}
.gcal-event.civil .gcal-event-title,
.gcal-event.civil .gcal-event-meta{
  color:#5148b4!important;
}
.gcal-event.civil.selected{
  outline:2px solid #7066df!important;
  outline-offset:1px!important;
}
.gside-dot.civil{background:#7066df!important}
`;
document.head.appendChild(style);
})();