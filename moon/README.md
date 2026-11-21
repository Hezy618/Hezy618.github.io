# 静海余光 · AFTERLIGHT

在主页仓库根目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000/moon/`。游戏需要 WebGL，全部运行资源随子页发布。

- 在月面用 WASD 移动，鼠标或拖动观察，Shift 奔跑，空格跳跃，E 采样。收集三份记录后可在飞船旁按 E 结算。
- 靠近登陆舱按 F 登船，座舱内再次按 F 即可从当前停泊点升空。用 W/S 推进或反推，A/D 横移，R 上升，C 下降，空格制动，Shift 增推。飞近两台空中中继并减速后可按 E 校准。
- 选平坦空地，松开横移或按空格制动，再按住 C 下降到起落架触地。此时可按 E 在当地离舱，也可再次按 F 起飞。摄像机、飞船、月面和采样记录共用同一个场景与任务状态。
- 触屏可拖动视角，通过方向按钮移动或推进，并长按升降按钮控制高度。桌面可按 Esc 暂停，也可以使用仪表上的暂停按钮。

地形、登陆舱、手套和设备由代码生成。地球贴图来自 [NASA SVS Blue Marble](https://svs.gsfc.nasa.gov/2915/)，月面材质的低频明暗使用 [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) 的 LROC 广角相机全球拼接图。Three.js 采用 MIT 许可证，见 [LICENSE](vendor/LICENSE)。
