import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = src.indexOf("function moneyFix");
const end = src.indexOf("async function getJSON");
const ctx = {};
runInContext(src.slice(start, end), createContext(ctx));
const {breathFix, moneyFix} = ctx;

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

// Topic 6 "…as I said, it solves…" is "money solves" on the clip. Gold text,
// the Chinese that translated 它, and character ranges past that word all move.
// Word indexes stay, so the 点读 slice still covers the same words.
{
  const old = "and you set out to do something and you were right, so I’ll bet that lingers, and then as I said, it solves your money problems.";
  const zh = "你下定决心去做一件事，结果你做对了，所以我敢说那种感觉会一直留着，再加上我说过的，它能解决你的钱的问题。";
  const reading = {sents:[{t:old, zh, oa:"audio/t06o/s16.mp3", seg:[[0,25,0,6.23]]}]};
  const fixed = breathFix(moneyFix(reading));
  const sent = fixed.sents[0];
  assert.equal(sent.t.includes("money solves your money problems."), true);
  assert.equal(sent.t.includes("it solves"), false);
  assert.equal(sent.zh.includes("钱能解决你的钱的问题"), true);
  assert.equal(sent.zh.includes("它能解决"), false);
  assert.equal(sent.t.split(/\s+/)[21], "money");
  assert.equal(sent.seg[2][0], 18);
  assert.equal(sent.seg[2][1], 25);
  // Stored text that still says "it" still finds the same slices.
  const viaOld = breathFix({sents:[{t:old, oa:"audio/t06o/s16.mp3", seg:[[0,25,0,6]]}]});
  assert.equal(viaOld.sents[0].seg[2][0], 18);
}

{
  const ft = "x".repeat(310) + "it solves your money problems.";
  const card = {src:{
    t:"and you set out to do something and you were right, so I’ll bet that lingers, and then as I said, it solves your money problems.",
    ft,
    zh:"再加上我说过的，它能解决你的钱的问题。",
    hl:[8,18],
    fhl:[220,230],
    sg:[[299,340,"audio/t06o/s16.mp3",4.6,6.23],[0,42,"audio/t06o/s14.mp3",0,1.53]]
  }};
  moneyFix(card);
  assert.equal(card.src.t.endsWith("money solves your money problems."), true);
  assert.equal(card.src.t.includes("it solves"), false);
  assert.equal(card.src.ft.slice(310, 315), "money");
  assert.equal(card.src.ft.length, 343);
  assert.deepEqual(card.src.hl, [8,18]);
  assert.deepEqual(card.src.fhl, [220,230]);
  assert.equal(card.src.sg[0][0], 299);
  assert.equal(card.src.sg[0][1], 343);
  assert.deepEqual(card.src.sg[1], [0,42,"audio/t06o/s14.mp3",0,1.53]);
  assert.equal(card.src.zh.includes("钱能解决你的钱的问题"), true);
  const again = JSON.parse(JSON.stringify(card));
  moneyFix(again);
  assert.equal(JSON.stringify(again), JSON.stringify(card));
}

{
  const chunk = {items:[{s:"as I said, it solves your money problems.", hl:[4,11], sg:[[87,128,"audio/t06o/s16.mp3",4.6,6.23]]}]};
  // "it" sits at the same place as the real chunk sentence (index 98) only if the
  // prefix matches. Use the real prefix length.
  chunk.items[0].s = "and you set out to do something and you were right, so I’ll bet that lingers, and then as I said, it solves your money problems.";
  assert.equal(chunk.items[0].s.indexOf("it solves"), 98);
  moneyFix(chunk);
  assert.equal(chunk.items[0].s.indexOf("money solves"), 98);
  assert.equal(chunk.items[0].sg[0][0], 87);
  assert.equal(chunk.items[0].sg[0][1], 131);
  assert.deepEqual(chunk.items[0].hl, [4,11]);
}

assert.equal(moneyFix({t:"it solves nothing else"}).t, "it solves nothing else");
assert.equal(moneyFix(null), null);

// Every listed sentence's slices cover its words in order. Keys are the normalized card text.
const listed = src.slice(src.indexOf("const FIX={"), src.indexOf("};", src.indexOf("const FIX={")));
const keys = [...listed.matchAll(/"([^"]+)":/g)].map(m => m[1]);
assert.ok(keys.length >= 30);
for (const k of keys) assert.equal(norm(k), k);
