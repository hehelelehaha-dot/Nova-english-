// build 2026-10-22f: T7 desire contract; 2026-10-22e: T5/T7 topic track tail re-cut; ③ 原句 before every word (m5pre) — cache bump
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
const setPlaying=(b,on)=>{document.querySelectorAll(".p.playing,.big.playing,.osb.playing,.osent.playing").forEach(x=>{if(x!=b||!on)x.classList.remove("playing")});if(b&&on)b.classList.add("playing")};
document.addEventListener("click",e=>{const b=e.target.closest(".p,.big");if(b&&!b.id)LASTBTN=b},true);
A.addEventListener("playing",()=>setPlaying(LASTBTN,true));for(const ev of["pause","ended","emptied"])A.addEventListener(ev,()=>setPlaying(null,false));
function stopAll(){RUN++;try{A.pause()}catch(e){}if(window.speechSynthesis)speechSynthesis.cancel()}
async function playP(p,rate=1,fbText){const url=await audioURL(p);return new Promise(r=>{A.onended=()=>r(true);A.onerror=()=>speak(fbText,rate).then(r);A.src=url;A.playbackRate=rate;A.defaultPlaybackRate=rate;
 const q=A.play();if(q)q.then(()=>{A.playbackRate=rate}).catch(()=>speak(fbText,rate).then(r))})}
function speak(t,rate){return new Promise(r=>{if(!t||!window.speechSynthesis)return r();const u=new SpeechSynthesisUtterance(t);u.lang="en-US";u.rate=rate*.9;u.onend=r;u.onerror=r;speechSynthesis.cancel();speechSynthesis.speak(u)})}
// custom progress bar (Nova 2026-10-21): on iPad the decrypted blob: audio reports duration Infinity/NaN, so the native bar showed only elapsed time with the dot stuck left; use the file's real length (d.dur) and our own seek
const fmtC=t=>{t=Math.max(0,Math.floor(t||0));const h=Math.floor(t/3600),m=Math.floor(t/60)%60,x=String(t%60).padStart(2,"0");return h?`${h}:${String(m).padStart(2,"0")}:${x}`:`${m}:${x}`};
function seekBar(au,dur){const D=()=>isFinite(au.duration)&&au.duration>0?au.duration:(dur||0);const r=document.getElementById("sk"),c=document.getElementById("tc"),e=document.getElementById("td");let drag=false;
 const up=()=>{const d=D();r.max=d||1;if(!drag)r.value=Math.min(au.currentTime,d||au.currentTime);c.textContent=fmtC(drag?+r.value:au.currentTime);e.textContent=d?fmtC(d):"--:--";r.style.setProperty("--pc",(d?100*(+r.value)/d:0)+"%")};
 r.addEventListener("input",()=>{drag=true;up()});r.addEventListener("change",()=>{drag=false;au.currentTime=+r.value;up()});
 ["timeupdate","durationchange","loadedmetadata","seeked","play","pause"].forEach(k=>au.addEventListener(k,up));up();au.seekTo=t=>{const d=D();au.currentTime=Math.max(0,Math.min(d?d-0.05:t,t))};return D}
function wirePP(au){const b=document.getElementById("pp");b.onclick=()=>au.paused?au.play().catch(()=>{}):au.pause();
 au.addEventListener("play",()=>b.classList.add("playing"));for(const e of["pause","ended"])au.addEventListener(e,()=>b.classList.remove("playing"))}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// ---------- ui helpers ----------
const V=document.getElementById("view");const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
// Nova refers to sections by number: 0 口语句式 1 阅读卡 2 单词卡 3 英英解释音频 4 句子听写 5 词形练习 6 小游戏 7 画面漫画
const SECN={phrases:0,reading:1,flash:2,longaudio:3,dictation:4,wf:5,game:6,comic:7},CIRC="⓪①②③④⑤⑥⑦",secT=(id,t)=>id in SECN?CIRC[SECN[id]]+" "+t:t;
function setHeader(t,back){document.getElementById("title").textContent=t;document.getElementById("back").classList.toggle("hidden",!back)}
let CAT=null;
// Naval topics: newest (highest topic number) first; other items keep their slots. Topic number from id like naval_t06 / t05v_flash / ch_t04 / wf_t03v
const topicNo=x=>{const m=/(?:^|_)t(\d\d)(?:v|_|$)/.exec(x.id||"");return m?+m[1]:null};
function topicSort(a){const idx=[],its=[];a.forEach((x,i)=>{if(topicNo(x)!=null){idx.push(i);its.push(x)}});its.sort((p,q)=>topicNo(q)-topicNo(p));const r=a.slice();idx.forEach((k,j)=>r[k]=its[j]);return r}
// ④ used to be the Chunks category. Same home slot, now a Topic list of sentence dictation over reading cards that have interview audio.
function applyDictation(cat){if(!cat||!cat.categories||cat._dt)return;const ch=cat.categories.find(c=>c.id=="chunks"||c.id=="dictation");if(!ch){cat._dt=1;return}
 const rd=cat.categories.find(c=>c.id=="reading");
 const src=((rd&&rd.items)||[]).filter(it=>/naval_t\d+/.test(it.id)||/naval_t\d+/.test(it.data||""));
 ch.id="dictation";ch.name="句子听写";ch.desc="听原声，写出整句";ch.icon="✍️";
 ch.items=topicSort(src.map(it=>({id:"dt_"+it.id,base:it.id,title:it.title,sub:it.sub||"",data:it.data,dictation:1})));
 cat._dt=1}
// ---------- scroll memory: back restores, forward starts at top ----------
try{history.scrollRestoration="manual"}catch(e){}
const SCR={};let NAVSTK=[],LASTH=null,SCRSEQ=0,NAVREPL=false;
function navSib(h){NAVREPL=true;location.replace(h)}
async function route(){const h=location.hash||"#/";if(LASTH!=null)SCR[LASTH]=window.scrollY;
 let back=false;if(NAVREPL){NAVREPL=false;if(NAVSTK.length)NAVSTK[NAVSTK.length-1]=h;else NAVSTK.push(h)}else if(NAVSTK.length>=2&&NAVSTK[NAVSTK.length-2]==h){NAVSTK.pop();back=true}else if(NAVSTK[NAVSTK.length-1]!=h)NAVSTK.push(h);else back=true;LASTH=h;
 const seq=++SCRSEQ;await route0();if(seq!=SCRSEQ)return;
 const y=back?SCR[h]||0:0;if(!y)return;const t0=Date.now();
 const tryR=()=>{if(seq!=SCRSEQ)return;const maxY=document.documentElement.scrollHeight-innerHeight;if(maxY>=y-2){window.scrollTo(0,y);if(Math.abs(window.scrollY-y)<3)return}if(Date.now()-t0<2500)setTimeout(tryR,60);else window.scrollTo(0,Math.min(y,maxY))};tryR()}
async function route0(){stopAll();document.querySelectorAll(".ov").forEach(o=>o.remove());document.getElementById("hdr-r").innerHTML="";window.scrollTo(0,0);
 if(META.enc&&!KEY){if(!(await unlock()))return lockScreen()}
 if(!CAT){CAT=await getJSON("catalog.json");for(const c of CAT.categories)c.items=topicSort(c.items);if(CAT.gameOnly)CAT.gameOnly=topicSort(CAT.gameOnly)}
 applyDictation(CAT);
 const h=location.hash.slice(1).split("/");
 if((h[1]=="c"&&h[2]=="chunks")||(h[1]=="i"&&/^ch_t\d+$/.test(h[2]||""))){location.replace("#/c/dictation");return}
 try{if(h[1]=="c")return showCat(h[2]);if(h[1]=="i")return showItem(h[2]);if(h[1]=="m")return showMine(h[2]);if(h[1]=="g")return h[2]?showGame(h[2],h[3]||"spell"):showGames();if(h[1]=="k")return h[2]?showComic(h[2]):showComics();if(h[1]=="wf")return h[2]?showWF(h[2]):showWFs();if(h[1]=="s")return showSettings();if(h[1]=="d")return showDay(h[2]);if(h[1]=="srs")return showSRS();if(h[1]=="exp")return showExport();if(h[1]=="imp")return h[2]?showImportLink(h.slice(2).join("/")):showImport();showHome()}catch(e){V.innerHTML=`<div class="done">出错了：${esc(e.message)}</div>`;console.error(e)}}
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
function mergeFields(R){const sum={h:0,r:0,m:0,c:0,d:0,g:0};if(R["t:log"]){sum.t=tMerge(R["t:log"][0]);R=Object.assign({},R);delete R["t:log"]}if(R["u:sun"]){sum.u=sunMerge(R["u:sun"][0]);R=Object.assign({},R);delete R["u:sun"]}for(const k in R){const r=R[k];if(!Array.isArray(r)||typeof r[1]!="number")continue;const l=FIELDS[k];
  if(!l||r[1]>l[1]){if(!l||JSON.stringify(l[0])!==JSON.stringify(r[0]))sum[k[0]]=(sum[k[0]]||0)+1;FIELDS[k]=[r[0],r[1]]}}
 localStorage.setItem(FK,JSON.stringify(FIELDS));ORG=orgFrom(FIELDS);localStorage.setItem(ORGK,JSON.stringify(ORG));
 if(sum.d){const z=FIELDS["d:zoom"],b=FIELDS["d:bold"];if(z&&z[0])setZoom(z[0],true);if(b){document.documentElement.classList.toggle("bold",!!b[0]);localStorage.setItem("nova_bold",b[0]?"1":"0")}}
 return sum}
