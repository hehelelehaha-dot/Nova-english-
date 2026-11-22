"use strict";
// Sentence Puzzle. Version fallback must match puzzle/meta.json and sw.js.
// Playback: sentence.audio (Fish voice-over), then oa (original), then a (Kokoro), then Web Speech.
// Naval sentences come from naval.json. Their mp3s live under audio/naval/ and are not decrypted.

const VERSION_FALLBACK = "2";
const STATS_KEY = "puzzle_stats";
const MASTERY_KEY = "puzzle_mastery";
const SESSION_KEY = "puzzle_session";
const DAYS_KEY = "puzzle_days";
const TZ = "America/New_York";

const THEMES = [
  { id: "All", en: "All", zh: "全部" },
  { id: "Lash", en: "Lash", zh: "美睫" },
  { id: "Dealer", en: "Dealer", zh: "发牌" },
  { id: "Daily", en: "Daily", zh: "日常" },
  { id: "Scary", en: "Scary", zh: "惊悚" },
  { id: "Naval", en: "Naval", zh: "原句" }
];
const LEVELS = [
  { id: 1, en: "Short SVO", zh: "简单短句" },
  { id: 2, en: "Time / place", zh: "时间地点" },
  { id: 3, en: "Questions", zh: "疑问句" },
  { id: 4, en: "Negatives", zh: "否定句" },
  { id: 5, en: "Prepositions", zh: "介词" },
  { id: 6, en: "Clauses", zh: "从句长句" }
];
const THEME_ZH = { Lash: "美睫", Dealer: "发牌", Daily: "日常", Scary: "惊悚", Naval: "Naval", All: "全部" };

let versionMeta = { v: VERSION_FALLBACK, built: "2026-11-22" };
let reg = null;
let BANK = [];
let NAVAL = [];
let byId = new Map();
let navalLoaded = false;
let storageOk = true;
let stats = { score: 0, streak: 0, bestStreak: 0, solved: 0 };
let mastery = {};
let round = null;
let loadError = false;
let badgeDay = "";
const ui = { screen: "home", theme: "All", level: 1, board: "all", historyOpen: false };

const player = new Audio();
player.preload = "auto";
let playToken = 0;

const $ = (id) => document.getElementById(id);
function esc(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function readJSON(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return v && typeof v === "object" ? v : null;
  } catch (e) { return null; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { storageOk = false; }
}
function nyToday(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date || new Date());
}
function loadDays() {
  const v = readJSON(DAYS_KEY);
  return v || {};
}
function todayCount() {
  return loadDays()[nyToday()] | 0;
}
function bumpToday() {
  const days = loadDays();
  const k = nyToday();
  days[k] = (days[k] | 0) + 1;
  const keys = Object.keys(days).sort();
  while (keys.length > 120) delete days[keys.shift()];
  writeJSON(DAYS_KEY, days);
  renderBadge();
}
function last7() {
  const days = loadDays();
  const today = nyToday();
  const [y, m, d] = today.split("-").map(Number);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(Date.UTC(y, m - 1, d));
    t.setUTCDate(t.getUTCDate() - i);
    const iso = t.toISOString().slice(0, 10);
    out.push({ iso, n: days[iso] | 0 });
  }
  return out;
}
function dayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const wk = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getUTCDay()];
  return wk + " " + m + "/" + d;
}

