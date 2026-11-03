// Daily ④ dictation bar: selection is the target, and only a fully correct check moves it.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const root = new URL(".", import.meta.url);
const app = readFileSync(new URL("./app.js", root), "utf8");
const css = readFileSync(new URL("./style.css", root), "utf8");
const cloud = readFileSync(new URL("./cloud.js", root), "utf8");

const start = app.indexOf("// DQ_LOGIC_START");
const end = app.indexOf("// DQ_LOGIC_END");
assert.ok(start >= 0 && end > start, "daily-bar logic block missing");
const logic = app.slice(start, end);
assert.equal(/slice\(\s*0\s*,\s*10\s*\)|length\s*>=\s*10|length\s*>\s*10|DQ_SUGGEST/.test(logic), false);

const ctx = {};
runInContext(logic, createContext(ctx));
const {dqBlank, dqNorm, dqToggle, dqOnCheck, dqView} = ctx;
// Values built inside the vm have a different realm prototype than this file.
const plain = v => JSON.parse(JSON.stringify(v));

const day = "2026-11-03";
const pick = (st, ...keys) => keys.reduce((s, k) => dqToggle(s, k), st);

{
  const st = dqNorm({day: "2026-11-02", sel: ["a:1"], done: ["a:1"], extra: 4}, day);
  assert.deepEqual(plain(st), plain(dqBlank(day)));
}
{
  const st = dqNorm({day, sel: ["a:1", "a:1", 3, ""], done: ["b:2"], extra: -2}, day);
  assert.deepEqual(plain(st.sel), ["a:1"]);
  assert.deepEqual(plain(st.done), ["b:2"]);
  assert.equal(st.extra, 0);
}

// Nothing selected: a correct check does not count, and there is no /10 target.
{
  const st = dqBlank(day);
  const r = dqOnCheck(st, "a:1", true);
  assert.equal(r.how, "skip");
  assert.deepEqual(plain(r.st.done), []);
  assert.equal(r.st.extra, 0);
  const v = dqView(st);
  assert.equal(v.tot, 0);
  assert.equal(v.pct, 0);
  assert.equal(v.showExtra, false);
}

// A wrong check never moves a selected sentence.
{
  let st = pick(dqBlank(day), "a:0", "a:1");
  const r = dqOnCheck(st, "a:0", false);
  assert.equal(r.how, "skip");
  assert.equal(r.st, st);
  assert.deepEqual(plain(dqView(st)), {n: 0, tot: 2, full: false, pct: 0, extra: 0, showExtra: false});
}

// Only the selected sentence advances, once. A second pass before the set is full does not double-count.
{
  let st = pick(dqBlank(day), "a:0", "a:1", "a:2");
  let r = dqOnCheck(st, "a:1", true);
  assert.equal(r.how, "advance");
  st = r.st;
  assert.equal(dqView(st).n, 1);
  assert.equal(dqView(st).pct, 33);
  r = dqOnCheck(st, "a:1", true);
  assert.equal(r.how, "skip");
  assert.equal(dqView(r.st).n, 1);
}

// Other / review sentences do not count until every selected sentence is correct.
{
  let st = pick(dqBlank(day), "a:0", "b:1");
  st = dqOnCheck(st, "a:0", true).st;
  const other = dqOnCheck(st, "c:4", true);
  assert.equal(other.how, "skip");
  assert.equal(other.st.extra, 0);
  assert.equal(other.st.done.includes("c:4"), false);
  const again = dqOnCheck(st, "a:0", true);
  assert.equal(again.how, "skip");
}

// A correct check done before the sentence was selected does not complete it later.
{
  let st = pick(dqBlank(day), "a:0");
  st = dqOnCheck(st, "b:1", true).st;
  st = dqToggle(st, "b:1");
  assert.deepEqual(plain(dqView(st)), {n: 0, tot: 2, full: false, pct: 0, extra: 0, showExtra: false});
}

// The bar fills at the selected count: 3 sentences → 100% at 3, not at 10.
{
  let st = pick(dqBlank(day), "a:0", "a:1", "a:2");
  for (const k of ["a:0", "a:1", "a:2"]) st = dqOnCheck(st, k, true).st;
  const v = dqView(st);
  assert.equal(v.n, 3);
  assert.equal(v.tot, 3);
  assert.equal(v.full, true);
  assert.equal(v.pct, 100);
  assert.equal(v.showExtra, false);
}

