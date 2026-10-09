const VERSION='2025-09-03';
const SYNC_BUILD='2026-10-09-reconcile-v2';
const uuidRe=/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
const clockRe=/^(?:[01]\d|2[0-3]):[0-5]\d$/;
const categories={civil:'考公',phd:'考博',apply:'论文/申请'};
const secret=n=>(Deno.env.get(n)||'').trim();

function result(status,value,origin){
  return new Response(JSON.stringify(value),{status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':origin,
    'Vary':'Origin',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS'
  }});
}
function validDay(s){
  if(!dateRe.test(String(s||'')))return false;
  const d=new Date(s+'T12:00:00Z');
  return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;
}
function nextDay(day){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10)}
function isoTime(date,time){return `${date}T${time}:00+08:00`}
function plain(v){return v?.[0]?.plain_text??v?.[0]?.text?.content??''}
function textValue(s){return s?[{text:{content:String(s)}}]:[]}
function signature(t){return JSON.stringify([t.date,t.start,t.endDate,t.end,t.title,t.description,t.cat,!!t.done])}
async function pause(ms=280){await new Promise(r=>setTimeout(r,ms))}

async function notion(path,method='GET',payload,allow404=false){
  const token=secret('NOTION_TOKEN');
  if(!token)throw Error('未配置 NOTION_TOKEN');
  for(let n=0;n<3;n++){
    const res=await fetch('https://api.notion.com/v1'+path,{method,headers:{
      Authorization:'Bearer '+token,
      'Notion-Version':VERSION,
      'Content-Type':'application/json'
    },body:payload===undefined?undefined:JSON.stringify(payload)});
    let data;try{data=await res.json()}catch{data={}}
    if(res.status===404&&allow404)return null;
    if(res.status===429&&n<2){await pause(Math.min(Number(res.headers.get('Retry-After')||'1')*1000,6000));continue}
    await pause();
    if(!res.ok)throw Error(`Notion ${res.status}：${String(data.message||data.code||'请求失败').slice(0,220)}`);
    return data;
  }
  throw Error('Notion 限流，请稍后重试');
}

async function authUser(jwt,api,url){
  const r=await fetch(url+'/auth/v1/user',{headers:{Authorization:'Bearer '+jwt,apikey:api}});
  if(!r.ok)throw Error('登录过期或身份验证失败，请在网页重新登录');
  const u=await r.json();
  if(!u?.id||!uuidRe.test(u.id))throw Error('账号无效');
  return u.id;
}
async function confirmedRevision(jwt,api,url,id){
  const r=await fetch(url+'/rest/v1/study_workspace?select=revision&user_id=eq.'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+jwt,apikey:api,Accept:'application/json'}});
  if(!r.ok)throw Error('无法读取当前学习记录');
  const rows=await r.json();
  if(!Array.isArray(rows)||!rows.length)throw Error('尚无云端学习记录，请先点击网页「立即同步」');
  return Number(rows[0].revision);
}
async function dataSource(){
  const db=secret('NOTION_DATABASE_ID').replaceAll('-','');
  if(!uuidRe.test(db))throw Error('NOTION_DATABASE_ID 配置有误');
  const database=await notion('/databases/'+db);
  const sources=database.data_sources||[];
  if(sources.length!==1)throw Error('Notion 数据库应只有一个数据源');
  const source=sources[0].id;
  const schema=await notion('/data_sources/'+source);
  const fields={'任务名称':'title','学习时间':'date','类别':'select','目标':'rich_text','完成':'checkbox','来源ID':'rich_text','来源日期':'rich_text'};
  for(const [name,type] of Object.entries(fields))if(schema.properties?.[name]?.type!==type)throw Error(`Notion 属性「${name}」缺失或类型错误；需要：${type}`);
  return source;
}