function normTok(w) {
  return String(w).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']+/g, "");
}
function sameSeq(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
function sameNorm(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = normTok(a[i]), y = normTok(b[i]);
    if (!x || x !== y) return false;
  }
  return true;
}
function isCorrect(words, sentence) {
  const lists = [sentence.tiles].concat(sentence.accepted || []);
  return lists.some((list) => sameSeq(words, list) || sameNorm(words, list));
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function isPlayable(s) {
  return !!(s && s.playable !== false && s.tiles && s.tiles.length >= 3);
}
function normalize(s) {
  const oa = s.oa || (s.sourceAudio ? String(s.sourceAudio).replace(/^content\//, "") : "");
  return {
    id: s.id,
    theme: s.theme,
    level: s.level | 0,
    english: s.english || "",
    chinese: s.chinese || s.zh || "",
    tiles: s.tiles || [],
    accepted: s.accepted || [],
    playable: s.playable !== false,
    audio: s.audio || null,
    d: s.d != null ? +s.d : null,
    start: s.start != null ? +s.start : null,
    end: s.end != null ? +s.end : null,
    voice: s.voice || "",
    oa: oa,
    a: s.a || "",
    sourceFile: s.sourceFile || "",
    sourceTitle: s.sourceTitle || "",
    board: s.board || s.sourceFile || "",
    boardTitle: s.boardTitle || s.sourceTitle || ""
  };
}
function reindex() {
  byId = new Map();
  BANK.forEach((s) => { if (isPlayable(s)) byId.set(s.id, s); });
  NAVAL.forEach((s) => { if (isPlayable(s)) byId.set(s.id, s); });
}
function findSentence(id) { return byId.get(id) || null; }
function countTheme(id) {
  if (id === "Naval") return navalLoaded ? NAVAL.filter(isPlayable).length : null;
  if (id === "All") return BANK.filter(isPlayable).length;
  return BANK.filter((s) => s.theme === id && isPlayable(s)).length;
}
function scaryBoards() {
  const map = new Map();
  BANK.forEach((s) => {
    if (s.theme !== "Scary" || !isPlayable(s)) return;
    const id = s.sourceFile || s.board || s.id;
    if (!map.has(id)) map.set(id, { id, title: s.sourceTitle || id, n: 0 });
    map.get(id).n++;
  });
  return Array.from(map.values());
}
function navalBoards() {
  const map = new Map();
  NAVAL.forEach((s) => {
    if (!isPlayable(s)) return;
    if (!map.has(s.board)) map.set(s.board, { id: s.board, title: s.boardTitle || s.board, n: 0 });
    map.get(s.board).n++;
  });
  return Array.from(map.values());
}
function splitTitle(title) {
  const parts = String(title || "").split(" · ");
  return { en: parts[0] || title, zh: parts.slice(1).join(" · ") };
}
function selection() {
  if (ui.theme === "Naval") {
    let list = NAVAL.filter(isPlayable);
    if (ui.board && ui.board !== "all") list = list.filter((s) => s.board === ui.board);
    return list;
  }
  let list = BANK.filter(isPlayable);
  if (ui.theme !== "All") list = list.filter((s) => s.theme === ui.theme);
  if (ui.theme === "Scary") {
    if (ui.board && ui.board !== "all") list = list.filter((s) => (s.sourceFile || s.board) === ui.board);
    return list;
  }
  return list.filter((s) => s.level === ui.level);
}
function keepOrder() {
  if (ui.theme === "Naval") return true;
  if (ui.theme === "Scary" && ui.board && ui.board !== "all") return true;
  return false;
}
function masteryOf(id) {
  if (!mastery[id]) mastery[id] = { ok: 0, miss: 0, hints: 0, mastered: false, clean: false };
  return mastery[id];
}
function saveStats() { writeJSON(STATS_KEY, stats); }
function saveMastery() { writeJSON(MASTERY_KEY, mastery); }
function saveSession() {
  writeJSON(SESSION_KEY, {
    screen: ui.screen,
    theme: ui.theme,
    level: ui.level,
    board: ui.board,
    round: round ? {
      theme: round.theme,
      level: round.level,
      board: round.board,
      queue: round.queue,
      index: round.index,
      id: round.sentence ? round.sentence.id : null,
      placed: round.placed,
      bank: round.bank,
      locked: round.locked,
      phase: round.phase,
      hints: round.hints,
      scored: round.scored,
      misses: round.misses
    } : null
  });
}
function levelName(id) {
  const lv = LEVELS.filter((x) => x.id === id)[0];
  return lv ? lv.en : "Level " + id;
}

function audioField(s) {
  const a = s && s.audio;
  if (!a) return null;
  if (typeof a === "string") return { url: a, start: s.start, end: s.end };
  if (typeof a === "object") {
    return {
      url: a.url || a.src || "",
      start: a.start != null ? +a.start : s.start,
      end: a.end != null ? +a.end : s.end
    };
  }
  return null;
}
function resolveAudioURL(url) {
  if (!url) return "";
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  if (url.charAt(0) === "/") return new URL(url, location.origin).href;
  if (url.indexOf("content/") === 0) return new URL("../" + url, document.baseURI).href;
  return new URL(url, document.baseURI).href;
}
function clipUrl(rel) {
  if (!rel) return "";
  const url = String(rel);
  if (/^(https?:|blob:|data:)/i.test(url)) return url;
  if (url.charAt(0) === "/") return new URL(url, location.origin).href;
  if (url.indexOf("audio/naval/") === 0 || url.indexOf("audio/lash/") === 0 || url.indexOf("audio/dealer/") === 0 || url.indexOf("audio/daily/") === 0) {
    return new URL(url, document.baseURI).href;
  }
  if (url.indexOf("content/") === 0) return new URL("../" + url, document.baseURI).href;
  if (url.indexOf("audio/") === 0) return new URL("../content/" + url, document.baseURI).href;
  return new URL(url, document.baseURI).href;
}
function voicePlan(s) {
  if (audioField(s)) return { kind: "audio", en: s.voice ? "Voice-over · " + s.voice : "Voice-over", zh: "配音" };
  if (s && s.oa) return { kind: "original", en: "Original", zh: "原声" };
  if (s && s.a) return { kind: "voice", en: "Voice", zh: "朗读" };
  return { kind: "speech", en: "Read aloud", zh: "朗读" };
}
function heardLabel(kind, voice) {
  if (kind === "audio" && voice) return "Voice-over · " + voice;
  const map = {
    audio: "Voice-over · 配音",
    original: "Original · 原声",
    voice: "Voice · 朗读",
    speech: "Read aloud · 朗读"
  };
  return map[kind] || "";
}
function stopPlayback() {
  playToken++;
  try { player.pause(); } catch (e) {}
  if (window.speechSynthesis) speechSynthesis.cancel();
}
function playUrl(url, start, end, token) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      resolve(!!ok);
    };
    const el = player;
    el.onended = () => finish(true);
    el.onerror = () => finish(false);
    const t0 = start != null && isFinite(+start) ? Math.max(0, +start) : 0;
    const t1 = end != null && isFinite(+end) ? +end : null;
    const begin = () => {
      if (settled || token !== playToken) return finish(false);
      try { el.currentTime = t0; } catch (e) {}
      const p = el.play();
      if (p && p.catch) p.catch(() => finish(false));
    };
    el.src = url;
    if (el.readyState >= 1) begin();
    else el.addEventListener("loadedmetadata", begin, { once: true });
    const tick = () => {
      if (settled || token !== playToken) return;
      if (t1 != null && el.currentTime >= t1 - 0.04 && el.currentTime > t0) {
        try { el.pause(); } catch (e) {}
        return finish(true);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => {
      if (!settled && token === playToken && el.paused && (el.currentTime || 0) < 0.05) finish(false);
    }, 8000);
  });
}
function speak(text) {
  return new Promise((resolve) => {
    if (!text || !window.speechSynthesis) return resolve(false);
    let done = false;
    const finish = (ok) => { if (done) return; done = true; resolve(ok); };
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.92;
    u.onend = () => finish(true);
    u.onerror = () => finish(false);
    setTimeout(() => finish(false), 4000);
    try {
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
    } catch (e) { finish(false); }
  });
}
async function playSentence(sentence) {
  const token = ++playToken;
  try { player.pause(); } catch (e) {}
  if (window.speechSynthesis) speechSynthesis.cancel();
  const field = audioField(sentence);
  if (field && field.url) {
    const ok = await playUrl(resolveAudioURL(field.url), field.start, field.end, token);
    if (token !== playToken) return "";
    if (ok) return "audio";
  }
  if (sentence.oa) {
    const ok = await playUrl(clipUrl(sentence.oa), sentence.start, sentence.end, token);
    if (token !== playToken) return "";
    if (ok) return "original";
  }
  if (token !== playToken) return "";
  if (sentence.a && sentence.a !== sentence.oa) {
    const ok = await playUrl(clipUrl(sentence.a), null, null, token);
    if (token !== playToken) return "";
    if (ok) return "voice";
  }
  if (token !== playToken) return "";
  const spoke = await speak(sentence.english);
  if (token !== playToken) return "";
  return spoke ? "speech" : "";
}

