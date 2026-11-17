// Scary Comp. 2021 home fold: 阅读卡 only, one reading board per story, every line has its own 原声 clip + 中文.
import assert from "node:assert/strict";
import {readFileSync, existsSync, statSync} from "node:fs";
const root = new URL(".", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");
const app = read("app.js");
const sc = JSON.parse(read("content/scary.json"));

// Fold: titled exactly "Scary Comp. 2021", after 播客对话, one 阅读卡 tile only.
assert.ok(app.includes('foldHTML("scary","Scary Comp. 2021",SCARY_DEF.length,scary)'));
assert.ok(app.indexOf('foldHTML("scary"') > app.indexOf('foldHTML("talk"'));
const def = /const SCARY_DEF=\[([\s\S]*?)\];/.exec(app)[1];
assert.equal((def.match(/\{id:/g) || []).length, 1, "only one board in the fold");
assert.match(def, /like:"reading"/);
assert.doesNotMatch(def, /dictation|flash|ee|original|quiz/);
assert.match(app, /loadScary\(\)/);
assert.match(app, /scaryHit\(/);
assert.match(app, /const scary=scarySec\(id\);if\(scary\)return showScary\(scary\)/);
assert.match(app, /\/\^scary_\/\.test\(rid\)/, "scary boards get the Luca-style 单句循环 / 停顿 controls");

// Boards: reading only, ids scary_01.., each line with text, Chinese, its own 原声 clip.
assert.ok(sc.boards.length >= 30);
let lines = 0;
sc.boards.forEach((b, i) => {
  assert.equal(b.id, "scary_" + String(i + 1).padStart(2, "0"));
  assert.equal(b.kind, "reading");
  const d = JSON.parse(read("content/" + b.data));
  assert.equal(d.type, "reading");
  assert.equal(d.id, b.id);
  assert.equal(b.sub, d.sents.length + " 句");
  assert.ok(d.sents.length >= 4, b.id);
  for (const s of d.sents) {
    lines++;
    assert.ok(s.t && /[.?!…"”]$/.test(s.t), "punctuated: " + s.t);
    assert.ok(s.zh && /[\u4e00-\u9fff]/.test(s.zh), "中文: " + s.t);
    assert.ok(s.oa && s.a === s.oa && s.d > 0.3, s.t);
    assert.match(s.oa, /^audio\/scary\/s\d\d_\d\d\.mp3$/);
    const f = new URL("content/" + s.oa, root);
    assert.ok(existsSync(f) && statSync(f).size > 1000, s.oa);
    if (s.seg) {
      const n = s.t.split(/\s+/).length;
      let last = -1;
      for (const [x, y, a, z] of s.seg) {
        assert.equal(x, last + 1); last = y;
        assert.ok(a < z && z <= s.d + 0.01);
      }
      assert.equal(last, n - 1);
    }
  }
});
assert.ok(lines >= 400);
// The generic reading board gives every 原声 line 从这里开始听 and a board-only 原声连播 / 原声循环.
assert.ok(app.includes('从这里开始听 ▸'));
assert.ok(app.includes('{const cards=rows.filter(x=>x.s&&x.s.oa)'));
console.log("scary-section ok", sc.boards.length, "boards", lines, "lines");