function cleanTasks(raw,requestDate){
  if(!Array.isArray(raw)||raw.length>60)throw Error('单日任务最多同步60项');
  const ids=new Set();
  return raw.map(t=>{
    if(!t||typeof t.id!=='string'||t.id.length>160)throw Error('任务ID无效');
    const syncId=String(t.syncId||`${requestDate}:${t.id}`);
    if(syncId.length>240||!/^[A-Za-z0-9:_-]+$/.test(syncId)||ids.has(syncId))throw Error('同步ID重复或无效');
    ids.add(syncId);
    const title=String(t.title||'').trim(),description=String(t.description||'');
    if(!title||title.length>90||description.length>600)throw Error('任务标题或目标文字不合规');
    if(!Object.hasOwn(categories,String(t.cat)))throw Error('任务分类无效');
    if(!clockRe.test(t.start)||!clockRe.test(t.end))throw Error('任务时间格式无效');
    const endDate=validDay(t.endDate)?t.endDate:(t.end<t.start?nextDay(requestDate):requestDate);
    const item={syncId,id:t.id,localId:t.id,mode:String(t.mode||''),date:requestDate,start:t.start,end:t.end,endDate,title,description,cat:t.cat,done:t.done===true};
    item.sig=signature(item);
    return item;
  });
}
function cleanKnown(raw){
  if(!Array.isArray(raw))return [];
  return raw.slice(0,200).map(x=>({
    syncId:String(x?.syncId||''),pageId:String(x?.pageId||''),sig:String(x?.sig||''),notionEditedAt:String(x?.notionEditedAt||''),
    date:String(x?.date||''),anchorDate:String(x?.anchorDate||''),localId:String(x?.localId||''),mode:String(x?.mode||'')
  })).filter(x=>x.syncId&&x.pageId);
}
function pageFields(t,userId){
  return {
    '任务名称':{title:textValue(t.title)},
    '学习时间':{date:{start:isoTime(t.date,t.start),end:isoTime(t.endDate,t.end)}},
    '类别':{select:{name:categories[t.cat]}},
    '目标':{rich_text:textValue(t.description)},
    '完成':{checkbox:!!t.done},
    '来源ID':{rich_text:textValue(`${userId}:${t.syncId}`)},
    '来源日期':{rich_text:textValue(t.date)}
  };
}
function sameTime(a,b){return !!a&&!!b&&Date.parse(a)===Date.parse(b)}
function sourceInfo(page,userId){
  const p=page?.properties||{};
  const raw=plain(p['来源ID']?.rich_text);
  const prefix=userId+':';
  return {owned:raw.startsWith(prefix),syncId:raw.startsWith(prefix)?raw.slice(prefix.length):'',sourceDate:plain(p['来源日期']?.rich_text)};
}
function ownsSync(page,userId,syncId){
  const info=sourceInfo(page,userId);
  return info.owned&&info.syncId===syncId;
}
function fieldsMatch(page,t,userId){
  const p=page?.properties||{},f=pageFields(t,userId);
  return !page?.in_trash&&!page?.archived&&
    plain(p['任务名称']?.title)===t.title&&
    sameTime(p['学习时间']?.date?.start,f['学习时间'].date.start)&&
    sameTime(p['学习时间']?.date?.end,f['学习时间'].date.end)&&
    p['类别']?.select?.name===categories[t.cat]&&
    plain(p['目标']?.rich_text)===t.description&&
    p['完成']?.checkbox===!!t.done&&
    plain(p['来源ID']?.rich_text)===`${userId}:${t.syncId}`&&
    plain(p['来源日期']?.rich_text)===t.date;
}
async function writePage(source,page,task,userId){
  if(!page)return await notion('/pages','POST',{parent:{type:'data_source_id',data_source_id:source},properties:pageFields(task,userId)});
  if(fieldsMatch(page,task,userId))return page;
  return await notion('/pages/'+page.id,'PATCH',{in_trash:false,properties:pageFields(task,userId)});
}
async function trashPage(page){
  if(!page||page.in_trash||page.archived)return page;
  return await notion('/pages/'+page.id,'PATCH',{in_trash:true});
}
async function pagesForDay(source,date){
  const out=[],seen=new Set();let cursor;
  for(let i=0;i<5;i++){
    const q={page_size:100,filter:{or:[
      {property:'来源日期',rich_text:{equals:date}},
      {and:[{property:'学习时间',date:{on_or_after:date}},{property:'学习时间',date:{before:nextDay(date)}}]}
    ]}};
    if(cursor)q.start_cursor=cursor;
    const b=await notion('/data_sources/'+source+'/query','POST',q);
    for(const p of b.results||[])if(!seen.has(p.id)){seen.add(p.id);out.push(p)}
    if(!b.has_more)return out;
    cursor=b.next_cursor;if(!cursor)break;
  }
  return out;
}

