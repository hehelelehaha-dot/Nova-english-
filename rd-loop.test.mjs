// Luca reading-card 单句循环: off → forever → ×5 → ×10 → off.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const fn = app.slice(app.indexOf("// RD_LOOP_START"), app.indexOf("// RD_LOOP_END"));
const g = {};
runInContext(fn + "\nthis.rdLoopCycle=rdLoopCycle;this.rdLoopLabel=rdLoopLabel;this.rdLoopNext=rdLoopNext;this.rdGapCycle=rdGapCycle;this.rdGapLabel=rdGapLabel;this.rdGapWait=rdGapWait;", createContext(Object.assign(g, {setTimeout, clearTimeout, Date, Promise})));

assert.equal(g.rdLoopCycle(0), Infinity);
assert.equal(g.rdLoopCycle(Infinity), 5);
assert.equal(g.rdLoopCycle(5), 10);
assert.equal(g.rdLoopCycle(10), 0);
assert.equal(g.rdLoopLabel(0), "单句循环");
assert.equal(g.rdLoopLabel(Infinity), "单句循环");
assert.equal(g.rdLoopLabel(5), "单句循环×5");
assert.equal(g.rdLoopLabel(10), "单句循环×10");

function walk(mode, start, total, cap){
  const plays = [];
  let pos = start, played = 0, n = 0;
  while (pos >= 0 && pos < total && n < cap) {
    played++; n++;
    plays.push(pos);
    const step = g.rdLoopNext(mode, played, pos, total);
    if (step.again) continue;
    if (step.next < 0) break;
    pos = step.next; played = 0;
  }
  return plays;
}
assert.deepEqual(walk(0, 3, 8, 20), [3]);
assert.equal(walk(Infinity, 2, 8, 4).every(p => p === 2), true);
assert.equal(walk(Infinity, 2, 8, 4).length, 4);
assert.equal(walk(5, 0, 8, 100).length, 40);
assert.deepEqual(walk(5, 6, 8, 100), [6,6,6,6,6, 7,7,7,7,7]);
assert.equal(walk(10, 7, 8, 100).length, 10);
assert.equal(walk(10, 0, 8, 100).length, 80);
assert.deepEqual([...new Set(walk(5, 0, 8, 100))], [0,1,2,3,4,5,6,7]);

const rd = app.slice(app.indexOf("function viewReading"), app.indexOf("// 原文 in word cards"));
assert.match(rd, /lucaRd=\/\^\(luca_\|elio_\|turning_\)\/\.test\(rid\)/);
assert.match(rd, /rdLoopCycle\(rep\)/);
assert.match(rd, /rdLoopLabel\(rep\)/);
assert.match(rd, /rdLoopNext\(rep,played,pos,rows\.length\)/);
assert.match(rd, /playP\(useO\?S_\.oa:S_\.a,SP\[si\],S_\.t\)/);
assert.match(rd, /else \$\("loop"\)\.onclick=\(\)=>\{F\.loop=!F\.loop/);
assert.equal(rd.includes("单句循环×5"), false);
assert.equal(g.rdGapCycle(0), 3);
assert.equal(g.rdGapCycle(3), 5);
assert.equal(g.rdGapCycle(5), 10);
assert.equal(g.rdGapCycle(10), 0);
assert.equal(g.rdGapLabel(0), "停顿 0秒");
assert.equal(g.rdGapLabel(3), "停顿 3秒");
assert.equal(g.rdGapLabel(5), "停顿 5秒");
assert.equal(g.rdGapLabel(10), "停顿 10秒");
assert.match(rd, /id="lgap"/);
assert.match(rd, /localStorage\.setItem\("rd_luca_gap"/);
assert.match(rd, /rdGapWait\(gap\*1000/);
assert.match(rd, /lucaRd&&looping&&gap>0/);
{
  let live = true;
  const t0 = Date.now();
  const pending = g.rdGapWait(8000, () => live);
  setTimeout(() => { live = false; }, 30);
  assert.equal(await pending, false);
  assert.ok(Date.now() - t0 < 1000);
  assert.equal(await g.rdGapWait(0, () => true), true);
  assert.equal(await g.rdGapWait(80, () => true), true);
}

console.log("rd loop ok");
