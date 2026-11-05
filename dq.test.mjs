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
const {dqBlank, dqNorm, dqToggle, dqOnCheck, dqView, dqMergeDay, dqSameDay, dqCloudPlan, dqCloudSafe, dqLogTouch, dqApplyPlan} = ctx;
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

assert.equal(logic.includes("localStorage"), false);
assert.equal(logic.includes("novaCloudDirty"), false);
assert.equal(logic.includes("firebase"), false);

const dayB = "2026-11-02";
const pack = (sel, done, extra) => ({sel, done, extra});

// Two devices, one day: selections union, and every 整句对了 stays. Target becomes the union count.
{
  let phone = pick(dqBlank(day), "a:0", "a:1");
  phone = dqOnCheck(phone, "a:0", true).st;
  let pad = pick(dqBlank(day), "a:1", "b:2");
  pad = dqOnCheck(pad, "b:2", true).st;
  const m = dqMergeDay(phone, pad);
  const v = dqView({day, sel: m.sel, done: m.done, extra: m.extra});
  assert.deepEqual(plain(m.sel), ["a:0", "a:1", "b:2"]);
  assert.deepEqual(plain(m.done), ["a:0", "b:2"]);
  assert.equal(v.tot, 3);
  assert.equal(v.n, 2);
  assert.equal(v.full, false);
  assert.equal(dqSameDay(m, dqMergeDay(pad, phone)), true);
  assert.equal(dqSameDay(m, dqMergeDay(m, pad)), true);
}

// A finished sentence the other device never selected stays selected and done.
{
  const m = dqMergeDay({day, sel: ["a:0"], done: ["a:0"], extra: 0}, {day, sel: ["b:1"], done: [], extra: 0});
  assert.equal(m.done.includes("a:0"), true);
  assert.equal(m.sel.includes("a:0"), true);
  const v = dqView({day, sel: m.sel, done: m.done, extra: m.extra});
  assert.equal(v.n, 1);
  assert.equal(v.tot, 2);
}

// A done id with no selection on either side is kept, so a later re-select still counts.
{
  const copied = plain(dqMergeDay(pack(["b:1"], ["a:0"], 0), pack([], [], 0)));
  assert.deepEqual(copied.done, ["a:0"]);
  let st = {day, sel: copied.sel, done: copied.done, extra: 0};
  st = dqToggle(st, "a:0");
  assert.equal(dqView(st).n, 1);
  assert.equal(dqView(st).tot, 2);
  const missed = dqOnCheck(pick(dqBlank(day), "a:0"), "a:0", false);
  assert.equal(dqMergeDay(missed.st, pack(["b:1"], [], 0)).done.includes("a:0"), false);
}

// 超额 keeps the larger count. It stays stored when the union is not full yet.
{
  let phone = pick(dqBlank(day), "a:0");
  phone = dqOnCheck(phone, "a:0", true).st;
  phone = dqOnCheck(phone, "z:1", true).st;
  let pad = pick(dqBlank(day), "a:0", "b:2");
  pad = dqOnCheck(pad, "a:0", true).st;
  const m = dqMergeDay(
    {sel: phone.sel, done: phone.done, extra: phone.extra},
    {sel: pad.sel, done: pad.done, extra: 4}
  );
  assert.equal(m.extra, 4);
  const v = dqView({day, sel: m.sel, done: m.done, extra: m.extra});
  assert.equal(v.full, false);
  assert.equal(v.showExtra, false);
  assert.equal(v.extra, 4);
  assert.equal(v.tot, 2);
  assert.equal(v.n, 1);
}

// The union is the target. It is not capped at the suggested 10.
{
  const left = Array.from({length: 12}, (_, i) => "L:" + i);
  const right = Array.from({length: 12}, (_, i) => "R:" + i);
  const m = dqMergeDay(pack(left, ["L:0"], 0), pack(right, ["R:1"], 0));
  const v = dqView({day, sel: m.sel, done: m.done, extra: m.extra});
  assert.equal(v.tot, 24);
  assert.equal(v.n, 2);
}

