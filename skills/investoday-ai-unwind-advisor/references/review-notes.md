# Review Notes

## Validator

### Dify DSL validator

命令：

```bash
python3 /Users/kenneth/My/Codes/External/3-Python/LLMs/skills/内部/dify/dify-workflow-dsl-creator/scripts/validate_dify_workflow.py /Users/kenneth/Desktop/TMP/数据/dify-dsl/AI解套.yml
```

结果：

- `40 error(s)`
- `7 warning(s)`

主要问题：

- 多个 tool 节点的 `plugin_unique_identifier` 版本与 dependencies 声明版本不一致。
- `investoday/base`、`investoday/stock`、`investoday/research-report`、`investoday/news`、`investoday/announcement`、`investoday/industry`、`investoday/index`、`investoday/fund` 等插件均存在不同程度版本漂移。
- 部分 stock 工具节点 `paramSchemas` 缺少本地声明参数，例如 `stockCodes`、`pageNum`、`pageSize`、`industryCodeLv1`。

判断：

- 用户已确认原 DSL 在目标 Dify 环境中可运行。
- 本地 validator 失败应理解为“本地校验基线/插件版本与目标 Dify 环境不一致”，不作为 DSL 运行性否定。
- 本次任务是从已有 workflow 反向沉淀业务 Skill，因此继续按业务抽象处理；validator 结果仅作为本地复验限制记录。

### Extractor

命令：

```bash
python3 /Users/kenneth/.skills-manager/skills/dify-dsl-to-investoday-business-skill/scripts/extract_dify_workflow.py /Users/kenneth/Desktop/TMP/数据/dify-dsl/AI解套.yml --output-dir /Users/kenneth/Desktop/TMP/数据/dify-dsl/AI解套-conversion/extracted --copy-original
```

结果：

- 结构提取成功。
- 已生成 `workflow-summary.md`、`node-details.md`、`tool-mapping.md`、`original-dify-workflow.yml`。

## Author

- 已从 DSL 还原出业务目标：个股被套后的解套方案生成。
- 已保留原始 DSL、节点摘要、工具映射。
- 已生成 draft Skill 包，但未挂载、未发布。
- 已更新工具边界：常规金融数据和解套信号使用 `investoday-finance-data` references，其中常规 `references/` 接口和两个解套信号接口通过 `investoday-api` CLI 调用；仅 ETF 轮动策略和 ETF 入选理由生成使用 `api.json` 定义的 path，并通过 `investoday-finance-data/scripts/call_api.js` 调用。

## Reviewer

通过项：

- 目标 Skill 以 `investoday-` 开头。
- 已固定接口定义来源：常规金融数据和解套信号依赖 `investoday-finance-data` references；ETF 轮动策略和 ETF 入选理由生成依赖 `api.json`。
- 已保留免责声明。
- 已将解套信号、ETF 轮动和 ETF 入选理由按新版接口定义来源与 Key 归属写入正式调用链。
- 输出格式与原 DSL 的核心章节保持一致。
- 已根据多代理评审补回 DSL 关键阈值、七类方案分支、输出顺序和 ETF 一致性约束。
- 已移除旧版 `investoday/internal` 口径；正文工具清单改为分流执行口径：常规接口走 `investoday-api` CLI，ETF 轮动策略和 ETF 入选理由生成走 `node scripts/call_api.js`。

风险项：

- 解套信号统计/明细与其他接口均统一使用 `INVESTODAY_API_KEY`，包括行业持仓基金、基金技术指标以及 `api.json` 定义的 ETF 轮动策略、ETF 入选理由生成。
- 本地 validator 与目标 Dify 运行环境的插件版本基线不一致；若未来要在本机校验或跨环境迁移，需要先同步插件版本/依赖基线。
- 用户确认保留原 DSL 的“解套方案/主推策略”语气。
- 原 DSL 的“主推策略/止损/换股/波段”等词有投资建议风险，正式版保留语气但必须保留免责声明和证据约束。

## Multi-agent Review

已按用户要求进行多代理全面验证，四个只读评审结论如下：

| 视角 | 评分 | 主要结论 | 已处理 |
| --- | --- | --- | --- |
| 业务还原度 | 7/10 | 初稿业务方向正确，但缺少 DSL 阈值、七类方案分支和输出硬约束 | 已补回被套/仓位/波段阈值、方案分支还原表、ETF/备选标题约束 |
| 工具边界 | 7/10 | 正文混入旧版 internal/脚本调用口径，容易误读调用方式 | 已明确 references/api.json 定义来源、`investoday-api`/`call_api.js` 分流和统一 `INVESTODAY_API_KEY` 口径 |
| 技能规范 | 7/10 | 可进入用户确认阶段；需处理字段命名和投资建议措辞 | 已固定 `position_ratio` 新字段；用户确认保留原语气 |
| 发布可用性 | 5/10 | 可作为转换草稿，不适合直接挂载/发布；主要受工具边界和真实样例未验证影响 | 用户已确认原 DSL 可运行；用户确认暂不挂载/发布 |

## Validator

未完成项：

- 两个解套信号接口、ETF 轮动和 ETF 入选理由均按 `INVESTODAY_API_KEY` 口径持续验证不同股票场景。
- 旧版 `investoday/internal` 口径已废弃，正式 Skill 不使用旧版脚本或 internal 节点调用方式。
- 未对任一股票样例生成真实报告。

## Remaining Risks

- 两个解套接口若返回权限错误或异常，对应维度必须降级为“该维度数据不足，暂无法判断”；除此之外所有接口仍应使用 `INVESTODAY_API_KEY` 正常获取。
- 若正式发布，需要先用真实股票样例验证输出不会越过证据边界。
- 任何输出均不应构成投资建议。
