// Per-day study time merge shared by the N1 sync code (t:log) and cloud sync.
// Same calendar day: keep the larger seconds. A value replaces the day only when it
// exceeds the other by more than 0.5s — the same threshold tMerge has always used.
function tApply(local, R){
  const out=Object.assign({}, local||{});
  let n=0;
  if(R&&typeof R=="object"){
    for(const k in R){
      const v=+R[k];
      if(!/^\d{4}-\d\d-\d\d$/.test(k)||!(v>0))continue;
      if(v>(out[k]||0)+0.5){out[k]=v;n++}
    }
  }
  return {log:out, n};
}
function tLocalHigher(local, remote){
  remote=remote&&typeof remote=="object"?remote:{};
  for(const k in local||{}){
    const v=+local[k];
    if(!/^\d{4}-\d\d-\d\d$/.test(k)||!(v>0))continue;
    if(v>(remote[k]||0)+0.5)return true;
  }
  return false;
}
function tDays(log){
  const o={};
  for(const k in log||{}){
    const v=+log[k];
    if(!/^\d{4}-\d\d-\d\d$/.test(k)||!(v>0)||!isFinite(v))continue;
    o[k]=v;
  }
  return o;
}
// What to write locally and whether the cloud doc is missing a higher day.
function tCloudPlan(local, remote){
  const m=tApply(local, remote);
  return {log:tDays(m.log), applied:m.n, push:tLocalHigher(local, remote)};
}
