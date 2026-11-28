# MoveQuest V7.1

运行 `npm run build` 和 `npm run serve`，打开[个人版首页](http://127.0.0.1:5176/)。初次使用时确认自己的日常，之后从「今日」「我的世界」「微运动」「我的生活」进入。正式构建使用真实时长和独立的个人记录，旧的演示路径会转到个人版。

可以用 AI 整理日常，也可以选择「在本机整理」。动作可在本机搜索和筛选，完成后需本人确认。数据保存于浏览器，端口、协议或主机变化后会使用另一份本地存储。

## 以往版本记录

以下 V3–V7 演示文档和命令仅用于历史复测。隔离演示由测试构建保留，普通构建从个人空间开始。

## V4 演示入口

打开完整服务 `http://127.0.0.1:5176/demo`，可载入隔离示例世界、切换事件、反馈学习、扩展公园并编辑装饰。语音转写需浏览器支持；文字始终可用。

- [V4 最终验收与限制](docs/MOVEQUEST_V4_FINAL_ACCEPTANCE.md)
- [五分钟演示稿](docs/MOVEQUEST_V4_DEMO_SCRIPT.md)
- [真实免费 AI 结果](docs/OPENROUTER_V4_EXTENDED_RESULT.json)

默认 `dots-studio/dots-3-note-preview:free` 已通过真实样例验证，复用当前后端 Key。其他允许候选见 `server/aiConfig.ts`。只尝试白名单免费模型，每次输入最多两个不同候选，价格上限始终为 0，不进入通用自动路由。

## 本地启动

实测环境：Node **26.8.2**、npm **11.19.1**，见 `.node-version`。依赖要求 Node 22.13+ 的 22.x 或 Node 24+。

```sh
cd movequest
npm ci
npm run dev
# http://127.0.0.1:5174
```

如果你已在 `movequest/` 中，省略第一行。访问 `/` 会先进入 Onboarding。无需账号、密钥、运动设备、数据库或付费 API。

生产构建与 PWA 预览：

```sh
npm run build
npm run preview -- --port 5175
# http://127.0.0.1:5175
```

开发端口是 5174，测试/生产预览端口是 5175。**协议、主机、端口不同，localStorage 数据也不同**；`localhost` 与 `127.0.0.1` 亦不同。个人使用时建议始终使用同一地址。

## AI 与意向服务（可选）

```sh
cp .env.example .env
# 在本机编辑 .env 的 OPENROUTER_API_KEY，勿提交密钥
npm run build
npm run serve
# http://127.0.0.1:5176 — SPA + API
```

当前接入 OpenRouter，默认使用已实测的 `dots-studio/dots-3-note-preview:free`，仅允许明确的免费白名单内有限切换，价格上限为 0。未配置后端 `OPENROUTER_API_KEY` 时不假装运行 AI，手动资料、地图、推荐、反馈、装饰与统计继续可用。`npm run dev` 将 `/api` 代理到 5176；开发时另开终端 `npm run api`。静态 preview 不提供模型 API。

独立 Node 部署需要 HTTPS、私有持久卷及 Cookie secret。Vercel 使用下面的 Functions 和私有 Blob。意向接口保存用户同意后提交的邮箱与同意版本，没有支付能力。

真实 API 验收（需要先在本机 `.env` 填写 Key）：

```sh
npm run test:ai:live
```

该命令测试三组虚构中文描述，成功后写入可评审 JSON。普通单元测试不会调用真实模型。接入限制、密钥保护和当前验收状态见 [OpenRouter 接入说明](docs/OPENROUTER_INTEGRATION.md)。

## 三分钟路演路径

1. 描述一天（需要模型配置），或手动填写地点与事件，确认后生成城镇；姓名可选。
2. 到「我的偏好」开启 **演示模式**，等待右上角显示「本机保存」。页面会持续标注模拟活动，计时缩短至 3 秒。
3. 在首页或「发现微动」打开「课间，走一小段」，先确认周围条件合适。开始、暂停、继续，再明确确认完成。
4. 获得 +20 演示 XP，花园从种子变为新芽。打开知识卡，答对获得 +5 演示 XP；错误可以重试。
5. 在「成长足迹」看记录，刷新页面验证保留。重做同一任务仍能记录，但当天不会重复发 XP。
6. 打开 **Create Your Own Move**，记录“当我下课时，可以提前出门轻走”的个人机会，再进入自建挑战。
7. 打开「机构演示」，切换校园/企业与统计周期，新建或编辑本地 Demo 草稿，导出标注 Demo Data 的示例数据。
8. 关闭演示模式，个人 XP 与记录独立显示。

截图中的姓名与活动均来自隔离测试浏览器；带演示横幅的 XP 是模拟记录，机构指标始终为合成数据。

## 页面与真实交互

| 路由 | 功能 |
| --- | --- |
| `/onboarding` | 生活描述或手动录入、结构化资料确认、本机保存 |
| `/` | 2.5D 城镇、机会标记、反馈、装饰、时间轴；可展开成长与今日记录 |
| `/explore` | 四场景日常活动与休息；待专业审核动作不进入可用候选 |
| `/quest/:questId` | 活动建议、审核门槛、计时/步骤、暂停继续、跳过替换、确认、奖励与知识入口 |
| `/learn` | 4 张有来源的知识卡、可重试问题、一次性知识 XP、8 项成就与植物成长 |
| `/progress` | 完成次数、分钟数、七日次数、场景与学习进度、活动手记、自主机会 |
| `/own-move` | 创建自己的场景化机会、保存、进入计时挑战 |
| `/profile` | 偏好与语言、应用内提醒、演示模式、JSON 导出、需二次确认的数据清除 |
| `/life` | 增量发现、全量日程编辑、地点删除 |
| `/rhythm` | 推荐限制、静默、反馈统计与重置、内容审核详情 |
| `/plus` | 会员方案与真实意向登记；不付款 |
| `/institution` | Demo Data 指标、日期/机构筛选、学习/场景统计、活动草稿、Demo 数据导出 |

桌面使用侧栏；手机使用五项底部导航。键盘焦点可见，提供跳至内容链接，支持减少动画偏好。简中内容完整，繁中/英文目前为导航预览，其余文案明确回退简中。

## XP 与时间规则

- 普通活动 +20 XP，同一任务同一本地日期只奖励一次。当天再次完成保留活动次数和时间，本次奖励为 0。
- 知识题首次答对 +5 XP，每张卡每个空间只奖励一次；错答、重复答对均不扣分。
- 自主发现本身没有可反复领取的 XP，会解锁一次「自主发现」成就。完成不同自建活动共享每日一次 +20 XP 上限。
- 等级为 `1 + floor(XP / 100)`，花园阶段阈值为 0 / 20 / 80 / 180 / 320 XP。
- 跳过、中断、不连续使用都不会扣分或导致植物枯萎。没有公开排名。
- 计时器仅在本页可见且由本页持有计时权时推进；切换后台、离开路由会暂停。刷新前的计时检查点保留，需要明确接续，不把关闭页面的时长算作活动。
- 计时结束不自动记账，只有「我已完成，确认记录」发起奖励事务。步骤任务逐项确认；参考分钟数为**用户自报估计**，不是设备测量。
- 演示活动仅记入演示空间，缩短后的实际演示秒数不会变成个人活动分钟数。
- 奖励以不可重复的领取键记账。Web Locks 可用时串行处理多标签页写入，并在每次操作前重读快照；缺少 Web Locks 的浏览器不保证并发写入一致性。
- 本地浏览器数据可被人工修改；本项目防止正常界面重复点击刷分，不具备服务器反作弊能力。

## PWA 与离线

- 生产构建生成 manifest、192/512 图标、maskable 图标与 service worker；资源均本地托管。
- **首次联网成功加载并完成缓存后**，应用壳、任务、知识卡及本地记录支持离线使用。首次完全离线打开无法安装/缓存应用。
- 可安装浏览器支持 `beforeinstallprompt` 时显示安装入口；其他浏览器使用自身菜单。iOS 通常通过 Safari 的“添加到主屏幕”。本次未做实体 iOS/Android 安装验收。
- 更新采用提示确认，不在活动计时中自动重载。正在计时时更新按钮不可用。
- 活动提醒是页面打开期间的应用内提示。没有后台 Push 服务，不保证休眠或关闭应用后定时提醒；不申请系统通知或相机权限。
- 本地预览使用 localhost/127.0.0.1；正式 PWA 需要 HTTPS。

## 测试与检查

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run test:e2e
```

E2E 会自动启动或复用 5175 生产预览，须先构建。测试数据保存在测试专用浏览器上下文，结束后销毁，不触碰你的正常浏览器或根应用数据。

默认在有本机 Chrome 的 macOS 上使用该 Chrome；其他环境先安装 Playwright Chromium：

```sh
npx playwright install chromium
npm run test:e2e
```

也可以设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指向可用的 Chrome/Chromium。测试报告在 `playwright-report/index.html`，失败时保留截图与 trace。E2E 使用受控时钟，不需要真的等待一分钟或半小时。

历史 3.0 实测：**46 项单元/集成测试、30 项桌面/手机 E2E 通过**，类型、lint 与生产构建通过。见 [3.0 验收](docs/MOVEQUEST_3_ACCEPTANCE.md)；[历史 MVP 验收](docs/VALIDATION.md) 仅反映旧版本。

## 源码组织

```text
src/
  app/          路由、桌面/手机壳、提醒入口
  components/   自绘 SVG 花园、通用 UI、PWA 提示
  life/         生活 schema、增量世界、推荐与反馈、适配器/集成测试
  data/         公开动作、休息、短组合、4 张知识卡与确定性的机构合成明细
  domain/       领域类型、纯 reducer、XP 账本、成长与统计
  state/        React Context/reducer、事务反馈、跨标签同步
  storage/      schemaVersion=1 校验、持久化、损坏数据保护
  i18n/         类型化导航词条与简中 fallback
  pages/        可交互页面
  styles/       Tailwind 入口、设计 tokens、响应式和动画
```

数据键为 `movequest:v1`。未知版本或损坏数据不会静默覆盖，可以进入偏好页导出原始内容后处理。当前是新应用首版，没有从旧 CyberHealth 数据导入，也没有导入 JSON 或云同步功能。写入失败时保留原数据并显示错误，不能把未保存状态视为已完成。

## 部署

Vercel 项目以 `movequest` 为构建根目录，执行 `npm ci` 和 `npm run build`，输出 `dist`。前端使用域名根路径。配置保留 PWA 静态资源与 SPA 深链，并将 `/api/*` 交给 Functions。

- 在 Production 环境设置服务端 Secrets `OPENROUTER_API_KEY` 和高熵的 `MOVEQUEST_COOKIE_SECRET`，并连接私有 Vercel Blob 存储。
- `/api/status` 报告 AI 配置是否完整，`/api/life/extract` 通过现有 OpenRouter 免费模型策略处理描述。公开入口采用持久限流，超过额度时仍可在浏览器本机整理。
- `/api/interest` 保存用户显式同意的邮箱登记和同意版本。限额记录与登记保存在私有存储，AI 描述和活动记录均不写入 Blob。
- 纯静态托管支持本机发现、动作训练、城镇和习惯。需要实时 AI 或邮件意向登记时，也可以单独运行 `npm run serve` 的 Node API。

## 已实现与限制

Phase 2–6 的 MVP 页面、主要交互、localStorage、XP/花园、知识/成就、自主发现、机构 Demo、PWA、测试、响应式与部署配置均已实现。

以下不在本版内：真实设备/步数检测、账号/跨设备同步、后台 Push、真实学校/企业接入、多租户权限与服务端反作弊、完整繁中/英文内容、医学效果验证。机构活动仅为本地示例，修改草稿不会改变固定合成 KPI。活动内容面向一般教育，不能替代个体健康建议。

## 截图与资料

- [3.0 桌面城镇](docs/screenshots/v3-town-desktop.png) / [3.0 手机城镇](docs/screenshots/v3-town-mobile.png)
- [桌面首页](docs/screenshots/home-desktop.png) / [手机首页](docs/screenshots/home-mobile.png)
- [桌面探索](docs/screenshots/explore-desktop.png) / [手机探索](docs/screenshots/explore-mobile.png)
- [桌面奖励](docs/screenshots/reward-desktop.png) / [手机奖励](docs/screenshots/reward-mobile.png)
- [桌面学习](docs/screenshots/learn-desktop.png) / [手机学习](docs/screenshots/learn-mobile.png)
- [桌面自主发现](docs/screenshots/own-move-desktop.png) / [手机自主发现](docs/screenshots/own-move-mobile.png)
- [桌面成长](docs/screenshots/progress-desktop.png) / [手机成长](docs/screenshots/progress-mobile.png)
- [桌面机构 Demo](docs/screenshots/institution-desktop.png) / [手机机构 Demo](docs/screenshots/institution-mobile.png)
- [内容来源与素材说明](docs/SOURCES.md)
- [第三方声明](THIRD_PARTY_NOTICES.md)
- [设计与评审记录](docs/DESIGN.md)
- [Phase 1 决策](../docs/MOVEQUEST_PHASE1.md)
