// Turning Red home fold: 高频生词 only, wired next to Elio.
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";

const root = new URL(".", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const app = read("app.js");
const turning = JSON.parse(read("content/turning.json"));
const words = JSON.parse(read("content/turning_words.json"));

assert.match(app, /const TURNING_DEF=\[/);
assert.ok(app.includes('foldHTML("turning","青春变形记"'));
assert.ok(app.indexOf('foldHTML("turning"') > app.indexOf('foldHTML("elio"'));
assert.ok(app.indexOf('foldHTML("turning"') < app.indexOf('foldHTML("up"'));
assert.match(app, /loadTurning\(\)/);
assert.match(app, /turningHit\(/);
assert.match(app, /\/\^\(luca_\|elio_\|turning_\)\//);
assert.match(app, /fold=="turning"/);

assert.deepEqual(turning.boards.map(b => b.id), ["turning_words", "turning_dict"]);
assert.equal(turning.boards[0].title, "高频生词");
assert.equal(turning.boards[0].kind, "flash");
assert.equal(turning.boards[0].vocab, 10);

assert.equal(words.flash.cards.length, 10);
assert.deepEqual(words.flash.cards.map(c => c.w), [
  "panda", "ritual", "concert", "ticket", "temple",
  "honor", "calm", "ancestor", "perfect", "control"
]);
assert.equal(words.sents.length, 20);
const withAudio = words.sents.filter(s => s.oa);
assert.equal(withAudio.length, 7);
for (const s of withAudio) {
  assert.ok(s.a && s.d > 0, s.t);
  assert.equal(existsSync(new URL("./content/" + s.oa, root)), true, s.oa);
}
assert.equal(words.sents[0].t, "Any strong emotion will release the panda.");
assert.equal(words.sents[0].oa, "audio/turning_w/s01.mp3");
assert.equal(words.sents[1].t, "Mei-Mei is keeping the panda?");
assert.equal(words.sents[1].oa, "audio/turning_w/s02.mp3");
assert.equal(words.sents[12].t, "I'm calm.");
assert.equal(words.sents[12].oa, "audio/turning_w/s13.mp3");
assert.equal(words.sents[14].t, "Our ancestors had a mystical connection with red pandas.");
assert.equal(words.sents[14].oa, "audio/turning_w/s15.mp3");
assert.equal(words.sents[16].t, "I'm just so sick of being perfect.");
assert.equal(words.sents[16].oa, "audio/turning_w/s17.mp3");
assert.equal(words.sents[17].t, "My whole life I've been perfect little Mei-Mei.");
assert.equal(words.sents[17].oa, "audio/turning_w/s18.mp3");
assert.equal(words.sents[18].t, "I got so angry, and I lost control.");
assert.equal(words.sents[18].oa, "audio/turning_w/s19.mp3");
assert.ok(!words.sents[2].oa);
assert.ok(!words.sents[4].oa);
