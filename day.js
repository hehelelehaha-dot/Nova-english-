// ---------- ⓪ 清醒重点 (2026-10-23): one Topic in ~30 min, learning only (no scores). Driven by Topic number: naval_tNN / tNNv_flash / ch_tNN / wordforms wf_tNNv. English original never altered. ----------
const DAYK="nova_day",DAYST=()=>{try{return JSON.parse(localStorage.getItem(DAYK))||{}}catch(e){return {}}},daySave=o=>{try{localStorage.setItem(DAYK,JSON.stringify(Object.assign(DAYST(),o)))}catch(e){}};
const DSTEPS=[["rd","读+听",6],["wd","单词",6],["wf","词形",3],["ch","Chunks",4],["dt","听写",6],["sp","口语",5]];
const dpad=n=>String(n).padStart(2,"0");
function dPick(a,n){if(a.length<=n)return a.slice();const r=[],st=a.length/n;for(let i=0;i<n;i++)r.push(a[Math.floor(i*st)]);return r}
const dShuf=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
async function dPlay(p){if(!p)return;try{A.src=await audioURL(p);A.currentTime=0;await A.play()}catch(e){}}
let DTM=null;
function dTimer(min){clearInterval(DTM);let left=min*60,run=false;const el=document.getElementById("dtm");if(!el)return;
 const draw=()=>{el.querySelector(".dtv").textContent=Math.floor(left/60)+":"+String(left%60).padStart(2,"0");el.classList.toggle("over",left<=0)};draw();
 el.querySelector(".dtb").onclick=()=>{run=!run;el.querySelector(".dtb").textContent=run?"⏸":"▶︎";if(run)DTM=setInterval(()=>{if(!document.getElementById("dtm")){clearInterval(DTM);return}if(left>0)left--;draw()},1000);else clearInterval(DTM)}}
async function showDay(n){n=+n||+(DAYST().topic)||11;const st=DAYST();const mode=st.mode||"in";const N=dpad(n);
 setHeader("⓪ 清醒重点",true);let R,F,C,W;
 try{[R,F,C]=await Promise.all([getJSON("naval_t"+N+".json"),getJSON("t"+N+"v_flash.json"),getJSON("ch_t"+N+".json")]);}catch(e){V.innerHTML=`<div class="done">Topic ${n} 的材料还没有准备好</div>`;return}
 try{W=(await loadWF()).sets.find(s=>s.unit=="t"+N+"v")}catch(e){W=null}
 const steps=DSTEPS.filter(s=>mode=="in"||s[0]!="sp");let cur=Math.min(st.step&&st.topic==n?st.step:0,steps.length-1);
 const D={n,mode,R,F,C,W,key:dPick(R.sents.map((s,i)=>[s,i]).filter(x=>(x[0].bkc||[]).length).sort((a,b)=>(b[0].bkc||[]).length-(a[0].bkc||[]).length).slice(0,8).sort((a,b)=>a[1]-b[1]).map(x=>x[0]),8),
  words:dPick(F.cards,10),wf:W?(W.items.filter(x=>x.l=="原文").slice(0,3)):[],chunks:dPick(C.items.filter(x=>x.hl),6),dict:null};
 function render(){const s=steps[cur];daySave({topic:n,step:cur});
  V.innerHTML=`<div class="dhd"><div class="dmode" role="group" aria-label="今天在哪里">今天：<button data-m="in" class="${mode=="in"?"on":""}">🏠 室内</button><button data-m="out" class="${mode=="out"?"on":""}">🚇 室外</button></div>
  <div class="dtop">Topic ${n} · ${esc((R.title||"").replace(/^Topic \d+ · /,""))}</div>
  <div class="dsteps">${steps.map((x,i)=>`<button class="dst ${i==cur?"on":""} ${i<cur?"done":""}" data-i="${i}"><b>${i+1}</b><span>${x[1]}</span></button>`).join("")}</div>
  <div class="dbar"><span class="dname">${cur+1}. ${s[1]}</span><span class="dtm" id="dtm">建议 ${s[2]} 分钟 <span class="dtv"></span> <button class="dtb" aria-label="计时">▶︎</button></span></div></div>
  <div class="dbody" id="dbody"></div>
  <div class="dnav"><button class="dprev" ${cur==0?"disabled":""}>‹ 上一步</button><button class="dnext">${cur==steps.length-1?"今天完成 ✓":"下一步 ›"}</button></div>`;
  V.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{daySave({mode:b.dataset.m,step:0});showDay(n)});
  V.querySelectorAll(".dst").forEach(b=>b.onclick=()=>{cur=+b.dataset.i;render()});
  V.querySelector(".dprev").onclick=()=>{if(cur>0){cur--;render()}};
  V.querySelector(".dnext").onclick=()=>{if(cur<steps.length-1){cur++;render();scrollTo(0,0)}else{daySave({step:0});V.querySelector("#dbody").innerHTML=`<div class="dok">🎉 Topic ${n} 今天的练习走完了！<br>不打分，学到就好。</div>`}};
  dTimer(s[2]);DSTEP[s[0]](document.getElementById("dbody"),D)}
 render()}
