# MoveQuest（微动冒险）Phase 1：技术评估与实施方案

评估日期：2026-11-19。状态：Phase 1 完成，Phase 2–6 尚未实施。

## 1. 决策

推荐在当前仓库的 `movequest/` 目录创建独立 React + TypeScript + Vite 应用，以 localStorage 为 MVP 数据源。优先研究 habitSync 后，选择参考其组件拆分思路，不以完整 fork 为基础。现有 CyberHealth / 半日闲应用继续保留。

原因：habitSync 已有的通用表单、进度条和路由容易重建；账号、API 和数据库依赖需要拆除；MoveQuest 最重要的场景任务、不可重复领取的 XP、学习、自主发现和机构演示都需要新增。完整二开没有明显节省核心工作。

这是基于源码检查的工程判断，并非实测工时。没有安装或启动四个外部项目，也没有验证它们的生产可用性。

## 2. 调研方法与当前工作区

- 通过 GitHub 连接读取四个仓库的元数据、目录、README、依赖清单、关键源码和可见授权文件。
- 重点检查 habitSync 的路由、任务 API、Dashboard、宠物成长组件和后端任务 controller。
- 当前目录不是空项目：根应用使用 Next 16.4.5、React 19、TypeScript，已有活动执行、localStorage、庭园、提醒、Supabase 可选同步、PWA 和测试。
- `src/app/page.tsx` 当前渲染 `RestApp`。不覆盖根入口、根依赖、原数据键或既有美术。
- 根目录有用户未跟踪的 `deliverables/`，不纳入此次改动。
- 本机实际版本为 Node 26.8.2、npm 11.19.1。未来 Vite 应用将声明支持的 Node 版本并锁定依赖；Vite 官方入门文档当前要求 Node 20.19+ / 22.12+，部分模板可能有更高要求。
- 本阶段未修改 Next.js 代码；如后续触及根应用，必须先读本地 `node_modules/next/dist/docs/` 的相关指南。

## 3. 四个仓库评估

### 3.1 habitSync：优先评估，最接近但不推荐整仓二开

