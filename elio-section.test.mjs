// Elio home fold: 结尾独白 + 高频生词, wired next to 夏日友晴天.
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";

const root = new URL(".", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const app = read("app.js");
const elio = JSON.parse(read("content/elio.json"));
const mono = JSON.parse(read("content/elio_monologue.json"));
const words = JSON.parse(read("content/elio_words.json"));

assert.match(app, /const ELIO_DEF=\[/);
assert.ok(app.includes('foldHTML("elio","Elio"'));
assert.ok(app.indexOf('foldHTML("elio"') > app.indexOf('foldHTML("luca"'));
assert.ok(app.indexOf('foldHTML("elio"') < app.indexOf('foldHTML("up"'));
assert.match(app, /loadElio\(\)/);
assert.match(app, /elioHit\(/);
assert.match(app, /\/\^\(luca_\|elio_\|turning_\)\//);
assert.match(app, /fold=="elio"/);

assert.deepEqual(elio.boards.map(b => b.id), ["elio_monologue", "elio_words"]);
assert.equal(mono.type, "reading");
assert.equal(mono.sents.length, 8);
assert.equal(mono.sents[0].t, "It's an ancient human theme.");
assert.equal(mono.sents[7].t, "Are we alone?");
for (const s of mono.sents) {
  assert.ok(s.oa && s.a && s.d > 0, s.t);
  assert.equal(existsSync(new URL("./content/" + s.oa, root)), true, s.oa);
}
assert.ok(mono.sents[4].bkw.some(g => g[0] === "planet"));
assert.ok(mono.sents[5].bkw.some(g => g[0] === "radio"));
assert.ok(mono.sents[7].bkw.some(g => g[0] === "alone"));

assert.equal(words.flash.cards.length, 10);
assert.deepEqual(words.flash.cards.map(c => c.w), [
  "candidate", "planet", "alone", "radio", "alien",
  "debris", "bargaining chip", "negotiate", "clone", "ambassador"
]);
assert.equal(words.sents.length, 20);
const withAudio = words.sents.filter(s => s.oa);
assert.ok(withAudio.length >= 11);
for (const s of withAudio) assert.equal(existsSync(new URL("./content/" + s.oa, root)), true, s.oa);
const planet = words.flash.cards.find(c => c.w === "planet");
assert.equal(words.sents[planet.si].oa, "audio/elio_mo/s05.mp3");
assert.equal(words.sents[0].t, "A toast to our new candidate, Elio Solís of Earth.");
assert.equal(words.sents[0].oa, "audio/elio_w/s01.mp3");
assert.equal(words.sents[2].t, "But yes, I run the planet.");
assert.equal(words.sents[8].t, "I'm trying to get abducted by aliens.");
assert.equal(words.sents[9].t, "I knew aliens were looking for me.");
assert.equal(words.sents[12].oa, "audio/elio_w/s13.mp3");
assert.equal(words.sents[13].t, "Hi, Dad! I'm a bargaining chip.");
assert.equal(words.sents[15].t, "And the negotiation is not over, because now I've got this!");
assert.equal(words.sents[18].t, "Greetings, Ambassador.");

// 👆 点读 on 结尾独白: every line has seg [wordStart, wordEnd, t0, t1] covering all words.
for (const s of mono.sents) {
  const n = s.t.split(/\s+/).length;
  assert.ok(Array.isArray(s.seg) && s.seg.length > 0, s.t);
  assert.equal(s.seg[0][0], 0, s.t);
  assert.equal(s.seg[s.seg.length - 1][1], n - 1, s.t);
  s.seg.forEach((z, k) => { assert.ok(z[0] <= z[1] && z[2] < z[3], s.t); if (k) assert.equal(z[0], s.seg[k - 1][1] + 1, s.t); });
}
