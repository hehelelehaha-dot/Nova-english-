"use strict";
// ---------- storage / crypto ----------
let META={enc:false},KEY=null;const blobCache={};
const b64=u=>btoa(String.fromCharCode(...new Uint8Array(u)));const ub64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function deriveKey(pw){const base=await crypto.subtle.importKey("raw",new TextEncoder().encode(pw),"PBKDF2",false,["deriveKey"]);
 return crypto.subtle.deriveKey({name:"PBKDF2",salt:ub64(META.salt),iterations:META.iter,hash:"SHA-256"},base,{name:"AES-GCM",length:256},true,["decrypt"])}
async function dec(buf){const u=new Uint8Array(buf);return crypto.subtle.decrypt({name:"AES-GCM",iv:u.slice(0,12)},KEY,u.slice(12))}
async function getBuf(p){const r=await fetch(META.enc?p+".enc":p);if(!r.ok)throw new Error("加载失败 "+p);const b=await r.arrayBuffer();return META.enc?dec(b):b}
async function getJSON(p){return JSON.parse(new TextDecoder().decode(await getBuf("content/"+p)))}
async function audioURL(p){if(!META.enc)return "content/"+p;if(!blobCache[p])blobCache[p]=URL.createObjectURL(new Blob([await getBuf("content/"+p)],{type:"audio/mpeg"}));return blobCache[p]}
async function unlock(){
 META=await (await fetch("meta.json")).json();if(!META.enc)return true;
 const saved=localStorage.getItem("nova_key");
 if(saved){try{KEY=await crypto.subtle.importKey("raw",ub64(saved),"AES-GCM",false,["decrypt"]);await getBuf("content/check");return true}catch(e){localStorage.removeItem("nova_key")}}
 return false}
function lockScreen(){setHeader("Nova 英语",false);V.innerHTML=`<div class="lock"><h2>🔒 请输入密码</h2><div>输入一次后本设备会记住</div><input id="pw" type="password" autocomplete="current-password"><button class="wide flip" id="go">解锁</button><div class="err" id="er"></div></div>`;
 const go=async()=>{const pw=document.getElementById("pw").value;document.getElementById("er").textContent="正在验证…";
  try{KEY=await deriveKey(pw);await getBuf("content/check");localStorage.setItem("nova_key",b64(await crypto.subtle.exportKey("raw",KEY)));route()}catch(e){KEY=null;document.getElementById("er").textContent="密码不对，请再试一次"}};
 document.getElementById("go").onclick=go;document.getElementById("pw").onkeydown=e=>{if(e.key=="Enter")go()}}
