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
assert.equal(luca.wfMap.length, 6);
assert.ok(luca.wfMap.some(row => row[1].startsWith("phr.")));
assert.ok(luca.wfMap.some(row => row[1].startsWith("prep.")));
const d2 = JSON.parse(read("content/luca_d02.json"));
const d2long = JSON.parse(read("content/luca_d02_long.json"));
assert.deepEqual(luca.reading.map(x => x.id), ["luca_d01","luca_d02","luca_d03","luca_d04","luca_d05"]);
assert.equal(luca.reading[1].vocab, 7);
assert.equal(luca.reading[1].long, "luca_d02_long.json");
assert.equal(luca.reading[1].sub, "8 句");
assert.equal(d2.sents.length, 8);
assert.equal(d2.flash.cards.length, 7);
assert.deepEqual(d2.flash.cards.map(c => c.si), [0,1,2,3,4,5,6]);
assert.equal(d2.ee.items.length, 7);
assert.deepEqual(d2.wf.set.items.map(it => it.p), ["adv.","n.","phr.","prep.","n.","n.","adj."]);
assert.equal(d2long.items.length, 7);
assert.equal(d2long.audio, "audio/luca_d02v/long.mp3");
for (const s of d2.sents) assert.ok(readFileSync(new URL("./content/"+s.oa, root)).length > 100, s.oa);
assert.ok(readFileSync(new URL("./content/"+d2long.audio, root)).length > 1000);
const wfFns = wf.slice(wf.indexOf("function posBase"), wf.indexOf("const WFSEC"));
const wg = {};
runInContext(wfFns + "\nthis.posBase=posBase;this.wfPosList=wfPosList;", createContext(wg));
assert.equal(wg.posBase("n.（复数）"), "n.");
assert.equal(wg.posBase("v.（-ing）"), "v.");
assert.equal(JSON.stringify(wg.wfPosList("adv.")), JSON.stringify(["n.","v.","adj.","adv."]));
assert.equal(JSON.stringify(wg.wfPosList("phr.")), JSON.stringify(["n.","v.","adj.","adv.","phr.","prep."]));
assert.equal(JSON.stringify(wg.wfPosList("prep.")), JSON.stringify(["n.","v.","adj.","adv.","phr.","prep."]));
assert.match(wf, /wfPosList\(it\.p\)/);
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
for (const c of d2.flash.cards) {
  const s = d2.sents[c.si];
  const srcObj = g.lucaGameSrc(s, c.w);
  assert.ok(srcObj, c.w);
  const hit = srcObj.t.slice(srcObj.hl[0], srcObj.hl[1]);
  assert.equal(hit.toLowerCase(), c.w.toLowerCase(), c.w + " -> " + hit);
  assert.equal(srcObj.oas[0], s.oa);
}

const d4 = JSON.parse(read("content/luca_d04.json"));
const words4 = ["phantom","used to","basically","invented","stack","pile","fins","otherwise","belly","catch","fall"];
assert.equal(luca.reading.find(x => x.id === "luca_d04").vocab, 11);
assert.equal(luca.reading.find(x => x.id === "luca_d04").long, "luca_d04_long.json");
assert.equal(d4.sents.length, 36);
assert.equal(d4.sents[2].t, "Yeah, that's called phantom tail");
assert.equal(d4.sents[34].t, "And then you just catch yourself before you fall");
assert.deepEqual(d4.flash.cards.map(c => c.w), words4);
assert.deepEqual(d4.ee.items.map(e => e.w), words4);
assert.deepEqual(d4.wf.set.items.map(it => it.f), ["phantom","used to","basically","invented","stack","pile","fins","Otherwise","belly","catch","fall"]);
assert.equal(d4.wf.set.items.find(it => it.f === "used to").p, "phr.");
for (const it of d4.wf.set.items) {
  assert.equal(it.ft.slice(it.fhl[0], it.fhl[1]), it.a);
  assert.ok(it.o.includes(it.a));
  assert.ok(wg.wfPosList(it.p).includes(wg.posBase(it.p)), it.p);
}
for (const c of d4.flash.cards) {
  const s = d4.sents[c.si];
  const srcObj = g.lucaGameSrc(s, c.w);
  assert.ok(srcObj, c.w);
  assert.equal(srcObj.t.slice(srcObj.hl[0], srcObj.hl[1]).toLowerCase(), c.w.toLowerCase(), c.w);
  assert.equal(srcObj.oas[0], s.oa);
}

const d5 = JSON.parse(read("content/luca_d05.json"));
const words5 = ["dangerous","gravity","definitely","collecting","unfortunately"];
assert.equal(luca.reading.find(x => x.id === "luca_d05").vocab, 5);
assert.equal(luca.reading.find(x => x.id === "luca_d05").long, "luca_d05_long.json");
assert.equal(d5.sents.length, 11);
assert.equal(d5.sents[2].t, "Isn't it dangerous?");
assert.deepEqual(d5.flash.cards.map(c => c.w), words5);
assert.deepEqual(d5.ee.items.map(e => e.w), words5);
assert.deepEqual(d5.flash.cards.map(c => c.si), [2,4,5,7,9]);
for (const it of d5.wf.set.items) {
  assert.equal(it.ft.slice(it.fhl[0], it.fhl[1]), it.a);
  assert.ok(it.o.includes(it.a));
  assert.ok(wg.wfPosList(it.p).includes(wg.posBase(it.p)), it.p);
}
for (const c of d5.flash.cards) {
  const s = d5.sents[c.si];
  const srcObj = g.lucaGameSrc(s, c.w);
  assert.ok(srcObj, c.w);
  assert.equal(srcObj.t.slice(srcObj.hl[0], srcObj.hl[1]).toLowerCase(), c.w.toLowerCase(), c.w);
  assert.equal(srcObj.oas[0], s.oa);
}

console.log("luca sections ok");
