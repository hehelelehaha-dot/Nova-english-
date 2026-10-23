- 10-21 ET: app.js 内联 DBB 同步为 dbbook.json（76 条书摘；原 #5「到死之前…」此前已从 app 移除，json 同步删除）→ t6 池 88 条（12 直播 + 76 书）。
- 10-21 ET: 发现 app/build/ 在 09:01 box 恢复中丢失；从 tests_backup/ 重建 build/（build.py 改为读 .enc_salt 固定盐 VDsY、加 card_logic/back_items 可选钩子；重写 back_items.py；旧 la_seq/src_orig 会重复处理已处理内容，已停用为 .off，content 已还原）。新 test_t6q.mjs：ALL OK 6（池 88、标签、无重复、≤60 字、无 JS 错误）。
- 10-21 ET: 加密构建（salt VDsY）→ sw 6ed1366203，部署。
- 10-21 10:19 ET: 已推送 6693410，线上 sw.js V=6ed1366203 确认。

## 2026-10-21 10:50 ET · 回归核查（6693410 vs 5b22cc0 / ebbd60b2db）
- 解密新旧两版逐文件比对：3785 个内容文件明文完全一致；仅 app.js（只有 DBB 数组）、dbbook.json、dabing_quotes.md、PROGRESS.md、meta/sw 版本号不同 → 无回归。
- 数据核对：14 个 Topic × 4 区齐全；T11 123/46，T13 23/22，T14 30/24；背面 563 词/255 块；③ 长音频 T11 4378s，各 Topic tt 最大值 < 时长，无二次插入；check_clips 269 段 0 问题。线上 meta enc=true，salt VDsY，明文 content 404。
- 新建 build/test_regress.mjs（替代丢失的 test_themes/qtap/back/t13/t14）：ALL OK 19（含 t6/t7 吉祥物透明抠图、只点吉祥物换句、30s 轮换、内置磁贴无 ⋯）。旧测：timer/oloop/exzh/comic/scroll/srs/laseq 通过（srs 期望改为 t14、laseq 去掉已删的 p47）；t912（旧的 gloss==flash 断言）、sun（旧布局）、osent（p55 已删）为过时断言，非回归。test_logic 无法从 git 恢复（从未入库）。
- build/ 备份：/workspace/nova/backup_build_latest + 持久 store nova_build_latest.tgz（含 .enc_salt）。

