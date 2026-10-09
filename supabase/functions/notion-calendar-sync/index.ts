const VERSION='2025-09-03';
const BUILD='2026-10-09-reconcile-v3';
const uuid=/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
const clock=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const cats={civil:'考公',phd:'考博',apply:'论文/申请'};
const sec=n=>(Deno.env.get(n)||'').trim();
const plain=v=>v?.[0]?.plain_text??v?.[0]?.text?.content??'';
const text=s=>s?[{text:{content:String(s)}}]:[];
const next=d=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+1);return x.toISOString().slice(0,10)};
const iso=(d,t)=>`${d}T${t}:00+08:00`;
const sig=t=>JSON.stringify([t.date,t.start,t.endDate,t.end,t.title,t.description,t.cat,!!t.done]);
const okDay=s=>dateRe.test(String(s||''))&&!Number.isNaN(new Date(s+'T12:00:00Z').getTime());
function out(status,body,origin){return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}})}
async function pause(ms=260){await new Promise(r=>setTimeout(r,ms))}
async function notion(path,method='GET',body,allow404=false){
 const token=sec('NOTION_TOKEN');if(!token)throw Error('未配置 NOTION_TOKEN');
 for(let i=0;i<3;i++){
  const r=await fetch('https://api.notion.com/v1'+path,{method,headers:{Authorization:'Bearer '+token,'Notion-Version':VERSION,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  let j;try{j=await r.json()}catch{j={}}
  if(r.status===404&&allow404)return null;
  if(r.status===429&&i<2){await pause(Math.min(Number(r.headers.get('Retry-After')||'1')*1000,6000));continue}
  await pause();if(!r.ok)throw Error(`Notion ${r.status}：${String(j.message||j.code||'请求失败').slice(0,220)}`);return j;
 }
 throw Error('Notion 限流，请稍后重试');
}
async function auth(jwt,api,url){const r=await fetch(url+'/auth/v1/user',{headers:{Authorization:'Bearer '+jwt,apikey:api}});if(!r.ok)throw Error('登录过期或身份验证失败，请在网页重新登录');const u=await r.json();if(!u?.id||!uuid.test(u.id))throw Error('账号无效');return u.id}
async function rev(jwt,api,url,id){const r=await fetch(url+'/rest/v1/study_workspace?select=revision&user_id=eq.'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+jwt,apikey:api,Accept:'application/json'}});if(!r.ok)throw Error('无法读取当前学习记录');const rows=await r.json();if(!Array.isArray(rows)||!rows.length)throw Error('尚无云端学习记录，请先点击网页「立即同步」');return Number(rows[0].revision)}
async function source(){const db=sec('NOTION_DATABASE_ID').replaceAll('-','');if(!uuid.test(db))throw Error('NOTION_DATABASE_ID 配置有误');const d=await notion('/databases/'+db);const s=d.data_sources||[];if(s.length!==1)throw Error('Notion 数据库应只有一个数据源');const id=s[0].id,sch=await notion('/data_sources/'+id);const need={'任务名称':'title','学习时间':'date','类别':'select','目标':'rich_text','完成':'checkbox','来源ID':'rich_text','来源日期':'rich_text'};for(const [n,t] of Object.entries(need))if(sch.properties?.[n]?.type!==t)throw Error(`Notion 属性「${n}」缺失或类型错误；需要：${t}`);return id}
function tasks(raw,date){if(!Array.isArray(raw)||raw.length>60)throw Error('单日任务最多同步60项');const seen=new Set();return raw.map(t=>{if(!t||typeof t.id!=='string'||t.id.length>160)throw Error('任务ID无效');const syncId=String(t.syncId||`${date}:${t.id}`);if(syncId.length>240||!/^[A-Za-z0-9:_-]+$/.test(syncId)||seen.has(syncId))throw Error('同步ID重复或无效');seen.add(syncId);const title=String(t.title||'').trim(),description=String(t.description||'');if(!title||title.length>90||description.length>600)throw Error('任务标题或目标文字不合规');if(!Object.hasOwn(cats,String(t.cat)))throw Error('任务分类无效');if(!clock.test(t.start)||!clock.test(t.end))throw Error('任务时间格式无效');const endDate=okDay(t.endDate)?t.endDate:(t.end<t.start?next(date):date);const x={syncId,id:t.id,localId:t.id,mode:String(t.mode||''),date,start:t.start,end:t.end,endDate,title,description,cat:t.cat,done:t.done===true};x.sig=sig(x);return x})}
function known(raw){return Array.isArray(raw)?raw.slice(0,200).map(x=>({syncId:String(x?.syncId||''),pageId:String(x?.pageId||''),sig:String(x?.sig||''),notionEditedAt:String(x?.notionEditedAt||''),date:String(x?.date||''),anchorDate:String(x?.anchorDate||''),localId:String(x?.localId||''),mode:String(x?.mode||'')})).filter(x=>x.syncId&&x.pageId):[]}
function fields(t,user){return {'任务名称':{title:text(t.title)},'学习时间':{date:{start:iso(t.date,t.start),end:iso(t.endDate,t.end)}},'类别':{select:{name:cats[t.cat]}},'目标':{rich_text:text(t.description)},'完成':{checkbox:!!t.done},'来源ID':{rich_text:text(`${user}:${t.syncId}`)},'来源日期':{rich_text:text(t.date)}}}
const sameTime=(a,b)=>!!a&&!!b&&Date.parse(a)===Date.parse(b);
function info(page,user){const p=page?.properties||{},raw=plain(p['来源ID']?.rich_text),prefix=user+':';return{owned:raw.startsWith(prefix),syncId:raw.startsWith(prefix)?raw.slice(prefix.length):'',sourceDate:plain(p['来源日期']?.rich_text)}}
function matches(page,t,user){const p=page?.properties||{},f=fields(t,user);return !page?.in_trash&&!page?.archived&&plain(p['任务名称']?.title)===t.title&&sameTime(p['学习时间']?.date?.start,f['学习时间'].date.start)&&sameTime(p['学习时间']?.date?.end,f['学习时间'].date.end)&&p['类别']?.select?.name===cats[t.cat]&&plain(p['目标']?.rich_text)===t.description&&p['完成']?.checkbox===!!t.done&&plain(p['来源ID']?.rich_text)===`${user}:${t.syncId}`&&plain(p['来源日期']?.rich_text)===t.date}
async function write(src,page,t,user){if(!page)return notion('/pages','POST',{parent:{type:'data_source_id',data_source_id:src},properties:fields(t,user)});if(matches(page,t,user))return page;return notion('/pages/'+page.id,'PATCH',{properties:fields(t,user)})}
async function trash(page){if(!page||page.in_trash||page.archived)return;await notion('/pages/'+page.id,'PATCH',{in_trash:true})}
async function dayPages(src,date){const out=[],seen=new Set();let cursor;for(let i=0;i<5;i++){const q={page_size:100,filter:{or:[{property:'来源日期',rich_text:{equals:date}},{and:[{property:'学习时间',date:{on_or_after:date}},{property:'学习时间',date:{before:next(date)}}]}]}};if(cursor)q.start_cursor=cursor;const b=await notion('/data_sources/'+src+'/query','POST',q);for(const p of b.results||[])if(!seen.has(p.id)){seen.add(p.id);out.push(p)}if(!b.has_more)break;cursor=b.next_cursor;if(!cursor)break}return out}
Deno.serve(async req=>{
 const origin=sec('NOTION_SITE_ORIGIN').replace(/\/$/,'');
 if(!origin||!origin.startsWith('https://'))return out(500,{error:'请设置 NOTION_SITE_ORIGIN 为网站 Origin'},origin||'*');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}});
 if(req.headers.get('origin')!==origin)return out(403,{error:'访问来源不符：请核对 NOTION_SITE_ORIGIN'},origin);
 if(req.method!=='POST')return out(405,{error:'只允许 POST'},origin);
 try{
  for(const k of ['NOTION_TOKEN','NOTION_DATABASE_ID','NOTION_ALLOWED_USER_ID'])if(!sec(k))throw Error(`服务端未设置 ${k}`);
  const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!jwt)return out(401,{error:'请先在备考网页登录 Supabase'},origin);
  const url=sec('SUPABASE_URL').replace(/\/$/,''),api=sec('SUPABASE_ANON_KEY');if(!url||!api)throw Error('缺少 Supabase 默认环境变量');
  const user=await auth(jwt,api,url);if(user!==sec('NOTION_ALLOWED_USER_ID'))return out(403,{error:'当前 Supabase 用户未被授权使用此 Notion 日历'},origin);
  const inc=await req.json();if(inc?.action==='capabilities')return out(200,{ok:true,mode:'website-primary-v1',apiVersion:VERSION,build:BUILD,features:['push','push-update','push-delete','website-primary','reconcile-orphans','dedupe','recreate-deleted']},origin);
  if(!okDay(inc?.date))return out(400,{error:'日期格式不正确'},origin);
  const r=await rev(jwt,api,url,user);if(!Number.isSafeInteger(inc.revision)||r!==inc.revision)return out(409,{error:'云端版本已变化。请先同步网站云端后重试 Notion。'},origin);
  const date=inc.date,local=tasks(inc.tasks,date),kn=known(inc.known),km=new Map(kn.map(k=>[k.syncId,k])),src=await source(),pages=await dayPages(src,date);
  const by=new Map(),owned=[];for(const p of pages){const x=info(p,user);if(!x.owned)continue;if(!by.has(x.syncId))by.set(x.syncId,[]);by.get(x.syncId).push(p);if(x.sourceDate===date)owned.push({page:p,syncId:x.syncId})}
  const bindings=[],removed=[],stats={created:0,updated:0,archived:0,unchanged:0,pulled:0,deduped:0,orphaned:0,recreated:0},localIds=new Set(local.map(t=>t.syncId)),trashed=new Set();
  async function archive(page,kind){if(!page||trashed.has(page.id)||page.in_trash||page.archived)return false;await trash(page);trashed.add(page.id);stats.archived++;if(kind==='deduped')stats.deduped++;if(kind==='orphaned')stats.orphaned++;return true}
  for(const t of local){
   const k=km.get(t.syncId);let page=null,boundWasDeleted=false;
   if(k?.pageId){const p=await notion('/pages/'+k.pageId,'GET',undefined,true);if(p&&(p.in_trash||p.archived))boundWasDeleted=true;else if(p&&info(p,user).syncId===t.syncId)page=p;else if(!p)boundWasDeleted=true}
   const cand=(by.get(t.syncId)||[]).filter(p=>!p.in_trash&&!p.archived);
   if(!page&&cand.length)page=cand[0];
   const existed=!!page,before=page?matches(page,t,user):false;
   page=await write(src,page,t,user);
   if(!existed){stats.created++;if(boundWasDeleted)stats.recreated++}else if(before)stats.unchanged++;else stats.updated++;
   for(const d of cand)if(d.id!==page.id)await archive(d,'deduped');
   bindings.push({syncId:t.syncId,pageId:page.id,sig:t.sig,notionEditedAt:page.last_edited_time||'',date:t.date,anchorDate:k?.anchorDate||date,localId:t.localId,mode:t.mode||k?.mode||''});
  }
  for(const x of owned){if(localIds.has(x.syncId))continue;if(await archive(x.page,'orphaned'))removed.push(x.syncId)}
  for(const k of kn){if(localIds.has(k.syncId)||(k.date!==date&&k.anchorDate!==date))continue;const p=await notion('/pages/'+k.pageId,'GET',undefined,true);await archive(p,'orphaned');removed.push(k.syncId)}
  return out(200,{ok:true,mode:'website-primary-v1',build:BUILD,date,...stats,remoteChanges:[],bindings,removedSyncIds:[...new Set(removed)],conflicts:[]},origin);
 }catch(e){const msg=e instanceof Error?e.message:String(e);console.error('website primary sync:',msg);return out(400,{error:msg},origin)}
});