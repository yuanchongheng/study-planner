import fs from 'node:fs';
const path='index.html';
let h=fs.readFileSync(path,'utf8');
h=h.replace(/\/\* SIDEBAR LIGHT V1 START \*\/[\s\S]*?\/\* SIDEBAR LIGHT V1 END \*\//,'');
const css=String.raw`
/* SIDEBAR LIGHT V1 START */
.sidebar{
  color:#263753!important;
  background:
    radial-gradient(circle at 8% 0%,rgba(123,107,224,.16),transparent 26%),
    radial-gradient(circle at 100% 78%,rgba(107,199,166,.13),transparent 34%),
    linear-gradient(180deg,#f4f5fb 0%,#eef2f8 48%,#f8f9fc 100%)!important;
  border-right:1px solid #dfe4ed;
  box-shadow:10px 0 30px rgba(35,49,77,.05)!important;
}
.brand{margin:0 6px 29px!important;padding:5px 3px 17px;border-bottom:1px solid rgba(118,131,155,.17)}
.mark{
  color:#263650!important;
  background:linear-gradient(145deg,#c9f4df 0%,#afe9d4 58%,#cbc5ff 150%)!important;
  border:1px solid rgba(255,255,255,.95);
  box-shadow:0 10px 26px rgba(66,137,115,.15),inset 0 1px 0 rgba(255,255,255,.95)!important;
}
.brand b{color:#24344f!important;letter-spacing:.2px}
.brand small{color:#718098!important;letter-spacing:1.35px}
.side-label{color:#8792a6!important;font-weight:800;letter-spacing:1.65px;margin-bottom:11px!important}
.sidebar nav{gap:5px!important}
.sidebar nav a{
  color:#5b6980!important;
  border:1px solid transparent!important;
  border-radius:12px!important;
  padding:11px 12px!important;
  transition:.16s ease!important;
}
.sidebar nav a span{color:#8c88ce!important;min-width:19px;font-size:9px!important}
.sidebar nav a:hover{
  color:#34445e!important;
  background:rgba(255,255,255,.66)!important;
  border-color:#e0e5ee!important;
  box-shadow:0 5px 15px rgba(42,58,88,.045)!important;
  transform:translateX(2px)!important;
}
.sidebar nav a.active{
  color:#2e3d58!important;
  background:linear-gradient(100deg,#fff 0%,#f9fbff 100%)!important;
  border-color:#d9e0ea!important;
  box-shadow:0 8px 22px rgba(45,61,93,.075),inset 4px 0 0 #82cdb3!important;
}
.sidebar nav a.active span{color:#277e67!important}
.side-foot{
  color:#34445f!important;
  border:1px solid #d9e0eb!important;
  background:
    radial-gradient(circle at 92% 10%,rgba(116,101,221,.12),transparent 34%),
    linear-gradient(145deg,rgba(255,255,255,.90),rgba(241,246,250,.96))!important;
  border-radius:18px!important;
  box-shadow:0 9px 26px rgba(42,58,88,.055)!important;
}
.side-foot strong{color:#2a3a55!important}
.side-foot p{color:#6e7b90!important}
@media(max-width:730px){
  .sidebar{border-right:0;border-bottom:1px solid #dfe4ed;box-shadow:0 8px 22px rgba(34,48,75,.045)!important}
  .brand{border-bottom:0;margin-bottom:9px!important;padding-bottom:2px}
  .sidebar nav a{background:rgba(255,255,255,.52)!important;border-color:#e2e6ee!important}
  .sidebar nav a.active{background:#fff!important}
}
/* SIDEBAR LIGHT V1 END */
`;
const i=h.indexOf('</style>');
if(i<0)throw new Error('style end not found');
h=h.slice(0,i)+css+h.slice(i);
fs.writeFileSync(path,h);
console.log('Light sidebar applied');