// ---------- imported audio (IndexedDB) ----------
function idb(){return new Promise((res,rej)=>{const r=indexedDB.open("nova_import",1);r.onupgradeneeded=()=>r.result.createObjectStore("files",{keyPath:"id"});r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function idbAll(){const db=await idb();return new Promise(r=>{const q=db.transaction("files").objectStore("files").getAll();q.onsuccess=()=>r(q.result)})}
async function idbPut(o){const db=await idb();return new Promise(r=>{const t=db.transaction("files","readwrite");t.objectStore("files").put(o);t.oncomplete=r})}
async function idbDel(id){const db=await idb();return new Promise(r=>{const t=db.transaction("files","readwrite");t.objectStore("files").delete(id);t.oncomplete=r})}
// ---------- audio ----------
const A=new Audio();A.preload="auto";let RUN=0;let LASTBTN=null;
const setPlaying=(b,on)=>{document.querySelectorAll(".p.playing,.big.playing").forEach(x=>{if(x!=b||!on)x.classList.remove("playing")});if(b&&on)b.classList.add("playing")};
document.addEventListener("click",e=>{const b=e.target.closest(".p,.big");if(b&&!b.id)LASTBTN=b},true);
A.addEventListener("playing",()=>setPlaying(LASTBTN,true));for(const ev of["pause","ended","emptied"])A.addEventListener(ev,()=>setPlaying(null,false));
function stopAll(){RUN++;try{A.pause()}catch(e){}if(window.speechSynthesis)speechSynthesis.cancel()}
async function playP(p,rate=1,fbText){const url=await audioURL(p);return new Promise(r=>{A.onended=()=>r(true);A.onerror=()=>speak(fbText,rate).then(r);A.src=url;A.playbackRate=rate;A.defaultPlaybackRate=rate;
 const q=A.play();if(q)q.then(()=>{A.playbackRate=rate}).catch(()=>speak(fbText,rate).then(r))})}
function speak(t,rate){return new Promise(r=>{if(!t||!window.speechSynthesis)return r();const u=new SpeechSynthesisUtterance(t);u.lang="en-US";u.rate=rate*.9;u.onend=r;u.onerror=r;speechSynthesis.cancel();speechSynthesis.speak(u)})}
function wirePP(au){const b=document.getElementById("pp");b.onclick=()=>au.paused?au.play().catch(()=>{}):au.pause();
 au.addEventListener("play",()=>b.classList.add("playing"));for(const e of["pause","ended"])au.addEventListener(e,()=>b.classList.remove("playing"))}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// ---------- ui helpers ----------
const V=document.getElementById("view");const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function setHeader(t,back){document.getElementById("title").textContent=t;document.getElementById("back").classList.toggle("hidden",!back)}
let CAT=null;
async function route(){stopAll();document.querySelectorAll(".ov").forEach(o=>o.remove());document.getElementById("hdr-r").innerHTML="";window.scrollTo(0,0);
 if(META.enc&&!KEY){if(!(await unlock()))return lockScreen()}
 if(!CAT)CAT=await getJSON("catalog.json");
 const h=location.hash.slice(1).split("/");
 try{if(h[1]=="c")return showCat(h[2]);if(h[1]=="i")return showItem(h[2]);if(h[1]=="m")return showMine(h[2]);if(h[1]=="g")return h[2]?showGame(h[2],h[3]||"spell"):showGames();if(h[1]=="wf")return h[2]?showWF(h[2]):showWFs();if(h[1]=="s")return showSettings();if(h[1]=="exp")return showExport();if(h[1]=="imp")return h[2]?showImportLink(h.slice(2).join("/")):showImport();showHome()}catch(e){V.innerHTML=`<div class="done">出错了：${esc(e.message)}</div>`;console.error(e)}}
window.addEventListener("hashchange",route);
// ---------- on-device organizing (localStorage) ----------
// Storage model (v2, sync-ready): FIELDS = { key: [value, ts] }, value null = tombstone.
// keys: h:<item> hidden(1) · r:<item> rename · m:<item> move-to-cat · c:<cat> user category name · d:zoom / d:bold display.
// The ORG object below is a derived view; saveOrg() diffs it against FIELDS and stamps changed keys (last-write-wins per key).
const ORGK="nova_org",FK="nova_fields";
function loadFields(){let F=JSON.parse(localStorage.getItem(FK)||"null");
 if(!F){F={};const o=JSON.parse(localStorage.getItem(ORGK)||"{}");const T=1;  // migrate v1 -> v2 with an "old" timestamp
  for(const k in o.hidden||{})F["h:"+k]=[1,T];for(const k in o.rename||{})F["r:"+k]=[o.rename[k],T];for(const k in o.move||{})F["m:"+k]=[o.move[k],T];
  for(const c of o.cats||[])F["c:"+c.id]=[c.name,T];
  const z=localStorage.getItem("nova_zoom");if(z)F["d:zoom"]=[+z,T];const b=localStorage.getItem("nova_bold");if(b)F["d:bold"]=[b=="1"?1:0,T];
  localStorage.setItem(FK,JSON.stringify(F))}return F}
let FIELDS=loadFields();
function orgFrom(F){const o={hidden:{},rename:{},move:{},cats:[]};for(const k in F){const [v]=F[k];if(v==null)continue;const t=k[0],id=k.slice(2);
  if(t=="h"&&v)o.hidden[id]=1;else if(t=="r")o.rename[id]=v;else if(t=="m")o.move[id]=v;else if(t=="c")o.cats.push({id,name:v})}
 o.cats.sort((a,b)=>a.id<b.id?-1:1);return o}
function flat(o){const f={};for(const k in o.hidden)if(o.hidden[k])f["h:"+k]=1;for(const k in o.rename)f["r:"+k]=o.rename[k];for(const k in o.move)f["m:"+k]=o.move[k];for(const c of o.cats)f["c:"+c.id]=c.name;return f}
let ORG=orgFrom(FIELDS);
const NOW=()=>Date.now();
function stamp(k,v){const cur=FIELDS[k];if(cur&&cur[0]===v)return;if(!cur&&v==null)return;FIELDS[k]=[v,Math.max(NOW(),cur?cur[1]+1:0)]}
function saveOrg(){const f=flat(ORG);for(const k in FIELDS)if(k[1]==":"&&"hrmc".includes(k[0])&&!(k in f))stamp(k,null);for(const k in f)stamp(k,f[k]);
 localStorage.setItem(FK,JSON.stringify(FIELDS));localStorage.setItem(ORGK,JSON.stringify(ORG))}
function saveDisplay(){stamp("d:zoom",curZoom());stamp("d:bold",document.documentElement.classList.contains("bold")?1:0);localStorage.setItem(FK,JSON.stringify(FIELDS))}
// LWW merge; returns summary of what changed locally
function mergeFields(R){const sum={h:0,r:0,m:0,c:0,d:0,g:0};for(const k in R){const r=R[k];if(!Array.isArray(r)||typeof r[1]!="number")continue;const l=FIELDS[k];
  if(!l||r[1]>l[1]){if(!l||JSON.stringify(l[0])!==JSON.stringify(r[0]))sum[k[0]]=(sum[k[0]]||0)+1;FIELDS[k]=[r[0],r[1]]}}
 localStorage.setItem(FK,JSON.stringify(FIELDS));ORG=orgFrom(FIELDS);localStorage.setItem(ORGK,JSON.stringify(ORG));
 if(sum.d){const z=FIELDS["d:zoom"],b=FIELDS["d:bold"];if(z&&z[0])setZoom(z[0],true);if(b){document.documentElement.classList.toggle("bold",!!b[0]);localStorage.setItem("nova_bold",b[0]?"1":"0")}}
 return sum}
// ---------- sync code (compressed, url-safe) ----------
const b64u=u=>btoa(String.fromCharCode(...u)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const ub64u=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
async function zip(str,inv){const cs=inv?new DecompressionStream("deflate-raw"):new CompressionStream("deflate-raw");const b=new Blob([str]).stream().pipeThrough(cs);return new Uint8Array(await new Response(b).arrayBuffer())}
async function exportCode(withDisplay){const F={};for(const k in FIELDS)if(withDisplay||k[0]!="d")F[k]=FIELDS[k];
 let body;try{body="Z"+b64u(await zip(JSON.stringify(F)))}catch(e){body="J"+b64u(new TextEncoder().encode(JSON.stringify(F)))}return "N1"+body}
async function decodeCode(raw){let s=String(raw||"").trim();const m=s.match(/N1[ZJ][A-Za-z0-9_-]+/);if(!m)throw new Error("看不懂这个同步码");s=m[0];
 const u=ub64u(s.slice(3));const txt=s[2]=="Z"?new TextDecoder().decode(await zip(u,true)):new TextDecoder().decode(u);return JSON.parse(txt)}
const exportURL=code=>location.origin+location.pathname.replace(/index\.html$/,"")+"#/imp/"+code;
function sumText(s){const p=[];if(s.r)p.push(`改名 ${s.r}`);if(s.m)p.push(`移动 ${s.m}`);if(s.h)p.push(`删除/恢复 ${s.h}`);if(s.c)p.push(`分类 ${s.c}`);if(s.d)p.push("显示设置");if(s.g)p.push(`游戏成绩 ${s.g}`);return p.length?p.join("，"):"没有新的变化"}
function previewMerge(R){const save=JSON.stringify(FIELDS);const sum={h:0,r:0,m:0,c:0,d:0,g:0};for(const k in R){const r=R[k],l=FIELDS[k];if(Array.isArray(r)&&(!l||r[1]>l[1])&&(!l||JSON.stringify(l[0])!==JSON.stringify(r[0])))sum[k[0]]++}return sum}
const isStandalone=()=>navigator.standalone===true||matchMedia("(display-mode: standalone)").matches;
const isIOS=()=>/iP(ad|hone|od)/.test(navigator.userAgent)||(navigator.platform=="MacIntel"&&navigator.maxTouchPoints>1);
async function copyText(t){try{await navigator.clipboard.writeText(t);toast("已复制 ✓")}catch(e){const a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("已复制 ✓")}catch(_){toast("请长按文字手动复制")}a.remove()}}
function qrSVG(text){const q=qrcode(0,"M");q.addData(text);q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true})}
async function showExport(){setHeader("导出整理",true);const wd=localStorage.getItem("nova_exp_d")!="0";
 V.innerHTML=`<div class="card" style="max-width:560px"><label class="tg"><input type="checkbox" id="wd" ${wd?"checked":""}> 同时带上显示设置（字体大小、加粗）</label>
 <div id="qr" class="qr"></div><div class="tip" style="text-align:center">用另一台设备的相机扫这个二维码，或复制下面的同步码</div>
 <textarea id="code" class="code" readonly></textarea><button class="wide flip" id="cp">📋 复制同步码</button><button class="wide gray" id="cpl">🔗 复制链接</button>
 <div class="tip" style="margin-top:10px">同步码只包含你的整理（改名、移动、删除、分类），不包含音频。导入时按“最新的修改为准”合并，不会覆盖另一台设备上更新的修改。</div></div>`;
 const draw=async()=>{const w=document.getElementById("wd").checked;localStorage.setItem("nova_exp_d",w?"1":"0");const c=await exportCode(w);const url=exportURL(c);
  document.getElementById("code").value=c;document.getElementById("qr").innerHTML=qrSVG(url);document.getElementById("cp").onclick=()=>copyText(c);document.getElementById("cpl").onclick=()=>copyText(url)};
 document.getElementById("wd").onchange=draw;draw()}
async function doImport(code,{fromLink}={}){let R;try{R=await decodeCode(code)}catch(e){toast("同步码不正确，请检查是否复制完整");return false}
 const pv=previewMerge(R);const n=Object.values(pv).reduce((a,b)=>a+b,0);
 if(!n){toast("已经是最新的，没有需要导入的变化");return true}
 if(!(await sheet(`导入整理？\n将应用：${sumText(pv)}\n（以较新的修改为准）`,[{t:"导入",cls:"blue"}]).then(i=>i==0)))return false;
 const s=mergeFields(R);toast("已导入 ✓ "+sumText(s),4500);return true}
function showImportLink(code){
 if(isIOS()&&!isStandalone()){setHeader("同步码",false);
  V.innerHTML=`<div class="card" style="max-width:560px"><h2 style="margin-top:0">📲 还差一步</h2>
  <p style="line-height:1.6">你现在是在 <b>Safari</b> 里打开的。Safari 和主屏幕上的「Nova英语」App 存的数据是分开的，所以请：</p>
  <ol style="line-height:1.8;font-size:17px"><li>点下面的 <b>复制同步码</b></li><li>回到主屏幕，打开 <b>Nova英语</b> App</li><li>⚙︎ 设置 › 同步 › <b>导入</b>，粘贴，点「导入」</li></ol>
  <button class="wide flip" id="cp" style="min-height:64px;font-size:20px">📋 复制同步码</button><textarea class="code" readonly>${esc(code)}</textarea>
  <button class="wide gray" id="here">直接导入到 Safari 里的这个版本</button></div>`;
  document.getElementById("cp").onclick=()=>copyText(code);document.getElementById("here").onclick=async()=>{if(await doImport(code))location.replace("#/")};return}
 setHeader("导入整理",true);V.innerHTML=`<div class="done">正在读取同步码…</div>`;doImport(code,{fromLink:true}).then(()=>{history.replaceState(null,"","#/");route()})}
function showImport(){setHeader("导入整理",true);
 V.innerHTML=`<div class="card" style="max-width:560px"><p style="margin-top:0;line-height:1.6">把另一台设备「导出整理」里的同步码（或链接）粘贴到下面：</p>
 <textarea id="code" class="code" placeholder="N1Z…"></textarea><button class="wide gray" id="paste">📥 从剪贴板粘贴</button><button class="wide flip" id="go">导入</button></div>`;
 const ta=document.getElementById("code");document.getElementById("paste").onclick=async()=>{try{ta.value=await navigator.clipboard.readText()}catch(e){toast("请长按输入框，选「粘贴」")}};
 document.getElementById("go").onclick=async()=>{if(await doImport(ta.value))history.back()}}
const allCats=()=>CAT.categories.map(c=>({id:c.id,name:c.name,icon:c.icon,desc:c.desc,builtin:true})).concat(ORG.cats.map(c=>({id:c.id,name:c.name,icon:"📁",desc:"我的分类",builtin:false})));
const catOf=it=>{for(const c of CAT.categories)if(c.items.includes(it))return c.id};
const builtinItems=()=>CAT.categories.flatMap(c=>c.items.map(it=>({it,home:c.id})));
const effCat=x=>{const m=ORG.move[x.it.id];return m&&allCats().some(c=>c.id==m)?m:x.home};
const ttl=it=>ORG.rename[it.id]||it.title;
async function itemsIn(cid){const mine=(await idbAll().catch(()=>[]));
 return builtinItems().filter(x=>!ORG.hidden[x.it.id]&&effCat(x)==cid).map(x=>({kind:"b",id:x.it.id,title:ttl(x.it),sub:x.it.sub||"",it:x.it}))
  .concat(mine.filter(f=>(allCats().some(c=>c.id==f.cat)?f.cat:"reading")==cid).map(f=>({kind:"m",id:f.id,title:f.name,sub:"我导入的音频",f})))}
// ---------- sheet / dialogs (touch friendly) ----------
function sheet(title,buttons){return new Promise(res=>{const o=document.createElement("div");o.className="ov";
 o.innerHTML=`<div class="sh"><div class="sht">${esc(title)}</div>${buttons.map((b,i)=>`<button class="shb ${b.cls||""}" data-i="${i}">${esc(b.t)}</button>`).join("")}<button class="shb cancel" data-i="-1">取消</button></div>`;
 o.onclick=e=>{const t=e.target.closest("[data-i]");if(e.target==o||t){o.remove();res(t?+t.dataset.i:-1)}};document.body.appendChild(o)})}
function ask(title,val=""){return new Promise(res=>{const o=document.createElement("div");o.className="ov";
 o.innerHTML=`<div class="sh"><div class="sht">${esc(title)}</div><input class="shi" id="ask"><button class="shb blue" id="ok">确定</button><button class="shb cancel" id="no">取消</button></div>`;
 document.body.appendChild(o);const i=o.querySelector("#ask");i.value=val;setTimeout(()=>i.focus(),50);
 const done=v=>{o.remove();res(v)};o.querySelector("#ok").onclick=()=>done(i.value.trim()||null);o.querySelector("#no").onclick=()=>done(null);i.onkeydown=e=>{if(e.key=="Enter")done(i.value.trim()||null)}})}
const sure=(t,ok="删除")=>sheet(t,[{t:ok,cls:"red"}]).then(i=>i==0);
async function pickCat(exclude){const cs=allCats().filter(c=>c.id!=exclude);const i=await sheet("移动到哪个分类？",cs.map(c=>({t:c.icon+" "+c.name})).concat([{t:"＋ 新建分类…",cls:"blue"}]));
 if(i<0)return null;if(i<cs.length)return cs[i].id;const n=await ask("新分类的名字");if(!n)return null;const id="u"+Date.now();ORG.cats.push({id,name:n});saveOrg();return id}
async function itemMenu(x,cid){const i=await sheet(x.title,[{t:"✏️ 重命名"},{t:"📂 移动到…"},{t:"🗑 删除",cls:"red"}]);
 if(i==0){const n=await ask("新名字",x.title);if(!n)return;if(x.kind=="m"){x.f.name=n;await idbPut(x.f)}else{if(n==x.it.title)delete ORG.rename[x.id];else ORG.rename[x.id]=n;saveOrg()}}
 if(i==1){const t=await pickCat(cid);if(!t)return;if(x.kind=="m"){x.f.cat=t;await idbPut(x.f)}else{if(t==catOf(x.it))delete ORG.move[x.id];else ORG.move[x.id]=t;saveOrg()}}
 if(i==2){if(x.kind=="m"){if(!(await sure(`永久删除「${x.title}」？\n导入的音频删除后无法恢复。`)))return;await idbDel(x.id)}
  else{if(!(await sure(`删除「${x.title}」？\n可以在 ⚙︎ 设置 › 回收站 里恢复。`)))return;ORG.hidden[x.id]=1;saveOrg()}}
 if(i>=0)route()}
async function catMenu(c){if(c.builtin)return;const n=(await itemsIn(c.id)).length;
 const i=await sheet(c.name,[{t:"✏️ 重命名分类"},{t:n?`🗑 删除分类（需先清空，现有 ${n} 项）`:"🗑 删除分类",cls:n?"gray":"red"}]);
 if(i==0){const v=await ask("分类新名字",c.name);if(v){ORG.cats.find(k=>k.id==c.id).name=v;saveOrg()}}
 if(i==1&&!n&&await sure(`删除空分类「${c.name}」？`)){ORG.cats=ORG.cats.filter(k=>k.id!=c.id);saveOrg();if(location.hash.includes(c.id))return history.back()}
 route()}
let LP=null;function longPress(el,fn){let t;el.addEventListener("touchstart",()=>{t=setTimeout(()=>{LP=Date.now();fn()},550)},{passive:true});
 for(const e of["touchend","touchmove","touchcancel"])el.addEventListener(e,()=>clearTimeout(t),{passive:true});el.addEventListener("contextmenu",e=>{e.preventDefault()})}
const tapOK=()=>!LP||Date.now()-LP>700;
function gear(){const h=document.getElementById("hdr-r");h.innerHTML=`<button id="gear" aria-label="设置">⚙︎</button>`;document.getElementById("gear").onclick=()=>location.hash="#/s"}
async function showHome(){setHeader("Nova 英语",false);gear();const cs=allCats();const counts=await Promise.all(cs.map(c=>itemsIn(c.id).then(a=>a.length)));
 V.innerHTML=`<div class="hero"><img src="icons/icon-192.png" alt=""><div><b>Hi, Nova! 🌻</b><span id="yec">${yearLeft()}</span></div></div><div class="tiles">${cs.map((c,k)=>`<div class="tw"><button class="tile" data-c="${c.id}"><span class="ic">${c.icon}</span><span class="nm">${esc(c.name)}</span><span class="ds">${esc(c.desc)}</span><span class="ct">${counts[k]} 项</span></button>${c.builtin?"":`<button class="dots" data-m="${c.id}" aria-label="更多">⋯</button>`}</div>`).join("")}
 <button class="tile gtile" onclick="location.hash='#/wf'"><span class="ic">🔤</span><span class="nm">词形练习</span><span class="ds">名词 · 动词 · 形容词 · 副词</span><span class="ct">每个单元一套</span></button><button class="tile gtile" onclick="location.hash='#/g'"><span class="ic">🎮</span><span class="nm">小游戏</span><span class="ds">拼写 · 拼图 · 填词</span><span class="ct">每个单元都能玩</span></button>
 <button class="tile add" id="newc"><span class="ic">＋</span><span class="nm">新建分类</span></button></div>`;
 V.querySelectorAll("[data-c]").forEach(b=>{const c=cs.find(x=>x.id==b.dataset.c);b.onclick=()=>{if(tapOK())location.hash="#/c/"+c.id};if(!c.builtin)longPress(b,()=>catMenu(c))});
 V.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>catMenu(cs.find(x=>x.id==b.dataset.m)));
 document.getElementById("newc").onclick=async()=>{const n=await ask("新分类的名字");if(n){ORG.cats.push({id:"u"+Date.now(),name:n});saveOrg();route()}}}
