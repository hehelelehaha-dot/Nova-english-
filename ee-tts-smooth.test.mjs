// 英英解释 (TTS boards, e.g. 飞屋 Day 1) 全部连播 / 从这里听: the engine is fed one line ahead (never the whole day at once),
// every line is spoken exactly once and in order, empty lines are left out, a silent stall restarts the current line,
// and stopAll (■ 停止) stops the chain.
import assert from "node:assert/strict";
import fs from "node:fs";
import {createContext, runInContext} from "node:vm";

const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const src = app.slice(app.indexOf("let eeRate=1;"), app.indexOf("function viewEE(d,id)"));
const up = JSON.parse(fs.readFileSync(new URL("content/up_d01.json", import.meta.url), "utf8"));

function env({dropEndAt = -1} = {}) {
  const spoken = [], log = [];
  let maxQ = 0;
  const S = {q: [], speaking: false, paused: false, get pending() { return this.q.length > 1 || (!this.speaking && this.q.length > 0); },
    speak(u) { this.q.push(u); maxQ = Math.max(maxQ, this.q.length); if (this.q.length === 1) this.run(); },
    run() { const u = this.q[0]; if (!u) { this.speaking = false; return; } this.speaking = true;
      setTimeout(() => { if (this.q[0] !== u) return; spoken.push(u.text); u.onstart && u.onstart();
        setTimeout(() => { if (this.q[0] !== u) return; this.q.shift();
          if (spoken.length - 1 === dropEndAt) { this.speaking = false; this.q = []; return; } // WebKit goes silent, no onend
          u.onend && u.onend(); this.run(); }, 2); }, 1); },
    cancel() { const q = this.q; this.q = []; this.speaking = false; q.forEach(u => u.onend && u.onend()); }};
  const cur = new Set();
  const el = id => ({id, classList: {add: () => cur.add(id), remove: () => cur.delete(id), contains: () => false}});
  const g = {window: {}, speechSynthesis: S, SpeechSynthesisUtterance: function (t) { this.text = t; },
    document: {getElementById: id => id === "all" ? null : el(id), querySelectorAll: () => [...cur].map(el)},
    RUN: 0, LASTBTN: null, ENV: null, toast() {}, follow: e => log.push(e.id), pickVoice() {},
    setTimeout, setInterval, clearInterval, console};
  g.window = g;
  runInContext("var RUN=0;function stopAll(){RUN++;speechSynthesis.cancel()}\n" + src + "\nthis.eeParts=eeParts;this.eeSpeak=eeSpeak;this.stopAll=stopAll;", createContext(g));
  return {g, S, spoken, log, get maxQ() { return maxQ; }};
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const items = up.ee.items;
const listOf = from => { const l = []; for (let k = from; k < items.length; k++) l.push(...envParts(k)); return l; };
let envParts;
const until = async (f, ms = 15000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) return false; await wait(5); } return true; };

{ // whole day, in order, exactly once, never more than 2 queued
  const e = env(); envParts = k => e.g.eeParts(items[k], k);
  const list = listOf(0), want = list.filter(p => String(p.t).trim()).map(p => p.t);
  assert.ok(list.length > 300 && want.length <= list.length);
  const btn = {id: "all", textContent: "■ 停止", classList: {s: new Set(["on", "playing"]), add(c) { this.s.add(c); }, remove(c) { this.s.delete(c); }, contains(c) { return this.s.has(c); }}};
  e.g.eeSpeak(list, btn);
  assert.ok(e.S.q.length <= 2, "only the current + next line are queued at the start");
  assert.ok(await until(() => !e.g.window._ee), "連播 finishes");
  assert.deepEqual(e.spoken, want, "every line once, in order, no empty lines");
  assert.ok(e.maxQ <= 2, "engine never holds more than 2 lines (was the whole day) " + e.maxQ);
  assert.ok(!btn.classList.contains("on") && btn.textContent === "▶ 全部连播", "button resets at the end");
  assert.equal(new Set(e.log).size, items.length, "highlight follows every entry");
}
{ // 从这里听 from entry 60 starts there
  const e = env(); envParts = k => e.g.eeParts(items[k], k);
  e.g.eeSpeak(listOf(60), null);
  assert.ok(await until(() => !e.g.window._ee));
  assert.equal(e.spoken[0], items[60].w);
}
{ // WebKit drops onend once: watchdog restarts the line that did not finish, nothing skipped, nothing doubled after it
  const e = env({dropEndAt: 5}); envParts = k => e.g.eeParts(items[k], k);
  const want = listOf(0).slice(0, 30).filter(p => String(p.t).trim()).map(p => p.t);
  e.g.eeSpeak(listOf(0).slice(0, 30), null);
  assert.ok(await until(() => !e.g.window._ee));
  assert.deepEqual(e.spoken.slice(0, 6), want.slice(0, 6));
  assert.deepEqual(e.spoken.slice(6), want.slice(5), "the stalled line is spoken again, then the rest in order");
}
{ // ■ 停止 (stopAll) ends the chain
  const e = env(); envParts = k => e.g.eeParts(items[k], k);
  e.g.eeSpeak(listOf(0), null);
  await until(() => e.spoken.length >= 4);
  e.g.stopAll();
  const n = e.spoken.length; await wait(800);
  assert.ok(e.spoken.length <= n, "nothing more is spoken after 停止");
  assert.equal(e.g.window._ee, null);
}
console.log("ee-tts-smooth ok");
