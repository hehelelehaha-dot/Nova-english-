// Reading-card sunflower: play, pause, resume, double-tap restart.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const fn = app.slice(app.indexOf("// RD_SUN_START"), app.indexOf("// RD_SUN_END"));
const g = {};
runInContext(fn + "\nthis.rdSunTap=rdSunTap;", createContext(g));
const tap = s => g.rdSunTap(s);
assert.equal(tap({at:0, now:1000, own:false, ended:false, t:0, paused:true}), "play");
assert.equal(tap({at:1000, now:1200, own:true, ended:false, t:3, paused:false}), "restart");
assert.equal(tap({at:1000, now:2000, own:true, ended:false, t:3, paused:false}), "pause");
assert.equal(tap({at:1000, now:2000, own:true, ended:false, t:3, paused:true}), "resume");
assert.equal(tap({at:1000, now:2000, own:true, ended:true, t:8, paused:true}), "play");
assert.equal(tap({at:1000, now:2000, own:false, ended:false, t:3, paused:true}), "play");
assert.equal(tap({at:1000, now:2000, own:true, ended:false, t:0.01, paused:true}), "play");
const rd = app.slice(app.indexOf("function viewReading"), app.indexOf("// 原文 in word cards"));
assert.match(rd, /rdSunTap\(/);
assert.match(rd, /\$\("rnggo"\)\.onclick=\(\)=>listenStart\(fold,false\)/);
assert.match(rd, /playSeg\(i,k,p\)/);
assert.match(rd, /\$\("rloop"\)\.onclick=\(\)=>listenStart\(fold,true\)/);
assert.match(app, /function stopAll\(\)\{RUN\+\+;rdOwn=-1/);
console.log("rd sun ok");
