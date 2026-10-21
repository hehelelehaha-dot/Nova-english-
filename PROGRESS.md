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
