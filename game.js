"use strict";
// ---------- 🎮 games: units built from the catalog (flash / words / longaudio), deduped by word set ----------
let UNITS=null;
const ansOf=w=>String(w).replace(/\([^)]*\)/g," ").replace(/…|\.\.\./g," ").split("/")[0].replace(/\s+/g," ").trim();
const normA=s=>s.toLowerCase().replace(/[’‘]/g,"'").replace(/[-‐–]/g," ").replace(/[^a-z' ]/g,"").replace(/\s+/g," ").trim();
async function loadUnits(){if(UNITS)return UNITS;const map=new Map();
 for(const c of CAT.categories)for(const it of c.items){let d;try{d=await getJSON(it.data)}catch(e){continue}
  let ws=null;
  if(d.type=="flash")ws=d.cards.map(x=>({w:x.w,pos:x.pos,zh:x.zh,ex:x.ex,exs:x.exs||[],src:x.src,clip:x.a&&x.a[0]}));
  else if(d.type=="words")ws=d.items.map(x=>({w:x.w,pos:x.pos,zh:x.zh,ex:"",exs:x.ex?[x.ex]:[],clip:x.aw}));
  else if(d.type=="longaudio")ws=d.items.map(x=>{const tt=x.tt;const a=tt&&tt.w!=null?tt.w:x.t;const b=tt&&tt.ex&&tt.ex.length?tt.ex[0][1]:(a!=null?a+2.5:null);
    return {w:x.w,pos:x.pos,zh:x.zh,ex:x.ex,exs:x.exs||[],src:x.src,seg:a!=null?{a:d.audio,s:a,e:Math.min(b,a+4)}:null}});
  if(!ws||ws.length<2)continue;const key=ws.map(x=>normA(ansOf(x.w))).sort().join("|");
  const prev=map.get(key);
  if(!prev)map.set(key,{id:it.id,title:it.title.replace(/\s*·\s*(英英解释|单词卡|30词英英解释|30词简洁版|40词英英解释)$/,""),words:ws,order:map.size});
  else ws.forEach((x,i)=>{const p=prev.words.find(y=>normA(ansOf(y.w))==normA(ansOf(x.w)));if(p){for(const k of["clip","seg","src","ex","pos"])if(!p[k]&&x[k])p[k]=x[k];if(!p.exs.length&&x.exs.length)p.exs=x.exs}})}
 UNITS=[...map.values()].filter(u=>u.words.some(w=>normA(ansOf(w.w)).length>1));return UNITS}
async function playWord(w,rate=1){stopAll();if(w.clip)return playP(w.clip,rate,ansOf(w.w));
 if(w.seg){const url=await audioURL(w.seg.a);const me=RUN;return new Promise(r=>{const end=()=>{A.removeEventListener("timeupdate",tu);r()};const tu=()=>{if(A.currentTime>=w.seg.e||me!=RUN){A.pause();end()}};
  A.src=url;A.playbackRate=rate;A.addEventListener("timeupdate",tu);A.onended=end;const go=()=>{A.currentTime=w.seg.s;A.play().catch(()=>speak(ansOf(w.w),rate).then(end))};if(A.readyState>=1)go();else A.onloadedmetadata=go})}
 return speak(ansOf(w.w),rate)}
// ---------- cloze: original sentence (原文) or example (例句) with the target form ----------
const reEsc=x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
function formRe(ans){const parts=ans.split(" ").filter(p=>p&&!/^(sth|sb|someone|something)$/i.test(p));
 return new RegExp("\\b"+parts.map(p=>{const l=p.toLowerCase();let alt=reEsc(l)+"(?:s|es|ed|d|ing|'s)?";
  if(/e$/.test(l))alt+="|"+reEsc(l.slice(0,-1))+"(?:ing|ed)";if(/y$/.test(l))alt+="|"+reEsc(l.slice(0,-1))+"(?:ies|ied)";
  if(/[bdgmnpt]$/.test(l))alt+="|"+reEsc(l)+l.slice(-1)+"(?:ed|ing)";return "(?:"+alt+")"}).join("[\\s-]+(?:\\w+\\s+)?")+"\\b","i")}
function clozeOf(w){if(w.src&&w.src.hl)return {t:w.src.t,s:w.src.hl[0],e:w.src.hl[1],label:"原文",src:w.src};
 const re=formRe(ansOf(w.w));for(const x of w.exs||[]){const m=re.exec(x.replace(/[’]/g,"'"));if(m)return {t:x,s:m.index,e:m.index+m[0].length,label:"例句"}}return null}
// ---------- results (local + sync fields g:<unit>:<mode>) ----------
const GK="nova_game";const gRes=()=>JSON.parse(localStorage.getItem(GK)||"{}");
function gResult(uid,mode){const F=FIELDS["g:"+uid+":"+mode];return F&&F[0]||gRes()[uid+":"+mode]||null}
function saveResult(uid,mode,score,total,correct){const old=gResult(uid,mode)||{best:0,plays:0};
 const r={best:Math.max(old.best||0,score),last:score,total,correct,plays:(old.plays||0)+1,at:Date.now()};
 const g=gRes();g[uid+":"+mode]=r;localStorage.setItem(GK,JSON.stringify(g));stamp("g:"+uid+":"+mode,r);localStorage.setItem(FK,JSON.stringify(FIELDS));return r}
// ---------- UI ----------
async function showGames(){setHeader("🎮 小游戏",true);V.innerHTML=`<div class="done">加载中…</div>`;const us=await loadUnits();
 V.innerHTML=`<div class="tip">每个单元都可以玩两种游戏。成绩只存在这台设备上（导出整理时会一起同步）。</div><div class="list">${us.map(u=>{const s=gResult(u.id,"spell"),p=gResult(u.id,"puzzle"),z=gResult(u.id,"cloze");
  return `<div class="gu"><div class="gt"><b>${esc(u.title)}</b><span class="sb">${u.words.length} 个词${s||p||z?` · 最高分 拼写 ${s?s.best:"-"} / 拼图 ${p?p.best:"-"} / 填词 ${z?z.best:"-"}`:""}${u.words.some(w=>w.src)?" · 📖 有原文":""}</span></div>
  <div class="gb"><button class="wide flip" onclick="location.hash='#/g/${u.id}/spell'">✍️ 拼写</button><button class="wide gblue" onclick="location.hash='#/g/${u.id}/puzzle'">🧩 拼图</button><button class="wide gcl" onclick="location.hash='#/g/${u.id}/cloze'">📝 填词</button></div></div>`}).join("")}</div>`}
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
async function showGame(uid,mode){const us=await loadUnits();const u=us.find(x=>x.id==uid);if(!u)return showGames();
 const MN={spell:"✍️ 拼写",puzzle:"🧩 拼图",cloze:"📝 填词"};setHeader(MN[mode]+" · "+u.title,true);
 const pool=u.words.map((w,i)=>i).filter(i=>mode!="cloze"||clozeOf(u.words[i]));
 const G={q:shuffle(pool),pos:0,score:0,correct:0,miss:[],round:1,total:pool.length};
 const hdr=()=>`<div class="gs"><span>${G.round>1?"🔁 错题回顾 · ":""}第 ${Math.min(G.pos+1,G.q.length)} / ${G.q.length} 题</span><span>⭐ ${G.score}</span></div><div class="gp"><i style="width:${100*G.pos/G.q.length}%"></i></div>`;
 const after=w=>`<div class="ga"><div class="word">${esc(w.w)}</div><div class="zh">${esc(w.zh||"")}</div>${w.exs&&w.exs[0]?`<div class="row"><div class="tx en"><span class="lab ex">例句</span>${esc(w.exs[0])}</div></div>`:""}${w.src?`<div class="row yrow"><div class="tx en">${ywHTML(w.src)}</div><button class="p sm" id="ysrc">▶</button></div>`:""}<button class="wide flip" id="nx">下一题 ›</button></div>`;
 function next(){G.pos++;if(G.pos<G.q.length)return render();
  if(G.miss.length){const m=[...new Set(G.miss)];G.miss=[];G.q=shuffle(m);G.pos=0;G.round++;return render(true)}
  finish()}
 function finish(){stopAll();const r=saveResult(uid,mode,G.score,G.total,G.correct);
  V.innerHTML=`<div class="card gend"><img src="icons/icon-192.png" alt=""><div class="conf">🌻 🎉 🌻</div><h2>完成啦，Nova！</h2><div class="big2">⭐ ${G.score}</div>
   <div>一次答对 ${G.correct} / ${G.total} 个词${r.best==G.score&&r.plays>1?" · 🏆 新纪录！":""}</div><div class="sb">最高分 ${r.best} · 第 ${r.plays} 次</div>
   <button class="wide flip" id="again">再玩一次</button>${["spell","puzzle","cloze"].filter(m=>m!=mode).map(m=>`<button class="wide gblue" onclick="location.hash='#/g/${uid}/${m}'">换${MN[m]}</button>`).join("")}<button class="wide gray" onclick="location.hash='#/g'">返回单元列表</button></div>`;
  document.getElementById("again").onclick=()=>showGame(uid,mode)}
 function render(roundStart){const w=u.words[G.q[G.pos]];const ans=ansOf(w.w);const first=G.round==1;let tries=0,hints=0,done=false;
  const hintEx=w.ex?w.ex.split(/(?<=[.?!])\s/)[0].replace(new RegExp(ans.split(" ").filter(x=>x.length>2).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")||"$^","gi"),"____"):"";
  const top=`${roundStart?`<div class="gmsg">🔁 再练一下刚才没一次答对的 ${G.q.length} 个词</div>`:""}${hdr()}<div class="card gcard"><button class="big" id="say" aria-label="听发音">▶</button><div class="zh">${esc(w.zh||"")}</div>${hintEx?`<div class="ghint en">${esc(hintEx)}</div>`:""}`;
  const win=pts=>{if(done)return;done=true;if(first&&!tries&&!hints)G.correct++;else if(first)G.miss.push(G.q[G.pos]);G.score+=pts;
   document.getElementById("res").innerHTML=`<div class="gok">✅ ${pts?`+${pts}`:""} 太棒了！</div>`+after(w);bindAfter()};
  const lose=()=>{if(done)return;done=true;if(first)G.miss.push(G.q[G.pos]);document.getElementById("res").innerHTML=`<div class="gno">答案是：</div>`+after(w);bindAfter()};
  const bindAfter=()=>{document.getElementById("nx").onclick=next;const y=document.getElementById("ysrc");if(y)y.onclick=()=>{stopAll();LASTBTN=y;playP(w.src.a,1,w.src.t)};document.getElementById("nx").focus()};
  if(mode=="cloze"){const cz=clozeOf(w);const tgt=cz.t.slice(cz.s,cz.e);
   V.innerHTML=`${roundStart?`<div class="gmsg">🔁 再练一下刚才没一次答对的 ${G.q.length} 个词</div>`:""}${hdr()}<div class="card gcard"><div class="czl"><span class="lab ${cz.label=="原文"?"yw":"ex"}">${cz.label}</span></div>
    <div class="czs en">${esc(cz.t.slice(0,cz.s))}<span class="czb" id="sl"></span>${esc(cz.t.slice(cz.e))}</div>
    <div class="czh" id="hs"></div><i id="czans" hidden>${esc(tgt)}</i><input id="in" class="gin" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="填入空格里的词">
    <div class="gbar"><button class="btn" id="hint">💡 提示1 中文</button><button class="btn" id="skip">跳过</button><button class="btn flipb" id="ok">✓ 确定</button></div><div id="res"></div></div>`;
   const inp=document.getElementById("in"),sl=document.getElementById("sl"),hs=document.getElementById("hs"),hb=document.getElementById("hint");
   const paint=()=>{const v=inp.value.replace(/[’‘]/g,"'");let h="";for(let i=0;i<tgt.length;i++){const c=tgt[i];if(c==" "){h+='<span class="gap"></span>';continue}const t=v[i];
     const cls=!t?"":(t.toLowerCase()==c.toLowerCase()||(c=="-"&&t==" ")?"g":"r");h+=`<span class="lt ${cls}">${t&&t!=" "?esc(t):""}</span>`}sl.innerHTML=h};inp.oninput=paint;paint();
   const HN=["💡 提示2 读音","💡 提示3 词性","💡 再听一次"];
   hb.onclick=()=>{if(done)return;if(hints==0)hs.innerHTML+=`<div>中文：<b>${esc(w.zh||"")}</b></div>`;
    if(hints==1||hints>=3){LASTBTN=hb;playWord(w,1)}if(hints==2)hs.innerHTML+=`<div>词性：<b>${esc(w.pos||"—")}</b>　共 ${tgt.replace(/ /g,"").length} 个字母</div>`;
    if(hints<3)hints++;hb.textContent=HN[Math.min(hints-1,2)];inp.focus()};
   const fullS=()=>`<div class="row yrow"><div class="tx en"><span class="lab ${cz.label=="原文"?"yw":"ex"}">${cz.label}</span>${esc(cz.t.slice(0,cz.s))}<b class="ywb">${esc(tgt)}</b>${esc(cz.t.slice(cz.e))}${cz.src?` <span class="ywsp">— ${cz.src.sp=="Naval"?"Naval":"Chris"}</span>`:""}</div>${cz.src?'<button class="p sm" id="czp">▶</button>':""}</div>`;
   const fin=(ok,pts)=>{if(done)return;done=true;if(ok){if(first&&!tries&&!hints)G.correct++;else if(first)G.miss.push(G.q[G.pos]);G.score+=pts}else if(first)G.miss.push(G.q[G.pos]);
    inp.value=tgt;paint();inp.blur();document.getElementById("res").innerHTML=(ok?`<div class="gok">✅ ${pts?`+${pts}`:""} 太棒了！</div>`:`<div class="gno">答案是：<b>${esc(tgt)}</b></div>`)+fullS()+`<div class="ga"><div class="zh">${esc(w.w)} · ${esc(w.zh||"")}</div><button class="wide flip" id="nx">下一题 ›</button></div>`;
    document.getElementById("nx").onclick=next;const p=document.getElementById("czp");if(p){p.onclick=()=>{stopAll();LASTBTN=p;playP(cz.src.a,1,cz.src.t)};LASTBTN=p;playP(cz.src.a,1,cz.src.t)}else{speak(cz.t,1)}};
   const check=()=>{if(done)return;if(normA(inp.value)==normA(tgt))fin(true,Math.max(10-hints*2-tries*2,2));else{tries++;sl.classList.remove("shake");void sl.offsetWidth;sl.classList.add("shake");if(tries>=3)fin(false)}};
   inp.onkeydown=e=>{if(e.key=="Enter"){e.preventDefault();done?next():check()}};document.getElementById("ok").onclick=check;document.getElementById("skip").onclick=()=>fin(false);
   setTimeout(()=>inp.focus(),300);return}
  if(mode=="spell"){
   V.innerHTML=top+`<div class="slots" id="sl"></div><input id="in" class="gin" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="听一听，拼出来">
    <div class="gbar"><button class="btn" id="hint">💡 提示</button><button class="btn" id="slow">🐢 慢速</button><button class="btn" id="skip">跳过</button><button class="btn flipb" id="ok">✓ 确定</button></div><div id="res"></div></div>`;
   const inp=document.getElementById("in"),sl=document.getElementById("sl");
   const paint=()=>{const v=inp.value.toLowerCase().replace(/[’‘]/g,"'");let h="";let j=0;
    for(let i=0;i<ans.length;i++){const c=ans[i];if(c==" "){h+='<span class="gap"></span>';continue}const t=v[i];
     const cls=t==null||t==""?"":(t.toLowerCase()==c.toLowerCase()||(c=="-"&&t==" ")?"g":"r");h+=`<span class="lt ${cls}">${t&&t!=" "?esc(t):""}</span>`}sl.innerHTML=h};
   inp.oninput=paint;paint();
   const check=()=>{if(done)return;if(normA(inp.value)==normA(ans)){inp.value=ans;paint();inp.blur();win(Math.max(10-hints*3-tries*2,2))}else{tries++;sl.classList.remove("shake");void sl.offsetWidth;sl.classList.add("shake");if(tries>=3)lose()}};
   inp.onkeydown=e=>{if(e.key=="Enter"){e.preventDefault();done?next():check()}};
   document.getElementById("ok").onclick=check;
   document.getElementById("hint").onclick=()=>{if(done)return;const v=inp.value;let k=0;while(k<v.length&&k<ans.length&&v[k].toLowerCase()==ans[k].toLowerCase())k++;
    inp.value=ans.slice(0,k+1);if(ans[k+1]==" ")inp.value+=" ";hints++;paint();inp.focus();if(normA(inp.value)==normA(ans))win(Math.max(10-hints*3,0))};
   document.getElementById("skip").onclick=lose;
   setTimeout(()=>inp.focus(),300)}
  else{const words=ans.split(" ");const tiles=words.map((wd,wi)=>shuffle([...wd].map((ch,ci)=>({ch,wi,id:wi+"_"+ci}))));
   if(tiles.every((t,wi)=>t.map(x=>x.ch).join("")==words[wi])&&ans.replace(/ /g,"").length>1)tiles.forEach(t=>t.reverse());
   const placed=words.map(()=>[]);
   V.innerHTML=top+`<div id="pz"></div><div class="gbar"><button class="btn" id="hint">💡 提示</button><button class="btn" id="slow">🐢 慢速</button><button class="btn" id="undo">⌫ 撤销</button><button class="btn" id="skip">跳过</button></div><div id="res"></div></div>`;
   const pz=document.getElementById("pz");
   const draw=()=>{pz.innerHTML=words.map((wd,wi)=>`<div class="pw"><div class="slots">${[...wd].map((c,ci)=>{const t=placed[wi][ci];return `<span class="lt ${t?(t.ch==c?"g":"r"):""}" data-rm="${wi}">${t?esc(t.ch):""}</span>`}).join("")}</div>
     <div class="tiles2">${tiles[wi].map(t=>`<button class="tile2" data-t="${t.id}" ${placed[wi].includes(t)?"disabled":""}>${esc(t.ch)}</button>`).join("")}</div></div>`).join("");
    pz.querySelectorAll("[data-t]").forEach(b=>b.onclick=()=>{if(done)return;const [wi]=b.dataset.t.split("_").map(Number);const t=tiles[wi].find(x=>x.id==b.dataset.t);if(placed[wi].length<words[wi].length){placed[wi].push(t);draw();test()}});
    pz.querySelectorAll("[data-rm]").forEach(s=>s.onclick=()=>{if(done)return;placed[+s.dataset.rm].pop();draw()})};
   const test=()=>{if(placed.every((p,wi)=>p.length==words[wi].length)){if(placed.every((p,wi)=>p.map(x=>x.ch).join("").toLowerCase()==words[wi].toLowerCase()))win(Math.max(10-hints*3-tries*2,2));
     else{tries++;pz.classList.remove("shake");void pz.offsetWidth;pz.classList.add("shake");if(tries>=3)lose()}}};
   document.getElementById("undo").onclick=()=>{for(let wi=placed.length-1;wi>=0;wi--)if(placed[wi].length){placed[wi].pop();break}draw()};
   document.getElementById("hint").onclick=()=>{if(done)return;hints++;for(let wi=0;wi<words.length;wi++){const p=placed[wi];
     let k=0;while(k<p.length&&p[k].ch.toLowerCase()==words[wi][k].toLowerCase())k++;if(k<words[wi].length){p.length=k;const used=new Set(p);const t=tiles[wi].find(x=>!used.has(x)&&x.ch.toLowerCase()==words[wi][k].toLowerCase());p.push(t);break}}draw();test()};
   document.getElementById("skip").onclick=lose;draw()}
  document.getElementById("say").onclick=()=>{LASTBTN=document.getElementById("say");playWord(w,1)};document.getElementById("slow").onclick=()=>{LASTBTN=document.getElementById("say");playWord(w,.75)};
  setTimeout(()=>{LASTBTN=document.getElementById("say");playWord(w,1)},350)}
 render()}
