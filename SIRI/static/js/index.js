document.addEventListener('DOMContentLoaded', function () {
  // Expand shared line art into real strokes so each mark can be drawn in sequence.
  const doodles = document.querySelectorAll('.section-doodle');
  doodles.forEach(function (svg) {
    const reference = svg.querySelector('use');
    const symbol = reference && document.querySelector(reference.getAttribute('href'));
    if (!symbol) return;
    svg.setAttribute('viewBox', symbol.getAttribute('viewBox'));
    reference.remove();
    const guide = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    guide.classList.add('doodle-guide');
    [...symbol.children].forEach(function (source, index) {
      if (!svg.classList.contains('doodle-building') || index < 3) {
        guide.appendChild(source.cloneNode(true));
      }
    });
    svg.appendChild(guide);
    [...symbol.children].forEach(function (source, index) {
      const stroke = source.cloneNode(true);
      stroke.classList.add('sketch-stroke');
      svg.appendChild(stroke);
      const length = Math.ceil(stroke.getTotalLength() + 2);
      stroke.style.setProperty('--stroke-length', length);
      const delay = svg.classList.contains('doodle-building')
        ? [0, 120, 260, 650, 1050][index]
        : index * 130;
      stroke.style.setProperty('--draw-delay', `${delay}ms`);
    });
  });
  if ('IntersectionObserver' in window) {
    const doodleObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-drawing', entry.isIntersecting);
      });
    }, { rootMargin: '40px 0px' });
    doodles.forEach(function (svg) { doodleObserver.observe(svg); });
  } else {
    doodles.forEach(function (svg) { svg.classList.add('is-drawing'); });
  }

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