// Same sets in a different order are already merged. A higher 超额 still needs a push.
{
  const local = {[day]: pack(["b:1", "a:0"], ["a:0"], 1)};
  const remote = {[day]: pack(["a:0", "b:1"], ["a:0"], 1)};
  const same = dqCloudPlan(local, remote);
  assert.equal(same.push, false);
  assert.equal(same.applied, 0);
  const ahead = dqCloudPlan({[day]: pack(["a:0"], ["a:0"], 2)}, {[day]: pack(["a:0"], ["a:0"], 1)});
  assert.equal(ahead.push, true);
  assert.equal(ahead.map[day].extra, 2);
  assert.equal(ahead.applied, 0);
}

// Remote-only progress updates the plan for local and does not ask for a write.
{
  const plan = dqCloudPlan(
    {[day]: pack(["a:0"], ["a:0"], 0)},
    {[day]: pack(["a:0", "b:1"], ["a:0"], 0), [dayB]: pack(["c:1"], ["c:1"], 3)}
  );
  assert.equal(plan.push, false);
  assert.equal(plan.applied, 2);
  assert.deepEqual(plain(plan.map[day].sel), ["a:0", "b:1"]);
  assert.equal(plan.map[dayB].extra, 3);
  assert.equal(plan.map[dayB].done.includes("c:1"), true);
}

// A new local day pushes, and older cloud days stay in the map that would be written.
{
  const remote = {
    [dayB]: pack(["b:1"], ["b:1"], 1),
    "2026-11-01": pack(["c:1"], [], 0)
  };
  const plan = dqCloudPlan({[day]: pack(["a:1"], ["a:1"], 0)}, remote);
  assert.equal(plan.push, true);
  assert.equal(plan.map[day].done.includes("a:1"), true);
  assert.equal(plan.map[dayB].done.includes("b:1"), true);
  assert.equal(plan.map["2026-11-01"].sel.includes("c:1"), true);
  assert.equal(dqCloudSafe(remote, plan.map), true);
  assert.equal(dqCloudSafe(remote, {}), false);
  assert.equal(dqCloudSafe(remote, {[dayB]: pack(["b:1"], [], 1), "2026-11-01": pack(["c:1"], [], 0)}), false);
}

// Junk keys never become a day, and inputs are left alone. A local 整句对了 still wins the push.
{
  const local = {[day]: pack(["a:1"], ["a:1"], 1), nope: pack(["z:1"], ["z:1"], 9), "2026-11-3": pack(["q:1"], ["q:1"], 1)};
  const remote = {bad: {sel: ["nope"], done: ["nope"], extra: 4}, [day]: {sel: ["a:1", "a:1"], done: "a:1", extra: -3}};
  const before = JSON.stringify({local, remote});
  const plan = dqCloudPlan(local, remote);
  assert.equal(JSON.stringify({local, remote}), before);
  assert.deepEqual(Object.keys(plan.map), [day]);
  assert.deepEqual(plain(plan.map[day].done), ["a:1"]);
  assert.equal(plan.map[day].extra, 1);
  assert.equal(plan.push, true);
}

// Local midnight keeps yesterday in the log. An empty today does not erase it.
{
  const y = {day: dayB, sel: ["a:1"], done: ["a:1"], extra: 2};
  const first = dqLogTouch({}, y);
  const frozen = JSON.stringify(first);
  const next = dqLogTouch(first, {day, sel: [], done: [], extra: 0});
  assert.equal(JSON.stringify(first), frozen);
  assert.deepEqual(plain(next[dayB].done), ["a:1"]);
  assert.equal(next[dayB].extra, 2);
  assert.equal(next[day], undefined);
}

// Cloud today arriving after midnight must not drop yesterday still sitting in nova_dq.
{
  const yesterday = {day: dayB, sel: ["a:0"], done: ["a:0"], extra: 1};
  const remote = {[day]: pack(["b:1"], [], 0), [dayB]: pack(["c:9"], ["c:9"], 0)};
  const before = JSON.stringify({yesterday, remote});
  const applied = dqApplyPlan(yesterday, {}, remote, day);
  assert.equal(JSON.stringify({yesterday, remote}), before);
  assert.equal(applied.applied > 0, true);
  assert.deepEqual(plain(applied.log[dayB].done), ["a:0", "c:9"]);
  assert.equal(applied.log[dayB].extra, 1);
  assert.deepEqual(plain(applied.today.sel), ["b:1"]);
  assert.equal(applied.today.day, day);
  assert.equal(applied.today.done.includes("a:0"), false);
}

