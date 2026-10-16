// ---------- ⑦ 画面漫画 (comic per key sentence) ----------
// content/comics.json: {items:[{id,topic,si,img,cols,rows,caps:[...],keys:[[phrase,panel],...]}]}
const KC=["#e2557a","#2f7fd8","#23955a","#d98200","#8a5cc7","#0f9aa8"];
let COMICS=null;async function loadComics(){if(!COMICS){try{COMICS=(await getJSON("comics.json")).items}catch(e){COMICS=[]}}return COMICS}
const ctNo=c=>+(/t(\d\d)/.exec(c.topic)||[0,0])[1];
function comicOrder(xs){return xs.slice().sort((a,b)=>ctNo(b)-ctNo(a)||a.si-b.si)}
async function showComics(){setHeader("⑦ 画面漫画",true);V.innerHTML=`<div class="done">加载中…</div>`;const xs=comicOrder(await loadComics());
 const by={};for(const c of xs)(by[c.topic]=by[c.topic]||[]).push(c);const tops=Object.keys(by).sort((a,b)=>ctNo(by[b][0])-ctNo(by[a][0]));
 const ttl=t=>{for(const c of CAT.categories)for(const i of c.items)if(i.id==t)return i.title;return t};
 const sents={};await Promise.all(tops.map(async t=>{try{const it=CAT.categories.flatMap(c=>c.items).find(i=>i.id==t);sents[t]=(await getJSON(it.data)).sents}catch(e){sents[t]=[]}}));
 V.innerHTML=`<div class="tip">每个 Topic 选了 2–3 句最有画面感的原句。点开：上面看漫画，下面听原声、点关键词。</div>`+(tops.length?tops.map(t=>`<h3 class="sec">${esc(ttl(t))}</h3><div class="cml">${by[t].map(c=>`<button class="cmi" data-id="${c.id}"><span class="cmt" data-img="${c.img}"></span><span class="cms">${esc(((sents[t][c.si]||{}).t)||"")}</span></button>`).join("")}</div>`).join(""):`<div class="done">还没有漫画</div>`);
 V.querySelectorAll(".cmi").forEach(b=>b.onclick=()=>location.hash="#/k/"+b.dataset.id);
 for(const s of V.querySelectorAll(".cmt"))comicSrc(s.dataset.img).then(u=>{s.style.backgroundImage=`url("${u}")`})}