async function showCat(id){const c=allCats().find(x=>x.id==id);if(!c)return showHome();setHeader(c.name,true);
 const xs=await itemsIn(id);
 V.innerHTML=`<div class="tip">提示：点右边的 ⋯（或长按）可以重命名、移动、删除</div><div class="list">${xs.length?xs.map((x,k)=>`<div class="lw"><button class="li" data-k="${k}"><span class="tt">${x.kind=="m"?"🎵 ":""}${esc(x.title)}<span class="sb">${esc(x.sub)}</span></span></button><button class="dots" data-d="${k}" aria-label="更多">⋯</button></div>`).join(""):`<div class="done">这个分类还是空的</div>`}</div>
 <div class="import"><label class="btn" style="display:flex;align-items:center;justify-content:center">＋ 导入我的 MP3 到「${esc(c.name)}」<input type="file" accept="audio/*" style="display:none" id="imp"></label></div>`;
 V.querySelectorAll("[data-k]").forEach(b=>{const x=xs[+b.dataset.k];b.onclick=()=>{if(tapOK())location.hash=(x.kind=="m"?"#/m/":"#/i/")+x.id};longPress(b,()=>itemMenu(x,id))});
 V.querySelectorAll("[data-d]").forEach(b=>b.onclick=()=>itemMenu(xs[+b.dataset.d],id));
 document.getElementById("imp").onchange=async e=>{const f=e.target.files[0];if(!f)return;await idbPut({id:"m"+Date.now(),cat:id,name:f.name.replace(/\.[^.]+$/,""),blob:f});showCat(id)}}
