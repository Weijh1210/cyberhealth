# CyberHealth（摸鱼养生局）

Intelligent Micro-Break Companion · **Small Moves, Lasting Habits.**

沿用现有 Next.js / React / TypeScript 项目的 Web/PWA。无需注册，用当前场景、可用时间、活动空间与个人关注部位筛选微动作；按用户设置在网页运行时提醒，用户确认完成后才更新真实成长记录。

## 本地运行与验证

Node.js 20.19+（22.x 请使用 22.13+；推荐当前 LTS），依赖由 `package-lock.json` 锁定：

```sh
npm ci
npm run dev
# http://127.0.0.1:4173

npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E 会自动启动生产服务器，运行前先 `npm run build` 并关闭占用 4173 的其他服务器。桌面 1440×1000 与手机 390×844 两个项目都使用隔离 Chromium；手机项目为视口/触控模拟，不等于 iOS 真机验证。可通过 `PLAYWRIGHT_BROWSERS_PATH` 指向已安装的专用浏览器目录。开发模式不注册 Service Worker，以免缓存 HMR；离线测试与安装预览使用 `npm run build && npm run start`。

## 页面与流程

- **首页**：节气问候；主要提醒状态、下次计划、频率与暂停/关闭/修改；当前场景、时间与空间；立即活动；今日真实次数与时长；次级花园预览。
- **活动**：确认条件、查看推荐原因、换一个或排除不适合动作；详情显示来源、分步骤与安全提示。开始、暂停、继续、跳过，计时结束只进入待确认状态。明确确认后记录一次。
- **成长**：今日完成、近七个本地日历日、累计时长、常用动作及历史。只统计用户确认，时长是动作建议时长之和，不是传感器测量。
- **我的**：重开偏好引导、修改全部提醒规则、系统通知授权、已排除动作恢复、JSON 导出及需确认的本地数据清除。花园、灵宠收藏、主题预览保留次级入口。
- **首次引导**：欢迎 → 关注部位 → 常用场景 → 提醒偏好 → 通知授权。可随时跳过，拒绝通知不阻塞站内使用。

## 架构与数据

| 层 | 文件 / 作用 |
|---|---|
| UI | `src/components/App.tsx` 与 Onboarding/TeachingCard/ReminderFields |
| 动作内容 | `activities.ts`、`microActivities.ts`、`sourceCheckedActivities.ts`、独立 `evidenceSources.ts` |
| 推荐 | `recommend.ts` 纯函数：审核/场景/时长/姿势/器械/用户排除硬过滤；35/25/20/20 评分后做近期多样性调整 |
| 执行与成长 | `execution.ts`、`growth.ts`，时间参数可注入、唯一 session ID 防重复奖励 |
| 提醒 | `reminders.ts` 规则、`notifications.ts` 能力与展示、`data/reminderClaim.ts` 标签协调 |
| Repository | `src/data/repository.ts` 同步本地适配器，未来可替换账号后端 |
| PWA / 文化 | manifest、`public/sw.js`、原创 PNG 图标；`seasonal.ts` 日期表 |
| 花园 | 原有 `garden.ts` 本地演示、`gardenRemote.ts` 可选 Supabase，未修改认证或数据库 |

游客核心数据沿用 localStorage 键 `moyu-wellness-v1`，schema 已升级为 **v3**，迁移保留 v1/v2 偏好、记录、反馈、元气与花园数据。Repository 封装读取、迁移、保存、订阅、导出与清除，便于未来切换 IndexedDB/Supabase。localStorage 是为兼容原架构选择的等效持久化方案；每个标签页修改前读取最新数据，其他标签订阅 storage 事件，不会把旧快照在渲染后写回。

IndexedDB 单独保存提醒 occurrence claim，读写事务跨标签串行化，只有一个标签能展示同一次提醒。存储失败会明确提示；无法协调标签时关闭自动提醒，仍可主动活动。数据清除仅清除本应用游客数据与提醒 claim，不退出或删除 Supabase 账号/远程花园。隐私窗口、清除站点数据或更换设备会丢失游客数据，请先导出。

## 提醒能力边界

- 用户主动开启，可随时关闭，暂停到所选时刻，到期恢复；每日上限默认 3 次、最小间隔默认 60 分钟。
- 工作时段与免打扰支持跨午夜；工作起止相同表示全天，DND 起止相同表示不设置。完全被 DND 覆盖时显示暂无可用时段。
- 延后 15/30/60 分钟复用同一次提醒，不另占每日额度，但依然遵守工作和 DND 时段；普通提醒遵守最小间隔。
- 延后、跳过、暂停、接受、已活动均记录事件、时间、场景与原因，供后续自适应使用。「已活动」不虚增完成或元气。
- 只在可见前台页面展示到期提醒，计时中、暂停动作或待完成确认时不发普通提醒。后台节流、设备休眠、关闭网页后不能保证触发。重新打开会按规则检查，忽略期间不累发多条。
- 浏览器通知必须用户点击授权。拒绝/不支持/非安全上下文明确降级；iPhone/iPad 提示从 Safari 添加主屏幕后打开，Android/桌面可使用浏览器安装菜单。PWA 安装或通知授权都**不代表已经实现后台 Web Push**。
- 本轮未新增推送订阅、服务端排程或生产基础设施。后续要实现关闭网页后的推送，需独立确认服务端存储、调度、VAPID 密钥与部署方案。

## 动作审核与来源

12 张动作卡已核对机构公开资料，覆盖 L1 安静微动作、L2 轻活动、L3 步行等较完整活动。需要支撑的动作必须先明确确认稳固无轮椅或可扶墙面。旧 12 项演示内容及未审核计划保留，但不参与自动推荐。硬性条件不满足时展示空状态。

**source-checked 代表机构资料与动作方向已核对，不能理解为医学专业审校或临床验证。** 微休息计时是产品设计，不能推导治疗效果。内容正式运营前仍需专业人员审校个人适用范围、剂量与措辞；暂无核对过的示范动画，沿用清晰文字步骤。

来源为 [NHS 坐姿动作](https://www.nhs.uk/live-well/exercise/sitting-exercises/)、[柔韧动作](https://www.nhs.uk/live-well/exercise/flexibility-exercises/)、[力量动作](https://www.nhs.uk/live-well/exercise/strength-exercises/)、[平衡动作](https://www.nhs.uk/live-well/exercise/balance-exercises/)、[步行](https://www.nhs.uk/live-well/exercise/walking-for-health/)和原有 NHS 肩颈资料；具体支持范围见 `evidenceSources.ts`。不复制机构图文或视频、不声称治疗疾病。

节气使用[香港天文台 2026 对照表](https://www.hko.gov.hk/en/gts/time/calendar/text/files/T2026e.txt)，按北京时间日期切换，非精确交节时刻；未覆盖年份会降级为季节主题。元气签为文化趣味。

## 验证与交付

阶段进度、变更与验证记录见 [`docs/UPGRADE.md`](docs/UPGRADE.md)。测试包含规则、迁移、持久化、真实统计、确认去重、跨午夜/DST/时区，以及桌面/手机完整游客链路、延后反馈、多标签和离线 E2E。生产数据库与部署未操作。

P1 建议先完成内容专业审校，再基于已收集事件做可关闭/可重置的自适应提醒；正式好友花园补可恢复账号、跨设备同步及隐私控制；服务端 Web Push 作为独立基础设施任务审批。

## 双人花园：演示与真实同步

不配置 Supabase 时，花园页明确显示“本地演示模式”。可在**同一浏览器**中创建花园、生成链接、切换两个演示身份、接受邀请、发送休息邀请、选择现在一起或稍后参与、完成活动和退出花园。演示数据仅存在该浏览器，**不能跨设备同步**。

配置 Supabase 后，花园改为真实联网模式。双方通过各自浏览器的匿名身份加入同一花园；服务端校验邀请 token、到期时间、人数和成员身份。花园只有两个成员和一株植物；双方各自确认完成活动后，服务端记录共同贡献。60 秒休息邀请的“现在一起”有效期为 10 分钟；“稍后参与”不表示发起者在线等待。参与者开始计时后，服务端要求满 60 秒才能接受这次邀请的贡献。贡献按用户和 activity session 唯一约束去重，数据库事务避免并发覆盖。花园同步昵称、成员、休息邀请状态和必要的共同贡献；个人关注部位、提醒日程和活动笔记只保存在本地。

### 启用真实花园

1. 创建 Supabase 项目，在 Authentication → Providers 启用 Anonymous Sign-Ins。
2. 在 Supabase SQL Editor 执行 [`supabase/migrations/001_garden.sql`](supabase/migrations/001_garden.sql)。迁移建立表、成员读取规则和服务端 RPC。
3. 复制 `.env.example` 为 `.env.local`，填入项目 URL 和 **publishable/anon key**，不要填写 service role key，也不要提交真实密钥。
4. 重新启动应用。两位使用者分别在自己的浏览器打开可访问的应用地址。将应用部署到双方都能访问的 HTTPS 域名后，可直接分享邀请链接；仅在自己电脑可访问的 `127.0.0.1` 链接不能发给另一台设备使用。

当前使用匿名身份，不提供跨设备账号迁移。清除某位用户浏览器的站点数据后，会失去该身份和原花园访问权；正式运营前应补充可恢复的登录方式。数据库中的个人完成由客户端提交用户确认，服务端防重复和校验成员，不验证真实身体活动。

### 数据与安全

- `src/lib/types.ts` 区分长期偏好、当前场景、陪伴 session、活动 session、提醒事件、完成奖励、花园成员、邀请和共同贡献。
- `src/lib/store.ts` 将旧版 `schemaVersion: 1` 数据迁移到 v3，保留活动记录、反馈、元气和灵宠；损坏的本地存储会回退到可打开的初始状态。
- `src/lib/garden.ts` 是明确标注的单浏览器演示；`src/lib/gardenRemote.ts` 和 `supabase/migrations/001_garden.sql` 是真实联网实现。
- 数据库存取启用 RLS。只有成员能读取花园、成员、贡献和休息邀请。邀请 token 不能直接通过表查询；接受、退出和贡献都经服务端函数检查。
- `supabase/tests/` 包含 PostgreSQL 权限与去重冒烟测试。它使用临时本地数据库，不需要真实 Supabase 密钥。

旧版及新版个人记录仍在当前浏览器的 `localStorage`（键 `moyu-wellness-v1`）。清除浏览器数据、隐私窗口结束或更换设备会丢失个人记录。存储不可用时应用仍能打开，但会提示无法保存。
