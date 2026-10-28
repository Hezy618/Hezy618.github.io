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
      citationCounter.classList.add('has-count');
      citationCounter.href = citationUrl.href;
      citationCounter.setAttribute('aria-label', `${count} citations on Google Scholar; open citing papers`);
      citationCounter.title = `Google Scholar citations · last updated ${new Date(record.updated_at).toLocaleDateString()}`;
      citationCounter.removeAttribute('data-unavailable');
    } catch (error) {
      citationCount.textContent = '—';
      citationCounter.classList.remove('has-count');
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
  const numberPattern = /[-+]?(?:\d*\.\d+|\d+\.?\d*)/g;
  const morphStates = [];
  function prepareMorph(svg) {
    const reference = svg.querySelector('use');
    const symbol = reference && document.querySelector(reference.getAttribute('href'));
    if (symbol) {
      svg.classList.add(symbol.id);
      svg.setAttribute('viewBox', symbol.getAttribute('viewBox'));
      reference.remove();
      [...symbol.children].forEach(function (source) { svg.appendChild(source.cloneNode(true)); });
    }
    const parts = [...svg.querySelectorAll('[data-morph-from], [data-from-cx], [data-appear]')].map(function (element) {
      const from = element.dataset.morphFrom;
      const to = element.getAttribute('d');
      const fromNumbers = from && from.match(numberPattern)?.map(Number);
      const toNumbers = from && to.match(numberPattern)?.map(Number);
      if (from && fromNumbers.length !== toNumbers.length) {
        console.warn('Skipping incompatible doodle path', element);
        return null;
      }
      const pathParts = from && to.split(numberPattern);
      const circle = element.hasAttribute('data-from-cx') && ['cx', 'cy', 'r'].map(function (attr) {
        return [attr, Number(element.dataset[`from${attr[0].toUpperCase()}${attr.slice(1)}`]), Number(element.getAttribute(attr))];
      });
      return { element, fromNumbers, toNumbers, pathParts, circle,
        appear: element.dataset.appear === undefined ? null : Number(element.dataset.appear),
        start: Number(element.dataset.start || 0), end: Number(element.dataset.end || 1) };
    }).filter(Boolean);
    const state = { svg, parts, visible: false, active: false, elapsed: 0, start: 0,
      duration: svg.classList.contains('doodle-sprout') ? 7600 : 6400 };
    morphStates.push(state);
    drawMorph(state, reducedMotion.matches ? 1 : 0);
    return state;
  }
  function drawMorph(state, depth) {
    state.parts.forEach(function (part) {
      const t = ease(Math.max(0, Math.min(1, (depth - part.start) / (part.end - part.start))));
      if (part.fromNumbers) {
        const values = part.fromNumbers.map(function (value, i) { return +(value + (part.toNumbers[i] - value) * t).toFixed(2); });
        part.element.setAttribute('d', part.pathParts.map(function (text, i) { return text + (values[i] ?? ''); }).join(''));
      }
      if (part.circle) part.circle.forEach(function ([attr, from, to]) {
        part.element.setAttribute(attr, +(from + (to - from) * t).toFixed(2));
      });
      if (part.appear !== null) part.element.style.opacity = ease(Math.max(0, Math.min(1, (depth - part.appear) / (1 - part.appear))));
    });
  }
  function morphDepth(phase) {
    if (phase < .07) return 0;
    if (phase < .42) return ease((phase - .07) / .35);
    if (phase < .73) return 1;
    if (phase < .95) return 1 - ease((phase - .73) / .22);
    return 0;
  }
  let morphFrame = 0;
  function morphTick(now) {
    morphFrame = 0;
    morphStates.forEach(function (state) {
      if (!state.active) return;
      drawMorph(state, morphDepth(((now - state.start) % state.duration) / state.duration));
    });
    if (morphStates.some(function (state) { return state.active; })) morphFrame = requestAnimationFrame(morphTick);
  }
  function setMorphActive(state, active) {
    if (state.active === active) return;
    state.active = active;
    if (active) state.start = performance.now() - state.elapsed;
    else state.elapsed = (performance.now() - state.start) % state.duration;
    if (active && !morphFrame) morphFrame = requestAnimationFrame(morphTick);
    if (!active && morphFrame && !morphStates.some(function (item) { return item.active; })) {
      cancelAnimationFrame(morphFrame);
      morphFrame = 0;
    }
  }
  doodles.forEach(function (svg) { if (!svg.classList.contains('doodle-building')) prepareMorph(svg); });
  const citationSketch = document.querySelector('.citation-counter-sketch');
  if (citationSketch) prepareMorph(citationSketch);

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
        } else {
          const state = morphStates.find(function (item) { return item.svg === entry.target; });
          if (!state) return;
          state.visible = entry.isIntersecting;
          setMorphActive(state, state.visible && !document.hidden && !reducedMotion.matches);
        }
      });
    }, { rootMargin: '40px 0px' });
    if (building) doodleObserver.observe(building);
    morphStates.forEach(function (state) { doodleObserver.observe(state.svg); });
  } else {
    morphStates.forEach(function (state) { state.visible = true; setMorphActive(state, !reducedMotion.matches); });
    buildingVisible = true;
    setBuildingActive(!reducedMotion.matches);
  }
  document.addEventListener('visibilitychange', function () {
    setBuildingActive(buildingVisible && !document.hidden && !reducedMotion.matches);
    morphStates.forEach(function (state) { setMorphActive(state, state.visible && !document.hidden && !reducedMotion.matches); });
  });
  reducedMotion.addEventListener('change', function () {
    if (reducedMotion.matches) {
      setBuildingActive(false);
      drawBuilding(1);
      morphStates.forEach(function (state) { setMorphActive(state, false); drawMorph(state, 1); });
    } else {
      buildingElapsed = 0;
      drawBuilding(0);
      setBuildingActive(buildingVisible && !document.hidden);
      morphStates.forEach(function (state) {
        state.elapsed = 0;
        drawMorph(state, 0);
        setMorphActive(state, state.visible && !document.hidden);
      });
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