const ZOOMS=[["小",.9],["标准",1.1],["大",1.25],["特大",1.4],["超大",1.6]];
const curZoom=()=>parseFloat(localStorage.getItem("nova_zoom"))||1.1;
function setZoom(z,noStamp){localStorage.setItem("nova_zoom",z);document.documentElement.style.setProperty("--z",z);if(!noStamp)saveDisplay()}
function showSettings(){setHeader("设置",true);const hid=builtinItems().filter(x=>ORG.hidden[x.it.id]);
 V.innerHTML=`<h3 class="sec">🗑 回收站（已删除的自带材料）</h3><div class="list">${hid.length?hid.map(x=>`<div class="lw"><div class="li"><span class="tt">${esc(ttl(x.it))}<span class="sb">${esc(x.it.sub||"")}</span></span></div><button class="rs" data-r="${x.it.id}">恢复</button></div>`).join(""):`<div class="done">回收站是空的</div>`}</div>
 ${hid.length>1?`<button class="wide flip" id="rall">全部恢复</button>`:""}
 <h3 class="sec">↺ 还原</h3><button class="wide gray" id="reset">把所有自带材料的名字和位置恢复成原样</button>
 <h3 class="sec">🔁 同步（在 iPad 和手机之间）</h3><div class="yn" style="margin-top:0"><button class="wide flip" style="margin-top:0" onclick="location.hash='#/exp'">📤 导出整理</button><button class="wide gray" style="margin-top:0" onclick="location.hash='#/imp'">📥 导入</button></div>
 <h3 class="sec">🔠 显示</h3><div class="li" style="display:block">
  <div style="margin-bottom:8px">字体大小</div><div class="zs">${ZOOMS.map(([n,z])=>`<button class="btn${Math.abs(z-curZoom())<.01?" on":""}" data-z="${z}">${n}</button>`).join("")}</div>
  <label class="tg"><input type="checkbox" id="bold" ${document.documentElement.classList.contains("bold")?"checked":""}> 字体加深加粗</label>
  <div class="pv"><b class="en">conventional wisdom</b> <span class="z">普遍看法</span><p class="en" style="margin:6px 0 0">Conventional wisdom is what most people believe is true.</p></div></div>
 <h3 class="sec">🔄 更新</h3><div class="li" style="display:block;line-height:1.7">App 版本：<b>${esc(META.v||"?")}</b>　(${esc(META.built||"")})<br>内容目录版本：<b>${esc(META.cv||"?")}</b><br>后台程序版本：<b id="swv">${esc(SWV||"…")}</b><br>离线音频已下载：<b id="fillst">${FILL?FILL.have+" / "+FILL.total:"…"}</b></div>
 <button class="wide flip" id="chk">检查更新</button><button class="wide no" id="force">强制更新（清除缓存并重新加载）</button>
 <div class="tip" style="margin-top:14px">这些整理只保存在这台设备上；导入的 MP3 删除后无法恢复。</div>`;
 V.querySelectorAll("[data-z]").forEach(b=>b.onclick=()=>{setZoom(+b.dataset.z);V.querySelectorAll("[data-z]").forEach(x=>x.classList.toggle("on",x==b))});
 document.getElementById("bold").onchange=e=>{document.documentElement.classList.toggle("bold",e.target.checked);localStorage.setItem("nova_bold",e.target.checked?"1":"0");saveDisplay()};
 document.getElementById("chk").onclick=()=>checkUpdate(true);document.getElementById("force").onclick=async()=>{if(await sure("强制更新？\n会清除离线缓存后重新下载（你的整理和导入的音频不受影响）。","强制更新"))forceUpdate()};
 navigator.serviceWorker&&navigator.serviceWorker.controller&&(navigator.serviceWorker.controller.postMessage({t:"ver"}),navigator.serviceWorker.controller.postMessage({t:"fill"}));
 setTimeout(()=>{const e=document.getElementById("swv");if(e&&SWV)e.textContent=SWV},800);
 V.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{delete ORG.hidden[b.dataset.r];saveOrg();showSettings()});
 const ra=document.getElementById("rall");if(ra)ra.onclick=()=>{ORG.hidden={};saveOrg();showSettings()};
 document.getElementById("reset").onclick=async()=>{if(await sure("恢复所有自带材料的原名字和原分类？（回收站和你建的分类不受影响）","恢复原样")){ORG.rename={};ORG.move={};saveOrg();showSettings()}}}
