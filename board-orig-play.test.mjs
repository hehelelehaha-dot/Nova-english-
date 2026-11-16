// Every reading board: 原声连播 / 原声循环 / 从这里开始听 play this board's own lines (original audio, in order),
// never the section 连听 range (Topic 1 · T1–T18). One case per board type.
import assert from "node:assert/strict";
import fs from "node:fs";
import {createContext, runInContext} from "node:vm";

const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const J = f => JSON.parse(fs.readFileSync(new URL("content/" + f, import.meta.url), "utf8"));
const rd = app.slice(app.indexOf("function viewReading"), app.indexOf("// 原文 in word cards"));
assert.ok(!/listenStart|playFoldListen|const fold=/.test(rd), "reading boards never use the section 连听 playlist");
const bs = rd.indexOf("{const cards=rows.filter(x=>x.s&&x.s.oa)");
assert.ok(bs > 0);
const block = rd.slice(bs, rd.lastIndexOf("}"));
assert.ok(!/talk_/.test(block.slice(0, 80)), "no talk_-only guard");
assert.match(rd, /class="fhere" type="button" data-f="\$\{i\}"/, "从这里开始听 button on each line with 原声");
assert.match(rd, /\$\{s\.oa\?`<button class="fhere"/, "only lines with 原声 get 从这里开始听");

// rdRows (RD_KEEP) is the same row builder viewReading uses.
const keepSrc = app.slice(app.indexOf("const RD_KEEP="), app.indexOf("function dtRows"));
const odSrc = app.slice(app.indexOf("function oaDur"), app.indexOf("function listenClip"));
const g = {}; runInContext(keepSrc + odSrc + "\nthis.rdRows=rdRows;this.oaDur=oaDur;", createContext(g));

async function board(rid, d, {btn = "rnggo", from = null, stopAfter = Infinity} = {}) {
  const rows = g.rdRows(d), played = [], durs = [], status = [], btns = {}, fh = [];
  const ss = {querySelectorAll: () => fh};
  rows.forEach(r => { if (r.s.oa) fh.push({dataset: {f: String(r.i)}}); });
  let ctl, n = 0;
  const env = new Function("rid", "rows", "F", "$", "st", "mark", "audioURL", "listenClip", "listenPaint", "stopAll", "setAll", "ss", "oaDur", `
    var RUN=0,TLACTIVE=null,TLMODE=null,LASTBTN=null,window={};
    stopAll=((f)=>()=>{RUN++})(stopAll);
    ${block}
    return {bump:()=>{RUN++}};`);
  const listenClip = async (url, me, dur) => { played.push(url); durs.push(dur); if (++n >= stopAfter) ctl.bump(); return true; };
  ctl = env(rid, rows, {loop: false}, id => (btns[id] ||= {id}), t => status.push(t), () => {}, async u => u, listenClip, () => {}, () => {}, () => {}, ss, g.oaDur);
  const ev = {stopPropagation() {}, preventDefault() {}};
  if (from != null) await fh.find(b => b.dataset.f == String(from)).onclick(ev); else await btns[btn].onclick();
  await new Promise(r => setTimeout(r, 20));
  return {played, durs, status, rows};
}

const naval = {id: "naval_t03", sents: [
  {sp: "Chris", t: "So what is the path?", oa: "audio/t03/s01.mp3", d: 2},
  {sp: "Naval", t: "Freedom comes first.", oa: "audio/t03/s02.mp3", d: 2},
  {sp: "Naval", t: "No clip on this line.", a: "audio/t03/tts03.mp3"},
  {sp: "Naval", t: "Then wealth.", oa: "audio/t03/s04.mp3", d: 2}]};
const cases = [
  ["naval_t03", naval, "Naval topic"],
  ["luca_d01", J("luca_d01.json"), "Luca day (keep list)"],
  ["luca_d05", J("luca_d05.json"), "Luca day"],
  ["elio_monologue", J("elio_monologue.json"), "Elio"],
  ["podcast_gg", J("podcast_gg.json"), "播客"],
  ["talk_ep1_oa", J("talk_ep1_oa.json"), "播客对话 原声"]];
for (const [rid, d, name] of cases) {
  const want = g.rdRows(d).filter(x => x.s.oa).map(x => x.s.oa);
  assert.ok(want.length > 0, name);
  const once = await board(rid, d);
  assert.deepEqual(once.played, want, name + ": 原声连播 plays this board's lines in order");
  assert.ok(once.status[0].startsWith("原声连播 · " + want.length + " 句"), name + " " + once.status[0]);
  assert.ok(once.status.every(t => !/Topic|T1–|D1–/.test(t)), name);
  assert.ok(once.status.at(-1).startsWith("连播完毕"), name);
  const loop = await board(rid, d, {btn: "rloop", stopAfter: want.length + 2});
  assert.deepEqual(loop.played, [...want, ...want].slice(0, want.length + 2), name + ": 原声循环 loops this board");
  assert.ok(loop.status[0].startsWith("原声循环 · " + want.length + " 句"), name);
  const cards = g.rdRows(d).filter(x => x.s.oa), k = Math.min(1, cards.length - 1);
  const fr = await board(rid, d, {from: cards[k].i});
  assert.deepEqual(fr.played, want.slice(k), name + ": 从这里开始听 plays from that line to the end");
}
// Lines without 原声 are skipped; a board with none says so.
assert.deepEqual((await board("naval_t03", naval)).played, ["audio/t03/s01.mp3", "audio/t03/s02.mp3", "audio/t03/s04.mp3"]);
const none = await board("naval_t09", {id: "naval_t09", sents: [{t: "x", a: "y"}]});
assert.deepEqual(none.played, []); assert.equal(none.status.at(-1), "这一段没有原声");

// 原声 clip length: Naval s.d is the AI read-aloud length, never a cap on Naval's original clip (Topic 1 #1 lost
// "Is success worth it then?"). Boards whose s.a is the 原声 clip keep s.d.
const nv = {id: "naval_t01", sents: [{t: "Happiness is being satisfied with what you have. Success comes from dissatisfaction. Is success worth it then?", a: "audio/t01/s01.mp3", d: 6.22, oa: "audio/t01o/s01.mp3", oe: 7.9}]};
assert.deepEqual((await board("naval_t01", nv)).durs, [0], "Naval original clip plays to its end");
const lu = J("luca_d05.json"), lw = g.rdRows(lu).filter(x => x.s.oa).map(x => +x.s.d || 0);
assert.deepEqual((await board("luca_d05", lu)).durs, lw, "Luca clip length unchanged");
for (const [, d, name] of cases) for (const x of g.rdRows(d)) if (x.s.oa && x.s.a && x.s.a !== x.s.oa) assert.equal(g.oaDur(x.s), 0, name);
const fl = app.slice(app.indexOf("async function playFoldListen"), app.indexOf("async function playFoldListen") + 3000);
assert.match(fl, /listenClip\(url,me,oaDur\(c\.s\)\)/, "section 连听 uses the same clip length rule");
assert.ok(!/listenClip\([^)]*s\.d/.test(app), "no caller caps 原声 with s.d");

// Section 连听 page keeps its own range playlist.
const wt = app.slice(app.indexOf("function wireTopicListen"), app.indexOf("function catItemRow"));
assert.match(wt, /\$\("rnggo"\)\.onclick=\(\)=>listenStart\(fold,false\)/);
// No other board view wires 原声连播 to the section playlist.
for (const fn of ["function viewDictation", "function viewFlash", "function viewEE", "async function viewLong", "async function viewEpisode"]) {
  const s = app.indexOf(fn), e = app.indexOf("\nfunction ", s + 10);
  assert.ok(s >= 0, fn); assert.ok(!/listenStart|playFoldListen/.test(app.slice(s, e)), fn);
}
console.log("board-orig-play ok");
