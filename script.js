/* ============================================================
   渲染 + 动效脚本（一般不用改这里，改 data.js 就行）
   ============================================================ */

(function () {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html !== undefined) e.innerHTML = html;
    return e;
  };
  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ==================== 内容渲染 ==================== */

  document.title = `${SITE.name} — Homepage`;
  $("#nav-name").textContent =
    SITE.name.split(" ").map((w) => w[0]).join("").toUpperCase() || "PLAYER";
  $("#profile-name").textContent = SITE.name;
  $("#profile-photo").src = SITE.photo;
  $("#hero-summary").textContent = SITE.heroSummary || "";

  const stats = [
    ["CURRENT", `${SITE.degree} · ${SITE.university}`],
    ["EXPERIENCE", "6-month LLM Algorithm Engineer internship · Meituan"],
    ["BASED", SITE.location],
  ];
  const statList = $("#stat-list");
  stats.forEach(([k, v]) => {
    if (!v) return;
    statList.appendChild(el("li", null,
      `<span class="k">${k}</span> ${typeof v === "string" && v.startsWith("<") ? v : esc(v)}`));
  });

  /* 研究方向 chips */
  const chipRow = $("#chip-row");
  (SITE.research || []).slice(0, 3).forEach((r) => chipRow.appendChild(el("span", "chip", esc(r))));

  /* GitHub / Scholar / X 等外链：渲染进塔罗牌头像下方，点击不触发翻面 */
  /* 已识别链接名前拼官方 logo（内联 SVG，currentColor 跟随悬停反色） */
  const LINK_ICONS = {
    github: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
    scholar: "M5.242 13.769L0 9.5 12 0l12 9.5-5.242 4.269C17.548 11.249 14.978 9.5 12 9.5c-2.977 0-5.548 1.748-6.758 4.269zM12 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14z",
    x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z",
  };
  const linkIcon = (label) => {
    const key = Object.keys(LINK_ICONS).find((k) => label.toLowerCase().includes(k));
    if (!key) return null;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("class", "lico");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", LINK_ICONS[key]);
    p.setAttribute("fill", "currentColor");
    svg.appendChild(p);
    return svg;
  };
  const tarotLinks = $("#tarot-links");
  Object.entries(SITE.links || {}).forEach(([label, url]) => {
    const a = el("a", null, "");
    const ico = linkIcon(label);
    if (ico) a.appendChild(ico);
    a.appendChild(el("span", null, esc(label)));
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    tarotLinks.appendChild(a);
  });
  tarotLinks.addEventListener("click", (e) => e.stopPropagation());

  /* 塔罗牌文案 */
  if (SITE.tarot) {
    $("#tarot-numeral").textContent = SITE.tarot.numeral || "";
    $("#tarot-back-quote").textContent = SITE.tarot.backQuote || "";
    if (!SITE.tarot.numeral) {                       // 无编号时隐藏整个顶部行
      const top = document.querySelector(".tarot-top");
      if (top) top.style.display = "none";
    }
  }
  /* 塔罗牌元素联动昼夜：白天把月亮纹样（☾/☽）换成太阳（☀），背面座右铭换积极版。
     在主题翻转和页面初始化时调用。 */
  const syncTarot = (day) => {
    document.querySelectorAll(".tgly").forEach((s) => {
      s.textContent = day ? "☀︎" : (s.dataset.night || "☾");   // ☀ + VS15：强制文字形态，避免渲染成彩色 emoji
    });
    if (SITE.tarot) {
      $("#tarot-back-quote").textContent =
        (day && SITE.tarot.backQuoteDay) ? SITE.tarot.backQuoteDay : (SITE.tarot.backQuote || "");
    }
  };

  /* About */
  const bio = $("#bio");
  (SITE.bio || []).forEach((p) => bio.appendChild(el("p", null, esc(p))));

  /* 实习经历 */
  const expList = $("#exp-list");
  (SITE.experience || []).forEach((e) => {
    expList.appendChild(el("div", "exp-item",
      `<div class="exp-head">
         <span><span class="exp-role">${esc(e.role)}</span> <span class="exp-org">@ ${esc(e.org)}</span></span>
         <span class="exp-period">${esc(e.period)}</span>
       </div>
       ${e.desc ? `<p class="exp-desc">${esc(e.desc)}</p>` : ""}`));
  });
  if (!(SITE.experience || []).length) $("#experience").style.display = "none";

  /* Publications */
  function badgeClass(level) {
    const s = String(level || "").toLowerCase().replace(/\s/g, "");
    if (s.includes("ccf-a") || s.includes("ccfa")) return "ccf-a";
    if (s.includes("ccf-b") || s.includes("ccfb")) return "ccf-b";
    if (s.includes("ccf-c") || s.includes("ccfc")) return "ccf-c";
    if (s.includes("中科院") || s.includes("sci") || s.includes("q1") || s.includes("q2")) return "cas";
    return "default";
  }

  /* 评级徽章按前缀匹配 levelLinks，命中则渲染为可点击链接 */
  function badgeLink(text) {
    for (const [k, url] of Object.entries(SITE.levelLinks || {})) {
      if (String(text).toUpperCase().startsWith(k.toUpperCase())) return url;
    }
    return null;
  }
  function badgeEl(text, cls) {
    const url = badgeLink(text);
    const b = el(url ? "a" : "span", `badge ${cls}`, esc(text));
    if (url) { b.href = url; b.target = "_blank"; b.rel = "noopener"; b.title = url; }
    return b;
  }

  const pubList = $("#pub-list");
  (SITE.publications || []).forEach((pub) => {
    let hasEqual = false;
    const authors = pub.authors
      .map((a) => {
        const t = a.trim();
        const bare = t.replace(/\*+$/, "").trim();   // 去掉共同一作标记再比对加粗
        const star = t.endsWith("*") ? '<span class="eq">*</span>' : "";
        if (star) hasEqual = true;
        return (bare === SITE.name.trim() ? `<strong>${esc(bare)}</strong>` : esc(bare)) + star;
      })
      .join(", ");

    const card = el("article", "pub-card");
    card.appendChild(el("h3", "pub-title", esc(pub.title)));
    card.appendChild(el("p", "pub-authors", authors));
    if (hasEqual) card.appendChild(el("p", "pub-note", "* Equal contribution"));
    card.appendChild(el("p", "pub-venue", `${esc(pub.venue)}, ${esc(pub.year)}`));

    const badges = el("div", "pub-badges");
    if (pub.status) {
      const st = el("span", "badge status", esc(pub.status));
      if (/review/i.test(pub.status)) st.classList.add("review");
      badges.appendChild(st);
    }
    if (pub.meta != null && pub.meta !== "")
      badges.appendChild(el("span", "badge meta", `Meta ${esc(String(pub.meta))}`));
    if (pub.level) badges.appendChild(badgeEl(pub.level, badgeClass(pub.level)));
    (pub.extraLevels || []).forEach((lv) =>
      badges.appendChild(badgeEl(lv, "alt")));
    const links = el("span", "pub-links");
    Object.entries(pub.links || {}).forEach(([label, url]) => {
      const icon = /pdf/i.test(label)
        ? '<path d="M7 3h7l4 4v14H7zM14 3v5h4M10 13h5M10 16h5"/>'
        : /anthology/i.test(label)
        ? '<path d="M3 5q5-2 9 1q4-3 9-1v14q-5-2-9 1q-4-3-9-1zM12 6v14"/>'
        : '<path d="M4 11l8-7l8 7M6 10v10h12V10M10 20v-6h4v6"/>';
      const a = el("a", null, `<svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg><span>${esc(label)}</span><span class="resource-arrow" aria-hidden="true">↗</span>`);
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      links.appendChild(a);
    });
    card.appendChild(badges);
    if (links.childElementCount) card.appendChild(links);
    if ((pub.keywords || []).length) {
      card.appendChild(el("p", "pub-keywords",
        pub.keywords.map((k) => `<span class="kw">${esc(k)}</span>`).join("")));
    }
    pubList.appendChild(card);
  });
  if (!(SITE.publications || []).length) $("#publications").style.display = "none";

  /* Education & Awards */
  const eduList = $("#edu-list");
  (SITE.education || []).forEach((e) => {
    eduList.appendChild(el("li", null,
      `<span class="edu-period">${esc(e.period)}</span>${esc(e.degree)}, ${esc(e.school)}`));
  });

  const awardList = $("#award-list");
  (SITE.awards || []).forEach((a) => awardList.appendChild(el("li", null, esc(a))));
  if (!(SITE.awards || []).length) $("#awards").style.display = "none";

  /* Hobbies */
  const grid = $("#hobby-grid");
  (SITE.hobbies || []).forEach((h) => {
    const isImg = /\.(png|jpe?g|gif|svg|webp)$/i.test(h.icon);
    const icon = isImg ? `<img src="${esc(h.icon)}" alt="">` : esc(h.icon);
    grid.appendChild(el("div", "hobby-card",
      `<span class="hobby-icon">${icon}</span>
       <h3 class="hobby-title">${esc(h.title)}</h3>
       <p class="hobby-desc">${esc(h.desc)}</p>`));
  });

  /* Footer */
  $("#footer-text").textContent = SITE.footer || "";

  /* ==================== 打字机 tagline ==================== */
  const tw = $("#typewriter");
  const text = SITE.tagline || "";
  let i = 0;
  (function type() {
    if (i <= text.length) {
      tw.textContent = text.slice(0, i++);
      setTimeout(type, 42);
    }
  })();

  /* ==================== 像素月亮 ==================== */
  /* 32×32 程序化生成（4px 粒度，比原 16 列手绘细腻得多）：
   * 光源在左上，按到圆心距离与光向连续计算明暗，映射到调色板；
   * 叠加坐标哈希噪声做表面斑驳；环形山坑底压暗、受光侧坑沿提亮、背光侧压暗。
   * t=透明 h=高光 m=月光 k=过渡 s=暗部 d=深影 c=陨石坑底 r=坑沿高光 */
  const MOON = (() => {
    const N = 32, R = 14.6, C = N / 2 - .5;
    const craters = [
      { x: 10, y: 9,  r: 2.6 },   // 亮部大坑
      { x: 21, y: 12, r: 3.2 },   // 中部大坑
      { x: 13, y: 21, r: 2.2 },
      { x: 18, y: 24, r: 1.6 },
      { x: 16, y: 15, r: 1.2 },   // 中央小坑
    ];
    const noise = (x, y) => {
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      return n - Math.floor(n);
    };
    const rows = [];
    for (let y = 0; y < N; y++) {
      let row = "";
      for (let x = 0; x < N; x++) {
        const dx = x - C, dy = y - C;
        if (Math.hypot(dx, dy) > R) { row += "t"; continue; }
        const lum = (-(dx + dy) / (2 * R)) * 1.6;                  // 光在左上：越靠左上越亮
        const b = 0.52 + lum * 0.5 + (noise(x, y) - 0.5) * 0.14;   // 基础亮度 + 斑驳
        const band = (v) => v > 0.88 ? "h" : v > 0.68 ? "m" : v > 0.48 ? "k" : v > 0.28 ? "s" : "d";
        let ch = band(b);
        for (const cr of craters) {
          const dd = Math.hypot(x - cr.x, y - cr.y);
          if (dd < cr.r) { ch = band(b - 0.24); break; }            // 坑底：沿用当地明暗、整体压暗一档
          if (dd < cr.r + 1.1) {                                    // 坑沿：受光侧提亮（仅限亮区）
            ch = ((x - cr.x) + (y - cr.y)) < 0 && b > 0.3 ? "r" : "d";
            break;
          }
        }
        row += ch;
      }
      rows.push(row);
    }
    return rows;
  })();
  const moon = $("#moon");
  MOON.forEach((row) => {
    const r = el("div", "row");
    for (const ch of row) r.appendChild(el("div", "px " + ch));
    moon.appendChild(r);
  });

  /* 月亮滚动视差 */
  const moonWrap = $(".moon-wrap");
  /* Companions are drawn and animated in companions.js. */
  syncTarot(document.documentElement.classList.contains("day"));

  /* ==================== 塔罗牌交互 ==================== */
  const scene = $("#tarotScene");
  const tilt = $("#tarotTilt");
  const card = $("#tarotCard");
  const glare = $("#tarotGlare");
  const MAX_TILT = 5;

  scene.addEventListener("mousemove", (e) => {
    const rect = scene.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;   // -0.5 ~ 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    tilt.style.transform = `rotateY(${px * MAX_TILT}deg) rotateX(${-py * MAX_TILT}deg) scale(1.03)`;
    glare.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
    glare.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
  });
  scene.addEventListener("mouseleave", () => {
    tilt.style.transform = "rotateY(0deg) rotateX(0deg) scale(1)";
  });
  const flipPortrait = () => {
    const flipped = card.classList.toggle("flipped");
    scene.setAttribute("aria-pressed", String(flipped));
  };
  scene.addEventListener("click", (e) => { if (!e.target.closest("a, .cat")) flipPortrait(); });
  scene.addEventListener("keydown", (e) => {
    if (e.target === scene && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); flipPortrait(); }
  });

  /* ==================== 鼠标星尘轨迹 ==================== */
  const dustBox = $("#stardust");
  let lastDust = 0;
  document.addEventListener("mousemove", (e) => {
    const now = performance.now();
    if (now - lastDust < 42) return;           // 节流
    lastDust = now;
    if (dustBox.childElementCount > 36) dustBox.firstChild.remove();
    const d = el("span", "dust" + (Math.random() < 0.3 ? " g" : ""));
    d.style.left = e.clientX - 2 + "px";
    d.style.top = e.clientY - 2 + "px";
    dustBox.appendChild(d);
    setTimeout(() => d.remove(), 600);
  });

  /* ==================== 滚动显现 ==================== */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add("in");
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((s) => io.observe(s));

  /* Keep the compact pixel navigation synchronized with the section in view. */
  const navLinks = [...document.querySelectorAll(".nav-links a[href^='#']")];
  const navTargets = navLinks
    .map((link) => ({ link, target: document.querySelector(link.getAttribute("href")) }))
    .filter(({ target }) => target);
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navTargets.forEach(({ link, target }) => link.classList.toggle("active", target === entry.target));
    });
  }, { rootMargin: "-22% 0px -62% 0px", threshold: 0 });
  navTargets.forEach(({ target }) => navIO.observe(target));

  /* ==================== 彩蛋：Konami 秘籍 ==================== */
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let buf = [];
  const rainbow = ["#e85a5a", "#e8c46a", "#7fd8a4", "#8fd8e8", "#d98fb8"];
  document.addEventListener("keydown", (e) => {
    buf.push(e.key);
    buf = buf.slice(-KONAMI.length);
    if (buf.join(",") === KONAMI.join(",")) {
      const title = $("#profile-name");
      let t = 0;
      setInterval(() => { title.style.color = rainbow[t++ % rainbow.length]; }, 150);
    }
  });

  /* ==================== 白天主题：太阳 + 马里奥场景 + 切换按钮 ==================== */
  /* 像素太阳：32×32 距离场圆盘 + 8 道光芒（与月亮同容器，白天替换显示） */
  const sun = $("#sun");
  if (sun) {
    const N = 32, R = 9.5, C = N / 2 - .5;
    for (let y = 0; y < N; y++) {
      const r = el("div", "row");
      for (let x = 0; x < N; x++) {
        const dx = x - C, dy = y - C;
        const d = Math.hypot(dx, dy);
        let ch = "t";
        if (d <= R) ch = d < R * 0.55 ? "y" : d < R * 0.82 ? "g" : "a";
        else if (d > R + 1.5 && d < R + 6) {
          const ang = Math.atan2(dy, dx);
          const sector = Math.round(ang / (Math.PI / 4)) * (Math.PI / 4);
          if (Math.abs(Math.sin(ang - sector) * d) < 1.2) ch = "g";
        }
        r.appendChild(el("div", "px " + ch));
      }
      sun.appendChild(r);
    }
  }

  /* 马里奥精灵帧（16×16）：R=红 S=肤 B=蓝 W=棕 o=眼 t=透明 */
  const MARIO_RUN_A = [
    "tttttRRRRRtttttt",
    "ttttRRRRRRRRRttt",
    "ttttWWWSSoSttttt",
    "tttWSSSWSSSStttt",
    "tttWSSWWSSSStttt",
    "ttttSSSSSSSttttt",
    "tttRRBRRRBRRtttt",
    "ttRRRBRRRBRRRttt",
    "ttRRRRBBBBRRRttt",
    "ttSSRRBBBBRSSttt",
    "ttttBBBBBBBttttt",
    "tttBBBBBBBBttttt",
    "tttBBBttBBBBtttt",
    "ttBBBtttttBBBttt",
    "ttWWtttttttWWttt",
    "tWWWtttttttWWWtt",
  ];
  const MARIO_RUN_B = MARIO_RUN_A.slice(0, 12).concat([
    "ttttBBBBBBtttttt",
    "tttBBBtttBBBtttt",
    "tttWWtttttWWtttt",
    "tttWWWtttWWWtttt",
  ]);
  const MARIO_JUMP = MARIO_RUN_A.slice(0, 12).concat([
    "ttttBBBtBBBttttt",
    "tttWWBBttBBWWttt",
    "tttttttttttttttt",
    "tttttttttttttttt",
  ]);

  /* 场景：马里奥从左跑到右，路过问号砖时跳起顶出金币，跑出屏幕后循环 */
  const marioScene = $("#mario-scene"), mario = $("#mario");
  if (marioScene && mario) {
    const mkFrame = (rows) => {
      const f = el("div", "mframe");
      rows.forEach((row) => {
        const r = el("div", "mrow");
        for (const ch of row) r.appendChild(el("div", "mpx " + ch));
        f.appendChild(r);
      });
      return f;
    };
    const fRunA = mkFrame(MARIO_RUN_A), fRunB = mkFrame(MARIO_RUN_B), fJump = mkFrame(MARIO_JUMP);
    fRunB.style.display = "none"; fJump.style.display = "none";
    mario.append(fRunA, fRunB, fJump);
    const show = (f) => [fRunA, fRunB, fJump].forEach((x) => { x.style.display = x === f ? "" : "none"; });

    /* 场景装饰：SMB 经典元素，全部用字符画逐像素生成（与猫/马里奥同一套工艺） */
    const DECO_PAL = {
      o: "#241a12", t: "transparent",
      G: "#43a047", g: "#2e7d36",                 // 山/草丛
      L: "#8fe07a", D: "#1e5c26",                 // 水管高光/暗面
      B: "#c96a1e", s: "#5a2d08",                 // 悬浮砖块/砖缝
      W: "#ffffff",                               // 像素云/蘑菇斑点
      R: "#e52521", S: "#ffcf9c",                 // 蘑菇伞盖/菌柄
    };
    const SHROOM = [
      "tttRRRRRRttt",
      "ttRRRRRRRRtt",
      "tRWWRRRRWWRt",
      "tRRRRRRRRRRt",
      "tRRRRRRRRRRt",
      "ttRRRRRRRRtt",
      "tttSSSSSSttt",
      "tttSoSSoSttt",
    ];
    const PIPE = [
      "oLLLGGGGGGDDDo",
      "oLLLGGGGGGDDDo",
      "toLLGGGGGGDDot",
      "toLLGGGGGGDDot",
      "toLLGGGGGGDDot",
      "toLLGGGGGGDDot",
      "toLLGGGGGGDDot",
      "toLLGGGGGGDDot",
      "toLLGGGGGGDDot",
      "toLLGGGGGGDDot",
      "toLLGGGGGGDDot",
      "toLLGGGGGGDDot",
    ];
    const PIPE_SHORT = PIPE.slice(0, 6);
    const BRICK = [
      "BBBBBBBsBBBBBBBs",
      "BBBBBBBsBBBBBBBs",
      "ssssssssssssssss",
      "BBBsBBBBBBBsBBBB",
      "BBBsBBBBBBBsBBBB",
      "ssssssssssssssss",
      "BBBBBBBsBBBBBBBs",
      "BBBBBBBsBBBBBBBs",
    ];
    const HILL = [
      "ttttttGGGGtttttt",
      "tttttGGGGGGttttt",
      "ttttGGGGgGGGtttt",
      "tttGGGGGGGGGtttt",
      "ttGGGGGGGGGGGGtt",
      "tGGGGgGGGGGgGGGt",
    ];
    const BUSH = [
      "ttttGGGttttttttttt",
      "tttGGGGGtttGGGtttt",
      "ttGGGGGGGtGGGGGttt",
      "tGGGGGGGGGGGGGGGtt",
      "GGGGGGGGGGGGGGGGGG",
    ];
    const PCLOUD = [
      "ttttWWWWWttttttttttt",
      "tttWWWWWWWttWWWWtttt",
      "ttWWWWWWWWtWWWWWWttt",
      "tWWWWWWWWWWWWWWWWttt",
      "WWWWWWWWWWWWWWWWWWtt",
    ];
    const mkDeco = (elm, map, px) => {
      if (!elm) return;
      map.forEach((row) => {
        const r = el("div", "drow");
        for (const ch of row) {
          const p = el("div", "dpx");
          p.style.width = p.style.height = px + "px";
          p.style.background = DECO_PAL[ch];
          r.appendChild(p);
        }
        elm.appendChild(r);
      });
    };
    mkDeco($("#pipe1"), PIPE, 4);  mkDeco($("#pipe2"), PIPE_SHORT, 4);
    mkDeco($("#brickL"), BRICK, 3); mkDeco($("#brickR"), BRICK, 3);
    mkDeco($("#hill1"), HILL, 6);
    mkDeco($("#bush1"), BUSH, 5);  mkDeco($("#bush2"), BUSH, 4);
    mkDeco($("#pc1"), PCLOUD, 5);  mkDeco($("#pc2"), PCLOUD, 4);  mkDeco($("#pc3"), PCLOUD, 3);
    const shroomEl = $("#shroom");
    mkDeco(shroomEl, SHROOM, 3);

    const SPEED = 130, GROUND = 28;
    const bubble = $("#marioBubble");
    let pipes = [], blocked = null;
    const qbs = [$("#qb1"), $("#qb2"), $("#qb3")].filter(Boolean);
    const coinNum = $("#coinNum");
    const brickL = $("#brickL"), brickR = $("#brickR");
    const QB_POS = [0.35, 0.55, 0.75];                        // 三块问号砖的屏宽比例
    let layoutW = -1;                                         // 上次布局时的场景宽度（夜间 display:none 时为 0）
    const layout = () => {
      const w = marioScene.clientWidth;
      layoutW = w;
      qbs.forEach((qb, i) => { qb.style.left = (w * QB_POS[i]) + "px"; });
      const blockX = w * QB_POS[1];
      if (brickL) brickL.style.left = (blockX - 50) + "px";   // 中间问号砖左右各贴一块悬浮砖
      if (brickR) brickR.style.left = (blockX + 46) + "px";
      pipes = [                                               // 水管位置（与 CSS 的 left% 对齐），宽 14px×4=56
        { x: w * 0.24, w: 56, cleared: false },
        { x: w * 0.72, w: 56, cleared: false },
      ];
      if (blocked) {                                          // 窗口尺寸变化：解除卡住状态重新判定
        blocked = null;
        mario.style.zIndex = "";
        if (bubble) bubble.classList.remove("show");
      }
    };
    layout();
    window.addEventListener("resize", layout);

    let x = -80, jumpT = -1, jumpDur = 0.62, jumpH = 84, coins = 0;
    let gait = 0, gaitT = 0, last = performance.now();
    let big = false, hitDone = false;                            // big: 吃到蘑菇变大；hitDone: 本次起跳是否已撞过砖
    const shroom = { active: false, phase: "up", x: 0, y: 0, t: 0 };
    const startJump = (dur, h) => { jumpT = 0; jumpDur = dur; jumpH = h; hitDone = false; };
    /* 场景在背景层（z-index 低于正文），直接绑 click 会被上层元素挡住。
       改为 document 级命中检测：按坐标判断点没点到他，视觉层级保持不变。 */
    const hitEl = (elm, cx, cy, pad) => {
      const r = elm.getBoundingClientRect();
      return cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad;
    };
    document.addEventListener("click", (e) => {
      if (!document.documentElement.classList.contains("day")) return;
      if (blocked && hitEl(mario, e.clientX, e.clientY, 80)) {     // 解救被水管挡住的马里奥
        blocked.cleared = true; blocked = null;
        mario.style.zIndex = "";                                   // 回到背景层
        if (bubble) bubble.classList.remove("show");
        startJump(0.85, 110);                                      // 感恩大跳，抛物线保证完全越过水管
      } else if (jumpT < 0 && !blocked && hitEl(mario, e.clientX, e.clientY, 8)) {
        startJump(0.5, 72);                                        // 平时点他：起跳撞砖
      }
    });
    let hoverRaf = 0;                                    // 悬停马里奥时显示手型（背景层 CSS cursor 不生效）
    document.addEventListener("mousemove", (e) => {
      if (hoverRaf) return;
      hoverRaf = requestAnimationFrame(() => {
        hoverRaf = 0;
        const day = document.documentElement.classList.contains("day");
        document.body.style.cursor = (day && hitEl(mario, e.clientX, e.clientY, blocked ? 80 : 0)) ? "pointer" : "";
      });
    });
    const spawnShroom = (bx) => {                        // 中间砖块撞出蘑菇：冒出→落地→右滑
      shroom.active = true; shroom.phase = "up"; shroom.t = 0;
      shroom.x = bx + 5; shroom.y = 136;
      if (shroomEl) shroomEl.classList.add("show");
    };
    (function step(now) {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      if (document.documentElement.classList.contains("day")) {
        if (marioScene.clientWidth !== layoutW) layout();       // 黑切白后场景从 display:none 恢复：按真实宽度重新布局
        if (blocked) {                                         // 被水管挡住：顶着原地踏步，浮到内容层之上求助
          gaitT += dt;
          if (gaitT > 0.18) { gaitT = 0; gait ^= 1; }
          show(gait ? fRunB : fRunA);
        } else {
          x += SPEED * dt;
          for (const p of pipes) {                             // 水管挡路：停下求助（临时提升层级，保证在面板前可见）
            if (!p.cleared && jumpT < 0 && x + 48 >= p.x) {
              x = p.x - 48; blocked = p;
              mario.style.zIndex = "60";
              if (bubble) {
                bubble.style.left = (x + 24) + "px";
                bubble.style.bottom = big ? "116px" : "";      // 变大后个子高，气泡往上抬
                bubble.classList.add("show");
              }
              break;
            }
          }
          if (jumpT >= 0) {
            jumpT += dt;
            const p = Math.min(1, jumpT / jumpDur);
            const mBottom = GROUND + Math.sin(p * Math.PI) * jumpH;
            mario.style.bottom = mBottom + "px";
            show(fJump);
            if (!hitDone && mBottom + 48 >= 118) {             // 头顶够到砖块高度：判定横向重叠
              for (let i = 0; i < qbs.length; i++) {
                const qb = qbs[i];
                if (qb.classList.contains("used")) continue;
                const bx = parseFloat(qb.style.left) || 0;
                if (x + 48 > bx && x < bx + 42) {
                  hitDone = true;
                  qb.classList.remove("bump"); void qb.offsetWidth; qb.classList.add("bump", "used");
                  if (i === 1) {                               // 中间的砖块：出蘑菇
                    spawnShroom(bx);
                  } else {                                     // 两侧的砖块：出金币
                    const bc = qb.querySelector(".bcoin");
                    if (bc) { bc.classList.remove("pop"); void bc.offsetWidth; bc.classList.add("pop"); }
                    if (coinNum) coinNum.textContent = String(++coins);
                  }
                  break;
                }
              }
            }
            if (p >= 1) { jumpT = -1; mario.style.bottom = GROUND + "px"; }
          } else {
            gaitT += dt;                                          // 跑步两帧切换
            if (gaitT > 0.15) { gaitT = 0; gait ^= 1; }
            show(gait ? fRunB : fRunA);
          }
          if (x > marioScene.clientWidth + 60) {                  // 跑出屏幕，循环重置（变大状态与金币数延续）
            x = -80; jumpT = -1;
            pipes.forEach((p) => { p.cleared = false; });
            qbs.forEach((qb) => {                                 // 问号砖刷新，下一轮可以再撞
              qb.classList.remove("used", "bump");
              const bc = qb.querySelector(".bcoin");
              if (bc) bc.classList.remove("pop");
            });
          }
        }
        if (shroom.active && shroomEl) {                        // 蘑菇移动与拾取
          shroom.t += dt;
          if (shroom.phase === "up") {                          // 从砖块顶部冒出来
            shroom.y = 136 + Math.min(1, shroom.t / 0.45) * 58;
            if (shroom.t >= 0.45) { shroom.phase = "down"; shroom.t = 0; }
          } else if (shroom.phase === "down") {                 // 落到地面
            shroom.y = 194 - Math.min(1, shroom.t / 0.5) * (194 - GROUND);
            if (shroom.t >= 0.5) { shroom.phase = "walk"; shroom.y = GROUND; }
          } else {
            shroom.x += 70 * dt;                                // 落地后向右滑行
          }
          shroomEl.style.left = shroom.x + "px";
          shroomEl.style.bottom = shroom.y + "px";
          const mBottom2 = parseFloat(mario.style.bottom) || GROUND;
          if (shroom.phase === "walk" && !big &&                // 马里奥碰到蘑菇：变大（跨循环保持）
              shroom.x < x + 48 && shroom.x + 36 > x && mBottom2 < GROUND + 40) {
            big = true;
            mario.style.scale = "1.45";
            shroom.active = false;
            shroomEl.classList.remove("show");
          }
          if (shroom.x > marioScene.clientWidth + 40) {         // 滑出屏幕：消失
            shroom.active = false;
            shroomEl.classList.remove("show");
          }
        }
        mario.style.left = x + "px";
      }
      requestAnimationFrame(step);
    })(last);
  }

  /* 主题切换：月亮/太阳本身就是开关，旁边挂呼吸提示（moonWrap 已在上方视差代码里声明） */
  const themeHint = $("#themeHint");
  if (moonWrap) {
    const syncHint = () => {
      const day = document.documentElement.classList.contains("day");
      if (themeHint) themeHint.textContent = day ? "☾" : "☀";   // 箭头指向月亮/太阳，图标示意切换目标
      moonWrap.setAttribute("aria-label", day ? "Switch to night theme" : "Switch to day theme");
    };
    syncHint();

    let wiping = false;
    const wipeTheme = () => {
      if (wiping) return;
      wiping = true;
      const toDay = !document.documentElement.classList.contains("day");
      const syncTheme = () => {
        const day = document.documentElement.classList.toggle("day");
        syncHint();
        syncTarot(day);
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        syncTheme();
        wiping = false;
        return;
      }

      try {
        if (window.runPixelTransition) {
          Promise.resolve(window.runPixelTransition(syncTheme)).finally(() => { wiping = false; });
        } else { syncTheme(); wiping = false; }
      } catch { wiping = false; }

    };
    moonWrap.addEventListener("click", wipeTheme);
    /* 月亮在背景层（z-index 低于正文），被正文透明区域盖住时点击/悬停无法直达。
       兜底：指针落在月亮包围盒内、且目标不是可交互元素时——
       点击视同点击月亮；悬停给 <html> 加 .moon-hot 显示手型光标（提示可以点）。 */
    const INTERACTIVE_SEL = "a, button, input, textarea, select, [role='button'], .pub-links, .badge, .chip, .kw";
    const inMoonRect = (e) => {
      const r = moonWrap.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    document.addEventListener("click", (e) => {
      if (e.target.closest(".moon-wrap")) return;          // 直接命中月亮时由上面的监听器处理
      if (e.target.closest(INTERACTIVE_SEL)) return;
      if (inMoonRect(e)) wipeTheme();
    });
    document.addEventListener("mousemove", (e) => {
      const hot = !e.target.closest(".moon-wrap") && !e.target.closest(INTERACTIVE_SEL) && inMoonRect(e);
      document.documentElement.classList.toggle("moon-hot", hot);
    });
    moonWrap.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wipeTheme(); }
    });
  }
})();
