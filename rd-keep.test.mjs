// Luca Day 1 reading cards show a keep-list. The shared sents array stays
// in place so 单词卡 si, 句子听写, and ☀ indexes do not move.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const root = new URL(".", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const app = read("app.js");
const day = JSON.parse(read("content/luca_d01.json"));
const day3 = JSON.parse(read("content/luca_d03.json"));
const long = JSON.parse(read("content/luca_d01_long.json"));

const fn = app.slice(app.indexOf("// Reading-card keep list"), app.indexOf("async function playFoldListen"));
const g = {};
runInContext(fn + "\nthis.rdRows=rdRows;", createContext(g));

const rows = g.rdRows(day);
const want = [4, 5, 14, 19, 20, 29, 30, 31];
assert.deepEqual(rows.map(x => x.i + 1), want);
assert.deepEqual(rows.map(x => x.s.t), [
  "Because if they catch even a glimpse of you...",
  "You think they come around to meet new friends, huh?",
  "Just a sweaty land monster with a paddle",
  "She's molting",
  "Oh, it's magnificent",
  "We better beat those Branzinos at the crab show this year",
  "Everyone thinks Bianca Branzino's so great",
  "with her prize-winning crabs and amazing dolphin impression",
]);
assert.deepEqual(rows.map(x => x.s.oa), want.map(n => "audio/luca_d01o/s" + String(n).padStart(2, "0") + ".mp3"));
assert.equal(day.sents.length, 33);
assert.deepEqual(g.rdRows(day3).map(x => x.i), day3.sents.map((_, i) => i));

for (const c of day.flash.cards) {
  assert.equal(Number.isInteger(c.si), true);
  assert.ok(day.sents[c.si] && day.sents[c.si].oa, c.w);
}
assert.equal(day.sents[21].t, "here's a champion show crab if I ever saw one");
assert.equal(day.sents[25].t, "But don't apologize");
assert.equal(day.flash.cards.find(c => c.w === "champion").si, 21);
assert.equal(day.flash.cards.find(c => c.w === "apologize").si, 25);

const rd = app.slice(app.indexOf("function viewReading"), app.indexOf("// 原文 in word cards"));
assert.match(rd, /rdRows\(d\)/);
assert.match(rd, /rows\.forEach\(\(\{s,i\}\)/);
assert.match(rd, /e\.id="s"\+i/);
assert.match(rd, /sunHas\(rid,i\)/);
assert.match(rd, /sunToggle\(rid,i\)/);
assert.equal(rd.includes("hidden"), false);
const listen = app.slice(app.indexOf("async function playFoldListen"), app.indexOf("function listenStart"));
assert.match(listen, /rdRows\(d\)/);
const dt = app.slice(app.indexOf("function viewDictation"), app.indexOf("// ---------- daily"));
assert.equal(dt.includes("rdRows"), false);
assert.match(dt, /\(d\.sents\|\|\[\]\)/);
const link = app.slice(app.indexOf("function fcLinkOrig"), app.indexOf("document.addEventListener(\"click\",e=>{const b=e.target.closest(\".fcorig\")"));
assert.match(link, /S\[c\.si\]/);
assert.equal(long.type, "longaudio");
assert.equal(long.audio, "audio/luca_d01v/long.mp3");
assert.equal(long.items.length, 10);

console.log("rd keep ok");
