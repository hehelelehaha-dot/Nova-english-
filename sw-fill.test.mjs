// One-tap offline cache: the service-worker fill protocol and the 设置 copy.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const root = new URL(".", import.meta.url);
const sw = readFileSync(new URL("./sw.js", root), "utf8");
const app = readFileSync(new URL("./app.js", root), "utf8");
const meta = JSON.parse(readFileSync(new URL("./meta.json", root), "utf8"));

const protoStart = sw.indexOf("// FILL_PROTOCOL_START");
const protoEnd = sw.indexOf("// FILL_PROTOCOL_END");
assert.ok(protoStart > 0 && protoEnd > protoStart, "fill protocol block missing from sw.js");
const protocol = sw.slice(protoStart, protoEnd);

assert.match(sw, new RegExp('const V="' + meta.v + '"'));
assert.equal(meta.cv, meta.v.slice(0, 8));
assert.match(meta.built, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
assert.match(meta.salt, /VDsYu07qwIo/);
assert.equal(/localStorage|sessionStorage|indexedDB|nova_time|nova_key|caches\.delete/.test(protocol), false);
assert.ok(sw.includes('"app.js"'));
assert.ok(sw.includes("content/naval_t01.json.enc"));
assert.ok(sw.includes("luca_d05"));
assert.ok(app.indexOf('id="cachebtn"') < app.indexOf('id="chk"'));
assert.match(app, /d\.state==="run"&&d\.step==="next"/);
assert.match(app, /caches\.delete\(k\)/);
const ui = app.slice(app.indexOf("// FILL_UI_START"), app.indexOf("async function checkUpdate"));
assert.equal(/localStorage|caches\.delete|nova_time|indexedDB/.test(ui), false);

function load({shell, media, fetch, onPut}){
  const messages = [];
  const fetches = [];
  const listeners = {};
  const client = {id:"page", postMessage(d){messages.push(structuredClone(d))}};
  const stores = new Map();
  const ctx = {
    SHELL_FILES: shell,
    MEDIA_FILES: media,
    SHELL: "nova-shell-x",
    MEDIA: "nova-media",
    V: "test",
    mk: f => f + "?h=abc",
    console,
    setTimeout, clearTimeout, AbortController,
    fetch: async (req) => {
      const url = String(req);
      fetches.push(url);
      return fetch(url, fetches);
    },
  };
  ctx.self = ctx;
  ctx.caches = {async open(name){
    if (!stores.has(name)) stores.set(name, new Map());
    const box = stores.get(name);
    return {
      async match(key){return box.get(String(key))},
      async put(key, val){if (onPut) onPut(String(key), val); box.set(String(key), val || {ok:true})},
      async keys(){return [...box.keys()].map(url => ({url}))},
    };
  }};
  ctx.clients = {async matchAll(){return [client]}};
  ctx.skipWaiting = () => {ctx.skipped = (ctx.skipped || 0) + 1};
  ctx.addEventListener = (type, fn) => {(listeners[type] ||= []).push(fn)};
  runInContext(protocol + "\nthis.__api={fillBatch,fillStat,fillEnqueue,FILL_BATCH};\n", createContext(ctx));
  return {ctx, messages, fetches, stores, client, listeners, api: ctx.__api};
}
const ok = () => ({ok:true, status:200, body:null});
function counts(list){const m = {}; for (const u of list) m[u] = (m[u] || 0) + 1; return m}
async function pump(env, retry = false){
  let guard = 0, last, use = retry;
  do {
    const before = env.messages.length;
    await env.api.fillBatch(use, env.client);
    use = false;
    assert.ok(env.messages.length > before, "batch posted no progress");
    last = env.messages.at(-1);
    assert.equal(last.t, "fill");
    assert.equal(last.op, "fill");
    guard++;
  } while (last.step === "next" && guard < 40);
  assert.ok(guard < 40, "fill did not finish");
  return last;
}

// Shell is cached first, in short batches, then every missing media file once.
{
  const shell = Array.from({length:20}, (_, i) => "s" + i + ".js");
  const media = ["content/audio/a.mp3", "content/audio/b.mp3"];
  const env = load({shell, media, fetch: () => ok()});
  await env.api.fillBatch(false, env.client);
  let last = env.messages.at(-1);
  assert.equal(last.phase, "shell");
  assert.equal(last.step, "next");
  assert.equal(last.state, "run");
  assert.deepEqual(env.fetches, shell.slice(0, 16));
  last = await pump(env);
  assert.equal(last.state, "done");
  assert.equal(last.have, 2);
  assert.equal(last.total, 2);
  assert.equal(last.fail, 0);
  const got = counts(env.fetches);
  for (const f of shell) assert.equal(got[f], 1, f);
  for (const f of media) assert.equal(got[f + "?h=abc"], 1, f);
  const mediaBox = env.stores.get("nova-media");
  const shellBox = env.stores.get("nova-shell-x");
  assert.equal(mediaBox.size, 2);
  assert.ok(mediaBox.has("content/audio/a.mp3?h=abc"));
  assert.equal(shellBox.size, 20);
  const again = env.fetches.length;
  const done = await pump(env);
  assert.equal(done.state, "done");
  assert.equal(env.fetches.length, again, "second tap re-downloaded");
}

// Files already in Cache Storage are not fetched again. A dropped worker resumes from the cache.
{
  const shell = ["app.js"];
  const media = Array.from({length:10}, (_, i) => "content/audio/m" + i + ".mp3");
  const env = load({shell, media, fetch: () => ok()});
  const box = await env.ctx.caches.open("nova-media");
  for (const f of media.slice(0, 4)) await box.put(f + "?h=abc", {ok:true});
  const last = await pump(env);
  assert.equal(last.state, "done");
  assert.equal(last.have, 10);
  const got = counts(env.fetches);
  assert.equal(got["app.js"], 1);
  for (let i = 0; i < 4; i++) assert.equal(got["content/audio/m" + i + ".mp3?h=abc"], undefined);
  for (let i = 4; i < 10; i++) assert.equal(got["content/audio/m" + i + ".mp3?h=abc"], 1);
}

// A network error pauses on the failed file; the next tap continues and does not redo finished files.
{
  const shell = ["app.js"];
  const media = Array.from({length:6}, (_, i) => "content/audio/m" + i + ".mp3");
  let boom = 2;
  const env = load({shell, media, fetch: (url) => {
    if (url.includes("m3") && boom > 0) {boom--; throw new TypeError("offline")}
    return ok();
  }});
  let last = await pump(env);
  assert.equal(last.state, "pause");
  assert.equal(last.reason, "offline");
  assert.equal(last.more, true);
  assert.equal(last.have, 3);
  const box = env.stores.get("nova-media");
  assert.equal(box.has("content/audio/m3.mp3?h=abc"), false);
  assert.equal(box.has("content/audio/m2.mp3?h=abc"), true);
  const mid = env.fetches.length;
  last = await pump(env);
  assert.equal(last.state, "done");
  assert.equal(last.have, 6);
  const got = counts(env.fetches.slice(mid));
  assert.equal(got["content/audio/m0.mp3?h=abc"], undefined);
  assert.equal(got["content/audio/m3.mp3?h=abc"], 1);
  assert.equal(got["app.js"], undefined);
}

// HTTP 404 is skipped and reported; retry:true fetches it again and then finishes. A 500 is retried once inside the file.
{
  const shell = ["app.js"];
  const media = ["content/audio/ok.mp3", "content/audio/flaky.mp3", "content/audio/gone.mp3"];
  let flakyLeft = 1, goneBad = true;
  const env = load({shell, media, fetch: (url) => {
    if (url.includes("flaky") && flakyLeft > 0) {flakyLeft--; return {ok:false, status:500, body:{cancel(){}}}}
    if (url.includes("gone") && goneBad) return {ok:false, status:404, body:{cancel(){}}}
    return ok();
  }});
  let last = await pump(env);
  assert.equal(last.state, "fail");
  assert.equal(last.have, 2);
  assert.equal(last.fail, 1);
  assert.equal(last.more, false);
  assert.equal(env.stores.get("nova-media").has("content/audio/gone.mp3?h=abc"), false);
  assert.equal(counts(env.fetches)["content/audio/flaky.mp3?h=abc"], 2);
  goneBad = false;
  const before = env.fetches.length;
  last = await pump(env, true);
  assert.equal(last.state, "done");
  assert.equal(last.have, 3);
  const again = counts(env.fetches.slice(before));
  assert.equal(again["content/audio/gone.mp3?h=abc"], 1);
  assert.equal(again["content/audio/ok.mp3?h=abc"], undefined);
}

// Opening 设置 counts without downloading, and a pause stays a pause.
{
  const shell = ["app.js"];
  const media = ["content/audio/a.mp3", "content/audio/b.mp3"];
  let down = true;
  const env = load({shell, media, fetch: () => {if (down) throw new TypeError("offline"); return ok()}});
  await env.api.fillStat(env.client);
  assert.equal(env.fetches.length, 0);
  assert.equal(env.messages.at(-1).op, "stat");
  assert.equal(env.messages.at(-1).have, 0);
  assert.equal(env.messages.at(-1).total, 2);
  assert.equal(env.messages.at(-1).state, "idle");
  const paused = await pump(env);
  assert.equal(paused.state, "pause");
  const n = env.fetches.length;
  await env.api.fillStat(env.client);
  assert.equal(env.fetches.length, n);
  assert.equal(env.messages.at(-1).state, "pause");
  assert.equal(env.messages.at(-1).reason, "offline");
}

// Two fill requests queued together share one walk (no duplicate downloads).
{
  const shell = ["app.js"];
  const media = Array.from({length:20}, (_, i) => "content/audio/m" + i + ".mp3");
  const env = load({shell, media, fetch: () => ok()});
  await Promise.all([
    env.api.fillEnqueue(() => env.api.fillBatch(false, env.client)),
    env.api.fillEnqueue(() => env.api.fillBatch(false, env.client)),
  ]);
  let guard = 0, last = env.messages.at(-1);
  while (last.step === "next" && guard++ < 10) {
    await env.api.fillBatch(false, env.client);
    last = env.messages.at(-1);
  }
  assert.equal(last.state, "done");
  assert.equal(last.have, 20);
  for (const [url, n] of Object.entries(counts(env.fetches))) assert.equal(n, 1, url);
}

// Quota stops the batch, keeps what was stored, and says why.
{
  const shell = ["app.js"];
  const media = ["content/audio/a.mp3", "content/audio/b.mp3", "content/audio/c.mp3"];
  const env = load({shell, media, fetch: () => ok(), onPut: (key) => {
    if (key.includes("b.mp3")) {const e = new Error("quota"); e.name = "QuotaExceededError"; throw e}
  }});
  const last = await pump(env);
  assert.equal(last.state, "fail");
  assert.equal(last.reason, "quota");
  assert.equal(last.more, false);
  assert.equal(env.stores.get("nova-media").has("content/audio/a.mp3?h=abc"), true);
  assert.equal(env.stores.get("nova-media").has("content/audio/b.mp3?h=abc"), false);
  assert.equal(env.stores.get("nova-media").has("content/audio/c.mp3?h=abc"), false);
}

// The message handler is what the page actually calls, and ver still answers.
{
  const env = load({shell:["app.js"], media:["content/audio/a.mp3"], fetch: () => ok()});
  let waited = null;
  const ev = {data:{t:"fill"}, source:env.client, waitUntil(p){waited = p}};
  for (const fn of env.listeners.message) fn(ev);
  await waited;
  assert.equal(env.messages.at(-1).state, "done");
  assert.equal(env.stores.get("nova-media").has("content/audio/a.mp3?h=abc"), true);
  env.messages.length = 0;
  for (const fn of env.listeners.message) fn({data:{t:"ver"}, source:env.client, waitUntil(){}});
  assert.equal(env.messages.at(-1).t, "ver");
  assert.equal(env.messages.at(-1).v, "test");
  assert.equal(env.messages.at(-1).media, 1);
  for (const fn of env.listeners.message) fn({data:{t:"skip"}, source:env.client, waitUntil(){}});
  assert.equal(env.ctx.skipped, 1);
}

const uiCtx = {};
runInContext(app.slice(app.indexOf("// FILL_UI_START"), app.indexOf("// FILL_UI_END")), createContext(uiCtx));
const {fillText} = uiCtx;
{
  const intro = fillText(null);
  assert.equal(intro.btn, "一键缓存 / 下载离线内容");
  assert.equal(intro.line, "…");
  assert.match(intro.msg, /Naval/);
  assert.match(intro.msg, /夏日友晴天/);
  assert.match(intro.msg, /时长不会动/);
  const idle = fillText({have:10, total:40, state:"idle"});
  assert.equal(idle.line, "10 / 40（25%）");
  assert.equal(idle.btn, "一键缓存 / 下载离线内容");
  assert.equal(idle.busy, false);
  const run = fillText({have:10, total:40, state:"run", phase:"media"});
  assert.equal(run.busy, true);
  assert.equal(run.btn, "正在下载…");
  assert.match(run.msg, /不要锁屏/);
  const early = fillText({have:1, total:4000, state:"run", phase:"media"});
  assert.equal(early.pct, 1);
  const late = fillText({have:3999, total:4000, state:"run", phase:"media"});
  assert.equal(late.pct, 99);
  const pause = fillText({have:10, total:40, state:"pause", reason:"offline"});
  assert.equal(pause.btn, "继续下载剩余内容");
  assert.match(pause.msg, /暂停/);
  const fail = fillText({have:39, total:40, state:"fail", fail:1});
  assert.equal(fail.btn, "重试没下完的内容");
  assert.match(fail.msg, /有 1 个文件/);
  const quota = fillText({have:4, total:40, state:"fail", reason:"quota", fail:1});
  assert.match(quota.msg, /存储空间不够/);
  const done = fillText({have:40, total:40, state:"done"});
  assert.equal(done.btn, "已全部缓存 ✓");
  assert.equal(done.pct, 100);
  assert.match(done.msg, /关掉网络/);
}

console.log("sw-fill unit tests passed");

if (process.argv.includes("--browser")) {
  const {spawn} = await import("node:child_process");
  const http = await import("node:http");
  const {mkdtempSync} = await import("node:fs");
  const {tmpdir} = await import("node:os");
  const {join} = await import("node:path");
  const fetchHandler = sw.slice(sw.indexOf("async function rangeResp"));
  const stub = `
const V="browser",SHELL="nova-shell-browser",MEDIA="nova-media";
const SHELL_FILES=["shell.js"];
const MEDIA_FILES=["content/audio/a.mp3","content/audio/b.mp3","content/audio/c.mp3"];
const mk=f=>f+"?h=abc";
const isMedia=p=>/\\.(mp3|png|jpg|enc)$/i.test(p)&&!/catalog|\\.json/.test(p);
self.addEventListener("install",e=>e.waitUntil(self.skipWaiting()));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
`;
  const swBody = stub + "\n" + protocol + "\n" + fetchHandler;
  const files = {
    "/shell.js": "shell-ok",
    "/content/audio/a.mp3": "audio-a",
    "/content/audio/b.mp3": "audio-b",
    "/content/audio/c.mp3": "audio-c",
  };
  const page = `<!doctype html><meta charset="utf-8"><title>fill</title><body>wait</body><script>
async function go(){
  const reg=await navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"});
  await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller){
    await new Promise(res=>{
      const t=setTimeout(res,4000);
      navigator.serviceWorker.addEventListener("controllerchange",()=>{clearTimeout(t);res()},{once:true});
    });
  }
  const worker=navigator.serviceWorker.controller||(await navigator.serviceWorker.ready).active;
  const result=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("fill timeout")),20000);
    navigator.serviceWorker.addEventListener("message",ev=>{
      const d=ev.data||{};
      if(d.t!=="fill"||d.op==="stat")return;
      if(d.state==="run"&&d.step==="next")worker.postMessage({t:"fill"});
      if(d.state==="done"||d.state==="fail"||d.state==="pause"){clearTimeout(timer);resolve(d)}
    });
    worker.postMessage({t:"fill"});
  });
  const box=await caches.open("nova-media");
  const keys=await box.keys();
  document.body.dataset.fill=JSON.stringify({state:result.state,have:result.have,total:result.total,keys:keys.map(k=>k.url)});
}
go().catch(e=>{document.body.dataset.fill="ERR "+e.stack});
</script>`;
  const server = http.createServer((req, res) => {
    const path = new URL(req.url, "http://127.0.0.1").pathname;
    if (path === "/" || path === "/index.html") {res.setHeader("content-type","text/html"); res.end(page); return}
    if (path === "/sw.js") {res.setHeader("content-type","text/javascript"); res.setHeader("service-worker-allowed","/"); res.end(swBody); return}
    if (files[path] != null) {res.end(files[path]); return}
    res.statusCode = 404; res.end("missing");
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const origin = "http://127.0.0.1:" + port + "/";
  const profile = mkdtempSync(join(tmpdir(), "nova-fill-"));
  const debug = 9400 + Math.floor(Math.random() * 400);
  const chrome = spawn("google-chrome", [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--remote-debugging-port=" + debug, "--user-data-dir=" + profile, "about:blank",
  ], {stdio:"ignore"});
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function cdp(){
    let version;
    for (let i = 0; i < 50; i++) {
      try {version = await (await fetch("http://127.0.0.1:" + debug + "/json/version")).json(); break}
      catch {await sleep(100)}
    }
    if (!version) throw new Error("chrome debug port did not open");
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => {ws.addEventListener("open", res); ws.addEventListener("error", rej)});
    let seq = 0; const waiters = new Map(); const sessions = new Map();
    ws.addEventListener("message", ev => {
      const m = JSON.parse(ev.data);
      if (m.id && waiters.has(m.id)) {waiters.get(m.id)(m); waiters.delete(m.id)}
    });
    const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
      const id = ++seq;
      const t = setTimeout(() => rej(new Error("cdp timeout " + method)), 15000);
      waiters.set(id, m => {clearTimeout(t); m.error ? rej(new Error(method + " " + JSON.stringify(m.error))) : res(m.result)});
      ws.send(JSON.stringify({id, method, params, sessionId}));
    });
    return {ws, send};
  }
  try {
    const {ws, send} = await cdp();
    const {targetId} = await send("Target.createTarget", {url: origin});
    const {sessionId} = await send("Target.attachToTarget", {targetId, flatten: true});
    await send("Page.enable", {}, sessionId);
    await send("Runtime.enable", {}, sessionId);
    await send("Network.enable", {}, sessionId);
    await send("Page.navigate", {url: origin}, sessionId);
    let raw = "";
    for (let i = 0; i < 80; i++) {
      await sleep(250);
      const ev = await send("Runtime.evaluate", {expression:"document.body.dataset.fill||''", returnByValue:true}, sessionId);
      raw = ev.result.value || "";
      if (raw) break;
    }
    assert.ok(raw && !raw.startsWith("ERR"), raw);
    const info = JSON.parse(raw);
    assert.equal(info.state, "done");
    assert.equal(info.have, 3);
    assert.equal(info.total, 3);
    assert.equal(info.keys.length, 3);
    await send("Network.emulateNetworkConditions", {offline:true, latency:0, downloadThroughput:0, uploadThroughput:0}, sessionId);
    const off = await send("Runtime.evaluate", {expression:`(async()=>{
      const out={};
      for (const name of ["a","b","c"]) {
        const r=await fetch("/content/audio/"+name+".mp3");
        out[name]=await r.text();
      }
      const s=await fetch("/shell.js");
      out.shell=await s.text();
      return out;
    })()`, awaitPromise:true, returnByValue:true}, sessionId);
    assert.deepEqual(off.result.value, {a:"audio-a", b:"audio-b", c:"audio-c", shell:"shell-ok"});
    ws.close();
    console.log("sw-fill browser test passed");
  } finally {
    chrome.kill("SIGKILL");
    server.close();
  }
}