const cmBlob={};async function comicSrc(p){if(!META.enc)return "content/"+p;if(!cmBlob[p])cmBlob[p]=URL.createObjectURL(new Blob([await getBuf("content/"+p)],{type:"image/webp"}));return cmBlob[p]}
function comicTokens(t){return t.split(/\s+/).filter(Boolean)}
const normW=w=>w.toLowerCase().replace(/[’']/g,"'").replace(/[^a-z0-9'-]/g,"");
function comicKeyMap(words,keys){const m={};const nw=words.map(normW);keys.forEach(([ph,p],k)=>{const pw=ph.split(/\s+/).map(normW);for(let i=0;i+pw.length<=nw.length;i++){if(pw.every((w,j)=>nw[i+j]==w||nw[i+j].replace(/s$/,"")==w.replace(/s$/,""))){for(let j=0;j<pw.length;j++)if(m[i+j]==null)m[i+j]=k;break}}});return m}
async function showComic(id){const xs=comicOrder(await loadComics());const ix=xs.findIndex(c=>c.id==id);const c=xs[ix];if(!c)return showComics();
 const it=CAT.categories.flatMap(q=>q.items).find(i=>i.id==c.topic);const n=ctNo(c);setHeader(`⑦ Topic ${n} · 画面漫画`,true);V.innerHTML=`<div class="done">加载中…</div>`;
 const d=await getJSON(it.data);const s=d.sents[c.si];const words=comicTokens(s.t);const km=comicKeyMap(words,c.keys);const NP=c.cols*c.rows;
 const segOf=i=>(s.seg||[]).findIndex(g=>i>=g[0]&&i<=g[1]);
 let html="",open=-1;words.forEach((w,i)=>{const g=segOf(i);if(g!=open){if(open>=0)html+="</span> ";if(g>=0)html+=`<span class="ph" data-g="${g}">`;else if(open>=0)html+="";open=g}else html+=" ";const k=km[i];html+=k!=null?`<span class="kw" data-k="${k}" style="--kc:${KC[k%KC.length]}">${esc(w)}</span>`:esc(w)});if(open>=0)html+="</span>";
 V.innerHTML=`<div class="cmw" id="cmw"><img id="cimg" alt="comic"><div class="cpan">${Array.from({length:NP},(_,i)=>`<div class="pn" data-p="${i}" style="left:${(i%c.cols)*100/c.cols}%;top:${Math.floor(i/c.cols)*100/c.rows}%;width:${100/c.cols}%;height:${100/c.rows}%"></div>`).join("")}</div></div>
 <div class="bar cmbar"><button id="cplay" class="red">▶ 看漫画听原声</button>${s.oa?'<button id="corig" class="org">🌻 原声</button>':""}<button id="cstp">■ 停止</button></div><div class="status" id="cst">点彩色的词 → 看对应的那一格；点句子 → 点读原声</div>
 <div class="cmsent en" id="csent">${html}</div>${s.zh?`<div class="cmzh">${esc(s.zh)}</div>`:""}
 <div class="cmkeys">${c.keys.map(([ph,p],k)=>`<button class="kc" data-k="${k}" style="--kc:${KC[k%KC.length]}">${esc(ph)} <small>→ 第 ${p+1} 格</small></button>`).join("")}</div>
 <div class="yn cmnav"><button class="wide gray" id="cprev" ${ix>0?"":"disabled"}>‹ 上一张</button><button class="wide gray" id="cnext" ${ix<xs.length-1?"":"disabled"}>下一张 ›</button></div>`;
 comicSrc(c.img).then(u=>{document.getElementById("cimg").src=u});
 const st=t=>document.getElementById("cst").textContent=t;const pns=[...V.querySelectorAll(".pn")];
 const hi=(p,col)=>{pns.forEach((e,i)=>{e.classList.toggle("on",i==p);e.classList.toggle("dim",p>=0&&i!=p);e.style.setProperty("--kc",col||"#d64545")});window._cpanel=p};
 const keyTap=k=>{const p=c.keys[k][1],col=KC[k%KC.length];hi(p,col);V.querySelectorAll(".kw,.kc").forEach(e=>e.classList.toggle("sel",+e.dataset.k==k));const r=document.getElementById("cmw").getBoundingClientRect();if(r.top<0||r.bottom>innerHeight)document.getElementById("cmw").scrollIntoView({behavior:"smooth",block:"start"});st(`“${c.keys[k][0]}” → 第 ${p+1} 格`)};
 V.querySelectorAll(".kw,.kc").forEach(e=>e.onclick=ev=>{ev.stopPropagation();keyTap(+e.dataset.k)});
 const playClip=async(a,b,onT)=>{stopAll();const me=RUN;A.onended=null;A.src=await audioURL(s.oa);A.playbackRate=1;const go=()=>{try{A.currentTime=a||0}catch(e){}A.play().catch(()=>{})};if(A.readyState>=1)go();else A.addEventListener("loadedmetadata",go,{once:true});
  const tick=()=>{if(me!=RUN)return;if(b!=null&&A.currentTime>=b){A.pause();done();return}if(onT)onT(A.currentTime);if(!A.paused||A.currentTime<0.3)requestAnimationFrame(tick);else done()};const done=()=>{V.querySelectorAll(".ph.play").forEach(x=>x.classList.remove("play"));const pb=document.getElementById("cplay");if(pb)pb.classList.remove("on")};requestAnimationFrame(tick)};
 V.querySelectorAll(".ph").forEach(e=>e.onclick=()=>{if(!s.oa||!s.seg)return;const g=s.seg[+e.dataset.g];V.querySelectorAll(".ph.play").forEach(x=>x.classList.remove("play"));e.classList.add("play");st("点读 · 原声");playClip(g[2],g[3])});
 if(s.oa)document.getElementById("corig").onclick=()=>{hi(-1);st("🌻 原声");playClip(0,null)};
 document.getElementById("cplay").onclick=()=>{const b=document.getElementById("cplay");if(!s.oa)return toast("这句没有原声");b.classList.add("on");hi(0);st(`▶ 第 1 / ${NP} 格`);let last=0;
  playClip(0,null,t=>{const dur=isFinite(A.duration)&&A.duration>0?A.duration:(s.d||5);const p=Math.min(NP-1,Math.floor(t/dur*NP));if(p!=last){last=p;hi(p);st(`▶ 第 ${p+1} / ${NP} 格`)}})};
 document.getElementById("cstp").onclick=()=>{stopAll();hi(-1);st("已停止");document.getElementById("cplay").classList.remove("on")};
 document.getElementById("cprev").onclick=()=>{if(ix>0)location.hash="#/k/"+xs[ix-1].id};document.getElementById("cnext").onclick=()=>{if(ix<xs.length-1)location.hash="#/k/"+xs[ix+1].id}}
