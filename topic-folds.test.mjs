import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = src.indexOf("function tfOpen");
const end = src.indexOf("document.addEventListener(\"toggle\"");
assert.ok(start > 0 && end > start);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ctx = {esc, localStorage: {getItem(){return null}, setItem(){}}};
runInContext(src.slice(start, end) + "\nthis.topicGroupsHTML=topicGroupsHTML;", createContext(ctx));

const row = (id, n) => ({n, html:`<button class="li" data-tid="${id}">${id}</button>`});
const rows = [row("t10",10), row("t01",1), row("t11",11), row("t20",20), row("t21",21), {n:null, html:`<button class="li" data-tid="mine">mine</button>`}];
const html = ctx.topicGroupsHTML("flash", rows, true);
const folds = [...html.matchAll(/<details class="tfold"[^>]*>[\s\S]*?<\/details>/g)].map(m => m[0]);
assert.equal(folds.length, 3);
assert.match(folds[0], /Topic 1–10/);
assert.match(folds[0], /data-tf="flash:1"/);
assert.equal(folds[0].includes(" open"), false);
assert.match(folds[0], /data-tid="t01"[\s\S]*data-tid="t10"/);
assert.match(folds[1], /Topic 11–20/);
assert.equal(folds[1].includes(" open"), false);
assert.match(folds[1], /data-tid="t11"[\s\S]*data-tid="t20"/);
assert.match(folds[2], /Topic 21–30/);
assert.match(folds[2], /data-tf="flash:21"/);
assert.match(folds[2], / open/);
assert.ok(html.indexOf("data-tid=\"mine\"") > html.lastIndexOf("</details>"));

const flat = ctx.topicGroupsHTML("phrases", rows, false);
assert.equal(flat.includes("tfold"), false);
assert.equal(flat.includes("<details"), false);
assert.match(flat, /data-tid="t10"[\s\S]*data-tid="mine"/);

const luca = src.slice(src.indexOf("function showLuca"), src.indexOf("async function showCat"));
assert.equal(luca.includes("topicGroupsHTML"), false);
assert.equal(luca.includes("tfold"), false);

const topicNoSrc = src.slice(src.indexOf("const topicNo"), src.indexOf("function topicSort"));
const ids = {};
runInContext(topicNoSrc + "\nthis.topicNo=topicNo;", createContext(ids));
assert.equal(ids.topicNo({id:"naval_t06"}), 6);
assert.equal(ids.topicNo({id:"dt_naval_t06"}), 6);
assert.equal(ids.topicNo({id:"t01v_flash"}), 1);
assert.equal(ids.topicNo({id:"wf_t12v"}), 12);
assert.equal(ids.topicNo({id:"ch_t20"}), 20);
assert.equal(ids.topicNo({id:"phrases_flash"}), null);

console.log("topic-folds.test.mjs ok");
