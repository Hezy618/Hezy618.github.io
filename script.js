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

  const stats = [
    ["UNIV", SITE.university],
    ["SCHOOL", SITE.school],
    ["MAJOR", SITE.major],
    ["DEGREE", SITE.degree],
    ["LOC", SITE.location],
    ["MAIL", SITE.email && `<a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>`],
    ["MAIL·QQ", SITE.emailAlt && `<a href="mailto:${esc(SITE.emailAlt)}">${esc(SITE.emailAlt)}</a>`],
  ];
  const statList = $("#stat-list");
  stats.forEach(([k, v]) => {
    if (!v) return;
    statList.appendChild(el("li", null,
      `<span class="k">${k}</span> ${typeof v === "string" && v.startsWith("<") ? v : esc(v)}`));
  });

  /* 研究方向 chips */
  const chipRow = $("#chip-row");
  (SITE.research || []).forEach((r) => chipRow.appendChild(el("span", "chip", esc(r))));

  /* GitHub / Scholar 等外链：渲染进塔罗牌头像下方，点击不触发翻面 */
  const tarotLinks = $("#tarot-links");
  Object.entries(SITE.links || {}).forEach(([label, url]) => {
    const a = el("a", null, esc(label));
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
    if ((pub.keywords || []).length) {
      card.appendChild(el("p", "pub-keywords",
        pub.keywords.map((k) => `<span class="kw">${esc(k)}</span>`).join("")));
    }
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
      const a = el("a", null, `[${esc(label)}]`);
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      links.appendChild(a);
    });
    badges.appendChild(links);
    card.appendChild(badges);
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

  /* ==================== 星空 ==================== */
  const field = $("#starfield");
  const STAR_COUNT = Math.min(150, Math.floor(window.innerWidth / 9));
  for (let s = 0; s < STAR_COUNT; s++) {
    const star = el("div", "star" + (s % 11 === 0 ? " c" : s % 7 === 0 ? " y" : ""));
    const size = s % 6 === 0 ? 3 : 2;
    star.style.width = star.style.height = size + "px";
    star.style.left = Math.random() * 100 + "%";
    star.style.top = Math.random() * 100 + "%";
    star.style.setProperty("--d", (1.6 + Math.random() * 3.2).toFixed(2) + "s");
    star.style.animationDelay = (Math.random() * 4).toFixed(2) + "s";
    field.appendChild(star);
  }

  /* 流星：每 6~11 秒一颗 */
  (function spawnShooting() {
    const s = el("div", "shooting");
    s.style.top = (4 + Math.random() * 30) + "%";
    s.style.left = (30 + Math.random() * 65) + "%";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 1500);
    setTimeout(spawnShooting, 6000 + Math.random() * 5000);
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
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      moonWrap.style.transform = `translateY(${window.scrollY * 0.12}px)`;
      ticking = false;
    });
  });

  /* ==================== 像素猫 ==================== */
  /* 字符表: t=透明 o=描边 c=奶油色 p=粉 s=阴影 */
  const CAT_SLEEP = [
    "tttttttttttttttt",
    "ttootttoottttttt",
    "toccotoccotttttt",
    "toccccccccccottt",
    "toccooccoocccott",
    "toccccpccccccott",
    "toccccccccccccot",
    "tosccccccccccsot",
    "ttoooooooooooott",
  ];
  /* 惊醒帧：瞪圆眼 + 张嘴，打盹猫被点醒的瞬间用 */
  const CAT_STARTLE = [
    "tttttttttttttttt",
    "ttootttoottttttt",
    "toccotoccotttttt",
    "toccccccccccottt",
    "toccocccoccccott",
    "toccccpccccccott",
    "tocccooccccccott",
    "tosccccccccccsot",
    "ttoooooooooooott",
  ];
  const CAT_WALK_A = [
    "ootttttttttttttttt",
    "ocottttttttttttttt",
    "occotttttttottottt",
    "occottttttocccccot",
    "ttoccccccccccoccot",
    "toccccccccccccccot",
    "toccccccccccccccot",
    "tttocttttttttocttt",
    "tttocttttttttocttt",
  ];
  const CAT_WALK_B = [
    "tttttttttttttttttt",
    "ootttttttttttttttt",
    "ocottttttttottottt",
    "occottttttocccccot",
    "ttoccccccccccoccot",
    "toccccccccccccccot",
    "toccccccccccccccot",
    "ttttocttttttoctttt",
    "ttttocttttttoctttt",
  ];
  const CAT_SIT = [
    "ttoottttttootttt",
    "toccottttoccottt",
    "tocccccccccccott",
    "toccocccccoccott",
    "tocccccpcccccott",
    "tocccccccccccott",
    "tocccccccccccott",
    "toscccccccccsott",
    "ttoooooooooooott",
  ];
  const CAT_SIT_BLINK = CAT_SIT.map((r, i) => (i === 3 ? "tocccccccccccott" : r));

  /* 笑脸帧：眯眯眼（∩∩）+ 张嘴笑（含舌头），用于 About Me 互动猫 */
  const CAT_HAPPY = [
    "ttoottttttootttt",
    "toccottttoccottt",
    "toccocccccoccott",
    "tocococccococott",
    "tocccccpcccccott",
    "toccccooocccott",
    "toccccopocccott",
    "toscccccccccsott",
    "ttoooooooooooott",
  ];

  /* 打字猫：趴在笔记本电脑前（g=机身，粉色爱心贴纸），用于 EXPERIENCE 板块 */
  const CAT_TYPE = [
    "ttoottttttootttt",
    "toccottttoccottt",
    "tocccccccccccott",
    "toccocccccoccott",
    "tocccccpcccccott",
    "tocccccccccccott",
    "togggggggggggott",
    "togggggpgggggott",
    "ttoooooooooooott",
  ];
  const CAT_TYPE_BLINK = CAT_TYPE.map((r, i) => (i === 3 ? "tocccccccccccott" : r));

  function buildCat(box, rows, scale) {
    box.style.setProperty("--cs", scale + "px");
    rows.forEach((row) => {
      const r = el("div", "crow");
      for (const ch of row) r.appendChild(el("div", "cpx " + ch));
      box.appendChild(r);
    });
  }

  /* 打盹猫：趴在塔罗牌上沿 + 漂浮的 Zzz；点一下会惊醒，愣一会儿再继续睡 */
  const sleepBox = $("#catSleep");
  if (sleepBox) {
    const sSleep = el("div", "catframe");
    const sAwake = el("div", "catframe");
    buildCat(sSleep, CAT_SLEEP, 4);
    buildCat(sAwake, CAT_STARTLE, 4);
    sAwake.style.display = "none";
    sleepBox.append(sSleep, sAwake);

    const zzz = el("span", "zzz");
    for (let zi = 0; zi < 3; zi++) {
      const z = el("i", null, "z");
      z.style.animationDelay = (zi * 0.9) + "s";
      z.style.fontSize = (8 + zi * 3) + "px";
      zzz.appendChild(z);
    }
    sleepBox.appendChild(zzz);

    let dozeTimer = null;
    const startle = () => {
      sSleep.style.display = "none"; sAwake.style.display = "";
      zzz.style.display = "none";
      sleepBox.classList.remove("startled");
      void sleepBox.offsetWidth;          // 强制回流，让惊醒动画可以连续触发
      sleepBox.classList.add("startled");
      clearTimeout(dozeTimer);
      dozeTimer = setTimeout(() => {
        sSleep.style.display = ""; sAwake.style.display = "none";
        zzz.style.display = "";
        sleepBox.classList.remove("startled");
      }, 1500);
    };
    sleepBox.addEventListener("click", (e) => { e.stopPropagation(); startle(); });  // 不触发塔罗牌翻面
    sleepBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); startle(); }
    });
  }

  /* 巡逻猫：沿 PUBLICATIONS 上沿来回巡逻，到边自动转身；点一下会吓一跳、喵一声并加速逃窜 */
  const patrolBox = $("#catPatrol");
  const pubsPanel = $("#publications");
  if (patrolBox && pubsPanel) {
    const fA = el("div", "catframe");
    const fB = el("div", "catframe");
    buildCat(fA, CAT_WALK_A, 4);
    buildCat(fB, CAT_WALK_B, 4);
    fB.style.display = "none";
    patrolBox.append(fA, fB);

    setInterval(() => {           // 步态两帧切换（一显一隐）
      const aHidden = fA.style.display === "none";
      fA.style.display = aHidden ? "" : "none";
      fB.style.display = aHidden ? "none" : "";
    }, 220);

    const CAT_W = 18 * 4, EDGE = 28;
    let cx = 60, dir = 1, lastT = performance.now();
    let boostUntil = 0;
    let hopTimer = null;
    const meows = ["MEOW!", "MRRP!", "PURR~"];
    const meow = () => {
      boostUntil = performance.now() + 1500;
      [fA, fB].forEach((f) => {
        f.classList.remove("hop"); void f.offsetWidth; f.classList.add("hop");
      });
      const m = el("span", "meow", meows[Math.floor(Math.random() * meows.length)]);
      if (dir === -1) m.style.scale = "-1 1";   // 猫朝左时容器被镜像，气泡文字要翻回来
      m.addEventListener("animationend", () => m.remove());
      patrolBox.appendChild(m);
      // hop 动画只播一次；不及时摘掉的话，步态切帧会反复重启动画，猫就一直跳
      clearTimeout(hopTimer);
      hopTimer = setTimeout(() => [fA, fB].forEach((f) => f.classList.remove("hop")), 550);
    };
    patrolBox.addEventListener("click", meow);
    patrolBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); meow(); }
    });

    (function patrolStep(now) {
      const dt = Math.min(60, now - lastT);
      lastT = now;
      const max = pubsPanel.clientWidth - CAT_W - EDGE;
      cx += dir * dt * (now < boostUntil ? 0.18 : 0.05);   // 正常 ≈50px/s，受惊后 ≈180px/s
      if (cx >= max)  { cx = max;  dir = -1; }
      if (cx <= EDGE) { cx = EDGE; dir = 1; }
      patrolBox.style.left = cx + "px";
      patrolBox.style.transform = `scaleX(${dir})`;
      requestAnimationFrame(patrolStep);
    })(lastT);
  }

  /* 坐姿猫：蹲在 SIDE QUESTS 上沿，每隔几秒眨一次眼；点一下会开心翻滚并溅出金色火花 */
  const sitBox = $("#catSit");
  if (sitBox) {
    const sA = el("div", "catframe");
    const sB = el("div", "catframe");
    buildCat(sA, CAT_SIT, 4);
    buildCat(sB, CAT_SIT_BLINK, 4);
    sB.style.display = "none";
    sitBox.append(sA, sB);
    (function blink() {
      sA.style.display = "none"; sB.style.display = "";
      setTimeout(() => { sA.style.display = ""; sB.style.display = "none"; }, 180);
      setTimeout(blink, 2600 + Math.random() * 2600);
    })();

    const sparkle = () => {
      sitBox.classList.remove("spin");
      void sitBox.offsetWidth;          // 强制回流，让翻滚动画可以连续触发
      sitBox.classList.add("spin");
      for (let i = 0; i < 7; i++) {
        const sp = el("span", "spark", "✦");
        sp.style.left = (6 + Math.random() * 56) + "px";
        sp.style.animationDelay = (Math.random() * 0.2) + "s";
        sp.style.setProperty("--sx", (Math.random() * 72 - 36) + "px");
        sp.style.setProperty("--sy", (-14 - Math.random() * 34) + "px");
        sp.addEventListener("animationend", () => sp.remove());
        sitBox.appendChild(sp);
      }
    };
    sitBox.addEventListener("click", sparkle);
    sitBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sparkle(); }
    });
  }

  /* 打字猫：蹲在 EXPERIENCE 上沿敲笔记本，偶尔眨眼；点一下会疯狂打字并飘出代码符号 */
  const typeBox = $("#catType");
  if (typeBox) {
    const tA = el("div", "catframe");
    const tB = el("div", "catframe");
    buildCat(tA, CAT_TYPE, 4);
    buildCat(tB, CAT_TYPE_BLINK, 4);
    tB.style.display = "none";
    typeBox.append(tA, tB);
    (function blink() {
      tA.style.display = "none"; tB.style.display = "";
      setTimeout(() => { tA.style.display = ""; tB.style.display = "none"; }, 180);
      setTimeout(blink, 3000 + Math.random() * 3000);
    })();

    const glyphs = ["</>", "{ }", "01", "&&", "fn", ";"];
    let typeTimer = null;
    const type = () => {
      typeBox.classList.add("typing");
      clearTimeout(typeTimer);
      typeTimer = setTimeout(() => typeBox.classList.remove("typing"), 1200);
      for (let i = 0; i < 5; i++) {
        const c = el("span", "code", glyphs[Math.floor(Math.random() * glyphs.length)]);
        c.style.left = (4 + Math.random() * 52) + "px";
        c.style.animationDelay = (Math.random() * 0.4) + "s";
        c.style.setProperty("--cx", (Math.random() * 32 - 16) + "px");
        c.addEventListener("animationend", () => c.remove());
        typeBox.appendChild(c);
      }
    };
    typeBox.addEventListener("click", type);
    typeBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); type(); }
    });
  }

  /* About Me 互动猫：平时蹲坐，点击后笑一下并飘出小爱心 */
  const aboutBox = $("#catAbout");
  if (aboutBox) {
    const nA = el("div", "catframe");
    const nB = el("div", "catframe");
    buildCat(nA, CAT_SIT, 4);
    buildCat(nB, CAT_HAPPY, 4);
    nB.style.display = "none";
    aboutBox.append(nA, nB);

    let happyTimer = null;
    const boop = () => {
      nA.style.display = "none"; nB.style.display = "";
      clearTimeout(happyTimer);
      happyTimer = setTimeout(() => { nA.style.display = ""; nB.style.display = "none"; }, 1100);
      aboutBox.classList.remove("boop");
      void aboutBox.offsetWidth;          // 强制回流，让挤压动画可以连续触发
      aboutBox.classList.add("boop");
      for (let i = 0; i < 6; i++) {
        const h = el("span", "heart", "♥");
        h.style.left = (10 + Math.random() * 44) + "px";
        h.style.animationDelay = (Math.random() * 0.25) + "s";
        h.style.setProperty("--hx", (Math.random() * 36 - 18) + "px");
        h.addEventListener("animationend", () => h.remove());
        aboutBox.appendChild(h);
      }
    };
    aboutBox.addEventListener("click", boop);
    aboutBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); boop(); }
    });
  }

  /* ==================== 塔罗牌交互 ==================== */
  const scene = $("#tarotScene");
  const tilt = $("#tarotTilt");
  const card = $("#tarotCard");
  const glare = $("#tarotGlare");
  const MAX_TILT = 16;

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
  scene.addEventListener("click", () => card.classList.toggle("flipped"));

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
  const marioScene = $("#mario-scene"), mario = $("#mario"), qblock = $("#qblock"), coin = $("#coin");
  if (marioScene && mario && qblock && coin) {
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

    const SPEED = 130, JUMP_T = 0.62, JUMP_H = 84, GROUND = 28;
    let blockX = 0;
    const layout = () => {
      blockX = marioScene.clientWidth * 0.55;
      qblock.style.left = blockX + "px";
      coin.style.left = blockX + "px";
    };
    layout();
    window.addEventListener("resize", layout);

    let x = -80, jumpT = -1, jumpDur = JUMP_T, jumpH = JUMP_H, coinJump = false;
    let blockJumped = false, coinPopped = false, gait = 0, gaitT = 0, last = performance.now();
    const startJump = (dur, h, forCoin) => { jumpT = 0; jumpDur = dur; jumpH = h; coinJump = forCoin; };
    mario.addEventListener("click", () => {           // 点马里奥：原地小跳一下
      if (jumpT < 0) startJump(0.5, 60, false);
    });
    (function step(now) {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      if (document.documentElement.classList.contains("day")) {
        x += SPEED * dt;
        if (jumpT < 0 && !blockJumped && x + 48 >= blockX) {     // 到达砖块起跳（只触发一次）
          blockJumped = true;
          startJump(JUMP_T, JUMP_H, true);
        }
        if (jumpT >= 0) {
          jumpT += dt;
          const p = Math.min(1, jumpT / jumpDur);
          mario.style.bottom = (GROUND + Math.sin(p * Math.PI) * jumpH) + "px";
          show(fJump);
          if (coinJump && !coinPopped && p > 0.35) {              // 头顶到砖块：出金币
            coinPopped = true;
            qblock.classList.remove("bump"); void qblock.offsetWidth; qblock.classList.add("bump", "used");
            coin.classList.remove("pop"); void coin.offsetWidth; coin.classList.add("pop");
          }
          if (p >= 1) { jumpT = -1; mario.style.bottom = GROUND + "px"; }
        } else {
          gaitT += dt;                                            // 跑步两帧切换
          if (gaitT > 0.15) { gaitT = 0; gait ^= 1; }
          show(gait ? fRunB : fRunA);
        }
        if (x > marioScene.clientWidth + 60) {                    // 跑出屏幕，循环重置
          x = -80; jumpT = -1; blockJumped = false; coinPopped = false;
          qblock.classList.remove("used");
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
      if (themeHint) themeHint.textContent = day ? "☾ NIGHT" : "☀ DAY";
      moonWrap.setAttribute("aria-label", day ? "Switch to night theme" : "Switch to day theme");
    };
    syncHint();

    /* 过场动画：01 二进制列铺满全屏向上浮动、渐变隐去；配色跟随目标主题。
       逐行插值出真实文字色（不依赖 background-clip），列顶加亮白"头部"仿代码雨。
       换肤时机由所有列的 (delay, dur) 实时推算：取全屏被代码完全覆盖的时间窗口中点，
       保证页面在代码后面完成换装，动画与渲染无缝衔接。 */
    const WIPE_TO_DAY = ["#3f8ae0", "#6ba9e8", "#4da354", "#c9861a", "#1d7a99", "#8cc57e"];   // 去白天：蓝天/绿地/暖金
    const WIPE_TO_NIGHT = ["#e8c46a", "#8fd8e8", "#8b8db0", "#b48fe8", "#d98fb8", "#5a5ea0"]; // 回夜晚：金/青/紫深夜系
    const WIPE_FS = 15;                                  // 列宽 = 字号，列与列贴紧铺满
    const HEAD = 0.12;                                   // 列顶亮白头部占比
    const lerpHex = (a, b, t) => {
      const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
      const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
      return "#" + pa.map((v, k) => Math.round(v + (pb[k] - v) * t).toString(16).padStart(2, "0")).join("");
    };
    let wiping = false;
    const wipeTheme = () => {
      if (wiping) return;
      wiping = true;
      const toDay = !document.documentElement.classList.contains("day");
      const palette = toDay ? WIPE_TO_DAY : WIPE_TO_NIGHT;
      const w = el("div", "theme-wipe");
      const cols = Math.ceil(window.innerWidth / WIPE_FS);
      /* 列高 ≈ 1.55 屏高：列从 105vh 出发、平移总量 ≈ 2.91 屏高，
         列覆盖全屏 ⇔ 进度 p ∈ [0.361, 0.550]（推导：top=1.05-2.91p，需 top≤0 且 top≥-0.55） */
      const rows = Math.ceil(window.innerHeight * 1.5 / (WIPE_FS * 1.6)) + 2;
      const P_IN = 0.361, P_OUT = 0.550;
      let maxEnd = 0, coverLo = 0, coverHi = Infinity;
      for (let i = 0; i < cols; i++) {
        const c = el("div", "bcol");
        const dur = 2.6 + Math.random() * 0.4;          // 每列流速略有不同（方差小，保证全覆盖窗口存在）
        const delay = Math.random() * 0.25;             // 每列错峰出发
        const c1 = palette[Math.floor(Math.random() * palette.length)];
        let c2 = palette[Math.floor(Math.random() * palette.length)];
        if (c2 === c1) c2 = palette[(palette.indexOf(c1) + 1) % palette.length];
        for (let r = 0; r < rows; r++) {                // 逐行渐变：亮白头部 → c1 → c2
          const t = r / (rows - 1);
          const color = t < HEAD ? lerpHex("#ffffff", c1, t / HEAD)
                                 : lerpHex(c1, c2, (t - HEAD) / (1 - HEAD));
          const row = el("div", "brow", Math.random() < 0.5 ? "0" : "1");
          row.style.color = color;
          row.style.opacity = (0.75 + Math.random() * 0.25).toFixed(2);   // 轻微明度抖动
          c.appendChild(row);
        }
        c.style.left = (i * WIPE_FS) + "px";
        c.style.width = WIPE_FS + "px";
        c.style.setProperty("--wt", dur + "s");
        c.style.setProperty("--wd", delay + "s");
        maxEnd = Math.max(maxEnd, dur + delay);
        coverLo = Math.max(coverLo, delay + P_IN * dur);   // 所有列都进入"全覆盖"的最早时刻
        coverHi = Math.min(coverHi, delay + P_OUT * dur);  // 有列开始离开"全覆盖"的最早时刻
        w.appendChild(c);
      }
      document.body.appendChild(w);
      document.documentElement.classList.add("wiping");   // 换肤期间给界面元素挂颜色过渡，衔接更顺滑
      const flipAt = (coverLo < coverHi ? (coverLo + coverHi) / 2 : coverLo) * 1000;
      setTimeout(() => {                                // 全屏被代码完全覆盖的瞬间换肤
        const day = document.documentElement.classList.toggle("day");
        localStorage.setItem("theme", day ? "day" : "night");
        syncHint();
      }, flipAt);
      setTimeout(() => {
        w.remove();
        document.documentElement.classList.remove("wiping");
        wiping = false;
      }, maxEnd * 1000 + 100);
    };
    moonWrap.addEventListener("click", wipeTheme);
    moonWrap.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); wipeTheme(); }
    });
  }
})();