async function showMine(id){const f=(await idbAll()).find(x=>x.id==id);if(!f)return showHome();setHeader(f.name,true);
 V.innerHTML=`<div class="player"><audio id="au" controls src="${URL.createObjectURL(f.blob)}"></audio><div class="pb"><button class="p" id="pp" aria-label="播放/暂停">▶</button><button class="btn" id="sp">速度 1x</button><button class="btn" id="del">删除这个音频</button></div></div>`;
 const au=document.getElementById("au");wirePP(document.getElementById("au"));let r=[1,.85,.75],i=0;document.getElementById("sp").onclick=e=>{i=(i+1)%3;au.playbackRate=r[i];e.target.textContent="速度 "+r[i]+"x"};
 document.getElementById("del").onclick=async()=>{if(await sure("永久删除这个导入的音频？")){await idbDel(id);history.back()}}}
async function showItem(id){let it,cat;for(const c of CAT.categories){const x=c.items.find(i=>i.id==id);if(x){it=x;cat=c}}if(!it)return showHome();
 setHeader(ttl(it),true);V.innerHTML=`<div class="done">加载中…</div>`;const d=await getJSON(it.data);
 ({reading:viewReading,flash:viewFlash,words:viewWords,longaudio:viewLong,chunks:viewChunks})[d.type](d,id)}
// ---------- reading card ----------
function viewReading(d){const SP=[1,.85,.75];let si=0,cur=-1;const F={loop:false,shad:false,hid:localStorage.getItem("rd_hid")=="1"};
 V.innerHTML=`<div class="bar"><button id="all" class="red">▶ 全部连播</button><button id="loop">单句循环</button><button id="shad">跟读停顿</button><button id="spd">速度 1x</button><button id="hid">隐藏文字</button>${d.oaudio?'<button id="oall" class="org">🎙 原声连播</button>':""}${d.sents.some(x=>x.seg&&x.oa)?'<button id="dd" class="org">👆 点读</button>':""}<button id="stp">■ 停止</button></div><div class="status" id="st"></div><div id="ss"></div>`;
 const ss=document.getElementById("ss"),st=x=>document.getElementById("st").textContent=x;
 d.sents.forEach((s,i)=>{const e=document.createElement("div");e.className="s "+s.sp.toLowerCase();e.id="s"+i;
  e.innerHTML=`<div class="body"><div class="who">${s.sp=="Naval"?"NAVAL RAVIKANT":"CHRIS WILLIAMSON"}</div><div class="t"></div>${s.oa?'<button class="osb">🔊 原声</button>':""}</div><button class="p">▶</button>`;
  e.querySelector(".t").textContent=s.t;e.querySelector(".t").onclick=e.querySelector(".p").onclick=()=>{stopAll();setAll(false);seq([i])};if(s.oa)e.querySelector(".osb").onclick=ev=>{ev.stopPropagation();stopAll();setAll(false);const b=ev.currentTarget;mark(i);LASTBTN=b;st(`原声 · 第 ${i+1} 句`);playP(s.oa,1,s.t)};ss.appendChild(e)});
 const mark=i=>{document.querySelectorAll(".cur").forEach(x=>x.classList.remove("cur"));cur=i;const e=document.getElementById("s"+i);e.classList.add("cur");LASTBTN=e.querySelector(".p");follow(e)};
 const setAll=on=>{const b=document.getElementById("all");b.classList.toggle("on",on);b.textContent=on?"⏸ 暂停连播":"▶ 全部连播"};
 async function seq(list){const me=++RUN;for(const i of list){do{if(me!=RUN)return;mark(i);st(`第 ${i+1} / ${d.sents.length} 句`);await playP(d.sents[i].a,SP[si],d.sents[i].t);if(me!=RUN)return;
  if(F.shad){st(`第 ${i+1} 句 · 请跟读…`);await wait(d.sents[i].d/SP[si]*1000+600)}else await wait(F.loop?700:350)}while(F.loop&&me==RUN)}if(me==RUN){setAll(false);st("播放完毕")}}
 const $=id=>document.getElementById(id);
 $("all").onclick=()=>{const on=$("all").classList.contains("on");stopAll();setAll(false);if(on)return;setAll(true);const s=cur>0&&cur<d.sents.length-1?cur:0;seq(d.sents.map((_,i)=>i).slice(s))};
 for(const k of ["loop","shad","hid"])$(k).onclick=()=>{F[k]=!F[k];$(k).classList.toggle("on",F[k]);if(k=="hid"){ss.classList.toggle("hide",F.hid);try{localStorage.setItem("rd_hid",F.hid?"1":"0")}catch(e){}}};
 if(F.hid){ss.classList.add("hide");$("hid").classList.add("on")}
 // 👆 点读: tap a phrase (split at Naval's breath pauses) to play just that original-audio segment
 if($("dd")){let DD=localStorage.getItem("rd_dd")=="1";const ren=()=>{d.sents.forEach((s,i)=>{const t=document.querySelector("#s"+i+" .t");if(!DD||!s.seg||!s.oa){t.textContent=s.t;return}const w=s.t.split(/\s+/);t.textContent="";
   s.seg.forEach(([x,y,a,b],k)=>{const p=document.createElement("span");p.className="ph"+(k%2?" alt":"");p.textContent=w.slice(x,y+1).join(" ");p.dataset.s=i;p.dataset.k=k;
    p.onclick=ev=>{ev.stopPropagation();playSeg(i,k,p)};t.appendChild(p);if(k<s.seg.length-1)t.appendChild(document.createTextNode(" "))})});$("dd").classList.toggle("on",DD)};
  async function playSeg(i,k,p){stopAll();setAll(false);const me=RUN,s=d.sents[i],[,,a,b]=s.seg[k];mark(i);LASTBTN=$("dd");document.querySelectorAll(".ph.play").forEach(x=>x.classList.remove("play"));p.classList.add("play");st(`点读 · 第 ${i+1} 句 · 第 ${k+1}/${s.seg.length} 段`);
   A.onended=A.onerror=null;A.src=await audioURL(s.oa);A.playbackRate=1;const go=()=>{try{A.currentTime=a}catch(e){}A.play().catch(()=>{})};if(A.readyState>=1)go();else A.addEventListener("loadedmetadata",go,{once:true});
   const tick=()=>{if(me!=RUN){p.classList.remove("play");return}if(A.currentTime>=b||A.ended){A.pause();p.classList.remove("play");return}requestAnimationFrame(tick)};requestAnimationFrame(tick);window._dd={i,k,a,b,src:s.oa}}
  $("dd").onclick=()=>{DD=!DD;try{localStorage.setItem("rd_dd",DD?"1":"0")}catch(e){}ren();st(DD?"点读：点句子里的任一小段，只播那一段原声":"")};ren()}
 $("spd").onclick=()=>{si=(si+1)%3;A.playbackRate=SP[si];$("spd").textContent="速度 "+SP[si]+"x"};
 $("stp").onclick=()=>{stopAll();setAll(false);st("")};
 // 原声连播: continuous original interview track, sentence follow-along by aligned start times
 if(d.oaudio){const ob=$("oall"),ots=d.sents.map(s=>s.ot);const setO=on=>{ob.classList.toggle("on",on);ob.textContent=on?"⏸ 暂停原声":"🎙 原声连播"};
  ob.onclick=async()=>{const on=ob.classList.contains("on");stopAll();setAll(false);setO(false);if(on)return;const me=++RUN;setO(true);
   const s0=cur>0&&cur<d.sents.length-1?cur:0;A.src=await audioURL(d.oaudio);A.playbackRate=1;A.currentTime=Math.max(0,ots[s0]||0);LASTBTN=ob;A.onended=()=>{if(me==RUN){setO(false);st("原声播放完毕")}};A.onerror=null;A.play().catch(()=>{});
   let last=-1;const tick=()=>{if(me!=RUN){setO(false);return}let k=0;for(let i=0;i<ots.length;i++)if(ots[i]!=null&&A.currentTime+0.1>=ots[i])k=i;if(k!=last){last=k;mark(k);LASTBTN=ob;st(`原声 · 第 ${k+1} / ${d.sents.length} 句`)}if(!A.paused||A.currentTime<0.2)requestAnimationFrame(tick);else if(A.ended)setO(false)};requestAnimationFrame(tick)}}}
