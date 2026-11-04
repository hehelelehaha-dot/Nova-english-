import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const src = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = src.indexOf("function rostIPA");
const end = src.indexOf("function holdScroll");
assert.ok(start > 0 && end > start);
const flip = src.slice(src.indexOf("function holdScroll"), src.indexOf("function unitRoster"));
assert.equal(flip.includes("scrollIntoView"), false);
assert.equal(flip.includes("minHeight"), false);
assert.equal(flip.includes(".cur"), false);

const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const ctx = {esc, EXP: null, expKey: () => null};
runInContext(src.slice(start, end) + "\nthis.rostIPA=rostIPA;this.rostChunks=rostChunks;this.rostExt=rostExt;this.rostCardHTML=rostCardHTML;", createContext(ctx));

const card = {
  w: "not only", pos: "phrase", zh: "不只是",
  ex: "Not only means not just this one thing.",
  exs: ["She's not only my friend."],
  a: ["audio/t06v/c00_0.mp3"],
  lg: ["➕", "不止这一个，后面还有更大的。"],
  chunks: [["not only … but also", "不只是…而且"]]
};

{
  ctx.EXP = null;
  const html = ctx.rostCardHTML(card, 0);
  assert.match(html, /not only/);
  assert.match(html, /不只是/);
  assert.match(html, />发音</);
  assert.match(html, />扩展</);
  assert.match(html, /底层逻辑/);
  assert.match(html, /不止这一个/);
  assert.match(html, /例句/);
  assert.match(html, /She's not only my friend/);
  assert.match(html, /搭配/);
  assert.match(html, /not only … but also/);
  assert.equal(html.includes("ipa"), false);
  assert.doesNotMatch(html, /\/[a-zˈˌəʊɑːɪɛɔʌæ. ]+\//i);
}

{
  ctx.EXP = {e: {"not only": {ipa: "/nɑːt ˈoʊnli/", img: "store logic", em: "💡"}}, a: {}};
  ctx.expKey = w => String(w).toLowerCase();
  const html = ctx.rostCardHTML(card, 0);
  assert.match(html, /\/nɑːt ˈoʊnli\//);
  assert.match(html, /不止这一个/);
  assert.equal(html.includes("store logic"), false);
}

{
  const bare = {w: "zzzzword", zh: "没有资料", a: ["audio/x.mp3"]};
  ctx.EXP = {e: {}, a: {}};
  ctx.expKey = () => null;
  const html = ctx.rostCardHTML(bare, 3);
  assert.match(html, />发音</);
  assert.equal(html.includes("扩展"), false);
  assert.equal((html.match(/class="ipa"/g) || []).length, 0);
  assert.equal(ctx.rostIPA(bare), "");
}

{
  const own = {w: "loop", zh: "循环", ipa: "/luːp/", phon: "/nope/"};
  ctx.EXP = {e: {loop: {ipa: "/from-store/"}}, a: {}};
  ctx.expKey = w => w;
  assert.equal(ctx.rostIPA(own), "/luːp/");
  assert.match(ctx.rostCardHTML(own, 1), /\/luːp\//);
  assert.equal(ctx.rostCardHTML(own, 1).includes("/from-store/"), false);
  assert.equal(ctx.rostCardHTML(own, 1).includes("/nope/"), false);
}

{
  const fromStore = {w: "reward", zh: "回报"};
  ctx.EXP = {e: {reward: {ipa: "/rɪˈwɔːrd/", em: "🎁", img: "付出之后拿到手的那份奖励。"}}, a: {}};
  ctx.expKey = w => w;
  const html = ctx.rostCardHTML(fromStore, 1);
  assert.match(html, /\/rɪˈwɔːrd\//);
  assert.match(html, /付出之后拿到手的那份奖励/);
}

{
  const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));
  same(ctx.rostChunks({bkc: [["bank it", "存起来"]]}), [["bank it", "存起来"]]);
  same(ctx.rostChunks({ck: [{c: "human nature", zh: "人性"}]}), [["human nature", "人性"]]);
  same(ctx.rostChunks({}), []);
}

console.log("roster-flip.test.mjs ok");
