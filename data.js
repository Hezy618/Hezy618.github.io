/* ============================================================
 *  ★★★  EDIT ME — 你的所有个人信息都在这个文件里  ★★★
 *  修改这里的内容，网页会自动更新，不需要碰 HTML/CSS。
 * ============================================================ */

const SITE = {

  /* ---------- 基本信息 ---------- */
  name: "Zhongyu He",                      // 姓名（论文作者列表里同名会自动加粗）
  tagline: "M.S. student @ Xiamen University · LLM Algorithm Engineer Intern @ Meituan",
  photo: "pic/hezhongyu.jpg",              // 你的照片路径（pic/hezhongyu.jpg）
  university: "Xiamen University",
  school: "School of Informatics",         // 信息学院
  major: "Computer Science and Technology",
  degree: "M.S. Student",
  location: "Xiamen, China",
  email: "hezhongyu618@qq.com",              // 邮箱
  emailAlt: "",                              // 第二个邮箱（留空则不显示）

  /* ---------- 研究方向（显示为 chips） ---------- */
  research: ["LLM Agents", "Agentic RL", "Knowledge Distillation", "Hypergraph", "Knowledge Graph", "Bioinformatics"],

  /* ---------- 外部链接（没有就删掉那一行） ---------- */
  links: {
    "Google Scholar": "https://scholar.google.com/citations?user=O-E3TdAAAAAJ&hl=zh-CN&authuser=1",
    "GitHub": "https://github.com/Hezy618",
    "X": "https://x.com/hezzzyu",
  },

  /* ---------- 塔罗牌（左侧照片卡） ----------
   * numeral: 牌面顶部罗马数字；backQuote: 点击牌面翻面后背面显示的一句话；
   * 牌面头像下方会自动显示上方 links 里的外链按钮（GitHub / Scholar / X 等）
   */
  tarot: {
    numeral: "",                            // 牌面顶部罗马数字（留空则整行隐藏）
    backQuote: "“Not all who wander are lost.”",
    backQuoteDay: "“Every sunrise is a new quest.”",   // 白天模式背面座右铭（留空则昼夜共用 backQuote）
  },

  /* ---------- About Me 简介（支持多段） ---------- */
  bio: [
    "I am a Master's student at the School of Informatics, Xiamen University, majoring in Computer Science and Technology. My research interests include LLM agents, Agentic RL, knowledge distillation, hypergraphs, knowledge graphs, and bioinformatics.",
    "Currently, I am an LLM Algorithm Engineer intern at Meituan (Core Local Commerce), focusing on post-training of the customer-service LLM — SFT, multi-turn dialogue Agent RL, and OPD.",
  ],

  /* ---------- 实习 / 工作经历 ---------- */
  experience: [
    {
      role: "LLM Algorithm Engineer Intern",
      org: "Meituan · Core Local Commerce",
      period: "2026.03 – 2026.09",
      desc: "Responsible for post-training of the customer-service LLM, with hands-on experience in SFT, multi-turn dialogue Agent RL, and OPD.",
    },
  ],

  /* ---------- 教育经历 ---------- */
  education: [
    { period: "2024 – 2027", degree: "M.S. in Computer Science and Technology", school: "Xiamen University" },
    { period: "2020 – 2024", degree: "B.Eng. in Computer Science and Technology", school: "Wuhan University of Science and Technology (Rank 2/255, recommended admission to Xiamen University)" },  // 保研
  ],

  /* ---------- 评级徽章的跳转链接（按徽章文字前缀匹配，点击徽章即可跳转） ---------- */
  levelLinks: {
    "CCF": "https://www.ccf.org.cn/Academic_Evaluation/By_category/",      // CCF 推荐目录官网
    "CORE": "https://portal.core.edu.au/conf-ranks/?search=EMNLP&by=acronym",  // ICORE 官方查询页
    "TH-CPL": "https://numbda.cs.tsinghua.edu.cn/~yuwj/TH-CPL.pdf",        // 清华 TH-CPL 官方 PDF
  },

  /* ---------- 发表论文 ----------
   * level 可填: "CCF-A" / "CCF-B" / "CCF-C" / "CAS Q1 Top" / "CAS Q2" ...
   * badge 颜色会自动匹配；status 可填 "Accepted" / "Under Review" 等；
   * extraLevels 可填补充评级标签，如 ["CORE A*", "TH-CPL A"]（金色空心徽章）；
   * keywords 为关键词数组，显示在作者名单下方（留空 [] 则不显示）；
   * meta 为审稿均分，仅 Under Review 的会议论文需要（如 meta: 3.5，留空则不显示）；
   * 作者名后加 * 表示共同一作（页面自动加 "* Equal contribution" 脚注）；
   * links 里的键可以随意增删（PDF / Code / arXiv / DOI / Project ...）；
   * 整段数组清空 [] 后该版块会自动隐藏
   */
  publications: [
    {
      title: "SIRI: Self-Internalizing Reinforcement Learning with Intrinsic Skills for LLM Agent Training",
      authors: ["Zhongyu He*", "Yuanfan Li*", "Fei Huang", "Tianyu Chen", "Siyuan Chen", "Xingyang Li", "Meng Hsuan Yu", "Xiangrong Liu", "Leyi Wei", "Lu Pan", "Ke Zeng", "Xunliang Cai"],   // * 共同一作
      venue: "EMNLP (Main Conference)",
      year: 2026,
      status: "Accepted",
      level: "CCF-B",
      extraLevels: ["CORE A*", "TH-CPL A"],   // EMNLP: CORE2023 起 A*，清华 TH-CPL A 类
      keywords: ["LLM Agents", "Agentic RL", "SKILL", "Self-Distillation"],
      links: { PDF: "https://arxiv.org/pdf/2606.02355" },
    },
    {
      title: "HKD-CPI: High-Order Knowledge Distillation Enhanced Inductive Compound-Protein Interaction Prediction",
      authors: ["Zhongyu He", "Xiangrong Liu", "Yinghui Jiang", "Junlin Xu", "Yuan Lin", "Shuting Jin", "Leyi Wei", "Youyu Wang"],
      venue: "Bioinformatics",
      year: 2026,
      status: "Accepted",
      level: "CCF-A",
      keywords: ["Knowledge Distillation", "Graph2Token", "Hypergraph", "Chemical Language Model"],
      links: { PDF: "https://doi.org/10.1093/bioinformatics/btag290" },
    },
    {
      title: "DualBAN: Unifying Intra- and Inter-molecular Features for Compound-Protein Interaction Prediction",
      authors: ["Shida He*", "Zhongyu He*", "Yuting Zhang", "Weidong Ye"],   // * 共同一作
      venue: "IEEE Journal of Biomedical and Health Informatics (JBHI)",
      year: 2026,
      status: "Accepted",
      level: "CAS Q1 Top",
      keywords: ["Chemical Language Model", "Attention"],
      links: { PDF: "https://doi.org/10.1109/JBHI.2026.3678303" },
    },
    {
      title: "Precision-Guarded Graph-Text Alignment for Universal Chemical Understanding",
      authors: ["Yongqiu Lin", "Lian Shen", "Zhongyu He", "Jinjin Li", "Xiaorui Kang", "Chen Su", "Changhang Lin", "Xiangrong Liu", "Leyi Wei"],
      venue: "Journal of Chemical Information and Modeling (JCIM)",
      year: 2026,
      status: "Accepted",
      level: "CAS Q2",
      keywords: ["Graph2Token", "Molecular Representation"],
      links: { PDF: "https://doi.org/10.1021/acs.jcim.6c01205" },
    },
    {
      title: "Ability-Aligned Skill Evolution for LLM Agents via Reinforcement Learning",
      authors: ["Fei Huang", "Tianyu Chen", "Zhongyu He", "Yuanfan Li", "Meng Hsuan Yu", "Xingyang Li", "Lu Pan", "Ke Zeng", "Xunliang Cai"],
      venue: "Findings of EMNLP",
      year: 2026,
      status: "Accepted",
      keywords: ["LLM Agents", "Agentic RL", "SKILL"],
      links: {},                                                        // TODO: 有公开链接后补上
    },
    {
      title: "Knowledge Embedding-based Dynamic Hypergraph Neural Networks for Knowledge Graph Completion",
      authors: ["Zhongyu He", "Shuting Jin", "Xiangrong Liu", "Junlin Xu", "Tengfei Ma", "Leyi Wei"],
      venue: "IEEE Transactions on Knowledge and Data Engineering (TKDE)",
      year: 2026,
      status: "Under Review",
      level: "CCF-A",
      keywords: ["Hypergraph", "Knowledge Graph"],
      links: {},                                                        // TODO: 有公开链接后补上
    },
  ],

  /* ---------- 荣誉奖项（没有可留空数组 []） ----------  TODO */
  awards: [
    // "National Scholarship (Top 1%), 2025",
  ],

  /* ---------- 个人爱好 ----------  TODO: 换成你的真实爱好
   * icon 可以是 emoji，也可以是 assets/ 下的图片路径（如 "assets/game.png"）
   */
  hobbies: [
    { icon: "assets/clawd.svg", title: "Vibe Coding",        desc: "Heavy vibe coder — 10x-ing my research & work with Claude Code and other AI coding agents." },
    { icon: "📷", title: "Photography",        desc: "Experienced in portrait photography — capturing people at their best." },
    { icon: "🏸", title: "Badminton & Running", desc: "Weekly badminton plus casual runs — sweating out the paper-rejection blues." },
    { icon: "🎸", title: "Guitar & Singing",   desc: "Guitar strummer; can sing pretty much everything by Jay Chou, Wang Leehom, and JJ Lin." },
  ],

  /* ---------- 页脚 ---------- */
  footer: "© 2026 Zhongyu He",
};
