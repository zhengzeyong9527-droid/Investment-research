# 国信证券数据地址与授权配置说明

本文件记录券商版交付包的数据服务地址、授权豁免口径和运行时覆盖方式，不写入真实密钥值。

## 券商信息

- 券商名称：国信证券
- 券商英文编码：`gs`
- 信息来源：用户提供的券商数据服务配置描述

## API 调用地址

- 默认调用地址：`http://61.142.2.100:1443/data`
- 运行时可通过环境变量 `GS_API_BASE_URL` 或 `BROKER_API_BASE_URL` 覆盖。
- 测试环境和生产环境地址应由券商项目负责人分别确认。

## 授权方式

- 当前默认内网数据地址豁免 `apiKey`，运行 `scripts/gs-api.js` 时不需要配置 `GS_API_KEY` 或 `BROKER_API_KEY`。
- 如后续环境重新启用授权，可通过运行环境变量 `GS_API_KEY` / `BROKER_API_KEY`，或交付包外的 `gs-api.config.json` 提供可选密钥。
- 真实密钥不得写入交付包。

## 配置要求

- 由券商运行环境或项目配置系统确认 API 调用地址，并在生产上线前复核运行时覆盖变量策略。
- 不要把真实 APIKey、Token、密钥写入 `SKILL.md`、`references/`、`scripts/`、示例命令或转换报告。
- 若未来环境重新启用授权，测试环境和生产环境的密钥应分开申请、分开配置、分开轮换。
- 交付前应由券商项目负责人确认 API 调用地址和授权豁免口径。

## 回归检查

- 确认 `scripts/gs-api.js status` 输出 `apiKeyRequired: false`。
- 确认未配置 `GS_API_KEY` 时，`scripts/gs-api.js` 不会因缺少 APIKey 直接失败。
- 确认 `scripts/gs-api.js` 默认调用地址为 `http://61.142.2.100:1443/data`，且运行时覆盖变量可用。
- 确认输出模板和示例命令不展示真实 APIKey。
- 确认交付包没有沿用标准版 APIKey 初始化说明。
- 确认交付包没有沿用标准版 API 调用地址。
