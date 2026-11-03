import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = src.indexOf("function breathFix");
const end = src.indexOf("async function getJSON");
const ctx = {};
runInContext(src.slice(start, end), createContext(ctx));
const {breathFix} = ctx;

const text = "then you start your bout of suffering or anticipation while you strive to get that thing.";
const card = () => ({type:"reading", sents:[
  {t:"Even success, it’s human nature to bank it very quickly, right,", seg:[[0,5,0.08,1.9],[6,10,2.6,4.78]]},
  {t:text, seg:[[0,3,0.08,1.18],[4,15,1.18,4.91]]}
]});

{
  const d = breathFix(card());
  assert.equal(JSON.stringify(d.sents[0].seg), JSON.stringify([[0,5,0.08,1.9],[6,10,2.6,4.78]]));
  // seg arrays are created inside the vm, so compare by value.
  assert.equal(JSON.stringify(d.sents[1].seg), JSON.stringify([[0,3,0.08,1.18],[4,8,1.18,3.24],[9,15,3.24,4.91]]));
  const w = text.split(/\s+/);
  assert.equal(w.slice(4,9).join(" "), "bout of suffering or anticipation");
  assert.equal(w.slice(9,16).join(" "), "while you strive to get that thing.");
}

// A card that already starts a segment on while stays as stored.
{
  const d = breathFix({sents:[{t:text, seg:[[0,8,0.08,2.94],[9,15,2.94,4.91]]}]});
  assert.equal(JSON.stringify(d.sents[0].seg), JSON.stringify([[0,8,0.08,2.94],[9,15,2.94,4.91]]));
}

// A timing window that does not cover 3.24s is left alone (a different cut of the clip).
{
  const seg = [[0,3,0.1,0.8],[4,15,0.8,2.2]];
  const d = breathFix({sents:[{t:text, seg}]});
  assert.equal(JSON.stringify(d.sents[0].seg), JSON.stringify(seg));
}

assert.equal(breathFix({categories:[]}).categories.length, 0);
assert.equal(breathFix(null), null);
