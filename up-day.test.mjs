import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const root = new URL(".", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const up = JSON.parse(read("content/up.json"));
const day = JSON.parse(read("content/up_d01.json"));
const app = read("app.js");
const css = read("style.css");
const meta = JSON.parse(read("meta.json"));
const sw = read("sw.js");

assert.deepEqual(up.days.map(d => d.id), ["up_d01"]);
assert.equal(up.days[0].title, "Day 1");
assert.match(up.days[0].sub, /^01 · 69 词$/);
assert.equal(up.days[0].data, "up_d01.json");
assert.equal(day.id, "up_d01");
assert.equal(day.flash.cards.length, 69);
assert.equal(day.ee.items.length, 69);
assert.equal(day.wf.set.items.length, 69);
assert.equal(day.wf.set.id, "up_d01");
for (const n of ["02","03","04","05","06","07","08"]) assert.equal(JSON.stringify(up).includes("up_d"+n), false);

const words = day.flash.cards.map(c => c.w);
assert.deepEqual(words, day.ee.items.map(e => e.w));
assert.deepEqual(words, day.wf.set.items.map(i => i.f));
const list = "back out,cross,blimp,clubhouse,out of,ripped,swear,cheer up,aboard,goggles,helmet,exclusive,hail,storm,weather,unlimited,visibility,rudder,starboard,hurdle,dirigible,famous,piloting,beast,capture,vow,strip,organization,skeleton,fabricate,accuse,foul,scientist,swell,golly,bee's knees,consider,walker,canine,mechanical,bath,complete with,palace,floating,veritable,comfort,craft,conceive,faithful,apart from,wagon,paddy,prohibition,expedition,complete,spirit,beloved,summit,inhospitable,dare,sport,lurking,majestic,humanity,civilized,footage,witness,spotlight,present".split(",");
assert.deepEqual(words, list);

const src = read("game.js");
const ctx = {};
runInContext(src.slice(src.indexOf("const reEsc"), src.indexOf("function clozeOf"))+"\nthis.formRe=formRe;", createContext(ctx));
for (const c of day.flash.cards) {
  assert.ok(c.zh && c.ipa && c.ex && c.lg && c.lg[1], c.w);
  assert.equal(ctx.formRe(c.w).test(c.exs[0]), true, c.w);
}
for (const it of day.wf.set.items) {
  assert.ok(it.o.includes(it.a));
  assert.equal(it.a, it.f);
  assert.match(it.p, /^(n|v|adj|adv)\./);
  const toks = it.s.split(" ");
  assert.equal(toks.filter(t => t.includes("___")).length, 1);
  for (const g of it.vb) assert.ok(g[0]>=0 && g[0]<toks.length && !toks[g[0]].includes("___"));
  assert.ok(day.wf.fams[it.f]);
}

assert.match(app, /飞屋环游记/);
assert.match(app, /foldHTML\("up","飞屋环游记"/);
assert.match(app, /id:"up_flash"/);
assert.match(app, /id:"up_ee"/);
assert.match(app, /id:"up_wf"/);
assert.match(app, /id:"up_game"/);
assert.equal(app.includes("up_d02"), false);
assert.match(css, /--sf:#3a528c/);
assert.match(css, /data-fold=luca[\s\S]*?#2c4474/);
assert.match(css, /data-fold=up[\s\S]*?#1e325c/);
assert.equal(css.includes("#f4ead5"), false);
assert.equal(css.includes("#efe4cc"), false);
assert.equal(css.includes("#eadec3"), false);
assert.equal(css.includes("data-theme=t1] .fold[data-fold"), false);
assert.match(sw, new RegExp('const V="'+meta.v+'"'));
assert.ok(sw.includes("content/up.json"));
assert.ok(sw.includes("content/up_d01.json"));

console.log("up-day.test.mjs ok");
