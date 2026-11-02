import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const ctx = {};
runInContext(readFileSync(new URL("./time-merge.js", import.meta.url), "utf8"), createContext(ctx));
const {tApply, tLocalHigher, tDays, tCloudPlan} = ctx;

const day = "2026-11-02";
const other = "2026-11-01";

// Same threshold as the sync-code tMerge: incoming must beat the day by more than 0.5s.
{
  const m = tApply({[day]: 10}, {[day]: 10.4});
  assert.equal(m.n, 0);
  assert.equal(m.log[day], 10);
}
{
  const m = tApply({[day]: 10}, {[day]: 10.6});
  assert.equal(m.n, 1);
  assert.equal(m.log[day], 10.6);
}
{
  const local = {[day]: 20, [other]: 5};
  const remote = {[day]: 10, [other]: 9};
  const plan = tCloudPlan(local, remote);
  assert.equal(plan.applied, 1);
  assert.equal(plan.log[day], 20);
  assert.equal(plan.log[other], 9);
  assert.equal(plan.push, true);
  assert.equal(tLocalHigher(local, remote), true);
}
// Remote-only higher day: update local, do not write back.
{
  const plan = tCloudPlan({[day]: 10}, {[day]: 30, [other]: 4});
  assert.equal(plan.applied, 2);
  assert.equal(plan.log[day], 30);
  assert.equal(plan.log[other], 4);
  assert.equal(plan.push, false);
}
// Empty cloud, local history: push every stored day. Do not drop days.
{
  const plan = tCloudPlan({[day]: 3, [other]: 8}, {});
  assert.equal(plan.push, true);
  assert.equal(plan.log[day], 3);
  assert.equal(plan.log[other], 8);
  assert.equal(Object.keys(plan.log).length, 2);
}
// Invalid keys and non-positive seconds never win a day.
{
  const m = tApply({[day]: 2}, {nope: 99, [day]: 0, "2026-1-1": 50, [other]: -3});
  assert.equal(m.n, 0);
  assert.equal(m.log[day], 2);
  assert.equal(tDays(m.log)[day], 2);
  assert.equal("nope" in tDays({nope: 9, [day]: 1}), false);
}
// tApply does not mutate the local object the caller still holds.
{
  const local = {[day]: 1};
  tApply(local, {[day]: 5});
  assert.equal(local[day], 1);
}
// Equal days: nothing to push, nothing applied.
{
  const plan = tCloudPlan({[day]: 7}, {[day]: 7});
  assert.equal(plan.applied, 0);
  assert.equal(plan.push, false);
  assert.equal(plan.log[day], 7);
}

console.log("time-merge tests ok");