来源：[仓库与 README](https://github.com/opensourcepod/habitSync)、[client/package.json](https://github.com/opensourcepod/habitSync/blob/main/client/package.json)、[server/package.json](https://github.com/opensourcepod/habitSync/blob/main/server/package.json)。检查分支 `main`。

**技术与结构**

- npm workspaces；`client/` 为 React 19 + TypeScript + Vite 8 SPA；`server/` 为 Express 5 + Supabase；JWT 与 HTTP-only cookie 会话。
- 客户端有 Tailwind 4、Framer Motion、canvas-confetti、Axios、React Query 依赖。
- `app/` 管路由；`components/` 管任务、布局、宠物与进度；`features/` 管 API 与类型；`pages/` 管页面。
- README 写 React Router v6，实际依赖为 `react-router-dom ^7.14.0`；README 写 Node 18+，锁文件中的 Vite 要求 `^20.19.0 || >=22.12.0`。实施应以实际依赖和源码为准。

**可复用范围**

- 可参考：功能目录拆分、任务卡与表单组合、进度摘要、分阶段成长的展示方式。
- 如实际复制代码，适合仅提取小型 UI 模块并保留 MIT 声明；不直接复用原宠物图、字体或整套像素样式。
- 宠物组件以完成任务数量的 5 / 10 阈值换图，可作为表现方式参考，不能直接承担 MoveQuest 的 XP 与花园状态。

**关键成本证据**

- [DashboardPage.tsx](https://github.com/opensourcepod/habitSync/blob/main/client/src/pages/DashboardPage.tsx) 将 XP 设置为当前已完成习惯数乘 10。取消勾选或删除会改变推导结果，缺乏独立、累计的奖励事件账本。
- [habits.api.ts](https://github.com/opensourcepod/habitSync/blob/main/client/src/features/habits/habits.api.ts) 依赖带 cookie 的后端请求，不是可直接离线使用的数据层。
- [habit.controller.ts](https://github.com/opensourcepod/habitSync/blob/main/server/controllers/habit.controller.ts) 同一对象有两个 `toggleComplete` 定义，后一个只调用 `next()`；这是静态发现的构建/行为风险，尚未通过运行确认其具体报错。
- [router.tsx](https://github.com/opensourcepod/habitSync/blob/main/client/src/app/router.tsx) 主要覆盖登录、注册、Dashboard，并没有 MoveQuest 所需的七类页面。
- 根 `test` 脚本为报错占位；客户端虽安装 Vitest，但没有配置 `test` 脚本，不能据 README 推断测试已完备。

**本地运行条件**

- 符合 Vite 8 要求的 Node、npm；安装 workspaces 依赖；前端 5173、后端 3434。
- 完整账号与任务路径需要 Supabase 项目、所需表、服务端环境和会话配置。README 的环境说明不能当作完整部署验证。
- 仅启动客户端不等于任务 CRUD 可用；改为 localStorage 必须替换 API 调用。

**授权与适配结论**

- [MIT LICENSE](https://github.com/opensourcepod/habitSync/blob/main/LICENSE)，版权为 PTRI-20-Team-Pikachu；复制软件或重要部分须保留版权与许可文本。
- 已检查文档没有充分说明每个宠物图、音频、字体等素材的独立来源；不据根许可证推断所有第三方素材均已授权。
- 技术栈契合高，业务流程契合中等。直接二开成本中高，收益主要在通用 UI，而非核心领域逻辑。

### 3.2 StepsNSprouts：花园理念接近，移动原生与授权增加成本

来源：[README](https://github.com/ciddy0/StepsNSprouts/blob/main/README.md)、[package.json](https://github.com/ciddy0/StepsNSprouts/blob/main/package.json)、[currency.ts](https://github.com/ciddy0/StepsNSprouts/blob/main/services/game/currency.ts)。检查分支 `main`。

- React Native 0.81 + Expo Router + TypeScript + NativeWind；Firebase Authentication / Firestore；原生 HealthKit 接入，包含 Expo AV 等平台依赖。
- 结构为 `app/`、`components/`、`context/`、`services/api/`、`services/game/`、`services/steps/`、`assets/`。
- 有六阶段树木、装饰槽、成就和步数兑换货币；适合参考“现实活动推动花园”的体验，步数、连续达标和商店经济并非 MoveQuest 的核心。
- 本地开发需要 Expo/Metro 与 Firebase 配置；真实 HealthKit 路径还涉及 iOS 原生构建和权限。存在开发用步数 fallback，不代表 Web 端完整可用。
- `npm run web` 脚本存在，但没有实际启动验证；原生 API 与音频等需要逐项适配或移除。
- GitHub 元数据的 license 为 null；根目录未见 LICENSE，README 只笼统指向仓库。不能将“公开仓库”视为已获得复制或修改授权。
- `assets/` 包含图片、字体和音乐，本阶段没有确认这些素材的逐项授权。不复制源码或素材；只参考产品机制并独立实现。
- 直接二开成本高：平台迁移、设备数据替换、Firebase 脱离、奖励规则重建，再加授权未决。产品概念契合高，Web MVP 技术契合低。

### 3.3 MellowDesk：低打扰与手动完成值得参考，不适合做 Web 底座

来源：[README](https://github.com/EigenLogic/MellowDesk/blob/main/README.md)、[Package.swift](https://github.com/EigenLogic/MellowDesk/blob/main/Package.swift)、[NOTICE](https://github.com/EigenLogic/MellowDesk/blob/main/NOTICE)。检查分支 `main`。

- Swift 5.10 / SwiftUI 原生 macOS 应用，最低 macOS 13；使用 Apple 相机/姿态相关框架与 Sparkle 更新组件。
- `Sources/MellowDeskCore` 管计数、统计与调度；`Sources/MellowDesk` 管应用和 UI；`Tests/` 与 `docs/` 分离。
- 可参考统一提醒节奏、延后/暂停、手动完成后备路径、本地历史与内容证据治理。
- Swift 核心逻辑不能直接导入 React；如果复制算法需要重新移植和测试。无需引入相机识别、原生更新器或专项训练模块。
- 源码运行需兼容 Swift 5.10 的完整 Xcode，脚本为 `./Scripts/run_debug.sh`；检查脚本为 `./Scripts/check.sh`。本阶段未执行。
- [Apache-2.0 LICENSE](https://github.com/EigenLogic/MellowDesk/blob/main/LICENSE)，配有 NOTICE 和第三方声明；若分发衍生代码需处理许可、修改说明和适用声明。图标等资源仍需独立核实。
- 直接二开成本很高，本质上接近 Web 重写。提醒/引导理念契合，Web/花园/教育闭环契合低。

### 3.4 stretchly-for-web：轻量提醒参考，但不是 React 项目

来源：[README](https://github.com/hovancik/stretchly-for-web/blob/trunk/README.md)、[package.json](https://github.com/hovancik/stretchly-for-web/blob/trunk/package.json)、[src/lib](https://github.com/hovancik/stretchly-for-web/tree/trunk/src/lib)。检查默认分支 `trunk`。

- Svelte 4 + Vite 4 + Bulma/Sass，主要为 JavaScript；easytimer.js，Mocha/Chai 测试。
- `src/components/`、`src/lib/ideas.js`、`src/lib/shuffled.js`、`src/stores/preferences.js`；偏好从 localStorage 读取。
- 支持长/短休息、开始、暂停、继续、停止、跳到下一类休息；没有 XP、花园、学习或机构展示。
- 可参考计时状态与不重复抽取建议的方式。`Shuffled` 是很小的独立逻辑；重写 TypeScript 版本比引入 Svelte 更合理。
- package engines 指定 Node 22.16.0；有 npm dev/build/test 脚本，适合在匹配版本下复现。无需原生设备；本阶段未安装或运行。
- [BSD-2-Clause LICENSE](https://github.com/hovancik/stretchly-for-web/blob/trunk/LICENSE) 要求在源码/二进制分发中保留相应声明；README 另署名图标作者 Colin Shanley，不据此假定图标授权已经明确。
- 直接二开成本中高：React 迁移加全部游戏化与学习功能新增。适合作为提醒交互参考，不选作底座。

## 4. 方案比较与预估

以下为单人集中开发的粗略工程日，包含实现与常规验证，不是承诺，也没有做完整构建实验。均不含正式医学审校、真实机构试点和后端上线。

| 路径 | 粗估 | 主要额外工作 | 决策 |
| --- | --- | --- | --- |
| habitSync 完整二开 | 9–14 天 | 拆账号/API、重建奖励与历史、重做视觉、补内容和 PWA | 不选 |
| habitSync 客户端裁剪 | 7–11 天 | 数据层替换、仍需新增大部分领域功能 | 备选 |
| StepsNSprouts 二开 | 12–18 天以上 | 授权未决、原生到 Web、Firebase/HealthKit 替换 | 不选 |
| MellowDesk 移植 | 12–18 天以上 | Swift 到 Web 重写，全部游戏化新增 | 不选 |
| stretchly-for-web 二开 | 9–14 天 | Svelte 到 React 或偏离技术要求，业务新增 | 不选 |
| 独立 Vite MVP | 6–9 天 | 直接实现目标闭环，依赖和状态可控 | 推荐 |

## 5. MVP 技术架构

- React + TypeScript strict + Vite；Tailwind CSS；React Router 使用简单客户端路由，不引入服务端框架模式。
- React Context + reducer 管应用状态；纯 TypeScript 函数处理奖励、成长、统计与状态转换。暂不需要 Redux、React Query、Axios 或复杂游戏引擎。
- localStorage 保存一个带 `schemaVersion` 的快照；封装解析校验、迁移、写入失败反馈、JSON 导出与仅清除 MoveQuest 数据。
- 独立数据键 `movequest:v1`，与现有应用完全区分。运行中的计时状态可保存，但读回不得自动完成或发奖励。
- `vite-plugin-pwa` 管 manifest 与 service worker；缓存应用壳、任务、知识和本地素材。采用更新提示，避免计时中自动刷新。[PWA 官方指南](https://vite-pwa-org.netlify.app/guide/)
- 首次成功加载并缓存后验证离线闭环；不承诺首次离线访问。正式环境 HTTPS，开发 localhost。
- 资源本地化，使用自绘 SVG/CSS 植物和系统字体；不需要付费 API、外部字体 CDN 或设备权限。
- i18n 采用类型化词条与 `zh-CN` / `zh-TW` / `en`；首版简中完整，缺失词条明确回退简中。未完成全量翻译前不展示“已完整支持”标签。
- 提醒首版为页面打开期间的应用内提示和偏好保存；系统通知为显式授权后的可选增强。PWA 安装不等于关闭应用后可靠定时提醒。[Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- Supabase 留作未来 Repository 实现；MVP 不接账号、跨设备同步和真实机构后台。

## 6. 领域规则与演示闭环

### 状态与记账

- `Profile`：身份、常见场景、时长、提醒偏好、语言。
- `QuestDefinition`：场景、触发情境、时长/步骤、门槛、替代选项、知识关联。
- `QuestSession`：独立 ID、开始/暂停/可确认/已完成/跳过状态、有效活动秒数、确认时间、自报完成标记。
- `RewardEvent`：不可变奖励记录与唯一领取键；XP 从账本汇总，页面动画和按钮不各自加分。
- `LearningRecord`：知识卡 ID、问题作答和首次答对奖励。
- `OwnMove`：用户发现的情境、动作、时长、场景；“记录发现”和“完成活动”分别记录。
- `Achievement` / `GardenStage` 由有效记录推导，避免多个存储字段互相漂移。

### 建议首版数值（产品参数，不是健康标准）

- 普通任务首次当日完成 +20 XP；相同任务同一本地日期仅奖励一次，重复活动仍可记录，但显示本次 +0 XP。
- 知识题首次答对 +5 XP，按知识卡终身去重；错误可重试，不扣分。
- 记录自主机会本身不发可反复领取的 XP；首次创建授予一次“自主发现”成就。实际完成的自建活动 +20 XP，每日最多奖励一次，防止通过新建不同标题刷分。
- 等级为 `1 + floor(totalXP / 100)`；花园采用 0 / 20 / 80 / 180 / 320 XP 五阶段，前 20 XP 就能看到第一次萌芽。
- 首次完成某场景解锁印记，四场景各完成一次解锁“生活探索者”；跳过、替换和中断不扣 XP，不设置植物枯萎惩罚。
- 唯一键同时覆盖 session、任务+日期、知识卡和成就；重复确认、刷新、路由往返不会重复领取。多标签页完成同一任务须纳入验证，并在事务中重新读取最新状态；支持时使用 Web Locks 串行写入，不支持时明确不保证并发写入一致性。
- localStorage 无法防止用户手工改数据；本 MVP 的目标是避免正常 UI 操作刷分，不宣称具备服务端反作弊能力。
- 今日日期使用设备本地日历；完成时固定奖励日期。分钟数来自实际有效计时或明确标注的步骤活动自报时长，不把停留页面算作活动。

### 先完成的纵向路径

选择学生 → 校园课间场景 → 1 分钟走廊轻走 → 开始/暂停/继续 → 到时明确确认 → 一次性 +20 XP → 花园萌芽 → 知识题 +5 XP → Progress 留下记录 → 刷新保留 → Create Your Own Move 记录下一次机会。

路演提供显著标注的“演示模式”：可缩短等待，所有这类活动记录标为模拟并与个人正常统计分开；退出后不能伪装成真实活动分钟数。

### 场景内容起点（共 12 项）

| 场景 | 三个任务概念 |
| --- | --- |
| Campus | 课间走廊轻走；去接水时走一小段；图书馆座位旁轻动脚踝 |
| Office | 长会议后起身活动；接水路上轻走；桌旁轻松开合双手 |
| Home | 看完一集后室内走动；等待热水时原地轻踏；整理一小块桌面时活动身体 |
| Outdoors | 公园短距离慢走；户外休息时沿平坦路面走动；观察附近三处绿植的短途步行 |

这些是待编写和核验的任务概念，不是运动处方。提供坐姿替代与场地限制，不要求爬楼、负重、平衡挑战或在道路上看屏幕；不适可随时停止。

知识卡记录来源 URL、支持的具体表述和核验日期；来源不用于替 App 的某个计时剂量背书。不写卡路里、风险下降百分比或未经验证的“研究表明”。现有仓库的来源目录可作为待复核线索，不能沿用旧日期冒充重新验证。

## 7. 页面、视觉和目录

手机采用五项底部导航：首页、探索、学习、成长、我的；自主发现从首页与成长页可达。机构 Demo 使用独立入口。桌面采用侧栏或宽屏导航、花园主视觉与推荐任务的双栏布局。

视觉方向：鼠尾草绿、奶油白、浅陶土和深绿文字；手绘感植物、留白、柔和卡片与短促成长动画。奖励应包含文字反馈；支持键盘、焦点可见、足够触控面积及 `prefers-reduced-motion`，不只靠颜色区分状态。

以下是 Phase 2 起拟建目录，不代表文件已实现：

```text
cyberhealth/
├── src/                         # 现有 Next.js 应用
├── docs/MOVEQUEST_PHASE1.md      # 本评估
└── movequest/                   # 独立应用，独立 package.json / lock
    ├── public/icons/
    ├── src/
    │   ├── main.tsx
    │   ├── app/                 # router、providers、AppShell
    │   ├── pages/               # Onboarding、Home、Explore、Quest
    │   │                        # LearnRewards、Progress、OwnMove
    │   │                        # Profile、Institution、NotFound
    │   ├── components/          # 基础 UI、导航、卡片、GardenScene
    │   ├── domain/              # 类型、任务状态机、奖励、花园、统计
    │   ├── state/               # reducer 与 actions
    │   ├── data/                # 任务、知识、成就、显式 Demo fixtures
    │   ├── storage/             # repository、schema、migration
    │   ├── i18n/                # zh-CN、zh-TW、en 与 fallback
    │   ├── styles/              # tokens、全局样式、动效
    │   └── test/                # 测试初始化；单测邻近领域模块
    ├── tests/e2e/
    ├── docs/                    # 演示脚本、来源、验收与截图
    ├── README.md
    ├── THIRD_PARTY_NOTICES.md
    ├── package.json
    ├── vite.config.ts
    └── playwright.config.ts
```

拟定路由：`/onboarding`、`/`、`/explore`、`/quest/:questId`、`/learn`、`/progress`、`/own-move`、`/profile`、`/institution`。静态部署须配置 SPA 回退；机构页每个指标区及导出都保留 `Demo Data · 模拟数据`。

## 8. 分阶段计划与验收

| 阶段 | 实现重点 | 必须实际执行的检查 |
| --- | --- | --- |
| Phase 1 | 仓库、授权、架构、实施与验收计划 | 阅读关键文件；当前应用基线测试与类型检查 |
| Phase 2 | 独立 Vite 应用、设计 tokens、路由、响应式壳、i18n 基础、Onboarding | 类型、lint、build；桌面/手机路由与表单冒烟检查 |
| Phase 3 | 一个校园任务跑通状态机，再扩展四场景 12 任务；跳过/替换 | 计时暂停恢复、禁止提前确认、步骤完成、非法跳转和刷新恢复；浏览器完成主路径 |
| Phase 4 | XP 账本、植物成长、知识互动、成就、Progress、自主发现 | 奖励去重、日期边界、多标签页写入、模拟隔离、存储异常与数据迁移；刷新后统计一致 |
| Phase 5 | 机构 Demo、场景与学习统计、学校/企业切换、活动创建编辑示例 | 指标从固定合成明细推导；分母与筛选一致；Demo 标签持续可见；草稿保存可回读 |
| Phase 6 | PWA、无障碍/响应式收尾、README、截图、部署配置和交付清单 | unit、typecheck、lint、build、桌面/手机 E2E；生产预览离线与深链；安装入口/更新提示人工检查 |

Phase 3 先实现一次无复杂装饰的完整挑战，Phase 4 接入奖励/学习/持久化形成完整产品闭环，再扩展动画与机构端。

建议桌面验收 1440×900、手机 390×844，并检查 320px 窄屏。计时用可控时钟测试，不靠测试实际等待 60 秒。PWA 以生产构建验收；设备未实测的安装或通知能力明确记为未验证。

机构数据采用固定随机种子或静态合成明细，不使用随机变化的 KPI。完成率定义为完成任务数 / 已开始任务数；学习完成率定义为完成指定知识互动的参与人数 / 活动参与人数，均在 UI 解释。活动管理只保存本地 Demo 草稿，不发送通知、不伪装已部署活动。

## 9. 部署准备与交付边界

- Vercel / Netlify 等静态托管可配置项目根目录为 `movequest/`，构建命令 `npm run build`、产物 `dist/`；配置 SPA rewrite、HTTPS、正确 base 和 service worker scope。此处仅为部署计划，尚未部署。
- 新应用开发优先使用与现有 4173 不同的端口；独立正式 origin 可避免根应用 service worker 控制新应用。只使用子目录并不能自动消除旧 service worker 的作用域问题。
- 最终 README 包含锁定 Node 版本、安装、运行、测试、构建预览、离线条件、数据清除/导出、演示脚本、部署与素材说明。
- 最终截图覆盖首页、挑战奖励、成长和机构页的桌面/手机视口；截图来自实际运行页面。
- MVP 包含七类核心页、12 任务、XP/花园、学习、自主发现、持久化、基础国际化结构、机构 Demo 与 PWA。
- MVP 暂不包含真实步数/设备识别、后台推送保证、云账号/跨设备同步、真实机构多租户/RBAC、医学效果验证、全量繁中/英文翻译。

## 10. Phase 1 实际检查结果

2026-11-19 在现有 CyberHealth 根目录运行：

- `npm test`：64 项通过，0 失败，退出码 0。
- `npm run typecheck`：退出码 0。
- 没有执行外部仓库安装、启动、测试或构建；它们的运行条件来自依赖和文档检查。
- MoveQuest 尚未创建应用，所以没有 MoveQuest 构建结果、PWA 验收或页面截图。
- 本次仅新增本规划文档；未开始 Phase 2，未修改现有业务源码、依赖、数据与入口。

关键源码快照：habitSync `DashboardPage.tsx` blob `509dcd1eb31f38816fc897c01dcb814b2410e14e`；`habit.controller.ts` blob `8e894d111cf549eed67401d3b80a15ea8bb67ac1`；`client/package.json` blob `b0d6ccfdfa2cafffb3161bdb924b99be90834f63`。线上分支可能变化，后续真正提取代码前应固定 commit 并重新检查。

补充技术来源：[Vite Getting Started](https://vite.dev/guide/)、[Vite PWA Guide](https://vite-pwa-org.netlify.app/guide/)、[MDN Notifications API](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)。
