// Lock screen: trim the app password, and don't call a cache/network failure 密码不对.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createContext, runInContext} from "node:vm";

const root = new URL(".", import.meta.url);
const app = readFileSync(new URL("./app.js", root), "utf8");
const sw = readFileSync(new URL("./sw.js", root), "utf8");
const meta = JSON.parse(readFileSync(new URL("./meta.json", root), "utf8"));
const check = readFileSync(new URL("./content/check.enc", root));

assert.equal(meta.enc, true);
assert.equal(meta.salt, "VDsYu07qwIo/c92BJjS9ew==");
assert.equal(meta.iter, 250000);
assert.equal(meta.cv, "ee8d4055");
assert.match(meta.v, /^[0-9a-f]{10}$/);
assert.match(sw, new RegExp('const V="' + meta.v + '"'));
assert.ok(sw.startsWith("// Nova 英语 service worker. " + meta.v + " "));
assert.ok(sw.includes('"content/check.enc"'));

const mediaSrc = sw.split("\n").filter(l => l.startsWith("const isCheck=") || l.startsWith("const isMedia=")).join("\n");
const media = {};
runInContext(mediaSrc + "\nthis.isCheck=isCheck;this.isMedia=isMedia;", createContext(media));
assert.equal(media.isCheck("content/check.enc"), true);
assert.equal(media.isCheck("content/check.enc?h=32b2f0e0"), true);
assert.equal(media.isMedia("content/check.enc"), false, "check.enc must be shell, not media");
assert.equal(media.isMedia("content/audio/t01/s01.mp3.enc"), true);
assert.equal(media.isMedia("assets/hero/top-sky.png"), true);
assert.equal(media.isMedia("meta.json"), false);
assert.equal(media.isMedia("app.js"), false);
assert.equal(media.isMedia("content/naval_t01.json.enc"), false);
assert.match(sw, /if\(gate\)return Response\.error\(\)/);
assert.match(sw, /gate&&ct\.includes\("text\/html"\)/);
assert.equal(sw.includes('catch(err){return (await c.match(key,{ignoreSearch:true}))||(await c.match("index.html"))'), false);

