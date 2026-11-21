# 静海余光 · AFTERLIGHT

在主页仓库根目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000/moon/`。游戏需要 WebGL，全部运行资源随子页发布。

- 月面可采集三份记录，小地图显示飞船和信标。WASD 移动，鼠标或拖动观察，Shift 奔跑，空格跳跃，E 采样。收集三份记录后可在飞船旁按 E 结算。
- 靠近飞船按 F 登船，座舱内按 F 起飞或 E 离舱。轨道内用鼠标调整航向、W/S 推进或反推、A/D 横移、Shift 增推、空格制动。飞近卫星并减速后按 E 校准，接近返航信标并减速后按 F 自动降落。
- 触屏可拖动视角，通过方向按钮移动或推进。靠近目标后使用页面上的采样、登船、校准或返航按钮。桌面可按 Esc 暂停，也可以使用仪表上的暂停按钮。

地形、登陆舱、手套、卫星和设备由代码生成。地球贴图来自 [NASA SVS Blue Marble](https://svs.gsfc.nasa.gov/2915/)，月面轨道贴图来自 [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) 的 LROC 广角相机全球拼接图。Three.js 采用 MIT 许可证，见 [LICENSE](vendor/LICENSE)。
