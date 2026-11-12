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
assert.match(app, /\/\^\(luca_\|elio_\)\//);
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
assert.ok(withAudio.length >= 3);
for (const s of withAudio) assert.equal(existsSync(new URL("./content/" + s.oa, root)), true, s.oa);
const planet = words.flash.cards.find(c => c.w === "planet");
assert.equal(words.sents[planet.si].oa, "audio/elio_mo/s05.mp3");
