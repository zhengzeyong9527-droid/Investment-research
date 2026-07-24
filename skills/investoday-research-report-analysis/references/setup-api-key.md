# API Key 配置说明

本 Skill 包通过今日投资研报数据能力获取研报列表、机构、研报舆情、研报向量片段、预测评级和评级变动。运行前需要本地环境已完成 `investoday-api` 初始化。

## 配置方式

1. 准备今日投资数据服务可用的 API Key。
2. 在本地运行环境执行初始化命令：

```bash
investoday-api init
```

3. 按命令提示完成密钥配置。

也可以使用非交互方式初始化：

```bash
investoday-api init --api-key "<API_KEY>" --auto-update --skip-verify
```

## 安全要求

- 不要把真实 API Key、Token 或账号凭据写入 `SKILL.md`、references、脚本或测试用例。
- 不要把本机私密配置、缓存路径或认证文件提交到 Skill 包。
- 用户报告不得展示密钥、认证状态、接口请求命令或内部配置路径。

## 验证方式

初始化后可执行以下命令确认本地研报数据能力可用：

```bash
investoday-api list
```

如果命令不可用，先检查 Node.js、`@investoday/investoday-api` 包和本地 PATH 配置。
