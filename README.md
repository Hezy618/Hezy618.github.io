# 🌙 像素风个人主页 · Pixel Moonlight

深夜月光主题的高级像素风个人学术主页，纯静态（HTML/CSS/JS），可直接部署到 GitHub Pages。

## ✨ 特色

- 🌕 **月夜场景**：像素月亮（带光晕与滚动视差）、闪烁星空、不定时流星、像素云与远山剪影、胶片噪点
- 🃏 **塔罗牌照片卡**：照片以像素圆形 + 金色像素环呈现 —— 悬停 3D 倾斜 + 流光跟随鼠标，**点击可翻面**（背面是一句格言）
- 🐱 **三只像素猫**：塔罗牌上打盹的（带 Zzz 与呼吸起伏）、PUBLICATIONS 上沿来回巡逻的（两帧步态、到边自动调头）、SIDE QUESTS 上蹲着会眨眼的
- 🖱️ **像素鼠标**：进入页面后指针变为像素箭头（悬停链接时变金色），移动时带星尘轨迹
- 🏷️ **可点击的评级徽章**：CCF 徽章直达 CCF 官方目录、CORE A\* 直达 ICORE 查询页、TH-CPL A 直达清华官方 PDF
- 📜 滚动显现动画、打字机 tagline、Konami 秘籍彩蛋（`↑↑↓↓←→←→BA`）

## ✏️ 如何修改个人信息

**只需要改 `data.js` 一个文件**，里面每一段都有中文注释：

| 内容 | 字段 |
|---|---|
| 姓名 / 大学 / 学院 / 专业 / 学位 | `name` `university` `school` `major` `degree` |
| 邮箱（`emailAlt` 留空自动隐藏） | `email` / `emailAlt` |
| 研究方向（chips 标签） | `research` |
| 个人照片 | 替换 `pic/` 里的文件，改 `photo` 路径 |
| 塔罗牌文案（`numeral` 留空整行隐藏） | `tarot` |
| Google Scholar / GitHub 等链接 | `links` |
| 简介 | `bio`（数组，一项一段） |
| 工作 / 实习经历 | `experience`（数组） |
| 教育经历 | `education`（与 `experience` 渲染在同一卡片） |
| 发表论文 | `publications` |
| 爱好 | `hobbies`（icon 可用 emoji 或 `assets/` 里的像素图） |

**论文条目的可用字段**：

- `authors`：与 `name` 完全一致的作者**自动加粗**；名字后加 `*` 自动标注共同一作并生成 "* Equal contribution" 脚注
- `status`：`"Accepted"`（绿）/ `"Under Review"`（紫）空心徽章
- `level`：`"CCF-A"` / `"CCF-B"` / `"CAS Q1 Top"` / `"CAS Q2"` 等，实心徽章颜色自动匹配
- `extraLevels`：补充评级标签数组，如 `["CORE A*", "TH-CPL A"]`（金色空心徽章）
- `links`：论文入口，如 `{ PDF: "https://doi.org/..." }`
- `levelLinks`：评级徽章的跳转链接表，按徽章文字前缀匹配

> `experience` / `publications` / `awards` 留空数组 `[]` 时，对应版块自动隐藏。

## 🚀 部署到 GitHub Pages

### 方案 A：GitHub CLI（推荐，两条命令）

首次使用先登录（会要求打开浏览器完成授权）：

```bash
gh auth login   # 选 GitHub.com → HTTPS → Yes → Login with a web browser
```

然后在本目录执行（仓库名必须是 `<你的用户名>.github.io`）：

```bash
git init -b main && git add -A && git commit -m "🌙 first upload"   # 仅首次
gh repo create hezy.github.io --public --source=. --remote=origin --push
```

### 方案 B：网页建仓 + 手动推送

1. 在 github.com 新建仓库：名为 `hezy.github.io`、Public、**不要**勾选 README
2. 然后在本目录执行：

```bash
git init -b main && git add -A && git commit -m "🌙 pixel homepage"   # 仅首次
git remote add origin git@github.com:Hezy618/hezy.github.io.git
git push -u origin main
```

### 生效与日常更新

`<用户名>.github.io` 这种仓库会**自动开启 Pages**（无需任何设置），推送后约 1 分钟访问：

**https://hezy.github.io**

之后每次改完内容，三连即可自动重新部署：

```bash
git add -A && git commit -m "更新说明" && git push
```

> 想用普通项目仓库也可以：推送后在仓库 **Settings → Pages** 里选择 `main` 分支根目录，
> 访问地址为 `https://<用户名>.github.io/<仓库名>/`。

本地预览：直接双击 `index.html`，或运行 `python3 -m http.server` 后访问 `http://localhost:8000`。

## 📁 文件结构

```
homepage/
├── index.html      # 页面结构
├── style.css       # 月夜像素风样式（星空 / 塔罗牌 / 像素圆 / 猫 / 指针）
├── data.js         # ★ 你的所有信息都在这里
├── script.js       # 渲染与动效（塔罗牌 3D / 猫 / 星尘 / 流星 / 视差）
├── pic/
│   └── hezhongyu.png   # 个人照片
└── assets/
    ├── clawd.svg       # 像素 Clawd 图标（Vibe Coding 爱好卡）
    └── photo.svg       # 备用占位像素头像
```
