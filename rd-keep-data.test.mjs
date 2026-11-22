// A reading board can hide lines through its own data keep list (d.keep, 1-based original line numbers).
// Hidden lines vanish from rows (and 句子听写), but kept lines keep their original index i (☀ / 单词卡 si stay valid).
import assert from "node:assert/strict";
import fs from "node:fs";
import {createContext, runInContext} from "node:vm";
const app = fs.readFileSync(new URL("./app.js", import.meta.url), "utf8");
const src = app.slice(app.indexOf("const RD_KEEP="), app.indexOf("// nova_dt_* stores"));
const g = {}; runInContext(src + "\nthis.rdRows=rdRows;this.dtRows=dtRows;", createContext(g));
const d = {sents: [{t: "A", oa: "a"}, {t: "Yeah."}, {t: "C", oa: "c"}, {t: "Right.", oa: "r"}], keep: [1, 3]};
const rows = g.rdRows(d);
assert.deepEqual(rows.map(r => [r.i, r.n, r.s.t]), [[0, 0, "A"], [2, 1, "C"]]);
assert.deepEqual(g.dtRows(d).map(r => r.i), [0, 2]);
assert.equal(g.rdRows({sents: d.sents}).length, 4, "no keep list: every line");
console.log("rd-keep-data ok");
