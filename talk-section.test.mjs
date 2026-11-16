import assert from "node:assert/strict";
import fs from "node:fs";
const read = f => fs.readFileSync(new URL(f, import.meta.url), "utf8");
const app = read("app.js");
const talk = JSON.parse(read("content/talk.json"));
const ep = JSON.parse(read("content/talk_ep1.json"));
const dict = JSON.parse(read("content/talk_ep1_dict.json"));
assert.ok(app.includes('foldHTML("talk","播客对话"'));
assert.ok(app.indexOf('foldHTML("talk"') > app.indexOf('foldHTML("podcast"'));
assert.match(app, /talkHit\(/);
assert.match(app, /function viewEpisode/);
assert.deepEqual(talk.boards.map(b => b.id), ["talk_ep1", "talk_ep2", "talk_ep1_dict", "talk_ep2_dict", "talk_ep1_oa"]);
const kindOf = id => talk.boards.find(b => b.id === id).kind;
assert.equal(kindOf("talk_ep1"), "episode");
assert.equal(kindOf("talk_ep2"), "episode");
assert.equal(kindOf("talk_ep1_dict"), "dictation");
assert.equal(kindOf("talk_ep2_dict"), "dictation");
assert.equal(kindOf("talk_ep1_oa"), "original");
const oa = JSON.parse(read("content/talk_ep1_oa.json"));
assert.equal(oa.type, "reading");
assert.equal(oa.sents.length, 6);
assert.ok(oa.sents.some(s => s.sp === "Naval (original)"));
assert.ok(oa.sents.every(s => s.oa && s.t && s.zh));
for (const s of oa.sents) {
  assert.ok(fs.existsSync(new URL("content/" + s.oa, import.meta.url)), s.oa);
}
assert.ok(ep.sents.some(s => s.sp === "Naval (original)" && s.segment === "original"));
assert.ok(app.includes('item:"talk_ep1_oa"'));
assert.equal(ep.type, "episode");
assert.ok(ep.audio && ep.dur > 0 && ep.sents.length > 0);
assert.ok(fs.existsSync(new URL("content/" + ep.audio, import.meta.url)), ep.audio);
let lastStart = -1;
for (const s of ep.sents) {
  assert.ok(s.sp && s.t && s.a && s.start != null);
  assert.ok(s.start >= lastStart, "starts should be nondecreasing");
  lastStart = s.start;
  assert.ok(fs.existsSync(new URL("content/" + s.a, import.meta.url)), s.a);
}
const dialogue = ep.sents.filter(s => s.segment === "dialogue");
assert.equal(dialogue.length, 13);
assert.equal(dict.sents.length, 13);
assert.ok(dict.sents.every(s => s.oa && s.t && s.zh && s.sp));
for (const s of dict.sents) {
  assert.ok(fs.existsSync(new URL("content/" + s.oa, import.meta.url)), s.oa);
}

// Board ③ 原声 (talk_ep1_oa): 原声连播 / 原声循环 play only this board's 6 lines, not the Naval topic 连听 playlist.
{
  const at = app.indexOf("{const cards=rows.filter(x=>x.s&&x.s.oa)");
  assert.ok(at > 0, "talk boards get their own 原声连播 branch");
  const end = app.indexOf("\n// 原文 in word cards", at);
  const branch = app.slice(at, app.lastIndexOf("}", end));
  assert.ok(!branch.includes("listenStart") && !branch.includes("playFoldListen"));
  const rows = oa.sents.map((s, i) => ({ s, i, n: i }));
  const run = async loop => {
    const played = [], status = [], btns = {};
    const env = new Function("rid", "rows", "F", "$", "st", "mark", "audioURL", "listenClip", "listenPaint", "stopAll", "setAll", "ss", `
      const oaDur=s=>s&&s.oa&&s.a===s.oa?(+s.d||0):0;
      var RUN=0,TLACTIVE=null,TLMODE=null,LASTBTN=null,window={};
      const S=()=>({RUN,TLMODE,TLACTIVE,window});const bump=()=>{RUN++};
      stopAll=((f)=>()=>{RUN++;TLMODE=null})(stopAll);
      ${branch}
      return {S,bump};`);
    let stopAfter = loop ? 9 : Infinity, n = 0, ctl;
    const listenClip = async (url) => { played.push(url); if (++n >= stopAfter) ctl.bump(); return true; };
    const $ = id => (btns[id] ||= { id });
    ctl = env("talk_ep1_oa", rows, { loop: false }, $, t => status.push(t), () => {}, async u => u, listenClip, () => {}, () => {}, () => {}, {querySelectorAll: () => []});
    await btns[loop ? "rloop" : "rnggo"].onclick();
    await new Promise(r => setTimeout(r, 20));
    return { played, status };
  };
  const once = await run(false);
  assert.deepEqual(once.played, oa.sents.map(s => s.oa), "原声连播 plays exactly this board's 6 lines in order");
  assert.ok(once.status[0].startsWith("原声连播 · 6 句"), once.status[0]);
  assert.ok(once.status.every(t => !/Topic|T1/.test(t)));
  const looped = await run(true);
  assert.deepEqual(looped.played, [...oa.sents, ...oa.sents].map(s => s.oa).slice(0, 9), "原声循环 loops the same 6 lines");
  assert.ok(looped.status[0].startsWith("原声循环 · 6 句"));
}
// ② 句子听写 (viewDictation) has no 原声连播 / topic 连听 hook, so it can't jump to the Naval playlist.
{
  const s = app.indexOf("function viewDictation"), e = app.indexOf("\nfunction ", s + 10);
  const body = app.slice(s, e);
  assert.ok(!/listenStart|playFoldListen|rnggo/.test(body));
}

// ① Open Talk 整集: every line has 中文, shown like the Naval ② reading cards (.fr front, .zhb back with .zhe + .zht, tap → flipCard).
{
  const ep = JSON.parse(fs.readFileSync(new URL("content/talk_ep1.json", import.meta.url), "utf8"));
  assert.ok(ep.sents.length > 100 && ep.sents.every(s => typeof s.zh == "string" && /[\u4e00-\u9fff]/.test(s.zh)), "every 整集 line has 中文");
  for (const o of oa.sents) { const m = ep.sents.find(s => s.t === o.t); assert.ok(m, o.t); assert.equal(m.zh, o.zh, "Naval original lines reuse the 原声 board 中文"); }
  const s0 = app.indexOf("async function viewEpisode"), e0 = app.indexOf("\nasync function showItem", s0), ve = app.slice(s0, e0);
  assert.match(ve, /<div class="fr"><div class="t">/);
  assert.match(ve, /<div class="zhb"><div class="zhe">\$\{esc\(s\.t\)\}<\/div><div class="zht">\$\{esc\(s\.zh\)\}<\/div><\/div>/);
  assert.match(ve, /e\.onclick=\(\)=>flipCard\(e\)/);
}
console.log("talk-section ok");

// ① 整集 (viewEpisode): each transcript line gets a small 从这里开始听 button that plays the full episode from that line to the end.
{
  const s = app.indexOf("async function viewEpisode"), e = app.indexOf("\nasync function showItem", s);
  const body = app.slice(s, e);
  assert.ok(body.includes('class="fhere"') && body.includes("从这里开始听"), "line cards render 从这里开始听");
  assert.ok(body.includes("s.start!=null?"), "only lines with a start time get the button");
  // Single-line ▶ is unchanged.
  assert.ok(body.includes('aria-label="播放这一句">▶</button>'));
  assert.ok(body.includes("playOA(s.a,ss.querySelector('.p[data-i=\"'+i+'\"]'))"));
  // Run playFrom against a fake audio element.
  const src = body.slice(body.indexOf("const playFrom="), body.indexOf('ss.querySelectorAll(".fhere[data-f]")'));
  const calls = [];
  const au = { readyState: 4, currentTime: 0, playbackRate: 1, paused: true,
    seekTo(t) { calls.push(["seek", t]); this.currentTime = t; },
    play() { calls.push(["play"]); this.paused = false; return Promise.resolve(); } };
  const make = new Function("sents", "au", "R", "ri", "stopAll", `let cur=5;${src};return {playFrom, cur:()=>cur};`);
  const k = 7, env = make(ep.sents, au, [1, .85, .75], 1, () => calls.push(["stop"]));
  env.playFrom(k);
  assert.deepEqual(calls, [["stop"], ["seek", ep.sents[k].start], ["play"]], "seeks the full episode to the line start and plays on");
  assert.equal(au.playbackRate, .85, "keeps the chosen speed");
  assert.equal(env.cur(), -1, "resets cur so timeupdate repaints and follows the highlight");
  assert.ok(body.includes('ss.querySelectorAll(".fhere[data-f]").forEach(b=>b.onclick=ev=>{ev.stopPropagation();playFrom(+b.dataset.f)})'));
  // Generic: lives in viewEpisode, used for every type:"episode" item (talk_*).
  assert.ok(app.includes('if(d.type=="episode")return viewEpisode(d,id);'));
}

// Open Talk Ep 2 (The Five Second Rule): ① 整集 and ② 句子听写 list Ep 1 and Ep 2 (2 项); ③ 原声 stays Ep 1 only (Ep 2 has no third-party audio).
{
  assert.ok(app.includes('items:["talk_ep1","talk_ep2"]'));
  assert.ok(app.includes('items:["talk_ep1_dict","talk_ep2_dict"]'));
  assert.match(app, /function talkItemsFor\(s\)/);
  assert.match(app, /function showTalk\(s\)/);
  assert.ok(app.includes("const talk=talkSec(id);if(talk)return showTalk(talk);"));
  assert.ok(app.includes('const talk=TALK_DEF.map(s=>{const xs=talkItemsFor(s),n=xs.length;'), "home tile counts every episode");
  // Run talkItemsFor against talk.json.
  const src = app.slice(app.indexOf("function talkItemsFor"), app.indexOf("\nfunction showTalk"));
  const env = new Function("talkItem", src + ";return talkItemsFor;");
  const items = env(id => talk.boards.find(b => b.id === id) || null);
  const DEF = Function("return " + app.slice(app.indexOf("const TALK_DEF=") + 15, app.indexOf("];", app.indexOf("const TALK_DEF=")) + 1))();
  assert.deepEqual(DEF.map(s => items(s).length), [2, 2, 1]);
  const ep2 = JSON.parse(read("content/talk_ep2.json"));
  const d2 = JSON.parse(read("content/talk_ep2_dict.json"));
  assert.equal(ep2.type, "episode");
  assert.equal(ep2.sents.length, 237);
  assert.ok(Math.abs(ep2.dur - 1238.4) < 1);
  assert.ok(fs.existsSync(new URL("content/" + ep2.audio, import.meta.url)));
  let last = -1;
  for (const s of ep2.sents) {
    assert.ok(s.sp && s.t && s.a && s.oa === s.a && s.d > 0 && s.start != null && s.end > s.start);
    assert.ok(s.start >= last); last = s.start;
    assert.ok(s.end <= ep2.dur + 0.05);
    assert.ok(/[\u4e00-\u9fff]/.test(s.zh), "中文: " + s.t);
    assert.ok(fs.existsSync(new URL("content/" + s.a, import.meta.url)), s.a);
  }
  assert.ok(ep2.sents.every(s => ["Ethan", "Paula", "Lily", "Mark"].includes(s.sp)), "no invented original speakers");
  assert.ok(!ep2.sents.some(s => /\(original\)/.test(s.sp)));
  const dlg = ep2.sents.filter(s => s.segment === "dialogue");
  assert.equal(dlg.length, 17);
  assert.ok(dlg.every(s => s.sp === "Lily" || s.sp === "Mark"));
  assert.equal(ep2.sents.filter(s => s.segment === "dialogue_repeat").length, 17);
  assert.ok(ep2.sents.find(s => s.segment === "original").h.includes("read by Ethan & Paula"));
  assert.deepEqual(d2.sents.map(s => s.t), dlg.map(s => s.t));
  assert.ok(d2.sents.every(s => s.oa && s.t && s.zh && s.sp));
  // Single-word drill lines show their meaning.
  const drill = ep2.sents.find(s => s.t === "Lightning quick.");
  assert.ok(drill.zh.includes("闪电"));
  assert.ok(!talk.boards.some(b => b.id === "talk_ep2_oa"), "no 原声 board for Ep 2");
}
console.log("talk-section ep2 ok");