## 2026-10-21 15:30 T15–18 build (in progress)
- Done: turns.py (audio-following text), split.py → 69 cards (T15 23 / T16 14 / T17 15 / T18 17, all ≤30 words), zh.py per-card Chinese, data.py; naval_t15–18 read TTS + oa clips + seg (words_merged.json 1569.5–1940 replaced by aligned card tokens; backup chunks/words_merged.pre_t15.json); vocab flash/long + v_audio/v_tt + la_seq m4full; chunks ch_t15–18 (chunks/gen.py); 拓展 expand/data99_t15_18.py (+ALIAS support in expand/gen.py); wordforms t15–18v (46 items, VB appended); comics c15_1 c15_2 c16_1 c17_1 c18_1 (comics/gen/v3/mk.py, pack2); catalog.
- Running: chfix3 clip checks for ch_t15..18 (log import/t15_18/work/chfix.log).
- Next: enrich.py (src sg/oa/zb, lg, notes, chunk notes/sg) AFTER chfix; rerun la_seq a15–a18; regress tests; build; deploy.
- 16:00 T13/14 re-split applied (import/resplit: resplit.py map.json apply.py read/link): T13 8→12, T14 14→17 cards (all ≤30); re-TTS, align+segs, flash/long/ch relinked, comics c13/c14 si remapped, catalog sub, la_seq t13v/t14v rerun. Backup of pre-split content: backup_pre_resplit_content/.
- T15–18 enrich done for flash/long (NOCH=1); la_seq rerun. chfix t15 done (4 unresolved: kept gen.py cut), t16–18 running.
- 17:20 chunk clip checks done (unresolved kept: t15 #2,#6,#10,#13; t17 #4,#12,#15; t18 #6,#11,#12). Diff 0 (T13/14 vs pre-split, T15–18 vs turns.py). Tests: regress ALL OK 25 (18 topics, backs 646/344, max 30 words), ceosent 19, comic 47, exzh 19, laseq 32, oloop 23, srs 7 (expect t18v newest), timer 7. Encrypted build → deploying.
- 17:35 DEPLOYED 9a1966c (sw 50b1c7aa4d). Backups refreshed (backup_build_latest, store tgz incl. import/t15_18 + import/resplit).
- 16:20 ③ m5pre: export/gpt/la_seq_m5.py (原句 also before each word: tt.s0 item start, tt.o0); app.js ts uses s0 + .lo highlight at o0 (backup app.js.pre_o0). Running main() on all longaudio. overcome own 拓展 entry (🏃); c17_1 redrawn w/o LIBRARY.
- 17:05 m5pre all 18 decks rebuilt (0 order errors); tests: laseq 34 (new pre-order + 原句 highlight checks), new test_laskip 3, regress 25, comic 47, exzh 19, ceosent 19, oloop 23, srs 7, timer 7. Diff 0. Deploying.
- DEPLOYED 03a8005 (sw aa5ef7a575); backups refreshed.
- 16:45 ET: Nova said 原句 only before 1st word. Verified audio (t05/t12/t17 words 2,3,10 transcribed) + live files == local + browser 连播 test (test_laskip 6) → content correct; cause = stale old version on iPad. Single-card change reverted. Cache bump (app.js comment) deploy.
- DEPLOYED fd5fe38 (sw 0b62714d08); backups refreshed.
- 17:05 ET: 板块三 request ambiguous — app has no per-card continuous mode other than ③ longaudio (home order ①阅读卡 ②单词卡 ③英英解释音频 ④Chunks). Reverted pending patch; nothing deployed; asked parent to confirm.
- 17:40 ET: 从这里听 everywhere starts with 原句. ③ (viewLong): ▶ 从这里听 / tap word → tt.s0 (lead 原句); main ▶/跳过/seek already used s0. ④ Chunks ▶ 从这里连播 → plays the item's whole sentence clip(s) (sg oa) once, then track from chunk (no sg → no lead). Only ③④ have 从这里. Verified t10v word1 0–7.7 s = 原句 then "Number one, live up to". Tests: laskip 11, regress 25, laseq 34, ceosent 19, oloop 23.
DEPLOYED 7818861
- 19:20 ET: ③/④ progress bar fix. Cause: encrypted build plays decrypted blob: audio; iPad Safari reports duration=Infinity for it → native bar = elapsed only, dot stuck left. (Each topic's ③/④ is ONE mp3 — t11v 5411 s — not separate clips; 从这里连播 lead clip uses separate global player, untouched.) Fix: content/*.json longaudio + ch_* get "dur" (ffprobe; 36 files — re-add if la_seq/gen rewrites them); app.js seekBar(): custom range + elapsed/total (H:MM:SS), native controls removed, ±10秒 via au.seekTo clamped. test_laskip 19 (forced duration=Infinity: total 1:30:11, drag 3000, ±10). regress 25 laseq 34 ceosent 19 oloop 23 comic 47.
- DEPLOYED ca5b0759 (sw dc8033c820); backups refreshed.
- 10-22 11:30 ET: ③ 乱序 toggle (all topics; ④ untouched). Button "🔀 乱序" in ③ player row after 10秒⟳ (gold "乱序：开" when on); saved in localStorage nova_shuf3 (default off = ordered). On: random permutation, paused at 1st shuffled entry's 原句; when an entry's block ends naturally (or file ends) → next unplayed, non-跳过 entry's s0; no repeats; label "正在播放：N. word（乱序 k/n）"; end → "乱序播放完毕", new order. Bar/±10秒/drag = real file time; manual seek/从这里听/tap makes that entry current (counted played) and shuffle continues from there. New test_shuffle 16; laskip 19 regress 25 laseq 34 ceosent 19 oloop 23 comic 47 srs 7 timer 7.
- DEPLOYED b74bd60b (sw c56ebf0f41); backups refreshed.
- 10-22 13:10 ET: ① reading toolbar: ■ 停止 moved to first position (all topics; nothing else changed). Other 停止-at-end toolbar: comic page (🌻 整段原声, ■ 停止) — not changed. Tests: regress 25 oloop 23 ceosent 19 laskip 19 shuffle 16 laseq 34 comic 47 srs 7 timer 7. Shot app/test/r1_stop_first.png.
- DEPLOYED 0efc236a (sw dda11305c1); backups refreshed.
- 10-22 15:50 ET: clip-end fix. Cause: some original sentence clips (oa) were cut ~0.3–0.5 s too early (word-timestamp end too early), so card ▶/点读/③④ 原句 lost the last word(s); 原声连播/循环 (all.mp3) were fine. Scan (/tmp/scan.py: medium.en on all.mp3 window vs clip end, all 345 cards; suspects re-checked by transcribing the clip alone) → 3 real cuts: T3 #6 (relatively open-ended), T14 #15 (test), T17 #7 (here). Re-cut from full.m4a with orig/fix_cut_ends.py (4.42/3.17/2.90 s), seg end + sg/oab relinked (t03v/t14v flash+long, ch_t14, ch_t17), la_seq_m5 rebuilt t03v/t14v (seqsig forced). TTS clips all complete. T3 #6 zh → 虽然很多这类游戏都非常诱人，关卡很多，而且相对开放，没有固定的结局。 (naval_t03 + 5 src copies each in t03v_flash/long; zb relatively→相对, open-ended→开放，没有固定的结局; zbfix.py source updated; backup backup_pre_zh_t03c6/). Tests regress25 laskip19 shuffle16 laseq34 ceosent19 oloop23 comic47 srs7 timer7 exzh19; check_clips 0.
- DEPLOYED 1933ca8e (sw f298017640); backups refreshed.

## 2026-10-22 open-ended gloss + text-follows-audio + ① flat back
- open-ended gloss unified everywhere: 开放式的；没有固定结局的 / 底层逻辑 没有封口，结局不是定死的。 (duplicate open-ended gloss row removed in naval_t03). Script orig/textfix_1022.py; backups backup_pre_textfix_1022/.
- Text follows audio: T3#6 "that are relatively open-ended" → "and are relatively open-ended"; T14#15 → "And this goes back…". Updated cards, ②/③/④ (t03v/t14v flash+long), wordforms, chunks, expand + source data files. AI TTS s06 (T3) / s15 (T14) regenerated (Whisper-verified). ③/④ use original clips → no re-cut / dur change. Chinese unchanged (T3 already 而且, T14 又 covers And).
- ① back flat: style.css `#ss .s.zh .zhb` max-height:none; overflow:visible (was 70vh inner scroll). New test build/test_flat.mjs (ALL OK 9, iPad 820x1180, T5#9); screenshot app/test/r1_back_flat_t05.png.
- Tests: regress 25, laskip 19, shuffle 16 (1 random flake, rerun ok), laseq 34, ceosent 19, oloop 23, comic 47, srs 7, timer 7, exzh 19, flat 9.
- DEPLOYED 5a908d3e (sw 6aa238a566); backups refreshed.

## 2026-10-22e last card cut off in 原声连播/原声循环 (T7#6, T5#11)
- Root cause: the topic track audio/tNNo/all.mp3 was cut at the fixed topic window end in orig/align.py (T7 492.5s, T5 362.5s), but the last card's sentence runs past it (T7: 1.24s missing "…waste your energy and waste your time"; T5: 1.8s missing "…the entire experience of getting there"). Per-card clips (▶, 全部连播 AI/TTS) were complete.
- Fix: orig/fix_all_tail.py re-cuts t05o/t07o all.mp3 from the same start (all ot unchanged) to last clip end + 0.25s (T7 28.97→30.53s, T5 →77.88s). Whisper-verified. Backup backup_pre_allfix_1022/.
- Scan of all 18 topics (/tmp/chkall.py: ot+clip vs next ot / track end): only T5, T7 last cards affected; other overlaps are ≤0.5s clip padding.
- Note for Nova: in T7 Naval says "you can't be great at everything" twice; card 6 = the 2nd; in 原声连播 the 1st plays under card 5's highlight (not changed).
- New test build/test_lastcard.mjs (single ▶ / 全部连播 / 原声连播 / 原声循环, T7 + T5): ALL OK 9. Regression all pass (shuffle 1 random flake, rerun 16/16).