// ---------- 原文 (original Naval sentence) ----------
function ywHTML(src){if(!src)return "";const t=src.t,[a,b]=src.hl;const who=src.sp=="Naval"?"Naval":"Chris";
 return `<span class="lab yw">原文</span>${esc(t.slice(0,a))}<b class="ywb">${esc(t.slice(a,b))}</b>${esc(t.slice(b))} <span class="ywsp">— ${who}</span>`}
// ---------- flashcards ----------
function viewFlash(d,id){const C=d.cards,KEY_="flash_"+id;let S=JSON.parse(localStorage.getItem(KEY_)||"null")||{mode:"all",status:{},queue:null,pos:0,rate:1,guess:{}};let back=false;
 const save=()=>{try{localStorage.setItem(KEY_,JSON.stringify(S))}catch(e){}};
 const build=()=>{let ids=C.map((_,i)=>i);if(S.mode=="un")ids=ids.filter(i=>S.status[i]=="u");S.queue=ids;S.pos=0;save()};if(!S.queue)build();
 V.innerHTML=`<div class="bar"><button id="mAll">全部单词</button><button id="mUn">只练不认识的</button><button id="shf">打乱顺序</button><button id="spd">1x</button><button id="rst">重置</button></div><div class="status" id="pg"></div><div id="fc"></div>`;
 const $=x=>document.getElementById(x);
 $("mAll").onclick=()=>{S.mode="all";build();render()};$("mUn").onclick=()=>{S.mode="un";build();render()};
 $("shf").onclick=()=>{const q=S.queue.slice(S.pos);for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]]}S.queue=S.queue.slice(0,S.pos).concat(q);save();render()};
 $("spd").onclick=()=>{S.rate=S.rate==1?.75:1;save();render()};$("rst").onclick=()=>{if(confirm("清空这组单词卡的进度？")){S={mode:"all",status:{},queue:null,pos:0,rate:S.rate,guess:{}};build();render()}};
 window._fc={play:(i,k)=>{stopAll();playP(C[i].a[k],S.rate,[C[i].w,C[i].ex,C[i].exs[0],C[i].exs[1]][k])},
  flip:i=>{const g=$("g");if(g)S.guess[i]=g.value.trim();back=true;save();render()},
  mark:(i,v)=>{S.status[i]=v;if(v=="u")S.queue.splice(Math.min(S.pos+4,S.queue.length),0,i);S.pos++;back=false;stopAll();save();render()},
  src:i=>{stopAll();playP(C[i].src.a,S.rate,C[i].src.t)},
  again:()=>{build();render()},un:()=>{S.mode="un";build();render()}};
 function render(){$("mAll").className=S.mode=="all"?"on":"";$("mUn").className=S.mode=="un"?"on":"";$("spd").textContent=S.rate==1?"1x":"0.75x";
  const vals=Object.values(S.status),k=vals.filter(v=>v=="k").length,u=vals.filter(v=>v=="u").length,q=S.queue,n=q.length;
  $("pg").textContent=`第 ${Math.min(S.pos+1,n)} / ${n} 张 · 认识 ${k} · 不认识 ${u} · 共 ${C.length} 词`;
  if(!n){$("fc").innerHTML=`<div class="card done">没有标记为“不认识”的单词了 🎉<button class="wide flip" onclick="document.getElementById('mAll').click()">练习全部单词</button></div>`;return}
  if(S.pos>=n){$("fc").innerHTML=`<div class="card done">这一轮完成了！<br>认识 ${k} 个，不认识 ${u} 个<button class="wide flip" onclick="_fc.again()">再来一轮</button>${u?'<button class="wide no" onclick="_fc.un()">只练不认识的</button>':""}</div>`;return}
  const i=q[S.pos],c=C[i];let h=`<div class="card"><div class="word">${esc(c.w)}</div><div class="pos en">${esc(c.pos)}</div><button class="big" onclick="_fc.play(${i},0)">▶</button>`;
  if(!back)h+=`<input class="guess" id="g" placeholder="我猜的意思（可不填）" value="${esc(S.guess[i]||"")}"><button class="wide flip" onclick="_fc.flip(${i})">翻看答案</button>`;
  else h+=`<div class="zh">${esc(c.zh)}</div>${S.guess[i]?`<div class="mine">我猜的：${esc(S.guess[i])}</div>`:""}
   <div class="row"><div class="tx en"><span class="lab">解释</span>${esc(c.ex)}</div><button class="p sm" onclick="_fc.play(${i},1)">▶</button></div>
   <div class="row"><div class="tx en"><span class="lab ex">例句1</span>${esc(c.exs[0])}</div><button class="p sm" onclick="_fc.play(${i},2)">▶</button></div>
   <div class="row"><div class="tx en"><span class="lab ex">例句2</span>${esc(c.exs[1])}</div><button class="p sm" onclick="_fc.play(${i},3)">▶</button></div>
   ${c.src?`<div class="row yrow"><div class="tx en">${ywHTML(c.src)}</div><button class="p sm" onclick="_fc.src(${i})">▶</button></div>`:""}
   <div class="yn"><button class="wide no" onclick="_fc.mark(${i},'u')">不认识</button><button class="wide yes" onclick="_fc.mark(${i},'k')">认识</button></div>`;
  $("fc").innerHTML=h+"</div>"}
 render()}
