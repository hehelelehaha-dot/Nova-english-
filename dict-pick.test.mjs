// Topic-list sentence picking vs the read-only 今天的目标 page.
// PR73 removed the only select / × / direct-open controls from #/dq and did not
// put a select entry on #/c/dictation. These tests click the topic-list UI.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const root = new URL(".", import.meta.url);
const app = readFileSync(new URL("./app.js", root), "utf8");

const uiStart = app.indexOf("// DQ_PICK_UI_START");
const uiEnd = app.indexOf("// DQ_PICK_UI_END");
assert.ok(uiStart > 0 && uiEnd > uiStart, "pick UI block missing");
const ui = app.slice(uiStart, uiEnd);
const logic = app.slice(app.indexOf("// DQ_LOGIC_START"), app.indexOf("// DQ_LOGIC_END"));
const pickFn = app.slice(app.indexOf("function dqPick("), app.indexOf("async function showDQ"));
const findFn = app.slice(app.indexOf("function dqFind"), app.indexOf("function dqFoldOn"));
const nowFn = app.slice(app.indexOf("function dqPaintNow"), app.indexOf("function dqPick"));
const showAt = app.indexOf("async function showDQ");
const showDQ = app.slice(showAt, app.indexOf('document.addEventListener("click"', showAt));
const showLuca = app.slice(app.indexOf("function showLuca"), app.indexOf("async function showCat"));
const showCat = app.slice(app.indexOf("async function showCat"), app.indexOf("const ZOOMS"));
const route = app.slice(app.indexOf("async function route0"), app.indexOf("window.addEventListener(\"hashchange\",route)"));

assert.equal([...app.matchAll(/(?<!function )showDQ\(/g)].length, 2, "showDQ only from the router and the 02:00 refresh");
assert.match(route, /h\[1\]=="dq"\)return showDQ\(\)/);
assert.equal(showCat.includes("showDQ("), false);
assert.equal(showLuca.includes("showDQ("), false);
assert.equal(showDQ.includes("dqMountList"), false);
assert.equal(showDQ.includes("dictPickShell"), false);
assert.equal(showDQ.includes("data-dqk"), false);
assert.equal(showDQ.includes("dqstart"), false);
assert.equal(showDQ.includes("nova_dt_go"), false);
assert.equal(showDQ.includes("#/i/"), false);
assert.equal(showDQ.includes("onclick"), false);
assert.equal(showDQ.includes("addEventListener"), false);
assert.equal(showDQ.includes("<button"), false);
assert.equal(showDQ.includes("dayx"), false);
assert.equal(showDQ.includes("data-open"), false);
assert.equal(showDQ.includes("data-day-x"), false);
assert.match(showDQ, /<div class="dayb"/);
assert.match(showDQ, /不能在这里改，也不能从这里听写/);
const dayGo = app.slice(app.indexOf('document.addEventListener("click"', showAt), app.indexOf("// ---------- study timer"));
assert.match(dayGo, /data-day-go/);
assert.equal(dayGo.includes("dayb"), false);
assert.equal(dayGo.includes("data-dqk"), false);
assert.equal(dayGo.includes("nova_dt_go"), false);

assert.match(showCat, /dictPickShell\(x\.id\)/);
assert.match(showCat, /dqGuideHTML\(\)/);
assert.match(showCat, /if\(id=="dictation"\)dqMountList\(\+\+DQLIST\)/);
assert.match(showLuca, /dict\?dictPickShell\(x\.id\):""/);
assert.match(showLuca, /dqGuideHTML\(\)/);
assert.match(showLuca, /dqMountList\(\+\+DQLIST\)/);
assert.equal(showCat.includes('querySelectorAll("[data-k]")'), false);
assert.equal(showLuca.includes('querySelectorAll("[data-k]")'), false);

const navalBind = showCat.match(/V\.querySelectorAll\("\.li\[data-k\]"\)\.forEach\(b=>\{const x=xs\[\+b\.dataset\.k\];b\.onclick=\(\)=>\{if\(tapOK\(\)\)location\.hash=\(x\.kind=="m"\?"#\/m\/":"#\/i\/"\)\+x\.id\}\}\)/);
const lucaBind = showLuca.match(/V\.querySelectorAll\("\.li\[data-k\]"\)\.forEach\(b=>\{const x=xs\[\+b\.dataset\.k\];b\.onclick=\(\)=>\{if\(tapOK\(\)\)location\.hash="#\/i\/"\+x\.id\}\}\)/);
assert.ok(navalBind, "naval topic rows must still open the item");
assert.ok(lucaBind, "夏日 topic rows must still open the item");

