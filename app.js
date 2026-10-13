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
const A=new Audio();A.preload="auto";let RUN=0;
function stopAll(){RUN++;try{A.pause()}catch(e){}if(window.speechSynthesis)speechSynthesis.cancel()}
async function playP(p,rate=1,fbText){const url=await audioURL(p);return new Promise(r=>{A.onended=()=>r(true);A.onerror=()=>speak(fbText,rate).then(r);A.src=url;A.playbackRate=rate;A.defaultPlaybackRate=rate;
 const q=A.play();if(q)q.then(()=>{A.playbackRate=rate}).catch(()=>speak(fbText,rate).then(r))})}
function speak(t,rate){return new Promise(r=>{if(!t||!window.speechSynthesis)return r();const u=new SpeechSynthesisUtterance(t);u.lang="en-US";u.rate=rate*.9;u.onend=r;u.onerror=r;speechSynthesis.cancel();speechSynthesis.speak(u)})}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
// ---------- ui helpers ----------
const V=document.getElementById("view");const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function setHeader(t,back){document.getElementById("title").textContent=t;document.getElementById("back").classList.toggle("hidden",!back)}
let CAT=null;
async function route(){stopAll();window.scrollTo(0,0);
 if(META.enc&&!KEY){if(!(await unlock()))return lockScreen()}
 if(!CAT)CAT=await getJSON("catalog.json");
 const h=location.hash.slice(1).split("/");
 try{if(h[1]=="c")return showCat(h[2]);if(h[1]=="i")return showItem(h[2]);if(h[1]=="m")return showMine(h[2]);showHome()}catch(e){V.innerHTML=`<div class="done">出错了：${esc(e.message)}</div>`;console.error(e)}}
window.addEventListener("hashchange",route);
function showHome(){setHeader("Nova 英语",false);
 V.innerHTML=`<div class="tiles">${CAT.categories.map(c=>`<button class="tile" onclick="location.hash='#/c/${c.id}'"><span class="ic">${c.icon}</span><span class="nm">${esc(c.name)}</span><span class="ds">${esc(c.desc)}</span><span class="ct">${c.items.length} 项</span></button>`).join("")}</div>`}
async function showCat(id){const c=CAT.categories.find(x=>x.id==id);setHeader(c.name,true);
 const mine=(await idbAll().catch(()=>[])).filter(f=>f.cat==id);
 V.innerHTML=`<div class="list">${c.items.map(it=>`<button class="li" onclick="location.hash='#/i/${it.id}'"><span class="tt">${esc(it.title)}<span class="sb">${esc(it.sub||"")}</span></span><span class="ar">›</span></button>`).join("")}
 ${mine.map(f=>`<button class="li" onclick="location.hash='#/m/${f.id}'"><span class="tt">🎵 ${esc(f.name)}<span class="sb">我导入的音频</span></span><span class="ar">›</span></button>`).join("")}</div>
 <div class="import"><label class="btn" style="display:flex;align-items:center;justify-content:center">＋ 导入我的 MP3 到「${esc(c.name)}」<input type="file" accept="audio/*" style="display:none" id="imp"></label></div>`;
 document.getElementById("imp").onchange=async e=>{const f=e.target.files[0];if(!f)return;await idbPut({id:"m"+Date.now(),cat:id,name:f.name.replace(/\.[^.]+$/,""),blob:f});showCat(id)}}
async function showMine(id){const f=(await idbAll()).find(x=>x.id==id);if(!f)return showHome();setHeader(f.name,true);
 V.innerHTML=`<div class="player"><audio id="au" controls src="${URL.createObjectURL(f.blob)}"></audio><div class="pb"><button class="btn" id="sp">速度 1x</button><button class="btn" id="del">删除这个音频</button></div></div>`;
 const au=document.getElementById("au");let r=[1,.85,.75],i=0;document.getElementById("sp").onclick=e=>{i=(i+1)%3;au.playbackRate=r[i];e.target.textContent="速度 "+r[i]+"x"};
 document.getElementById("del").onclick=async()=>{if(confirm("删除这个导入的音频？")){await idbDel(id);history.back()}}}
