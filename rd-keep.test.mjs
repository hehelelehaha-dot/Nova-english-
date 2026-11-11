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
runInContext(fn + "\nthis.rdRows=rdRows;this.dtRows=dtRows;this.dtSavedPos=dtSavedPos;", createContext(g));

const rows = g.rdRows(day);
const want = [4, 5, 14, 19, 20, 29, 30, 31];
assert.deepEqual(rows.map(x => x.i + 1), want);
assert.deepEqual(rows.map(x => x.n + 1), [1, 2, 3, 4, 5, 6, 7, 8]);
assert.deepEqual(rows.map(x => x.i), [3, 4, 13, 18, 19, 28, 29, 30]);
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
assert.ok(g.rdRows(day3).every(x => x.n === x.i));

for (const c of day.flash.cards) {
  assert.equal(Number.isInteger(c.si), true);
  assert.ok(day.sents[c.si] && day.sents[c.si].oa, c.w);
}
assert.equal(day.sents[21].t, "here's a champion show crab if I ever saw one");
assert.equal(day.sents[25].t, "But don't apologize");
assert.equal(day.flash.cards.find(c => c.w === "champion").si, 21);
assert.equal(day.flash.cards.find(c => c.w === "apologize").si, 25);

const audible = g.dtRows(day);
assert.deepEqual(audible.map(x => x.i), [3, 4, 13, 18, 19, 28, 29, 30]);
assert.deepEqual(audible.map(x => x.n + 1), [1, 2, 3, 4, 5, 6, 7, 8]);
const shown = audible.map(x => ({s: x.s, i: x.i}));
assert.equal(g.dtSavedPos(shown, "13", true), 2);
assert.equal(g.dtSavedPos(shown, "3", true), 0);
assert.equal(g.dtSavedPos(shown, "7", true), 0);
assert.equal(g.dtSavedPos(shown, "nope", true), 0);
assert.equal(g.dtSavedPos(shown, "4", false), 4);
assert.equal(g.dtSavedPos(shown, "40", false), 0);
assert.deepEqual(g.dtRows(day3).map(x => x.i), day3.sents.map((s, i) => s && s.oa ? i : -1).filter(i => i >= 0));

const rd = app.slice(app.indexOf("function viewReading"), app.indexOf("// 原文 in word cards"));
assert.match(rd, /rdRows\(d\)/);
assert.match(rd, /rows\.forEach\(\(\{s,i,n\}\)/);
assert.match(rd, /aria-label="第\$\{n\+1\}句">\$\{n\+1\}/);
assert.match(rd, /第 \$\{showN\(i\)\} \/ \$\{rows\.length\} 句/);
assert.match(rd, /第 \$\{showN\(i\)\} 句 · 请跟读/);
assert.match(rd, /点读 · 第 \$\{showN\(i\)\} 句/);
assert.match(rd, /e\.id="s"\+i/);
assert.match(rd, /sunHas\(rid,i\)/);
assert.match(rd, /sunToggle\(rid,i\)/);
assert.equal(rd.includes("hidden"), false);
const listen = app.slice(app.indexOf("async function playFoldListen"), app.indexOf("function listenStart"));
assert.match(listen, /rdRows\(d\)/);
assert.match(listen, /window\._tlCard=c\.i/);
assert.match(listen, /第 \$\{c\.n\+1\} 张/);
assert.match(listen, /window\._rdRid==id/);
assert.match(listen, /follow\(el\)/);
assert.match(rd, /window\._rdRid=rid/);
const fol = app.slice(app.indexOf("function follow("), app.indexOf("const endS"));
assert.equal(fol.includes("LASTUSER"), false);
assert.equal(fol.includes("scrollIntoView"), false);
assert.match(fol, /el===FOLLOW_EL/);
assert.match(fol, /stickBottom\(\)\+8/);
assert.match(fol, /pageTo\(/);
assert.match(app, /entChanged&&!au\.paused&&k>=0/);
assert.match(app, /follow\(sn\);followed=true/);
const dt = app.slice(app.indexOf("function viewDictation"), app.indexOf("// ---------- daily"));
assert.match(dt, /dtRows\(d\)/);
assert.match(dt, /dtSavedPos\(sents,localStorage\.getItem\(key\),keep\)/);
assert.match(dt, /keep&&sents\[pos\]\?sents\[pos\]\.i:pos/);
assert.match(dt, /\$\{pos\+1\} \/ \$\{sents\.length\}/);
assert.match(dt, /sunHas\(rid,si\)/);
assert.match(dt, /sunToggle\(rid,si\)/);
assert.match(dt, /\(it&&it\.id\|\|"x"\)\+":"\+si/);
assert.match(dt, /sents\.map\(\(x,i\)=>/);
const dq = app.slice(app.indexOf("function dqTopics"), app.indexOf("function dqFind"));
assert.match(dq, /dtRows\(d\)/);
assert.match(dq, /sent\.push\(i\)/);
const cell = app.slice(app.indexOf("function dqCellHTML"), app.indexOf("function dqPageShell"));
assert.match(cell, /\$\{n\+1\}/);
assert.match(cell, /t\.id\+":"\+i/);
const luca = JSON.parse(read("content/luca.json"));
assert.equal(luca.reading.find(x => x.id === "luca_d01").sub, "8 句");
const link = app.slice(app.indexOf("function fcLinkOrig"), app.indexOf("document.addEventListener(\"click\",e=>{const b=e.target.closest(\".fcorig\")"));
assert.match(link, /S\[c\.si\]/);
assert.equal(long.type, "longaudio");
assert.equal(long.audio, "audio/luca_d01v/long.mp3");
assert.equal(long.items.length, 10);

console.log("rd keep ok");
