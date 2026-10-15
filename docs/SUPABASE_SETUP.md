# Supabase 测试项目配置（不操作生产）

本指南只准备测试环境。当前代码默认不启用 P1 云功能，尚未完成真实邮箱和两台设备的联网验收。

1. 登录 Supabase Dashboard，创建独立项目（例如 cyberhealth-test），使用 Free 计划。保存数据库密码，不把密码、service role 或 secret key 放入前端。
2. 在项目的 Connect / API 设置复制 Project URL 和 publishable key（旧项目可用 anon key）。在仓库创建被 Git 忽略的 `.env.local`：

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://你的测试项目.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=你的publishable或anon_key
   NEXT_PUBLIC_P1_CLOUD_ENABLED=false
   ```

3. 在 Authentication → Sign In / Providers 启用 Email。Email Templates → Magic Link 模板加入 `{{ .Token }}`，本版使用输入式 OTP。新用户注册也使用此流程。测试默认邮件服务有收件人/频率限制；必要时使用项目团队成员邮箱。正式外部用户投递需要另行评估 SMTP 提供方与费用，不在本轮自动开通。
4. 如果需要保留原有匿名花园身份，启用 Anonymous Sign-Ins 与 Manual Linking。首次绑定邮箱通过 `updateUser` 与 email_change OTP 完成；邮箱已属于另一个账号时不自动合并两个身份，需单独处理。
5. 配置 Auth URL：本地 Site URL 可设为 `http://127.0.0.1:4173`；只添加实际使用的测试回调地址。本版不依赖邮件 URL 回调，但不要填生产站点测试身份。
6. **先审阅迁移并确认目标是测试项目，再执行 SQL。** 全新数据库按 `001_garden.sql` → `002_personal_sync.sql` → `003_garden_p1.sql` 顺序。已有 001 的项目只运行后续迁移；不要重复运行 001。003 会要求花园写操作使用已验证的正式账号，已有匿名成员数据保留，但需先关联邮箱。本轮不会代你远程执行。
7. 迁移完成后设置 `NEXT_PUBLIC_P1_CLOUD_ENABLED=true`，重新 `npm run build && npm run start`（或重启开发服务器）。这些是构建时前端环境变量。
8. 在「我的」通过邮箱验证码登录，选择「检查云端并同步」或「选择迁移游客历史」。预览后明确选择偏好冲突处理策略。事件保留原 ID；迁移失败不删除游客数据；每个账号有独立本地空间。

## 两账号、两设备验收步骤

A/B 分别用不同邮箱登录两个独立浏览器或设备，不能用本地演示身份代替真实账号。

1. A 创建花园、生成邀请，B 打开链接、登录并接受；第三个账号 C 尝试加入应被拒绝。
2. A/B 各自完成一项经过计时并确认的活动。检查露水分别增加、刷新后同步；重复提交同一事件不增加。
3. 检查每日奖励上限、60 秒休息邀请的过期与限频、稍后参与。
4. B 无法读取 A 的 personal_events；C 无法读取花园；邀请 token 不可直接查询。
5. A 退出后无法读取花园，B 成为维护者，植物已有成长保留；旧邀请失效。
6. 同一账号在两设备同步：ID 去重；偏好版本冲突要求重新预览；退出后不显示其他账号记录。

## 成本与限制

本轮核对的官方计划：Free $0/月，500 MB 数据库、50,000 MAU、5 GB egress，1 周不活跃会暂停；Pro 从 $25/月起，可能另计计算/用量。只需免费测试项目，不自动升级。详见 https://supabase.com/pricing 。

本地 SQL 集成测试使用内存中的 PGlite PostgreSQL，验证 SQL/RLS/去重逻辑，不等于真实 Supabase Auth、邮件投递、网络并发或 Realtime 验收。实际联网结果需在上述配置后补录。