function dealTiles(sentence) {
  const ids = sentence.tiles.map((_, i) => i);
  let order = ids;
  for (let k = 0; k < 16; k++) {
    order = shuffle(ids);
    const words = order.map((i) => sentence.tiles[i]);
    if (!isCorrect(words, sentence)) return order;
  }
  if (order.length > 1) {
    const swapped = order.slice();
    const t = swapped[0]; swapped[0] = swapped[1]; swapped[1] = t;
    if (!isCorrect(swapped.map((i) => sentence.tiles[i]), sentence)) return swapped;
  }
  return order;
}
function sane(sentence, placed, bank, locked) {
  const n = sentence.tiles.length;
  const seen = new Set();
  const ok = (arr) => arr.every((i) => i === (i | 0) && i >= 0 && i < n && !seen.has(i) && seen.add(i));
  if (!ok(placed || []) || !ok(bank || []) || seen.size !== n) return false;
  if (locked < 0 || locked > placed.length) return false;
  for (let i = 0; i < locked; i++) if (placed[i] !== i) return false;
  return true;
}
function beginAt(queue, index) {
  if (index >= queue.length) {
    round = {
      theme: ui.theme, level: ui.level, board: ui.board,
      queue: queue, index: index, sentence: null,
      placed: [], bank: [], locked: 0, phase: "done",
      hints: 0, scored: false, misses: 0, heard: ""
    };
    ui.screen = "done";
    saveSession();
    render();
    return;
  }
  const sentence = findSentence(queue[index]);
  if (!sentence) { beginAt(queue, index + 1); return; }
  round = {
    theme: ui.theme, level: ui.level, board: ui.board,
    queue: queue, index: index, sentence: sentence,
    placed: [], bank: dealTiles(sentence), locked: 0,
    phase: "play", hints: 0, scored: false, misses: 0, heard: "", showZh: false
  };
  ui.screen = "play";
  saveSession();
  render();
}
function filterMatchesRound() {
  return !!(round && round.theme === ui.theme && round.level === ui.level && round.board === ui.board);
}
async function onStart() {
  if (round && round.phase !== "done" && filterMatchesRound() && round.sentence) {
    ui.screen = "play";
    saveSession();
    render();
    return;
  }
  const list = selection();
  if (!list.length) { toast("No sentences in this set. 这组没有句子。"); render(); return; }
  const ids = list.map((s) => s.id);
  beginAt(keepOrder() ? ids : shuffle(ids), 0);
}
function onPlace(i) {
  if (!round || !round.sentence || round.phase === "correct" || round.phase === "done") return;
  i = i | 0;
  const at = round.bank.indexOf(i);
  if (at < 0) return;
  round.bank.splice(at, 1);
  round.placed.push(i);
  if (round.phase === "wrong") round.phase = "play";
  saveSession();
  render();
}
function onUnplace(i) {
  if (!round || !round.sentence || round.phase === "correct" || round.phase === "done") return;
  i = i | 0;
  const at = round.placed.indexOf(i);
  if (at < 0 || at < round.locked) return;
  round.placed.splice(at, 1);
  round.bank.push(i);
  if (round.phase === "wrong") round.phase = "play";
  saveSession();
  render();
}
function onHint() {
  if (!round || !round.sentence || round.phase === "correct" || round.phase === "done") return;
  const n = round.sentence.tiles.length;
  if (round.locked >= n) return;
  const need = round.locked;
  round.placed = round.placed.filter((i) => i !== need);
  round.bank = round.bank.filter((i) => i !== need);
  round.placed.splice(round.locked, 0, need);
  round.locked++;
  round.hints++;
  saveSession();
  render();
}
function onCheck() {
  if (!round || !round.sentence || round.phase === "correct" || round.phase === "done") return;
  const s = round.sentence;
  if (round.placed.length < s.tiles.length) {
    toast("Place every tile first. 请先放完所有词卡。");
    return;
  }
  const words = round.placed.map((i) => s.tiles[i]);
  if (isCorrect(words, s)) onCorrect();
  else {
    round.phase = "wrong";
    round.misses++;
    stats.streak = 0;
    const m = masteryOf(s.id);
    m.miss = (m.miss || 0) + 1;
    saveMastery();
    saveStats();
    saveSession();
    render();
  }
}
function onCorrect() {
  const s = round.sentence;
  if (!round.scored) {
    round.scored = true;
    stats.score += 10;
    stats.streak += 1;
    stats.solved = (stats.solved || 0) + 1;
    if (stats.streak > (stats.bestStreak || 0)) stats.bestStreak = stats.streak;
    const m = masteryOf(s.id);
    m.ok = (m.ok || 0) + 1;
    m.hints = (m.hints || 0) + round.hints;
    m.mastered = true;
    if (round.hints === 0 && round.misses === 0) m.clean = true;
    saveMastery();
    saveStats();
    bumpToday();
  }
  round.phase = "correct";
  saveSession();
  render();
  playSentence(s).then((kind) => {
    if (!round || round.sentence !== s) return;
    round.heard = kind || "";
    const el = $("heard");
    if (el && kind) el.textContent = heardLabel(kind, s.voice);
  });
}
function onRetry() {
  if (!round) return;
  round.phase = "play";
  saveSession();
  render();
}
function onNext() {
  stopPlayback();
  if (!round) return;
  beginAt(round.queue, round.index + 1);
}
function onBack() {
  stopPlayback();
  ui.screen = "home";
  saveSession();
  render();
}
function onTheme(id) {
  ui.theme = id;
  ui.board = "all";
  ui.screen = "home";
  render();
}
async function checkUpdate(manual) {
  try {
    const m = await (await fetch("meta.json?t=" + Date.now(), { cache: "no-store" })).json();
    if (reg) { try { await reg.update(); } catch (e) {} }
    if (m && m.v && versionMeta.v && String(m.v) !== String(versionMeta.v)) {
      toast("New version. Updating… 发现新版本，正在更新…");
      setTimeout(() => location.reload(), 900);
    } else if (manual) toast("You're up to date. 已经是最新版本");
  } catch (e) {
    if (manual) toast("No network. Try again later. 没有网络，稍后再试");
  }
}
let toastTimer = 0;
function toast(msg) {
  const el = $("toast");
  if (!el) return;
  el.textContent = msg;
  el.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("on"), 2600);
}

