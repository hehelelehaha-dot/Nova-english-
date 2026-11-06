// #/dq picks five sentences and starts dictation. Topic lists do not.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const root = new URL(".", import.meta.url);
const app = readFileSync(new URL("./app.js", root), "utf8");
const css = readFileSync(new URL("./style.css", root), "utf8");

const logic = app.slice(app.indexOf("// DQ_LOGIC_START"), app.indexOf("// DQ_LOGIC_END"));
const pageFns = app.slice(app.indexOf("function dqFind"), app.indexOf("async function showDQ"));
const showAt = app.indexOf("async function showDQ");
const showDQ = app.slice(showAt, app.indexOf('document.addEventListener("click"', showAt));
const showLuca = app.slice(app.indexOf("function showLuca"), app.indexOf("async function showCat"));
const showCat = app.slice(app.indexOf("async function showCat"), app.indexOf("const ZOOMS"));
const viewDt = app.slice(app.indexOf("function viewDictation"), app.indexOf("// ---------- daily"));

assert.equal(app.includes("dictPickShell"), false);
assert.equal(app.includes("dqGuideHTML"), false);
assert.equal(app.includes("data-dqk"), false);
assert.equal(app.includes("不能在这里"), false);
assert.equal(app.includes("DQ_PICK_UI"), false);
assert.equal(css.includes(".dqp{"), false);
assert.match(css, /button\.daybar\.fp\{width:70\.7%/);
assert.match(css, /button\.dayb\{cursor:pointer\}/);
assert.match(css, /\.dayb\{[^}]*background:#fffefa/);

assert.match(showDQ, /dqPageShell\(\)/);
assert.match(showDQ, /dqBodyHTML\(topics\)/);
assert.match(showDQ, /dqWirePage\(topics\)/);
assert.match(showDQ, /dqHTML\(\{go:false\}\)/);
assert.equal(showDQ.includes("dictPickShell"), false);
assert.equal(showDQ.includes("不能在这里"), false);

assert.match(showCat, /id=="dictation"\?dqHTML\(\):""/);
assert.match(showCat, /if\(id=="dictation"\)dqGoalMount\(\)/);
assert.match(showCat, /querySelectorAll\("\[data-k\]"\)/);
assert.equal(showCat.includes("dqGuideHTML"), false);
assert.equal(showCat.includes("dictPickShell"), false);
assert.equal(showCat.includes("dqMountList"), false);
assert.equal(showCat.includes("dqstart"), false);
assert.equal(showCat.includes("daygrid"), false);
assert.equal(showCat.includes("data-dqk"), false);
assert.equal(showCat.includes("开始今天的听写"), false);
assert.equal(showCat.includes("nova_dt_go"), false);
assert.equal(showCat.includes("dqGoSelected"), false);

assert.match(showLuca, /s\.like=="dictation"\?dqHTML\(\):""/);
assert.match(showLuca, /s\.like=="dictation"\)dqGoalMount\(\)/);
assert.match(showLuca, /querySelectorAll\("\[data-k\]"\)/);
assert.equal(showLuca.includes("dqGuideHTML"), false);
assert.equal(showLuca.includes("dictPickShell"), false);
assert.equal(showLuca.includes("dqMountList"), false);
assert.equal(showLuca.includes("dqstart"), false);
assert.equal(showLuca.includes("daygrid"), false);
assert.equal(showLuca.includes("data-dqk"), false);
assert.equal(showLuca.includes("开始今天的听写"), false);
assert.equal(showLuca.includes("nova_dt_go"), false);
assert.equal(showLuca.includes("dqp"), false);

assert.match(viewDt, /sessionStorage\.getItem\("nova_dt_go"\)/);
assert.match(viewDt, /sents\.findIndex\(x=>x\.i===\+jump\)/);
assert.match(viewDt, /else showPick\(\)/);

const navalBind = showCat.match(/V\.querySelectorAll\("\[data-k\]"\)\.forEach\(b=>\{const x=xs\[\+b\.dataset\.k\];b\.onclick=\(\)=>\{if\(tapOK\(\)\)location\.hash=\(x\.kind=="m"\?"#\/m\/":"#\/i\/"\)\+x\.id\}\}\)/);
const lucaBind = showLuca.match(/V\.querySelectorAll\("\[data-k\]"\)\.forEach\(b=>\{const x=xs\[\+b\.dataset\.k\];b\.onclick=\(\)=>\{if\(tapOK\(\)\)location\.hash="#\/i\/"\+x\.id\}\}\)/);
assert.ok(navalBind, "topic rows still open the item");
assert.ok(lucaBind, "夏日 rows still open the item");

function esc(s){return String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));}

