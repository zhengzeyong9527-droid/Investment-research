# SkillHub 行业分析范式参考

本文件记录本次创建行业首席 Skill 时参考的 SkillHub 样本结构。参考仅用于输出框架和组织方式，不作为事实数据源。

## 参考样本

| 样本 | 可借鉴点 | 采纳方式 |
|---|---|---|
| 行业分析师 `industry-analyst` | 前置“何时使用”，生命周期、行业空间、竞争格局、投资价值评估，模板和 examples 分层 | 采纳触发前置、生命周期/竞争/空间结构；去除交易化“投资建议”表达 |
| 专业行业研究报告生成器 `pro-research-report` | Research -> Report Writing -> Fact Checking -> Formatting 的阶段化流程，强制报告结构和来源标准 | 采纳阶段化流程和事实核验思路；不生成 DOCX/PDF，统一 Markdown |
| Buffett Analysis `buffett-analysis` | 行业一页纸模板：核心逻辑、全景分析、产业链、市场空间、竞争格局、重点标的、风险 | 采纳行业全景、产业链、公司池和风险结构；改写为今日投资合规边界 |
| 深度调研 `deep-insight` | 行业洞察、趋势、产业链、竞品、成本、作战地图等多页面拆分思路 | 采纳“模块分层”和可视化报告思路；本版本不输出 HTML 系统 |

## 采纳原则

- 触发信息放在 frontmatter `description` 和 `## 触发场景` 中，便于小模型识别。
- 主 `SKILL.md` 保留工作流和路由，详细模块框架放入 `references/`。
- 示例放入 `examples/`，避免主入口过长。
- 报告模板统一使用 Markdown，强调核心摘要、表格、证据链、引用来源和免责声明。

## 未采纳点

- 不采纳“强烈推荐/推荐/回避”等交易化或操作化投资建议表达。
- 不采纳外部网页作为默认数据源；正式证据以今日投资数据能力和用户显式提供资料为准。
- 不采纳目标价、仓位、收益空间、止盈止损等输出。
- 不默认生成 DOCX、PDF、多页面 HTML 或前端文件。

## 对本 Skill 的影响

- `SKILL.md`：使用“何时使用 + 典型话术 + 不适合什么”的前置触发结构。
- `industry-chief-workflow.md`：使用阶段化研究流程。
- `module-output-frameworks.md`：使用生命周期、空间、竞争、产业链、公司池和风险的模块化结构。
- `industry-chief-output-template.md`：吸收行业一页纸和深度报告结构，扩展为完整行业首席报告。
