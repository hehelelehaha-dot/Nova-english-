import assert from "node:assert/strict";
import fs from "node:fs";
const read = f => fs.readFileSync(new URL(f, import.meta.url), "utf8");
const app = read("app.js");
const html = read("index.html");
const css = read("style.css");
const podcast = JSON.parse(read("content/podcast.json"));
const talk = JSON.parse(read("content/talk.json"));
const scary = JSON.parse(read("content/scary.json"));

assert.match(html, /id="watch-src"[^>]*target="_blank"[^>]*rel="noopener"/);
assert.match(html, /▶ 观看原视频/);
assert.match(css, /#watch-src/);
assert.match(app, /function setWatchSrc\(/);
assert.match(app, /function watchUrlFor\(/);
assert.match(app, /function setHeader\(t,back,watch\)/);
assert.ok(app.includes('setHeader(secT(c.id,c.name),true,watchUrlFor(c.id))'), "Naval section list gets a watch link");
assert.ok(app.includes('it.watch||watchUrlFor(it.id||id)'), "item pages use watch metadata");
assert.ok(app.includes('WATCH_NAVAL="https://youtu.be/KyfUysrNaco"'));
assert.ok(app.includes('WATCH_PODCAST="https://www.bilibili.com/video/BV1Exu1zvEbX/?p=11"'));
assert.ok(app.includes('WATCH_SCARY="https://youtu.be/Qh_VvZCFOcg"'));
assert.equal(app.includes("WATCH_LUCA"), false);
assert.equal(app.includes("WATCH_TURNING"), false);

for (const b of podcast.boards) {
  assert.equal(b.watch, "https://www.bilibili.com/video/BV1Exu1zvEbX/?p=11", b.id);
}
for (const id of ["talk_ep1", "talk_ep1_dict", "talk_ep1_oa"]) {
  assert.equal(talk.boards.find(b => b.id === id).watch, "https://youtu.be/KyfUysrNaco", id);
}
assert.equal(talk.boards.find(b => b.id === "talk_ep2").watch, undefined, "Ep2 has no found source URL");
assert.equal(talk.boards.find(b => b.id === "talk_ep2_dict").watch, undefined);
assert.equal(scary.watch, "https://youtu.be/Qh_VvZCFOcg");
assert.ok(scary.boards.every(b => b.watch === scary.watch));

const wf = read("wf.js");
const game = read("game.js");
assert.match(wf, /setHeader\([^;]+,watchUrlFor\(/);
assert.match(game, /setHeader\([^;]+,watchUrlFor\(/);
