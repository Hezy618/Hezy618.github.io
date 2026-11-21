# 星际野地 · Wild Meridian

在仓库根目录运行 `python3 -m http.server 8000`，打开 `http://localhost:8000/deep-space/`。支持 WebGL 的桌面浏览器和触屏界面。进度保存在当前浏览器。

- 按 Q 扫描，E 采集。B 打开蓝图，选择建筑后用 E 放置。先建基地信标，再放太阳能阵列和制造工坊。靠近已供电的工坊可冶炼和合成燃料。
- 靠近飞船后按 F 入座，再按 F 起飞。W/S 推进，A/D 侧移，R/C 升降，空格制动。Shift 增推。在平地低速下降会触地，E 离舱。
- M 打开星图，选择目的地后可启动巡航，V 或空格结束巡航。三颗星球均可绕行和着陆。登陆后可建立新的基地或搜索记录站。
- I 打开货舱，可在船上或船旁加注已储备的燃料。舱内或靠近飞船可补给，供电后的居住舱也能恢复宇航服能源。
- 鼠标可锁定观察，浏览器未授权时可按住画面拖动。触屏长按方向或升降键，使用屏幕按钮采集和登船。

地形与三维设备由网页内程序化生成。地表材质采用 Poly Haven 的 CC0 [Dry Ground Rocks](https://polyhaven.com/a/dry_ground_rocks)、[Gray Rocks](https://polyhaven.com/a/gray_rocks) 与 [Aerial Grass Rock](https://polyhaven.com/a/aerial_grass_rock) 扫描，并叠加程序化分层。游戏复用了自有宇航服模型和本仓库随附的 MIT Three.js。
