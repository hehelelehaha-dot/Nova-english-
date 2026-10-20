# PROGRESS (2026-10-20, America/New_York)
- [x] 1 Dark-theme dark text: bold-mode color overrides no longer apply in t3/t6; header title bold fix; countdown/greeting/quote-bar test across bold×5 zoom levels (t3/t6/t7). Dark-bg text must be ≥4.5.
- [x] 2 Quote bar under greeting card, all 8 themes; 30 s auto + fade; tap mascot/quote = next + restart timer; shuffle-bag (crypto RNG, persisted nova_qbag_<theme>); animated mascot per theme (reduced-motion respected, 44px+, aria 换一句).
- [x] 3 ① sentence numbers front/back; last card per topic (nova_last_<topic>) restored below sticky toolbar.
- [x] 4 t6 iPhone squeeze: today/total chips stacked under countdown on phones.
- [~] 5 Quotes: counts in content/quotes.md + dabing_quotes.md; below 50 for every theme (not padded).
- [ ] 6 GPT Topic 10 edits — NOT started (source copy at agent attachments; export/gpt/T10_gpt.md not yet written).
- [x] 7 Regression: all suites ALL OK except test_laseq (hangs without summary, pre-existing; its checks print ok); check_clips 247/0; themes iPad/iPhone × normal/bold.

## 2026-10-20 19:05 ET · Topic 10 GPT 编辑
- 第 1 步：box 上找不到 GPT 附件，没法逐字保存。export/gpt/T10_gpt.md 是根据已应用数据重建的版本，并标注了"非逐字"。
- 第 2 步：62 条定义、13 条 R 中文（58 张卡的 src.zh 同步）、POS 修正（guess n. / lying / puppeted）、底层逻辑、6 个新词（W63–68）、chunks 15→37（22 条都逐字一致）都已完成；原文完整性检查：408 个字段，0 处改动。
- 第 3 步：音频已重生成；③ 的 1079s 变成 2283s，插入 136 处。修了一个时间轴漂移：mp3 拼接时长和 linestarts 对不上，导致 rorder 测试失败；现在逐句 whisper 对齐。check_clips 0 个问题，test_laseq 通过。
- 新增：卡片和 chunk 的"讲解"(note) 行现在能显示了。
