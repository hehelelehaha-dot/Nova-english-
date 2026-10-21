# PROGRESS (2026-10-20, America/New_York)
- [x] 1 Dark-theme dark text: bold-mode color overrides no longer apply in t3/t6; header title bold fix; countdown/greeting/quote-bar test across bold×5 zoom levels (t3/t6/t7). Dark-bg text must be ≥4.5.
- [x] 2 Quote bar under greeting card, all 8 themes; 30 s auto + fade; tap mascot/quote = next + restart timer; shuffle-bag (crypto RNG, persisted nova_qbag_<theme>); animated mascot per theme (reduced-motion respected, 44px+, aria 换一句).
- [x] 3 ① sentence numbers front/back; last card per topic (nova_last_<topic>) restored below sticky toolbar.
- [x] 4 t6 iPhone squeeze: today/total chips stacked under countdown on phones.
- [~] 5 Quotes: counts in content/quotes.md + dabing_quotes.md; below 50 for every theme (not padded).
- [ ] 6 GPT Topic 10 edits — NOT started (source copy at agent attachments; export/gpt/T10_gpt.md not yet written).
- [x] 7 Regression: all suites ALL OK except test_laseq (hangs without summary, pre-existing; its checks print ok); check_clips 247/0; themes iPad/iPhone × normal/bold.

## 2026-10-20 18:55 ET · Topic 10 GPT 编辑
- 第 1 步：box 上找不到 GPT 附件，没法逐字保存。export/gpt/T10_gpt.md 是根据已应用数据重建的版本，并标注了"非逐字"。
- 第 2 步：62 条定义、13 条 R 中文（58 张卡的 src.zh 同步）、POS 修正（guess n. / lying / puppeted）、底层逻辑、6 个新词（W63–68）、chunks 15→37（22 条都逐字一致）都已完成；原文完整性检查：408 个字段，0 处改动。
- 第 3 步：音频已重生成；③ 的 1079s 变成 2283s，插入 136 处。修了一个时间轴漂移：mp3 拼接时长和 linestarts 对不上，导致 rorder 测试失败；现在逐句 whisper 对齐。check_clips 0 个问题，test_laseq 通过。
- 新增：卡片和 chunk 的"讲解"(note) 行现在能显示了。
- 2026-10-20 19:09 T11 GPT suggestions saved to export/gpt/T11_gpt.md (review only, no app changes)

## 2026-10-20 19:19 ET · Topic 11 GPT 编辑（全部采纳）
- 第 0 步：备份 → backup_t11_1919
- 第 1 步 19:33：文本完成（31 条 R 中文含 R14 去“通常”；60 个 W/E 释义；24 条讲解；8 个新卡 116–123 含 subscribers（拓展卡，原声里没有此词）；chunks 15→46）。音频：② 释义/新卡重 TTS，③ 全部 615 行重生成，按实际时长拼接 + 逐句 whisper 时间。
- 第 2 步 19:51：build 通过（③ 1937s→4378s，246 处插入）；新 chunk 原声 whisper 抽查 15 条有半个邻词/截断，已逐条重剪（o22 rises in status 原声实为 rise in status，文字不改）；chunks all.mp3 按实际时长重拼。修复 chunk 页高亮重复（dsegHTML 跨点读段时重复输出整段高亮）。大冰主题换成 Nova 的图片 icons/m_dabing.webp（320px，暖色圆底，点按 = 弹跳/倾斜 + 灯光发亮）。
- 第 3 步 20:02：部署 633e216（sw 8647473e56）；export_gen / export_yy 已重跑。另：主题列表去掉 ⋯ / 长按菜单 / 提示行。
- 20:29 加密 build（AES-GCM，固定 salt 存 app/.enc_salt，以后部署设备不用重新输入密码）；test_unlock ALL OK 6；部署中
- 20:31 已部署 437dd49（sw 14d8d02704），线上 meta enc:true，明文路径 404，线上解锁测试见报告
- 20:41 T11 7 个新词 📖 拓展词条（expand/data7.py；subscribers 原本已有）；原文 diff 0；加密 build（salt 不变）部署
- 20:42 大冰图片改为透明抠图（去掉圆底，清理白边，仅 drop-shadow）
- 部署 3722f7f（sw bc2be196f4），export 已重跑
- 20:49 金句栏：只有点吉祥物才换下一句（去掉金句文字的点击）；test_qtap 全主题 iPad/iPhone 通过
- 21:35 纳瓦尔主题：猫头鹰换成 Nova 的《纳瓦尔宝典》贴纸图 m_naval.webp（金句栏 + 顶栏），点按动画 qmPage；test_qtap / test_themes 通过

