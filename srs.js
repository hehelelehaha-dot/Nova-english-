// ---------- 🧠 今日复习: active recall + spaced repetition (SM-2 style with learning steps) ----------
// Storage: FIELDS["s:<deckId>|<word>"] = [[due(ms), ivDays, ease, state, step, reps, lapses, firstDay], ts]   (state 0 new,1 learning,2 review,3 relearning)
//          FIELDS["q:<dayNo>"] = [reviewsThatDay, ts]   FIELDS["o:srsnew"] = [newPerDay, ts]   — all ride the existing sync code (LWW per key)
const SRS={STEPS:[10*60e3,864e5],RELEARN:10*60e3,AGAIN:60e3,EASE0:2.1,EMIN:1.3,MAX:365,MASTER:21,AHEAD:20*60e3};
const dayNo=t=>{const d=new Date(t);return Math.floor((d.getTime()-d.getTimezoneOffset()*6e4)/864e5)};
const endOfDay=t=>{const d=new Date(t);d.setHours(23,59,59,999);return d.getTime()};
function srsNext(s,g,now){ // s=null for new; g 0忘了 1有点难 2记得 3很轻松 -> new state array
 let [due,iv,ef,st,step,reps,lap,fd]=s||[0,0,SRS.EASE0,0,0,0,0,dayNo(now)];reps++;
 const rev=d=>{iv=Math.min(SRS.MAX,Math.max(1,Math.round(d)));st=2;step=0;due=now+iv*864e5};
 if(st==0||st==1){
  if(g==0){st=1;step=0;due=now+SRS.AGAIN}
  else if(g==1){st=1;due=now+(step==0?6*60e3:SRS.STEPS[step]*0.5)}
  else if(g==2){if(st==0){st=1;step=0;due=now+SRS.STEPS[0]}else if(step+1<SRS.STEPS.length){st=1;step++;due=now+SRS.STEPS[step]}else rev(3)}
  else rev(4)}
 else if(st==3){
  if(g==0){due=now+SRS.AGAIN}else if(g==1){due=now+SRS.RELEARN}else rev(g==3?Math.max(2,iv):Math.max(1,iv))}
 else{
  if(g==0){lap++;ef=Math.max(SRS.EMIN,ef-.2);iv=Math.max(1,Math.round(iv*.3));st=3;due=now+SRS.AGAIN}
  else if(g==1){ef=Math.max(SRS.EMIN,ef-.15);rev(Math.max(iv+1,iv*1.2))}
  else if(g==2)rev(Math.max(iv+1,iv*ef));
  else{ef+=.15;rev(Math.max(iv+2,iv*ef*1.3))}}
 return [Math.round(due),iv,Math.round(ef*100)/100,st,step,reps,lap,fd]}
const fmtIv=(s,now)=>{const ms=s[0]-now;if(ms<36e5)return Math.max(1,Math.round(ms/6e4))+" 分钟";if(s[3]==1&&ms<2*864e5)return "1 天";return s[1]+" 天"};
const srsNewCap=()=>{const f=FIELDS["o:srsnew"];return f&&f[0]>0?f[0]:15};
function srsSave(){localStorage.setItem(FK,JSON.stringify(FIELDS))}
let SRSDECKS=null;
async function srsDecks(){if(SRSDECKS)return SRSDECKS;const c=CAT.categories.find(x=>x.id=="flash");
 const its=(c?c.items:[]).filter(it=>!ORG.hidden[it.id]).slice().sort((a,b)=>(topicNo(b)??-1)-(topicNo(a)??-1));
 const out=[];for(const it of its){try{const d=await getJSON(it.data);if(d.type=="flash")out.push({id:it.id,title:ttl(it),cards:d.cards})}catch(e){}}
 return SRSDECKS=out}
const srsKey=(dk,c)=>"s:"+dk+"|"+c.w;
function srsPlan(decks,now,filter){ // -> {due:[...], fresh:[...], newLeft}
 const due=[],fresh=[],today=dayNo(now),eod=endOfDay(now);let newToday=0;
 for(const k in FIELDS)if(k.startsWith("s:")&&FIELDS[k][0]&&FIELDS[k][0][7]==today)newToday++;
 for(const d of decks){if(filter&&filter!=d.id)continue;for(const c of d.cards){const k=srsKey(d.id,c),f=FIELDS[k],s=f&&f[0];
  if(!s)fresh.push({k,c,d});else{const lim=s[3]==2?eod:now+SRS.AHEAD;if(s[0]<=lim)due.push({k,c,d,s})}}}
 due.sort((a,b)=>a.s[0]-b.s[0]);const newLeft=Math.max(0,srsNewCap()-newToday);
 return {due,fresh,newLeft,newToday}}
function srsStats(now){const today=dayNo(now);let mastered=0,seen=0;for(const k in FIELDS)if(k.startsWith("s:")&&FIELDS[k][0]){seen++;if(FIELDS[k][0][1]>=SRS.MASTER&&FIELDS[k][0][3]==2)mastered++}
 const q=d=>(FIELDS["q:"+d]||[0])[0]||0;let st=0,d=q(today)?today:today-1;while(q(d)>0){st++;d--}
 return {done:q(today),streak:st,mastered,seen}}
