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

  /* 白天形态：About 猫戴墨镜；打字猫眯眼笑；巡逻猫吐舌头散热；坐姿猫躺平晒太阳 */
  const setCh = (row, idx, ch) => row.slice(0, idx) + ch + row.slice(idx + 1);
  const CAT_SIT_SHADES = CAT_SIT.map((r, i) => (i === 3 ? "toooooccoooooot" : r));
  const CAT_TYPE_DAY = CAT_TYPE.map((r, i) => (i === 2 ? CAT_HAPPY[2] : i === 3 ? CAT_HAPPY[3] : r));
  const CAT_TYPE_DAY_BLINK = CAT_TYPE_DAY.map((r, i) => (i === 3 ? "tocccccccccccott" : r));
  const CAT_WALK_A_DAY = CAT_WALK_A.map((r, i) => (i === 6 ? setCh(r, 15, "p") : r));
  const CAT_WALK_B_DAY = CAT_WALK_B.map((r, i) => (i === 6 ? setCh(r, 15, "p") : r));
  /* 仰面躺平晒太阳：四爪朝天 + 右侧脑袋（耳朵、眼睛、粉鼻头） */
  const CAT_LIE = [
    "tttttttttttttttt",
    "ttttoottootttttt",
    "ttttccttccttotot",
    "ttooooooooooooot",
    "toccccccccccccot",
    "tocccccccccococt",
    "toccccccccccpcot",
    "tosccccccccccsot",
    "ttoooooooooooott",
  ];

  /* 主题联动：猫的形态跟随昼夜切换（syncCats 在主题翻转时调用） */
  const catSyncs = [];
  let catsDay = document.documentElement.classList.contains("day");
  const syncCats = (day) => { catsDay = day; catSyncs.forEach((fn) => fn()); };

  function buildCat(box, rows, scale) {
    box.style.setProperty("--cs", scale + "px");
    rows.forEach((row) => {
      const r = el("div", "crow");
      for (const ch of row) r.appendChild(el("div", "cpx " + ch));
      box.appendChild(r);
    });
  }

  /* 打盹猫：黑夜趴在塔罗牌上睡觉（Zzz 漂浮），白天醒来蹲坐；点一下：夜里惊醒，白天冲你笑 */
  const sleepBox = $("#catSleep");
  if (sleepBox) {
    const sSleep = el("div", "catframe");
    const sAwake = el("div", "catframe");
    const sSit = el("div", "catframe");
    const sHappy = el("div", "catframe");
    buildCat(sSleep, CAT_SLEEP, 4);
    buildCat(sAwake, CAT_STARTLE, 4);
    buildCat(sSit, CAT_SIT, 4);
    buildCat(sHappy, CAT_HAPPY, 4);
    sleepBox.append(sSleep, sAwake, sSit, sHappy);
    const showOnly = (f) => [sSleep, sAwake, sSit, sHappy].forEach((x) => { x.style.display = x === f ? "" : "none"; });

    const zzz = el("span", "zzz");
    for (let zi = 0; zi < 3; zi++) {
      const z = el("i", null, "z");
      z.style.animationDelay = (zi * 0.9) + "s";
      z.style.fontSize = (8 + zi * 3) + "px";
      zzz.appendChild(z);
    }
    sleepBox.appendChild(zzz);

    const applySleep = () => {                        // 按主题切默认形态：夜睡 / 日醒
      showOnly(catsDay ? sSit : sSleep);
      zzz.style.display = catsDay ? "none" : "";
    };
    catSyncs.push(applySleep);

    let dozeTimer = null;
    const poke = () => {
      showOnly(catsDay ? sHappy : sAwake);            // 白天：笑一下；黑夜：惊醒
      if (!catsDay) zzz.style.display = "none";
      sleepBox.classList.remove("startled");
      void sleepBox.offsetWidth;          // 强制回流，让惊醒动画可以连续触发
      sleepBox.classList.add("startled");
      clearTimeout(dozeTimer);
      dozeTimer = setTimeout(() => {
        applySleep();
        sleepBox.classList.remove("startled");
      }, 1500);
    };
    sleepBox.addEventListener("click", (e) => { e.stopPropagation(); poke(); });  // 不触发塔罗牌翻面
    sleepBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); poke(); }
    });
    applySleep();
  }

  /* 巡逻猫：沿 PUBLICATIONS 上沿来回巡逻，到边自动转身；点一下会吓一跳、喵一声并加速逃窜 */
  const patrolBox = $("#catPatrol");
  const pubsPanel = $("#publications");
  if (patrolBox && pubsPanel) {
    const fA = el("div", "catframe");
    const fB = el("div", "catframe");
    const fDA = el("div", "catframe");
    const fDB = el("div", "catframe");
    buildCat(fA, CAT_WALK_A, 4);
    buildCat(fB, CAT_WALK_B, 4);
    buildCat(fDA, CAT_WALK_A_DAY, 4);
    buildCat(fDB, CAT_WALK_B_DAY, 4);
    patrolBox.append(fA, fB, fDA, fDB);
    const allPaws = [fA, fB, fDA, fDB];
    const gaitPair = () => (catsDay ? [fDA, fDB] : [fA, fB]);   // 白天巡逻吐舌头散热
    allPaws.forEach((f) => { f.style.display = "none"; });
    gaitPair()[0].style.display = "";
    catSyncs.push(() => {
      allPaws.forEach((f) => { f.style.display = "none"; });
      gaitPair()[0].style.display = "";
    });

    setInterval(() => {           // 步态两帧切换（一显一隐）
      const [a, b] = gaitPair();
      const aHidden = a.style.display === "none";
      allPaws.forEach((f) => { f.style.display = "none"; });
      (aHidden ? a : b).style.display = "";
    }, 220);

    const CAT_W = 18 * 4, EDGE = 28;
    let cx = 60, dir = 1, lastT = performance.now();
    let boostUntil = 0;
    let hopTimer = null;
    const meows = ["MEOW!", "MRRP!", "PURR~"];
    const meow = () => {
      boostUntil = performance.now() + 1500;
      allPaws.forEach((f) => {
        f.classList.remove("hop"); void f.offsetWidth; f.classList.add("hop");
      });
      const m = el("span", "meow", meows[Math.floor(Math.random() * meows.length)]);
      if (dir === -1) m.style.scale = "-1 1";   // 猫朝左时容器被镜像，气泡文字要翻回来
      m.addEventListener("animationend", () => m.remove());
      patrolBox.appendChild(m);
      // hop 动画只播一次；不及时摘掉的话，步态切帧会反复重启动画，猫就一直跳
      clearTimeout(hopTimer);
      hopTimer = setTimeout(() => allPaws.forEach((f) => f.classList.remove("hop")), 550);
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

  /* 坐姿猫：蹲在 SIDE QUESTS 上沿，每隔几秒眨一次眼；白天躺平晒太阳；点一下会开心翻滚并溅出金色火花 */
  const sitBox = $("#catSit");
  if (sitBox) {
    const sA = el("div", "catframe");
    const sB = el("div", "catframe");
    const sL = el("div", "catframe");
    buildCat(sA, CAT_SIT, 4);
    buildCat(sB, CAT_SIT_BLINK, 4);
    buildCat(sL, CAT_LIE, 4);
    sB.style.display = "none"; sL.style.display = "none";
    sitBox.append(sA, sB, sL);
    catSyncs.push(() => {          // 白天切到躺平晒太阳形态
      sB.style.display = "none";
      sA.style.display = catsDay ? "none" : "";
      sL.style.display = catsDay ? "" : "none";
    });
    (function blink() {
      if (!catsDay) {              // 只有蹲坐形态才眨眼
        sA.style.display = "none"; sB.style.display = "";
        setTimeout(() => { sB.style.display = "none"; if (!catsDay) sA.style.display = ""; }, 180);
      }
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

  /* 打字猫：蹲在 EXPERIENCE 上沿敲笔记本，偶尔眨眼；白天换成眯眼笑的表情；点一下会疯狂打字并飘出代码符号 */
  const typeBox = $("#catType");
  if (typeBox) {
    const tA = el("div", "catframe");
    const tB = el("div", "catframe");
    const tD = el("div", "catframe");
    const tDB = el("div", "catframe");
    buildCat(tA, CAT_TYPE, 4);
    buildCat(tB, CAT_TYPE_BLINK, 4);
    buildCat(tD, CAT_TYPE_DAY, 4);
    buildCat(tDB, CAT_TYPE_DAY_BLINK, 4);
    tB.style.display = "none"; tD.style.display = "none"; tDB.style.display = "none";
    typeBox.append(tA, tB, tD, tDB);
    const typeBase = () => (catsDay ? tD : tA);
    catSyncs.push(() => {
      [tA, tB, tD, tDB].forEach((f) => { f.style.display = "none"; });
      typeBase().style.display = "";
    });
    (function blink() {
      const b = catsDay ? tDB : tB;
      typeBase().style.display = "none"; b.style.display = "";
      setTimeout(() => { b.style.display = "none"; typeBase().style.display = ""; }, 180);
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

  /* About Me 互动猫：平时蹲坐（白天戴墨镜），点击后笑一下并飘出小爱心 */
  const aboutBox = $("#catAbout");
  if (aboutBox) {
    const nA = el("div", "catframe");
    const nB = el("div", "catframe");
    const nD = el("div", "catframe");
    buildCat(nA, CAT_SIT, 4);
    buildCat(nB, CAT_HAPPY, 4);
    buildCat(nD, CAT_SIT_SHADES, 4);
    nB.style.display = "none"; nD.style.display = "none";
    aboutBox.append(nA, nB, nD);
    const aboutBase = () => (catsDay ? nD : nA);
    catSyncs.push(() => {
      [nA, nB, nD].forEach((f) => { f.style.display = "none"; });
      aboutBase().style.display = "";
    });

    let happyTimer = null;
    const boop = () => {
      [nA, nB, nD].forEach((f) => { f.style.display = "none"; });
      nB.style.display = "";
      clearTimeout(happyTimer);
      happyTimer = setTimeout(() => { nB.style.display = "none"; aboutBase().style.display = ""; }, 1100);
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

  syncCats(catsDay);   // 页面加载时按当前主题初始化所有猫的形态（localStorage 恢复了白天时尤其重要）

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
    const layout = () => {
      const w = marioScene.clientWidth;
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
    const HEAD = 0.14;                                   // 列顶亮白头部占比
    const MID = 0.58;                                    // 三段渐变的中段分界（c1→c2→c3）
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
        const dur = 2.05 + Math.random() * 0.35;        // 每列流速略有不同（方差小，保证全覆盖窗口存在）
        const delay = Math.random() * 0.2;              // 每列错峰出发
        const c1 = palette[Math.floor(Math.random() * palette.length)];
        let c2 = palette[Math.floor(Math.random() * palette.length)];
        if (c2 === c1) c2 = palette[(palette.indexOf(c1) + 1) % palette.length];
        let c3 = palette[Math.floor(Math.random() * palette.length)];
        if (c3 === c2) c3 = palette[(palette.indexOf(c2) + 1) % palette.length];
        for (let r = 0; r < rows; r++) {                // 逐行三段渐变：亮白头部 → c1 → c2 → c3
          const t = r / (rows - 1);
          const color = t < HEAD ? lerpHex("#ffffff", c1, t / HEAD)
                       : t < MID  ? lerpHex(c1, c2, (t - HEAD) / (MID - HEAD))
                                  : lerpHex(c2, c3, (t - MID) / (1 - MID));
          const row = el("div", "brow", Math.random() < 0.5 ? "0" : "1");
          row.style.color = color;
          row.style.opacity = (0.4 + Math.random() * 0.35).toFixed(2);    // 轻微明度抖动，整体压柔不刺眼
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

      /* 幕布层：垫在代码雨下面、页面上面的目标主题底色。
         换肤前淡入到近不透明，把 class 切换的硬边完全藏住；代码雨散场前再缓缓淡出。 */
      const flipS = (coverLo < coverHi ? (coverLo + coverHi) / 2 : coverLo);
      const veil = el("div", "theme-veil");
      veil.style.background = toDay
        ? "linear-gradient(to bottom, #6ba9e8 0%, #a8d4f5 60%, #e4f3ff 100%)"
        : "linear-gradient(to bottom, #07070f 0%, #0d0e20 100%)";
      document.body.appendChild(veil);
      const totalS = maxEnd + 0.1;
      veil.animate(
        [
          { opacity: 0 },
          { opacity: .97, offset: Math.max(0.01, (flipS - 0.5) / totalS) },
          { opacity: .97, offset: Math.min(0.97, (flipS + 1.1) / totalS) },
          { opacity: 0 },
        ],
        { duration: totalS * 1000, easing: "ease-in-out", fill: "both" }
      );

      setTimeout(() => {                                // 全屏被代码+幕布完全覆盖的瞬间换肤
        const day = document.documentElement.classList.toggle("day");
        localStorage.setItem("theme", day ? "day" : "night");
        syncHint();
        syncCats(day);                                  // 猫的形态跟随昼夜切换
      }, flipS * 1000);
      setTimeout(() => {
        w.remove();
        veil.remove();
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
