# OpenRouter 免费模型接入（V4 当前状态）

2026-11-23：当前 Key 已验证可用，继续留在后端 `.env`。默认使用真实通过样例的 `dots-studio/dots-3-note-preview:free`。

## 仅免费白名单

- `dots-studio/dots-3-note-preview:free`（当前首选）
- `inclusionai/ling-3.2-flash:free`
- `google/gemma-4-31b-it:free`
- `google/gemma-4-26b-a4b-it:free`
- `liquid/lfm-3-1.7b:free`
- `baidu/ernie-5.5-flash-preview:free`

只允许 OpenRouter 官方 endpoint。每个请求携带 `allow_fallbacks:false`、`require_parameters:true` 和 `max_price:{prompt:0,completion:0,request:0}`，不发送 `models`、收费插件或通用 router。应用只在可恢复的上游错误时再尝试一个明确的免费候选，总计最多两个模型、共享 45 秒期限。认证错误／账户免费日配额耗尽／网络错误／非零费用或无效内容停止，不无限重试。`MOVEQUEST_AI_FALLBACKS=off` 可禁用应用层切换。

这不代表六个免费模型效果相同或一直可用：真实测试中 Ling／Gemma 返回过 429，部分模型的额外推理输出曾耗尽 token 上限。对允许关闭推理的候选关闭额外推理后，Dots 完成了基础与 V4 样例。强制推理模型保留其必需设置和有界输出预算。

## 后端环境

```dotenv
OPENROUTER_API_KEY=
OPENROUTER_MODEL=dots-studio/dots-3-note-preview:free
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
MOVEQUEST_AI_DAILY_LIMIT=8
PORT=5176
```

现有 `.env` 已配置 Key，不需要重新创建或覆盖。省略 MODEL 时也使用 Dots。旧 `MOVEQUEST_AI_KEY`、`MOVEQUEST_AI_MODEL` 是兼容别名，两个 model 设置冲突时停止；未知模型或非官方接口被拒绝。Key 不在前端、浏览器存储、日志或报告中，`.env` 被 Git 忽略。修改环境后重启 `npm run serve`。

## 真实验证

```sh
npm run test:ai:live
npm run test:ai:live -- --extended
```

普通 `npm test` 和常规 E2E 不调用真实模型。显式 live 脚本只使用虚构生活描述，先读取官方零价格端点元数据，再执行有界免费请求。报告保留结构化 JSON、tokens、上游费用、日期和模型，绝不包含 Key。

- [基础中文三组](OPENROUTER_LIVE_RESULT.json)：工作日时间／地点、周末公园增量、缺失时间留空。
- [V4 扩展六组](OPENROUTER_V4_EXTENDED_RESULT.json)：英文、约时、跨夜、不规律频率、矛盾时间、显式偏好与行动限制。
- [稳定 ID 纠错](OPENROUTER_V4_CORRECTION_RESULT.json)：只改工作时间，不改无关事件。

以上关键断言通过，成功响应均返回 `usage.cost:0`。这是有限样例验证，不是普遍准确率。另已在隔离真实浏览器中完成描述→同源后端→免费 AI→资料确认→五地点城镇的路径。历史失败记录保留，不能将早期 429 或截断当作成功。

官方依据：[模型目录](https://openrouter.ai/api/v1/models)、[零价格上限与路由规则](https://openrouter.ai/docs/guides/routing/provider-selection)、[推理参数](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)。
