import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = src.indexOf("function breathFix");
const end = src.indexOf("async function getJSON");
const ctx = {};
runInContext(src.slice(start, end), createContext(ctx));
const {breathFix} = ctx;

const norm = s => String(s || "").toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();

const whileText = "then you start your bout of suffering or anticipation while you strive to get that thing.";
const card = () => ({type:"reading", sents:[
  {t:"Even success, it’s human nature to bank it very quickly, right,", oa:"audio/t06o/s02.mp3", seg:[[0,5,0.08,1.9],[6,10,2.6,4.78]]},
  {t:whileText, oa:"audio/t06o/s05.mp3", seg:[[0,3,0.08,1.18],[4,15,1.18,4.91]]}
]});

{
  const d = breathFix(card());
  const w = whileText.split(/\s+/);
  assert.equal(JSON.stringify(d.sents[1].seg), JSON.stringify([[0,3,0.22,1.3],[4,8,1.52,3.24],[9,15,3.24,4.84]]));
  assert.equal(w.slice(4, 9).join(" "), "bout of suffering or anticipation");
  assert.equal(w.slice(9, 16).join(" "), "while you strive to get that thing.");
  // The breath before "bout" is outside both slices, and anticipation is whole.
  assert.ok(d.sents[1].seg[0][3] <= 1.35);
  assert.ok(d.sents[1].seg[1][2] >= 1.45);
  assert.equal(d.sents[1].seg[1][3], 3.24);
  assert.equal(d.sents[1].seg[2][2], 3.24);
  // "to" is no longer cut off before the breath, and "right" is its own short slice.
  assert.equal(JSON.stringify(d.sents[0].seg), JSON.stringify([[0,5,0,2.33],[6,9,2.66,4.32],[10,10,4.46,4.71]]));
  const again = breathFix(JSON.parse(JSON.stringify(d)));
  assert.equal(JSON.stringify(again.sents[1].seg), JSON.stringify(d.sents[1].seg));
}

// A stored cut that already starts on while, but still mid-word at 2.94s, is moved to 3.24s.
{
  const d = breathFix({sents:[{t:whileText, oa:"audio/t06o/s05.mp3", seg:[[0,8,0.08,2.94],[9,15,2.94,4.91]]}]});
  assert.equal(d.sents[0].seg[2][2], 3.24);
  assert.equal(d.sents[0].seg[2][0], 9);
}

// Same English on a different clip (or with no original audio) is left alone.
{
  const seg = [[0,3,0.08,1.18],[4,15,1.18,4.91]];
  const d = breathFix({sents:[{t:whileText, oa:"audio/t08o/s05.mp3", seg}]});
  assert.equal(JSON.stringify(d.sents[0].seg), JSON.stringify(seg));
  const bare = breathFix({sents:[{t:whileText, seg}]});
  assert.equal(JSON.stringify(bare.sents[0].seg), JSON.stringify(seg));
}

// Topic 5 "For me, I" no longer holds the long pause before "would".
{
  const t = "For me, I would have done everything the same except I would have done it with less anger, less emotion, less internal suffering because that was optional. It wasn’t necessary.";
  const d = breathFix({sents:[{t, oa:"audio/t05o/s08.mp3", seg:[[0,2,0,3.6]]}]});
  const seg = d.sents[0].seg;
  assert.equal(seg[0][1], 1);
  assert.ok(seg[0][3] < 1);
  assert.equal(seg[1][0], 2);
  assert.ok(seg[1][2] > 3);
  const words = t.split(/\s+/);
  assert.equal(words.slice(seg[0][0], seg[0][1] + 1).join(" "), "For me,");
  assert.equal(words.slice(seg[seg.length - 1][0], seg[seg.length - 1][1] + 1).join(" "), "It wasn’t necessary.");
  let covered = -1;
  for (const z of seg) {
    assert.equal(z[0], covered + 1);
    assert.ok(z[3] >= z[2]);
    covered = z[1];
  }
  assert.equal(covered, words.length - 1);
}

// Topic 7 "unhappiness | will" moves off the middle of the word.
{
  const t = "so I think just knowing that those are the source of unhappiness will make you be choosy about your desires.";
  const d = breathFix({sents:[{t, oa:"audio/t07o/s04.mp3", seg:[[0,11,0,3.35],[12,19,3.35,6.62]]}]});
  assert.ok(d.sents[0].seg[0][3] > 3.5);
  assert.ok(d.sents[0].seg[1][2] > 3.7);
  const words = t.split(/\s+/);
  assert.equal(words[d.sents[0].seg[0][1]], "unhappiness");
  assert.equal(words[d.sents[0].seg[1][0]], "will");
}

assert.equal(breathFix({categories:[]}).categories.length, 0);
assert.equal(breathFix(null), null);

// Every listed sentence's slices cover its words in order. Keys are the normalized card text.
const listed = src.slice(src.indexOf("const FIX={"), src.indexOf("};", src.indexOf("const FIX={")));
const keys = [...listed.matchAll(/"([^"]+)":/g)].map(m => m[1]);
assert.ok(keys.length >= 30);
for (const k of keys) assert.equal(norm(k), k);