async function showItem(id){let it,cat;for(const c of CAT.categories){const x=c.items.find(i=>i.id==id);if(x){it=x;cat=c}}if(!it)return showHome();
 setHeader(it.title,true);V.innerHTML=`<div class="done">加载中…</div>`;const d=await getJSON(it.data);
 ({reading:viewReading,flash:viewFlash,words:viewWords,longaudio:viewLong})[d.type](d,id)}
// ---------- reading card ----------
function viewReading(d){const SP=[1,.85,.75];let si=0,cur=-1;const F={loop:false,shad:false,hid:false};
 V.innerHTML=`<div class="bar"><button id="all" class="red">▶ 全部连播</button><button id="loop">单句循环</button><button id="shad">跟读停顿</button><button id="spd">速度 1x</button><button id="hid">隐藏文字</button><button id="stp">■ 停止</button></div><div class="status" id="st"></div><div id="ss"></div>`;
 const ss=document.getElementById("ss"),st=x=>document.getElementById("st").textContent=x;
 d.sents.forEach((s,i)=>{const e=document.createElement("div");e.className="s "+s.sp.toLowerCase();e.id="s"+i;
  e.innerHTML=`<div class="body"><div class="who">${s.sp=="Naval"?"NAVAL RAVIKANT":"CHRIS WILLIAMSON"}</div><div class="t"></div></div><button class="p">▶</button>`;
  e.querySelector(".t").textContent=s.t;e.querySelector(".t").onclick=e.querySelector(".p").onclick=()=>{stopAll();setAll(false);seq([i])};ss.appendChild(e)});
 const mark=i=>{document.querySelectorAll(".cur").forEach(x=>x.classList.remove("cur"));cur=i;const e=document.getElementById("s"+i);e.classList.add("cur");e.scrollIntoView({block:"center",behavior:"smooth"})};
 const setAll=on=>{const b=document.getElementById("all");b.classList.toggle("on",on);b.textContent=on?"⏸ 暂停连播":"▶ 全部连播"};
 async function seq(list){const me=++RUN;for(const i of list){do{if(me!=RUN)return;mark(i);st(`第 ${i+1} / ${d.sents.length} 句`);await playP(d.sents[i].a,SP[si],d.sents[i].t);if(me!=RUN)return;
  if(F.shad){st(`第 ${i+1} 句 · 请跟读…`);await wait(d.sents[i].d/SP[si]*1000+600)}else await wait(F.loop?700:350)}while(F.loop&&me==RUN)}if(me==RUN){setAll(false);st("播放完毕")}}
 const $=id=>document.getElementById(id);
 $("all").onclick=()=>{const on=$("all").classList.contains("on");stopAll();setAll(false);if(on)return;setAll(true);const s=cur>0&&cur<d.sents.length-1?cur:0;seq(d.sents.map((_,i)=>i).slice(s))};
 for(const k of ["loop","shad","hid"])$(k).onclick=()=>{F[k]=!F[k];$(k).classList.toggle("on",F[k]);if(k=="hid")ss.classList.toggle("hide",F.hid)};
 $("spd").onclick=()=>{si=(si+1)%3;A.playbackRate=SP[si];$("spd").textContent="速度 "+SP[si]+"x"};
 $("stp").onclick=()=>{stopAll();setAll(false);st("")}}
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
   <div class="yn"><button class="wide no" onclick="_fc.mark(${i},'u')">不认识</button><button class="wide yes" onclick="_fc.mark(${i},'k')">认识</button></div>`;
  $("fc").innerHTML=h+"</div>"}
 render()}
// ---------- word pronunciation list ----------
function viewWords(d){let rate=1;
 V.innerHTML=`<div class="bar"><button id="all" class="red">▶ 全部连播</button><button id="spd">速度 1x</button></div><div id="wl">${d.items.map((m,i)=>`<div class="wc" id="w${i}"><div class="top"><span style="color:#999;width:24px">${m.n}</span><div style="flex:1"><div class="w">${esc(m.w)} <span class="ps">${esc(m.pos)}</span></div><div class="z">${esc(m.zh)}</div></div><button class="p" data-i="${i}" data-k="w">▶</button></div><button class="exb" data-i="${i}" data-k="e">▷ 例句　${esc(m.ex)}</button></div>`).join("")}</div>`;
 const mark=i=>{document.querySelectorAll(".cur").forEach(x=>x.classList.remove("cur"));const e=document.getElementById("w"+i);e.classList.add("cur");e.scrollIntoView({block:"center",behavior:"smooth"})};
 const setAll=on=>{const b=document.getElementById("all");b.classList.toggle("on",on);b.textContent=on?"■ 停止":"▶ 全部连播"};
 V.querySelectorAll("[data-i]").forEach(b=>b.onclick=()=>{stopAll();setAll(false);const i=+b.dataset.i,m=d.items[i];mark(i);b.dataset.k=="w"?playP(m.aw,rate,m.w):playP(m.ae,rate,m.ex)});
 document.getElementById("all").onclick=async()=>{const on=document.getElementById("all").classList.contains("on");stopAll();setAll(false);if(on)return;setAll(true);const me=++RUN;
  for(let i=0;i<d.items.length;i++){if(me!=RUN)return;mark(i);await playP(d.items[i].aw,rate,d.items[i].w);if(me!=RUN)return;await wait(1200/rate);await playP(d.items[i].aw,rate,d.items[i].w);if(me!=RUN)return;await wait(1800/rate)}setAll(false)};
 document.getElementById("spd").onclick=e=>{rate=rate==1?.75:1;A.playbackRate=rate;e.target.textContent="速度 "+rate+"x"}}
// ---------- long audio with item jump ----------
async function viewLong(d){const url=await audioURL(d.audio);const R=[1,.85,.75];let ri=0;
 V.innerHTML=`<div class="player"><audio id="au" controls preload="metadata" src="${url}"></audio><div class="pb"><button class="btn" id="bk">⟲ 10秒</button><button class="btn" id="sp">速度 1x</button><button class="btn" id="fw">10秒 ⟳</button></div><div class="status" id="nw" style="margin:8px 2px 0"></div></div>
 ${d.items.map((e,i)=>`<div class="ent" id="e${i}"><div class="hd"><span class="n">${e.n}</span><span class="w en">${esc(e.w)}</span><span style="color:#888;font-style:italic">${esc(e.pos||"")}</span><span class="z">${esc(e.zh||"")}</span>${e.t!=null?`<button class="jump" data-t="${e.t}">▶ 从这里听</button>`:""}</div><p>${esc(e.ex)}</p>${e.exs&&e.exs.length?`<div style="font-weight:700;font-size:13px;color:#555">For example:</div><ol>${e.exs.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`:""}</div>`).join("")}`;
 const au=document.getElementById("au");
 V.querySelectorAll(".jump").forEach(b=>b.onclick=()=>{au.currentTime=+b.dataset.t;au.playbackRate=R[ri];au.play().catch(()=>{})});
 document.getElementById("bk").onclick=()=>au.currentTime=Math.max(0,au.currentTime-10);document.getElementById("fw").onclick=()=>au.currentTime+=10;
 document.getElementById("sp").onclick=e=>{ri=(ri+1)%3;au.playbackRate=R[ri];e.target.textContent="速度 "+R[ri]+"x"};
 const ts=d.items.map(e=>e.t);let last=-1;au.ontimeupdate=()=>{let k=-1;for(let i=0;i<ts.length;i++)if(ts[i]!=null&&au.currentTime>=ts[i])k=i;
  if(k!=last){last=k;document.querySelectorAll(".ent.cur").forEach(x=>x.classList.remove("cur"));if(k>=0){document.getElementById("e"+k).classList.add("cur");document.getElementById("nw").textContent=`正在播放：${d.items[k].n}. ${d.items[k].w}`}}};
 window._stopLong=()=>au.pause()}
// stop long-audio element on navigation
window.addEventListener("hashchange",()=>{document.querySelectorAll("audio").forEach(a=>a.pause())});
// ---------- boot ----------
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(e=>console.warn("SW",e));
(async()=>{try{META=await (await fetch("meta.json")).json()}catch(e){}route()})();