const block = app.slice(app.indexOf("// UNLOCK_START"), app.indexOf("// UNLOCK_END"));
const derive = app.slice(app.indexOf("async function deriveKey"), app.indexOf("// Encrypted files win"));
const lock = app.slice(app.indexOf("function lockScreen"), app.indexOf("// ---------- imported audio"));
assert.match(lock, /type="password"/);
assert.match(lock, /autocomplete="off"/);
assert.match(lock, /name="nova-unlock"/);
assert.match(lock, /autocorrect="off"/);
assert.match(lock, /autocapitalize="off"/);
assert.match(lock, /data-lpignore="true"/);
assert.equal(lock.includes("current-password"), false);
assert.match(lock, /unlockTrim\(pwEl\.value\)/);
assert.ok(lock.indexOf("loadCheck()") < lock.indexOf("deriveKey("), "fetch the check file before the slow KDF");
assert.match(lock, /clearNovaKey\(\)/);
assert.match(lock, /if\(UNLOCK_KIND=="net"\)show\("net"\)/);
assert.match(lock, /id="upd"/);
assert.match(lock, /检查更新/);
assert.match(app, /if\(!KEY\)\{if\(!\(await unlock\(\)\)\)return lockScreen\(\)\}/);
assert.equal(app.includes("META.enc&&!KEY"), false);
assert.match(app, /function unlock\(\)\{[\s\S]*clearNovaKey\(\)/);

const store = new Map();
const ctx = createContext({
  crypto: globalThis.crypto,
  TextEncoder, TextDecoder, Uint8Array, atob, btoa,
  META: meta,
  KEY: null,
  localStorage: {
    getItem: k => store.has(k) ? store.get(k) : null,
    removeItem: k => store.delete(k),
    setItem: (k, v) => store.set(k, v),
  },
});
runInContext("const ub64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));\n" + derive + "\n" + block + "\nthis.api={deriveKey,dec,unlockTrim,unlockErrText,freshMeta,loadCheck,openCheck,clearNovaKey,looksLikeHtml};", ctx);
const api = ctx.api;

assert.equal(api.unlockTrim("  secret  "), "secret");
assert.equal(api.unlockTrim("\nsecret\t"), "secret");
assert.equal(api.unlockTrim("a b"), "a b");
assert.equal(api.unlockTrim(""), "");
assert.equal(api.unlockTrim(null), "");
assert.equal(api.unlockErrText({kind:"pw"}), "密码不对，请再试一次");
assert.equal(api.unlockErrText({kind:"net"}), "网络或缓存问题，请检查更新后重试");
assert.equal(api.unlockErrText(null), "网络或缓存问题，请检查更新后重试");

store.set("nova_key", "stale");
api.clearNovaKey();
assert.equal(store.has("nova_key"), false);

function response({status=200, body="", type="", bytes}={}){
  const raw = bytes || new TextEncoder().encode(typeof body=="string"?body:"");
  const copy = raw.buffer.slice(raw.byteOffset, raw.byteOffset+raw.byteLength);
  return {
    ok: status>=200 && status<300,
    status,
    headers: {get(h){return String(h).toLowerCase()=="content-type"?type:null}},
    json: async () => JSON.parse(typeof body=="string"?body:new TextDecoder().decode(raw)),
    arrayBuffer: async () => copy,
  };
}
async function kindOf(fn){
  try{await fn();return ""}catch(e){return e&&e.kind||e&&e.name||"throw"}
}

{
  let url="", opt=null;
  ctx.fetch = async (u, o) => {url=String(u);opt=o;return response({body:JSON.stringify(meta), type:"application/json"})};
  const m = await api.freshMeta();
  assert.equal(m.salt, meta.salt);
  assert.match(url, /^meta\.json\?t=\d+$/);
  assert.equal(opt.cache, "no-store");
}
ctx.fetch = async () => {throw new TypeError("offline")};
assert.equal(await kindOf(() => api.freshMeta()), "net");
ctx.fetch = async () => response({status:503, body:"nope", type:"text/plain"});
assert.equal(await kindOf(() => api.freshMeta()), "net");
ctx.fetch = async () => response({body:"<html>", type:"text/html"});
assert.equal(await kindOf(() => api.freshMeta()), "net");
ctx.fetch = async () => response({body:JSON.stringify({enc:true}), type:"application/json"});
assert.equal(await kindOf(() => api.freshMeta()), "net");

const real = check.buffer.slice(check.byteOffset, check.byteOffset+check.byteLength);
ctx.fetch = async (u) => {
  assert.match(String(u), /^content\/check\.enc\?t=\d+$/);
  return response({bytes:check, type:"application/octet-stream"});
};
const loaded = await api.loadCheck();
assert.equal(loaded.byteLength, check.byteLength);
ctx.fetch = async () => {throw new TypeError("failed")};
assert.equal(await kindOf(() => api.loadCheck()), "net");
ctx.fetch = async () => response({status:404, body:"missing", type:"text/plain"});
assert.equal(await kindOf(() => api.loadCheck()), "net");
ctx.fetch = async () => response({body:"<!doctype html><html><body>index</body></html>", type:"text/html"});
assert.equal(await kindOf(() => api.loadCheck()), "net");
ctx.fetch = async () => response({body:"<!doctype html><html><body>index page body</body></html>", type:"application/octet-stream"});
assert.equal(await kindOf(() => api.loadCheck()), "net");
ctx.fetch = async () => response({bytes:check.slice(0,10), type:"application/octet-stream"});
assert.equal(await kindOf(() => api.loadCheck()), "net");

ctx.KEY = await api.deriveKey(api.unlockTrim("  not-the-password  "));
assert.equal(await kindOf(() => api.openCheck(real)), "pw");
ctx.KEY = null;
runInContext("dec=async()=>{const e=new Error('boom');e.name='NetworkError';throw e}", ctx);
assert.equal(await kindOf(() => api.openCheck(real)), "net");
runInContext("dec=async()=>{const e=new Error('bad key');e.name='OperationError';throw e}", ctx);
assert.equal(await kindOf(() => api.openCheck(real)), "pw");

console.log("unlock unit tests passed");

if (process.argv.includes("--browser")) {
  const {spawn} = await import("node:child_process");
  const http = await import("node:http");
  const {mkdtempSync, writeFileSync, mkdirSync} = await import("node:fs");
  const {tmpdir} = await import("node:os");
  const {join, extname} = await import("node:path");
  const types = {".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".png":"image/png",".enc":"application/octet-stream",".webmanifest":"application/manifest+json"};
  const server = http.createServer((req, res) => {
    const path = new URL(req.url, "http://127.0.0.1").pathname;
    const rel = path=="/"?"index.html":path.replace(/^\/+/, "");
    try{
      const body = readFileSync(new URL("./"+rel, root));
      res.setHeader("content-type", types[extname(rel)]||"application/octet-stream");
      res.end(body);
    }catch{res.statusCode=404;res.end("missing")}
  });
  await new Promise(r => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:"+server.address().port+"/";
  const profile = mkdtempSync(join(tmpdir(), "nova-unlock-"));
  const debug = 9600+Math.floor(Math.random()*300);
  const chrome = spawn("google-chrome", [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--remote-debugging-port="+debug, "--user-data-dir="+profile, "about:blank",
  ], {stdio:"ignore"});
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function cdp(){
    let version;
    for(let i=0;i<50;i++){
      try{version=await (await fetch("http://127.0.0.1:"+debug+"/json/version")).json();break}
      catch{await sleep(100)}
    }
    if(!version)throw new Error("chrome debug port did not open");
    const ws = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((res, rej) => {ws.addEventListener("open", res);ws.addEventListener("error", rej)});
    let seq=0;const waiters=new Map();
    ws.addEventListener("message", ev => {
      const m=JSON.parse(ev.data);
      if(m.id&&waiters.has(m.id)){waiters.get(m.id)(m);waiters.delete(m.id)}
    });
    const send=(method, params={}, sessionId)=>new Promise((res, rej)=>{
      const id=++seq;
      const t=setTimeout(()=>rej(new Error("cdp timeout "+method)), 20000);
      waiters.set(id, m=>{clearTimeout(t);m.error?rej(new Error(method+" "+JSON.stringify(m.error))):res(m.result)});
      ws.send(JSON.stringify({id, method, params, sessionId}));
    });
    return {ws, send};
  }
  async function evalPage(send, sessionId, expression){
    const ev=await send("Runtime.evaluate", {expression, returnByValue:true, awaitPromise:true}, sessionId);
    if(ev.exceptionDetails)throw new Error(ev.exceptionDetails.text+" "+JSON.stringify(ev.exceptionDetails.exception));
    return ev.result.value;
  }
  try{
    const {ws, send}=await cdp();
    const {targetId}=await send("Target.createTarget", {url:"about:blank"});
    const {sessionId}=await send("Target.attachToTarget", {targetId, flatten:true});
    await send("Page.enable", {}, sessionId);
    await send("Runtime.enable", {}, sessionId);
    await send("Emulation.setDeviceMetricsOverride", {width:390, height:844, deviceScaleFactor:2, mobile:true}, sessionId);
    await send("Page.navigate", {url:origin}, sessionId);
    let info=null;
    for(let i=0;i<80;i++){
      await sleep(150);
      info=await evalPage(send, sessionId, `(()=>{const p=document.getElementById("pw"),er=document.getElementById("er");if(!p)return null;return {type:p.type,ac:p.getAttribute("autocomplete"),name:p.getAttribute("name"),autocorrect:p.getAttribute("autocorrect"),autocap:p.getAttribute("autocapitalize"),lp:p.getAttribute("data-lpignore"),err:er?er.textContent:"",updHidden:document.getElementById("upd").classList.contains("hidden")}})()`);
      if(info)break;
    }
    assert.ok(info, "lock screen did not render");
    assert.equal(info.type, "password");
    assert.equal(info.ac, "off");
    assert.equal(info.name, "nova-unlock");
    assert.equal(info.autocorrect, "off");
    assert.equal(info.autocap, "off");
    assert.equal(info.lp, "true");
    assert.equal(info.updHidden, true);
    assert.equal(info.err, "");
    await evalPage(send, sessionId, `document.getElementById("pw").value="  not-the-password  ";document.getElementById("go").click()`);
    let err="";
    for(let i=0;i<120;i++){
      await sleep(250);
      err=await evalPage(send, sessionId, `document.getElementById("er").textContent`);
      if(err&&err!="正在验证…")break;
    }
    assert.equal(err, "密码不对，请再试一次");
    const still=await evalPage(send, sessionId, `document.getElementById("pw").value`);
    assert.equal(still, "  not-the-password  ");
    mkdirSync("/opt/cursor/artifacts", {recursive:true});
    const shot=async name=>{
      const png=await send("Page.captureScreenshot", {format:"png"}, sessionId);
      writeFileSync("/opt/cursor/artifacts/"+name, Buffer.from(png.data, "base64"));
    };
    await shot("unlock-wrong-password.png");
    await evalPage(send, sessionId, `window.fetch=()=>Promise.reject(new TypeError("offline"))`);
    await evalPage(send, sessionId, `document.getElementById("go").click()`);
    let net="";
    for(let i=0;i<40;i++){
      await sleep(100);
      net=await evalPage(send, sessionId, `document.getElementById("er").textContent`);
      if(net&&net!="正在验证…")break;
    }
    assert.equal(net, "网络或缓存问题，请检查更新后重试");
    const shown=await evalPage(send, sessionId, `(()=>{const u=document.getElementById("upd");return {hidden:u.classList.contains("hidden"),text:u.textContent,display:getComputedStyle(u).display}})()`);
    assert.equal(shown.hidden, false);
    assert.equal(shown.text, "检查更新");
    assert.notEqual(shown.display, "none");
    await shot("unlock-network.png");
    await evalPage(send, sessionId, `document.getElementById("upd").click()`);
    let toast="";
    for(let i=0;i<30;i++){
      await sleep(100);
      toast=await evalPage(send, sessionId, `document.querySelector(".toast")?document.querySelector(".toast").textContent:""`);
      if(toast)break;
    }
    assert.equal(toast, "没有网络，稍后再试");
    ws.close();
    console.log("unlock browser test passed");
  }finally{
    chrome.kill("SIGKILL");
    server.close();
  }
}
