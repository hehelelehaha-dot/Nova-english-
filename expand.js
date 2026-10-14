// ---------- 📖 拓展: shared word-expansion panels (英英解释音频 + 词形练习), read aloud with speechSynthesis ----------
let EXP=null;const loadEXP=async()=>EXP||(EXP=await getJSON("expand.json").catch(()=>({e:{},a:{}})));
const expKey=w=>{if(!EXP)return null;const k=String(w).toLowerCase().trim();return EXP.e[k]?k:EXP.a[k]&&EXP.e[EXP.a[k]]?EXP.a[k]:null};
let ENV=null;function pickVoice(){const vs=(window.speechSynthesis&&speechSynthesis.getVoices())||[];const en=vs.filter(v=>/^en[-_]US/i.test(v.lang));
 const pref=["Samantha","Alex","Ava","Allison","Nicky","Aaron","Google US English","Microsoft Aria","Microsoft Jenny","Microsoft Guy"];
 ENV=pref.map(p=>en.find(v=>v.name.includes(p))).find(Boolean)||en.find(v=>v.localService)||en[0]||null}
if(window.speechSynthesis){pickVoice();speechSynthesis.onvoiceschanged=pickVoice}
// must run synchronously inside the tap handler (iOS only allows speech started by a user gesture)
function sayEN(t,btn){if(!window.speechSynthesis)return toast("这台设备不支持朗读");try{stopAll()}catch(e){}speechSynthesis.cancel();if(!ENV)pickVoice();
 const u=new SpeechSynthesisUtterance(t);u.lang="en-US";if(ENV)u.voice=ENV;u.rate=0.95;u.pitch=1;
 if(btn){btn.classList.add("on");u.onend=u.onerror=()=>btn.classList.remove("on")}speechSynthesis.speak(u)}
document.addEventListener("click",e=>{const b=e.target.closest(".spk");if(b){e.preventDefault();e.stopPropagation();sayEN(b.dataset.say,b);return}
 const x=e.target.closest(".exb2");if(x){const p=document.getElementById(x.dataset.p);if(p){const open=p.hidden;p.hidden=!open;x.classList.toggle("open",open);x.textContent=open?"📖 收起拓展":"📖 拓展"}}},true);
const spk=t=>`<button class="spk" data-say="${esc(t)}" aria-label="朗读">🔊</button>`;
let EXN=0;
function expHTML(w){const k=expKey(w);if(!k)return "";const d=EXP.e[k];const id="xp"+(++EXN);
 return `<button class="exb2" data-p="${id}">📖 拓展</button><div class="xpan" id="${id}" hidden>
  <div class="xh"><b class="en">${esc(d.w)}</b>${spk(d.w)} <span class="ipa">${esc(d.ipa)}</span></div>
  <div class="xfam">${d.fam.map(([f,p])=>`<div><span class="en">${esc(f)}</span>${spk(f)} → <i>${esc(p)}</i></div>`).join("")}</div>
  <div class="ximg">它们底层都是同一个画面 ${esc(d.em)}：<br>“${esc(d.img)}”</div>
  ${d.forms.map(([f,p,zp,m,ex,z])=>`<div class="xf"><div class="xt"><b class="en">${esc(f)}</b>${spk(f)} — ${esc(p)}（${esc(zp)}）：${esc(m)}</div><div class="xe en">${esc(ex)}${spk(ex)}</div><div class="xz">${esc(z)}</div></div>`).join("")}</div>`}