function headerHTML() {
  const ver = esc(versionMeta.v || VERSION_FALLBACK);
  if (ui.screen === "home") {
    return '<h1>Sentence Puzzle<span class="sub">语序拼图</span></h1><span class="ver">v' + ver + "</span>";
  }
  const theme = round ? round.theme : ui.theme;
  const zh = THEME_ZH[theme] || "";
  let sub = zh;
  if (theme === "Scary" || theme === "Naval") {
    const title = round && round.sentence ? (round.sentence.boardTitle || "") : "";
    const name = title ? splitTitle(title).en : (ui.board === "all" ? "All stories" : "");
    sub = (zh ? zh + " · " : "") + (name || "Stories");
  } else {
    const lv = round ? round.level : ui.level;
    sub = (zh ? zh + " · " : "") + "Level " + lv + " · " + levelName(lv);
  }
  const pill = stats.score + " · streak " + stats.streak;
  return '<button class="back" type="button" data-act="back">‹ Back</button>' +
    "<h1>" + esc(theme === "All" ? "All" : theme) + '<span class="sub">' + esc(sub) + "</span></h1>" +
    '<span class="statpill">' + esc(pill) + "</span>";
}
function themeChips() {
  return THEMES.map((t) => {
    const n = countTheme(t.id);
    const sub = t.zh + " · " + (n == null ? "…" : n);
    return '<button type="button" class="chip' + (ui.theme === t.id ? " on" : "") + '" data-act="theme" data-id="' + t.id + '"><b>' +
      esc(t.en) + "</b><i>" + esc(sub) + "</i></button>";
  }).join("");
}
function levelGrid() {
  return LEVELS.map((lv) => (
    '<button type="button" class="lv' + (ui.level === lv.id ? " on" : "") + '" data-act="level" data-id="' + lv.id + '">' +
    '<span class="n">' + lv.id + '</span><span class="en">' + esc(lv.en) + '</span><span class="z">' + esc(lv.zh) + "</span></button>"
  )).join("");
}
function boardList(boards, allLabel, allZh, total) {
  const all = '<button type="button" class="board' + (ui.board === "all" ? " on" : "") + '" data-act="board" data-id="all"><b>' +
    esc(allLabel) + "</b><i>" + esc(allZh) + " · " + total + "</i></button>";
  const rows = boards.map((b) => {
    const parts = splitTitle(b.title);
    const on = ui.board === b.id ? " on" : "";
    return '<button type="button" class="board' + on + '" data-act="board" data-id="' + esc(b.id) + '"><b>' +
      esc(parts.en) + "</b><i>" + esc((parts.zh ? parts.zh + " · " : "") + b.n) + "</i></button>";
  }).join("");
  return '<div class="boards">' + all + rows + "</div>";
}
function homeMain() {
  if (loadError) {
    return '<div class="hero"><b>Couldn\'t load sentences</b><span class="zh">句子没有载入。检查网络后再打开。</span></div>';
  }
  const list = selection();
  const mastered = list.filter((s) => mastery[s.id] && mastery[s.id].mastered).length;
  let picker = "";
  if (ui.theme === "Scary") {
    const boards = scaryBoards();
    const total = boards.reduce((n, b) => n + b.n, 0);
    picker = '<div class="sec">Story<small>Grouped by story. 按故事分组，不按难度。</small></div>' +
      boardList(boards, "All stories", "全部故事", total);
  } else if (ui.theme === "Naval") {
    if (!navalLoaded) {
      picker = '<p class="loading">Couldn\'t load Naval. 读不到 Naval。</p>';
    } else if (!NAVAL.length) {
      picker = '<p class="loading">No Naval sentences yet. 还没有 Naval 句子。</p>';
    } else {
      const boards = navalBoards();
      const total = boards.reduce((n, b) => n + b.n, 0);
      picker = '<div class="sec">Topic<small>Grouped by topic. 按话题分组。</small></div>' +
        boardList(boards, "All topics", "全部话题", total);
    }
  } else {
    picker = '<div class="sec">Level<small>1 is short. 6 is longer. 从 1 到 6 变难。</small></div><div class="levels">' + levelGrid() + "</div>";
  }
  const note = storageOk
    ? "Saved on this phone. 进度保存在这台手机上。"
    : "This browser can't save. A reload clears the score. 无法保存时，刷新会清零。";
  return '<div class="hero"><b>Put the tiles in order</b><span class="zh">把词卡排成正确的句子</span>' +
    '<span class="en-note">Tap a tile to place it. Tap it again to take it back.</span>' +
    '<span class="zh">点词卡排序，再点一次可拿下来。</span></div>' +
    '<div class="sec">Theme<small>Choose a set. 先选主题。</small></div><div class="chips">' + themeChips() + "</div>" +
    picker +
    '<div class="session"><div class="row"><span class="k">This session</span><span class="v">Score ' + stats.score + " · streak " + stats.streak + "</span></div>" +
    '<div class="zh">本次 · 得分 · 连对</div>' +
    '<div class="row" style="margin-top:4px"><span class="k">Best ' + (stats.bestStreak || 0) + "</span><span class=\"v\">Mastered " + mastered + "/" + list.length + "</span></div>" +
    '<div class="zh">最高连对 · 已掌握</div>' +
    '<div class="note">' + esc(note) + "</div></div>";
}
function playMain() {
  const s = round.sentence;
  const total = round.queue.length;
  const num = Math.min(total, round.index + 1);
  const pct = total ? (100 * num / total) : 0;
  const prog = '<div class="prog"><span>' + num + " / " + total + '</span><div class="bar"><i style="width:' + pct + '%"></i></div></div>';
  if (round.phase === "correct") {
    const plan = voicePlan(s);
    const heard = round.heard ? heardLabel(round.heard, s.voice) : (plan.en + " · " + plan.zh);
    return prog +
      '<div class="msg good">That\'s right.<span class="zh">正确。</span></div>' +
      '<div class="result"><div class="oktag">CORRECT</div><p class="sent">' + esc(s.english) + "</p>" +
      '<p class="cn">' + esc(s.chinese) + "</p>" +
      '<button class="replay" type="button" data-act="replay">▶ Replay · 再听一遍</button>' +
      '<p class="heard" id="heard">' + esc(heard) + "</p></div>" +
      '<div class="scorebox"><div><b>' + stats.score + '</b><span>Score 得分</span></div>' +
      "<div><b>" + stats.streak + '</b><span>Streak 连对</span></div>' +
      "<div><b>" + num + "/" + total + "</b><span>Progress 进度</span></div></div>";
  }
  let msg = "";
  if (round.phase === "wrong") {
    msg = '<div class="msg bad">Some tiles are in the wrong place.<span class="zh">有的词卡位置不对。再试一次，或点「提示下一个词」锁定下一个正确的词。</span></div>';
  }
  const placed = round.placed.map((index, pos) => {
    const locked = pos < round.locked;
    const word = s.tiles[index];
    const canon = s.tiles[pos];
    const wrong = round.phase === "wrong" && !locked && word !== canon;
    const cls = "tile" + (locked ? " locked" : "") + (wrong ? " wrong" : "");
    return '<button type="button" class="' + cls + '" data-act="unplace" data-i="' + index + '">' + esc(word) + "</button>";
  }).join("");
  const slots = new Array(s.tiles.length - round.placed.length).fill('<span class="slot"></span>').join("");
  const bank = round.bank.map((index) => (
    '<button type="button" class="tile" data-act="place" data-i="' + index + '">' + esc(s.tiles[index]) + "</button>"
  )).join("");
  const gold = round.locked ? '<p class="muted">Gold tile is locked. <span class="zh">金色词卡已锁定（提示下一个词）。</span></p>' : "";
  const zhOpen = !!round.showZh;
  const zhText = s.chinese || s.zh || "";
  const meaning = '<div class="meaning"><button type="button" class="meaning-btn" data-act="zh" aria-expanded="' +
    (zhOpen ? "true" : "false") + '">提示</button>' +
    (zhOpen ? '<p class="meaning-zh" id="meaning-zh">' + esc(zhText || "No Chinese for this sentence. 这句没有中文。") + "</p>" : "") +
    "</div>";
  return prog +
    '<div class="prompt"><b>Put the tiles in order</b><div class="zh">Tap a tile to place it. Tap a placed tile to take it out. 点选排序，再点可撤回。</div></div>' +
    msg + '<div class="board-play"><div class="slots">' + placed + slots + "</div></div>" +
    '<div class="bank">' + bank + "</div>" + gold + meaning;
}
function doneMain() {
  return '<div class="hero"><b>Set complete</b><span class="zh">这组练完了</span></div>' +
    '<div class="scorebox"><div><b>' + stats.score + '</b><span>Score 得分</span></div>' +
    "<div><b>" + stats.streak + '</b><span>Streak 连对</span></div>' +
    "<div><b>" + (stats.bestStreak || 0) + "</b><span>Best 最高</span></div></div>";
}
function dockHTML() {
  if (ui.screen === "done") {
    return '<div class="actions"><button class="btn primary" type="button" data-act="again">Practice again · 再来一组</button></div>' +
      '<button class="wide ghost" type="button" data-act="back">Home · 回首页</button>';
  }
  if (ui.screen === "play" && round && round.phase === "correct") {
    const last = round.index + 1 >= round.queue.length;
    const label = last ? "Finish · 完成" : "Next · 下一句";
    return '<button class="wide primary" type="button" data-act="next">' + label + "</button>";
  }
  if (ui.screen === "play" && round) {
    const primary = round.phase === "wrong"
      ? '<button class="btn primary" type="button" data-act="retry">Retry · 再试一次</button>'
      : '<button class="btn primary" type="button" data-act="check">Check · 检查</button>';
    const off = round.locked >= round.sentence.tiles.length ? " disabled" : "";
    return '<div class="actions">' + primary +
      '<button class="btn ghost" type="button" data-act="hint"' + off + '>Next word<span class="z">提示下一个词</span></button></div>';
  }
  return '<button class="go" type="button" data-act="start">Start · 开始练习</button>' +
    '<button class="wide ghost" type="button" data-act="update">Check for update · 检查更新</button>';
}
function renderBadge() {
  const host = $("today");
  if (!host) return;
  badgeDay = nyToday();
  const n = todayCount();
  const open = ui.historyOpen;
  const rows = last7().map((d, i) => (
    '<li class="' + (i === 0 ? "today" : "") + '"><span>' + esc(dayLabel(d.iso)) + "</span><b>" + d.n + "</b></li>"
  )).join("");
  host.innerHTML = '<div id="today-pop"' + (open ? "" : " hidden") + ">" +
    '<p class="pop-h">Last 7 days</p><p class="zh">最近 7 天 · 纽约时间</p><ul>' + rows + "</ul></div>" +
    '<button type="button" id="today-badge" data-act="badge" aria-expanded="' + (open ? "true" : "false") + '" aria-live="polite">' +
    "Today " + n + " · 今天 " + n + " 句</button>";
}
function render() {
  const main = $("main");
  const y = main ? main.scrollTop : 0;
  $("hdr").innerHTML = headerHTML();
  let body = "";
  if (ui.screen === "play" && round && round.sentence) body = playMain();
  else if (ui.screen === "done") body = doneMain();
  else { ui.screen = "home"; body = homeMain(); }
  main.innerHTML = body;
  main.classList.toggle("arrange", ui.screen === "play" && round && round.sentence && round.phase !== "correct" && round.phase !== "done");
  $("dock").innerHTML = dockHTML();
  $("app").dataset.screen = ui.screen;
  main.scrollTop = y;
  renderBadge();
}

