// ---------- ⑦ 画面漫画 (context comics: one comic per stretch of sentences) ----------
// content/comics.json: {items:[{id,topic,sis:[sentence idx…],title,img,cols,rows,boxes?:[[l,t,w,h]%…],keys:[[phrase,panel,si],…]}]}
const KC=["#e2557a","#2f7fd8","#23955a","#d98200","#8a5cc7","#0f9aa8"];
let COMICS=null;async function loadComics(){if(!COMICS){try{COMICS=(await getJSON("comics.json")).items}catch(e){COMICS=[]}}return COMICS}
const ctNo=c=>+(/t(\d\d)/.exec(c.topic)||[0,0])[1];
function comicOrder(xs){return xs.slice().sort((a,b)=>ctNo(b)-ctNo(a)||a.sis[0]-b.sis[0]||a.sis.length-b.sis.length)}
function comicRange(sis){const r=[];let a=sis[0],p=a;for(const x of sis.slice(1).concat([null])){if(x!==p+1){r.push(a==p?`${a+1}`:`${a+1}–${p+1}`);a=x}p=x}return "第 "+r.join("、")+" 句"}
const topicItem=t=>CAT.categories.flatMap(c=>c.items).find(i=>i.id==t);
async function showComics(){setHeader("⑦ 画面漫画",true);V.innerHTML=`<div class="done">加载中…</div>`;const xs=comicOrder(await loadComics());
 const by={};for(const c of xs)(by[c.topic]=by[c.topic]||[]).push(c);const tops=Object.keys(by).sort((a,b)=>ctNo(by[b][0])-ctNo(by[a][0]));
 const ttl=t=>(topicItem(t)||{}).title||t;
 V.innerHTML=`<div class="tip">每张漫画讲一段原文的来龙去脉（几句话连起来）。点开：上面看漫画，下面逐句听原声、点读、点彩色关键词。</div>`+(tops.length?tops.map(t=>`<h3 class="sec">${esc(ttl(t))}</h3><div class="cml">${by[t].map(c=>`<button class="cmi" data-id="${c.id}"><span class="cmt" data-img="${c.img}"></span><span class="cms"><b>${esc(c.title)}</b><br><small class="cmr">${comicRange(c.sis)} · 共 ${c.sis.length} 句</small></span></button>`).join("")}</div>`).join(""):`<div class="done">还没有漫画</div>`);
 V.querySelectorAll(".cmi").forEach(b=>b.onclick=()=>location.hash="#/k/"+b.dataset.id);
 for(const s of V.querySelectorAll(".cmt"))comicSrc(s.dataset.img).then(u=>{s.style.backgroundImage=`url("${u}")`})}
const cmBlob={};async function comicSrc(p){if(!META.enc)return "content/"+p;if(!cmBlob[p])cmBlob[p]=URL.createObjectURL(new Blob([await getBuf("content/"+p)],{type:"image/webp"}));return cmBlob[p]}
function comicTokens(t){return t.split(/\s+/).filter(Boolean)}
const normW=w=>w.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9'-]/g,"");
function comicKeyMap(words,keys){const m={};const nw=words.map(normW);keys.forEach(([ph,p,k])=>{const pw=ph.split(/\s+/).map(normW);for(let i=0;i+pw.length<=nw.length;i++){if(pw.every((w,j)=>nw[i+j]==w||nw[i+j].replace(/s$/,"")==w.replace(/s$/,""))){for(let j=0;j<pw.length;j++)if(m[i+j]==null)m[i+j]=k;break}}});return m}
function comicSentHTML(s,si,keys){const words=comicTokens(s.t);const km=comicKeyMap(words,keys.map((x,k)=>[x[0],x[1],k]).filter((x,k)=>keys[k][2]==si));
 const segOf=i=>(s.seg||[]).findIndex(g=>i>=g[0]&&i<=g[1]);let html="",open=-1;
 words.forEach((w,i)=>{const g=segOf(i);if(g!=open){if(open>=0)html+="</span> ";if(g>=0)html+=`<span class="ph" data-si="${si}" data-g="${g}">`;open=g}else html+=" ";const k=km[i];html+=k!=null?`<span class="kw" data-k="${k}" style="--kc:${KC[k%KC.length]}">${esc(w)}</span>`:esc(w)});if(open>=0)html+="</span>";return html}
