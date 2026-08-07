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

  const linkRow = $("#link-row");
  Object.entries(SITE.links || {}).forEach(([label, url]) => {
    const a = el("a", null, esc(label));
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    linkRow.appendChild(a);
  });

  /* 塔罗牌文案 */
  if (SITE.tarot) {
    $("#tarot-numeral").textContent = SITE.tarot.numeral || "";
    $("#tarot-caption").textContent = SITE.tarot.title || "";
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
  /* 16 列圆形：t=透明 h=高光 m=月光 k=过渡 s=暗部 d=深影 c=陨石坑底 r=坑沿高光
   * 光源在左上：整体沿对角线由亮到暗，陨石坑受光侧坑沿提亮 */
  const MOON = [
    "ttttttthhttttttt",
    "tttthhhhmmmmtttt",
    "ttthhhhmmmmmkttt",
    "tthhrrmmmmrrkktt",
    "thhrccmmmrcckkkt",
    "thhrccmmmrcckkst",
    "thhrccmmkkkkksst",
    "hhmmmmmkkkkkssss",
    "hmmmmmkkkkkssssd",
    "tmmmmrrrkksrssdt",
    "tmmmkrccksrcsddt",
    "tmmrkrccssssdddt",
    "ttrckkkssssdddtt",
    "tttkkkssssdddttt",
    "ttttkssssdddtttt",
    "tttttttsdttttttt",
  ];
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
    "toccocccoccccott",
    "toccccpccccccott",
    "toccccccccccccot",
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

  function buildCat(box, rows, scale) {
    box.style.setProperty("--cs", scale + "px");
    rows.forEach((row) => {
      const r = el("div", "crow");
      for (const ch of row) r.appendChild(el("div", "cpx " + ch));
      box.appendChild(r);
    });
  }

  /* 打盹猫：趴在塔罗牌上沿 + 漂浮的 Zzz */
  const sleepBox = $("#catSleep");
  if (sleepBox) {
    buildCat(sleepBox, CAT_SLEEP, 4);
    const zzz = el("span", "zzz");
    for (let zi = 0; zi < 3; zi++) {
      const z = el("i", null, "z");
      z.style.animationDelay = (zi * 0.9) + "s";
      z.style.fontSize = (8 + zi * 3) + "px";
      zzz.appendChild(z);
    }
    sleepBox.appendChild(zzz);
  }

  /* 巡逻猫：沿 PUBLICATIONS 上沿来回巡逻，到边自动转身 */
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
    (function patrolStep(now) {
      const dt = Math.min(60, now - lastT);
      lastT = now;
      const max = pubsPanel.clientWidth - CAT_W - EDGE;
      cx += dir * dt * 0.05;      // ≈50px/s
      if (cx >= max)  { cx = max;  dir = -1; }
      if (cx <= EDGE) { cx = EDGE; dir = 1; }
      patrolBox.style.left = cx + "px";
      patrolBox.style.transform = `scaleX(${dir})`;
      requestAnimationFrame(patrolStep);
    })(lastT);
  }

  /* 坐姿猫：蹲在 SIDE QUESTS 上沿，每隔几秒眨一次眼 */
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
})();