const DSTEP={
 rd(el,D){const tip=D.mode=="in"?"点句子听原声 → 看中文 → <b>大声跟读一遍</b>":"戴耳机，点句子听原声，<b>心里默读</b>，点「中文」看意思";
  el.innerHTML=`<p class="dtip">${tip}</p>${D.key.map((s,i)=>`<div class="dsn" data-i="${i}"><div class="dse">${esc(s.t)}</div><div class="dsz" hidden>${esc(s.zh||"")}</div><div class="dsb"><button class="dpl">🎧 听</button><button class="dzh">中文</button>${D.mode=="in"?`<span class="dsh">🗣 跟读</span>`:""}</div></div>`).join("")}<p class="dmore"><a href="#/i/naval_t${dpad(D.n)}">打开完整阅读卡 ›</a></p>`;
  el.querySelectorAll(".dsn").forEach(b=>{const s=D.key[+b.dataset.i];b.querySelector(".dpl").onclick=()=>dPlay(s.a);b.querySelector(".dzh").onclick=()=>{const z=b.querySelector(".dsz");z.hidden=!z.hidden}})},
 wd(el,D){let i=0;const draw=()=>{const c=D.words[i];el.innerHTML=`<p class="dtip">看中文，先在心里说出英文，再点「看答案」。</p><div class="dcard"><div class="dcn">${i+1} / ${D.words.length}</div><div class="dcz">${esc(c.zh)}</div><div class="dcp">${esc(c.pos||"")}</div><div class="dca" hidden><div class="dcw">${esc(c.w)}</div><div class="dcx">${esc((c.exs||[])[0]||"")}</div></div><div class="dcbt"><button class="dshow">看答案</button></div></div><div class="dnav2"><button class="dp" ${i?"":"disabled"}>‹</button><button class="dn" ${i<D.words.length-1?"":"disabled"}>›</button></div>`;
   el.querySelector(".dshow").onclick=ev=>{el.querySelector(".dca").hidden=false;ev.target.textContent="🎧 再听";ev.target.onclick=()=>dPlay((c.a||[])[0]);dPlay((c.a||[])[0])};
   el.querySelector(".dp").onclick=()=>{i--;draw()};el.querySelector(".dn").onclick=()=>{i++;draw()}};draw()},
 wf(el,D){if(!D.wf.length){el.innerHTML=`<p class="dtip">这个 Topic 还没有词形题，今天跳过这一步。</p>`;return}
  el.innerHTML=`<p class="dtip">选一个词形填空，选完会显示正确答案和原因。</p>${D.wf.map((q,k)=>`<div class="dq" data-k="${k}"><div class="dqs">${esc(q.s).replace("___","<u>＿＿＿</u>")}</div><div class="dqo">${q.o.map(o=>`<button>${esc(o)}</button>`).join("")}</div><div class="dqw" hidden>✅ <b>${esc(q.a)}</b>（${esc(q.p)}）${esc(q.why||"")}</div></div>`).join("")}`;
  el.querySelectorAll(".dq").forEach(b=>{const q=D.wf[+b.dataset.k];b.querySelectorAll(".dqo button").forEach(x=>x.onclick=()=>{b.querySelectorAll(".dqo button").forEach(y=>y.classList.toggle("ok",y.textContent==q.a));if(x.textContent!=q.a)x.classList.add("try");b.querySelector(".dqw").hidden=false;dPlay(q.au)})})},
 ch(el,D){el.innerHTML=`<p class="dtip">看中文提示，把 chunk 打出来补全句子，再点「看答案」。${D.mode=="in"?"看完答案大声读一遍整句。":""}</p>${D.chunks.map((c,k)=>{const h=c.hl;return `<div class="dq" data-k="${k}"><div class="dqs">${esc(c.s.slice(0,h[0]))}<u>＿＿＿</u>${esc(c.s.slice(h[1]))}</div><div class="dqz">提示：${esc(c.zh)}</div><input class="din" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="打出 chunk"><div class="dcbt"><button class="dshow">看答案</button></div><div class="dqw" hidden>✅ <b>${esc(c.c)}</b> <button class="dpl">🎧</button></div></div>`}).join("")}`;
  el.querySelectorAll(".dq").forEach(b=>{const c=D.chunks[+b.dataset.k];b.querySelector(".dshow").onclick=()=>{b.querySelector(".dqw").hidden=false;const v=b.querySelector(".din").value.trim().toLowerCase().replace(/[’]/g,"'");if(v)b.querySelector(".din").classList.add(v==c.c.toLowerCase().replace(/[’]/g,"'")?"good":"near");dPlay(c.o)};b.querySelector(".dpl").onclick=()=>dPlay(c.o)})},
 dt(el,D){const SM=new Set("a an the to of in on at for with and but or so is are was were be it its it’s that this you your we they he she i my me not do don’t can just if as from by up out all have has had what how".split(" "));
  if(!D.dict){D.dict=dPick(D.R.sents.filter(s=>s.a&&s.t.split(" ").length>=5&&s.t.split(" ").length<=22),6).map(s=>{const w=s.t.split(" ");const c=w.map((x,i)=>[x.replace(/[^\w’']/g,""),i]).filter(x=>SM.has(x[0].toLowerCase())&&x[0]);const p=c.length?c[(c.length/2)|0]:[w[0].replace(/[^\w’']/g,""),0];return{s,w,i:p[1],ans:p[0]}})}
  el.innerHTML=`<p class="dtip">点 🎧 听原声，把空着的那个小词打出来，再点「看答案」。可以多听几遍。</p>${D.dict.map((q,k)=>`<div class="dq" data-k="${k}"><div class="dqs">${q.w.map((x,i)=>i==q.i?esc(x.replace(q.ans,"<<>>")).replace("&lt;&lt;&gt;&gt;","<u>＿＿</u>"):esc(x)).join(" ")}</div><div class="dcbt"><button class="dpl">🎧 听</button><input class="din sm" autocapitalize="off" autocomplete="off" spellcheck="false"><button class="dshow">看答案</button></div><div class="dqw" hidden>✅ <b>${esc(q.ans)}</b><div class="dqz">${esc(q.s.zh||"")}</div></div></div>`).join("")}`;
  el.querySelectorAll(".dq").forEach(b=>{const q=D.dict[+b.dataset.k];b.querySelector(".dpl").onclick=()=>dPlay(q.s.a);b.querySelector(".dshow").onclick=()=>{b.querySelector(".dqw").hidden=false;const v=b.querySelector(".din").value.trim().toLowerCase();if(v)b.querySelector(".din").classList.add(v==q.ans.toLowerCase()?"good":"near")}})},
 sp(el,D){const PR=["在美睫店里，跟一位第一次来的客人聊天","客人问你做这份工作开不开心","跟朋友聊：你更想要钱还是被别人羡慕","跟同事聊：怎么做才能多赚一点钱","跟邻居聊：你周末是怎么过的"];
  const two=dShuf(D.C.items).slice(0,2),pr=PR[(Math.random()*PR.length)|0];
  el.innerHTML=`<p class="dtip">录 30 秒，用上下面 2 个 chunk。不打分，说出来就好，录音只存在这台设备上。</p><div class="dcard"><div class="dqz">场景：${esc(pr)}</div>${two.map(c=>`<div class="dck"><b>${esc(c.c)}</b> · ${esc(c.zh)} <button class="dpl" data-a="${esc(c.o)}">🎧</button></div>`).join("")}<div class="dcbt"><button class="drec">🎙 开始录音（30秒）</button><span class="dcnt"></span></div></div><div class="dlist"></div>`;
  el.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>dPlay(b.dataset.a));
  const list=async()=>{const rs=await recAll(D.n);el.querySelector(".dlist").innerHTML=rs.length?`<p class="dtip">我的录音</p>`+rs.map(r=>`<div class="drow"><span>${new Date(r.at).toLocaleString("zh-CN",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})} · ${esc(r.p)}</span><audio controls preload="none" src="${URL.createObjectURL(r.b)}"></audio></div>`).join(""):""};list();
  const btn=el.querySelector(".drec");let MR=null,tm=null;
  btn.onclick=async()=>{if(MR){MR.stop();return}let s;try{s=await navigator.mediaDevices.getUserMedia({audio:true})}catch(e){el.querySelector(".dcnt").textContent="没有麦克风权限";return}
   const ch=[];MR=new MediaRecorder(s);MR.ondataavailable=e=>ch.push(e.data);let left=30;btn.textContent="⏹ 停止";el.querySelector(".dcnt").textContent=left+"s";
   tm=setInterval(()=>{left--;const c=el.querySelector(".dcnt");if(c)c.textContent=left+"s";if(left<=0&&MR)MR.stop()},1000);
   MR.onstop=async()=>{clearInterval(tm);s.getTracks().forEach(t=>t.stop());await recPut({topic:D.n,at:Date.now(),p:pr+"："+two.map(c=>c.c).join(" / "),b:new Blob(ch,{type:MR.mimeType||"audio/mp4"})});MR=null;btn.textContent="🎙 再录一次";el.querySelector(".dcnt").textContent="已保存 ✓";list()};MR.start()}}};
function recDB(){return new Promise((ok,no)=>{const r=indexedDB.open("nova_rec",1);r.onupgradeneeded=()=>r.result.createObjectStore("rec",{autoIncrement:true});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}
async function recPut(o){const db=await recDB();return new Promise(ok=>{const t=db.transaction("rec","readwrite");t.objectStore("rec").add(o);t.oncomplete=ok})}
async function recAll(n){try{const db=await recDB();return await new Promise(ok=>{const q=db.transaction("rec").objectStore("rec").getAll();q.onsuccess=()=>ok(q.result.filter(r=>r.topic==n).reverse())})}catch(e){return []}}
