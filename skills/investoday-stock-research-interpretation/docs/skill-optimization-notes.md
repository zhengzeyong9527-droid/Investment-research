# Skill 优化说明

## 改造目标

本次将 `investoday-stock-research-interpretation` 从单文件文字报告 Skill，升级为符合 `investoday-business-skill-creator v3.5.0` 的单业务 Skill 包。改造重点是结构规范化、数据契约独立化、公司研究报告输出、HTML 图表增强能力和合规边界强化。

## 保留项

- 保留“单只 A 股股票或公司线索作为入口”的使用方式。
- 保留“近 90 天研报舆情”为核心证据来源。
- 保留宏观环境、行业主题、风险因素、情景分析、观察维度的研究边界。
- 保留不提供交易建议的合规边界。

## 新增项

- 新增 `references/` 数据契约、图表规范和合规边界规范。
- 新增 `assets/templates/` Markdown 与 HTML 输出模板。
- 新增 `examples/` 示例报告和测试用例。
- 新增 `CHANGELOG.md`。
- 增加公司研究报告结构和 HTML 可视化报告页契约。
- HTML UI 规范接入 `investoday-design` 今日投资金融报告UI规范，明确粉紫弥散 token、玻璃拟态卡片、图表色板、表格滚动和深色模式要求。

## 修正项

- 将 `stock/basic-info` 方法从旧文档中的 GET 修正为 CLI 确认的 POST。
- 移除 frontmatter 中对外部 Skill 的硬依赖声明，将接口能力转入正文和数据契约说明。
- 将图表限定在研报舆情、有效研报片段摘要与业绩预期字段内；新增 `report/stock-forecast-ratings` 仅用于业绩预期汇总，评级和目标价只按机构研报原始口径展示。
- 将默认 Markdown 标题统一为 `# [公司名称]研究报告`。
- 删除 Markdown 正文中的旧图表一级章节，图表数据改为嵌入研究表格或用于 HTML “研报信号看板”。
- 将公司相关内容明确为 `公司业务与研报主题映射`，避免使用含义模糊的章节名。

## 未采纳项

- 不默认生成 HTML 文件；只有用户明确要求 HTML、H5、研究报告页、数据看板或可视化报告时才生成。
- 不生成 `agents/`、`metadata.clawdbot.quality_pipeline` 或 Subagent 质量流水线。
- 不创建 `skills/` 子目录或主子 Skill 嵌套结构。
- 不接入行情、资金流、K 线或交易信号图表；目标价和评级不做建议卡片或变化图，只能作为机构研报口径进入业绩预期表或证据表。

## 后续建议

- 若未来要增加行情、资金流或财务指标图表，应创建新的业务 Skill 或先重新确认合规边界。
- 若未来要做主 Skill + 多个原子 Skill 协同，应转交多 Skill 创建流程，不应继续扩展当前单业务 Skill。
