# CyberHealth P0 开发进度

## T00 审计（2026-10-15）
- Next.js 16 App Router / React 19 / TypeScript 6；根路由只有 `/`，页面由 App 状态切换。
- 无项目级 AGENTS.md。开始时 main 与 origin/main 一致，工作区干净；远程为 GitHub Weijh1210/cyberhealth，未推送或部署。
- localStorage v2 保存真实个人记录；Supabase 为可选花园连接，不修改迁移、认证和线上数据。
- 两张有来源的动作卡、12 项待审核演示、22 项待审核计划；现有过滤错误放行演示内容。
- 前台每秒检查提醒，不是 Web Push；缺少上限、跨夜、DND 和标签页协调。
- 已有手机底栏与响应式 CSS，无 manifest / service worker / E2E / lint 脚本。
- 线上地址通过网页读取工具不可访问，以本地代码为审计依据。

## 实施设计
保留竹青 #315e42、淡竹 #edf3e9、纸白 #fffefa、墨绿 #1e4837 与金色 #b28c51。中文衬线用于标题，系统无衬线用于控制与正文。提醒卡作为主要视觉中心，场景控制紧随，成长与文化、花园采用更轻的密度。保留已有插画但缩小，避免娱乐模块主导首页。

## 阶段记录
- T00：已完成审计；基线测试待执行。
- T01：数据升级 v3，保留旧键与记录；Repository 边界、跨标签存储订阅、JSON 导出、日历日成长统计；19 项测试与类型检查通过。变更：types/store、data/repository、growth、repository.test、迁移测试。
- T02：五步可跳过引导、通知主动授权、首页提醒优先、首页/活动/成长/我的四主导航；花园/灵宠/主题保留次级入口；加入真实成长与数据导出。19 项测试与类型检查通过。变更：App/Onboarding/ReminderFields、notifications、app.css。
- T03：动作库增加 10 张来源核对卡，共 12 张、覆盖 L1/L2/L3；旧演示完整保留；来源独立可查、步骤/安全/不适用/器械信息结构化。机构资料核对不等于专业医学审校，剂量仍为产品设计。20 项测试与类型检查通过。变更：sourceCheckedActivities、activities、microActivities、evidenceSources、types/store、content.test。
- T04：推荐仅放行来源核对卡，场景/姿势/走动空间/时长/器械/用户排除均硬过滤；独立 35/25/20/20 评分与近期多样性，显示推荐原因与不适合入口。23 项测试与类型检查通过。变更：recommend、App、recommendation.test、旧推荐测试。
- T05：独立可模拟时钟的执行状态机；开始/暂停/继续/跳过/到时待确认；任何动作计时都不会自动入账；完成唯一 ID 去重。25 项测试与类型检查通过。变更：execution、execution.test、App、TeachingCard。
- T06：前台调度与通知展示分离；主动开关、暂停到时恢复、每日上限、跨夜与 DND、最小间隔、三档延后与原因事件；IndexedDB 事务去重、多标签同步、执行时抑制。延后属于同一次提醒，不重复占用日额度。「已活动」只保存反馈。31 项测试与类型检查通过。变更：reminders/companion/notifications、data/reminderClaim、App、types/store、reminders.test、兼容测试。

## T07 与最终交付

已加入 PWA manifest、192/512 PNG 图标、生产模式 Service Worker；仅缓存公开页面壳和同源静态资源，API/认证/跨域内容不进入缓存。离线可用性通过真实断网刷新验证。加入可见焦点、模态框键盘循环与背景 inert、移动布局检查。节气采用香港天文台 2026 日期表，未覆盖年份显式降级。

本阶段变更：manifest/layout、public/sw.js/icons、PwaStatus/useDialogFocus、App/Onboarding/TeachingCard/CSS、seasonal/date、Repository 容错、动作注意度元数据、Playwright/ESLint 配置与依赖、README。测试捕获并修复了导航图标影响无障碍名称，以及自定义暂停使用两次时钟读数导致 1ms 偏移的问题。

| 功能 | 交付状态 | 仍需注意 |
|---|---|---|
| 游客五步引导 / 偏好编辑 | 已实现，可跳过，通知拒绝可用 | 不要求账号 |
| 首页 / 活动 / 成长 / 我的 | 已实现，提醒占主层级 | 花园、灵宠、主题为次级入口 |
| 12 张结构化动作卡 / 规则推荐 | 来源核对、硬过滤与评分已实现 | source-checked 不是专业医学审校；旧待审核内容不推荐 |
| 执行 / 完成去重 / 真实成长 | 已实现 | 总时长为建议时长汇总，不是实测运动量 |
| 前台提醒 / 反馈 / 多标签 | 已实现 | 关闭、休眠或后台节流不保证触发 |
| 数据迁移 / 导出 / 清除 | 已实现 | 本地游客数据不跨设备；存储不可用时提示且仅内存使用 |
| PWA 安装配置 / 离线 / 响应式 | 已实现 | 手机测试为 Chromium 触控视口模拟；安装与系统通知仍需 iOS/Android 真机验证 |
| Web Push 服务端调度 | 未实现，独立任务 | 需要先确认存储、订阅、密钥与部署方案 |
| 自适应 / 正式双人账号花园 | P1 | 原有演示与可选 Supabase 接口保留，未操作生产 |
| 传统文化深化 / 动作专业审校 | P1 / 内容上线前工作 | 未制作未经核对的动作动画或治疗宣传 |

架构：Next.js 16.4 App Router + React 19.2 + TypeScript 6；Repository 使用兼容原架构的 localStorage v3，IndexedDB 原子事务只负责提醒 claim。推荐、执行、提醒、成长、节气均独立模块，规则接受时间参数。原 Supabase 认证与 SQL 未修改。

验证命令：`npm test`、`npm run typecheck`、`npm run lint`、`npm run build`；`npm run test:e2e` 使用生产构建。本机专用浏览器位于 `/tmp/cyberhealth-playwright`，本次运行需前缀 `PLAYWRIGHT_BROWSERS_PATH=/tmp/cyberhealth-playwright`。其他环境执行 `npx playwright install chromium` 后直接运行。完整启动/测试说明见 README。

阶段提交：T00 `441c358`、T01 `3b27550`、T02 `52cb66f`、T03 `c1dc0ed`、T04 `31f52f3`、T05 `943a529`、T06 `f09c9ae`；T07 为最终交付提交。分支 `codex/micro-break-p0`。不推送、不生产部署、不修改数据库、不删除已有个人或远程数据。

P1 建议顺序：专业人员内容审校与原创示范 → 可关闭/可解释/可重置的规则自适应 → 可恢复账号与正式异步花园 → 独立确认后台 Web Push 基础设施 → 节气年度数据更新与经审核传统活动。

最终验证结果：33/33 单元测试、14/14 Playwright E2E 全部通过（桌面 7、手机视口 7）；`typecheck`、`lint`、`build` 全部通过。桌面/手机完整页面截图已人工检查，主导航、提醒卡、场景条件与次级花园均无裁切；主要布局无水平溢出。E2E 覆盖通知主动点击后才请求、拒绝后正常使用、键盘焦点约束、自定义暂停持久化和到时恢复。未执行生产环境操作或真实 Supabase 联网验收。
