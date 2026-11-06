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
const {dqBlank, dqNorm, dqToggle, dqOnCheck, dqView, dqMergeDay, dqSameDay, dqCloudPlan, dqCloudSafe, dqLogTouch, dqApplyPlan, dqSelDoneN, dqBeyond, dqFull} = ctx;
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

// Nothing selected yet: a direct 整句对了 fills the first open slot of the five. A wrong check and a replay do not.
{
  const st = dqBlank(day);
  const bad = dqOnCheck(st, "a:1", false);
  assert.equal(bad.how, "skip");
  assert.equal(bad.st, st);
  const r = dqOnCheck(st, "a:1", true);
  assert.equal(r.how, "advance");
  assert.deepEqual(plain(r.st.sel), ["a:1"]);
  assert.deepEqual(plain(r.st.done), ["a:1"]);
  assert.equal(r.st.extra, 0);
  const again = dqOnCheck(r.st, "a:1", true);
  assert.equal(again.how, "skip");
  assert.equal(again.st.done.length, 1);
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

// A direct 整句对了 while fewer than five are pinned joins the day count. A replay does not.
{
  let st = pick(dqBlank(day), "a:0", "b:1");
  st = dqOnCheck(st, "a:0", true).st;
  const other = dqOnCheck(st, "c:4", true);
  assert.equal(other.how, "advance");
  assert.equal(other.st.sel.includes("c:4"), true);
  assert.equal(other.st.done.includes("c:4"), true);
  assert.equal(other.st.extra, 0);
  const again = dqOnCheck(other.st, "a:0", true);
  assert.equal(again.how, "skip");
  assert.equal(again.st.done.filter(k => k === "a:0").length, 1);
}

// A direct correct check pins that sentence immediately. Checking it again does not add a second copy.
{
  let st = pick(dqBlank(day), "a:0");
  st = dqOnCheck(st, "b:1", true).st;
  assert.equal(st.sel.includes("b:1"), true);
  assert.equal(st.done.includes("b:1"), true);
  const again = dqOnCheck(st, "b:1", true);
  assert.equal(again.how, "skip");
  assert.equal(again.st.sel.filter(k => k === "b:1").length, 1);
  assert.equal(again.st.done.filter(k => k === "b:1").length, 1);
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

// Direct 听写 after five selected sentences are done: each new id is overtime once.
// The set does not have to be full (已选 9 · 写对 5 still counts a sentence opened from 听写).
// Replays of that sentence, or of a finished goal sentence, and a wrong check, do not move +N.
{
  let st = dqBlank(day);
  for (let i = 0; i < 5; i++) st = dqToggle(st, "s:" + i);
  for (let i = 0; i < 5; i++) st = dqOnCheck(st, "s:" + i, true).st;
  assert.equal(dqSelDoneN(st), 5);
  for (let i = 5; i < 9; i++) st = dqToggle(st, "s:" + i);
  assert.equal(st.sel.length, 9);
  assert.equal(dqFull(st), false);
  const sixth = dqOnCheck(st, "dt_topic:8", true);
  assert.equal(sixth.how, "extra");
  assert.equal(sixth.st.sel.includes("dt_topic:8"), false);
  assert.equal(sixth.st.done.includes("dt_topic:8"), true);
  assert.equal(sixth.st.extra, 0);
  assert.equal(dqBeyond(sixth.st), 1);
  const replay = dqOnCheck(sixth.st, "dt_topic:8", true);
  assert.equal(replay.how, "skip");
  assert.equal(dqBeyond(replay.st), 1);
  const wrong = dqOnCheck(sixth.st, "dt_topic:9", false);
  assert.equal(wrong.how, "skip");
  assert.equal(wrong.st.done.includes("dt_topic:9"), false);
  const seventh = dqOnCheck(sixth.st, "dt_topic:9", true);
  assert.equal(dqBeyond(seventh.st), 2);
  const reSel = dqOnCheck(seventh.st, "s:0", true);
  assert.equal(reSel.how, "skip");
  assert.equal(dqBeyond(reSel.st), 2);
  assert.equal(dqSelDoneN(reSel.st), 5);
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

// Five are already pinned and not all written: an outside sentence waits. It is not overtime yet.
{
  let st = dqBlank(day);
  for (let i = 0; i < 5; i++) st = dqToggle(st, "k:" + i);
  st = dqOnCheck(st, "k:0", true).st;
  const outside = dqOnCheck(st, "z:1", true);
  assert.equal(outside.how, "skip");
  assert.equal(outside.st.done.includes("z:1"), false);
  assert.equal(outside.st.sel.includes("z:1"), false);
  assert.equal(outside.st.extra, 0);
  assert.equal(dqBeyond(outside.st), 0);
}

// A legacy extra number stays on the day when the selection grows, and shows once the set is full again.
{
  let st = pick(dqBlank(day), "a:0");
  st = dqOnCheck(st, "a:0", true).st;
  st = {day: st.day, sel: st.sel.slice(), done: st.done.slice(), extra: 1, star: st.star};
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
  phone = {day: phone.day, sel: phone.sel.slice(), done: phone.done.slice(), extra: 1, star: phone.star};
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
assert.equal((hook.match(/dqOnCheck/g) || []).length, 1);
assert.equal(hook.includes("#/dq"), false);
assert.match(hook, /dqGoalMount\(\)/);
assert.equal(hook.includes("pgbFill"), false);
assert.match(app.slice(app.indexOf("async function showCat"), app.indexOf("const ZOOMS")), /if\(id=="dictation"\)dqGoalMount\(\)/);

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
assert.match(app, /function dqDay\(now\)\{if\(typeof dqStickerDay=="function"\)return dqStickerDay\(now\)/);
assert.match(app, /function dqLoad\(\)\{[\s\S]*?dqDay\(\)/);
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
assert.match(app, /assets\/chongya\/overtime-/);
assert.match(app, /assets\/chongya\/reward-11-xuanfan\.png/);
assert.equal(app.includes("icons/chongya.png"), false);
assert.match(app, /fp-board/);
assert.equal(app.includes("fp-win"), false);
assert.equal(app.includes("完成句子"), false);
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
  const direct = box.dqFoot({day, sel:["a","b","c","d","e"], done:["a","b","c","d","e","x","y"], extra:0});
  assert.equal(direct.got, 5);
  assert.equal(direct.ot, 2);
  const legacy = box.dqFoot({day, sel:["a","b","c","d","e"], done:["a","b","c","d","e"], extra:2});
  assert.equal(legacy.ot, 2);
  const both = box.dqFoot({day, sel:["a","b","c","d","e"], done:["a","b","c","d","e","x"], extra:1});
  assert.equal(both.ot, 2);
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
  assert.equal(inn.includes("完成句子"), false);
  assert.equal(inn.includes("fp-dlab"), false);
  assert.equal(inn.includes("fp-done"), false);
  const homeBit = inn.slice(inn.indexOf("if(home)"));
  assert.match(inn, /assets\/goal\/goal-\$\{got\}\.png/);
  assert.equal(/pill=f\.ot\?/.test(inn), false);
  assert.match(inn, /class="fp-pill"><span class="fp-ot">\+\$\{f\.ot\}<\/span>/);
  assert.match(homeBit, /class="fp-goal" data-day-go/);
  assert.match(homeBit, /<\/button>\$\{pill\}/);
  assert.match(inn, /class="fp-home fp-strip"/);
  assert.equal(inn.includes("fp-marks"), false);
  assert.equal(inn.includes("<polygon"), false);
  assert.match(css, /\.fp-home \.fp-ot(?:,\.fp-strip \.fp-ot)?\{[^}]*background:#efe6c8/);
  assert.match(css, /\.fp-home \.fp-ot(?:,\.fp-strip \.fp-ot)?\{[^}]*#e6c56a/);
  assert.match(css, /\.fp-strip\{display:block/);
  assert.match(css, /\.fp-home \.fp-score\{[^}]*flex-direction:column/);
  const homeBox = {};
  runInContext("function esc(s){return String(s)}\nfunction dqMarkHTML(){return \"\"}\nfunction dqBoardHTML(){return \"<div class=\\\"fp-board\\\"></div>\"}\nfunction dqLoad(){return {}}\nconst DQ_FLOOR=5;\n"+inn+"\nthis.dqFootInner=dqFootInner;", createContext(homeBox));
  const bare = homeBox.dqFootInner({got:5, ot:0}, true);
  assert.match(bare.html, /class="fp-pill"/);
  assert.match(bare.html, /class="fp-ot">\+0</);
  assert.match(bare.html, /assets\/goal\/goal-5\.png/);
  const btn = bare.html.slice(bare.html.indexOf("<button"), bare.html.indexOf("</button>"));
  assert.equal(btn.includes("fp-ot"), false);
  assert.equal(btn.includes("fp-pill"), false);
  assert.match(btn, /data-day-go/);
  assert.match(btn, /assets\/goal\/goal-5\.png/);
  const plus = homeBox.dqFootInner({got:5, ot:1}, true);
  assert.match(plus.html, /class="fp-pill"/);
  assert.match(plus.html, /class="fp-ot">\+1</);
  const plus2 = homeBox.dqFootInner({got:5, ot:2}, true);
  assert.match(plus2.html, /class="fp-ot">\+2</);
  assert.match(plus2.html, /assets\/goal\/goal-5\.png/);
  const goal0 = homeBox.dqFootInner({got:0, ot:0}, true);
  assert.match(goal0.html, /assets\/goal\/goal-0\.png/);
  assert.match(goal0.html, /class="fp-ot">\+0</);
  const goal3 = homeBox.dqFootInner({got:3, ot:0}, true);
  assert.match(goal3.html, /assets\/goal\/goal-3\.png/);
  assert.match(goal3.html, /class="fp-ot">\+0</);
  const strip = homeBox.dqFootInner({got:5, ot:2}, false);
  assert.match(strip.html, /class="fp-goals"/);
  assert.match(strip.html, /assets\/goal\/goal-5\.png/);
  assert.match(strip.html, /class="fp-ot">\+2</);
  assert.match(strip.html, /fp-strip/);
  assert.equal(strip.html.includes("fp-marks"), false);
  assert.equal(strip.html.includes("data-day-go"), false);
  assert.equal(strip.html.includes("<polygon"), false);
  assert.match(homeBox.dqFootInner({got:5, ot:2}, true).html, /class="fp-ot">\+2</);
  assert.equal(homeBit.includes("fp-starrow"), false);
  assert.equal(homeBit.includes("fp-marks"), false);
  assert.equal(homeBit.includes("<b>今天的目标</b>"), false);
  assert.equal(app.slice(app.indexOf("function dqBoardHTML"), app.indexOf("function dqFootInner")).includes("data-day-go"), false);
  assert.equal(inn.includes("每完成1句"), false);
  const homeFn = app.slice(app.indexOf("async function showHome"), app.indexOf("function foldReadingTopics"));
  assert.match(homeFn, /dqQuoteShell\(\)/);
  assert.equal(homeFn.includes('<div class="qbar" id="qb">'), false);
  const from = app.indexOf("function dqNeedText");
  const pick = app.slice(from, app.indexOf("// ---------- study timer", from));
  assert.match(pick, /<details class="dqfold"/);
  assert.match(pick, /<button type="button" class="dayb"/);
  assert.match(pick, /dqHoldTap/);
  assert.match(pick, /dqPick\(dqLoad\(\)/);
  assert.match(pick, /id="dqstart"/);
  assert.match(pick, /开始今天的听写/);
  assert.match(pick, /nova_dt_go/);
  assert.match(pick, /dqHTML\(\{go:false\}\)/);
  assert.equal(pick.includes("不能在这里"), false);
  assert.equal(pick.includes("data-day-x"), false);
  assert.equal(pick.includes("data-open"), false);
  assert.equal(pick.includes("dayx"), false);
  assert.equal(pick.includes("取消这句"), false);
  assert.equal(pick.includes("data-dqk"), false);
  assert.equal(pick.includes("dictPickShell"), false);
  assert.match(pick, /dqGoalMount\(\)/);
  const nowFn = app.slice(app.indexOf("function dqPaintNow"), app.indexOf("function dqPick"));
  assert.match(nowFn, /class="daychip/);
  assert.match(nowFn, /已选/);
  assert.match(nowFn, /aria-pressed/);
  assert.equal(nowFn.includes("data-open"), false);
  assert.equal(nowFn.includes("data-day-x"), false);
  assert.equal(nowFn.includes("dayx"), false);
  assert.equal(nowFn.includes("<button"), false);
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
  assert.equal(off.blocked, true);
  assert.equal(off.st, s);
  assert.equal(off.st.sel.includes("s:0"), true);
  assert.equal(off.st.sel.length, 5);
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
  assert.equal(n, 0);
  assert.equal(JSON.parse(store.nova_dq_stick).n, 0);
  n = g.dqStickSync({day:"2026-11-05", sel:five, done:five, extra:1}, before2);
  assert.equal(n, 1);
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
  const stale = {};
  const sg = {
    localStorage: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(stale, k) ? stale[k] : null; },
      setItem(k, v){ stale[k] = String(v); }
    }
  };
  runInContext(logic + "\n" + stick + "\nconst DQSK=\"nova_dq_stick\";\nfunction dqStickRead(){try{const o=JSON.parse(localStorage.getItem(DQSK)||\"null\");return o&&typeof o==\"object\"&&!Array.isArray(o)?o:null}catch(e){return null}}\nfunction dqStickWrite(o){localStorage.setItem(DQSK,JSON.stringify(o))}\n" + sync + "\nthis.dqStickerDay=dqStickerDay;this.dqStickSync=dqStickSync;", createContext(sg));
  const sd = sg.dqStickerDay(evening);
  const floor = {day:"2026-11-04", sel:five, done:five, extra:0};
  stale.nova_dq_stick = JSON.stringify({day:sd, n:1});
  assert.equal(sg.dqStickSync(floor, evening), 0);
  assert.equal(JSON.parse(stale.nova_dq_stick).n, 0);
  stale.nova_dq_stick = JSON.stringify({day:sd, base:{"2026-11-03":1}, n:1});
  assert.equal(sg.dqStickSync(floor, evening), 0);
  assert.equal(JSON.parse(stale.nova_dq_stick).n, 0);
  assert.equal(sg.dqStickSync({day:"2026-11-04", sel:five, done:five, extra:1}, evening), 1);
}

assert.match(app, /yearLeft\(\)/);
assert.match(app.slice(app.indexOf("function showTimeLog"), app.indexOf("function showTimeLog") + 700), /tleft/);
assert.equal(app.slice(app.indexOf("function yecHTML"), app.indexOf("function updYec")).includes("yearLeft"), false);
assert.match(css, /quote-frame-navy\.png/);
assert.match(css, /\.fp-board\{/);
assert.match(css, /\.fp-boardcol\{[^}]*flex:0 0 42%/);
assert.match(css, /\.fp-dayn\{/);
assert.match(css, /\.fp-boardcol\{flex-basis:34%\}/);
assert.match(css, /\.fp-boardcol\{flex:0 0 40%\}/);
assert.equal(/\.fp-board\{flex-basis:34%\}/.test(css), false);
assert.equal(/\.fp-board\{flex:0 0 40%\}/.test(css), false);
assert.match(css, /\.fp-stk\{/);
assert.match(css, /\.fp-face\{/);
assert.match(css, /object-fit:contain/);
assert.match(app, /assets\/liuma\/day/);
assert.equal(app.includes("fp-glitter"), false);
assert.equal(app.includes("fp-bstar"), false);
assert.equal(app.includes("fp-rivet"), false);
{
  const board = app.slice(app.indexOf("// BOARD_LOGIC_START"), app.indexOf("// BOARD_LOGIC_END"));
  const htmlFn = app.slice(app.indexOf("function dqBoardHTML"), app.indexOf("function dqFootInner"));
  const stick = app.slice(app.indexOf("// STICK_LOGIC_START"), app.indexOf("// STICK_LOGIC_END"));
  const sync = app.slice(app.indexOf("function dqOtN"), app.indexOf("function dqStarDays"));
  const box = {localStorage:{getItem(){return null},setItem(){}}};
  runInContext(logic + "\n" + stick + "\nconst DQSK=\"nova_dq_stick\";\nfunction dqStickRead(){return null}\nfunction dqStickWrite(){}\n" + sync + "\n" + board + "\n" + htmlFn + "\nthis.dqBoardMonday=dqBoardMonday;this.dqBoardCount=dqBoardCount;this.dqBoardLevel=dqBoardLevel;this.dqBoardSrc=dqBoardSrc;this.dqBoardHTML=dqBoardHTML;", createContext(box));
  const week = ["2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07","2026-11-08"];
  const stars = keys => {const o={}; for (const k of keys) o[k]={star:1}; return o};
  const thu = new Date("2026-11-05T20:00:00Z");
  const sunBefore = new Date("2026-11-08T06:30:00Z");
  const sunAt = new Date("2026-11-08T07:00:00Z");
  const mon = new Date("2026-11-09T15:00:00Z");
  assert.equal(box.dqBoardMonday(thu), "2026-11-02");
  assert.equal(box.dqBoardMonday(sunBefore), "2026-11-02");
  assert.equal(box.dqBoardMonday(sunAt), "2026-11-09");
  assert.equal(box.dqBoardMonday(mon), "2026-11-09");
  assert.equal(box.dqBoardCount({}, thu), 0);
  assert.equal(box.dqBoardLevel(0), 1);
  assert.equal(box.dqBoardSrc(box.dqBoardLevel(0)), "assets/liuma/day1.png");
  assert.equal(box.dqBoardCount(stars(["2026-10-26","2026-11-02","2026-11-04"]), thu), 2);
  assert.equal(box.dqBoardLevel(2), 2);
  assert.equal(box.dqBoardSrc(2), "assets/liuma/day2.png");
  assert.equal(box.dqBoardCount(stars(week), sunBefore), 7);
  assert.equal(box.dqBoardLevel(7), 7);
  assert.equal(box.dqBoardSrc(7), "assets/liuma/day7.png");
  assert.equal(box.dqBoardCount(stars(["2026-11-08"]), sunBefore), 1);
  assert.equal(box.dqBoardCount(stars(week), sunAt), 0);
  assert.equal(box.dqBoardLevel(box.dqBoardCount(stars(week), sunAt)), 1);
  assert.equal(box.dqBoardCount(stars(["2026-11-08","2026-11-09"]), mon), 1);
  function labelBox(log){
    const b = {localStorage:{getItem(){return null},setItem(){}}};
    runInContext(logic + "\n" + stick + "\nconst DQSK=\"nova_dq_stick\";\nfunction dqStickRead(){return null}\nfunction dqStickWrite(){}\n" + sync + "\n" + board + "\nfunction dqLog(){return " + JSON.stringify(log) + "}\n" + htmlFn + "\nthis.dqBoardHTML=dqBoardHTML;", createContext(b));
    return b;
  }
  const twoHtml = labelBox(stars(["2026-11-02","2026-11-04"])).dqBoardHTML({day:"2026-11-05", sel:[], done:[], extra:0}, thu);
  assert.match(twoHtml, /src="assets\/liuma\/day2\.png"/);
  assert.match(twoHtml, /data-board-day="2"/);
  assert.match(twoHtml, /class="fp-dayn">2\/7</);
  const sevenHtml = labelBox(stars(week)).dqBoardHTML({day:"2026-11-08", sel:[], done:[], extra:0}, sunBefore);
  assert.match(sevenHtml, /src="assets\/liuma\/day7\.png"/);
  assert.match(sevenHtml, /data-board-day="7"/);
  assert.match(sevenHtml, /class="fp-dayn">7\/7</);
  const face = box.dqBoardHTML({day:"2026-11-05", sel:["a","b","c","d","e"], done:["a","b","c","d","e"], extra:2}, thu);
  assert.match(face, /class="fp-face"/);
  assert.match(face, /src="assets\/liuma\/day1\.png"/);
  assert.match(face, /<div class="fp-boardcol"><div class="fp-board"/);
  assert.match(face, /<\/div><span class="fp-dayn">1\/7<\/span><\/div>$/);
  assert.equal(face.includes("data-day-go"), false);
  assert.match(face, /class="fp-stk"/);
  assert.match(face, /src="assets\/chongya\/overtime-2\.png"/);
  assert.equal(face.includes("icons/chongya.png"), false);
  assert.equal(face.includes("fp-glitter"), false);
  assert.equal(face.includes("fp-bstar"), false);
  const ten = box.dqBoardHTML({day:"2026-11-05", sel:["a","b","c","d","e"], done:["a","b","c","d","e"], extra:10}, thu);
  assert.match(ten, /src="assets\/chongya\/overtime-10\.png"/);
  assert.equal(ten.includes("reward-11-xuanfan"), false);
  const reward = box.dqBoardHTML({day:"2026-11-05", sel:["a","b","c","d","e"], done:["a","b","c","d","e"], extra:11}, thu);
  assert.match(reward, /src="assets\/chongya\/reward-11-xuanfan\.png"/);
  assert.equal(reward.includes("overtime-"), false);
  const full = box.dqBoardHTML({day:"2026-11-08", sel:[], done:[], extra:0}, sunBefore);
  assert.equal(full.includes('class="fp-stk"'), false);
  assert.equal(full.includes("assets/chongya"), false);
  const five = ["a","b","c","d","e"];
  const floor = box.dqBoardHTML({day:"2026-11-05", sel:five, done:five, extra:0}, thu);
  assert.equal(floor.includes('class="fp-stk"'), false);
  assert.equal(floor.includes("assets/chongya"), false);
  const first = box.dqBoardHTML({day:"2026-11-05", sel:five, done:five, extra:1}, thu);
  assert.match(first, /src="assets\/chongya\/overtime-1\.png"/);
  assert.equal(first.includes("reward-11-xuanfan"), false);
  const kept = {};
  const live = {localStorage:{
    getItem(k){ return Object.prototype.hasOwnProperty.call(kept, k) ? kept[k] : null; },
    setItem(k, v){ kept[k] = String(v); }
  }};
  runInContext(logic + "\n" + stick + "\nconst DQSK=\"nova_dq_stick\";\nfunction dqStickRead(){try{const o=JSON.parse(localStorage.getItem(DQSK)||\"null\");return o&&typeof o==\"object\"&&!Array.isArray(o)?o:null}catch(e){return null}}\nfunction dqStickWrite(o){localStorage.setItem(DQSK,JSON.stringify(o))}\n" + sync + "\n" + board + "\n" + htmlFn + "\nthis.dqBoardHTML=dqBoardHTML;", createContext(live));
  kept.nova_dq_stick = JSON.stringify({day:"2026-11-05", base:{}, n:1});
  const stuck = live.dqBoardHTML({day:"2026-11-05", sel:five, done:five, extra:0}, thu);
  assert.equal(stuck.includes('class="fp-stk"'), false);
  assert.equal(stuck.includes("assets/chongya"), false);
  assert.equal(JSON.parse(kept.nova_dq_stick).n, 0);
  kept.nova_dq_stick = JSON.stringify({day:"2026-11-05", n:1});
  const missing = live.dqBoardHTML({day:"2026-11-05", sel:five, done:five, extra:0}, thu);
  assert.equal(missing.includes('class="fp-stk"'), false);
  assert.equal(JSON.parse(kept.nova_dq_stick).n, 0);
  const earned = live.dqBoardHTML({day:"2026-11-05", sel:five, done:five, extra:1}, thu);
  assert.match(earned, /src="assets\/chongya\/overtime-1\.png"/);
}

// Study day rolls at 02:00 America/New_York. Yesterday's selection is not copied onto today.
{
  const store = {};
  const g = {
    localStorage: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v){ store[k] = String(v); }
    },
    DAY: "2026-11-05",
    window: { novaCloudDirty(){} }
  };
  g.dqStickerDay = function(){ return g.DAY; };
  g.dKey = function(){ return "local-midnight-must-not-win"; };
  const glue = app.slice(app.indexOf('const DQK="nova_dq"'), app.indexOf("function dqBits"));
  runInContext(logic + "\n" + glue, createContext(g));
  const pinned = {day:"2026-11-05", sel:["a:0","a:1","a:2","a:3","a:4"], done:["a:0","a:1"], extra:0, star:0};
  g.dqSave(pinned);
  assert.deepEqual(plain(g.dqLoad().sel), pinned.sel);
  assert.deepEqual(plain(g.dqLoad().done), pinned.done);
  g.DAY = "2026-11-06";
  const next = g.dqLoad();
  assert.equal(next.day, "2026-11-06");
  assert.deepEqual(plain(next.sel), []);
  assert.deepEqual(plain(next.done), []);
  const log = JSON.parse(store.nova_dq_log);
  assert.deepEqual(log["2026-11-05"].sel, pinned.sel);
  assert.equal(log["2026-11-06"], undefined);
  assert.deepEqual(plain(g.dqLoad().sel), []);
  const fresh = g.dqOnCheck(g.dqLoad(), "b:3", true).st;
  g.dqSave(fresh);
  assert.deepEqual(plain(g.dqLoad().sel), ["b:3"]);
  assert.equal(g.dqLoad().day, "2026-11-06");
  assert.equal(JSON.parse(store.nova_dq_log)["2026-11-05"].sel.includes("b:3"), false);
}

// 听写 list and 今天的目标 use the same goal sheets and the same shown-star memory as home.
// A star already shown does not pop again. A new star still starts the pop.
{
  assert.match(app, /function dqGoalDay\(\)\{try\{return typeof dqDay=="function"\?dqDay\(\)/);
  assert.match(app.slice(app.indexOf("function dqPaint"), app.indexOf("let DQDAY")), /else\{el\.innerHTML=inn\.html;const g=el\.querySelector\("\.fp-goals"\);if\(g\)dqGoalHome\(g\)\}/);
  const store = {};
  const pops = [];
  function art(n){
    return {classList:{toggle(){}}, setAttribute(){}, removeAttribute(){}, getAttribute(name){return name==="data-g"?String(n):""}, dataset:{}};
  }
  const box = {
    isConnected: true,
    dataset: {},
    querySelectorAll(){return [0,1,2,3,4,5].map(art)},
    querySelector(){return art(0)},
    appendChild(){}
  };
  const g = {
    localStorage: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
      setItem(k, v){ store[k] = String(v); }
    },
    document: {hidden:false, querySelector(){return null}, createElement(){pops.push("el");return {className:"",style:{},setAttribute(){},dataset:{}}}},
    location: {search:"", hash:""},
    matchMedia(){return {matches:false}},
    fetch(){return Promise.resolve({ok:false})},
    dqBits(){return {got:g.GOT}},
    dqDay(){return "2026-11-06"},
    GOT: 5
  };
  const goal = app.slice(app.indexOf("function dqGoalShow"), app.indexOf("function dqFootInner"));
  runInContext(goal + "\nthis.dqGoalHome=dqGoalHome;this.dqGoalShownSet=dqGoalShownSet;", createContext(g));
  g.dqGoalShownSet(5);
  g.dqGoalHome(box);
  assert.equal(pops.length, 0);
  assert.equal(box.dataset.popping, undefined);
  g.dqGoalShownSet(4);
  g.dqGoalHome(box);
  assert.equal(pops.length > 0, true);
  assert.equal(box.dataset.popping, "1");
}

// Direct sentences past the floor move the shared +N the list, the daily page, and home all read.
{
  const five = ["a","b","c","d","e"];
  let st = {day, sel:five.slice(), done:five.slice(), extra:0, star:1};
  for (let i = 1; i <= 11; i++) st = dqOnCheck(st, "dt_direct:"+i, true).st;
  assert.equal(dqBeyond(st), 11);
  assert.equal(st.extra, 0);
  assert.equal(dqOnCheck(st, "dt_direct:11", true).how, "skip");
  const foot = app.slice(app.indexOf("const DQ_FLOOR"), app.indexOf("function dqBits"));
  const box = {};
  runInContext(logic + "\n" + foot + "\nthis.dqFoot=dqFoot;", createContext(box));
  assert.equal(box.dqFoot(st).ot, 11);
  assert.equal(box.dqFoot({day, sel:five, done:five.concat(["dt_direct:1"]), extra:0}).ot, 1);
  assert.equal(box.dqFoot({day, sel:five, done:five.concat(["dt_direct:1","dt_direct:2"]), extra:0}).ot, 2);
  assert.equal(box.dqFoot({day, sel:five, done:["a","b","c","d"], extra:0}).ot, 0);
  const stick = app.slice(app.indexOf("// STICK_LOGIC_START"), app.indexOf("// STICK_LOGIC_END"));
  const sync = app.slice(app.indexOf("function dqOtN"), app.indexOf("function dqStarDays"));
  const board = app.slice(app.indexOf("// BOARD_LOGIC_START"), app.indexOf("// BOARD_LOGIC_END"));
  const htmlFn = app.slice(app.indexOf("function dqBoardHTML"), app.indexOf("function dqFootInner"));
  const live = {localStorage:{getItem(){return null}, setItem(){}}};
  runInContext(logic + "\n" + stick + "\nconst DQSK=\"nova_dq_stick\";\nfunction dqStickRead(){return null}\nfunction dqStickWrite(){}\n" + sync + "\n" + board + "\nfunction dqLog(){return {}}\n" + htmlFn + "\nthis.dqBoardHTML=dqBoardHTML;this.dqOtN=dqOtN;this.dqStickSync=dqStickSync;", createContext(live));
  const thu = new Date("2026-11-05T20:00:00Z");
  const one = live.dqBoardHTML({day:"2026-11-05", sel:five, done:five.concat(["x"]), extra:0}, thu);
  assert.match(one, /overtime-1\.png/);
  const two = {localStorage:{getItem(){return null}, setItem(){}}};
  runInContext(logic + "\n" + stick + "\nconst DQSK=\"nova_dq_stick\";\nfunction dqStickRead(){return null}\nfunction dqStickWrite(){}\n" + sync + "\n" + board + "\nfunction dqLog(){return {}}\n" + htmlFn + "\nthis.dqBoardHTML=dqBoardHTML;", createContext(two));
  assert.match(two.dqBoardHTML({day:"2026-11-05", sel:five, done:five.concat(["x","y"]), extra:0}, thu), /overtime-2\.png/);
  const many = {localStorage:{getItem(){return null}, setItem(){}}};
  runInContext(logic + "\n" + stick + "\nconst DQSK=\"nova_dq_stick\";\nfunction dqStickRead(){return null}\nfunction dqStickWrite(){}\n" + sync + "\n" + board + "\nfunction dqLog(){return {}}\n" + htmlFn + "\nthis.dqBoardHTML=dqBoardHTML;", createContext(many));
  const ids = five.concat(Array.from({length:11}, (_,i)=>"e"+i));
  assert.match(many.dqBoardHTML({day:"2026-11-05", sel:five, done:ids, extra:0}, thu), /reward-11-xuanfan\.png/);
  const again = live.dqStickSync({day:"2026-11-05", sel:five, done:five.concat(["x"]), extra:0}, thu);
  const revisit = live.dqStickSync({day:"2026-11-05", sel:five, done:five.concat(["x"]), extra:0}, thu);
  assert.equal(again, revisit);
}

console.log("dq tests ok");
