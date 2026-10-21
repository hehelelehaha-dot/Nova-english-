- 10-21 ET: app.js 内联 DBB 同步为 dbbook.json（76 条书摘；原 #5「到死之前…」此前已从 app 移除，json 同步删除）→ t6 池 88 条（12 直播 + 76 书）。
- 10-21 ET: 发现 app/build/ 在 09:01 box 恢复中丢失；从 tests_backup/ 重建 build/（build.py 改为读 .enc_salt 固定盐 VDsY、加 card_logic/back_items 可选钩子；重写 back_items.py；旧 la_seq/src_orig 会重复处理已处理内容，已停用为 .off，content 已还原）。新 test_t6q.mjs：ALL OK 6（池 88、标签、无重复、≤60 字、无 JS 错误）。
- 10-21 ET: 加密构建（salt VDsY）→ sw 6ed1366203，部署。
- 10-21 10:19 ET: 已推送 6693410，线上 sw.js V=6ed1366203 确认。

## 2026-10-21 10:50 ET · 回归核查（6693410 vs 5b22cc0 / ebbd60b2db）
- 解密新旧两版逐文件比对：3785 个内容文件明文完全一致；仅 app.js（只有 DBB 数组）、dbbook.json、dabing_quotes.md、PROGRESS.md、meta/sw 版本号不同 → 无回归。
- 数据核对：14 个 Topic × 4 区齐全；T11 123/46，T13 23/22，T14 30/24；背面 563 词/255 块；③ 长音频 T11 4378s，各 Topic tt 最大值 < 时长，无二次插入；check_clips 269 段 0 问题。线上 meta enc=true，salt VDsY，明文 content 404。
- 新建 build/test_regress.mjs（替代丢失的 test_themes/qtap/back/t13/t14）：ALL OK 19（含 t6/t7 吉祥物透明抠图、只点吉祥物换句、30s 轮换、内置磁贴无 ⋯）。旧测：timer/oloop/exzh/comic/scroll/srs/laseq 通过（srs 期望改为 t14、laseq 去掉已删的 p47）；t912（旧的 gloss==flash 断言）、sun（旧布局）、osent（p55 已删）为过时断言，非回归。test_logic 无法从 git 恢复（从未入库）。
- build/ 备份：/workspace/nova/backup_build_latest + 持久 store nova_build_latest.tgz（含 .enc_salt）。
