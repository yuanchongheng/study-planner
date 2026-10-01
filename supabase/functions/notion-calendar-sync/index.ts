/**
 * 双线备考 ⇄ Notion Calendar (TWO WAY V2)
 * Supabase Edge Function: notion-calendar-sync
 *
 * Reuses the existing 7 Notion properties:
 * 任务名称(title), 学习时间(date), 类别(select), 目标(rich_text), 完成(checkbox),
 * 来源ID(rich_text), 来源日期(rich_text)
 *
 * Required secrets:
 * NOTION_TOKEN, NOTION_DATABASE_ID, NOTION_ALLOWED_USER_ID, NOTION_SITE_ORIGIN
 * Supabase supplies SUPABASE_URL and SUPABASE_ANON_KEY.
 */
const VERSION = '2025-09-03';
const TZ = 'Asia/Shanghai';
const uuidRe = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const clockRe = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const categories = { civil:'考公', phd:'考博', apply:'论文/申请' };
const reverseCategories = { '考公':'civil', '考博':'phd', '论文/申请':'apply' };
const secret = name => (Deno.env.get(name)||'').trim();

function result(status,value,origin){
  return new Response(JSON.stringify(value),{status,headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Access-Control-Allow-Origin':origin,
    'Vary':'Origin',
    'Access-Control-Allow-Headers':'authorization, apikey, content-type',
    'Access-Control-Allow-Methods':'POST, OPTIONS'
  }});
}
function validDay(s){if(!dateRe.test(String(s||'')))return false;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s;}
function nextDay(day){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
function isoTime(date,time){return `${date}T${time}:00+08:00`;}
function plain(value){return value?.[0]?.plain_text??value?.[0]?.text?.content??'';}
function sameTime(a,b){return !!a&&!!b&&Date.parse(a)===Date.parse(b);}
function textValue(s){return s?[{text:{content:String(s)}}]:[];}
async function pause(ms=350){await new Promise(done=>setTimeout(done,ms));}
function signature(t){return JSON.stringify([t.date,t.start,t.endDate,t.end,t.title,t.description,t.cat,!!t.done]);}

function localParts(iso){
  const d=new Date(iso);if(Number.isNaN(d.getTime()))return null;
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d);
  const o={};for(const p of parts)if(p.type!=='literal')o[p.type]=p.value;
  return {date:`${o.year}-${o.month}-${o.day}`,time:`${o.hour}:${o.minute}`};
}
function taskDuration(t){
  const a=Date.parse(isoTime(t.date,t.start)),b=Date.parse(isoTime(t.endDate,t.end));
  return Number.isFinite(a)&&Number.isFinite(b)?Math.round((b-a)/60000):NaN;
}