function restore(data) {
  if (!data) return;
  if (THEMES.some((t) => t.id === data.theme)) ui.theme = data.theme;
  if (data.level >= 1 && data.level <= 6) ui.level = data.level;
  if (data.board) ui.board = data.board;
  const saved = data.round;
  if (!saved || !saved.queue) return;
  const sentence = saved.id ? findSentence(saved.id) : null;
  if (saved.phase !== "done" && !sentence) return;
  if (sentence && !sane(sentence, saved.placed || [], saved.bank || [], saved.locked | 0)) {
    round = {
      theme: saved.theme || ui.theme,
      level: saved.level || ui.level,
      board: saved.board || ui.board,
      queue: saved.queue,
      index: saved.index | 0,
      sentence: sentence,
      placed: [],
      bank: dealTiles(sentence),
      locked: 0,
      phase: saved.scored ? "correct" : "play",
      hints: saved.hints | 0,
      scored: !!saved.scored,
      misses: saved.misses | 0,
      heard: ""
    };
  } else {
    round = {
      theme: saved.theme || ui.theme,
      level: saved.level || ui.level,
      board: saved.board || ui.board,
      queue: saved.queue,
      index: saved.index | 0,
      sentence: sentence,
      placed: saved.placed || [],
      bank: saved.bank || [],
      locked: saved.locked | 0,
      phase: saved.phase || "play",
      hints: saved.hints | 0,
      scored: !!saved.scored,
      misses: saved.misses | 0,
      heard: ""
    };
  }
  if (data.screen === "play" || data.screen === "done") ui.screen = data.screen;
}
function bind() {
  document.body.addEventListener("click", (e) => {
    const badge = e.target.closest("[data-act=badge]");
    if (badge) {
      ui.historyOpen = !ui.historyOpen;
      renderBadge();
      return;
    }
    if (ui.historyOpen && !e.target.closest("#today-pop")) {
      ui.historyOpen = false;
      renderBadge();
    }
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "theme") onTheme(b.dataset.id);
    else if (act === "level") { ui.level = b.dataset.id | 0; ui.screen = "home"; render(); }
    else if (act === "board") { ui.board = b.dataset.id; ui.screen = "home"; render(); }
    else if (act === "start" || act === "again") onStart();
    else if (act === "back") onBack();
    else if (act === "check") onCheck();
    else if (act === "hint") onHint();
    else if (act === "zh") {
      if (round && round.sentence && round.phase !== "correct" && round.phase !== "done") {
        round.showZh = !round.showZh;
        render();
      }
    }
    else if (act === "retry") onRetry();
    else if (act === "next") onNext();
    else if (act === "place") onPlace(b.dataset.i);
    else if (act === "unplace") onUnplace(b.dataset.i);
    else if (act === "replay") {
      if (round && round.sentence) {
        const s = round.sentence;
        playSentence(s).then((kind) => {
          const el = $("heard");
          if (el && kind) el.textContent = heardLabel(kind, s.voice);
        });
      }
    } else if (act === "update") checkUpdate(true);
  });
}
function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  const had = !!navigator.serviceWorker.controller;
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!had || reloading) return;
    reloading = true;
    try { sessionStorage.setItem("puzzle_updated", "1"); } catch (e) {}
    location.reload();
  });
  navigator.serviceWorker.register("sw.js", { scope: "./", updateViaCache: "none" }).then((r) => {
    reg = r;
    r.update().catch(() => {});
  }).catch(() => {});
}
async function boot() {
  bind();
  renderBadge();
  setInterval(() => {
    const t = nyToday();
    if (t !== badgeDay) renderBadge();
  }, 15000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) renderBadge(); });
  try {
    const m = await (await fetch("meta.json?t=" + Date.now(), { cache: "no-store" })).json();
    if (m && m.v) versionMeta = m;
  } catch (e) {}
  try {
    const data = await (await fetch("sentences.json")).json();
    BANK = (data.sentences || []).map(normalize);
  } catch (e) { loadError = true; }
  try {
    const naval = await (await fetch("naval.json")).json();
    NAVAL = (naval.sentences || []).map(normalize).filter(isPlayable);
    navalLoaded = true;
  } catch (e) { navalLoaded = false; }
  reindex();
  const savedStats = readJSON(STATS_KEY);
  if (savedStats) stats = Object.assign(stats, savedStats);
  mastery = readJSON(MASTERY_KEY) || {};
  const saved = readJSON(SESSION_KEY);
  if (saved) restore(saved);
  render();
  try {
    if (sessionStorage.getItem("puzzle_updated")) {
      sessionStorage.removeItem("puzzle_updated");
      setTimeout(() => toast("Updated. 已更新 ✓ v" + (versionMeta.v || "")), 400);
    }
    if (versionMeta.v) localStorage.setItem("puzzle_v", versionMeta.v);
  } catch (e) {}
  registerSW();
}
boot();
