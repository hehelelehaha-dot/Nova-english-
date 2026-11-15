import assert from "node:assert/strict";
import fs from "node:fs";
const read = f => fs.readFileSync(new URL(f, import.meta.url), "utf8");
const app = read("app.js");
const talk = JSON.parse(read("content/talk.json"));
const ep = JSON.parse(read("content/talk_ep1.json"));
const dict = JSON.parse(read("content/talk_ep1_dict.json"));
assert.ok(app.includes('foldHTML("talk","播客对话"'));
assert.ok(app.indexOf('foldHTML("talk"') > app.indexOf('foldHTML("podcast"'));
assert.match(app, /talkHit\(/);
assert.match(app, /function viewEpisode/);
assert.deepEqual(talk.boards.map(b => b.id), ["talk_ep1", "talk_ep1_dict", "talk_ep1_oa"]);
assert.equal(talk.boards[0].kind, "episode");
assert.equal(talk.boards[1].kind, "dictation");
assert.equal(talk.boards[2].kind, "original");
const oa = JSON.parse(read("content/talk_ep1_oa.json"));
assert.equal(oa.type, "reading");
assert.equal(oa.sents.length, 6);
assert.ok(oa.sents.some(s => s.sp === "Naval (original)"));
assert.ok(oa.sents.every(s => s.oa && s.t && s.zh));
for (const s of oa.sents) {
  assert.ok(fs.existsSync(new URL("content/" + s.oa, import.meta.url)), s.oa);
}
assert.ok(ep.sents.some(s => s.sp === "Naval (original)" && s.segment === "original"));
assert.ok(app.includes('item:"talk_ep1_oa"'));
assert.equal(ep.type, "episode");
assert.ok(ep.audio && ep.dur > 0 && ep.sents.length > 0);
assert.ok(fs.existsSync(new URL("content/" + ep.audio, import.meta.url)), ep.audio);
let lastStart = -1;
for (const s of ep.sents) {
  assert.ok(s.sp && s.t && s.a && s.start != null);
  assert.ok(s.start >= lastStart, "starts should be nondecreasing");
  lastStart = s.start;
  assert.ok(fs.existsSync(new URL("content/" + s.a, import.meta.url)), s.a);
}
const dialogue = ep.sents.filter(s => s.segment === "dialogue");
assert.equal(dialogue.length, 13);
assert.equal(dict.sents.length, 13);
assert.ok(dict.sents.every(s => s.oa && s.t && s.zh && s.sp));
for (const s of dict.sents) {
  assert.ok(fs.existsSync(new URL("content/" + s.oa, import.meta.url)), s.oa);
}
console.log("talk-section ok");