async function notion(path,method='GET',payload,allow404=false){
  const token=secret('NOTION_TOKEN');if(!token)throw Error('未配置 NOTION_TOKEN');
  for(let n=0;n<3;n++){
    const res=await fetch('https://api.notion.com/v1'+path,{method,headers:{'Authorization':'Bearer '+token,'Notion-Version':VERSION,'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});
    let data;try{data=await res.json()}catch{data={};}
    if(res.status===404&&allow404)return null;
    if(res.status===429&&n<2){await pause(Math.min(Number(res.headers.get('Retry-After')||'1')*1000,6000));continue;}
    await pause();
    if(!res.ok)throw Error(`Notion ${res.status}：${String(data.message||data.code||'请求失败').slice(0,220)}`);
    return data;
  }
  throw Error('Notion 限流，请稍后重试');
}

async function authUser(jwt,api,url){
  const response=await fetch(url+'/auth/v1/user',{headers:{'Authorization':'Bearer '+jwt,'apikey':api}});
  if(!response.ok)throw Error('登录过期或身份验证失败，请在网页重新登录');
  const body=await response.json();if(!body?.id||!uuidRe.test(body.id))throw Error('账号无效');return body.id;
}
async function confirmedRevision(jwt,api,url,id){
  const endpoint=url+'/rest/v1/study_workspace?select=revision&user_id=eq.'+encodeURIComponent(id);
  const response=await fetch(endpoint,{headers:{'Authorization':'Bearer '+jwt,'apikey':api,'Accept':'application/json'}});
  if(!response.ok)throw Error('无法读取当前学习记录，请确认原数据库已经配置成功');
  const rows=await response.json();if(!Array.isArray(rows)||!rows.length)throw Error('尚无云端学习记录，请先点击网页「立即同步」');
  return Number(rows[0].revision);
}

async function dataSource(){
  const db=secret('NOTION_DATABASE_ID').replaceAll('-','');
  if(!uuidRe.test(db))throw Error('NOTION_DATABASE_ID 配置有误，应为数据库ID');
  const database=await notion('/databases/'+db);
  const sources=database.data_sources||[];
  if(sources.length!==1)throw Error('Notion 数据库应只有一个数据源。');
  const source=sources[0].id;
  const schema=await notion('/data_sources/'+source);
  const fields={'任务名称':'title','学习时间':'date','类别':'select','目标':'rich_text','完成':'checkbox','来源ID':'rich_text','来源日期':'rich_text'};
  for(const [name,type] of Object.entries(fields))if(schema.properties?.[name]?.type!==type)throw Error(`Notion 属性「${name}」缺失或类型错误；需要：${type}`);
  return source;
}

function cleanTasks(raw,requestDate){
  if(!Array.isArray(raw)||raw.length>45)throw Error('单日任务最多同步45项');
  const ids=new Set();
  return raw.map(t=>{
    if(!t||typeof t.id!=='string'||t.id.length>160)throw Error('任务ID无效');
    const syncId=String(t.syncId||`${requestDate}:${t.id}`);
    if(syncId.length>240||!/^[A-Za-z0-9:_-]+$/.test(syncId)||ids.has(syncId))throw Error('同步ID重复或无效');ids.add(syncId);
    const title=String(t.title||'').trim(),description=String(t.description||'');
    if(!title||title.length>90||description.length>600)throw Error('任务标题或目标文字不合规');
    if(!Object.hasOwn(categories,String(t.cat)))throw Error('任务分类无效');
    if(!clockRe.test(t.start)||!clockRe.test(t.end))throw Error('任务时间格式无效');
    const endDate=validDay(t.endDate)?t.endDate:(t.end<t.start?nextDay(requestDate):requestDate);
    const item={syncId,id:t.id,localId:t.id,mode:String(t.mode||''),date:requestDate,start:t.start,end:t.end,endDate,title,description,cat:t.cat,done:t.done===true};
    const mins=taskDuration(item);if(!Number.isFinite(mins)||mins<=0||mins>1440)throw Error('任务时长必须大于0且不超过24小时');
    item.sig=signature(item);return item;
  });
}
function cleanKnown(raw){
  if(!Array.isArray(raw))return [];
  return raw.slice(0,120).map(x=>({
    syncId:String(x?.syncId||''),pageId:String(x?.pageId||''),sig:String(x?.sig||''),notionEditedAt:String(x?.notionEditedAt||''),date:String(x?.date||''),anchorDate:String(x?.anchorDate||''),localId:String(x?.localId||''),mode:String(x?.mode||'')
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
function fieldsMatch(page,t,userId){
  const p=page.properties||{},f=pageFields(t,userId);
  return plain(p['任务名称']?.title)===t.title && sameTime(p['学习时间']?.date?.start,f['学习时间'].date.start) && sameTime(p['学习时间']?.date?.end,f['学习时间'].date.end) && p['类别']?.select?.name===categories[t.cat] && plain(p['目标']?.rich_text)===t.description && p['完成']?.checkbox===!!t.done && plain(p['来源ID']?.rich_text)===`${userId}:${t.syncId}` && plain(p['来源日期']?.rich_text)===t.date;
}
async function pagesForDay(source,date){
  const all=[],seen=new Set();let cursor;
  for(let i=0;i<5;i++){
    const query={page_size:100,filter:{or:[
      {property:'来源日期',rich_text:{equals:date}},
      {and:[{property:'学习时间',date:{on_or_after:date}},{property:'学习时间',date:{before:nextDay(date)}}]}
    ]}};
    if(cursor)query.start_cursor=cursor;
    const batch=await notion('/data_sources/'+source+'/query','POST',query);
    for(const p of batch.results||[])if(!seen.has(p.id)){seen.add(p.id);all.push(p);}
    if(!batch.has_more)return all;cursor=batch.next_cursor;if(!cursor)break;
  }
  throw Error('当天 Notion 记录过多，请先整理数据库再同步');
}
function normalizedPage(page,userId,knownByPage){
  const known=knownByPage.get(page.id),props=page.properties||{},dateProp=props['学习时间']?.date;
  if(page.in_trash||page.archived){return known?{syncId:known.syncId,pageId:page.id,deleted:true,lastEditedTime:page.last_edited_time||known.notionEditedAt||'',known}:null;}
  if(!dateProp?.start)return null;
  const start=localParts(dateProp.start);if(!start)return null;
  let end=dateProp.end?localParts(dateProp.end):null;
  if(!end){const d=new Date(dateProp.start);d.setMinutes(d.getMinutes()+30);end=localParts(d.toISOString());}
  if(!end)return null;
  const sourceId=plain(props['来源ID']?.rich_text),prefix=userId+':';
  if(sourceId&& !sourceId.startsWith(prefix))return null;
  let syncId=known?.syncId||(sourceId.startsWith(prefix)?sourceId.slice(prefix.length):`notion_${page.id.replaceAll('-','')}`);
  if(!/^[A-Za-z0-9:_-]+$/.test(syncId))syncId=`notion_${page.id.replaceAll('-','')}`;
  const cat=reverseCategories[props['类别']?.select?.name]||'civil';
  const t={syncId,date:start.date,start:start.time,endDate:end.date,end:end.time,title:(plain(props['任务名称']?.title)||'未命名任务').slice(0,90),description:plain(props['目标']?.rich_text).slice(0,600),cat,done:props['完成']?.checkbox===true};
  const mins=taskDuration(t);if(!Number.isFinite(mins)||mins<=0||mins>1440)return null;
  t.sig=signature(t);
  return {...t,pageId:page.id,deleted:false,lastEditedTime:page.last_edited_time||'',known,needsClaim:!sourceId||sourceId!==prefix+syncId||plain(props['来源日期']?.rich_text)!==t.date};
}
async function writePage(source,page,task,userId){
  const body={properties:pageFields(task,userId)};if(page?.in_trash||page?.archived)body.in_trash=false;
  if(!page||page.missing)return await notion('/pages','POST',{parent:{type:'data_source_id',data_source_id:source},properties:body.properties});
  if(fieldsMatch(page,task,userId)&&!page.in_trash&&!page.archived)return page;
  return await notion('/pages/'+page.id,'PATCH',body);
}
async function trashPage(page){if(!page||page.in_trash||page.archived)return page;return await notion('/pages/'+page.id,'PATCH',{in_trash:true});}

Deno.serve(async req=>{
  const origin=secret('NOTION_SITE_ORIGIN').replace(/\/$/,'');
  if(!origin||!origin.startsWith('https://'))return result(500,{error:'请设置 NOTION_SITE_ORIGIN 为网站 Origin，例如 https://yuanchongheng.github.io'},origin||'*');
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'}});
  if(req.headers.get('origin')!==origin)return result(403,{error:'访问来源不符：请核对 NOTION_SITE_ORIGIN'},origin);
  if(req.method!=='POST')return result(405,{error:'只允许 POST'},origin);
  try{
    for(const k of ['NOTION_TOKEN','NOTION_DATABASE_ID','NOTION_ALLOWED_USER_ID'])if(!secret(k))throw Error(`服务端未设置 ${k}`);
    const jwt=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');if(!jwt)return result(401,{error:'请先在备考网页登录 Supabase'},origin);
    const url=secret('SUPABASE_URL').replace(/\/$/,''),anon=secret('SUPABASE_ANON_KEY');if(!url||!anon)throw Error('缺少 Supabase 默认环境变量 SUPABASE_URL / SUPABASE_ANON_KEY');
    const user=await authUser(jwt,anon,url);if(user!==secret('NOTION_ALLOWED_USER_ID'))return result(403,{error:'当前 Supabase 用户未被授权使用此 Notion 日历'},origin);
    const incoming=await req.json();
    if(incoming?.action==='capabilities')return result(200,{ok:true,mode:'two-way-v2',apiVersion:VERSION,features:['pull','push','cross-day','move-date','delete','conflict']},origin);
    if(!validDay(incoming?.date))return result(400,{error:'日期格式不正确'},origin);
    const revision=await confirmedRevision(jwt,anon,url,user);if(!Number.isSafeInteger(incoming.revision)||revision!==incoming.revision)return result(409,{error:'云端版本已变化。请先点击网页「立即同步」，再进行 Notion 双向同步。'},origin);
    const policy=['ask','local','notion'].includes(incoming.policy)?incoming.policy:'ask';
    const localTasks=cleanTasks(incoming.tasks,incoming.date),known=cleanKnown(incoming.known),knownMap=new Map(known.map(x=>[x.syncId,x])),knownByPage=new Map(known.map(x=>[x.pageId,x]));
    const source=await dataSource();
    const pages=await pagesForDay(source,incoming.date),pageById=new Map(pages.map(p=>[p.id,p]));
    for(const k of known){if(pageById.has(k.pageId))continue;const p=await notion('/pages/'+k.pageId,'GET',undefined,true);if(p)pageById.set(p.id,p);else pageById.set(k.pageId,{id:k.pageId,in_trash:true,archived:true,missing:true,last_edited_time:k.notionEditedAt||'',properties:{}});}
    const remoteMap=new Map();
    for(let page of pageById.values()){
      let r=normalizedPage(page,user,knownByPage);if(!r)continue;
      if(r.needsClaim&&!r.deleted){page=await notion('/pages/'+page.id,'PATCH',{properties:{'来源ID':{rich_text:textValue(`${user}:${r.syncId}`)},'来源日期':{rich_text:textValue(r.date)}}});r=normalizedPage(page,user,knownByPage);if(!r)continue;}
      remoteMap.set(r.syncId,{...r,page});
    }
    const localMap=new Map(localTasks.map(t=>[t.syncId,t]));
    const ids=new Set([...localMap.keys(),...remoteMap.keys(),...knownMap.keys()]);
    const stats={created:0,updated:0,archived:0,unchanged:0,pulled:0};
    const conflicts=[],remoteChanges=[],bindings=[],removedSyncIds=[];
    const conflict=(syncId,local,remote,knownRow,reason)=>conflicts.push({syncId,title:local?.title||remote?.title||'未命名任务',reason,local:local||null,notion:remote&&!remote.deleted?remote:null,known:knownRow||null});
    async function bind(syncId,page,task,local,knownRow){bindings.push({syncId,pageId:page.id,sig:task.sig,notionEditedAt:page.last_edited_time||'',date:task.date,anchorDate:knownRow?.anchorDate||incoming.date,localId:local?.localId||knownRow?.localId||'',mode:local?.mode||knownRow?.mode||''});}
    for(const syncId of ids){
      const local=localMap.get(syncId),remote=remoteMap.get(syncId),k=knownMap.get(syncId);
      if(local&&remote&&!remote.deleted){
        if(local.sig===remote.sig){stats.unchanged++;await bind(syncId,remote.page,local,local,k);continue;}
        const localChanged=k?.sig?local.sig!==k.sig:false,remoteChanged=k?.sig?remote.sig!==k.sig:true;
        let choice='';
        if(!k||localChanged&&remoteChanged)choice=policy==='ask'?'conflict':policy;
        else if(remoteChanged&&!localChanged)choice='notion';
        else if(localChanged&&!remoteChanged)choice='local';
        else choice=policy==='ask'?'conflict':policy;
        if(choice==='conflict'){conflict(syncId,local,remote,k,!k?'首次双向同步时两边内容不一致':'网页与 Notion 都在上次同步后修改');continue;}
        if(choice==='notion'){remoteChanges.push({syncId,deleted:false,task:{date:remote.date,start:remote.start,end:remote.end,endDate:remote.endDate,title:remote.title,description:remote.description,cat:remote.cat,done:remote.done},localId:local.localId,mode:local.mode});stats.pulled++;await bind(syncId,remote.page,remote,local,k);}
        else{const page=await writePage(source,remote.page,local,user);stats.updated++;await bind(syncId,page,local,local,k);}
        continue;
      }
      if(local&&remote?.deleted){
        const localChanged=k?.sig?local.sig!==k.sig:true;
        let choice=localChanged?(policy==='ask'?'conflict':policy):'notion';
        if(choice==='conflict'){conflict(syncId,local,remote,k,'Notion 已删除，而网页也有新修改');continue;}
        if(choice==='notion'){remoteChanges.push({syncId,deleted:true,localId:local.localId,mode:local.mode});removedSyncIds.push(syncId);stats.pulled++;}
        else{const page=await writePage(source,remote.page,local,user);stats.updated++;await bind(syncId,page,local,local,k);}
        continue;
      }
      if(local&&!remote){
        const page=await writePage(source,null,local,user);stats.created++;await bind(syncId,page,local,local,k);continue;
      }
      if(!local&&remote&&!remote.deleted){
        if(k&&k.date===incoming.date){
          const remoteChanged=k.sig?remote.sig!==k.sig:true;
          let choice=remoteChanged?(policy==='ask'?'conflict':policy):'local';
          if(choice==='conflict'){conflict(syncId,null,remote,k,'网页已删除，而 Notion 也有新修改');continue;}
          if(choice==='local'){await trashPage(remote.page);stats.archived++;removedSyncIds.push(syncId);}
          else{remoteChanges.push({syncId,deleted:false,task:{date:remote.date,start:remote.start,end:remote.end,endDate:remote.endDate,title:remote.title,description:remote.description,cat:remote.cat,done:remote.done},localId:k.localId||'',mode:k.mode||''});stats.pulled++;await bind(syncId,remote.page,remote,null,k);}
        }else if(k&&k.date!==incoming.date){stats.unchanged++;await bind(syncId,remote.page,remote,null,k);}
        else{remoteChanges.push({syncId,deleted:false,task:{date:remote.date,start:remote.start,end:remote.end,endDate:remote.endDate,title:remote.title,description:remote.description,cat:remote.cat,done:remote.done},localId:'',mode:''});stats.pulled++;await bind(syncId,remote.page,remote,null,k);}
        continue;
      }
      if(!local&&remote?.deleted){removedSyncIds.push(syncId);continue;}
      if(!local&&!remote&&k){removedSyncIds.push(syncId);}
    }
    if(conflicts.length&&policy==='ask')return result(200,{ok:false,mode:'two-way-v2',date:incoming.date,requiresPolicy:true,conflicts,stats},origin);
    return result(200,{ok:true,mode:'two-way-v2',date:incoming.date,...stats,remoteChanges,bindings,removedSyncIds,conflicts:[]},origin);
  }catch(e){const msg=e instanceof Error?e.message:String(e);console.error('notion two-way sync:',msg);return result(400,{error:msg},origin);}
});