class ClassList {
  constructor(){this.set = new Set();}
  _set(v){this.set = new Set(String(v || "").split(/\s+/).filter(Boolean));}
  contains(c){return this.set.has(c);}
  toggle(c, force){
    const next = force === undefined ? !this.set.has(c) : !!force;
    if (next) this.set.add(c); else this.set.delete(c);
    return next;
  }
}
class El {
  constructor(tag){this.tag = tag; this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this.classList = new ClassList(); this.id = ""; this.onclick = null; this.text = "";}
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
function click(el){ if (el && typeof el.onclick === "function") el.onclick({preventDefault(){}, stopPropagation(){}, target: el}); }

const topics = [
  {fold: "Naval", id: "dt_a", title: "Topic A", base: "a", sent: [0, 1, 2, 3]},
  {fold: "夏日友晴天", id: "dt_b", title: "Day B", base: "b", sent: [0, 5]}
];

function boot(){
  const box = mountDocument("");
  const location = { _h: "#/dq", get hash(){ return this._h; }, set hash(v){ this._h = v; } };
  const mem = {};
  const sandbox = {
    esc,
    sunHas(base, i){ return base === "a" && i === 0; },
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
    document: box.document,
    location,
    sessionStorage: {
      getItem(k){ return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      setItem(k, v){ mem[k] = String(v); },
      removeItem(k){ delete mem[k]; }
    },
    mem
  };
  sandbox.page = box.page;
  runInContext(logic + "\nconst DQ_FLOOR=5;\n" + pageFns + `
this.dqWirePage=dqWirePage;
this.dqPageShell=dqPageShell;
this.dqBodyHTML=dqBodyHTML;
this.dqBeginPlan=dqBeginPlan;
this.dqGoSelected=dqGoSelected;
this.dqNeedText=dqNeedText;
this.dqPick=dqPick;
`, createContext(sandbox));
  return sandbox;
}

{
  const g = boot();
  const body = g.dqBodyHTML(g.topics);
  assert.match(body, /data-dqf="dt_a" open/, "first topic grid starts open");
  assert.equal(body.includes('data-dqf="dt_b" open'), false);
  assert.match(body, /<button type="button" class="dayb"/);
  assert.equal(body.includes("×"), false);
  assert.equal(body.includes("dayx"), false);
  g.page.innerHTML = g.dqPageShell();
  g.document.getElementById("daybody").innerHTML = body;
  g.dqWirePage(g.topics);

  assert.deepEqual(g.state.sel, []);
  assert.match(g.document.getElementById("daynow").textContent, /已选 0 句/);
  assert.match(g.document.getElementById("dqneed").textContent, /还差 5 句/);
  assert.equal(g.document.querySelectorAll(".dayx").length, 0);
  assert.equal(g.document.querySelectorAll("[data-day-x]").length, 0);
  assert.equal(g.page.textContent.includes("×"), false);
  assert.equal(g.page.textContent.includes("不能在这里"), false);
  const cells = g.document.querySelectorAll("button.dayb");
  assert.equal(cells.length, 6);
  assert.match(cells[0].textContent, /☀/);
  assert.equal(cells[0].getAttribute("data-k"), "dt_a:0");

  click(g.document.getElementById("dqstart"));
  assert.equal(g.location.hash, "#/dq", "fewer than five does not leave the page");
  assert.match(g.toasts.at(-1), /还差 5 句/);
  assert.equal(g.mem.nova_dt_go, undefined);
  assert.equal(g.saves.length, 0);

  const pick = ["dt_a:0", "dt_a:1", "dt_a:2", "dt_b:0", "dt_b:5"];
  pick.forEach((key, n) => {
    click(cells.find(b => b.dataset.k === key));
    assert.deepEqual(g.state.sel, pick.slice(0, n + 1));
    assert.equal(g.location.hash, "#/dq", "picking a sentence does not open a topic");
    if (n < 4) assert.match(g.document.getElementById("dqneed").textContent, new RegExp("还差 " + (4 - n) + " 句"));
  });
  assert.match(g.document.getElementById("dqneed").textContent, /今天的 5 句已选定/);
  assert.match(g.document.getElementById("dqneed").textContent, /凌晨 2 点/);
  assert.equal(g.document.getElementById("dqneed").textContent.includes("还差"), false);
  assert.equal(cells.filter(b => b.classList.contains("on")).length, 5);
  assert.equal(cells.find(b => b.dataset.k === "dt_a:0").getAttribute("aria-pressed"), "true");

  const locked = g.saves.length;
  click(cells.find(b => b.dataset.k === "dt_a:0"));
  assert.equal(g.saves.length, locked, "a chosen sentence stays chosen");
  assert.deepEqual(g.state.sel, pick);
  assert.match(g.toasts.at(-1), /已经选定/);
  assert.match(g.toasts.at(-1), /凌晨 2 点/);
  assert.equal(g.location.hash, "#/dq");

  const sixth = cells.find(b => b.dataset.k === "dt_a:3");
  click(sixth);
  assert.equal(sixth.classList.contains("on"), false);
  assert.equal(sixth.classList.contains("cap"), true);
  assert.equal(g.state.sel.includes("dt_a:3"), false);
  assert.match(g.toasts.at(-1), /已经 5 句/);
  const now = g.document.getElementById("daynow").innerHTML;
  assert.match(now, /已选 5 句/);
  assert.match(now, /Topic A · 第 1 句/);
  assert.match(now, /Day B · 第 2 句/);
  assert.equal(now.includes("<button"), false);
  assert.equal(now.includes("×"), false);
  assert.equal(now.includes("dayx"), false);
  assert.equal(now.includes("data-open"), false);
  assert.equal(g.document.querySelectorAll(".dayx").length, 0);

  g.state.done.push("dt_a:0", "dt_a:1", "dt_a:2");
  click(g.document.getElementById("dqstart"));
  assert.equal(g.location.hash, "#/i/dt_b", "start opens the first unfinished selected sentence");
  assert.equal(g.mem.nova_dt_go, "0");
  assert.equal(g.toasts.length > 0 && g.toasts.at(-1).includes("还差"), false);

  g.location.hash = "#/dq";
  delete g.mem.nova_dt_go;
  g.state.done = g.state.sel.slice();
  click(g.document.getElementById("dqstart"));
  assert.equal(g.location.hash, "#/i/dt_a");
  assert.equal(g.mem.nova_dt_go, "0");

  g.location.hash = "#/dq";
  delete g.mem.nova_dt_go;
  g.state = {day: "2026-11-06", sel: ["missing:1", "missing:2", "missing:3", "missing:4", "missing:5"], done: [], extra: 0, star: 0};
  click(g.document.getElementById("dqstart"));
  assert.equal(g.location.hash, "#/dq", "a sentence that cannot be opened does not fall into a topic");
  assert.equal(g.mem.nova_dt_go, undefined);
  assert.match(g.toasts.at(-1), /暂时打不开/);

  g.localStorage = {
    length: 1,
    key(){ return "nova_dqf_dt_b"; },
    getItem(k){ return k === "nova_dqf_dt_b" ? "1" : null; }
  };
  const kept = g.dqBodyHTML(g.topics);
  assert.equal(kept.includes('data-dqf="dt_a" open'), false);
  assert.match(kept, /data-dqf="dt_b" open/);
}

{
  const box = mountDocument(`<button class="daybar fp" type="button" data-day-go>今天的目标</button><div class="list"><div class="lw"><button class="li" data-k="0" data-tid="dt_a"><span class="tt">Topic A<span class="sb">Naval</span></span></button></div><div class="lw"><button class="li" data-k="1" data-tid="mine1"><span class="tt">Mine</span></button></div></div>`);
  const location = { _h: "#/c/dictation", get hash(){ return this._h; }, set hash(v){ this._h = v; } };
  const mem = {};
  assert.equal(box.document.querySelector(".daygrid"), null, "topic list has no sentence grid");
  assert.equal(box.document.querySelector("details.dqp"), null);
  assert.equal(box.document.querySelector("button.dayb"), null);
  assert.equal(box.document.getElementById("dqstart"), null, "topic list has no start button");
  assert.equal(box.page.textContent.includes("开始今天的听写"), false);
  assert.equal(box.page.textContent.includes("还差"), false);
  assert.equal(mem.nova_dt_go, undefined);
  assert.equal(location.hash, "#/c/dictation");

  const nav = { V: box.document, xs: [{id: "dt_a"}, {id: "mine1", kind: "m"}], tapOK: () => true, location };
  runInContext(navalBind[0], createContext(nav));
  const lis = box.document.querySelectorAll(".li[data-k]");
  click(lis[0]);
  assert.equal(location.hash, "#/i/dt_a");
  assert.equal(mem.nova_dt_go, undefined, "opening a topic row is not today's dictation jump");
  location.hash = "#/c/dictation";
  click(lis[1]);
  assert.equal(location.hash, "#/m/mine1");
  location.hash = "#/c/luca_dictation";
  runInContext(lucaBind[0], createContext(nav));
  click(lis[0]);
  assert.equal(location.hash, "#/i/dt_a");
  assert.equal(mem.nova_dt_go, undefined);
  assert.equal(box.document.getElementById("dqstart"), null);
  assert.equal(box.document.querySelector(".daygrid"), null);
}

console.log("dict-pick.test.mjs ok");
