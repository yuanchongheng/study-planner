(()=>{'use strict';
if(window.__calendarColorLockStarted)return;
window.__calendarColorLockStarted=true;
const style=document.createElement('style');
style.textContent=`
.gcal-event.civil{
  background:#7066df!important;
  border:0!important;
  color:#fff!important;
  box-shadow:0 3px 10px rgba(112,102,223,.28)!important;
}
.gcal-event.civil .gcal-event-title,
.gcal-event.civil .gcal-event-meta{
  color:#fff!important;
}
.gcal-event.civil .gcal-event-meta{opacity:.86}
.gcal-event.civil.selected{
  outline:2px solid #b9b2ff!important;
  outline-offset:1px!important;
}
.gside-dot.civil{background:#7066df!important}
`;
document.head.appendChild(style);
})();