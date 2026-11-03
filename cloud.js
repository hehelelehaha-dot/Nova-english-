// Cloud sync for nova_time (累计时长) and nova_dq (④ 今天的句子).
// Logged out = local-only; logout never clears TLOG or the dictation bar.
// Time merge is tCloudPlan / tMerge: same calendar day, keep the larger seconds.
// Dictation merge is dqCloudPlan: same day key, union of sel, union of done, larger extra.
"use strict";
const CLOUD_DEBOUNCE=45000, CLOUD_MAX_WAIT=180000, CLOUD_PULL_EVERY=180000;
const FB_VER="11.10.0";
let cloudUser=null, cloudDb=null, cloudAuth=null;
let cloudSyncing=false, cloudQueued=false, cloudDirty=false, cloudDirtyAt=0;
let cloudTimer=null, cloudLastOk=0, cloudLastTry=0, cloudErr="", cloudFails=0, cloudHard=false;

function cloudCfg(){
  const c=window.NOVA_FIREBASE;
  if(!c||typeof c!="object")return null;
  for(const k of ["apiKey","authDomain","projectId","appId"]){
    const v=c[k];
    if(typeof v!="string"||!v||v.indexOf("YOUR_")>=0)return null;
  }
  return c;
}
function cloudEsc(s){
  return (typeof esc=="function"?esc:function(x){return String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))})(s);
}
function cloudSay(t){if(typeof toast=="function")toast(t);else console.log(t)}
function cloudAuthMsg(e){
  const c=String(e&&e.code||"");
  if(c.indexOf("invalid-email")>=0)return "邮箱看起来不对";
  if(c.indexOf("invalid-credential")>=0||c.indexOf("wrong-password")>=0||c.indexOf("user-not-found")>=0)return "邮箱或密码不对";
  if(c.indexOf("email-already-in-use")>=0)return "这个邮箱已经注册过了，直接登录就好";
  if(c.indexOf("weak-password")>=0)return "密码至少 6 位";
  if(c.indexOf("too-many-requests")>=0)return "试得太多次了，等一会儿再试";
  if(c.indexOf("popup-closed")>=0||c.indexOf("cancelled-popup")>=0)return "登录窗口关掉了";
  if(c.indexOf("popup-blocked")>=0)return "登录窗口被拦住了，可以改用邮箱和密码";
  if(c.indexOf("unauthorized-domain")>=0)return "这个网址还没加到 Firebase 的授权域名里";
  if(c.indexOf("operation-not-allowed")>=0)return "Firebase 里还没打开这个登录方式";
  if(c.indexOf("network")>=0)return "没有网络，稍后再试";
  return "没成功，请再试一次";
}
function cloudFailMsg(e){
  const c=String(e&&e.code||"");
  if(c.indexOf("permission-denied")>=0)return "云端拒绝了写入。请先按 CLOUD-SYNC.md 部署 Firestore 规则";
  if(c.indexOf("unavailable")>=0||c.indexOf("network")>=0)return "没有网络，稍后再试";
  return "同步没成功，一会儿再试";
}
function cloudHardFail(e){
  const c=String(e&&e.code||"");
  return c.indexOf("permission-denied")>=0||c.indexOf("unauthenticated")>=0||c.indexOf("invalid-argument")>=0;
}
function cloudWhen(t){
  if(!t)return "";
  const s=Math.round((Date.now()-t)/1000);
  if(s<15)return "刚刚已同步";
  if(s<60)return s+" 秒前已同步";
  const m=Math.round(s/60);
  if(m<60)return m+" 分钟前已同步";
  return "上次同步是更早以前";
}
function cloudBtn(){
  if(cloudUser&&cloudSyncing)return {t:"☁ …", a:"学习时长和今天听写云同步，正在同步"};
  if(cloudUser&&cloudErr)return {t:"☁ !", a:"学习时长和今天听写云同步，"+cloudErr};
  if(cloudUser)return {t:"☁ ✓", a:"学习时长和今天听写云同步，已登录"};
  if(!cloudCfg())return {t:"☁ 登录", a:"学习时长和今天听写云同步，还没配置"};
  return {t:"☁ 登录", a:"学习时长和今天听写云同步，未登录"};
}
function cloudStatusText(){
  if(cloudSyncing)return "正在同步…";
  if(cloudErr)return cloudErr;
  if(cloudLastOk)return cloudWhen(cloudLastOk);
  return "登录后会自动同步";
}
function cloudHTML(){
  if(!cloudCfg())return `<p class="tip">云同步还没填配置，累计时长和今天的听写仍然只保存在这台设备上。按 CLOUD-SYNC.md 建好 Firebase，把配置贴进 firebase-config.js，并发布 firestore.rules。</p>`;
  if(!cloudAuth)return `<p class="tip">正在连接云同步…</p><p class="cloudmsg">${cloudEsc(cloudErr)}</p>`;
  if(!cloudUser)return `<p class="tip">登录以后，每台设备上的累计时长会合成一份。同一天取较大值，不会把已经记下的时间变少。</p>
   <p class="tip">今天的句子听写也会合成一份。同一天里，选中的句子合在一起，目标就是合起来的句数；整句对了的都会留下，超额取较大的数。另一台还选着的句子，在这边取消之后还会回来。</p>
   <p class="tip">没登录时，时长和听写都只留在这台设备上。</p>
   <button type="button" class="wide flip" data-cloud-act="google">用 Google 登录</button>
   <label class="tip">邮箱<input class="shi" type="email" data-cloud-email autocomplete="username" inputmode="email"></label>
   <label class="tip">密码<input class="shi" type="password" data-cloud-pass autocomplete="current-password"></label>
   <div class="yn"><button type="button" class="wide flip" data-cloud-act="login">登录</button><button type="button" class="wide gray" data-cloud-act="reg">注册</button></div>
   <p class="cloudmsg" data-cloud-msg></p>
   <p class="tip">加到主屏幕以后，用邮箱登录更稳。</p>`;
  const who=cloudUser.email||cloudUser.displayName||"已登录";
  return `<p class="tip">已登录：<b>${cloudEsc(who)}</b></p>
   <p class="tip">手机和 iPad 的累计时长会合成一份。同一天取较大值，不会变少。</p>
   <p class="tip">今天的句子听写也会合成一份。选中的句子合在一起，目标就是合起来的句数。整句对了的都会留下。超额取较大的数。另一台还选着的句子，在这边取消之后还会回来。</p>
   <p class="tip" data-cloud-status>${cloudEsc(cloudStatusText())}</p>
   <button type="button" class="wide flip" data-cloud-act="sync">立即同步</button>
   <button type="button" class="wide gray" data-cloud-act="out">退出登录</button>
   <p class="tip">退出后，这台设备上的时长和今天的听写还会留着。</p>`;
}
function novaCloudPaint(){
  const b=document.getElementById("csync");
  if(b){const x=cloudBtn();b.textContent=x.t;b.setAttribute("aria-label",x.a);b.title=x.a}
  document.querySelectorAll("[data-cloud]").forEach(el=>{el.innerHTML=cloudHTML()});
}
function cloudMsg(root,text){
  const n=root&&root.querySelector&&root.querySelector("[data-cloud-msg]");
  if(n)n.textContent=text;else cloudSay(text);
}
function loadScript(src){
  return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=()=>res();s.onerror=()=>rej(new Error("加载失败"));document.head.appendChild(s)});
}
async function loadFirebase(){
  if(window.firebase&&firebase.firestore&&firebase.auth)return;
  const base="https://www.gstatic.com/firebasejs/"+FB_VER+"/";
  await loadScript(base+"firebase-app-compat.js");
  await loadScript(base+"firebase-auth-compat.js");
  await loadScript(base+"firebase-firestore-compat.js");
}
function cloudSchedule(ms){
  if(cloudHard)return;
  if(cloudTimer)clearTimeout(cloudTimer);
  cloudTimer=setTimeout(()=>{cloudTimer=null;cloudSyncOnce("timer")},ms);
}
// While studying, tSave runs about once a second. Wait until a short pause, but never
// longer than CLOUD_MAX_WAIT after the first unsynced second.
function novaCloudDirty(){
  if(!cloudUser||!cloudDb)return;
  const now=Date.now();
  if(!cloudDirty)cloudDirtyAt=now;
  cloudDirty=true;
  if(cloudHard)return;
  const due=Math.min(now+CLOUD_DEBOUNCE, cloudDirtyAt+CLOUD_MAX_WAIT);
  cloudSchedule(Math.max(0, due-now));
}
async function cloudSyncOnce(reason){
  if(!cloudUser||!cloudDb||typeof tCloudPlan!="function"||typeof tMerge!="function"||typeof TLOG=="undefined")return;
  if(cloudSyncing){cloudQueued=true;return}
  cloudSyncing=true;cloudDirty=false;cloudErr="";novaCloudPaint();
  let remoteTime=null, remoteDq=null;
  try{
    const ref=cloudDb.collection("users").doc(cloudUser.uid);
    await cloudDb.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      const exists=typeof snap.exists=="function"?snap.exists():!!snap.exists;
      const data=exists&&snap.data()?snap.data():{};
      const cloud=data.nova_time&&typeof data.nova_time=="object"&&!Array.isArray(data.nova_time)?data.nova_time:{};
      const plan=tCloudPlan(TLOG, cloud);
      remoteTime=cloud;
      remoteDq=data.nova_dq&&typeof data.nova_dq=="object"&&!Array.isArray(data.nova_dq)?data.nova_dq:{};
      let dqPlan=null;
      try{
        if(typeof dqCloudPlan=="function")dqPlan=dqCloudPlan(typeof dqLog=="function"?dqLog():{}, remoteDq);
      }catch(err){dqPlan=null;console.warn("nova dq plan", err)}
      const dqPush=!!(dqPlan&&dqPlan.push&&typeof dqCloudSafe=="function"&&dqCloudSafe(remoteDq, dqPlan.map));
      if(dqPlan&&dqPlan.push&&!dqPush)console.warn("nova dq plan dropped a cloud day; skip dictation write");
      if(plan.push||dqPush){
        const payload={nova_time:plan.log, updatedAt:Date.now()};
        if(dqPush)payload.nova_dq=dqPlan.map;
        tx.set(ref, payload, {merge:true});
      }
    });
    if(remoteTime&&typeof tSave=="function"){
      const prev=tSave.quiet;tSave.quiet=true;
      try{tMerge(remoteTime)}finally{tSave.quiet=prev}
    }else if(remoteTime)tMerge(remoteTime);
    if(typeof dqApplyCloud=="function"){
      try{
        const prev=typeof dqSave=="function"?dqSave.quiet:false;
        if(typeof dqSave=="function")dqSave.quiet=true;
        try{dqApplyCloud(remoteDq||{})}finally{if(typeof dqSave=="function")dqSave.quiet=prev}
      }catch(err){console.warn("nova dq apply", err)}
    }
    cloudLastOk=Date.now();cloudLastTry=cloudLastOk;cloudFails=0;cloudHard=false;
  }catch(e){
    cloudErr=cloudFailMsg(e);cloudLastTry=Date.now();cloudFails++;cloudDirty=true;
    if(cloudHardFail(e))cloudHard=true;
    console.warn("nova cloud", reason, e&&e.code||e);
  }finally{
    cloudSyncing=false;novaCloudPaint();
    if(cloudQueued){cloudQueued=false;cloudSyncOnce("queued")}
    else if(cloudDirty&&!cloudHard&&cloudFails<3)cloudSchedule(30000);
  }
}
async function cloudAct(act, root){
  if(!cloudAuth){cloudMsg(root,"云同步还没连上");return}
  if(act=="google"){
    try{await cloudAuth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}
    catch(e){cloudMsg(root,cloudAuthMsg(e))}
    return;
  }
  if(act=="login"||act=="reg"){
    const emailEl=root.querySelector("[data-cloud-email]"), passEl=root.querySelector("[data-cloud-pass]");
    const email=emailEl?emailEl.value.trim():"", pass=passEl?passEl.value:"";
    if(!email||!pass){cloudMsg(root,"请填写邮箱和密码");return}
    if(pass.length<6){cloudMsg(root,"密码至少 6 位");return}
    try{
      if(act=="reg")await cloudAuth.createUserWithEmailAndPassword(email, pass);
      else await cloudAuth.signInWithEmailAndPassword(email, pass);
    }catch(e){cloudMsg(root,cloudAuthMsg(e))}
    return;
  }
  if(act=="out"){
    try{await cloudAuth.signOut();cloudSay("已退出。这台设备上的时长和今天的听写还在")}
    catch(e){cloudMsg(root,cloudAuthMsg(e))}
    return;
  }
  if(act=="sync"){cloudHard=false;cloudFails=0;cloudSyncOnce("manual")}
}
function openCloud(){
  if(document.querySelector(".cloudsh"))return;
  const o=document.createElement("div");o.className="ov";
  o.innerHTML=`<div class="sh cloudsh"><div class="sht">☁ 云同步</div><div class="cloudbox" data-cloud></div><button type="button" class="shb cancel" data-x>关闭</button></div>`;
  o.addEventListener("click",e=>{if(e.target==o||e.target.closest("[data-x]"))o.remove()});
  document.body.appendChild(o);novaCloudPaint();
}
document.addEventListener("click",e=>{
  const act=e.target.closest&&e.target.closest("[data-cloud-act]");
  if(act){e.preventDefault();cloudAct(act.dataset.cloudAct, act.closest("[data-cloud]")||document)}
  if(e.target.closest&&e.target.closest("#csync")){e.preventDefault();openCloud()}
});
document.addEventListener("keydown",e=>{
  if(e.key!="Enter"||!e.target.closest||!e.target.closest("[data-cloud-pass],[data-cloud-email]"))return;
  e.preventDefault();
  const root=e.target.closest("[data-cloud]")||document;
  cloudAct("login", root);
});
document.addEventListener("visibilitychange",()=>{
  if(!cloudUser)return;
  if(document.hidden){if(cloudDirty)cloudSyncOnce("hide")}
  else if(Date.now()-cloudLastOk>60000){cloudHard=false;cloudSyncOnce("show")}
});
setInterval(()=>{
  if(!cloudUser||document.hidden||cloudHard)return;
  if(Date.now()-cloudLastTry<CLOUD_PULL_EVERY)return;
  cloudSyncOnce("interval");
},60000);
window.novaCloudPaint=novaCloudPaint;
window.novaCloudDirty=novaCloudDirty;

(async function bootCloud(){
  novaCloudPaint();
  const cfg=cloudCfg();
  if(!cfg)return;
  try{
    await loadFirebase();
    if(!firebase.apps.length)firebase.initializeApp(cfg);
    cloudAuth=firebase.auth();
    cloudDb=firebase.firestore();
    try{await cloudAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)}catch(e){}
    cloudAuth.onAuthStateChanged(u=>{
      cloudUser=u;cloudErr="";novaCloudPaint();
      if(u)cloudSyncOnce("auth");
    });
  }catch(e){
    cloudErr="云同步暂时连不上";
    novaCloudPaint();
    console.warn("nova cloud boot", e);
  }
})();
