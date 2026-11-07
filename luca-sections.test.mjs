// Luca ⑥ 词形练习 and ⑦ 小游戏 use the Day 1 words. Reading cards, dictation,
// word cards, and 英英 stay on the same data.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const root = new URL(".", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const app = read("app.js");
const game = read("game.js");
const wf = read("wf.js");
const luca = JSON.parse(read("content/luca.json"));
const day = JSON.parse(read("content/luca_d01.json"));
const words = ["glimpse", "come around", "sweaty", "molting", "magnificent", "ever", "champion", "apologize", "beat", "impression"];

const def = app.slice(app.indexOf("const LUCA_DEF=["), app.indexOf("let FOLDN"));
for (const id of ["luca_phrases", "luca_reading", "luca_flash", "luca_longaudio", "luca_dictation", "luca_wf", "luca_game"]) {
  assert.ok(def.includes(id), id);
}
assert.ok(def.indexOf("luca_wf") > def.indexOf("luca_dictation"));
assert.ok(def.indexOf("luca_game") > def.indexOf("luca_wf"));
assert.match(app, /s\.like=="wf"\)return showWFs\("luca"\)/);
assert.match(app, /s\.like=="game"\)return showGames\("luca"\)/);
assert.match(app, /h\[2\]==="luca"&&!h\[3\]\?showGames\("luca"\)/);
assert.match(app, /startsWith\("luca_"\)\?"luca_wf"/);
assert.match(app, /startsWith\("luca_"\)\?"luca_game"/);

assert.deepEqual(day.flash.cards.map(c => c.w), words);
assert.equal(day.sents.length, 33);
assert.equal(day.ee.items.length, 10);
assert.equal(day.flash.cards.length, 10);
const set = day.wf.set;
assert.equal(set.id, "luca_d01");
assert.deepEqual(set.items.map(it => it.a), words);
assert.deepEqual(set.items.map(it => it.f), words);
for (const it of set.items) {
  assert.equal(it.l, "原文");
  assert.ok(it.o.includes(it.a), it.a);
  assert.equal(it.ft.slice(it.fhl[0], it.fhl[1]), it.a);
  assert.equal(it.oas.length, 1);
  assert.ok(it.oas[0].startsWith("audio/luca_d01o/s"));
  assert.equal(readFileSync(new URL("./content/" + it.oas[0], root)).length > 100, true, it.oas[0]);
  const toks = it.s.split(/\s+/);
  const blank = toks.findIndex(t => t.includes("___"));
  assert.ok(blank >= 0, it.a);
  for (const g of it.vb) for (const i of g) assert.ok(i !== blank && i >= 0 && i < toks.length, it.a);
  assert.ok(day.wf.fams[it.f], it.f);
  assert.ok(day.wf.fams[it.f].some(row => row[0].toLowerCase() === it.a.toLowerCase()));
}
assert.equal(luca.wfMap.length, 4);
assert.match(wf, /lucaWFList/);
assert.match(wf, /lucaWFPack/);
assert.match(game, /lucaGameSrc/);
assert.match(game, /unitFold\(u\.id\)===fold/);

const src = game.slice(game.indexOf("const reEsc"), game.indexOf("function clozeOf")) + "\nthis.formRe=formRe;this.lucaGameSrc=lucaGameSrc;";
const g = {ansOf: w => String(w).replace(/\([^)]*\)/g, " ").replace(/…|\.\.\./g, " ").split("/")[0].replace(/\s+/g, " ").trim()};
runInContext(src, createContext(g));
for (const c of day.flash.cards) {
  const s = day.sents[c.si];
  const srcObj = g.lucaGameSrc(s, c.w);
  assert.ok(srcObj, c.w);
  assert.equal(srcObj.t.slice(srcObj.hl[0], srcObj.hl[1]).toLowerCase().includes(c.w.split(" ")[0].toLowerCase()), true, c.w);
  assert.equal(srcObj.oas[0], s.oa);
  assert.equal(srcObj.sp, "Luca");
}

console.log("luca sections ok");