Deno.serve(async req=>{
  const origin=secret('NOTION_SITE_ORIGIN').replace(/\/$/,'');
  if(!origin||!origin.startsWith('https://'))return result(500,{error:'请设置 NOTION_SITE_ORIGIN 为网站 Origin'},origin||'*');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{
    'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'
  }});
  if(req.headers.get('origin')!==origin)return result(403,{error:'访问来源不符：请核对 NOTION_SITE_ORIGIN'},origin);
  if(req.method!=='POST')return result(405,{error:'只允许 POST'},origin);
  try{
    for(const k of ['NOTION_TOKEN','NOTION_DATABASE_ID','NOTION_ALLOWED_USER_ID'])if(!secret(k))throw Error(`服务端未设置 ${k}`);
    const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
    if(!jwt)return result(401,{error:'请先在备考网页登录 Supabase'},origin);
    const url=secret('SUPABASE_URL').replace(/\/$/,''),anon=secret('SUPABASE_ANON_KEY');
    if(!url||!anon)throw Error('缺少 Supabase 默认环境变量');
    const user=await authUser(jwt,anon,url);
    if(user!==secret('NOTION_ALLOWED_USER_ID'))return result(403,{error:'当前 Supabase 用户未被授权使用此 Notion 日历'},origin);

    const incoming=await req.json();
    if(incoming?.action==='capabilities')return result(200,{ok:true,mode:'website-primary-v1',apiVersion:VERSION,build:SYNC_BUILD,features:['push','push-update','push-delete','website-primary','reconcile-orphans','dedupe']},origin);
    if(!validDay(incoming?.date))return result(400,{error:'日期格式不正确'},origin);
    const revision=await confirmedRevision(jwt,anon,url,user);
    if(!Number.isSafeInteger(incoming.revision)||revision!==incoming.revision)return result(409,{error:'云端版本已变化。请先同步网站云端后重试 Notion。'},origin);

    const requestDate=incoming.date;
    const localTasks=cleanTasks(incoming.tasks,requestDate);
    const known=cleanKnown(incoming.known);
    const knownMap=new Map(known.map(k=>[k.syncId,k]));
    const source=await dataSource();
    const dayPages=await pagesForDay(source,requestDate);
    const ownedBySync=new Map();
    const ownedForSourceDate=[];
    for(const page of dayPages){
      const info=sourceInfo(page,user);
      if(!info.owned)continue;
      if(!ownedBySync.has(info.syncId))ownedBySync.set(info.syncId,[]);
      ownedBySync.get(info.syncId).push(page);
      if(info.sourceDate===requestDate)ownedForSourceDate.push({page,syncId:info.syncId});
    }

    const bindings=[],removedSyncIds=[];
    const stats={created:0,updated:0,archived:0,unchanged:0,pulled:0,deduped:0,orphaned:0};
    const localIds=new Set(localTasks.map(t=>t.syncId));
    const trashedPageIds=new Set();
    const archiveOnce=async(page,kind='archived')=>{
      if(!page||trashedPageIds.has(page.id)||page.in_trash||page.archived)return false;
      await trashPage(page);trashedPageIds.add(page.id);stats.archived++;
      if(kind==='deduped')stats.deduped++;
      if(kind==='orphaned')stats.orphaned++;
      return true;
    };

    for(const task of localTasks){
      const k=knownMap.get(task.syncId);
      let page=null;
      if(k?.pageId){
        const bound=await notion('/pages/'+k.pageId,'GET',undefined,true);
        if(bound&&ownsSync(bound,user,task.syncId))page=bound;
      }
      const candidates=(ownedBySync.get(task.syncId)||[]).filter(p=>!p.in_trash&&!p.archived);
      if(!page&&candidates.length)page=candidates[0];
      const existed=!!page;
      const beforeSame=page?fieldsMatch(page,task,user):false;
      page=await writePage(source,page,task,user);
      if(!existed)stats.created++;else if(beforeSame)stats.unchanged++;else stats.updated++;

      // A syncId is allowed to own exactly one active Notion page. Any older copy is stale.
      for(const duplicate of candidates)if(duplicate.id!==page.id)await archiveOnce(duplicate,'deduped');

      bindings.push({
        syncId:task.syncId,pageId:page.id,sig:task.sig,notionEditedAt:page.last_edited_time||'',date:task.date,
        anchorDate:k?.anchorDate||requestDate,localId:task.localId,mode:task.mode||k?.mode||''
      });
    }

    // Reconcile against the actual Notion database, not only the browser's remembered bindings.
    // This removes stale website-owned pages left behind by older/broken sync runs.
    for(const {page,syncId} of ownedForSourceDate){
      if(localIds.has(syncId))continue;
      if(await archiveOnce(page,'orphaned'))removedSyncIds.push(syncId);
    }

    // Also clean remembered bindings that may point to pages outside the current query window.
    for(const k of known){
      if(localIds.has(k.syncId))continue;
      if(k.date!==requestDate&&k.anchorDate!==requestDate)continue;
      const page=await notion('/pages/'+k.pageId,'GET',undefined,true);
      await archiveOnce(page,'orphaned');
      removedSyncIds.push(k.syncId);
    }

    return result(200,{ok:true,mode:'website-primary-v1',build:SYNC_BUILD,date:requestDate,...stats,remoteChanges:[],bindings,removedSyncIds:[...new Set(removedSyncIds)],conflicts:[]},origin);
  }catch(e){
    const msg=e instanceof Error?e.message:String(e);
    console.error('website primary sync:',msg);
    return result(400,{error:msg},origin);
  }
});