function esc(s){return String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

class ClassList {
  constructor(el){this.el = el; this.set = new Set();}
  _set(v){this.set = new Set(String(v || "").split(/\s+/).filter(Boolean));}
  contains(c){return this.set.has(c);}
  toggle(c, force){
    const next = force === undefined ? !this.set.has(c) : !!force;
    if (next) this.set.add(c); else this.set.delete(c);
    return next;
  }
}
class El {
  constructor(tag){this.tag = tag; this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.classList = new ClassList(this); this.id = ""; this._open = false; this.onclick = null; this.text = "";}
  setAttribute(k, v){
    this.attrs[k] = String(v);
    if (k === "id") this.id = String(v);
    if (k === "class") this.classList._set(v);
  }
  getAttribute(k){return Object.prototype.hasOwnProperty.call(this.attrs, k) ? this.attrs[k] : null;}
  get dataset(){
    const o = {};
    for (const k in this.attrs) if (k.startsWith("data-")) {
      const name = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      o[name] = this.attrs[k];
    }
    return o;
  }
  addText(t){if (!t) return; const n = new El("#text"); n.text = t; this.children.push(n);}
  get textContent(){return this.tag === "#text" ? this.text : this.text + this.children.map(c => c.textContent).join("");}
  set textContent(v){this.text = String(v); this.children = [];}
  get open(){return this._open;}
  set open(v){this._open = !!v;}
  scrollIntoView(){}
  getBoundingClientRect(){return {top: 0};}
  querySelector(sel){return this.querySelectorAll(sel)[0] || null;}
  querySelectorAll(sel){
    const out = [];
    const walk = n => { for (const c of n.children) { if (c.tag === "#text") continue; if (matches(c, sel)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
}
function matches(el, sel){
  let rest = sel;
  const tag = rest.match(/^[a-z]+/);
  if (tag) { if (el.tag !== tag[0]) return false; rest = rest.slice(tag[0].length); }
  if (!rest) return !!tag;
  while (rest) {
    if (rest[0] === ".") {
      const m = rest.match(/^\.([a-zA-Z0-9_-]+)/);
      if (!m || !el.classList.contains(m[1])) return false;
      rest = rest.slice(m[0].length);
    } else if (rest[0] === "[") {
      const m = rest.match(/^\[([a-zA-Z0-9_-]+)\]/);
      if (!m) return false;
      const attr = m[1];
      if (attr.startsWith("data-")) {
        const name = attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (el.dataset[name] == null || el.dataset[name] === "") return false;
      } else if (el.attrs[attr] == null) return false;
      rest = rest.slice(m[0].length);
    } else return false;
  }
  return true;
}
function parseHTML(html){
  const root = new El("root");
  const stack = [root];
  const re = /<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m;
  while ((m = re.exec(html))) {
    const top = stack[stack.length - 1];
    if (m[5]) { top.addText(m[5]); continue; }
    if (m[1]) {
      const name = m[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) if (stack[i].tag === name) { stack.length = i; break; }
      continue;
    }
    const el = new El(m[2].toLowerCase());
    const attrRe = /([:@a-zA-Z_][\w:.-]*)(?:\s*=\s*"([^"]*)")?/g;
    let a;
    while ((a = attrRe.exec(m[3] || ""))) el.setAttribute(a[1], a[2] == null ? "" : a[2]);
    top.children.push(el);
    if (m[4] !== "/") stack.push(el);
  }
  return root.children;
}
function armTree(el){
  if (!el || el.tag === "#text") return;
  Object.defineProperty(el, "innerHTML", {
    configurable: true,
    get(){ return el._html || ""; },
    set(v){
      el._html = String(v);
      el.children = parseHTML(v);
      for (const c of el.children) armTree(c);
    }
  });
  for (const c of el.children) armTree(c);
}
function mountDocument(html){
  const page = new El("div");
  page.children = parseHTML(html);
  armTree(page);
  const walk = (el, fn) => { for (const c of el.children) { if (c.tag === "#text") continue; fn(c); walk(c, fn); } };
  const document = {
    getElementById(id){ let hit = null; walk(page, el => { if (!hit && (el.id === id || el.attrs.id === id)) hit = el; }); return hit; },
    querySelector(sel){ return document.querySelectorAll(sel)[0] || null; },
    querySelectorAll(sel){ const out = []; walk(page, el => { if (matches(el, sel)) out.push(el); }); return out; }
  };
  return {page, document};
}
function click(el){ if (typeof el.onclick === "function") el.onclick({preventDefault(){}, stopPropagation(){}, target: el}); }

const topics = [
  {fold: "Naval", id: "dt_naval_t03", title: "Topic 3", base: "naval_t03", sent: [0, 1, 2, 4, 7, 9]},
  {fold: "Naval", id: "dt_empty", title: "Empty", base: "naval_empty", sent: []}
];

function boot(hash){
  const box = mountDocument("");
  const location = { _h: hash, get hash(){ return this._h; }, set hash(v){ this._h = v; } };
  const mem = {};
  const sandbox = {
    esc,
    sunHas(base, i){ return i === 0; },
    state: {day: "2026-11-06", sel: [], done: [], extra: 0, star: 0},
    saves: [],
    toasts: [],
    paints: 0,
    topics,
    dqLoad(){ return sandbox.state; },
    dqSave(st){ sandbox.state = st; sandbox.saves.push(JSON.parse(JSON.stringify(st))); },
    dqPaint(){ sandbox.paints++; },
    dqHoldTap(el, fn){ fn(); },
    toast(t){ sandbox.toasts.push(String(t)); },
    dqTopics: async () => sandbox.topics,
    document: box.document,
    location,
    sessionStorage: { getItem(k){ return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; }, setItem(k, v){ mem[k] = String(v); } },
    mem
  };
  sandbox.page = box.page;
  const src = logic + "\nconst DQ_FLOOR=5;\n" + pickFn + "\n" + findFn + "\n" + ui + `
this.dqMountList=dqMountList;
this.bump=()=>++DQLIST;
this.dictPickShell=dictPickShell;
this.dqGuideHTML=dqGuideHTML;
this.dqSelectCells=dqSelectCells;
this.dqApplyPick=dqApplyPick;
this.dqBeginPlan=dqBeginPlan;
this.dqGoSelected=dqGoSelected;
this.dqGuideText=dqGuideText;
`;
  runInContext(src, createContext(sandbox));
  return sandbox;
}

{
  const g = boot("#/dq");
  const shell = g.dictPickShell("dt_naval_t03") + g.dqGuideHTML();
  g.page.innerHTML = shell;
  await g.dqMountList(g.bump());
  assert.equal(g.document.querySelectorAll("button.dayb").length, 0, "#/dq must not gain select buttons");
  assert.equal(g.document.getElementById("dqstart").onclick, null);
  assert.equal(g.saves.length, 0);
  g.location.hash = "#/c/dictation";
  await g.dqMountList(g.bump());
  assert.equal(g.document.querySelectorAll("button.dayb[data-dqk]").length, 6);
}

{
  const g = boot("#/c/dictation");
  const row = `<div class="lw"><button class="li" data-k="0" data-tid="dt_naval_t03"><span class="tt">Topic 3<span class="sb">Naval</span></span></button></div>`
    + `<div class="lw"><button class="li" data-k="1" data-tid="mine1"><span class="tt">Mine</span></button></div>`
    + g.dictPickShell("dt_naval_t03") + g.dictPickShell("dt_empty") + g.dqGuideHTML();
  assert.match(row, /<\/div><details class="dqp"/, "选句 sits under the topic row");
  g.page.innerHTML = row;
  assert.match(g.document.getElementById("dqneed").textContent, /还差 5 句/);
  assert.equal(g.document.querySelectorAll(".li[data-k]").length, 2);
  assert.equal(g.document.querySelector("details.dqp").querySelector(".dqpn").textContent, "选句");

  const nav = {
    V: g.document,
    xs: [{id: "dt_naval_t03"}, {id: "mine1", kind: "m"}],
    tapOK: () => true,
    location: g.location
  };
  runInContext(navalBind[0], createContext(nav));
  const lis = g.document.querySelectorAll(".li[data-k]");
  click(lis[0]);
  assert.equal(g.location.hash, "#/i/dt_naval_t03");
  g.location.hash = "#/c/dictation";
  click(lis[1]);
  assert.equal(g.location.hash, "#/m/mine1");
  g.location.hash = "#/c/dictation";
  runInContext(lucaBind[0], createContext(nav));
  click(lis[0]);
  assert.equal(g.location.hash, "#/i/dt_naval_t03");
  g.location.hash = "#/c/dictation";

  await g.dqMountList(g.bump());
  const cells = g.document.querySelectorAll("button.dayb[data-dqk]");
  assert.equal(cells.length, 6);
  assert.equal(cells[0].getAttribute("data-dqk"), "dt_naval_t03:0");
  assert.match(cells[0].textContent, /☀/);
  const empty = g.document.querySelectorAll(".daygrid[data-dqg]").find(el => el.dataset.dqg === "dt_empty");
  assert.match(empty.textContent, /还没有可听写的句子/);
  assert.equal(cells[0].onclick !== lis[0].onclick, true);

  click(cells[0]);
  assert.equal(g.location.hash, "#/c/dictation", "选句 must not navigate away");
  assert.deepEqual(g.state.sel, ["dt_naval_t03:0"]);
  assert.equal(cells[0].classList.contains("on"), true);
  assert.equal(cells[0].getAttribute("aria-pressed"), "true");
  assert.match(g.document.getElementById("dqneed").textContent, /还差 4 句/);
  assert.match(g.document.querySelector("details.dqp").querySelector(".dqpn").textContent, /已选 1/);
  const before = g.saves.length;
  click(cells[0]);
  assert.equal(g.saves.length, before, "a pinned sentence cannot be removed");
  assert.equal(g.toasts.at(-1).includes("已经选定"), true);
  assert.deepEqual(g.state.sel, ["dt_naval_t03:0"]);

  click(g.document.getElementById("dqstart"));
  assert.equal(g.location.hash, "#/c/dictation");
  assert.match(g.toasts.at(-1), /还差 4 句/);
  assert.equal(g.document.querySelector("details.dqp").open, true);
  assert.equal(g.mem.nova_dt_go, undefined);

  for (const b of cells.slice(1, 5)) click(b);
  assert.equal(g.state.sel.length, 5);
  assert.match(g.document.getElementById("dqneed").textContent, /今天的 5 句已选定/);
  assert.match(g.dqGuideText(8), /已选定/);
  assert.equal(g.dqGuideText(8).includes("还差"), false);
  const sixth = cells[5];
  click(sixth);
  assert.equal(sixth.classList.contains("on"), false);
  assert.equal(g.state.sel.includes("dt_naval_t03:9"), false);
  assert.match(g.toasts.at(-1), /已经 5 句/);

  g.state.done.push(g.state.sel[0]);
  g.toasts.length = 0;
  click(g.document.getElementById("dqstart"));
  assert.equal(g.location.hash, "#/i/dt_naval_t03");
  assert.equal(g.mem.nova_dt_go, "1");
  assert.equal(g.toasts.length, 0);
}

{
  const goalTopics = [{id: "dt_naval_t03", title: "Topic 3", sent: [0, 1, 2, 4, 7]}];
  const keys = goalTopics[0].sent.map(i => "dt_naval_t03:" + i);
  const cells = keys.map((k, n) => `<div class="dayb" data-k="${k}" data-lab="第 ${n + 1} 句">${n + 1}</div>`).join("");
  const box = mountDocument(`<div id="daynow"></div><div id="daybody"><div class="daygrid">${cells}</div></div>`);
  const state = {day: "2026-11-06", sel: keys.slice(), done: keys.slice(0, 2), extra: 0, star: 0};
  const saves = [];
  const sandbox = {
    esc,
    DQ_FLOOR: 5,
    document: box.document,
    dqLoad(){ return state; },
    dqSave(st){ saves.push(st); }
  };
  runInContext(logic + "\n" + findFn + "\n" + nowFn + "\nthis.dqPaintNow=dqPaintNow;", createContext(sandbox));
  sandbox.dqPaintNow(goalTopics);
  const dayb = box.document.querySelectorAll(".dayb");
  assert.equal(dayb.length, 5);
  assert.equal(dayb.every(b => b.tag === "div" && b.onclick == null), true);
  assert.equal(dayb.filter(b => b.classList.contains("on")).length, 5);
  assert.equal(dayb.filter(b => b.classList.contains("did")).length, 2);
  for (const b of dayb) click(b);
  assert.equal(saves.length, 0, "read-only sentence cells do not change the day");
  const html = box.document.getElementById("daynow").innerHTML;
  assert.match(html, /已选 5 句/);
  assert.match(html, /写对 2/);
  assert.match(html, /Topic 3 · 第 1 句/);
  assert.equal(html.includes("<button"), false);
  assert.equal(html.includes("dayx"), false);
  assert.equal(html.includes("data-open"), false);
  assert.equal(html.includes("data-dqk"), false);
  assert.equal(html.includes("取消"), false);
}

console.log("dict-pick.test.mjs ok");