const hook = app.slice(app.indexOf("function viewDictation"), app.indexOf("// ---------- daily ④ dictation bar"));
assert.match(hook, /dqOnCheck\(dqLoad\(\),\(it&&it\.id\|\|"x"\)\+":"\+si,r\.ok\)/);
assert.match(hook, /if\(hit\.how!=="skip"\)/);
assert.equal(hook.includes("pgbFill"), false);

const exp = app.slice(app.indexOf("async function exportCode"), app.indexOf("async function decodeCode"));
assert.equal(exp.includes("nova_dq"), false);
assert.match(exp, /u:sun/);
assert.match(exp, /TLOG/);
assert.match(cloud, /nova_dq/);
assert.match(cloud, /dqCloudPlan/);
assert.match(cloud, /dqApplyCloud/);
assert.match(cloud, /dqCloudSafe/);
assert.match(cloud, /tCloudPlan\(TLOG/);
assert.match(cloud, /tMerge\(remoteTime\)/);
assert.match(cloud, /nova_time:plan\.log/);
assert.match(cloud, /if\(!cloudUser\|\|!cloudDb\)return/);
assert.equal(cloud.includes("removeItem"), false);
assert.match(app, /const DQK="nova_dq",DQL="nova_dq_log"/);
assert.match(app, /function dqLoad\(\)\{[\s\S]*?dKey\(\)/);
assert.match(app.slice(app.indexOf("function dqSave"), app.indexOf("function dqBits")), /novaCloudDirty/);
const rules = readFileSync(new URL("./firestore.rules", root), "utf8");
assert.match(rules, /nova_time/);
assert.match(rules, /nova_dq/);
assert.match(rules, /request\.auth\.uid == uid/);
assert.match(rules, /allow delete: if false/);
assert.equal(app.includes("写对选中的句子，这条才会满"), false);
assert.equal(app.includes("DQ_SUGGEST"), false);
assert.equal(app.includes("daybar-s"), false);
assert.equal(app.includes('v.n+"/"+v.tot'), false);
assert.equal(/DQ_FLOOR/.test(logic), false);
assert.match(app, /const DQ_FLOOR=5/);
assert.match(app, /fp-ot/);
assert.match(app, /今天的目标/);
assert.match(app, /icons\/chongya\.png/);
assert.match(app, /fp-board/);
assert.equal(app.includes("fp-win"), false);
assert.match(app, /完成句子/);
assert.equal(app.includes("每完成1句"), false);
assert.match(app, /function dqStickerDay/);
assert.match(app, /America\/New_York/);
{
  const foot = app.slice(app.indexOf("const DQ_FLOOR"), app.indexOf("function dqBits"));
  const box = {};
  runInContext(logic + "\n" + foot + "\nthis.dqFoot=dqFoot;this.dqBlank=dqBlank;this.dqToggle=dqToggle;this.dqOnCheck=dqOnCheck;", createContext(box));
  const day = "2026-11-04";
  const none = box.dqFoot({day, sel:["a","b","c","d","e","f","g","h"], done:[], extra:0});
  assert.equal(none.got, 0);
  assert.equal(none.won, false);
  assert.equal(none.ot, 0);
  assert.equal(none.floor, 5);
  const five = box.dqFoot({day, sel:["a","b","c","d","e","f","g","h"], done:["a","b","c","d","e"], extra:0});
  assert.equal(five.got, 5);
  assert.equal(five.won, true);
  assert.equal(five.ot, 0);
  const more = box.dqFoot({day, sel:["a","b","c","d","e","f","g","h"], done:["a","b","c","d","e","f","g"], extra:0});
  assert.equal(more.got, 7);
  assert.equal(more.won, true);
  assert.equal(more.ot, 2);
  const short = box.dqFoot({day, sel:["a","b","c"], done:["a","b","c"], extra:2});
  assert.equal(short.got, 3);
  assert.equal(short.won, false);
  assert.equal(short.ot, 0);
  let picked = box.dqBlank(day);
  for(let i=0;i<12;i++) picked = box.dqToggle(picked, "s:"+i);
  assert.equal(picked.sel.length, 12);
  picked = box.dqToggle(picked, "s:3");
  assert.equal(picked.sel.includes("s:3"), false);
  assert.equal(picked.sel.length, 11);
  const outside = box.dqOnCheck(picked, "not-in-set", true);
  assert.equal(outside.st.sel.includes("not-in-set"), false);
  assert.equal(outside.st.sel.length, 11);
  const html = app.slice(app.indexOf("function dqHTML"), app.indexOf("function dqPaint"));
  assert.equal(/\bn\s*\/\s*tot|0\/8|0\/5/.test(html), false);
  assert.match(html, /fp-home/);
  const inn = app.slice(app.indexOf("function dqFootInner"), app.indexOf("function dqHTML"));
  assert.match(inn, /今天的目标/);
  assert.match(inn, /fp-qslot/);
  assert.match(inn, /fp-side/);
  assert.equal(inn.includes("今天的句子"), false);
  assert.match(inn, /完成句子/);
  assert.match(inn, /dqStageHTML/);
  assert.match(app, /icons\/goal\//);
  assert.match(app, /star-on/);
  assert.match(app, /star-off/);
  assert.match(app, /"aim"/);
  assert.match(app, /"pill"/);
  assert.equal(inn.includes("每完成1句"), false);
  const homeFn = app.slice(app.indexOf("async function showHome"), app.indexOf("function foldReadingTopics"));
  assert.match(homeFn, /dqQuoteShell\(\)/);
  assert.equal(homeFn.includes('<div class="qbar" id="qb">'), false);
  const from = app.indexOf("async function showDQ");
  const pick = app.slice(from, app.indexOf("// ---------- study timer", from));
  assert.match(pick, /<details class="dqfold"/);
  assert.match(pick, /class="dayb" role="button"/);
  assert.equal(pick.includes("<button type=\"button\" class=\"dayb\""), false);
  assert.match(pick, /dqHoldTap/);
  assert.match(pick, /dqPick\(dqLoad\(\),b\.dataset\.k\)/);
  assert.match(pick, /已经 5 句/);
  assert.match(css, /\.dqfold\{/);
  assert.match(css, /overflow-anchor:\s*none/);
}
assert.equal(app.includes("pgbFill"), false);
assert.equal(app.includes('id="pgb"'), false);

const topics = app.slice(app.indexOf("function dqTopics"), app.indexOf("function dqFind"));
assert.doesNotMatch(topics, /\.t\b|\.zh\b/);
assert.match(topics, /s&&s\.oa/);

assert.equal(css.includes(".pgb{"), false);
assert.match(css, /\.daybar\{/);
assert.match(css, /\.daybar\.is-full/);

// Offline log + apply: yesterday survives midnight, and a pull does not schedule another upload.
{
  const store = {};
  const g = {
    localStorage: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v){ store[k] = String(v); }
    },
    TODAY: day,
    dirty: 0
  };
  g.dKey = function(){ return g.TODAY; };
  g.window = { novaCloudDirty(){ g.dirty++; } };
  const glue = app.slice(app.indexOf('const DQK="nova_dq"'), app.indexOf("function dqBits"));
  runInContext(logic + "\n" + glue, createContext(g));
  let st = g.dqToggle(g.dqToggle(g.dqBlank(g.TODAY), "a:0"), "a:1");
  st = g.dqOnCheck(st, "a:0", true).st;
  const before = g.dirty;
  g.dqSave(st);
  assert.equal(g.dirty, before + 1);
  g.dqSave.quiet = true;
  g.dqSave(st);
  assert.equal(g.dirty, before + 1);
  g.dqSave.quiet = false;
  g.localStorage.setItem("nova_dq_log", "{}");
  assert.deepEqual(plain(g.dqLog()[day].done), ["a:0"]);
  g.TODAY = "2026-11-04";
  const rolled = g.dqLoad();
  assert.equal(rolled.day, "2026-11-04");
  assert.equal(rolled.sel.length, 0);
  const kept = JSON.parse(g.localStorage.getItem("nova_dq_log"));
  assert.deepEqual(kept[day].done, ["a:0"]);
  assert.deepEqual(kept[day].sel, ["a:0", "a:1"]);
  assert.equal(kept["2026-11-04"], undefined);
  const dirtyNow = g.dirty;
  g.dqApplyCloud({"2026-11-04": {sel: ["b:1"], done: ["b:1"], extra: 2}});
  assert.equal(g.dirty, dirtyNow);
  const cur = JSON.parse(g.localStorage.getItem("nova_dq"));
  assert.equal(cur.day, "2026-11-04");
  assert.deepEqual(cur.sel, ["b:1"]);
  assert.deepEqual(cur.done, ["b:1"]);
  assert.equal(cur.extra, 2);
  const log2 = JSON.parse(g.localStorage.getItem("nova_dq_log"));
  assert.deepEqual(log2[day].done, ["a:0"]);
  assert.ok(log2["2026-11-04"].done.includes("b:1"));
  let now = g.dqLoad();
  now = g.dqToggle(now, "a:2");
  g.dqSave(now);
  const remote = {"2026-11-04": {sel: ["b:1"], done: ["b:1"], extra: 2}};
  const plan = g.dqCloudPlan(g.dqLog(), remote);
  assert.equal(plan.push, true);
  assert.equal(plan.map["2026-11-04"].done.includes("b:1"), true);
  assert.equal(plan.map["2026-11-04"].sel.includes("a:2"), true);
  assert.equal(plan.map["2026-11-04"].sel.includes("b:1"), true);
  assert.equal(plan.map[day].done.includes("a:0"), true);
  assert.equal(g.dqCloudSafe(remote, plan.map), true);
}

// Two sync rounds meet on the same sets, including an older day only one device had.
{
  const phone = {[day]: pack(["a:0", "a:1"], ["a:0"], 1), [dayB]: pack(["y:1"], ["y:1"], 0)};
  const pad = {[day]: pack(["a:1", "b:2"], ["b:2"], 0)};
  const uploaded = dqCloudPlan(phone, {});
  const padPull = dqCloudPlan(pad, uploaded.map);
  const phonePull = dqCloudPlan(phone, padPull.map);
  assert.equal(dqSameDay(phonePull.map[day], padPull.map[day]), true);
  assert.equal(phonePull.map[day].done.includes("a:0"), true);
  assert.equal(phonePull.map[day].done.includes("b:2"), true);
  assert.equal(phonePull.map[day].sel.length, 3);
  assert.equal(phonePull.map[day].extra, 1);
  assert.equal(phonePull.map[dayB].done.includes("y:1"), true);
  assert.equal(padPull.map[dayB].done.includes("y:1"), true);
  const settled = dqCloudPlan(phonePull.map, padPull.map);
  assert.equal(settled.push, false);
  assert.equal(settled.applied, 0);
}

{
  const box = {};
  const pickFn = app.slice(app.indexOf("function dqPick"), app.indexOf("async function showDQ"));
  runInContext(logic + "\nconst DQ_FLOOR=5;\n" + pickFn + "\nthis.dqPick=dqPick;this.dqBlank=dqBlank;", createContext(box));
  let s = box.dqBlank("2026-11-04");
  for (let i = 0; i < 5; i++) s = box.dqPick(s, "s:" + i).st;
  assert.equal(s.sel.length, 5);
  const sixth = box.dqPick(s, "s:5");
  assert.equal(sixth.blocked, true);
  assert.equal(sixth.st, s);
  const off = box.dqPick(s, "s:0");
  assert.equal(off.blocked, false);
  assert.equal(off.st.sel.includes("s:0"), false);
  assert.equal(off.st.sel.length, 4);
  s = box.dqPick(off.st, "s:0").st;
  assert.equal(s.sel.length, 5);
}

{
  const store = {};
  const g = {
    localStorage: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v){ store[k] = String(v); }
    },
    TODAY: "2026-11-04",
    window: { novaCloudDirty(){} },
    dKey(){ return g.TODAY; }
  };
  const glue = app.slice(app.indexOf('const DQK="nova_dq"'), app.indexOf("function dqBits"));
  runInContext(logic + "\n" + glue, createContext(g));
  let st = g.dqBlank(g.TODAY);
  for (let i = 0; i < 5; i++) st = g.dqToggle(st, "k:" + i);
  for (let i = 0; i < 5; i++) st = g.dqOnCheck(st, "k:" + i, true).st;
  g.dqSave(st);
  assert.equal(JSON.parse(g.localStorage.getItem("nova_dq")).star, 1);
  assert.equal(g.dqLog()[g.TODAY].star, 1);
  st = g.dqToggle(st, "k:0");
  assert.equal(g.dqFoot(st).won, false);
  g.dqSave(st);
  assert.equal(JSON.parse(g.localStorage.getItem("nova_dq")).star, 1);
  assert.equal(g.dqLog()[g.TODAY].star, 1);
  const other = g.dqMergeDay({sel:["k:1"], done:[], extra:0, star:0}, {sel:[], done:[], extra:0, star:1});
  assert.equal(other.star, 1);
}

{
  const stick = app.slice(app.indexOf("// STICK_LOGIC_START"), app.indexOf("// STICK_LOGIC_END"));
  const sync = app.slice(app.indexOf("function dqOtN"), app.indexOf("function dqStarDays"));
  const store = {};
  const g = {
    localStorage: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v){ store[k] = String(v); }
    }
  };
  runInContext(logic + "\n" + stick + "\nconst DQSK=\"nova_dq_stick\";\nfunction dqStickRead(){try{const o=JSON.parse(localStorage.getItem(DQSK)||\"null\");return o&&typeof o==\"object\"&&!Array.isArray(o)?o:null}catch(e){return null}}\nfunction dqStickWrite(o){localStorage.setItem(DQSK,JSON.stringify(o))}\n" + sync + "\nthis.dqStickerDay=dqStickerDay;this.dqStickSync=dqStickSync;", createContext(g));
  assert.equal(g.dqStickerDay(new Date("2026-11-04T06:30:00Z")), "2026-11-03");
  assert.equal(g.dqStickerDay(new Date("2026-11-04T07:00:00Z")), "2026-11-04");
  assert.equal(g.dqStickerDay(new Date("2026-07-15T05:30:00Z")), "2026-07-14");
  assert.equal(g.dqStickerDay(new Date("2026-07-15T06:00:00Z")), "2026-07-15");
  const evening = new Date("2026-11-04T20:00:00Z");
  const before2 = new Date("2026-11-05T06:30:00Z");
  const after2 = new Date("2026-11-05T08:00:00Z");
  const five = ["a","b","c","d","e"];
  let n = g.dqStickSync({day:"2026-11-04", sel:five, done:["a","b","c"], extra:0}, evening);
  assert.equal(n, 0);
  n = g.dqStickSync({day:"2026-11-04", sel:five, done:five, extra:0}, evening);
  assert.equal(n, 0);
  n = g.dqStickSync({day:"2026-11-04", sel:five, done:five, extra:1}, evening);
  assert.equal(n, 1);
  n = g.dqStickSync({day:"2026-11-05", sel:[], done:[], extra:0}, before2);
  assert.equal(n, 1);
  n = g.dqStickSync({day:"2026-11-05", sel:five, done:five, extra:1}, before2);
  assert.equal(n, 2);
  n = g.dqStickSync({day:"2026-11-05", sel:five, done:five, extra:1}, after2);
  assert.equal(n, 0);
  n = g.dqStickSync({day:"2026-11-05", sel:five, done:five, extra:2}, after2);
  assert.equal(n, 1);
  const again = g.dqStickSync({day:"2026-11-05", sel:five, done:five, extra:2}, after2);
  assert.equal(again, 1);
  const fresh = {localStorage: {getItem(){return null}, setItem(){}}};
  runInContext(logic + "\n" + stick + "\nconst DQSK=\"nova_dq_stick\";\nfunction dqStickRead(){return null}\nfunction dqStickWrite(){}\n" + sync + "\nthis.dqOtN=dqOtN;this.dqStickSync=dqStickSync;", createContext(fresh));
  assert.equal(fresh.dqOtN({sel:five, done:five, extra:0}), 0);
  assert.equal(fresh.dqOtN({sel:five, done:five, extra:1}), 1);
  assert.equal(fresh.dqStickSync({day:"2026-11-04", sel:five, done:five, extra:1}, evening), 1);
}

assert.match(app, /yearLeft\(\)/);
assert.match(app.slice(app.indexOf("function showTimeLog"), app.indexOf("function showTimeLog") + 700), /tleft/);
assert.equal(app.slice(app.indexOf("function yecHTML"), app.indexOf("function updYec")).includes("yearLeft"), false);
assert.match(css, /\.fp-board\{/);
assert.match(css, /\.fp-stk\{/);
assert.match(css, /clip-path:polygon/);

console.log("dq tests ok");
