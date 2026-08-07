# 🌙 Pixel Moonlight · 像素月夜个人主页

一个深夜月光主题的像素风个人学术主页模板。**纯静态**（HTML + CSS + 原生 JS），零依赖、零构建， fork 下来改一个文件就能变成你自己的主页，直接部署到 GitHub Pages。

**在线预览 → https://hezy618.github.io**

---

## ✨ 页面里有哪些设计

**像素月夜场景**

- 🌕 **手绘像素月亮**：16×16 点阵、7 级明暗色阶，光源在左上——陨石坑带深色坑底与受光侧坑沿高光，整体有光晕、上下浮动和滚动视差
- ⭐ **闪烁星空** + 不定期划过的**流星**
- ☁️ 像素云、远山剪影、胶片噪点颗粒
- 🖱️ **像素鼠标指针**（悬停链接时变金色），移动时拖出星尘轨迹

**塔罗牌照片卡（Hero 区）**

- 照片嵌在像素圆环里，悬停时 **3D 倾斜 + 流光跟随鼠标**
- **点击翻面**，背面显示一句属于你的格言
- 牌框上沿趴着一只**打盹的像素猫**（带 Zzz 和呼吸起伏）

**内容版块**

- ABOUT ME 个人简介（多段）
- EXPERIENCE 工作/实习 + 教育经历
- PUBLICATIONS 论文列表（学术向特化，见下）
- HONORS 荣誉奖项
- SIDE QUESTS 爱好卡片
- 所有版块滚动到可视区时柔和显现，顶部有像素导航栏

**学术主页特化功能**

- 🏷️ **评级徽章自动配色**：`CCF-A` / `CCF-B` / `CAS Q1 Top`（中科院分区）等，按文字自动匹配颜色
- 🔗 **徽章可点击**：CCF 徽章直达 CCF 官方目录、CORE 直达 ICORE 查询页、TH-CPL 直达清华官方 PDF（跳转表可自行增删）
- 🔑 **论文关键词**：作者名单下方一行小 chips，悬停高亮
- ✍️ 你的名字在作者列表中**自动加粗**；名字后加 `*` 自动标注共同一作并生成 "* Equal contribution" 脚注
- 📌 `Accepted`（绿）/ `Under Review`（紫）状态徽章自动区分

**彩蛋与细节**

- 🐱 全站共三只像素猫：打盹的、沿 PUBLICATIONS 上沿**来回巡逻自动调头**的（两帧步态动画）、蹲在 SIDE QUESTS 上**会眨眼**的
- ⌨️ 打字机效果的 tagline
- 🎮 Konami 秘籍彩蛋：方向键 `↑↑↓↓←→←→` 再按 `B A`，看看会发生什么

**工程特性**：无任何框架与依赖、无需 Node/构建工具、响应式适配手机、文件极小。

---

## ✏️ 改成你自己的：只需编辑 `data.js`

所有个人信息都集中在 **`data.js`** 一个文件里，每段都有中文注释，改完保存即可，不用碰 HTML/CSS/JS：

| 想改的内容 | 对应字段 |
|---|---|
| 姓名 / 大学 / 学院 / 专业 / 学位 / 城市 | `name` `university` `school` `major` `degree` `location` |
| 邮箱（`emailAlt` 留空自动隐藏） | `email` / `emailAlt` |
| 研究方向标签（chips） | `research` |
| 个人照片 | 替换 `pic/` 里的图片，并改 `photo` 路径 |
| Google Scholar / GitHub 等外链 | `links` |
| 塔罗牌文案（编号留空则隐藏整行） | `tarot` |
| 个人简介 | `bio`（数组，一项一段） |
| 工作 / 实习经历 | `experience`（数组） |
| 教育经历 | `education` |
| 发表论文 | `publications`（见下方字段说明） |
| 荣誉奖项 | `awards` |
| 爱好卡片 | `hobbies`（图标可用 emoji 或图片路径） |
| 评级徽章的跳转链接 | `levelLinks`（按徽章文字前缀匹配） |

**论文条目（`publications`）字段一览：**

