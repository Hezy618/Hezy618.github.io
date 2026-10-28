document.addEventListener('DOMContentLoaded', function () {
  const citationCounter = document.getElementById('citation-counter');
  const citationCount = document.getElementById('citation-count');
  let citationLoading = false;
  let citationLastChecked = 0;
  async function refreshCitationCount() {
    if (!citationCounter || !citationCount || citationLoading) return;
    citationLoading = true;
    const controller = new AbortController();
    const timeout = setTimeout(function () { controller.abort(); }, 8000);
    try {
      const urls = [
        'https://raw.githubusercontent.com/Hezy618/Hezy618.github.io/main/SIRI/static/citations/siri-scholar.json',
        'static/citations/siri-scholar.json'
      ];
      let record;
      for (const url of urls) {
        try {
          const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
          if (!response.ok) throw new Error('Citation snapshot unavailable');
          record = await response.json();
          break;
        } catch (error) {
          if (controller.signal.aborted) throw error;
        }
      }
      const paperTitle = 'SIRI: Self-Internalizing Reinforcement Learning with Intrinsic Skills for LLM Agent Training';
      const citationUrl = new URL(record?.citation_url);
      if (record?.source !== 'Google Scholar' || record.title !== paperTitle
          || !Number.isInteger(record.count) || record.count < 0
          || citationUrl.hostname !== 'scholar.google.com'
          || !citationUrl.searchParams.has('cites')) {
        throw new Error('Citation record mismatch');
      }
      const count = record.count.toLocaleString('en-US');
      citationCount.textContent = count;
      citationCounter.href = citationUrl.href;
      citationCounter.setAttribute('aria-label', `${count} citations on Google Scholar; open citing papers`);
      citationCounter.title = `Google Scholar citations · last updated ${new Date(record.updated_at).toLocaleDateString()}`;
      citationCounter.removeAttribute('data-unavailable');
    } catch (error) {
      citationCount.textContent = '—';
      citationCounter.dataset.unavailable = 'true';
      citationCounter.setAttribute('aria-label', 'Google Scholar citation count is temporarily unavailable; open citing papers');
      citationCounter.title = 'Google Scholar citation count is temporarily unavailable';
    } finally {
      clearTimeout(timeout);
      citationLastChecked = Date.now();
      citationLoading = false;
    }
  }
  refreshCitationCount();
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && Date.now() - citationLastChecked > 15 * 60 * 1000) refreshCitationCount();
  });
  setInterval(function () { if (!document.hidden) refreshCitationCount(); }, 15 * 60 * 1000);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const doodles = document.querySelectorAll('.section-doodle');
  doodles.forEach(function (svg) {
    const reference = svg.querySelector('use');
    const symbol = reference && document.querySelector(reference.getAttribute('href'));
    if (!symbol) return;
    svg.setAttribute('viewBox', symbol.getAttribute('viewBox'));
    reference.remove();
    const guide = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    guide.classList.add('doodle-guide');
    [...symbol.children].forEach(function (source) { guide.appendChild(source.cloneNode(true)); });
    svg.appendChild(guide);
    [...symbol.children].forEach(function (source) {
      const stroke = source.cloneNode(true);
      stroke.classList.add('sketch-stroke');
      svg.appendChild(stroke);
      const length = Math.ceil(stroke.getTotalLength() + 2);
      stroke.style.setProperty('--stroke-length', `${length}px`);
    });
  });

  function finishDoodle(svg) {
    svg.querySelectorAll('.sketch-stroke').forEach(function (stroke) {
      stroke.getAnimations().forEach(function (animation) { animation.cancel(); });
      stroke.style.strokeDashoffset = '0px';
      stroke.style.opacity = '1';
    });
    svg.classList.add('is-complete');
  }
  function revealDoodle(svg) {
    if (svg.dataset.drawStarted) return;
    svg.dataset.drawStarted = 'true';
    const strokes = [...svg.querySelectorAll('.sketch-stroke')];
    if (reducedMotion.matches || !Element.prototype.animate) {
      finishDoodle(svg);
      return;
    }
    const animations = strokes.map(function (stroke, index) {
      const length = stroke.style.getPropertyValue('--stroke-length');
      const animation = stroke.animate([
        { strokeDashoffset: length, opacity: .18 },
        { strokeDashoffset: '0px', opacity: 1 }
      ], { duration: 620, delay: index * 150, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      return animation.finished.catch(function () {});
    });
    Promise.all(animations).then(function () { finishDoodle(svg); });
  }

  // Morph one continuous drawing: the roof opens while the facade folds into two walls.
  const building = document.querySelector('.doodle-building');
  const buildingPaths = building && Object.fromEntries(
    ['back', 'roof', 'left', 'right', 'windows', 'door'].map(function (name) {
      return [name, building.querySelector(`.building-${name}`)];
    })
  );
  const cycle = 6800;
  let buildingVisible = false;
  let buildingActive = false;
  let buildingElapsed = 0;
  let buildingStart = 0;
  let buildingFrame = 0;
  function point(start, end, t) {
    return start.map(function (value, index) { return +(value + (end[index] - value) * t).toFixed(2); }).join(' ');
  }
  function drawBuilding(t) {
    if (!buildingPaths) return;
    const a = point([9, 12], [8, 14], t);
    const b = point([26, 6], [17, 17], t);
    const c = point([26, 6], [30, 8], t);
    const d = point([9, 12], [21, 7], t);
    const bl = point([9, 35], [8, 33], t);
    const bm = point([26, 35], [17, 35], t);
    const bf = point([26, 35], [30, 33], t);
    buildingPaths.back.setAttribute('d', `M${point([26, 15], [30, 15], t)} L${point([34, 15], [35, 15], t)} L${point([34, 35], [35, 33], t)} L${point([26, 35], [30, 33], t)}Z`);
    buildingPaths.roof.setAttribute('d', `M${a} L${d} L${c} L${b}Z`);
    buildingPaths.left.setAttribute('d', `M${a} L${b} L${bm} L${bl}Z`);
    buildingPaths.right.setAttribute('d', `M${b} L${c} L${bf} L${bm}Z`);
    buildingPaths.windows.setAttribute('d', `M${point([15, 18], [22, 20], t)} L${point([20, 18], [27, 19], t)} M${point([15, 23], [22, 25], t)} L${point([20, 23], [27, 24], t)}`);
    buildingPaths.door.setAttribute('d', `M${point([15, 35], [23, 34], t)} L${point([15, 27], [23, 27], t)} L${point([20, 27], [27, 26], t)} L${point([20, 35], [27, 34], t)}`);
  }
  function ease(t) { return t * t * (3 - 2 * t); }
  function buildingTick(now) {
    const phase = ((now - buildingStart) % cycle) / cycle;
    let depth = 0;
    if (phase >= .15 && phase < .43) depth = ease((phase - .15) / .28);
    else if (phase >= .43 && phase < .72) depth = 1;
    else if (phase >= .72 && phase < .97) depth = 1 - ease((phase - .72) / .25);
    drawBuilding(depth);
    buildingFrame = requestAnimationFrame(buildingTick);
  }
  function setBuildingActive(active) {
    if (!building || active === buildingActive) return;
    buildingActive = active;
    if (active) {
      buildingStart = performance.now() - buildingElapsed;
      buildingFrame = requestAnimationFrame(buildingTick);
    } else {
      buildingElapsed = (performance.now() - buildingStart) % cycle;
      cancelAnimationFrame(buildingFrame);
    }
  }
  if (building) drawBuilding(reducedMotion.matches ? 1 : 0);
  if ('IntersectionObserver' in window) {
    const doodleObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.target === building) {
          buildingVisible = entry.isIntersecting;
          setBuildingActive(buildingVisible && !document.hidden && !reducedMotion.matches);
        } else if (entry.isIntersecting) {
          revealDoodle(entry.target);
          doodleObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '40px 0px' });
    doodles.forEach(function (svg) { doodleObserver.observe(svg); });
  } else {
    doodles.forEach(function (svg) { if (svg !== building) revealDoodle(svg); });
    buildingVisible = true;
    setBuildingActive(!reducedMotion.matches);
  }
  document.addEventListener('visibilitychange', function () {
    setBuildingActive(buildingVisible && !document.hidden && !reducedMotion.matches);
  });
  reducedMotion.addEventListener('change', function () {
    if (reducedMotion.matches) {
      setBuildingActive(false);
      drawBuilding(1);
      doodles.forEach(function (svg) { if (svg !== building) finishDoodle(svg); });
    } else {
      buildingElapsed = 0;
      drawBuilding(0);
      setBuildingActive(buildingVisible && !document.hidden);
    }
  });

  var options = {
    slidesToScroll: 1,
    slidesToShow: 1,
    loop: true,
    infinite: true,
    autoplay: true,
    autoplaySpeed: 5000,
    pauseOnHover: true,
    navigation: true,
    pagination: true
  };

  const bibtex = document.getElementById('bibtex-code');
  const copyStatus = document.getElementById('copy-status');
  const citationLabels = { bibtex: 'BibTeX', acl: 'ACL', informal: 'Informal', markdown: 'Markdown', mods: 'MODS XML', endnote: 'Endnote', bibkey: 'Bibkey' };
  let citationData;
  let statusTimer;
  let activeButton;
  function citationText(format) {
    if (format === 'bibtex') return Promise.resolve(bibtex.textContent.trim());
    if (!citationData) {
      citationData = fetch('static/citations/2026.emnlp-main.192.json')
        .then(function (response) {
          if (!response.ok) throw new Error('Citation formats unavailable');
          return response.json();
        })
        .catch(function (error) { citationData = null; throw error; });
    }
    return citationData.then(function (data) { return data[format]; });
  }
  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    const field = document.createElement('textarea');
    field.value = text;
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Copy unavailable');
  }
  function resetCopyState() {
    if (activeButton) activeButton.classList.remove('is-copied');
    activeButton = null;
    if (copyStatus) copyStatus.textContent = '';
  }
  document.querySelectorAll('[data-citation-format]').forEach(function (button) {
    button.addEventListener('click', async function () {
      const format = button.dataset.citationFormat;
      clearTimeout(statusTimer);
      resetCopyState();
      try {
        const value = await citationText(format);
        if (!value) throw new Error('Citation format missing');
        await copyText(value);
        button.classList.add('is-copied');
        activeButton = button;
        if (copyStatus) copyStatus.textContent = `${citationLabels[format]} copied`;
      } catch (error) {
        if (copyStatus) copyStatus.textContent = 'Copy failed. Please try again.';
      }
      statusTimer = setTimeout(resetCopyState, 2600);
    });
  });
  const downloads = {
    bibtex: ['2026.emnlp-main.192.bib', 'text/plain'],
    mods: ['2026.emnlp-main.192.xml', 'application/xml'],
    endnote: ['2026.emnlp-main.192.endf', 'text/plain']
  };
  document.querySelectorAll('[data-citation-download]').forEach(function (button) {
    button.addEventListener('click', async function () {
      const format = button.dataset.citationDownload;
      try {
        const value = await citationText(format);
        if (!value) throw new Error('Citation format missing');
        const blob = new Blob([value + '\n'], { type: downloads[format][1] + ';charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloads[format][0];
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      } catch (error) {
        if (copyStatus) copyStatus.textContent = 'Download failed. Please try again.';
      }
    });
  });

  if (typeof bulmaCarousel !== 'undefined') {
    bulmaCarousel.attach('.carousel', options);
  }
});