// After the set is complete, further correct checks (new or review) are 超额 only.
{
  let st = pick(dqBlank(day), "a:0");
  st = dqOnCheck(st, "a:0", true).st;
  let r = dqOnCheck(st, "b:9", true);
  assert.equal(r.how, "extra");
  st = r.st;
  r = dqOnCheck(st, "a:0", true);
  assert.equal(r.how, "extra");
  st = r.st;
  const v = dqView(st);
  assert.equal(v.n, 1);
  assert.equal(v.tot, 1);
  assert.equal(v.pct, 100);
  assert.equal(v.extra, 2);
  assert.equal(v.showExtra, true);
}

// Twelve selected sentences are allowed. The target becomes 12, not 10.
{
  const keys = Array.from({length: 12}, (_, i) => "t:" + i);
  let st = pick(dqBlank(day), ...keys);
  st = dqOnCheck(st, "t:0", true).st;
  const v = dqView(st);
  assert.equal(v.tot, 12);
  assert.equal(v.n, 1);
  assert.equal(v.pct, 8);
  assert.equal(v.full, false);
}

// Changing the selection keeps a finished sentence done, and does not count it twice.
{
  let st = pick(dqBlank(day), "a:0", "a:1");
  st = dqOnCheck(st, "a:0", true).st;
  st = dqToggle(st, "a:0");
  assert.deepEqual(plain(dqView(st)), {n: 0, tot: 1, full: false, pct: 0, extra: 0, showExtra: false});
  assert.equal(st.done.includes("a:0"), true);
  st = dqToggle(st, "a:0");
  assert.deepEqual(plain(dqView(st)), {n: 1, tot: 2, full: false, pct: 50, extra: 0, showExtra: false});
  const r = dqOnCheck(st, "a:0", true);
  assert.equal(r.how, "skip");
}

// Dropping the last incomplete sentence can fill the bar. Earlier ignored checks stay ignored.
{
  let st = pick(dqBlank(day), "a:0", "a:1");
  st = dqOnCheck(st, "a:0", true).st;
  st = dqOnCheck(st, "z:1", true).st;
  assert.equal(st.extra, 0);
  st = dqToggle(st, "a:1");
  const v = dqView(st);
  assert.equal(v.full, true);
  assert.equal(v.tot, 1);
  assert.equal(v.showExtra, false);
}

// 超额 earned while the set was full stays stored, and shows again only when the set is full.
{
  let st = pick(dqBlank(day), "a:0");
  st = dqOnCheck(st, "a:0", true).st;
  st = dqOnCheck(st, "z:1", true).st;
  st = dqToggle(st, "b:2");
  assert.equal(dqView(st).showExtra, false);
  assert.equal(st.extra, 1);
  st = dqOnCheck(st, "b:2", true).st;
  assert.equal(dqView(st).showExtra, true);
  assert.equal(dqView(st).extra, 1);
  assert.equal(dqView(st).pct, 100);
}

const hook = app.slice(app.indexOf("function viewDictation"), app.indexOf("// ---------- daily ④ dictation bar"));
assert.match(hook, /dqOnCheck\(dqLoad\(\),\(it&&it\.id\|\|"x"\)\+":"\+si,r\.ok\)/);
assert.match(hook, /if\(hit\.how!=="skip"\)/);
assert.equal(hook.includes("pgbFill"), false);

const exp = app.slice(app.indexOf("async function exportCode"), app.indexOf("async function decodeCode"));
assert.equal(exp.includes("nova_dq"), false);
assert.match(exp, /u:sun/);
assert.match(exp, /TLOG/);
assert.equal(cloud.includes("nova_dq"), false);
assert.match(app, /const DQK="nova_dq"/);
assert.match(app, /function dqLoad\(\)\{[\s\S]*?dKey\(\)/);
assert.equal(app.slice(app.indexOf("function dqSave"), app.indexOf("function dqBits")).includes("novaCloudDirty"), false);
assert.match(app, /建议 \$\{DQ_SUGGEST\} 句，少选、多选都可以/);
assert.equal(app.includes("pgbFill"), false);
assert.equal(app.includes('id="pgb"'), false);

const topics = app.slice(app.indexOf("function dqTopics"), app.indexOf("function dqFind"));
assert.doesNotMatch(topics, /\.t\b|\.zh\b/);
assert.match(topics, /s&&s\.oa/);

assert.equal(css.includes(".pgb{"), false);
assert.match(css, /\.daybar\{/);
assert.match(css, /\.daybar\.is-full/);