function srsRate(item,g,now){const f=FIELDS[item.k];const ns=srsNext(f&&f[0],g,now);stamp(item.k,ns);const qk="q:"+dayNo(now);stamp(qk,((FIELDS[qk]||[0])[0]||0)+1);srsSave();return ns}
const SRS_HELP="🧠 这是「主动回忆 + 间隔重复」。先不看答案、自己努力想起意思（主动回忆），这一步“想”的过程本身就在加深记忆；再按你记得的程度，在快要忘记的时候安排下一次复习（间隔重复）——记得越牢，间隔越长（1→3→7→14→30→60 天…）。这样每天只花几分钟，就能把单词留在长期记忆里。";
async function srsEntry(el){const decks=await srsDecks();const now=Date.now(),p=srsPlan(decks,now),s=srsStats(now);const nn=Math.min(p.newLeft,p.fresh.length);
 el.innerHTML=`<button class="srsin" id="srsgo"><span class="ic">🧠</span><span class="sm"><b>今日复习</b><span class="sb">${p.due.length} 张待复习 · ${nn} 个新词</span></span><span class="go">开始 ›</span></button>
 <div class="srsst"><span>今天已复习 <b>${s.done}</b></span><span>连续 <b>${s.streak}</b> 天</span><span>已掌握 <b>${s.mastered}</b></span></div>`;
 document.getElementById("srsgo").onclick=()=>location.hash="#/srs"}
async function showSRS(){setHeader("🧠 今日复习",true);const h=document.getElementById("hdr-r");h.innerHTML=`<button id="srsq" aria-label="说明">❓</button>`;
 document.getElementById("srsq").onclick=()=>sheet(SRS_HELP,[]);
 V.innerHTML=`<div class="done">加载中…</div>`;const decks=await srsDecks();await loadEXP();let filter=localStorage.getItem("nova_srs_f")||"";if(!decks.some(d=>d.id==filter))filter="";
 let Q=[],cur=null,back=false,start=Date.now();
 const build=()=>{const p=srsPlan(decks,Date.now(),filter);Q=p.due.concat(p.fresh.slice(0,p.newLeft).map(x=>({...x,s:null,isNew:1})))};build();
 const $=x=>document.getElementById(x);
 function next(){const now=Date.now();Q.sort((a,b)=>(a.later||0)-(b.later||0));const i=Q.findIndex(x=>!x.later||x.later<=now);cur=i<0?(Q[0]||null):Q.splice(i,1)[0];if(cur&&i<0)Q.shift();back=false;render()}
 function render(){const s=srsStats(Date.now());
  const top=`<div class="srsbar"><select id="sf"><option value="">全部单元</option>${decks.map(d=>`<option value="${d.id}"${d.id==filter?" selected":""}>${esc(d.title)}</option>`).join("")}</select><span class="status">剩 ${Q.length+(cur?1:0)} 张 · 今天已复习 ${s.done} · 连续 ${s.streak} 天 · 已掌握 ${s.mastered}</span></div>`;
  if(!cur){V.innerHTML=top+`<div class="card done">今天的复习完成了 🎉<br>明天再来，记忆会更牢。<button class="wide flip" onclick="location.hash='#/c/flash'">返回单词卡</button></div>`;wire();return}
  const c=cur.c,d=cur.d,e=EXP&&expKey(c.w)?EXP.e[expKey(c.w)]:null;
  const yw=c.src?`<div class="row yrow"><div class="tx en">${ywHTML(c.src,true)}</div><button class="osb" id="ysrc" aria-label="播放原声">🌻</button></div>`:"";
  let h=`<div class="card srsc"><div class="srsdk">${cur.isNew?'<span class="nw">新词</span>':""}${esc(d.title)}</div><div class="word">${esc(c.w)}</div><div class="pos en">${esc(c.pos)}</div><button class="big" id="pw">▶</button>${yw}`;
  if(!back)h+=`<div class="tip" style="text-align:center">先自己想一想：它是什么意思？</div><button class="wide flip" id="show">显示答案</button>`;
  else{const now=Date.now(),pv=[0,1,2,3].map(g=>fmtIv(srsNext(cur.s,g,now),now));
   h+=`<div class="zh">${esc(c.zh)}</div>${lgHTML(c)}<div class="row"><div class="tx en"><span class="lab">解释</span>${esc(String(c.ex).split(/(?<=[.!?])\s/)[0])}</div><button class="p sm" id="pex">▶</button></div>
   ${e&&e.img?`<div class="srsimg">${esc(e.em||"💡")} 底层逻辑：${esc(e.img)}</div>`:""}
   <div class="rate">${["忘了","有点难","记得","很轻松"].map((t,g)=>`<button class="r${g}" data-g="${g}"><b>${t}</b><span>${pv[g]}</span></button>`).join("")}</div>`}
  V.innerHTML=top+h+"</div>";wire()}
 function wire(){$("sf").onchange=e=>{filter=e.target.value;localStorage.setItem("nova_srs_f",filter);build();next()};if(!cur)return;
  $("pw").onclick=()=>{stopAll();playP(cur.c.a[0],1,cur.c.w)};const y=$("ysrc");if(y)y.onclick=()=>{stopAll();playFull(cur.c.src,y,1)};
  if(!back){$("show").onclick=()=>{back=true;render()};return}
  $("pex").onclick=()=>{stopAll();playP(cur.c.a[1],1,cur.c.ex)};
  V.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{stopAll();const now=Date.now(),ns=srsRate(cur,+b.dataset.g,now);
   if(ns[3]!=2&&ns[0]<=now+SRS.AHEAD){Q.push({k:cur.k,c:cur.c,d:cur.d,s:ns,later:ns[0]})}next()})}
 next()}
