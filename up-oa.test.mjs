// 飞屋环游记 Day 1: every 生词 card has an original-audio line (🎬), and the 句子听写 board uses those clips.
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
const root = new URL(".", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const app = read("app.js");
const d = JSON.parse(read("content/up_d01.json"));
for (const c of d.flash.cards) {
  assert.ok(c.oa && c.note && c.note.includes("原句："), c.w);
  assert.equal(existsSync(new URL("./content/" + c.oa, root)), true, c.oa);
}
const up = JSON.parse(read("content/up.json"));
assert.equal(up.days[0].dt, "up_d01_dict.json");
const dt = JSON.parse(read("content/up_d01_dict.json"));
assert.ok(dt.sents.length >= 30);
for (const s of dt.sents) { assert.ok(s.oa && s.zh, s.t); assert.equal(existsSync(new URL("./content/" + s.oa, root)), true, s.oa); }
assert.match(app, /id:"up_dictation",like:"dictation"/);
assert.match(app, /\(flash\|ee\|dt\)/);