// ---------- sync code (compressed, url-safe) ----------
const b64u=u=>btoa(String.fromCharCode(...u)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const ub64u=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
async function zip(str,inv){const cs=inv?new DecompressionStream("deflate-raw"):new CompressionStream("deflate-raw");const b=new Blob([str]).stream().pipeThrough(cs);return new Uint8Array(await new Response(b).arrayBuffer())}
async function exportCode(withDisplay){const F={};for(const k in FIELDS)if(withDisplay||k[0]!="d")F[k]=FIELDS[k];tSave();if(Object.keys(TLOG).length)F["t:log"]=[TLOG,0];if(Object.keys(SUN).length)F["u:sun"]=[SUN,0];
 let body;try{body="Z"+b64u(await zip(JSON.stringify(F)))}catch(e){body="J"+b64u(new TextEncoder().encode(JSON.stringify(F)))}return "N1"+body}
async function decodeCode(raw){let s=String(raw||"").trim();const m=s.match(/N1[ZJ][A-Za-z0-9_-]+/);if(!m)throw new Error("看不懂这个同步码");s=m[0];
 const u=ub64u(s.slice(3));const txt=s[2]=="Z"?new TextDecoder().decode(await zip(u,true)):new TextDecoder().decode(u);return JSON.parse(txt)}
const exportURL=code=>location.origin+location.pathname.replace(/index\.html$/,"")+"#/imp/"+code;
function sumText(s){const p=[];if(s.r)p.push(`改名 ${s.r}`);if(s.m)p.push(`移动 ${s.m}`);if(s.h)p.push(`删除/恢复 ${s.h}`);if(s.c)p.push(`分类 ${s.c}`);if(s.d)p.push("显示设置");if(s.g)p.push(`游戏成绩 ${s.g}`);if(s.s)p.push(`单词复习进度 ${s.s}`);if(s.t)p.push(`学习时长 ${s.t} 天`);if(s.u)p.push(`☀ 重点句 ${s.u}`);return p.length?p.join("，"):"没有新的变化"}
function previewMerge(R){const save=JSON.stringify(FIELDS);const sum={h:0,r:0,m:0,c:0,d:0,g:0,s:0,q:0,o:0};for(const k in R){if(k=="t:log"){sum.t=tMerge(R[k][0],true);continue}if(k=="u:sun"){sum.u=sunMerge(R[k][0],true);continue}const r=R[k],l=FIELDS[k];if(Array.isArray(r)&&(!l||r[1]>l[1])&&(!l||JSON.stringify(l[0])!==JSON.stringify(r[0])))sum[k[0]]++}return sum}
const isStandalone=()=>navigator.standalone===true||matchMedia("(display-mode: standalone)").matches;
const isIOS=()=>/iP(ad|hone|od)/.test(navigator.userAgent)||(navigator.platform=="MacIntel"&&navigator.maxTouchPoints>1);
async function copyText(t){try{await navigator.clipboard.writeText(t);toast("已复制 ✓")}catch(e){const a=document.createElement("textarea");a.value=t;document.body.appendChild(a);a.select();try{document.execCommand("copy");toast("已复制 ✓")}catch(_){toast("请长按文字手动复制")}a.remove()}}
function qrSVG(text){const q=qrcode(0,"M");q.addData(text);q.make();return q.createSvgTag({cellSize:4,margin:2,scalable:true})}
async function showExport(){setHeader("导出整理",true);const wd=localStorage.getItem("nova_exp_d")!="0";
 V.innerHTML=`<div class="card" style="max-width:560px"><label class="tg"><input type="checkbox" id="wd" ${wd?"checked":""}> 同时带上显示设置（字体大小、加粗）</label>
 <div id="qr" class="qr"></div><div class="tip" style="text-align:center">用另一台设备的相机扫这个二维码，或复制下面的同步码</div>
 <textarea id="code" class="code" readonly></textarea><button class="wide flip" id="cp">📋 复制同步码</button><button class="wide gray" id="cpl">🔗 复制链接</button>
 <div class="tip" style="margin-top:10px">同步码包含你的整理（改名、移动、删除、分类）和 🧠 单词复习进度，不包含音频。导入时按“最新的修改为准”合并，不会覆盖另一台设备上更新的修改。</div></div>`;
 const draw=async()=>{const w=document.getElementById("wd").checked;localStorage.setItem("nova_exp_d",w?"1":"0");const c=await exportCode(w);const url=exportURL(c);
  document.getElementById("code").value=c;let qs="";try{qs=qrSVG(url)}catch(e){qs=`<div class="tip">内容太多，二维码放不下了——请用下面的“复制同步码/复制链接”。</div>`}document.getElementById("qr").innerHTML=qs;document.getElementById("cp").onclick=()=>copyText(c);document.getElementById("cpl").onclick=()=>copyText(url)};
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
const ttl=it=>ORG.rename[it.id]||(it.base&&ORG.rename[it.base])||it.title;
async function itemsIn(cid){const mine=(await idbAll().catch(()=>[]));
 return builtinItems().filter(x=>!ORG.hidden[x.it.id]&&effCat(x)==cid).map(x=>({kind:"b",id:x.it.id,title:ttl(x.it),sub:x.it.sub||"",it:x.it}))
  .concat(mine.filter(f=>{const c=allCats().some(c=>c.id==f.cat)?f.cat:"reading";MCAT[f.id]=c;return c==cid}).map(f=>({kind:"m",id:f.id,title:f.name,sub:"我导入的音频",f})))}
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
// ---------- home section icons (SVG line set; the 经典 theme shows the old emoji instead) ----------
const svgI=p=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICON={reading:svgI('<path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5v13c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z"/><path d="M12 6v13.5"/>'),
 flash:svgI('<rect x="3" y="6" width="13" height="15" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/><path d="M7 12h5M7 15.5h3"/>'),
 longaudio:svgI('<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
 dictation:svgI('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>'),
 wf:svgI('<path d="M4 19 9 5l5 14M5.8 14h6.4"/><path d="M16 9h4M18 7v12"/>'),
 g:svgI('<rect x="2.5" y="7" width="19" height="11" rx="5"/><path d="M7.5 10.5v4M5.5 12.5h4"/><circle cx="15.5" cy="11.5" r=".9"/><circle cx="18" cy="13.5" r=".9"/>'),
 k:svgI('<rect x="3" y="3" width="18" height="18" rx="2.5"/><path d="M3 12h18M12 3v9"/><path d="M7 17.5c1.2-1.4 2.8-1.4 4 0"/>'),
 folder:svgI('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>')};
// ---------- themes (Nova 2026-10-20): t1 暖白金 (default) · t2 磨砂玻璃 · t3 海军蓝金 · t4 马卡龙 · t5 杂志 · classic 经典. localStorage nova_theme ----------
const THEMES=[["t1","暖白金","#faf6ee","#b08a2e"],["t2","磨砂玻璃","#b8c8ff","#4f8dfd"],["t3","海军蓝金","#0e1a2b","#e9c46a"],["t4","马卡龙","#ffe9f0","#8a6ad8"],["t5","杂志","#f6f3ec","#c8102e"],["t6","大冰鞭策","#1f3b63","#e8a33d"],["t7","纳瓦尔","#fbfaf7","#1a7f6e"],["classic","经典","#bfe0f7","#f5c518"]];
const THEMEC={t6:"#1f3b63",t7:"#fbfaf7",t1:"#faf6ee",t2:"#a8c8ff",t3:"#0b1524",t4:"#ffffff",t5:"#f6f3ec",classic:"#6fb3e6"};
const curTheme=()=>{const t=localStorage.getItem("nova_theme");return THEMES.some(x=>x[0]==t)?t:"t1"};
function setTheme(t){localStorage.setItem("nova_theme",t);document.documentElement.dataset.theme=t;const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=THEMEC[t]||"#6fb3e6";HQI=-1;if(document.getElementById("hq"))hqStart()}
setTheme(curTheme());
// ---------- theme lines on the home card (t6 大冰鞭策: REAL lines quoted from write-ups of 大冰's livestreams, verbatim, sources in content/dabing_quotes.md; t7 纳瓦尔: VERBATIM Naval lines from her topics + Chinese) ----------
const NAVQ=[["And the journey is not only the reward, the journey is the only thing there is.", "而且过程不只是回报本身，过程就是唯一存在的东西。", 6], ["But essentially, look, all learning is error correction.", "但本质上，你看，所有的学习都是纠错。", 10], ["Every knowledge creation system works through making guesses and correcting errors.", "每一个创造知识的系统，都是靠猜测和纠正错误来运作的。", 10], ["We’re always changing, always learning, always growing, and hopefully we’re correcting errors.", "我们一直在变、一直在学、一直在成长，希望也一直在纠正错误。", 10], ["What this world really lacks right now is authenticity, because everybody wants something.", "现在这个世界真正缺少的是真诚，因为每个人都想要点什么。", 10], ["Most of us are wrong most of the time, especially in any new endeavor.", "我们大多数人大部分时候都是错的，尤其是在做任何新尝试的时候。", 10], ["You only want the respect of the very, very few people that you respect.", "你只需要得到极少数你尊重的人的尊重。", 10], ["Trying to demand respect from the masses is a fool’s errand.", "想强求所有普通大众都尊重你，根本是一件注定徒劳的事。", 10], ["You could focus, you could decide that I don’t want most things.", "你可以专注，你可以决定：大多数东西我都不想要。", 7], ["You can’t be great at everything. You’re just going to waste your energy and waste your time.", "你不可能样样都做得很好。那样你只会浪费精力，浪费时间。", 7], ["so you play the games, you win the games, and then hopefully, you get bored of the games.", "所以你去玩游戏、赢游戏，然后但愿你会玩腻。", 3], ["There’s never been an easier time to make money.", "赚钱从来没有像现在这么容易过。", 11], ["Another way to raise your self-esteem might be to do things for others.", "提升自尊的另一个方法，可能是为别人做事。", 12], ["That was actually the entertaining part and I should have enjoyed it more.", "那其实才是最好玩的部分，我当时应该更享受它。", 4], ["I still want to do things, I just want to do bigger things.", "我还是想做事，只是想做更大的事。", 2], ["and that’s a form of freedom, so not wanting something is as good as having it.", "那就是一种自由，所以不想要一样东西，和拥有它一样好。", 1]];
const DBQ=["你并不弱小，你已经做得很好了……", "从今天晚上开始，你命运的齿轮就开始转动了！", "谁笑话你啊？", "连上了就好。", "说话不要太快", "……去学东西。……你需要投资自己，不是投资别人。", "你不是在比较，你是在发现自己。", "我们很多的人费了很大的努力去成长，最后的目的其实是为了正常。", "……拿出一年到两年的时间，耐住寂寞……", "从今天起，别想太多，先行动。", "……因为你配。", "……等到你36、46的时候是要为今天的自己买单的！"];  // verbatim, sources: content/dabing_quotes.md
const DBB=[["请相信，这个世界上真的有人过着你想要的生活。忽晴忽雨的江湖，祝你有梦为马，随处可栖。", "乖，摸摸头", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["愿你我可以带着最微薄的行李和最丰盛的自己在世间流浪。", "乖，摸摸头", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["不是所有的忍耐都会苦尽甘来，不是所有的努力都会换来成功。……可是，谁说你无权做梦？", "乖，摸摸头", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["这个世界上的大部分传奇，不过是普普通通的人们将心意化作了行动而已。", "乖，摸摸头", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["也许无趣的不是这个世界，而是你我还没找到有趣的活法。", "乖，摸摸头", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["心随念走，身随缘走，不能靠心情活着，而是靠心态活着。", "乖，摸摸头", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["每个硬着骨头敢拼敢搏的人都有个柔软的理由。", "乖，摸摸头", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["会摔吗？会的，而且不止摔一次。……那为什么还要走呢？因为生命应该用来体验和发现……", "乖，摸摸头", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["闪念之间你会发现，总有些东西，并不曾变淡。", "乖，摸摸头", "https://www.juzidao.com/work/bae8237.html"], ["再远的路慢慢走过去就是，心绪是慢悠悠的，脚下也就用不着匆忙赶路。", "乖，摸摸头", "https://www.liatiao.com/jingdian/39050.html"], ["我的生活是过给我自己的，编剧是我，导演是我，主演是我，观众还是我，不是过给别人看的。", "乖，摸摸头", "https://www.liatiao.com/jingdian/39050.html"], ["你喜欢什么不重要，重要的是，你是否有能力去喜欢，是否有尽力去触碰，是否有定力去坚守……", "阿弥陀佛么么哒", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["善良是一种天性，善良是一种选择。", "阿弥陀佛么么哒", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"], ["歧路或坦途，船总要有根龙骨，人总要有个信念。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["人只能靠自己去成全自己，真正对自己负责任的人懂得如何让自己变得完整。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["起点并不决定终点，出身并不决定金身，一辈子这么长，再平庸的人也会遭遇不平凡的人生际遇，你怎么知道你就一定没出息。", "好吗好的", "https://www.liatiao.com/jingdian/39050.html"], ["你自己知道自己很厉害就可以了，完全没必要向别人证明你自己有多厉害。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["每个人都有一首惊世骇俗的歌在等着他。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["……前途风光正好，追风赶月莫停留。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["人难过的时候，还是应该哭一哭的……", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["你所有遥不可及的梦想，都会奔跑成触手可及的理想。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["人活一世，懂事最难，何时懂事都不嫌晚。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["星光不问赶路人，时光不负有心人。", "我不", "https://www.pgsk.com/library/chapter/69167/1.html"], ["这个世界上真的有人在过着你想要的生活。而那些人大都曾隐忍过你尚未经历的挫折。", "我不", "https://www.pgsk.com/library/chapter/69167/1.html"], ["有意思比有意义更有意义。", "我不", "https://www.pgsk.com/library/chapter/69167/1.html"], ["世事大都走的是抛物线，大凡出人头地，总要欲扬先抑。", "我不", "https://www.pgsk.com/library/chapter/69167/1.html"], ["真正的尊重，只属于那些不怕碰壁、不怕跌倒、勇于靠近理想的人。", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/0636b66b3197"], ["光幻想光做梦不行动，叫梦想。敢于奔跑起来的梦想，才是理想。", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/0636b66b3197"], ["最穷无非讨饭，不死就会出头。", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/0636b66b3197"], ["我们可以旅行，但不能没有方向。", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/0636b66b3197"], ["当一个人的内心充满了什么，感受到了什么，他所看到的就会是什么。", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/0636b66b3197"], ["喜欢就好好喜欢，别把执着当认真、放弃当放下、随意当随缘。", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/0636b66b3197"], ["世上没有什么命中注定。所谓命中注定，都基于你过去和当下有意无意的选择。", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/0636b66b3197"], ["为什么你听过了许多道理，却依然过不好这一生……因为您老人家光听，而没有去做啊。", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/e4dcd442e95a"], ["没关系，大不了从头再来……", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/e4dcd442e95a"], ["只要正确的做事，做的就是正确的事。", "阿弥陀佛么么哒", "https://www3.jianshu.com/p/0636b66b3197"], ["只要你对得起舞台，舞台就会对得起你。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["自由、自我、自在的状态并非一蹴而就，世上哪儿来那么多捷径。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["这个世界上没有标准答案，人不是只有一种活法。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["没资格谈论理想时，先好好去挣钱。", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["20岁时立下的目标，36岁时去完成，晚了17年又如何，自己的人生，自然要自己去完整。", "好吗好的", "https://www.wenzhangba.com/jingdianyulu/201903/560014.html"], ["成长带来坦然，不然凄惶给谁看？", "好吗好的", "https://www.wenzhangba.com/jingdianyulu/201903/560014.html"], ["一生太短，尽量和有意思的人一起玩。", "好吗好的", "https://www.wenzhangba.com/jingdianyulu/201903/570937.html"], ["每天人来人往，每个人都是义务老师，读人就是最好的学习……", "好吗好的", "https://www.jianshu.com/p/62e672b96c2e"], ["在决心放弃自己之前，请稍微再等一等。请最后给自己找一个目标，然后试着去完成。", "你坏", "https://www.jianshu.com/p/63bcd8c8cf85"], ["如果你和众人不一样。那就不一样。如果你和世界不一样。那就不一样吧。", "你坏", "https://www.jianshu.com/p/63bcd8c8cf85"], ["平视是最基础的尊重，自洽是最高阶的自尊。", "你坏", "https://www.jianshu.com/p/63bcd8c8cf85"], ["这小半生不停地自缚又不停地松绑，一条条的路，也就一条条地走明白了。", "你坏", "https://www.jianshu.com/p/63bcd8c8cf85"], ["并不指望让全世界都喜欢我，所做的一切只为让我更喜欢我。", "你坏", "https://www.jianshu.com/p/63bcd8c8cf85"], ["许多事情说是永远说不明白的，做着做着就明白了。", "你坏", "https://www3.jianshu.com/p/230c19aa4379"], ["天下之大，怎可能步步莲花。", "你坏", "https://www.wenzhangba.com/jingdianyulu/202010/977021.html"], ["过不去的就搁着，忘不了的就记着。又能怎样，还能怎样，就这样吧，总要接着活。", "你坏", "https://www.jianshu.com/p/63bcd8c8cf85"], ["你有你的专注努力，我有我的平衡精进，都是第一次当人……", "你坏", "https://www3.jianshu.com/p/230c19aa4379"], ["谁的人生都不可能一马平川，与其前途未卜时黯然神伤，不如把这条路认知成一场欲扬先抑的成长。", "他们最幸福", "https://www.99csw.com/book/9551/342459.htm"], ["我们浪费了多少青春才触摸到那些最浅显的道理：人生经历是可以自我创造的，生活方式是可以自我选择的。", "他们最幸福", "https://www.99csw.com/book/9551/342464.htm"], ["幸福的出口绝不单一，并触手可及。", "他们最幸福", "https://www.juzichao.com/ju/163594558178114.html"], ["人嘛，只要咬紧牙关一口气不泄，终会有出头之日。", "小孩", "http://s.klib.me/27058200.html"], ["我向来的做人原则是发自己的光就好，别去吹灭别人的灯。", "小孩", "http://s.klib.me/27058200.html"], ["太在意出路了，反而会没有了出路。", "小孩", "http://s.klib.me/27058200.html"], ["业精于勤，人贵在自律。", "小孩", "http://s.klib.me/27058200.html"], ["当你要承受压力前，总要首先想好解压的方式才行。", "小孩", "http://s.klib.me/27058200.html"], ["人长大了一点，很多话说出口也就没那么难。", "小孩", "http://s.klib.me/27058200.html"], ["人生就是一场迷途，每个迷路的人都在找寻自己的出口。", "小孩", "http://s.klib.me/27058200.html"], ["起点低，就没有站在赛道的权利？原生土壤贫瘠，就注定困在贫瘠里？", "小孩", "http://www.lzmy123.com/duhougan/143135.html"], ["无论如何，自尊总是自己给自己挣来的。", "我不", "http://s.klib.me/917268.html"], ["种因得果，善缘善得，因缘具足须待时日。", "我不", "http://s.klib.me/917268.html"], ["那些动人的故事，大都始于平淡，蕴于普通。", "我不", "http://s.klib.me/917268.html"], ["所有的南墙所有的路，终究还是要靠自己走完，就是这么简单。", "保重", "https://book.douban.com/subject/36081728/blockquotes"], ["好比大风里划火柴，点燃难，保住火苗更难。需护持的，自行护持，不辍不停，不断加柴。", "保重", "https://book.douban.com/subject/36081728/blockquotes"], ["……要紧的是这口气别松，自己给自己行出一个方便。", "保重", "https://dazi.91xjr.com/article/practice/desc-91161.html"], ["归根到底，唯有自救；……还需你自渡自救，自帆自桨。", "保重", "https://book.douban.com/subject/36081728/blockquotes"], ["我总觉得，对年轻人而言，没有比认认真真地去“犯错”更酷更有意义的事情了。", "乖，摸摸头", "https://api3.jianshu.io/p/ce33032dd7b2"], ["心若诚一点儿，自然会成为传奇。", "乖，摸摸头", "https://api3.jianshu.io/p/ce33032dd7b2"], ["靠热情去维持的工作不见得能长久，靠契约精神去履行自己的责任才是王道。", "乖，摸摸头", "https://api3.jianshu.io/p/ce33032dd7b2"], ["执念放下一点儿，智慧就升起一点儿。", "乖，摸摸头", "https://www.99csw.com/book/9549/342266.htm"], ["没有人会倒霉一辈子，就像没人会永远走运一样。", "乖，摸摸头", "https://www.163.com/dy/article/CO64D33O0525GQVJ.html"]];
const NAVX=[["So if you want to have high self-esteem, then earn your own self-respect.", "所以，如果你想要高自尊，就去赢得你自己的自我尊重。", 15], ["So you can create love anytime you want, it’s just that craving to receive it that’s the problem.", "你随时都可以创造爱，问题只在于渴望得到它。", 16], ["I tweeted that just because I think that pride is the enemy of learning.", "我发那条推文，只是因为我认为骄傲是学习的敌人。", 17], ["Back himself again each time, but the key thing is he’s always willing to start over.", "每次都重新押注自己，关键是他永远愿意从头再来。", 18], ["I think a lot of happiness is just a choice in the sense that you make.", "我觉得很多幸福其实就是你做出的一个选择。", 19], ["To the extent you can bring freedom into your life, optimize for that, you’ll actually be more productive.", "尽可能把自由带进你的生活、为它而优化，你反而会更有效率。", 22], ["If I’m inspired to read a book, I want to read it right then.", "如果我被激发想读一本书，我就想马上读。", 22], ["So, you want to have lots and lots of iterations.", "所以，你要有很多很多次迭代。", 29], ["The number of failures doesn’t matter, and so there’s no point in being a pessimist.", "失败的次数并不重要，所以悲观没有意义。", 31], ["Every specific opportunity is probably a fail, but you want to be optimistic in the general.", "每个具体的机会大概都会失败，但总体上你要保持乐观。", 31], ["It’s the overwhelming desire that’s the most important, and the focus that comes from that.", "最重要的是那份压倒一切的渴望，以及由此而来的专注。", 39], ["How you choose to interpret those experiences is up to you, and different people interpret them in different ways.", "你如何解读这些经历由你决定，不同的人会有不同的解读。", 43], ["It’s a better way to learn because you yourself don’t feel flustered or tested or graded.", "这是更好的学习方式，因为你不会感到慌乱、被考、被打分。", 47], ["Take the choice that will leave you more equanimous in the long term—more mental peace in the long term.", "选那个长期让你更平静的选择——长期内心更安宁。", 49], ["The more seriously you take yourself, the unhappier you’re going to be.", "你把自己看得越重，就会越不快乐。", 53], ["I am my own best friend actually, so I really do enjoy spending time with myself.", "其实我是自己最好的朋友，所以我真的很享受和自己相处。", 63], ["I’m going to build something that I think is beautiful, that I want to see exist.", "我要做一个我觉得美、希望它存在的东西。", 64], ["If I’m doing something I enjoy, then I’m already in perpetual retirement.", "如果我在做自己喜欢的事，那我就已经处在永久的退休状态了。", 64], ["Make sure that it’s your overwhelming desire and you don’t have five other desires at the same time.", "确保那是你压倒一切的渴望，而不是同时还有五个别的渴望。", 87]];
const TQ={"t1": ["Maya Angelou", [["You can't use up creativity. The more you use, the more you have.", "创造力用不完。用得越多，拥有的就越多。", "Conversations with Maya Angelou (1989), 1982 interview"], ["Develop enough courage so that you can stand up for yourself and then stand up for somebody else.", "培养足够的勇气，先为自己挺身而出，再为别人挺身而出。", "Rainbow in the Cloud (2014), p. 68"], ["Life is going to give you just what you put in it. Put your whole heart in everything you do, and pray, then you can wait.", "生活给你的，恰是你投入的。做每件事都全心投入，然后就可以等待。", "I Know Why the Caged Bird Sings (1969)"], ["My mission in life is not merely to survive, but to thrive; and to do so with some passion, some compassion, some humor, and some style.", "我的人生使命不只是活下去，而是活得精彩——带点热情、带点慈悲、带点幽默，再带点风格。", "Facebook post, 4 July 2011"], ["This a wonderful day. I've never seen this one before.", "今天真美好。这一天我以前从没见过。", "Tweet, 17 May 2013 (cited in Christian Science Monitor obituary)"], ["When you learn, teach, when you get, give.", "学到了，就去教；得到了，就去给。", "Q&A, Elon News Network, Sept 2012"], ["Without courage we cannot practice any other virtue with consistency.", "没有勇气，我们就无法始终如一地践行其他任何美德。", "USA Today, 5 March 1988"], ["I am capable of what every other human is capable of.", "别人能做到的，我也能做到。", "Quoted in Goal Mapping (2006), p. 84"], ["When I'm writing, I am trying to find out who I am, who we are, what we're capable of……", "我写作的时候，是在努力弄清我是谁、我们是谁、我们能做到什么……", "Paris Review interview (1990)"], ["Nothing can dim the light that shines from within", "没有什么能让内心发出的光变暗", "Quoted in Michelle Obama, The Light We Carry (2022), p. 21"]]], "t2": ["Steve Jobs", [["You can't connect the dots looking forward; you can only connect them looking backwards.", "向前看时你无法把点连起来；只有回头看时才能连起来。", "Stanford commencement address, 12 June 2005"], ["So you have to trust that the dots will somehow connect in your future.", "所以你得相信，这些点总会在未来以某种方式连起来。", "Stanford commencement address, 12 June 2005"], ["The heaviness of being successful was replaced by the lightness of being a beginner again, less sure about everything.", "成功的沉重，被重新做回初学者的轻松取代，对一切都不那么确定。", "Stanford commencement address, 12 June 2005"], ["Sometimes life hits you in the head with a brick. Don't lose faith.", "有时生活会当头给你一砖。别失去信心。", "Stanford commencement address, 12 June 2005"], ["If you haven't found it yet, keep looking. Don't settle.", "如果还没找到，就继续找。别将就。", "Stanford commencement address, 12 June 2005"], ["Your time is limited, so don't waste it living someone else's life.", "你的时间有限，别浪费在活成别人的样子上。", "Stanford commencement address, 12 June 2005"], ["Don't let the noise of others' opinions drown out your own inner voice.", "别让别人意见的噪音，淹没你自己内心的声音。", "Stanford commencement address, 12 June 2005"], ["Stay Hungry. Stay Foolish.", "求知若饥，虚心若愚。", "Stanford commencement address, 12 June 2005"], ["Sometimes when you innovate, you make mistakes. It is best to admit them quickly, and get on with improving your other innovations.", "创新时难免犯错。最好尽快承认，然后接着改进别的创新。", "Quoted in Jeffrey S. Young, Steve Jobs: The Journey Is the Reward (1988)"], ["We used to dream about this stuff. Now we get to build it. It's pretty great.", "我们以前只能梦想这些。现在我们能亲手做出来了。真棒。", "WWDC keynote, June 2004"]]], "t3": ["Bruce Lee", [["I'm still learning, for learning is boundless.", "我仍在学习，因为学无止境。", "Jeet Kune Do (1997), Part 6"], ["Life itself is your teacher, and you are in a state of constant learning.", "生活本身就是你的老师，你一直都在学习之中。", "Striking Thoughts (2000), p. 5"], ["Running water never grows stale. So you just have to 'keep on flowing.'", "流水不腐。所以你只要“一直流动”。", "The Warrior Within (1996), p. 48"], ["Make at least one definite move daily toward your goal.", "每天至少朝目标迈出明确的一步。", "Jeet Kune Do (1997), Part 6"], ["If you spend too much time thinking about a thing, you'll never get it done.", "在一件事上想得太久，就永远做不成。", "Striking Thoughts (2000), p. 43"], ["Not failure, but low aim, is the crime. In great attempts it is glorious even to fail.", "可耻的不是失败，而是目标太低。在伟大的尝试中，即使失败也是光荣的。", "Striking Thoughts (2000), p. 121"], ["A goal is not always meant to be reached, it often serves simply as something to aim at.", "目标不一定非要达到，它常常只是让你有个瞄准的方向。", "Striking Thoughts (2000), p. 121"], ["Research your own experience; absorb what is useful, reject what is useless and add what is essentially your own.", "研究你自己的经验；吸收有用的，舍弃无用的，再加上真正属于你自己的。", "Striking Thoughts (2000), p. 176"], ["Use only that which works, and take it from any place you can find it.", "只用管用的，无论它来自哪里。", "Quoted in Bruce Thomas, Bruce Lee: Fighting Spirit (1994), p. 44"], ["Things live by moving and gain strength as they go.", "万物在运动中生存，并在前进中变强。", "Striking Thoughts (2000), p. 5"], ["Knowledge will give you power, but character respect.", "知识给你力量，品格给你尊重。", "Striking Thoughts (2000), p. 46"]]], "t4": ["Mister Rogers", [["You are an important person just the way you are.", "你本来的样子，就是一个重要的人。", "U.S. District Court testimony, Sept 1979"], ["You've made this day a special day, by just your being you.", "只因为你是你，你就让今天变得特别。", "U.S. Senate testimony, 1 May 1969"], ["There's no person in the whole world like you; and I like you just the way you are.", "全世界没有第二个你；我就喜欢你本来的样子。", "U.S. Senate testimony, 1 May 1969"], ["It's our insides that make us who we are, that allow us to dream and wonder and feel for others.", "是我们的内心让我们成为自己，让我们能做梦、好奇、体会别人。", "Middlebury College commencement, May 2001"], ["Little by little we human beings are confronted with situations that give us more and more clues that we aren't perfect.", "我们人类一点一点地遇到各种情况，越来越明白自己并不完美。", "Mister Rogers' Neighborhood: Thoughts For All Ages (PBS)"], ["What gives me my good feelings is that we always cared and always tried to do our best.", "让我感觉好的是：我们一直用心，也一直尽力。", "Foreword, Many Ways to Say I Love You"], ["We just don't get to be competent human beings without a lot of different investments from others.", "没有别人许多不同的付出，我们成不了能干的人。", "Dartmouth College commencement, 9 June 2002"], ["There is something of yourself that you leave at every meeting with another person.", "每次与人相遇，你都会留下一点自己。", "Mister Rogers' Neighborhood: Thoughts For All Ages (PBS)"], ["It's our job to encourage each other to discover that uniqueness……", "我们的任务，是鼓励彼此发现自己的独特……", "Mister Rogers' Neighborhood: Thoughts For All Ages (PBS)"], ["Always look for the helpers. There's always someone who is trying to help.", "总要去找那些帮忙的人。总会有人在努力帮忙。", "Mister Rogers Talks with Parents (1983), p. 177"]]], "t5": ["胡适", [[null, "你要深信：天下沒有白費的努力。", "《贈與今年的大學畢業生》"], [null, "成功不必在我，而功力必不唐捐。", "《贈與今年的大學畢業生》"], [null, "人生的意義不在於何以有生，而在於自己怎樣生活。", "《人生有何意義》"], [null, "大家少說點空話，多讀點好書！", "《發起〈讀書雜誌〉的緣起》"], [null, "要怎麼收穫，先怎麼栽。", "應冰心之請題，1961年4月"], [null, "信心只是敢於肯定一個不可知的將來的勇氣。", "《寫在孔子誕辰紀念之後》"], [null, "……天下多少事業，皆起於一二人之夢想……", "《藏暉室札記節錄》"], [null, "把自己铸造成器，方才可以希望有益于社会。", "《介紹我自己的思想》"], [null, "真實的為我，便是最有益的為人。", "《易卜生主義》"]]], "classic": ["Michael Jordan", [["I can accept failure. Everyone fails at something. But I can't accept not trying.", "我能接受失败。谁都会在某件事上失败。但我不能接受不去尝试。", "I Can't Accept Not Trying (1994), p. 20"], ["I've failed over and over and over again in my life. And that is why I succeed.", "我一生中一次又一次地失败。这正是我成功的原因。", "Nike ad (1997), quoted in Nike Culture (1998)"], ["I approached everything step by step.", "我做什么都是一步一步来。", "How to Be Like Mike (2005)"], ["Limits, like fears, are often just an illusion", "极限，和恐惧一样，常常只是一种错觉", "Hall of Fame induction speech, 2009"], ["Enjoy every minute of life. Never second-guess life.", "享受生活的每一分钟。别对人生瞻前顾后。", "How to Be Like Mike (2005)"], ["Talent wins games, but teamwork and intelligence wins championships.", "天赋赢得比赛，团队和智慧赢得冠军。", "I Can't Accept Not Trying (1994), p. 24"]]]};
var HQI=-1,HQT=0;
function hqList(){const t=curTheme();if(t=="t6")return DBQ.map(x=>({z:x,by:"大冰直播",d:1})).concat(DBB.map(x=>({z:x[0],by:"大冰《"+x[1]+"》",d:1})));if(t=="t7")return NAVQ.concat(NAVX).map(q=>({e:q[0],z:q[1],by:"Naval, Chris Williamson 访谈（Topic "+q[2]+"）"}));const q=TQ[t];return q?q[1].map(x=>({e:x[0],z:x[1],by:q[0]+(/^《/.test(x[2])?"":/[\u4e00-\u9fff]/.test(q[0])?"，":", ")+x[2]})):[]}
function rndInt(n){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0]%n}
function qShuf(n,avoid){const o=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=rndInt(i+1);[o[i],o[j]]=[o[j],o[i]]}if(n>1&&o[0]===avoid){const j=1+rndInt(n-1);[o[0],o[j]]=[o[j],o[0]]}return o}
function qNext(n){const k="nova_qbag_"+curTheme();let b=null;try{b=JSON.parse(localStorage.getItem(k))}catch(e){}
 if(!b||b.n!==n||!Array.isArray(b.o)||b.o.length!==n)b={n,o:qShuf(n,-1),p:-1};b.p++;if(b.p>=n){b={n,o:qShuf(n,b.o[n-1]),p:0}}localStorage.setItem(k,JSON.stringify(b));return b.o[b.p]}
function hqHTML(adv){const L=hqList();if(!L.length)return "";if(adv||HQI<0||HQI>=L.length)HQI=qNext(L.length);const q=L[HQI];
 if(q.d)return `<span class="hqd">${esc(q.z)}</span><span class="hqs">——${esc(q.by)}</span>`;
 return q.e?`<span class="hqe en">“${esc(q.e)}”</span><span class="hqz">${esc(q.z)}</span><span class="hqs">——${esc(q.by)}</span>`:`<span class="hqd">${esc(q.z)}</span><span class="hqs">——${esc(q.by)}</span>`}
function hqSet(anim){const e=document.getElementById("hq");if(!e)return;const b=document.getElementById("qb");if(!anim){e.innerHTML=hqHTML(1);if(b)b.hidden=!e.innerHTML;return}
 const h0=e.offsetHeight;e.style.height=h0+"px";e.classList.add("fade");setTimeout(()=>{e.innerHTML=hqHTML(1);e.style.height="auto";const h1=e.offsetHeight;e.style.height=h0+"px";e.offsetHeight;e.style.height=h1+"px";e.classList.remove("fade");setTimeout(()=>{e.style.height=""},420)},350)}
function hqNext(){hqSet(1);hqTimer();const m=document.querySelector("#qb .qm");if(m){m.classList.remove("tap");void m.offsetWidth;m.classList.add("tap");setTimeout(()=>m.classList.remove("tap"),900)}}
function hqTimer(){clearInterval(HQT);HQT=setInterval(()=>{if(!document.getElementById("hq")){clearInterval(HQT);return}hqSet(1)},30000)}
function hqStart(){hqSet(0);const b=document.getElementById("qb");if(!b)return;b.querySelector(".qm").onclick=ev=>{ev.stopPropagation();hqNext()};hqTimer()}
function gear(){const h=document.getElementById("hdr-r");h.innerHTML=`<button id="gear" aria-label="设置">⚙︎</button>`;document.getElementById("gear").onclick=()=>location.hash="#/s"}
// ---------- goal progress bar (2026-10-23): ONLY from real test scores in content/progress.json; never from check-ins/streaks ----------
function pgbSkill(T,W,n){let sum=0,wt=0;const per={};for(const k in W){const xs=T.filter(t=>t.s&&t.s[k]).slice(-n).map(t=>t.s[k][0]/t.s[k][1]);if(!xs.length)continue;per[k]=xs.reduce((x,y)=>x+y,0)/xs.length;sum+=per[k]*W[k];wt+=W[k]}return{v:wt?sum/wt:0,per}}
function pgbCalc(P,base){const T=P.tests||[];if(!T.length)return null;const C=P.components,TP=P.topics||[];
 const sk=pgbSkill(base?T.slice(0,1):T,P.skill_weights,P.recent||3);
 const st=base?TP.map(t=>({studied:t.n<=P.baseline_studied,passed:false})):TP;
 const ns=st.filter(t=>t.studied&&!t.passed).length,np=st.filter(t=>t.passed).length;
 const D=base?[]:(P.daily||[]).slice(-14);
 const part={topics:TP.length?(np+0.5*ns)/TP.length:null,daily:D.length?D.reduce((x,y)=>x+y.pct,0)/D.length/100:null,speaking:sk.per.speaking!=null?sk.per.speaking:null};
 let tot=0,w=0;for(const k in C)if(part[k]!=null){tot+=part[k]*C[k];w+=C[k]}
 return{pct:w?Math.round(tot/w*100):0,part,np,ns,N:TP.length,D}}
async function pgbFill(){const el=document.getElementById("pgb");if(!el)return;let P;try{P=await getJSON("progress.json")}catch(e){return}const r=pgbCalc(P);if(!r)return;
 const b0=pgbCalc(P,1),base=b0?b0.pct:0,C=P.components,last=P.tests[P.tests.length-1],q=x=>Math.round(x*100);
 const CW=Object.values(C).reduce((x,y)=>x+y,0),cw=k=>Math.round(C[k]/CW*100);const L={topics:`Topic 掌握 ${cw("topics")}%：考过 ${r.np} 个（各算1）、学过未考过 ${r.ns} 个（各算0.5），共 ${r.N} 个 → ${q(r.part.topics)}%`,daily:`每日小测 ${C.daily}%：${r.part.daily!=null?q(r.part.daily)+"%":"还没有记录，暂不计入"}`,speaking:`口语 ${cw("speaking")}%：${r.part.speaking!=null?q(r.part.speaking)+"%（周考口语）":"暂无"}`};
 el.innerHTML=`<div class="pgt"><b>纳瓦尔</b><span>已走 <em>${r.pct}%</em> · 还差 <em>${100-r.pct}%</em></span></div><div class="pgtr" role="progressbar" aria-valuenow="${r.pct}" aria-valuemin="0" aria-valuemax="100"><div class="pgf" style="width:${r.pct}%"></div>${(P.milestones||[]).map(m=>`<div class="pgk" style="left:${m}%"><span>${m}</span></div>`).join("")}<div class="pgm" style="left:${base}%" title="起点"></div><div class="pgg" style="left:${P.graduate||80}%" title="毕业">🏁</div></div>${r.pct>=(P.graduate||80)?`<div class="pgw">你真牛！纳瓦尔毕业啦 🎉</div>`:""}<div class="pgl"><button class="pgh" aria-expanded="false">详情 ›</button></div><div class="pgx" hidden><div>▲起点 ${base}%（${esc(P.tests[0].label)}）</div><div class="pgend">🏁 80% = 毕业，换下一个视频或演讲</div>这是根据<b>真实记录</b>估算的，不是精确测量；打卡和学习时长不算。<br>${Object.keys(C).map(k=>L[k]).join("<br>")}<br>没数据的部分先不算，其余按比例重算。最近一次周考：${esc(last.label)} ${esc(last.total||"")}。</div>`;
 el.hidden=false;el.querySelector(".pgh").onclick=ev=>{const x=el.querySelector(".pgx"),bt=ev.currentTarget;x.hidden=!x.hidden;bt.textContent=x.hidden?"详情 ›":"收起 ‹";bt.setAttribute("aria-expanded",!x.hidden)}}
async function showHome(){setHeader("Nova 英语",false);gear();const cs=allCats();const counts=await Promise.all(cs.map(c=>itemsIn(c.id).then(a=>a.length)));
 V.innerHTML=`<div class="hero"><img src="icons/icon-192.png" alt=""><div class="hgreet"><b>Hi, Nova! 🌻</b></div><button id="stt" class="stt" aria-label="学习时长">${sttHTML()}</button><div class="hdate" id="yec">${yecHTML()}</div></div><div class="qbar" id="qb"><div class="hq" id="hq" aria-live="polite"></div><button class="qm" aria-label="换一句" title="换一句"><span class="qmi"></span></button></div><div class="pgb" id="pgb" hidden></div><div class="tiles">${cs.map((c,k)=>`<div class="tw"><button class="tile" data-c="${c.id}"><span class="ic"><span class="ice">${c.icon}</span><span class="ics">${ICON[c.id]||ICON.folder}</span></span><span class="nm">${c.id in SECN?`<span class="no">${SECN[c.id]}</span>`:""}${esc(c.name)}</span><span class="ds">${esc(c.desc)}</span><span class="ct">${counts[k]} 项</span><span class="tsec" data-s="${c.id}">${secHTML(c.id)}</span></button>${c.builtin?"":`<button class="dots" data-m="${c.id}" aria-label="更多">⋯</button>`}</div>`).join("")}
 <button class="tile gtile" onclick="location.hash='#/wf'"><span class="ic"><span class="ice">🔤</span><span class="ics">${ICON.wf}</span></span><span class="nm"><span class="no">5</span>词形练习</span><span class="ds">名词 · 动词 · 形容词 · 副词</span><span class="ct">每个单元一套</span><span class="tsec" data-s="wf">${secHTML("wf")}</span></button><button class="tile gtile" onclick="location.hash='#/g'"><span class="ic"><span class="ice">🎮</span><span class="ics">${ICON.g}</span></span><span class="nm"><span class="no">6</span>小游戏</span><span class="ds">拼写 · 拼图 · 填词</span><span class="ct">每个单元都能玩</span><span class="tsec" data-s="g">${secHTML("g")}</span></button><button class="tile gtile" onclick="location.hash='#/k'"><span class="ic"><span class="ice">🎬</span><span class="ics">${ICON.k}</span></span><span class="nm"><span class="no">7</span>画面漫画</span><span class="ds">原句变漫画 · 关键词看图</span><span class="ct">每个单元 2–3 张</span><span class="tsec" data-s="k">${secHTML("k")}</span></button>
 <button class="tile add" id="newc"><span class="ic">＋</span><span class="nm">新建分类</span></button></div>`;
 document.getElementById("stt").onclick=showTimeLog;hqStart();pgbFill();V.querySelectorAll("[data-c]").forEach(b=>{const c=cs.find(x=>x.id==b.dataset.c);b.onclick=()=>{if(tapOK())location.hash="#/c/"+c.id};if(!c.builtin)longPress(b,()=>catMenu(c))});
 V.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>catMenu(cs.find(x=>x.id==b.dataset.m)));
 document.getElementById("newc").onclick=async()=>{const n=await ask("新分类的名字");if(n){ORG.cats.push({id:"u"+Date.now(),name:n});saveOrg();route()}}}
async function showCat(id){if(id=="chunks"){location.replace("#/c/dictation");return}const c=allCats().find(x=>x.id==id);if(!c)return showHome();setHeader(secT(c.id,c.name),true);
 const xs=await itemsIn(id);
 V.innerHTML=`${id=="flash"?'<div id="srsent" class="srsent"></div>':""}${id=="dictation"?'<p class="tip">选一个 Topic。只听采访原声，把整句写下来，再核对。</p>':""}<div class="list">${xs.length?xs.map((x,k)=>`<div class="lw"><button class="li" data-k="${k}"><span class="tt">${x.kind=="m"?"🎵 ":""}${esc(x.title)}<span class="sb">${esc(x.sub)}</span></span></button></div>`).join(""):`<div class="done">这个分类还是空的</div>`}</div>
 <div class="import"><label class="btn" style="display:flex;align-items:center;justify-content:center">＋ 导入我的 MP3 到「${esc(c.name)}」<input type="file" accept="audio/*" style="display:none" id="imp"></label></div>`;
 V.querySelectorAll("[data-k]").forEach(b=>{const x=xs[+b.dataset.k];b.onclick=()=>{if(tapOK())location.hash=(x.kind=="m"?"#/m/":"#/i/")+x.id}});
 if(id=="flash")srsEntry(document.getElementById("srsent"));
 document.getElementById("imp").onchange=async e=>{const f=e.target.files[0];if(!f)return;await idbPut({id:"m"+Date.now(),cat:id,name:f.name.replace(/\.[^.]+$/,""),blob:f});showCat(id)}}
const ZOOMS=[["小",.9],["标准",1.1],["大",1.25],["特大",1.4],["超大",1.6]];
const curZoom=()=>parseFloat(localStorage.getItem("nova_zoom"))||1.1;
function setZoom(z,noStamp){localStorage.setItem("nova_zoom",z);document.documentElement.style.setProperty("--z",z);if(!noStamp)saveDisplay()}
function showSettings(){setHeader("设置",true);const hid=builtinItems().filter(x=>ORG.hidden[x.it.id]);
 const rbo=sessionStorage.getItem("nova_rb_open")=="1";  // 回收站 collapsed by default; open/closed remembered for this session only
 V.innerHTML=`<button class="sec rbh" id="rbh" aria-expanded="${rbo}" aria-controls="rbb">🗑 回收站 (${hid.length}) <span class="rbc">${rbo?"▾":"▸"}</span></button><div id="rbb"${rbo?"":" hidden"}><div class="tip">已删除的自带材料，点“恢复”放回原处。</div><div class="list">${hid.length?hid.map(x=>`<div class="lw"><div class="li"><span class="tt">${esc(ttl(x.it))}<span class="sb">${esc(x.it.sub||"")}</span></span></div><button class="rs" data-r="${x.it.id}">恢复</button></div>`).join(""):`<div class="done">回收站是空的</div>`}</div>
 ${hid.length>1?`<button class="wide flip" id="rall">全部恢复</button>`:""}</div>
 <h3 class="sec">↺ 还原</h3><button class="wide gray" id="reset">把所有自带材料的名字和位置恢复成原样</button>
 <h3 class="sec">🔁 同步（在 iPad 和手机之间）</h3><div class="yn" style="margin-top:0"><button class="wide flip" style="margin-top:0" onclick="location.hash='#/exp'">📤 导出整理</button><button class="wide gray" style="margin-top:0" onclick="location.hash='#/imp'">📥 导入</button></div>
 <h3 class="sec">🧠 今日复习</h3><div class="li" style="display:block"><div style="margin-bottom:8px">每天最多学几个新词</div><div class="zs">${[5,10,15,20,30].map(n=>`<button class="btn${n==srsNewCap()?" on":""}" data-nc="${n}">${n}</button>`).join("")}</div></div>
 <h3 class="sec">🎨 主题</h3><div class="li" style="display:block"><div class="thp">${THEMES.map(([id,n,bg,ac])=>`<button class="thb${id==curTheme()?" on":""}" data-th="${id}" aria-pressed="${id==curTheme()}"><span class="sw" style="background:${bg}"><i style="background:${ac}"></i><i style="background:${ac};opacity:.45"></i></span><span class="thn">${n}</span></button>`).join("")}</div></div>
 <h3 class="sec">🔠 显示</h3><div class="li" style="display:block">
  <div style="margin-bottom:8px">字体大小</div><div class="zs">${ZOOMS.map(([n,z])=>`<button class="btn${Math.abs(z-curZoom())<.01?" on":""}" data-z="${z}">${n}</button>`).join("")}</div>
  <label class="tg"><input type="checkbox" id="bold" ${document.documentElement.classList.contains("bold")?"checked":""}> 字体加深加粗</label>
  <div class="pv"><b class="en">conventional wisdom</b> <span class="z">普遍看法</span><p class="en" style="margin:6px 0 0">Conventional wisdom is what most people believe is true.</p></div></div>
 <h3 class="sec">🔄 更新</h3><div class="li" style="display:block;line-height:1.7">App 版本：<b>${esc(META.v||"?")}</b>　(${esc(META.built||"")})<br>内容目录版本：<b>${esc(META.cv||"?")}</b><br>后台程序版本：<b id="swv">${esc(SWV||"…")}</b><br>离线音频已下载：<b id="fillst">${FILL?FILL.have+" / "+FILL.total:"…"}</b></div>
 <button class="wide flip" id="chk">检查更新</button><button class="wide no" id="force">强制更新（清除缓存并重新加载）</button>
 <div class="tip" style="margin-top:14px">这些整理只保存在这台设备上；导入的 MP3 删除后无法恢复。</div>`;
 V.querySelectorAll("[data-nc]").forEach(b=>b.onclick=()=>{stamp("o:srsnew",+b.dataset.nc);srsSave();V.querySelectorAll("[data-nc]").forEach(x=>x.classList.toggle("on",x==b))});
 V.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{setTheme(b.dataset.th);V.querySelectorAll("[data-th]").forEach(x=>{x.classList.toggle("on",x==b);x.setAttribute("aria-pressed",x==b)})});
 V.querySelectorAll("[data-z]").forEach(b=>b.onclick=()=>{setZoom(+b.dataset.z);V.querySelectorAll("[data-z]").forEach(x=>x.classList.toggle("on",x==b))});
 document.getElementById("bold").onchange=e=>{document.documentElement.classList.toggle("bold",e.target.checked);localStorage.setItem("nova_bold",e.target.checked?"1":"0");saveDisplay()};
 document.getElementById("chk").onclick=()=>checkUpdate(true);document.getElementById("force").onclick=async()=>{if(await sure("强制更新？\n会清除离线缓存后重新下载（你的整理和导入的音频不受影响）。","强制更新"))forceUpdate()};
 navigator.serviceWorker&&navigator.serviceWorker.controller&&(navigator.serviceWorker.controller.postMessage({t:"ver"}),navigator.serviceWorker.controller.postMessage({t:"fill"}));
 setTimeout(()=>{const e=document.getElementById("swv");if(e&&SWV)e.textContent=SWV},800);
 V.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{delete ORG.hidden[b.dataset.r];saveOrg();showSettings()});
 const ra=document.getElementById("rall");if(ra)ra.onclick=()=>{ORG.hidden={};saveOrg();showSettings()};
 {const h=document.getElementById("rbh"),b=document.getElementById("rbb");h.onclick=()=>{const o=b.hidden;b.hidden=!o;h.setAttribute("aria-expanded",o);h.querySelector(".rbc").textContent=o?"▾":"▸";sessionStorage.setItem("nova_rb_open",o?"1":"0")}}
 document.getElementById("reset").onclick=async()=>{if(await sure("恢复所有自带材料的原名字和原分类？（回收站和你建的分类不受影响）","恢复原样")){ORG.rename={};ORG.move={};saveOrg();showSettings()}}}
async function showMine(id){const f=(await idbAll()).find(x=>x.id==id);if(!f)return showHome();setHeader(f.name,true);
 V.innerHTML=`<div class="player"><audio id="au" controls src="${URL.createObjectURL(f.blob)}"></audio><div class="pb"><button class="p" id="pp" aria-label="播放/暂停">▶</button><button class="btn" id="sp">速度 1x</button><button class="btn" id="del">删除这个音频</button></div></div>`;
 const au=document.getElementById("au");wirePP(document.getElementById("au"));let r=[1,.85,.75],i=0;document.getElementById("sp").onclick=e=>{i=(i+1)%3;au.playbackRate=r[i];e.target.textContent="速度 "+r[i]+"x"};
 document.getElementById("del").onclick=async()=>{if(await sure("永久删除这个导入的音频？")){await idbDel(id);history.back()}}}
async function showItem(id){if(/^ch_t\d+$/.test(id)){location.replace("#/c/dictation");return}
 let it,cat;for(const c of CAT.categories){const x=c.items.find(i=>i.id==id);if(x){it=x;cat=c}}if(!it)return showHome();
 setHeader(secT(cat&&cat.id,ttl(it)),true);V.innerHTML=`<div class="done">加载中…</div>`;const d=await getJSON(it.data);
 if(it.dictation||(cat&&cat.id=="dictation"))return viewDictation(d,it);
 if(d.type=="chunks"){location.replace("#/c/dictation");return}
 const view=({reading:viewReading,flash:viewFlash,words:viewWords,longaudio:viewLong})[d.type];
 if(view)view(d,id);else V.innerHTML=`<div class="done">这个内容打不开</div>`}
// ---------- reading card ----------
// 3D flip a reading card to its Chinese translation (size kept via min-height of the front)
function flipCard(e){if(e._fl)return;e._fl=1;const b=e.querySelector(".body");if(!e.classList.contains("zh"))b.style.minHeight=b.offsetHeight+"px";e.classList.add("flipping");
 setTimeout(()=>{e.classList.toggle("zh");if(e.classList.contains("zh")){const h0=parseFloat(b.style.minHeight);b.style.minHeight="0";const h1=b.scrollHeight;b.style.minHeight=h0+"px";requestAnimationFrame(()=>{b.style.transition="min-height .25s ease";b.style.minHeight=Math.max(h0,h1)+"px";setTimeout(()=>b.style.transition="",300)})}e.classList.remove("flipping");e.classList.add("unflip");setTimeout(()=>{e.classList.remove("unflip");e._fl=0;if(!e.classList.contains("zh"))b.style.minHeight=""},230)},230)}
function stTop(){const ss=document.getElementById("ss");let b=0;for(const e of document.querySelectorAll("body *")){if(ss&&ss.contains(e))continue;const p=getComputedStyle(e).position;if(p!="sticky"&&p!="fixed")continue;const r=e.getBoundingClientRect();for(const x of [e,...e.querySelectorAll("*")]){const r=x.getBoundingClientRect();if(r.height>0&&r.top<innerHeight*.4&&r.bottom<innerHeight*.6)b=Math.max(b,r.bottom)}}return b}
function viewReading(d,rid){rid=rid||d.id||"";const SP=[1,.85,.75];let si=0,cur=-1;const F={loop:false,shad:false,hid:localStorage.getItem("rd_hid")=="1"};
 V.innerHTML=`<div class="bar"><button id="stp">■ 停止</button><button id="all" class="red">▶ 全部连播</button><button id="loop">单句循环</button><button id="spd">速度 1x</button><button id="hid">隐藏文字</button>${d.oaudio?'<button id="oall" class="org">🎙 原声连播</button><button id="oloop" class="org">🔁 原声循环</button>':""}${d.sents.some(x=>x.seg&&x.oa)?'<button id="dd" class="org">👆 点读</button>':""}</div><div class="status" id="st"></div><div id="ss"></div>`;
 const ss=document.getElementById("ss"),st=x=>document.getElementById("st").textContent=x;
 d.sents.forEach((s,i)=>{const e=document.createElement("div");e.className="s "+s.sp.toLowerCase();e.id="s"+i;
  e.classList.toggle("lit",sunHas(rid,i));e.innerHTML=`<div class="body"><div class="who"><span class="sno" aria-label="第${i+1}句">${i+1}</span><button class="sun" aria-label="标记重点" aria-pressed="${sunHas(rid,i)}">☀</button>${s.sp=="Naval"?"NAVAL RAVIKANT":"CHRIS WILLIAMSON"}</div><div class="fr"><div class="t"></div>${s.oa?'<button class="osb ai" aria-label="AI 朗读">🤖 AI</button>':""}</div>${s.zh?'<div class="zhb"><div class="zhe"></div><div class="zht"></div>'+((s.bkw||s.gloss||[]).length||(s.bkc||[]).length?'<div class="gl">'+((s.bkw||s.gloss||[]).length?'<div class="glh">生词</div>':'')+(s.bkw||s.gloss||[]).map(g=>`<div class="gli"><button class="gls" data-w="${esc(g[0])}">🔊</button><b>${esc(g[0])}</b> · <i>${esc(g[1])} ${({"n.":"名词","v.":"动词","adj.":"形容词","adv.":"副词","phr.":"短语","conj.":"连词","int.":"感叹词"})[g[1]]||""}</i> · ${esc(g[2])}${g[4]?`<div class="glg">${esc(g[3])} 底层逻辑：${esc(g[4])}</div>`:""}</div>`).join("")+((s.bkc||[]).length?'<div class="glh">搭配 · Chunks</div>'+s.bkc.map(c=>`<div class="gli glc"><button class="gls" data-w="${esc(c[0])}">🔊</button><b>${esc(c[0])}</b> · ${esc(c[1])}</div>`).join(""):'')+'</div>':"")+'</div>':""}</div><button class="p">▶</button>`;
  e.querySelector(".t").textContent=s.t;const ze=e.querySelector(".zhe");if(ze)ze.textContent=s.t;{const sb=e.querySelector(".sun");const stop=ev=>ev.stopPropagation();sb.addEventListener("pointerdown",stop);sb.addEventListener("touchstart",stop,{passive:true});sb.onclick=ev=>{ev.stopPropagation();ev.preventDefault();const on=sunToggle(rid,i);e.classList.toggle("lit",on);sb.setAttribute("aria-pressed",on)}}if(s.zh){e.querySelector(".zht").textContent=s.zh;e.querySelectorAll(".gls").forEach(b=>b.onclick=ev=>{ev.stopPropagation();sayEN(b.dataset.w.replace(/…/g," "),b)});glossSrc(e,s,i);e.onclick=()=>flipCard(e)}e.querySelector(".p").onclick=ev=>{ev.stopPropagation();stopAll();setAll(false);seq([i],!!s.oa)};if(s.oa)e.querySelector(".osb").onclick=ev=>{ev.stopPropagation();stopAll();setAll(false);seq([i],false,ev.currentTarget)};ss.appendChild(e)});{const LK="nova_last_"+rid;const L=+localStorage.getItem(LK)||0;if(L>0){const t=document.getElementById("s"+L);if(t){const go=()=>{if(!document.body.contains(t))return;const off=stTop()+8;scrollTo(0,t.getBoundingClientRect().top+scrollY-off)};setTimeout(go,350);setTimeout(go,1100)}}
 let lt=0;const sv=()=>{if(!document.body.contains(ss)){removeEventListener("scroll",sv);return}clearTimeout(lt);lt=setTimeout(()=>{const y=stTop()+10;const c=[...ss.children].find(x=>x.getBoundingClientRect().bottom>y);if(c)localStorage.setItem(LK,c.id.slice(1))},250)};addEventListener("scroll",sv,{passive:true})}
 // gloss line 3: where the word appears (点读 phrase or sentence) + 🌻 plays the original segment containing it
 function glossSrc(e,s,i){const W=s.t.split(/\s+/),nz=x=>x.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9']/g,"");
  e.querySelectorAll(".gli:not(.glc)").forEach((li,gk)=>{const g=(s.bkw||s.gloss)[gk];if(!g)return;const q=g[0].replace(/…/g," ").split(/\s+/).map(nz).filter(Boolean);let at=-1;
   const IRR={got:"get",gotten:"get",caught:"catch",took:"take",taken:"take",thought:"think",him:"someone",her:"someone",them:"someone",me:"someone",that:"someone"};const m=(tok,w)=>{const t=nz(tok);if(t==w||IRR[t]==w)return true;if(w=="be"&&/^(is|am|are|was|were|been|being)$/.test(t))return true;const st=w.length>4?w.slice(0,w.length-(/[ey]$/.test(w)?1:0)).slice(0,Math.max(4,w.length-2)):w;return t.startsWith(st)&&t.length<=w.length+4};
   const gap=/…/.test(g[0]);let hit=null;
   for(let k=0;k<W.length&&!hit;k++){if(!m(W[k],q[0]))continue;const idx=[k];let j=k,ok=true;
    for(const w of q.slice(1)){j++;if(gap)while(j<W.length&&!m(W[j],w)&&j-k<8)j++;if(j>=W.length||!m(W[j],w)){ok=false;break}idx.push(j)}
    if(ok)hit=idx}
   if(!hit)for(let k=0;k<W.length&&!hit;k++)if(m(W[k],q[0]))hit=[k];
   if(!hit)return;at=hit[0];const last=hit[hit.length-1],HS=new Set(hit);
   let x0=0,x1=W.length-1,a=null,b=null,src=s.oa||null;const sg=(s.seg||[]).find(z=>z[0]<=at&&at<=z[1]);
   if(sg&&s.oa&&W.length>14){x0=sg[0];x1=Math.max(sg[1],Math.min(last,W.length-1));const sg2=(s.seg||[]).find(z=>z[0]<=x1&&x1<=z[1])||sg;a=sg[2];b=sg2[3]}else if(sg&&s.oa){a=sg[2];const sg2=(s.seg||[]).find(z=>z[0]<=last&&last<=z[1])||sg;b=sg2[3]}
   const html=W.slice(x0,x1+1).map((w,k)=>HS.has(k+x0)?`<b>${esc(w)}</b>`:esc(w)).join(" ");
   const d=document.createElement("div");d.className="gsr";d.innerHTML=`<button class="gsb" aria-label="原声">${s.oa?"🌻":"🔊"}</button><span class="gst">${x0>0?"…":""}${html}${x1<W.length-1?"…":""}</span>`;li.appendChild(d);
   d.querySelector(".gsb").onclick=async ev=>{ev.stopPropagation();const btn=ev.currentTarget;stopAll();const me=RUN;if(!s.oa){LASTBTN=btn;playP(s.a,1,s.t);return}
    A.onended=A.onerror=null;A.src=await audioURL(s.oa);A.playbackRate=1;btn.classList.add("on");const st0=a??0;const go=()=>{try{A.currentTime=st0}catch(e){}A.play().catch(()=>{})};if(A.readyState>=1)go();else A.addEventListener("loadedmetadata",go,{once:true});
    const tick=()=>{if(me!=RUN||A.ended||(b!=null&&A.currentTime>=b)){if(me==RUN&&b!=null)A.pause();btn.classList.remove("on");return}requestAnimationFrame(tick)};requestAnimationFrame(tick);window._gs={i,gk,a:st0,b,src:s.oa}}})}
 const mark=i=>{document.querySelectorAll(".cur").forEach(x=>x.classList.remove("cur"));cur=i;const e=document.getElementById("s"+i);e.classList.add("cur");LASTBTN=e.querySelector(".p");follow(e)};
 const setAll=on=>{const b=document.getElementById("all");b.classList.toggle("on",on);b.textContent=on?"⏸ 暂停连播":"▶ 全部连播"};
 async function seq(list,orig=false,btn=null){const me=++RUN;for(const i of list){do{if(me!=RUN)return;mark(i);if(btn)LASTBTN=btn;const S_=d.sents[i];st(`${orig?"原声":btn?"AI 朗读":""}${orig||btn?" · ":""}第 ${i+1} / ${d.sents.length} 句`);await playP(orig?S_.oa:S_.a,SP[si],S_.t);if(me!=RUN)return;
  const dur=orig&&isFinite(A.duration)&&A.duration>0?A.duration:S_.d;if(F.shad){st(`第 ${i+1} 句 · 请跟读…`);await wait(dur/SP[si]*1000+600)}else await wait(F.loop?700:350)}while(F.loop&&me==RUN)}if(me==RUN){setAll(false);st("播放完毕")}}
 const $=id=>document.getElementById(id);
 $("all").onclick=()=>{const on=$("all").classList.contains("on");stopAll();setAll(false);if(on)return;setAll(true);const s=cur>0&&cur<d.sents.length-1?cur:0;seq(d.sents.map((_,i)=>i).slice(s))};
 for(const k of ["loop","hid"])$(k).onclick=()=>{F[k]=!F[k];$(k).classList.toggle("on",F[k]);if(k=="hid"){ss.classList.toggle("hide",F.hid);try{localStorage.setItem("rd_hid",F.hid?"1":"0")}catch(e){}}};
 if(F.hid){ss.classList.add("hide");$("hid").classList.add("on")}
 // 👆 点读: tap a phrase (split at Naval's breath pauses) to play just that original-audio segment.
 // The back copies the same English (.zhe, above 中文) and the same segments; 播放原句 stays the single .p control.
 if($("dd")){let DD=localStorage.getItem("rd_dd")=="1";
  const fill=(t,s,i)=>{if(!DD||!s.seg||!s.oa){t.textContent=s.t;return}const w=s.t.split(/\s+/);t.textContent="";
   s.seg.forEach(([x,y,a,b],k)=>{const p=document.createElement("span");p.className="ph"+(k%2?" alt":"");p.textContent=w.slice(x,y+1).join(" ");p.dataset.s=i;p.dataset.k=k;
    p.onclick=ev=>{ev.stopPropagation();playSeg(i,k,p)};t.appendChild(p);if(k<s.seg.length-1)t.appendChild(document.createTextNode(" "))})};
  const ren=()=>{d.sents.forEach((s,i)=>{document.querySelectorAll("#s"+i+" .fr .t,#s"+i+" .zhe").forEach(t=>fill(t,s,i))});$("dd").classList.toggle("on",DD)};
  async function playSeg(i,k,p){stopAll();setAll(false);const me=RUN,s=d.sents[i],[,,a,b]=s.seg[k];mark(i);LASTBTN=$("dd");document.querySelectorAll(".ph.play").forEach(x=>x.classList.remove("play"));p.classList.add("play");st(`点读 · 第 ${i+1} 句 · 第 ${k+1}/${s.seg.length} 段`);
   A.onended=A.onerror=null;A.src=await audioURL(s.oa);A.playbackRate=1;const go=()=>{try{A.currentTime=a}catch(e){}A.play().catch(()=>{})};if(A.readyState>=1)go();else A.addEventListener("loadedmetadata",go,{once:true});
   const tick=()=>{if(me!=RUN){p.classList.remove("play");return}if(A.currentTime>=b||A.ended){A.pause();p.classList.remove("play");return}requestAnimationFrame(tick)};requestAnimationFrame(tick);window._dd={i,k,a,b,src:s.oa}}
  $("dd").onclick=()=>{DD=!DD;try{localStorage.setItem("rd_dd",DD?"1":"0")}catch(e){}ren();st(DD?"点读：点句子里的任一小段，只播那一段原声":"")};ren()}
 $("spd").onclick=()=>{si=(si+1)%3;A.playbackRate=SP[si];$("spd").textContent="速度 "+SP[si]+"x"};
 $("stp").onclick=()=>{stopAll();setAll(false);st("")};
 // 原声连播: continuous original interview track, sentence follow-along by aligned start times
 if(d.oaudio){const ots=d.sents.map(s=>s.ot);const OB={oall:["🎙 原声连播","⏸ 暂停原声"],oloop:["🔁 原声循环","⏸ 停止循环"]};
  const setO=(on,id)=>{for(const k in OB){const b=$(k);if(!b)continue;const x=on&&k==id;b.classList.toggle("on",x);b.textContent=OB[k][x?1:0]}};
  // ONE highlight loop per run, alive until the run ends (me!=RUN) — never stops just because A is paused: iOS pauses/resumes the
  // element on its own (AirPods, lock screen, interruptions); the old loop died on the first pause, freezing the red border + scroll.
  const oIdx=t=>{let k=0;for(let i=0;i<ots.length;i++)if(ots[i]!=null&&t+0.1>=ots[i])k=i;return k};window._oIdx=oIdx;
  const startO=async id=>{const ob=$(id),loopM=id=="oloop";const on=ob.classList.contains("on");stopAll();setAll(false);setO(false);if(on)return;LASTUSER=0;const me=++RUN;window._orun=me;setO(true,id);window._oloop=loopM?me:0;
   const s0=!loopM&&cur>0&&cur<d.sents.length-1?cur:0;A.onended=A.onerror=null;A.src=await audioURL(d.oaudio);if(me!=RUN)return;A.playbackRate=1;
   const seek0=()=>{try{A.currentTime=Math.max(0,ots[s0]||0)}catch(e){}};if(A.readyState>=1)seek0();else A.addEventListener("loadedmetadata",seek0,{once:true});LASTBTN=ob;
   let round=1,last=-1,wrapping=false,lastFollow=0;window._oround=1;
   const upd=()=>{if(me!=RUN||wrapping)return;const k=oIdx(A.currentTime);const e=document.getElementById("s"+k);
    if(k!=last){last=k;mark(k);lastFollow=Date.now();LASTBTN=ob;st(`${loopM?"🔁 原声循环（第 "+round+" 遍）":"原声"} · 第 ${k+1} / ${d.sents.length} 句`)}
    else if(e&&!A.paused&&Date.now()-lastFollow>1500&&Date.now()-LASTUSER>4000){const r=e.getBoundingClientRect(),c=r.top+r.height/2;if(Math.abs(c-innerHeight/2)>innerHeight*0.2&&r.height<innerHeight*0.9){lastFollow=Date.now();follow(e)}}};
   window._oupd=upd;
   A.onended=async()=>{if(me!=RUN)return;if(!loopM){setO(false);st("原声播放完毕");return}wrapping=true;st("🔁 0.8 秒后从第 1 句重新开始");await wait(800);if(me!=RUN)return;round++;window._oround=round;try{A.currentTime=Math.max(0,ots[0]||0)}catch(e){}last=-1;wrapping=false;A.play().catch(()=>{})};
   A.play().catch(()=>{});
   const tick=()=>{if(me!=RUN){if(window._orun==me)setO(false);return}upd();requestAnimationFrame(tick)};requestAnimationFrame(tick);
   // rAF is throttled/suspended in the background: catch up from media events too (seek, resume, timeupdate)
   for(const ev of["timeupdate","seeked","playing"]){const h=()=>{if(me!=RUN)return A.removeEventListener(ev,h);upd()};A.addEventListener(ev,h)}};
  $("oall").onclick=()=>startO("oall");$("oloop").onclick=()=>startO("oloop")}}
// 原文 in word cards: original interview audio (点读 segment → whole clip → TTS)
async function playSrc(sr,rate,btn){if(!sr.oa)return playP(sr.a,rate,sr.t);const me=++RUN;const[a,b]=sr.oab||[0,null];
 A.onended=A.onerror=null;A.src=await audioURL(sr.oa);A.playbackRate=1;const go=()=>{try{A.currentTime=a}catch(e){}A.play().catch(()=>{})};if(A.readyState>=1)go();else A.addEventListener("loadedmetadata",go,{once:true});
 return new Promise(r=>{const tick=()=>{if(me!=RUN||A.ended||(b!=null&&A.currentTime>=b)){if(me==RUN&&b!=null)A.pause();r(true);return}requestAnimationFrame(tick)};requestAnimationFrame(tick)})}
// ② 🎧 原句: play the original clips of the complete source sentence in order (whole clips, not a 点读 segment). Tap again = stop.
async function playClips(list,btn){const me=++RUN;window._oplayed=[];window._oplaying=true;
 for(const p of list){if(me!=RUN)break;A.onended=A.onerror=null;A.src=await audioURL(p);if(me!=RUN)break;window._oplayed.push(p);LASTBTN=btn;A.playbackRate=1;try{A.currentTime=0}catch(e){}A.play().catch(()=>{});
  await new Promise(r=>{const t0=Date.now();const tick=()=>{if(me!=RUN)return r();const el=Date.now()-t0;if(el>300&&(A.ended||(A.paused&&el>800&&A.currentTime>0.2)))return r();requestAnimationFrame(tick)};requestAnimationFrame(tick)})}
 if(me==RUN){if(btn)btn.classList.remove("playing");window._oplaying=false}return me==RUN}
// 原文 → 原声: the interview clip for the whole source sentence. Never Kokoro/TTS, and never a per-word stepper.
// Order: src.oas (complete sentence clips) → one continuous span of src.sg (same clip, first start → last end) →
// the sentence file src.oa from the start (not the highlighted-word slice in oab) → the reading card whose TTS path
// or English matches (phrases cards often only store src.a).
const normEN=s=>String(s||"").toLowerCase().replace(/[’‘]/g,"'").replace(/[^a-z0-9' ]+/g," ").replace(/\s+/g," ").trim();
let OAIX=null,OAIXP=null;
function oaIndex(){if(OAIX)return Promise.resolve(OAIX);if(OAIXP)return OAIXP;
 OAIXP=(async()=>{const ix={a:new Map(),t:new Map()};let cat=CAT;if(!cat){try{cat=await getJSON("catalog.json")}catch(e){cat=null}}
  const items=cat&&cat.categories&&(cat.categories.find(c=>c.id=="reading")||{}).items||[];
  for(const it of items){let d;try{d=await getJSON(it.data)}catch(e){continue}
   for(const s of d.sents||[]){if(!s||!s.oa)continue;if(s.a&&!ix.a.has(s.a))ix.a.set(s.a,s);const k=normEN(s.t);if(k&&!ix.t.has(k))ix.t.set(k,s)}}
  return OAIX=ix})();return OAIXP}
function coverText(ix,text){const ft=normEN(text);if(!ft)return null;const one=ix.t.get(ft);if(one)return{oa:one.oa,oab:[0,null]};
 const hits=[];for(const[t,s]of ix.t){if(t.length<12)continue;const i=ft.indexOf(t);if(i>=0)hits.push([i,t.length,s])}
 hits.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);const used=[];let end=-1,covered=0;
 for(const[i,len,s]of hits){if(i<end-2)continue;const from=Math.max(i,end);covered+=i+len-from;used.push(s);end=i+len}
 if(!used.length||covered<ft.length*0.6)return null;if(used.length==1)return{oa:used[0].oa,oab:[0,null]};
 return{clips:[...new Set(used.map(s=>s.oa))]}}
async function matchReadingOrig(s){if(!s)return null;const ix=await oaIndex();
 if(s.a&&typeof s.a=="string"&&ix.a.has(s.a))return{oa:ix.a.get(s.a).oa,oab:[0,null]};
 return coverText(ix,s.ft||s.t||s.s||"")}
function srcOrig(s){if(!s)return null;if(s.oas&&s.oas.length)return{clips:s.oas.slice()};
 const sg=s.sg;if(sg&&sg.length){const clips=[];for(const z of sg){const c=z[2];if(c&&clips[clips.length-1]!==c)clips.push(c)}
  if(clips.length===1){let a=Infinity,b=null,open=false;for(const z of sg){if(z[2]!==clips[0])continue;a=Math.min(a,+z[3]||0);if(z[4]==null||z[4]==="")open=true;else b=b==null?+z[4]:Math.max(b,+z[4])}
   return{oa:clips[0],oab:[a===Infinity?0:a,open?null:b]}}
  if(clips.length)return{clips}}
 if(s.oa)return{oa:s.oa,oab:[0,null]};return null}
function playOrig(how,btn){if(!how){toast("这句还没有原声");return}if(how.clips&&how.clips.length)return playClips(how.clips,btn);
 LASTBTN=btn;return playSrc({oa:how.oa,oab:how.oab||[0,null]},1)}
async function playFull(s,btn){const me=RUN;let how=srcOrig(s);
 if(!how){if(btn)btn.disabled=true;try{how=await matchReadingOrig(s)}finally{if(btn)btn.disabled=false}}
 if(me!=RUN)return;return playOrig(how,btn)}
// Full unit list (English + 中文) before card-by-card drill. ⓪ 口语句式, ② 单词卡.
function unitRoster(rows,startLabel){const n=rows.length;
 V.innerHTML=`<p class="tip">这一组共 ${n} 个。先看完，再进入练习。</p>`+(n?`<div class="list rost">${rows.map((r,i)=>`<div class="li"><span class="rn">${i+1}</span><span class="tt"><span class="rw en">${esc(r.en)}</span>${r.zh?`<span class="sb">${esc(r.zh)}</span>`:""}</span></div>`).join("")}</div><button class="wide flip rostgo" id="godrill">${startLabel||"开始练习 ›"}</button>`:`<div class="done">这一组还是空的</div>`)}
// ---------- 原文 (original Naval sentence) ----------
// ② / 🧠 card back: 底层逻辑 row (c.lg=[emoji,text], same text as the ① gloss / 拓展 底层画面; added by build/card_logic.py)
function noteHTML(c){return c&&c.note?`<div class="row ntrow"><div class="tx"><span class="lab nt">讲解</span>${esc(c.note)}</div></div>`:""}
function lgHTML(c){return c&&c.lg&&c.lg[1]?`<div class="row lgrow"><div class="tx"><span class="lab lg">底层逻辑</span>${c.lg[0]?`<span class="lge">${esc(c.lg[0])}</span> `:""}${esc(c.lg[1])}</div></div>`:""}
function ywHTML(src,full){if(!src)return "";const t=full&&src.ft?src.ft:src.t;const hl=full&&src.ft&&src.fhl?src.fhl:(src.hl||[-1,-1]);const[a,b]=hl;const who=src.sp=="Naval"?"Naval":"Chris";
 return `<span class="lab yw">原文</span>${dsegHTML(t,[a,b],t==(src.ft||src.t)?src.sg:null)} <span class="ywsp">— ${who}</span>`}
// 点读 for every 原文/原句 render (②③④⑤⑥🧠): sg=[[charStart,charEnd,clip,t0,t1|null],…] over the displayed text (build/src_orig.py).
// Each segment is a .dseg span; tap = play just that stretch of the original audio (highlighted while playing). hl=[a,b] stays bold.
function dsegHTML(t,hl,sg,hlText){const[a,b]=hl||[-1,-1];const part=(s,e)=>{if(e<=s)return "";const x=Math.max(s,a),y=Math.min(e,b);if(a<0||x>=y)return esc(t.slice(s,e));
  return esc(t.slice(s,x))+(hlText==null?`<b class="ywb">${esc(t.slice(x,y))}</b>`:x==a?`<b class="ywb">${esc(hlText)}</b>`:"")+esc(t.slice(y,e))};
 if(!sg||!sg.length)return part(0,t.length);let h="",p=0;
 for(const[s,e,c,t0,t1]of sg){if(s<p||e>t.length)continue;h+=part(p,s)+`<span class="dseg" data-c="${esc(c)}" data-a="${t0}" data-b="${t1==null?"":t1}">${part(s,e)}</span>`;p=e}
 return h+part(p,t.length)}
document.addEventListener("click",async ev=>{const s=ev.target.closest&&ev.target.closest(".dseg");if(!s)return;ev.stopPropagation();ev.preventDefault();
 document.querySelectorAll("audio").forEach(x=>{try{x.pause()}catch(e){}});stopAll();document.querySelectorAll(".dseg.dplay").forEach(x=>x.classList.remove("dplay"));
 s.classList.add("dplay");window._dseg={c:s.dataset.c,a:+s.dataset.a,b:s.dataset.b===""?null:+s.dataset.b};
 await playSrc({oa:s.dataset.c,oab:[+s.dataset.a,s.dataset.b===""?null:+s.dataset.b]},1);s.classList.remove("dplay")},true);
// ---------- flashcards ----------
// ② 单词卡: two directions. 英→中 (recognise, default) and 中→英 (recall: Chinese + 底层逻辑 + letter hint + blanked 原句翻译 on the
// front, say it / optionally type it, flip → English word + autoplay + 原句). Progress is per direction: flash_<id> / flash_<id>_r.
const FCDIR=()=>{try{return localStorage.getItem("nova_fc_dir")=="ce"?"ce":"ec"}catch(e){return "ec"}};
const fcNorm=s=>String(s||"").toLowerCase().replace(/[’‘]/g,"'").replace(/…/g," ").replace(/\s+/g," ").trim();
function fcOK(typed,w){const t=fcNorm(typed);if(!t)return false;const v=[w,w.replace(/\s*\([^)]*\)\s*/g," "),w.replace(/[()]/g,"")].map(fcNorm);return v.includes(t)}
function fcMask(w,n){let k=0;return [...w].map(ch=>/[a-zA-Z]/.test(ch)?(k++<n?`<b>${esc(ch)}</b>`:`<i>_</i>`):ch==" "?'<span class="gap"></span>':`<b>${esc(ch)}</b>`).join("")}
function fcLetters(w){return [...w].filter(ch=>/[a-zA-Z]/.test(ch)).length}
function fcDiff(typed,w){const a=[...fcNorm(typed)],b=[...w.toLowerCase().replace(/[’‘]/g,"'")];const L=Array.from({length:a.length+1},()=>new Array(b.length+1).fill(0));
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)L[i][j]=a[i]==b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
 let i=0,j=0,h="";while(i<a.length||j<b.length){if(i<a.length&&j<b.length&&a[i]==b[j]){h+=`<span class="dk">${esc(a[i])}</span>`;i++;j++}else if(j<b.length&&(i>=a.length||L[i][j+1]>=L[i+1][j])){h+=`<span class="dm">${esc(b[j])}</span>`;j++}else{h+=`<span class="dx">${esc(a[i])}</span>`;i++}}return h}
function fcZhHL(src){const z=src.zh||"";if(!src.zb)return esc(z);const[a,b]=src.zb;return esc(z.slice(0,a))+'<span class="zbh">'+esc(z.slice(a,b))+'</span>'+esc(z.slice(b))}
function fcZh(src){const z=src.zh||"";if(!src.zb)return esc(z);const[a,b]=src.zb;return esc(z.slice(0,a))+'<span class="zbl">＿＿</span>'+esc(z.slice(b))}
function viewFlash(d,id,opt){const C=d.cards,DIR=FCDIR(),CE=DIR=="ce",KEY_="flash_"+id+(CE?"_r":"");let S=JSON.parse(localStorage.getItem(KEY_)||"null")||{mode:"all",status:{},queue:null,pos:0,rate:1,guess:{}};S.rv=S.rv||{};S.sp=S.sp||{};S.typed=S.typed||{};if(S.queue){S.queue=S.queue.filter(i=>i<C.length);const have=new Set(S.queue);for(let i=0;i<C.length;i++)if(!have.has(i)&&!S.status[i])S.queue.push(i)}/* cards appended to a deck later (e.g. T9 #20 mention) join a saved queue */let back=false;
  const save=()=>{try{localStorage.setItem(KEY_,JSON.stringify(S))}catch(e){}};
  const build=()=>{let ids=C.map((_,i)=>i);if(S.mode=="un")ids=ids.filter(i=>S.status[i]=="u");S.queue=ids;S.pos=0;save()};if(!S.queue)build();
  if(!(opt&&opt.drill)){const q=S.queue||[],pos=Math.min(S.pos||0,q.length),mid=pos>0&&pos<q.length;
   unitRoster(C.map(c=>({en:c.w,zh:c.zh})),mid?`继续练习（第 ${pos+1} / ${q.length}）›`:"开始练习 ›");
   const go=document.getElementById("godrill");if(go)go.onclick=()=>{stopAll();viewFlash(d,id,{drill:1})};return}
  V.innerHTML=`<div class="fcwrap"><div class="bar fcdir"><button id="dEC" class="${CE?"":"on"}">英→中</button><button id="dCE" class="${CE?"on":""}">中→英</button></div><div class="bar"><button id="roster">词表</button><button id="mAll">全部单词</button><button id="mUn">只练不认识的</button><button id="shf">打乱顺序</button><button id="spd">1x</button><button id="rst">重置</button></div><div class="status" id="pg"></div></div><div id="fc"></div>`;
  const $=x=>document.getElementById(x);
  const setDir=x=>{if(x==DIR)return;try{localStorage.setItem("nova_fc_dir",x)}catch(e){}stopAll();viewFlash(d,id,{drill:1})};$("dEC").onclick=()=>setDir("ec");$("dCE").onclick=()=>setDir("ce");
  $("roster").onclick=()=>{stopAll();viewFlash(d,id)};
  $("mAll").onclick=()=>{S.mode="all";build();render()};$("mUn").onclick=()=>{S.mode="un";build();render()};
  $("shf").onclick=()=>{const q=S.queue.slice(S.pos);for(let i=q.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[q[i],q[j]]=[q[j],q[i]]}S.queue=S.queue.slice(0,S.pos).concat(q);save();render()};
  $("spd").onclick=()=>{S.rate=S.rate==1?.75:1;save();render()};$("rst").onclick=()=>{if(confirm(`清空这组单词卡（${CE?"中→英":"英→中"}）的进度？`)){S={mode:"all",status:{},queue:null,pos:0,rate:S.rate,guess:{},rv:{},sp:{},typed:{}};build();render()}};
  window._fc={play:(i,k)=>{stopAll();const fb=[C[i].w,C[i].ex,(C[i].exs||[])[0],(C[i].exs||[])[1]][k];const p=C[i].a&&C[i].a[k];if(p)playP(p,S.rate,fb);else if(fb)speak(fb,S.rate)},
   flip:i=>{const g=$("g");if(g)S.guess[i]=g.value.trim();const sp=$("sp");if(sp&&sp.value.trim()&&!S.sp[i])_fc.spell(i,true);back=true;save();render();if(CE)_fc.play(i,0)},
   mark:(i,v)=>{if(CE&&S.sp[i]=="bad")v="u";S.status[i]=v;if(v=="u")S.queue.splice(Math.min(S.pos+4,S.queue.length),0,i);S.pos++;back=false;stopAll();save();render()},
   src:(i,b)=>{stopAll();playFull(C[i].src,b,S.rate)},
   osent:(i,b)=>{const on=window._oplaying&&b.classList.contains("playing");stopAll();window._oplaying=false;b.classList.remove("playing");if(on)return;playClips(C[i].src.oas,b)},
   say:(i,b)=>{stopAll();LASTBTN=b;playP(C[i].a[0],S.rate,C[i].w)},/* 中→英 front 🔊: word audio only, no autoplay, not counted */
   hint:i=>{S.rv[i]=Math.min((S.rv[i]||1)+1,fcLetters(C[i].w));save();const h=$("hint");if(h)h.innerHTML=fcMask(C[i].w,S.rv[i])},
   spell:(i,quiet)=>{const sp=$("sp");const t=sp?sp.value.trim():"";if(!t)return;S.typed[i]=t;S.sp[i]=fcOK(t,C[i].w)?"ok":"bad";save();if(!quiet)render()},
   again:()=>{build();render()},un:()=>{S.mode="un";build();render()}};
  function render(){$("mAll").className=S.mode=="all"?"on":"";$("mUn").className=S.mode=="un"?"on":"";$("spd").textContent=S.rate==1?"1x":"0.75x";
   const vals=Object.values(S.status),k=vals.filter(v=>v=="k").length,u=vals.filter(v=>v=="u").length,q=S.queue,n=q.length;
   $("pg").textContent=`${CE?"中→英 · ":""}第 ${Math.min(S.pos+1,n)} / ${n} 张 · ${CE?"想得起":"认识"} ${k} · ${CE?"想不起":"不认识"} ${u} · 共 ${C.length} 词`;
   if(!n){$("fc").innerHTML=`<div class="card done">没有标记为“不认识”的单词了 🎉<button class="wide flip" onclick="document.getElementById('mAll').click()">练习全部单词</button></div>`;return}
   if(S.pos>=n){$("fc").innerHTML=`<div class="card done">这一轮完成了！<br>${CE?"想得起":"认识"} ${k} 个，${CE?"想不起":"不认识"} ${u} 个<button class="wide flip" onclick="_fc.again()">再来一轮</button>${u?'<button class="wide no" onclick="_fc.un()">只练不认识的</button>':""}</div>`;return}
   const i=q[S.pos],c=C[i];
   if(CE&&!back){const sp=S.sp[i];
    $("fc").innerHTML=`<div class="card ce"><div class="cez">${esc(c.zh)}</div><div class="pos en">${esc(c.pos)}</div>${lgHTML(c)}${noteHTML(c)}
     <div class="fchrow"><button class="fchint" id="hint" onclick="_fc.hint(${i})" aria-label="提示：再显示一个字母">${fcMask(c.w,S.rv[i]||1)}</button><button class="btn fcsay" id="fcsay" onclick="_fc.say(${i},this)" aria-label="听单词发音（提示）">🔊</button></div><div class="tip" style="text-align:center">共 ${fcLetters(c.w)} 个字母 · 点一下多显示一个</div>
     ${c.src&&c.src.zh?`<div class="row czr"><div class="tx"><span class="lab yw">原句</span>${fcZh(c.src)}${c.src.sp?` <span class="ywsp">— ${c.src.sp=="Naval"?"Naval":"Chris"}</span>`:""}</div></div>`:""}
     ${c.src&&c.src.oas&&c.src.oas.length?`<div style="text-align:center"><button class="osent" id="osent" onclick="_fc.osent(${i},this)" aria-label="播放原句原声（会听到答案）">🎧 原句</button><div class="tip">点了才播放 · 原声里会听到答案</div></div>`:""}
     <div class="tip" style="text-align:center;margin-top:10px">🗣 先大声说出英文，再翻看答案</div>
     <div class="fcsp"><input id="sp" class="guess" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="✍️ 拼一拼（可不填）" value="${esc(S.typed[i]||"")}"><button class="btn" id="spk" onclick="_fc.spell(${i})">✓ 检查</button></div>
     <div id="spr">${sp=="ok"?`<div class="gok">✅ 拼对了</div>`:sp=="bad"?`<div class="gno">❌ 拼写有误（这张记为想不起）</div><div class="fcdiff en">${fcDiff(S.typed[i],c.w)}</div>`:""}</div>
     <button class="wide flip" onclick="_fc.flip(${i})">翻看答案</button></div>`;
    const inp=$("sp");inp.onkeydown=e=>{if(e.key=="Enter"){e.preventDefault();_fc.spell(i)}};return}
   let h=`<div class="card"><div class="word">${esc(c.w)}</div><div class="pos en">${esc(c.pos)}</div><button class="big" onclick="_fc.play(${i},0)">▶</button>${c.src&&c.src.oas&&c.src.oas.length?`<button class="osent" id="osent" onclick="_fc.osent(${i},this)" aria-label="播放原句原声">🎧 原句</button>`:""}`;
   if(!back)h+=`<input class="guess" id="g" placeholder="我猜的意思（可不填）" value="${esc(S.guess[i]||"")}"><button class="wide flip" onclick="_fc.flip(${i})">翻看答案</button>`;
   else h+=`<div class="zh">${esc(c.zh)}</div>${!CE&&S.guess[i]?`<div class="mine">我猜的：${esc(S.guess[i])}</div>`:""}${CE&&S.sp[i]?`<div class="mine">我拼的：${esc(S.typed[i])} ${S.sp[i]=="ok"?"✅":"❌ → 记为想不起"}</div>`:""}${lgHTML(c)}${noteHTML(c)}
    ${c.ex?`<div class="row"><div class="tx en"><span class="lab">解释</span>${esc(c.ex)}</div><button class="p sm" onclick="_fc.play(${i},1)">▶</button></div>`:""}
    ${(c.exs||[])[0]?`<div class="row"><div class="tx en"><span class="lab ex">例句1</span>${esc(c.exs[0])}</div><button class="p sm" onclick="_fc.play(${i},2)">▶</button></div>`:""}
    ${(c.exs||[])[1]?`<div class="row"><div class="tx en"><span class="lab ex">例句2</span>${esc(c.exs[1])}</div><button class="p sm" onclick="_fc.play(${i},3)">▶</button></div>`:""}
    ${c.src?`<div class="row yrow"><button class="osb" id="ysrc" onclick="_fc.src(${i},this)" aria-label="播放原文原声">🌻 原声</button><div class="tx en">${ywHTML(c.src,true)}</div></div>${c.src.zh?`<div class="fcsz">${fcZhHL(c.src)}</div>`:""}`:""}
    <div class="yn"><button class="wide no" onclick="_fc.mark(${i},'u')">${CE?"想不起":"不认识"}</button>${CE&&S.sp[i]=="bad"?"":`<button class="wide yes" onclick="_fc.mark(${i},'k')">${CE?"想起来了":"认识"}</button>`}</div>`;
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
let EXZH=null;async function loadEXZH(){if(!EXZH){try{EXZH=await getJSON("exzh.json")}catch(e){EXZH={}}}return EXZH}
async function viewLong(d){const url=await audioURL(d.audio);await loadEXP();await loadEXZH();const R=[1,.85,.75];let ri=0;
 V.innerHTML=`<div class="player"><audio id="au" preload="metadata" src="${url}"></audio><div class="skb"><span id="tc">0:00</span><input type="range" id="sk" min="0" max="1" step="0.1" value="0" aria-label="进度"><span id="td">--:--</span></div><div class="pb"><button class="p" id="pp" aria-label="播放/暂停">▶</button><button class="btn" id="bk">⟲ 10秒</button><button class="btn" id="sp">速度 1x</button><button class="btn" id="fw">10秒 ⟳</button><button class="btn shf" id="shf" aria-pressed="false">🔀 乱序</button></div><div class="status" id="nw" style="margin:8px 2px 0"></div><div class="skbar" id="skbar" hidden></div></div>
 <div class="tip">播放时文字会跟着高亮；点任意一句可以从那里听。${d.items.some(e=>e.tt&&(e.tt.z||e.tt.o!=null))?(d.items.some(e=>e.tt&&e.tt.o0!=null)?"每个词先放一遍原文句子（原声），":"")+(d.items.some(e=>e.tt&&e.tt.pos!=null)?"单词读完紧接着读英文词性（Noun / Verb / Adjective…），再读英文解释，":"")+"每个例句读完后读中文翻译，再读一遍英文例句，"+(d.items.some(e=>e.tt&&e.tt.o!=null)?"最后再读这个词的原文句子（有原声用原声）。":""):""}手动滑动后 4 秒内不自动滚动。听熟的词点「跳过」，连播时就会跳过它。</div>
 ${d.items.map((e,i)=>{const tt=e.tt;const wt=tt&&tt.w!=null?tt.w:e.t;const st=tt&&tt.s0!=null?tt.s0:e.t;/* ③: starting at a word (从这里听 / tap word) begins with its 原句 (tt.s0) → word → 英解释 → 例句 → 原句 (Nova 2026-10-21) */
  return `<div class="ent" id="e${i}"><div class="hd"><span class="n">${e.n}</span><span class="w en${wt!=null?" wd":""}"${wt!=null?` data-t="${wt}"`:""}${st!=null?` data-p="${st}"`:""}>${esc(e.w)}</span><span style="color:#888;font-style:italic">${esc(e.pos||"")}</span><span class="z">${esc(e.zh||"")}</span>${st!=null?`<button class="jump" data-j="${st}">▶ 从这里听</button>`:""}<button class="skb" data-sk="${i}" aria-pressed="false">跳过</button></div>
  <p>${tt&&tt.ex.length?spans(tt.ex):esc(e.ex)}</p>${e.exs&&e.exs.length?`<div style="font-weight:700;font-size:13px;color:#555">For example:</div><ol>${e.exs.map((x,j)=>`<li>${tt&&tt.exs[j]&&tt.exs[j].length?spans(tt.exs[j]):esc(x)}${(e.exzh&&e.exzh[j])||EXZH[x]?`<div class="exz${tt&&tt.z&&tt.z[j]!=null?` wd lz" data-t="${tt.z[j]}`:""}">${esc((e.exzh&&e.exzh[j])||EXZH[x])}</div>`:""}</li>`).join("")}</ol>`:""}${e.src?`<div class="row yrow"><button class="osb" data-src="${i}" aria-label="播放原文原声">🌻 原声</button><div class="tx en${tt&&tt.o!=null?` wd lo" data-t="${tt.o}`:""}">${ywHTML(e.src,true)}</div></div>`:""}${expHTML(e.w)}</div>`}).join("")}`;
 const au=document.getElementById("au");wirePP(au);seekBar(au,d.dur);
 const play=t=>{au.currentTime=Math.max(0,t-0.05);au.playbackRate=R[ri];au.play().catch(()=>{})};
 V.querySelectorAll(".jump").forEach(b=>b.onclick=()=>play(+b.dataset.j));
 V.querySelectorAll("[data-src]").forEach(b=>b.onclick=()=>{au.pause();stopAll();const e=d.items[+b.dataset.src];playFull(e.src,b,R[ri])});
 V.querySelectorAll(".wd").forEach(w=>w.onclick=()=>{LASTUSER=0;const sn=w.closest(".sn");const f=sn?sn.querySelector(".wd"):w;play(+(f.dataset.p||f.dataset.t))});
 document.getElementById("bk").onclick=()=>au.seekTo(au.currentTime-10);document.getElementById("fw").onclick=()=>au.seekTo(au.currentTime+10);
 document.getElementById("sp").onclick=e=>{ri=(ri+1)%3;au.playbackRate=R[ri];e.target.textContent="速度 "+R[ri]+"x"};
 const WD=[...V.querySelectorAll(".wd")].map(el=>({el,t:+el.dataset.t}));
 // English example read again after its Chinese (tt.rx): the same word spans light up a second time
 d.items.forEach((e,i)=>{if(e.tt&&e.tt.o0!=null){const lo=document.querySelector(`#e${i} .lo`);if(lo)WD.push({el:lo,t:e.tt.o0})}});  // ③ 原句 also at the start of each word (Nova 2026-10-21)
 d.items.forEach((e,i)=>{const rx=e.tt&&e.tt.rx;if(!rx)return;const li=document.querySelectorAll(`#e${i} ol > li`);rx.forEach((ts_,j)=>{if(!ts_||!li[j])return;const ws=[...li[j].querySelectorAll(":scope > .sn .wd, :scope > .wd")];ts_.forEach((t,k)=>{if(ws[k]&&t!=null)WD.push({el:ws[k],t})})})});
 WD.sort((a,b)=>a.t-b.t);
 const ts=d.items.map(e=>e.tt&&e.tt.s0!=null?e.tt.s0:e.tt&&e.tt.w!=null?e.tt.w:e.t);let lastE=-1,lastW=null,lastS=null,raf=0;
 // ③ per-word 跳过 (Nova 2026-10-20): skipped entries are jumped over in 连播 (also when 从这里听 lands on one);
 // tapping a word inside a skipped entry still plays it by hand (MANK). Saved per deck+word in localStorage nova_skip_<audio>.
 const SKK="nova_skip_"+d.audio;let SK={};try{SK=JSON.parse(localStorage.getItem(SKK))||{}}catch(e){}let MANK=-1;
 const isSk=i=>!!SK[d.items[i].w];
 const skPaint=()=>{d.items.forEach((e,i)=>{const el=document.getElementById("e"+i),b=el.querySelector(".skb"),s=isSk(i);el.classList.toggle("skipped",s);b.textContent=s?"已跳过 ↺":"跳过";b.setAttribute("aria-pressed",s)});
  const n=d.items.filter((e,i)=>isSk(i)).length,bar=document.getElementById("skbar");bar.hidden=!n;bar.innerHTML=n?`已跳过 ${n} 个词（连播时跳过）· <button class="btn" id="skall">全部恢复</button>`:"";
  if(n)document.getElementById("skall").onclick=()=>{SK={};localStorage.removeItem(SKK);skPaint()}};
 V.querySelectorAll(".skb").forEach(b=>b.onclick=()=>{const w=d.items[+b.dataset.sk].w;if(SK[w])delete SK[w];else SK[w]=1;localStorage.setItem(SKK,JSON.stringify(SK));skPaint()});
 skPaint();
 // ③ 乱序 (Nova 2026-10-22): optional; each entry still one block (原文→单词→英解释→例句→原文). When an entry finishes naturally,
 // jump to the next unplayed entry of a random order (no repeats; 跳过 entries left out). Bar/±10秒 stay on the real file time.
 let SH=localStorage.getItem("nova_shuf3")=="1",ORD=[],PL=new Set(),USR=true;
 const newOrd=()=>{ORD=d.items.map((e,i)=>i).filter(i=>ts[i]!=null);for(let i=ORD.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ORD[i],ORD[j]]=[ORD[j],ORD[i]]}PL=new Set()};
 const nextSh=()=>ORD.find(i=>!PL.has(i)&&!isSk(i));
 const shPaint=()=>{const b=document.getElementById("shf");b.classList.toggle("on",SH);b.setAttribute("aria-pressed",SH);b.textContent=SH?"🔀 乱序：开":"🔀 乱序";
  const n=document.getElementById("nw");if(SH&&!n.textContent)n.textContent="乱序已开：按 ▶ 随机顺序连播，每个词完整播一遍，不重复"};
 const shStart=()=>{newOrd();const f=nextSh();if(f!=null){au.pause();au.currentTime=Math.max(0,ts[f]-0.05);USR=true}};
 document.getElementById("shf").onclick=()=>{SH=!SH;localStorage.setItem("nova_shuf3",SH?"1":"0");if(SH)shStart();else{PL=new Set()}shPaint();lastE=-2;tick()};
 if(SH)shStart();shPaint();window._sh=()=>({ORD:[...ORD],PL:[...PL],SH});
 ["seeking"].forEach(k=>au.addEventListener(k,()=>{if(!AUTO)USR=true}));let AUTO=false;
 const shGo=i=>{AUTO=true;au.currentTime=ts[i];setTimeout(()=>AUTO=false,300)};
 au.addEventListener("ended",()=>{if(!SH)return;const n=nextSh();if(n!=null){shGo(n);au.play().catch(()=>{})}else{document.getElementById("nw").textContent="乱序播放完毕 ✓（再按 ▶ 换一个新顺序）";newOrd()}});
 V.querySelectorAll(".ent .wd").forEach(w=>w.addEventListener("click",()=>{MANK=+w.closest(".ent").id.slice(1)}));
 V.querySelectorAll(".jump").forEach(b=>b.addEventListener("click",()=>{MANK=-1}));
 function tick(){let ct=au.currentTime+0.05;
  let k=-1;for(let i=0;i<ts.length;i++)if(ts[i]!=null&&ct>=ts[i])k=i;
  if(MANK>=0&&k==MANK-1&&ts[MANK]-ct<0.3)k=MANK;  // play() starts 0.05s before the tapped word
  if(k!=MANK)MANK=-1;
  if(SH&&k>=0&&!au.paused){if(USR){USR=false;if(!ORD.length)newOrd();PL.add(k)}
   else if(k!=lastE&&lastE>=0||isSk(k)){const n=nextSh();if(n==null){au.pause();document.getElementById("nw").textContent="乱序播放完毕 ✓（再按 ▶ 换一个新顺序）";newOrd();k=lastE}else{shGo(n);ct=ts[n]+0.05;k=n;PL.add(n)}}
   else PL.add(k)}
  if(k>=0&&isSk(k)&&k!=MANK&&!au.paused){let n=k+1;while(n<ts.length&&(ts[n]==null||isSk(n)))n++;
   if(n<ts.length){au.currentTime=ts[n];ct=ts[n]+0.05;k=n}else{au.pause();au.currentTime=(isFinite(au.duration)?au.duration:d.dur)||au.currentTime}}
  if(SH&&k>=0&&k==lastE&&!au.paused){const nw=document.getElementById("nw"),tx=`正在播放：${d.items[k].n}. ${d.items[k].w}（乱序 ${PL.size}/${ORD.filter(i=>!isSk(i)).length}）`;if(nw.textContent!=tx)nw.textContent=tx}
  if(k!=lastE){lastE=k;document.querySelectorAll(".ent.cur").forEach(x=>x.classList.remove("cur"));if(k>=0){document.getElementById("e"+k).classList.add("cur");document.getElementById("nw").textContent=`正在播放：${d.items[k].n}. ${d.items[k].w}`+(SH?`（乱序 ${PL.size}/${ORD.filter(i=>!isSk(i)).length}）`:"")}}
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


// Countdown (Nova 2026-10-20, same wording as the reminders): weeks are Mon–Sun; sprint ends on the year's last Sunday (2026: Dec 27); the days after are rest days.
function yearLeft(d){d=d||new Date();const y=d.getFullYear(),day=Date.UTC(y,d.getMonth(),d.getDate()),D=864e5;
 const dec31=Date.UTC(y,11,31),lastSun=dec31-((new Date(dec31).getUTCDay())%7)*D,rest=Math.round((dec31-lastSun)/D),ls=new Date(lastSun);
 if(day>lastSun)return `今年的冲刺已经完成 🎉<br>年底 ${rest} 天留给你放松`;
 const X=7-((new Date(day).getUTCDay()+6)%7),N=Math.max(0,Math.round((lastSun-(day+X*D))/D+1)/7|0);
 return `本周还剩 ${X} 天，之后还有 ${N} 个整周<br>（冲刺到 ${ls.getUTCMonth()+1} 月 ${ls.getUTCDate()} 日），年底 ${rest} 天留给你放松`}
function yecHTML(){const d=new Date(),W="日一二三四五六";const day=`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 周${W[d.getDay()]}`;return `<span class="hday">${day}</span><span class="hleft">${yearLeft()}</span>`}
function updYec(){const e=document.getElementById("yec");if(e)e.innerHTML=yecHTML()}
let _yecT;function schedYec(){clearTimeout(_yecT);const n=new Date(),m=new Date(n.getFullYear(),n.getMonth(),n.getDate()+1,0,0,1);_yecT=setTimeout(()=>{updYec();schedYec()},m-n)}
document.addEventListener("visibilitychange",()=>{if(!document.hidden){updYec();schedYec()}});schedYec();

// ---------- ④ 句子听写: interview original only, then the whole sentence ----------
function playOA(p,btn,quiet){if(!p)return Promise.resolve(false);if(btn)LASTBTN=btn;return audioURL(p).then(url=>new Promise(res=>{
 A.onended=()=>res(true);A.onerror=()=>{if(!quiet)toast("原声加载失败");res(false)};
 A.src=url;A.playbackRate=1;A.defaultPlaybackRate=1;try{A.currentTime=0}catch(e){}
 const q=A.play();if(q&&q.catch)q.catch(()=>{if(!quiet)toast("点 🌻 再听一遍");res(false)})}))}
function dtWords(s){return String(s||"").match(/[A-Za-z0-9]+(?:['’‘][A-Za-z0-9]+)*/g)||[]}
function dtKey(w){return String(w||"").toLowerCase().replace(/[’‘']/g,"").replace(/[^a-z0-9]/g,"")}
function dtMark(typed,answer){const A=dtWords(typed),B=dtWords(answer),a=A.map(dtKey),b=B.map(dtKey),n=a.length,m=b.length;
 const L=Array.from({length:n+1},()=>Array(m+1).fill(0));
 for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=a[i]===b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
 const aOk=Array(n).fill(false),bOk=Array(m).fill(false);let i=0,j=0;
 while(i<n&&j<m){if(a[i]===b[j]){aOk[i]=bOk[j]=true;i++;j++}else if(L[i+1][j]>=L[i][j+1])i++;else j++}
 const extra=[],miss=[];A.forEach((w,k)=>{if(!aOk[k])extra.push(w)});B.forEach((w,k)=>{if(!bOk[k])miss.push(w)});
 const yours=A.length?A.map((w,k)=>`<span class="${aOk[k]?"dk":"dx"}">${esc(w)}</span>`).join(" "):"";
 const ok=!!A.length&&!extra.length&&!miss.length;
 const bit=(lab,arr)=>!arr.length?"":arr.length<=8?`${lab} ${arr.length} 个：${arr.join("、")}`:`${lab} ${arr.length} 个`;
 const summary=ok?"整句对了":[bit("漏了",miss),bit("多了",extra)].filter(Boolean).join(" · ")||"再听一遍";
 return {ok,yours,summary,miss,extra}}
function dtFeedback(s,typed){const r=dtMark(typed,s.t);const zh=s.zh?`<div class="dtlab">中文</div><div class="dthz">${esc(s.zh)}</div>`:"";
 return {ok:r.ok,html:`<div class="${r.ok?"gok":"gno"}">${esc(r.summary)}</div>${r.ok?"":`<div class="dtlab">你写的</div><div class="dtdiff en">${r.yours}</div><div class="dtleg"><span class="dk">对的</span><span class="dx">多了</span><span class="dm">漏了</span></div>${r.miss.length?`<div class="dtlab">漏掉的词</div><div class="dtdiff en">${r.miss.map(w=>`<span class="dm">${esc(w)}</span>`).join(" ")}</div>`:""}`}<div class="dtlab">正确句子</div><div class="dtans en">${esc(s.t)}</div>${zh}<button class="osb" id="dtre" type="button">🌻 再听原声</button>`}}
function viewDictation(d,it){const sents=(d.sents||[]).map((s,i)=>({s,i})).filter(x=>x.s&&x.s.oa);
 if(!sents.length){V.innerHTML=`<div class="done">这个 Topic 还没有采访原声，没法听写。</div>`;return}
 const key="nova_dt_"+(it&&it.id||"x");let pos=+localStorage.getItem(key)||0;if(!(pos>=0)||pos>=sents.length)pos=0;
 const save=()=>{try{localStorage.setItem(key,String(pos))}catch(e){}};
 const render=()=>{const {s}=sents[pos];const who=s.sp=="Naval"?"NAVAL":s.sp=="Chris"?"CHRIS":(s.sp||"");
  V.innerHTML=`<div class="card dtcard"><div class="dtmeta"><span class="sno">${pos+1} / ${sents.length}</span>${who?`<span class="dtwho">${esc(who)}</span>`:""}</div>
   <div class="dtplay"><button class="big" id="dtplay" type="button" aria-label="播放原声"></button><div class="dtplab">🌻 原声</div></div>
   <p class="tip">听原声，把整句打出来。英文先不显示。</p>
   <textarea id="dtin" class="dtin" rows="4" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="在这里写下听到的整句"></textarea>
   <div class="dtact"><button class="btn" id="dthint" type="button">中文提示</button><button class="wide flip" id="dtok" type="button">检查</button></div>
   <div id="dthz" class="dthz" hidden></div><div id="dtfb"></div></div>
   <div class="dtnav"><button type="button" id="dtprev" ${pos?"":"disabled"}>‹ 上一句</button><button type="button" id="dtnext" ${pos<sents.length-1?"":"disabled"}>下一句 ›</button></div>`;
  const playBtn=document.getElementById("dtplay");
  playBtn.onclick=()=>{stopAll();playOA(s.oa,playBtn)};
  document.getElementById("dthint").onclick=()=>{const z=document.getElementById("dthz");if(!s.zh){toast("这句没有中文");return}z.hidden=!z.hidden;if(!z.hidden)z.textContent=s.zh;document.getElementById("dthint").textContent=z.hidden?"中文提示":"收起中文"};
  const chk=()=>{const inp=document.getElementById("dtin"),typed=inp.value.trim(),fb=document.getElementById("dtfb");
   if(!typed){inp.classList.remove("shake");void inp.offsetWidth;inp.classList.add("shake");toast("先把听到的整句打出来");return}
   const r=dtFeedback(s,typed);inp.classList.toggle("good",r.ok);inp.classList.toggle("near",!r.ok);
   const hz=document.getElementById("dthz");if(hz)hz.hidden=true;const hb=document.getElementById("dthint");if(hb)hb.textContent="中文提示";
   fb.innerHTML=r.html;const re=document.getElementById("dtre");if(re)re.onclick=()=>{stopAll();playOA(s.oa,playBtn)};
   fb.scrollIntoView({block:"nearest",behavior:"smooth"})};
  document.getElementById("dtok").onclick=chk;
  document.getElementById("dtin").addEventListener("keydown",e=>{if((e.metaKey||e.ctrlKey)&&e.key=="Enter"){e.preventDefault();chk()}});
  document.getElementById("dtprev").onclick=()=>{if(pos<=0)return;pos--;save();stopAll();render();scrollTo(0,0)};
  document.getElementById("dtnext").onclick=()=>{if(pos>=sents.length-1)return;pos++;save();stopAll();render();scrollTo(0,0)};
  playOA(s.oa,playBtn,true)};
 render()}

// ---------- study timer (home hero: 今天 / 累计) ----------
// Counts only while visible AND active: interaction within 2 min, or audio/speech playing. Log: localStorage nova_time {YYYY-MM-DD: seconds}.
const TK="nova_time",T_IDLE=120e3;let TLOG={};try{TLOG=JSON.parse(localStorage.getItem(TK)||"{}")||{}}catch(e){TLOG={}}
let tAct=Date.now(),tLast=Date.now();
const dKey=d=>{d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function tSave(){try{localStorage.setItem(TK,JSON.stringify(TLOG))}catch(e){}}
function tPlaying(){try{if(!A.paused&&!A.ended)return true;for(const a of document.querySelectorAll("audio,video"))if(!a.paused&&!a.ended)return true;if(window.speechSynthesis&&speechSynthesis.speaking)return true}catch(e){}return false}
function tActive(now){return !document.hidden&&(now-tAct<T_IDLE||tPlaying())}
// Per-section time (Nova 2026-10-20): the SAME active seconds are also credited to the home section that is open
// (①–⑦ + custom categories; home / 设置 / 🧠 今日复习 count only in the global total). localStorage nova_tsec {YYYY-MM-DD:{sec:seconds}}; starts at 0 (no back-fill).
const TSK="nova_tsec";let TSEC={};try{TSEC=JSON.parse(localStorage.getItem(TSK)||"{}")||{}}catch(e){TSEC={}}
const MCAT={};  // imported-audio id → category (filled by itemsIn)
function secOf(h){h=(h||location.hash||"#/").slice(1).split("/");if(!CAT)return null;
 if(h[1]=="c")return h[2]||null;if(h[1]=="wf")return "wf";if(h[1]=="d")return "d";if(h[1]=="g")return "g";if(h[1]=="k")return "k";
 if(h[1]=="i"){const x=builtinItems().find(x=>x.it.id==h[2]);return x?effCat(x):null}if(h[1]=="m")return MCAT[h[2]]||null;return null}
function tsecKeys(sec){return sec=="dictation"||sec=="chunks"?["dictation","chunks"]:[sec]}
function tsecT(sec,day){const ks=tsecKeys(sec);if(day){const D=TSEC[day]||{};return ks.reduce((n,k)=>n+(+D[k]||0),0)}let s=0;for(const d in TSEC)for(const k of ks)s+=+(TSEC[d][k]||0);return s}
const secHTML=sec=>`今天 ${fmtT(tsecT(sec,dKey()))} · 累计 ${fmtT(tsecT(sec))}`;
function tTick(){const now=Date.now();const dt=Math.min(now-tLast,5e3);tLast=now;if(dt>0&&tActive(now)){const k=dKey();TLOG[k]=Math.round(((TLOG[k]||0)+dt/1e3)*10)/10;tSave()
  const s=secOf();if(s){const D=TSEC[k]||(TSEC[k]={});D[s]=Math.round(((D[s]||0)+dt/1e3)*10)/10;try{localStorage.setItem(TSK,JSON.stringify(TSEC))}catch(e){}}}
 const el=document.getElementById("stt");if(el)el.innerHTML=sttHTML();document.querySelectorAll(".tsec[data-s]").forEach(e=>{const t=secHTML(e.dataset.s);if(e.textContent!=t)e.textContent=t})}
function fmtT(sec){const m=Math.floor((sec||0)/60);const h=Math.floor(m/60);return h?`${h}h ${m%60}m`:`${m}m`}
function tTotal(){return Object.values(TLOG).reduce((a,b)=>a+(+b||0),0)}
function sttHTML(){return `<span class="sl">今天 <b>${fmtT(TLOG[dKey()])}</b></span><span class="sl">累计 <b>${fmtT(tTotal())}</b></span>`}
function tMerge(R,dry){let n=0;if(!R||typeof R!="object")return 0;for(const k in R){const v=+R[k];if(!/^\d{4}-\d\d-\d\d$/.test(k)||!(v>0))continue;if(v>(TLOG[k]||0)+0.5){n++;if(!dry)TLOG[k]=v}}if(!dry){tSave();tTick()}return n}
function showTimeLog(){const o=document.createElement("div");o.className="ov";const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push([d,TLOG[dKey(d)]||0])}
 const mx=Math.max(60,...days.map(x=>x[1]));const W="日一二三四五六";
 o.innerHTML=`<div class="sh tlog"><div class="sht">⏱ 最近 7 天学习时长</div>${days.map(([d,v],i)=>`<div class="tr${i==6?" td":""}"><span class="tdw">${i==6?"今天":(d.getMonth()+1)+"/"+d.getDate()+" 周"+W[d.getDay()]}</span><span class="tb"><i style="width:${Math.round(v/mx*100)}%"></i></span><span class="tv">${fmtT(v)}</span></div>`).join("")}
 <div class="tip" style="margin:6px 2px 0">7 天合计 ${fmtT(days.reduce((a,x)=>a+x[1],0))} · 累计 ${fmtT(tTotal())}<br>只在 App 打开、并且你在操作或在播放音频时计时；2 分钟没有操作就暂停。</div><button class="shb cancel" data-x>关闭</button></div>`;
 o.onclick=e=>{if(e.target==o||e.target.closest("[data-x]"))o.remove()};document.body.appendChild(o)}
["pointerdown","keydown","touchstart","wheel","scroll"].forEach(t=>addEventListener(t,()=>{tAct=Date.now()},{passive:true,capture:true}));
document.addEventListener("visibilitychange",()=>{tLast=Date.now();if(!document.hidden)tAct=Date.now()});
setInterval(tTick,1000);

// ---------- ☀ focus-sentence marks (reading cards) ----------
// localStorage nova_sun = {topicId: [sentenceIndex,...]}; sync key "u:sun", merged as a union.
const SUNK="nova_sun";let SUN={};try{SUN=JSON.parse(localStorage.getItem(SUNK)||"{}")||{}}catch(e){SUN={}}
function sunSave(){try{localStorage.setItem(SUNK,JSON.stringify(SUN))}catch(e){}}
function sunHas(t,i){return !!(SUN[t]&&SUN[t].includes(i))}
function sunToggle(t,i){const a=SUN[t]||[];const k=a.indexOf(i);if(k>=0)a.splice(k,1);else{a.push(i);a.sort((x,y)=>x-y)}if(a.length)SUN[t]=a;else delete SUN[t];sunSave();return k<0}
function sunMerge(R,dry){let n=0;if(!R||typeof R!="object")return 0;for(const t in R){if(!Array.isArray(R[t]))continue;for(const i of R[t]){if(!Number.isInteger(i)||sunHas(t,i))continue;n++;if(!dry){(SUN[t]=SUN[t]||[]).push(i);SUN[t].sort((x,y)=>x-y)}}}if(!dry)sunSave();return n}