async function showComic(id){const xs=comicOrder(await loadComics());const ix=xs.findIndex(c=>c.id==id);const c=xs[ix];if(!c)return showComics();
 const it=topicItem(c.topic);setHeader(`⑦ Topic ${ctNo(c)} · 画面漫画`,true);V.innerHTML=`<div class="done">加载中…</div>`;
 const d=await getJSON(it.data);const SS=c.sis.map(i=>[i,d.sents[i]]).filter(x=>x[1]);
 const boxes=c.boxes||Array.from({length:c.cols*c.rows},(_,i)=>[(i%c.cols)*100/c.cols,Math.floor(i/c.cols)*100/c.rows,100/c.cols,100/c.rows]);
 const hasO=SS.some(x=>x[1].oa);
 V.innerHTML=`<div class="cmw" id="cmw"><img id="cimg" alt="comic"><div class="cpan">${boxes.map((b,i)=>`<div class="pn" data-p="${i}" style="left:${b[0]}%;top:${b[1]}%;width:${b[2]}%;height:${b[3]}%"></div>`).join("")}</div></div>
 <div class="cmttl"><b>${esc(c.title)}</b> <small>${comicRange(c.sis)}</small></div>
 <div class="bar cmbar">${hasO?'<button id="corig" class="org">🌻 整段原声</button>':""}<button id="cstp">■ 停止</button></div><div class="status" id="cst">点彩色的词 → 看对应的那一格；点句子 → 点读原声</div>
 <div class="cmkeys">${c.keys.map(([ph,p],k)=>`<button class="kc" data-k="${k}" style="--kc:${KC[k%KC.length]}">${esc(ph)} <small>→ 第 ${p+1} 格</small></button>`).join("")}</div>
 <div class="cmlist">${SS.map(([si,s])=>`<div class="cms1" data-si="${si}"><div class="cmsh"><span class="cmno">${si+1}</span>${s.sp&&s.sp!="Naval"?`<span class="cmsp">${esc(s.sp)}</span>`:""}${s.oa?`<button class="org cso" data-si="${si}">🌻</button>`:""}</div><div class="cmsent en">${comicSentHTML(s,si,c.keys)}</div>${s.zh?`<div class="cmzh">${esc(s.zh)}</div>`:""}</div>`).join("")}</div>
 <div class="yn cmnav"><button class="wide gray" id="cprev" ${ix>0?"":"disabled"}>‹ 上一张</button><button class="wide gray" id="cnext" ${ix<xs.length-1?"":"disabled"}>下一张 ›</button></div>`;
 comicSrc(c.img).then(u=>{document.getElementById("cimg").src=u});
 const st=t=>document.getElementById("cst").textContent=t;const pns=[...V.querySelectorAll(".pn")];const sOf=si=>d.sents[si];
 const hi=(p,col)=>{pns.forEach((e,i)=>{e.classList.toggle("on",i==p);e.classList.toggle("dim",p>=0&&i!=p);e.style.setProperty("--kc",col||"#d64545")});window._cpanel=p};
 const keyTap=k=>{const p=c.keys[k][1],col=KC[k%KC.length];hi(p,col);V.querySelectorAll(".kw,.kc").forEach(e=>e.classList.toggle("sel",+e.dataset.k==k));const r=document.getElementById("cmw").getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)document.getElementById("cmw").scrollIntoView({behavior:"smooth",block:"start"});st(`“${c.keys[k][0]}” → 第 ${p+1} 格`)};
 V.querySelectorAll(".kw,.kc").forEach(e=>e.onclick=ev=>{ev.stopPropagation();keyTap(+e.dataset.k)});
 const clr=()=>{V.querySelectorAll(".ph.play,.cms1.play").forEach(x=>x.classList.remove("play"))};
 const mark=si=>{clr();const e=V.querySelector(`.cms1[data-si="${si}"]`);if(e)e.classList.add("play")};
 window._cplayed=[];
 // play one clip [a,b) of sentence si; resolves when finished (false if interrupted)
 const playClip=(si,a,b,me)=>new Promise(async res=>{const s=sOf(si);if(!s||!s.oa)return res(true);A.onended=null;A.src=await audioURL(s.oa);if(me!=RUN)return res(false);window._cplayed.push(s.oa);A.playbackRate=1;
  const go=()=>{try{A.currentTime=a||0}catch(e){}A.play().catch(()=>{})};if(A.readyState>=1)go();else A.addEventListener("loadedmetadata",go,{once:true});
  const t0=Date.now();const tick=()=>{if(me!=RUN)return res(false);if(b!=null&&A.currentTime>=b){A.pause();return res(true)}if(A.ended||(A.paused&&Date.now()-t0>800&&A.currentTime>0.3))return res(true);requestAnimationFrame(tick)};requestAnimationFrame(tick)});
 V.querySelectorAll(".ph").forEach(e=>e.onclick=async()=>{const si=+e.dataset.si,s=sOf(si);if(!s.oa||!s.seg)return;const g=s.seg[+e.dataset.g];stopAll();const me=RUN;clr();e.classList.add("play");st("点读 · 原声");await playClip(si,g[2],g[3],me);if(me==RUN)e.classList.remove("play")});
 V.querySelectorAll(".cso").forEach(e=>e.onclick=async()=>{const si=+e.dataset.si;stopAll();const me=RUN;hi(-1);mark(si);st(`🌻 第 ${si+1} 句 · 原声`);await playClip(si,0,null,me);if(me==RUN){clr();st("播放完毕")}});
 if(hasO)document.getElementById("corig").onclick=async()=>{stopAll();const me=RUN;hi(-1);window._cplayed=[];
  for(const [si] of SS){if(me!=RUN)return;mark(si);const ky=c.keys.findIndex(k=>k[2]==si);if(ky>=0)hi(c.keys[ky][1],KC[ky%KC.length]);else hi(-1);st(`🌻 整段原声 · 第 ${si+1} 句`);const e=V.querySelector(`.cms1[data-si="${si}"]`);if(e){const r=e.getBoundingClientRect();if(r.bottom>innerHeight||r.top<0)e.scrollIntoView({behavior:"smooth",block:"center"})}if(!await playClip(si,0,null,me))return}
  if(me==RUN){clr();hi(-1);st("整段播放完毕")}};
 document.getElementById("cstp").onclick=()=>{stopAll();clr();hi(-1);st("已停止")};
 document.getElementById("cprev").onclick=()=>{if(ix>0)navSib("#/k/"+xs[ix-1].id)};document.getElementById("cnext").onclick=()=>{if(ix<xs.length-1)navSib("#/k/"+xs[ix+1].id)}}
