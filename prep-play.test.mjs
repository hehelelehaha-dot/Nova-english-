// 介词 → out → 原声例句 uses Luca's 单句循环, 停顿, and follow().
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const root = new URL(".", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const app = read("app.js");
const lines = JSON.parse(read("content/prep_out_lines.json"));

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const loop = app.slice(app.indexOf("// RD_LOOP_START"), app.indexOf("// RD_LOOP_END"));
const play = app.slice(app.indexOf("// PREP_PLAY_START"), app.indexOf("// PREP_PLAY_END"));
const page = app.slice(app.indexOf("const PREP_OUT_SENSE"), app.indexOf("function wirePrepLines"));
const g = {};
runInContext(
  loop + "\n" + play + "\n" + page + "\nthis.api={prepLinesPage,prepClip,prepPlayStep,rdLoopCycle,rdLoopLabel,rdGapCycle,rdGapLabel};",
  createContext(Object.assign(g, {esc, Set}))
);
const api = g.api;

assert.equal(api.prepClip(lines[0]), "audio/prep/out/cars-outta-gas.mp3");
assert.equal(api.prepClip({audio:"content/audio/prep/out/x.mp3"}), "audio/prep/out/x.mp3");
assert.equal(api.prepClip({slug:"later-line"}), "audio/prep/out/later-line.mp3");

const html = api.prepLinesPage(lines);
assert.match(html, /class="prep-play"/);
assert.match(html, /class="bar rdbar"/);
assert.match(html, /id="rnggo"[^>]*>原声连播/);
assert.match(html, /id="loop"[^>]*>单句循环/);
assert.match(html, /id="lgap"[^>]*>停顿 0秒/);
assert.match(html, /id="pCE"[^>]*class="on"[^>]*>中→英/);
assert.match(html, /id="pEC"[^>]*>英→中/);
assert.match(html, /position:sticky;top:56px/);
assert.equal(html.includes("单句循环×5"), false);
const oas = [...html.matchAll(/data-oa="([^"]+)"/g)].map(m => m[1]);
assert.deepEqual(oas, lines.map(r => "audio/prep/out/" + r.slug + ".mp3"));
assert.equal(oas.length, lines.length);
for (const title of ["2. 脱离可用的资源范围","3. 脱离控制范围","4. 脱离隐藏状态","5. 从未知变成已知"]) {
  assert.ok(html.includes(title), title);
}
assert.equal((html.match(/class="card prep-line"/g) || []).length, lines.length);
assert.equal((html.match(/🎬 原声/g) || []).length, lines.length);
assert.equal((html.match(/看答案/g) || []).length, lines.length);

const extra = lines.concat([
  {slug:"sense2-added", sense:2, form:"out of", en:"Added later.", zh:"后加的。", movie:"Later", audio:"content/audio/prep/out/sense2-added.mp3"},
  {slug:"sense9-added", sense:9, form:"out", en:"New sense.", zh:"新义项。", movie:"Later"},
  {en:"No sense yet.", zh:"没标义项。", movie:"Loose"},
]);
const more = api.prepLinesPage(extra);
const moreOa = [...more.matchAll(/data-oa="([^"]*)"/g)].map(m => m[1]);
const s2 = lines.filter(r => r.sense === 2).map(r => "audio/prep/out/" + r.slug + ".mp3");
assert.deepEqual(moreOa.slice(0, s2.length + 1), s2.concat(["audio/prep/out/sense2-added.mp3"]));
assert.ok(moreOa.indexOf("audio/prep/out/sense9-added.mp3") > moreOa.indexOf("audio/prep/out/sense2-added.mp3"));
assert.ok(more.includes(">9</h3>") || more.includes(">9<"));
assert.equal(moreOa[moreOa.length - 1], "");
assert.equal((more.match(/class="card prep-line"/g) || []).length, lines.length + 3);
assert.match(api.prepLinesPage([]), /这一页还没准备好/);
assert.match(api.prepLinesPage([]), /id="rnggo"/);

function walk(mode, total, cap){
  const plays = [];
  let pos = 0, played = 0, n = 0;
  while (pos >= 0 && pos < total && n < cap) {
    played++; n++;
    plays.push(pos);
    const step = api.prepPlayStep(mode, played, pos, total);
    if (step.again) continue;
    if (step.next < 0) break;
    pos = step.next; played = 0;
  }
  return plays;
}
assert.deepEqual(walk(0, 4, 20), [0, 1, 2, 3]);
assert.deepEqual(walk(5, 3, 40), [0,0,0,0,0, 1,1,1,1,1, 2,2,2,2,2]);
assert.equal(walk(10, 2, 40).length, 20);
assert.deepEqual(walk(Infinity, 4, 6), [0,0,0,0,0,0]);
assert.equal(api.rdLoopCycle(0), Infinity);
assert.equal(api.rdLoopLabel(5), "单句循环×5");
assert.equal(api.rdLoopLabel(10), "单句循环×10");
assert.deepEqual([0,3,5,10].map(api.rdGapCycle), [3,5,10,0]);
assert.equal(api.rdGapLabel(0), "停顿 0秒");
assert.equal(api.rdGapLabel(3), "停顿 3秒");

const wire = app.slice(app.indexOf("function wirePrepLines"), app.indexOf("async function showPrepLines"));
assert.match(wire, /querySelectorAll\("\.prep-line"\)/);
assert.match(wire, /dataset\.oa/);
assert.match(wire, /follow\(el\)/);
assert.match(wire, /rdLoopCycle\(rep\)/);
assert.match(wire, /rdLoopLabel\(rep\)/);
assert.match(wire, /rdGapCycle\(gap\)/);
assert.match(wire, /rdGapLabel\(gap\)/);
assert.match(wire, /rdGapWait\(slice/);
assert.match(wire, /prepPlayStep\(rep,played,pos,list\.length\)/);
assert.match(wire, /暂停原声/);
assert.match(wire, /if\(playing&&!paused\)\{paused=true/);
assert.match(wire, /if\(playing&&paused\)\{paused=false/);
assert.match(wire, /closest\("\.fcorig"\)\)return/);
assert.match(wire, /classList\.toggle\("show"\)/);
assert.match(wire, /localStorage\.setItem\("prep_out_gap"/);
assert.equal(wire.includes("cars-outta-gas"), false);
assert.equal(wire.includes("rd_luca_gap"), false);

const essence = app.slice(app.indexOf("function prepPageHTML"), app.indexOf("// 原声例句"));
assert.equal(essence.includes("rnggo"), false);
assert.equal(essence.includes("prep-line"), false);
const rd = app.slice(app.indexOf("function viewReading"), app.indexOf("// 原文 in word cards"));
assert.equal(rd.includes("prepPlayStep"), false);
assert.equal(rd.includes("prep-line"), false);
assert.equal(rd.includes('id="lgap"') && rd.includes("rdLoopCycle(rep)"), true);
assert.match(app, /if\(\/\\.json\$\/i\.test\(it\.data\)\)return showPrepLines\(it\)/);
assert.match(app, /V\.innerHTML=prepPageHTML\(md\)/);

console.log("prep play ok");