```js
{
  title: "论文标题",
  authors: ["Your Name", "Co Author*"],   // 与 name 一致的自动加粗；* 标记共同一作
  venue: "期刊/会议名",
  year: 2026,
  status: "Accepted",                      // 或 "Under Review"
  level: "CCF-A",                          // 主评级徽章，颜色自动匹配
  extraLevels: ["CORE A*", "TH-CPL A"],    // 补充评级（金色空心徽章），可省略
  keywords: ["LLM Agents", "Reinforcement Learning"],  // 关键词 chips（作者下方），留空 [] 不显示
  links: { PDF: "https://doi.org/..." },   // 论文链接，键名随意增删
}
```

> 💡 `experience` / `publications` / `awards` 留成空数组 `[]` 时，对应版块会**自动隐藏**。

**本地预览**：直接双击打开 `index.html` 即可，或运行 `python3 -m http.server` 后访问 `http://localhost:8000`。

---

## 🚀 部署到 GitHub Pages

> ⚠️ **最重要的规则**：GitHub 个人主页的地址由**用户名**决定。想拥有 `https://<用户名>.github.io`，仓库名必须**恰好**是 `<用户名>.github.io`（例如用户名是 `tom`，仓库名就是 `tom.github.io`）。名字不匹配 GitHub 就不会把它当个人主页。

### 方式一：命令行（推荐）

先安装并登录 GitHub CLI（[安装地址](https://cli.github.com)，登录时会打开浏览器授权）：

```bash
gh auth login        # 依次选 GitHub.com → HTTPS → Yes → Login with a web browser
```

然后执行：

```bash
# 1. 下载本模板，并删除原仓库的 git 历史（这样它就是你的全新项目了）
git clone https://github.com/Hezy618/Hezy618.github.io.git my-homepage
cd my-homepage
rm -rf .git

# 2. 打开 data.js 填入你的个人信息，替换 pic/ 里的照片
#    （这一步在编辑器里完成，改完记得保存）

# 3. 初始化你自己的仓库并提交
git init -b main                        # 新建 git 仓库，主分支命名为 main
git add -A                              # 暂存所有文件
git commit -m "🌙 my pixel homepage"    # 提交

# 4. 在 GitHub 上创建仓库并推送（把 <用户名> 换成你的 GitHub 用户名）
gh repo create <用户名>.github.io --public --source=. --remote=origin --push
```

### 方式二：网页操作

1. 点本页右上角 **Fork**，或下载 ZIP 解压
2. 在 GitHub 网页右上角 **New repository**：仓库名填 `<用户名>.github.io`，选 Public，**不要**勾选初始化 README
3. 把文件推送到新仓库（网页上按提示操作，或在本地文件夹里执行）：

```bash
git init -b main && git add -A && git commit -m "🌙 my pixel homepage"
git remote add origin https://github.com/<用户名>/<用户名>.github.io.git
git push -u origin main
```

### 生效与日常更新

`<用户名>.github.io` 这种仓库会**自动开启 Pages**，无需任何设置。首次构建通常需要几分钟（偶尔更久），稍等后访问：

**`https://<用户名>.github.io`**

之后每次修改，三连即可自动重新部署：

```bash
git add -A && git commit -m "更新说明" && git push
```

> 💡  push 后网站更新有延迟属正常现象（GitHub 要重新构建）；浏览器端如看到旧版，按 `Cmd/Ctrl + Shift + R` 强制刷新。
>
> 💡 想用普通项目页也可以：任意仓库推送后到 **Settings → Pages** 选择 `main` 分支根目录，地址为 `https://<用户名>.github.io/<仓库名>/`。

---

## 📁 文件结构

```
├── index.html      # 页面结构
├── style.css       # 月夜像素风样式（星空 / 月亮 / 塔罗牌 / 猫 / 指针）
├── data.js         # ★ 你的所有信息都在这里，只改这个文件
├── script.js       # 渲染与动效（塔罗牌 3D / 像素猫 / 星尘 / 流星 / 视差）
├── pic/            # 个人照片
└── assets/         # 像素图标素材
```

---

## ⭐ 最后

如果这个模板帮你搭起了自己的主页，欢迎点一个 **Star** ⭐ 支持一下！

也欢迎通过 Issues 反馈问题、PR 贡献改进。期待看到大家的像素月夜 🌙
