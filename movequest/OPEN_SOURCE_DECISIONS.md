# MoveQuest 3.0 — 渲染与开源决策

评估日期：2026-11-20。现有 MoveQuest 是 React / Vite / React Router 应用；根目录另有 Next.js 应用，本次不迁移或替换它。已有 React、SVG、Lucide、PWA 与 localStorage 事务值得保留。

| 候选 | 与现有栈及维护方式 | 许可核对 | 集成、性能与体积取舍 | 结论 |
| --- | --- | --- | --- | --- |
| [PixiJS](https://github.com/pixijs/pixijs) | 可嵌入 React；官方仓库有文档链接 | [MIT](https://github.com/pixijs/pixijs/blob/dev/LICENSE) | 适合大量精灵和 WebGL 场景，但要额外桥接可访问对象、生命周期和命中测试；本次没有安装或测量其包大小 | 超过当前 40 地点预算、需要大量精灵时优先重评 |
| [Phaser](https://github.com/phaserjs/phaser) | 完整 Canvas/WebGL 游戏框架，可嵌入页面 | 仓库标注 MIT；本次两个猜测的原始许可证路径均返回 404，未导入代码 | 物理、游戏循环等能力超出当前需求；没有测量依赖体积或声称 benchmark | 不引入 |
| [React Flow](https://github.com/xyflow/xyflow) | React 节点图生态 | [MIT](https://github.com/xyflow/xyflow/blob/main/LICENSE) | 泛用节点和边适合图编辑；其视觉及交互语义不适合作为游戏地图 | 不用于最终地图 |
| 原生 SVG + React | 延续现有工程；由浏览器渲染和事件系统承担通用能力 | Web 平台，无新增渲染依赖 | 40 个地点以内，DOM 可直接支持键盘命中、触控和按钮语义；当前场景通过双端浏览器检查，不声称通用性能上限 | 本次采用 |

建筑由 x/z/高度的等距投影与实体面构成，按世界深度排序；房顶、幕墙窗、站台、树冠、长椅、花丛、道路和地块均为原创程序化几何。地图不是图片背景、Emoji 或 React Flow 节点。坐标持久化，后续地点只分配空地块。道路表达关系，不表示真实道路、距离或导航；未知关系标为景观步道。

参考截图只用来确定视觉方向；未复制其游戏人物、建筑贴图或商业素材。没有引入第三方等距 sprite 包，故没有将代码许可误当素材许可。图标继续使用已有 Lucide，完整许可见 `licenses/LUCIDE.txt` 与 `THIRD_PARTY_NOTICES.md`。原有花园资产与数据保留。

本次选择的是可复用程序化几何，不是图像生成：地图打开、刷新、增加地点、机会推荐、反馈学习、放置装饰都不会调用模型。模型仅在用户主动提交生活描述时运行。

已完成的地图是轻量矢量微缩城镇。它不具有参考图的高精度 3D 材质、丰富角色动画、剖面室内或完整城市密度；这些不能宣称已经达标。物理手机 GPU 和 40 个地点极限帧率尚未做专项实测。

## V4 追加评估

检查了 Kenney [City Kit (Suburban)](https://kenney.nl/assets/city-kit-suburban)，官方标注 CC0，包含 40 个 3D 资源。它需要模型导入或离线渲染流程，和现有矢量光照风格不能直接混用；本次没有导入该包，也不冒称复用其美术。两个猜测的 isometric 页面返回 404，未取得可核对的素材，未使用。

继续使用原生 SVG 的实体几何系统，新增独立学校、景观花园、喷泉、路灯、花箱和装饰交通。世界几何在 `worldLayout.ts`，美术在 `LifeWorld.tsx`。没有为替换引擎引入新的大型运行时依赖；PixiJS 仍为后续大量精灵或更复杂动画时的候选。新增图形均为原创，已有 Lucide 继续遵守原许可证。

语音使用浏览器 Web Speech API，无付费 ASR SDK；浏览器自身可能使用远程识别服务，UI 已说明，不声称所有设备均可离线识别。
