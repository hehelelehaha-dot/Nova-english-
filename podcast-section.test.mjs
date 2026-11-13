import assert from "node:assert/strict";
import fs from "node:fs";
const read = f => fs.readFileSync(new URL(f, import.meta.url), "utf8");
const app = read("app.js");
const pod = JSON.parse(read("content/podcast.json"));
const gg = JSON.parse(read("content/podcast_gg.json"));
const dict = JSON.parse(read("content/podcast_gg_dict.json"));
assert.ok(app.includes('foldHTML("podcast","播客"'));
assert.ok(app.indexOf('foldHTML("podcast"') > app.indexOf('foldHTML("up"'));
assert.match(app, /podcastHit\(/);
assert.deepEqual(pod.boards.map(b => b.id), ["podcast_gg", "podcast_gg_dict"]);
assert.equal(pod.boards[1].kind, "dictation");
for (const s of gg.sents) {
  assert.ok(s.h && s.t && s.zh && s.bkw.length && s.a);
  assert.equal(s.bkwa.length, s.bkw.length);
  for (const a of s.bkwa.concat([s.a, s.oa].filter(Boolean))) assert.ok(fs.existsSync(new URL("content/" + a, import.meta.url)), a);
}
assert.equal(dict.sents.length, gg.sents.filter(s => s.oa).length);
assert.ok(dict.sents.every(s => s.oa));
console.log("podcast-section ok");
