(()=>{'use strict';
if(window.__googleCalendarRoundingStarted)return;
window.__googleCalendarRoundingStarted=true;
const apply=()=>{
 const planner=document.querySelector('.gcal-planner.google-look');
 if(!planner)return false;
 planner.classList.remove('sidebar-collapsed');
 return true;
};
const style=document.createElement('style');
style.textContent=`
.gcal-planner.google-look{background:#17181b!important}
.gcal-planner.google-look .gcal-toolbar{background:#1d1e21!important;border-bottom:1px solid #303238!important;padding:9px 16px!important;box-shadow:0 6px 20px rgba(0,0,0,.12)!important}
.google-workspace{gap:12px!important;padding:12px!important;background:#17181b!important}
.google-sidebar{background:linear-gradient(180deg,#242529 0%,#202125 100%)!important;border:1px solid #34363c!important;border-radius:24px!important;padding:16px 14px 20px!important;box-shadow:0 10px 30px rgba(0,0,0,.16)!important}
.google-sidebar .gcal-create{width:100%!important;height:50px!important;border-radius:18px!important;margin-bottom:16px!important;background:#33353a!important;box-shadow:none!important}.google-sidebar .gcal-create:hover{background:#3b3d43!important;box-shadow:none!important}
.google-mini{margin:0 0 14px!important;padding:14px 12px 13px!important;border:1px solid #35373d!important;border-radius:20px!important;background:#292a2f!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.025)}
.google-mini-head{margin-bottom:8px!important;padding:0 3px}.google-mini-nav button{border-radius:10px!important}.google-mini-day{width:28px!important;height:28px!important;justify-self:center;border-radius:10px!important}.google-mini-day:hover{background:#383a40!important}.google-mini-day.today{border-radius:50%!important;box-shadow:0 0 0 3px rgba(138,180,248,.10)}
.google-side-title{padding:12px 10px 9px!important}.google-cal-list{padding:7px!important;border:1px solid #34363c!important;border-radius:18px!important;background:#26272b!important;gap:3px!important}.google-cal-item{height:36px!important;border-radius:11px!important;padding:0 10px!important}.google-cal-item:hover{background:#34363b!important}.google-cal-dot{border-radius:4px!important}.google-side-note{margin:16px 10px 0!important;padding:12px!important;border-radius:14px!important;background:#25262a!important}
.gcal-planner.google-look .gcal-scroll{border:1px solid #34363c!important;border-radius:24px!important;background:#202124!important;box-shadow:0 10px 30px rgba(0,0,0,.12)!important;overflow:auto!important}
.gcal-planner.google-look .gcal-grid{min-width:800px!important;background:#202124!important}.gcal-planner.google-look .gcal-corner{border-top-left-radius:23px!important}.gcal-planner.google-look .gcal-head:last-of-type{border-top-right-radius:23px!important}
.gcal-planner.google-look .gcal-head{background:#222327!important;border-color:#34363c!important}.gcal-planner.google-look .gcal-head.today{background:#24262b!important}.gcal-planner.google-look .gcal-daynum{border-radius:13px!important}.gcal-planner.google-look .gcal-head.today .gcal-daynum{border-radius:50%!important;box-shadow:0 0 0 4px rgba(138,180,248,.10)!important}
.gcal-planner.google-look .gcal-axis{background:#202124!important;border-color:#34363c!important}.gcal-planner.google-look .gcal-day{background-color:#202124!important;border-color:#34363c!important;background-image:repeating-linear-gradient(to bottom,transparent 0,transparent 59px,#36383e 59px,#36383e 60px)!important}.gcal-planner.google-look .gcal-half{border-top-color:#2a2c31!important}
.gcal-planner.google-look .gcal-event{border-radius:9px!important;padding:5px 24px 5px 7px!important;box-shadow:0 2px 5px rgba(0,0,0,.18)!important}.gcal-planner.google-look .gcal-event:hover{box-shadow:0 5px 14px rgba(0,0,0,.28)!important}.gcal-planner.google-look .gcal-event.civil{background:linear-gradient(135deg,#644a96,#563f82)!important}.gcal-planner.google-look .gcal-event.phd{background:linear-gradient(135deg,#438a71,#397660)!important}.gcal-planner.google-look .gcal-event.apply{background:linear-gradient(135deg,#a98543,#927236)!important}.gcal-planner.google-look .gcal-copy{border-radius:7px!important}.gcal-planner.google-look .gcal-selection,.gcal-planner.google-look .gcal-dragghost{border-radius:10px!important}
.gcal-planner.google-look .gcal-today,.gcal-planner.google-look .gcal-view{border-radius:14px!important}.gcal-planner.google-look .gcal-tool{border-radius:12px!important}.google-menu-btn,.gcal-planner.google-look .gcal-iconbtn{border-radius:12px!important}.google-cal-logo{border-radius:11px!important}
.gcal-editor{border:1px solid #45474d!important;border-radius:22px!important;padding:20px!important}.gcal-field input,.gcal-field select,.gcal-field textarea{border-radius:12px!important;border:1px solid #4b4d53!important}.gcal-save{border-radius:12px!important;padding:9px 16px!important}.gcal-flat{border-radius:11px!important}.gcal-editor-actions .gcal-flat:hover{background:#3b3d42!important}
.gcal-toast{border-radius:14px!important;box-shadow:0 8px 24px rgba(0,0,0,.3)!important}
@media(min-width:731px){
 .gcal-planner.google-look:not(.sidebar-collapsed) .google-workspace{grid-template-columns:272px minmax(0,1fr)!important}
 .gcal-planner.google-look:not(.sidebar-collapsed) .google-sidebar{display:block!important;width:auto!important;min-width:0!important;padding:16px 14px 20px!important;opacity:1!important;overflow:auto!important;border:1px solid #34363c!important}
 .gcal-planner.google-look .google-brand{min-width:250px!important}
}
@media(max-width:730px){
 .google-workspace{padding:8px!important;gap:8px!important}
 .gcal-planner.google-look .gcal-scroll{border-radius:18px!important}
 .gcal-editor{border-radius:18px!important}
}
`;
document.head.appendChild(style);
if(!apply()){
 let n=0;const t=setInterval(()=>{n++;if(apply()||n>50)clearInterval(t)},100);
}
})();