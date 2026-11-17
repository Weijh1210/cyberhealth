# CyberHealth（摸鱼养生局）

「半日闲」是一座可以探索的山水庭园。陪小竹去亭中看远、堂前舒展、沿溪歇息，现实里的一段休息会在庭园里长出花。

## 本地运行

使用 Node.js 20.19+（若使用 22.x，请用 22.13+）。

```sh
npm ci
npm run dev
# http://127.0.0.1:4173
```

正式预览与离线功能使用 `npm run build && npm run start`。升级旧版请使用原浏览器、浏览器配置和原访问地址（协议、主机、端口须一致）。

### 最短体验路径

1. 点击庭园中的地标，让小竹走过去，再点击对话框中的行动按钮。画卷可以上下滑动。
2. 松风亭提供离屏看远；舒展堂按当前条件筛选微运动。查看步骤、开始计时，结束后点「我已完成，确认记录」。支持暂停、返回庭园和继续。
3. 完成并确认活动，或主动记录一段短休息，小圃会多开一朵花；每三次休息推进一个山居篇章，刷新后保留。
4. 百草圃打开草木册，首次完成指导活动可以获得紫苏苗；拾光轩保留每日抽签和揭签。
5. 「行囊」回看手记与收藏，「我的节奏」设置提醒、切换城市或导出本地数据。

详细玩法、美术来源与实现边界见 [庭园游戏说明](docs/GARDEN_GAME.md)。

## 时间、天气和资料

- [香港天文台交节时刻](https://www.hko.gov.hk/tc/gts/astronomy/Solar_Term.htm)决定节气、四时配色和画面。仓库内的交节时刻来自 2025–2028 年公布的 [XML 数据](https://www.hko.gov.hk/en/gts/astronomy/data/files/24SolarTerms_2026.xml)，原表为香港时间，应用按统一时刻判断交节。超出历表覆盖范围时显示季节基调和覆盖说明。
- 城市时区决定当地日期与早晨、白天、黄昏或夜晚的光线。提醒时段沿用设备时区。天气来自 [Open-Meteo 当前模型数据](https://open-meteo.com/en/docs)，每 15 分钟重新请求。错误时优先显示该城市缓存，并注明上次更新时间；无缓存时按季节显示。仅新鲜、成功拉取且有降雨量的雨况可用于抽借雨签。
- 庭园地图使用项目设计阶段用户提供的参考图；小竹、花朵、窗景和标本示意使用代码绘制。App 只链接外部资料，不转载其图像。形态参见香港浸会大学的[紫苏叶](https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00338)和[陈皮](https://sys01.lib.hkbu.edu.hk/cmed/mmid/detail.php?pid=B00162)；历史图谱参见该校记录 [F00147 藿香正气散](https://sys01.lib.hkbu.edu.hk/cmed/cmfid/detail.php?id=F00147&lang=chs)。望远签参考 [HSE 离屏与看远资料](https://www.hse.gov.uk/pubns/indg36.pdf)。图谱只展示历史资料，不用于个人判断或用药。

## 提醒和数据

间隙与生活提醒共用免打扰时段，到期项目显示在一张卡里，各自完成或跳过。间隙提醒另有工作时段、间隔、每日上限、延后和暂停。系统通知需主动授权，后台或休眠期间可能延迟，关闭 App 后停止调度；错过的生活提醒不补发。私密提醒在系统通知中仅显示「歇一下」，App 内与导出文件仍显示原文。

旧版的运动历史、设置、收藏、签和游历继续使用同一本地数据键 `moyu-wellness-v1`（账号使用各自的键），可在手记查看并随 JSON 导出。新手记、图谱、种植和生活提醒保存在本机。仓库仍保留可选的账号与旧版历史同步入口，配置见 [Supabase 设置](docs/SUPABASE_SETUP.md)；新版收藏和记录未新增跨设备同步。

## 验证

```sh
npm test
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e -- garden.spec.ts
```

庭园 E2E 使用桌面 1440×1000 和手机 390×844 触控视口，天气和时钟使用可控样例。可用 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指定本机 Chrome，或用 `PLAYWRIGHT_PORT` 避开运行中的预览。旧庭院界面的浏览器用例保存在 `tests/legacy-e2e/`，供改版前的版本回归使用。