## 2026-10-20 22:17 ET · Topic 13/14（Nova 的 zip）
- 第 0 步：zip 解压到 /workspace/nova/import/t13_14/
- 22:32–23:10 T13 已生成（未部署）：naval_t13 8 句(TTS+原声 oa/点读 seg)、t13v flash/long 23（tt whisper）、ch_t13 22（含讲解）、wordforms t13v 14 题（verbs.py 已加 VB）、拓展 expand/data99_t13_14.py、漫画 c13_1、catalog 追加。test_t13 ALL OK 14；check_clips 0；原文 verbatim 0 差。备份 backup_t13_2232/。words_merged T13 段换成 large-v3 词时间。
- 进行中：chunk 原声剪辑修正 import/t13_14/chfix3.py（短 clip 带邻词）
- 23:2x 修 底层逻辑一致：去掉与旧拓展重复的 internal/align/go around 条目；T13 go around → 词卡名 go around doing（意思不同）；gloss emoji/底层画面与拓展同步
- 23:3x T13 检查点部署 d1b2a5b（sw ef1999ce14，加密，pw-absent）；test_logic 17/test_t13 14 全过
- 23:4x 线上确认 ef1999ce14；export 已重跑（注意：export 脚本只到 T12，需加 T13/14）。开始 T14
- T14 read/vocab/align/segs 完成
- T14 chunks gen 完成（words_merged T14 段换 large-v3）
- T14 chunks 24（去掉 got hit hard：原声听不到 hit）；开始 chfix3 + 词卡音频
- T14 拓展/WF/catalog 完成；漫画 c14_1 c14_2 提示已写
- c14_1/c14_2 图片已生成并 pack
- c14_1/c14_2 图片已 pack
- 00:0x T14 chfix3 完成：18/24 通过 whisper 复核，6 条未解决保留原剪辑（3,4,6,7,8,14）；词卡音频进行中
- T14 词卡音频+tt 完成（30）
- 00:2x T14 测试：test_t14(13+14) ALL OK 27、test_logic 18、test_laseq/test_qtap ALL OK、check_clips 269/0
- 00:3x T14 部署 9ceb76dd（sw 15e4305d76，加密，pw-absent，线上已确认）；export_gen/export_yy 扩到 T14 并重跑
## 2026-10-21 00:47 ET · ① 背面显示该句全部 ②③ 词卡 + ④ chunks
- 01:0x build/back_items.py（build 中自动生成 s.bkw/s.bkc）+ app.js 背面分组 生词 / 搭配·Chunks + 背面可滚动；test_back.mjs
- 01:2x 测试：test_back ALL OK 4（940 词引用/255 chunk 引用 0 缺失 0 孤儿）、test_t912 38、test_dseg 13（修 T13/14 seg 末尾超出 clip）、test_logic 18、test_t14 27；export_gen 加背面生词/Chunks
- 01:3x 部署 5b22cc0a（sw ebbd60b2db，加密，pw-absent，线上确认）；export 重跑
## 2026-10-21 10:01 ET · 大冰主题 +50 书摘
- 10:5x dbbook.json +50（27→77，书摘 39→89 含直播 12）；dabing_quotes.md 第二批表含每条来源；修正“《书名》”占位标题

## 2026-10-21 13:0x ET · Topic 12 GPT 审核（只审不改）
- GPT 原件逐字存 export/gpt/T12_gpt.md。app 文件未改、未部署。
- GPT 共：R 翻译 20 条、W/E 释义 40 对 + 细节 9 条、新词 7、新 chunk 19、逻辑说明 5。ID 与现有 R01-22/W01-40/C1-15 对得上。
- 硬错：新词仅 as opposed to 在原文（且与 C14 重复）；adhere to/introspective/align with/trade-off/give up/pay a cost 原文没有。
  chunk 不逐字：be struggling with yourself、seep in at…、the moments I’m proud of、few and far between、make a sacrifice for、take some sort of cost、even if I’m not being loved、hold someone to a standard、give up X for Y；重复：C21=C8、C26≈C10、C29=C14、C30≈C15、C32≈C13。
  词头：W20/W27/W30 GPT 改成了原文没有的形式（hold someone to a standard / few and far between / make a sacrifice），保留原词头只换释义。
- 待 Nova 定方案。
- 13:2x 开始执行 T12 方案；备份 backup_t12_1307
