# References Index

本目录说明成长大师主 skill 的渐进式加载顺序。主入口先读 `SKILL.md`，再读 `references/core-workflow.md` 生成 `route_id`、`response_contract` 和 `dimension_plan`，随后按 route 读取必要 reference；不要一次性展开全部文件。

| 文件 | 读取条件 | 职责 |
|---|---|---|
| `references/core-workflow.md` | 每次触发后先读 | route 判定、最小读取集、`response_contract`、`dimension_plan`、执行深度和升级逻辑 |
| `references/dimensions/index.md` | 业务分析 route 命中后 | 六维映射、route 到维度集合、summary/full/focused 等读取深度 |
| `references/00-意图路由与输入预检.md` | 输入不完整、行业口径不清或需要预检时 | 输入预检、route 辅助、越界和工程细节剥离 |
| `references/01-能力圈与框架适配分析.md` | 单股轻量版、完整版 | 判断成长投资方法论框架适配度和六类公司归类 |
| `references/02-行业生命周期评估.md` | 行业直问、单股分析、生命周期单维度 | 调用行业分析原子 skill 并叠加成长大师生命周期框架 |
| `references/03-行业景气度评估.md` | 行业直问、单股分析、景气度单维度 | 调用行业分析原子 skill 并生成景气度判断 |
| `references/04-企业盈利预测.md` | 单股分析、盈利预测单维度 | 调用财务分析原子 skill 并生成三情景盈利判断；只做业务编排，不维护查询参数 |
| `references/05-PEG估值分析.md` | 单股分析、PEG/估值单维度 | 调用估值分析原子 skill 并生成 PEG 成长匹配结论；只做业务编排，不维护查询参数 |
| `references/06-成长股特征匹配编排.md` | 单股分析、成长股特征单维度、批量筛选 | 调用成长股特征匹配原子 skill；只做业务编排，不维护查询参数 |
| `references/07-综合输出与表达规范.md` | 所有最终输出 | 轻量版、完整版和行业/单维度输出规范 |
| `references/08-调用链路与数据补充.md` | 涉及跨原子 skill 数据补充时 | 规定主 skill、分析 skill、查询 skill 的交接边界 |
| `references/09-输出前校验与合规.md` | 最终输出前 | 检查结构、链接、合规、禁词和交易化表达 |

原子 skill 位于 `skills/`，主 skill 和 references 只能读取它们的标准输出，不读取原始接口响应。底层数据访问、分页、字段和接口命令只允许由 L1 查询 skill 内部声明和维护。