// ---------- word pronunciation list ----------
function viewWords(d){let rate=1;
 V.innerHTML=`<div class="bar"><button id="all" class="red">▶ 全部连播</button><button id="spd">速度 1x</button></div><div id="wl">${d.items.map((m,i)=>`<div class="wc" id="w${i}"><div class="top"><span style="color:#999;width:24px">${m.n}</span><div style="flex:1"><div class="w">${esc(m.w)} <span class="ps">${esc(m.pos)}</span></div><div class="z">${esc(m.zh)}</div></div><button class="p" data-i="${i}" data-k="w">▶</button></div><button class="exb" data-i="${i}" data-k="e">▷ 例句　${esc(m.ex)}</button></div>`).join("")}</div>`;
 const mark=i=>{document.querySelectorAll(".cur").forEach(x=>x.classList.remove("cur"));const e=document.getElementById("w"+i);e.classList.add("cur");LASTBTN=e.querySelector(".p");follow(e)};
 const setAll=on=>{const b=document.getElementById("all");b.classList.toggle("on",on);b.textContent=on?"■ 停止":"▶ 全部连播"};
 V.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{stopAll();setAll(false);const i=+b.dataset.i,m=d.items[i];mark(i);b.dataset.k=="w"?playP(m.aw,rate,m.w):playP(m.ae,rate,m.ex)});
 document.getElementById("all").onclick=async()=>{const on=document.getElementById("all").classList.contains("on");stopAll();setAll(false);if(on)return;setAll(true);const me=++RUN;
  for(let i=0;i<d.items.length;i++){if(me!=RUN)return;mark(i);await playP(d.items[i].aw,rate,d.items[i].w);if(me!=RUN)return;await wait(1200/rate);await playP(d.items[i].aw,rate,d.items[i].w);if(me!=RUN)return;await wait(1800/rate)}setAll(false)};
 document.getElementById("spd").onclick=e=>{rate=rate==1?.75:1;A.playbackRate=rate;e.target.textContent="速度 "+rate+"x"}}
// ---------- long audio with item jump ----------
// ---------- follow-along helpers ----------
let LASTUSER=0;for(const ev of["touchstart","touchmove","wheel"])window.addEventListener(ev,()=>LASTUSER=Date.now(),{passive:true});
window.addEventListener("keydown",e=>{if(["ArrowUp","ArrowDown","PageUp","PageDown"," "].includes(e.key))LASTUSER=Date.now()});
function follow(el){if(el&&Date.now()-LASTUSER>4000)el.scrollIntoView({block:"center",behavior:"smooth"})}
const endS=tk=>/[.?!…]["”’)]*$/.test(tk);
function spans(toks){let h="",open=false;for(const [tk,t] of toks){if(!open){h+='<span class="sn">';open=true}h+=`<span class="wd" data-t="${t}">${esc(tk)}</span> `;if(endS(tk)){h+="</span>";open=false}}if(open)h+="</span>";return h}
// ---------- long audio with item jump + follow-along ----------
async function viewLong(d){const url=await audioURL(d.audio);await loadEXP();const R=[1,.85,.75];let ri=0;
 V.innerHTML=`<div class="player"><audio id="au" controls preload="metadata" src="${url}"></audio><div class="pb"><button class="p" id="pp" aria-label="播放/暂停">▶</button><button class="btn" id="bk">⟲ 10秒</button><button class="btn" id="sp">速度 1x</button><button class="btn" id="fw">10秒 ⟳</button></div><div class="status" id="nw" style="margin:8px 2px 0"></div></div>
 <div class="tip">播放时文字会跟着高亮；点任意一句可以从那里听。手动滑动后 4 秒内不自动滚动。</div>
 ${d.items.map((e,i)=>{const tt=e.tt;const wt=tt&&tt.w!=null?tt.w:e.t;
  return `<div class="ent" id="e${i}"><div class="hd"><span class="n">${e.n}</span><span class="w en${wt!=null?" wd":""}"${wt!=null?` data-t="${wt}"`:""}>${esc(e.w)}</span><span style="color:#888;font-style:italic">${esc(e.pos||"")}</span><span class="z">${esc(e.zh||"")}</span>${e.t!=null?`<button class="jump" data-j="${e.t}">▶ 从这里听</button>`:""}</div>
  <p>${tt&&tt.ex.length?spans(tt.ex):esc(e.ex)}</p>${e.exs&&e.exs.length?`<div style="font-weight:700;font-size:13px;color:#555">For example:</div><ol>${e.exs.map((x,j)=>`<li>${tt&&tt.exs[j]&&tt.exs[j].length?spans(tt.exs[j]):esc(x)}</li>`).join("")}</ol>`:""}${e.src?`<div class="row yrow"><div class="tx en">${ywHTML(e.src)}</div><button class="p sm" data-src="${i}" aria-label="播放原文">▶</button></div>`:""}${expHTML(e.w)}</div>`}).join("")}`;
 const au=document.getElementById("au");wirePP(au);
 const play=t=>{au.currentTime=Math.max(0,t-0.05);au.playbackRate=R[ri];au.play().catch(()=>{})};
 V.querySelectorAll(".jump").forEach(b=>b.onclick=()=>play(+b.dataset.j));
 V.querySelectorAll("[data-src]").forEach(b=>b.onclick=()=>{au.pause();stopAll();LASTBTN=b;const e=d.items[+b.dataset.src];playP(e.src.a,R[ri],e.src.t)});
 V.querySelectorAll(".wd").forEach(w=>w.onclick=()=>{LASTUSER=0;const sn=w.closest(".sn");const f=sn?sn.querySelector(".wd"):w;play(+f.dataset.t)});
 document.getElementById("bk").onclick=()=>au.currentTime=Math.max(0,au.currentTime-10);document.getElementById("fw").onclick=()=>au.currentTime+=10;
 document.getElementById("sp").onclick=e=>{ri=(ri+1)%3;au.playbackRate=R[ri];e.target.textContent="速度 "+R[ri]+"x"};
 const WD=[...V.querySelectorAll(".wd")].map(el=>({el,t:+el.dataset.t})).sort((a,b)=>a.t-b.t);
 const ts=d.items.map(e=>e.tt&&e.tt.w!=null?e.tt.w:e.t);let lastE=-1,lastW=null,lastS=null,raf=0;
 function tick(){const ct=au.currentTime+0.05;
  let k=-1;for(let i=0;i<ts.length;i++)if(ts[i]!=null&&ct>=ts[i])k=i;
  if(k!=lastE){lastE=k;document.querySelectorAll(".ent.cur").forEach(x=>x.classList.remove("cur"));if(k>=0){document.getElementById("e"+k).classList.add("cur");document.getElementById("nw").textContent=`正在播放：${d.items[k].n}. ${d.items[k].w}`}}
  let lo=0,hi=WD.length-1,j=-1;while(lo<=hi){const m=(lo+hi)>>1;if(WD[m].t<=ct){j=m;lo=m+1}else hi=m-1}
  const w=j>=0?WD[j].el:null;if(w!==lastW){lastW&&lastW.classList.remove("on");w&&w.classList.add("on");lastW=w;
   const sn=w?(w.closest(".sn")||w):null;if(sn!==lastS){lastS&&lastS.classList.remove("now");sn&&sn.classList.add("now");lastS=sn;if(!au.paused)follow(sn)}}
  if(!au.paused)raf=requestAnimationFrame(tick)}
 au.addEventListener("play",()=>{try{A.pause()}catch(e){}cancelAnimationFrame(raf);tick()});au.addEventListener("seeked",tick);au.addEventListener("timeupdate",()=>{if(au.paused)tick()});
 window._stopLong=()=>au.pause()}
// stop long-audio element on navigation
window.addEventListener("hashchange",()=>{document.querySelectorAll("audio").forEach(a=>a.pause())});
// ---------- boot ----------
// ---------- updates / service worker ----------
let REG=null,SWV=null,FILL=null;
function toast(t,ms=3500){const d=document.createElement("div");d.className="toast";d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),ms)}
async function checkUpdate(manual){try{const m=await (await fetch("meta.json?t="+Date.now(),{cache:"no-store"})).json();
  if(REG)await REG.update();if(m.v&&META.v&&m.v!=META.v){toast("发现新版本，正在更新…");setTimeout(()=>location.reload(),1500)}else if(manual)toast("已经是最新版本 ✓");return m}catch(e){if(manual)toast("没有网络，稍后再试")}}
