import assert from "node:assert/strict";
import fs from "node:fs";
const read = f => fs.readFileSync(new URL(f, import.meta.url), "utf8");
const app = read("app.js");
const html = read("index.html");
const css = read("style.css");
const luca = JSON.parse(read("content/luca.json"));
const podcast = JSON.parse(read("content/podcast.json"));
const talk = JSON.parse(read("content/talk.json"));
const turning = JSON.parse(read("content/turning.json"));
const scary = JSON.parse(read("content/scary.json"));

assert.match(html, /id="watch-src"[^>]*target="_blank"[^>]*rel="noopener"/);
assert.match(html, /▶ 观看原视频/);
assert.match(css, /#watch-src/);
assert.match(app, /function setWatchSrc\(/);
assert.match(app, /function watchUrlFor\(/);
assert.match(app, /function setHeader\(t,back,watch\)/);
assert.ok(app.includes('setHeader(secT(s.id,s.name),true,watchUrlFor(s.id))'), "Luca section list gets a watch link");
assert.ok(app.includes('setHeader(secT(c.id,c.name),true,watchUrlFor(c.id))'), "Naval section list gets a watch link");
assert.ok(app.includes('it.watch||watchUrlFor(it.id||id)'), "item pages use watch metadata");
assert.ok(app.includes('WATCH_NAVAL="https://youtu.be/KyfUysrNaco"'));
assert.ok(app.includes('WATCH_LUCA="https://www.bilibili.com/video/BV16D42157FC"'));
assert.ok(app.includes('WATCH_PODCAST="https://www.bilibili.com/video/BV1Exu1zvEbX/?p=11"'));
assert.ok(app.includes('WATCH_TURNING="https://www.bilibili.com/video/BV1B84y1h7Yy"'));
assert.ok(app.includes('WATCH_SCARY="https://youtu.be/Qh_VvZCFOcg"'));

for (const day of luca.reading) {
  const n = Number(day.id.replace("luca_d", ""));
  assert.equal(day.watch, `https://www.bilibili.com/video/BV16D42157FC?p=${n}`, day.id);
}
for (const b of podcast.boards) {
  assert.equal(b.watch, "https://www.bilibili.com/video/BV1Exu1zvEbX/?p=11", b.id);
}
for (const id of ["talk_ep1", "talk_ep1_dict", "talk_ep1_oa"]) {
  assert.equal(talk.boards.find(b => b.id === id).watch, "https://youtu.be/KyfUysrNaco", id);
}
assert.equal(talk.boards.find(b => b.id === "talk_ep2").watch, undefined, "Ep2 has no found source URL");
assert.equal(talk.boards.find(b => b.id === "talk_ep2_dict").watch, undefined);
for (const b of turning.boards) {
  assert.equal(b.watch, "https://www.bilibili.com/video/BV1B84y1h7Yy", b.id);
}
assert.equal(scary.watch, "https://youtu.be/Qh_VvZCFOcg");
assert.ok(scary.boards.every(b => b.watch === scary.watch));

const elio = JSON.parse(read("content/elio.json"));
const up = JSON.parse(read("content/up.json"));
assert.ok(!elio.watch && elio.boards.every(b => !b.watch), "Elio has no found source URL");
assert.ok(!up.watch && (up.days || []).every(d => !d.watch), "Up has no found source URL");

const wf = read("wf.js");
const game = read("game.js");
assert.match(wf, /setHeader\([^;]+,watchUrlFor\(/);
assert.match(game, /setHeader\([^;]+,watchUrlFor\(/);