async function forceUpdate(){toast("正在强制更新…");try{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister()}catch(e){}
  try{for(const k of await caches.keys())await caches.delete(k)}catch(e){}sessionStorage.setItem("nova_updated","1");location.replace(location.pathname+"?u="+Date.now())}
if("serviceWorker" in navigator){const sw=navigator.serviceWorker;const had=!!sw.controller;let rl=0;
  sw.addEventListener("controllerchange",()=>{if(had&&!rl){rl=1;sessionStorage.setItem("nova_updated","1");location.reload()}});
  sw.addEventListener("message",e=>{const d=e.data||{};if(d.t=="ver")SWV=d.v;if(d.t=="fill"){FILL=d;const el=document.getElementById("fillst");if(el)el.textContent=`${d.have} / ${d.total}`}});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState=="visible")checkUpdate(false)});
  window.addEventListener("pageshow",e=>{if(e.persisted)checkUpdate(false)})}
async function startSW(){if(!("serviceWorker" in navigator))return;const sw=navigator.serviceWorker;
  try{REG=await sw.register("sw.js?v="+(META.v||"0"),{updateViaCache:"none"});REG.update().catch(()=>{})}catch(e){console.warn("SW",e);return}
  const r=await sw.ready;r.active&&r.active.postMessage({t:"ver"});setTimeout(()=>{r.active&&r.active.postMessage({t:"fill"})},4000)}
(async()=>{try{META=await (await fetch("meta.json?t="+Date.now(),{cache:"no-store"})).json()}catch(e){}
  const last=localStorage.getItem("nova_v");if(sessionStorage.getItem("nova_updated")||(last&&META.v&&last!=META.v)){sessionStorage.removeItem("nova_updated");setTimeout(()=>toast("已更新 ✓ 版本 "+(META.v||"")),600)}
  if(META.v)localStorage.setItem("nova_v",META.v);route();startSW()})();


function yearLeft(d){d=d||new Date();const y=d.getFullYear(),x=Math.round((Date.UTC(y,11,31)-Date.UTC(y,d.getMonth(),d.getDate()))/864e5)+1;return `今年还剩${Math.floor(x/7)}周${x%7}天（${x}天）。`}
function updYec(){const e=document.getElementById("yec");if(e)e.textContent=yearLeft()}
let _yecT;function schedYec(){clearTimeout(_yecT);const n=new Date(),m=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,1);_yecT=setTimeout(()=>{updYec();schedYec()},m-n)}
document.addEventListener("visibilitychange",()=>{if(!document.hidden){updYec();schedYec()}});schedYec();

// ---------- 🧩 chunks: original-audio phrases, 3x original + 中文 + 3x original ----------
async function viewChunks(d){const url=await audioURL(d.audio);const hl=e=>e.hl?esc(e.s.slice(0,e.hl[0]))+`<b class="ywb">${esc(e.s.slice(e.hl[0],e.hl[1]))}</b>`+esc(e.s.slice(e.hl[1])):esc(e.s);
 V.innerHTML=`<div class="player"><audio id="au" controls preload="metadata" src="${url}"></audio><div class="pb"><button class="p" id="pp" aria-label="播放全部">▶</button><button class="btn" id="bk">⟲ 上一个</button><button class="btn" id="fw">下一个 ⟳</button></div><div class="status" id="nw" style="margin:8px 2px 0">▶ 播放全部：每个词组 原声×3 → 中文 → 原声×3</div></div>
 <div class="tip">原声来自 ${esc(d.source)}。点 🌻 听这个词组的完整练习，点「原声」只听一遍。</div>
 ${d.items.map((e,i)=>`<div class="ent chk" id="e${i}"><div class="hd"><span class="n">${e.n}</span><span class="w en">${esc(e.c)}</span><span class="z">${esc(e.zh)}</span></div>
  <div class="row yrow"><div class="tx en"><span class="lab yw">原文</span>${hl(e)} <span class="ywsp">— ${esc(e.sp)}</span></div></div>
  <div class="chb"><button class="p sm" data-q="${i}" aria-label="练习序列">▶</button><button class="btn" data-o="${i}">🔊 原声 1 次</button><button class="jump" data-j="${e.t}">▶ 从这里连播</button><span class="chs" id="cs${i}"></span></div></div>`).join("")}`;
 const au=document.getElementById("au");wirePP(au);const ts=d.items.map(e=>e.t);
 const play=t=>{stopAll();au.currentTime=Math.max(0,t);au.play().catch(()=>{})};
 V.querySelectorAll(".jump").forEach(b=>b.onclick=()=>{LASTUSER=0;play(+b.dataset.j)});
 V.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>{au.pause();stopAll();LASTBTN=b;const e=d.items[+b.dataset.q];playP(e.q,1,e.c)});
 V.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{au.pause();stopAll();const e=d.items[+b.dataset.o];playP(e.o,1,e.c)});
 const cur=()=>{let k=0;for(let i=0;i<ts.length;i++)if(au.currentTime+0.05>=ts[i])k=i;return k};
 document.getElementById("bk").onclick=()=>play(ts[Math.max(0,cur()-(au.currentTime-ts[cur()]<1.5?1:0))]);document.getElementById("fw").onclick=()=>play(ts[Math.min(ts.length-1,cur()+1)]);
 let lastE=-1,lastP="",raf=0;
 function tick(){const ct=au.currentTime+0.05;let k=-1;for(let i=0;i<ts.length;i++)if(ct>=ts[i])k=i;
  if(k!=lastE){if(lastE>=0){document.getElementById("e"+lastE).classList.remove("cur");document.getElementById("cs"+lastE).textContent=""}lastE=k;if(k>=0){const el=document.getElementById("e"+k);el.classList.add("cur");if(!au.paused)follow(el)}}
  if(k>=0){const m=d.items[k].m;let o=0,lab="";for(const [t,tt] of m){if(ct>=tt){if(t=="o"){o++;lab=`原声 ${o<=3?o:o-3}/3`}else lab="中文"}}
   const txt=`${d.items[k].n}. ${d.items[k].c} · ${lab}`;if(txt!=lastP){lastP=txt;document.getElementById("nw").textContent="正在播放："+txt;document.getElementById("cs"+k).textContent=lab}}
  if(!au.paused)raf=requestAnimationFrame(tick)}
 au.addEventListener("play",()=>{try{A.pause()}catch(e){}cancelAnimationFrame(raf);tick()});au.addEventListener("seeked",tick);
 window._stopLong=()=>au.pause()}
