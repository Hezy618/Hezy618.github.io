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

  const copyButton = document.getElementById('copy-bibtex');
  const bibtex = document.getElementById('bibtex-code');
  const copyStatus = document.getElementById('copy-status');
  let statusTimer;
  if (copyButton && bibtex && copyStatus) {
    copyButton.addEventListener('click', async function () {
      const text = bibtex.textContent.trim();
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const selection = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(bibtex);
          selection.removeAllRanges();
          selection.addRange(range);
          if (!document.execCommand('copy')) throw new Error('Copy unavailable');
          selection.removeAllRanges();
        }
        copyButton.querySelector('span').textContent = 'Copied!';
        copyStatus.textContent = 'BibTeX copied to clipboard.';
      } catch (error) {
        copyStatus.textContent = 'Copy failed. Please select the BibTeX text manually.';
      }
      clearTimeout(statusTimer);
      statusTimer = setTimeout(function () {
        copyButton.querySelector('span').textContent = 'Copy BibTeX';
        copyStatus.textContent = '';
      }, 2600);
    });
  }

  if (typeof bulmaCarousel !== 'undefined') {
    bulmaCarousel.attach('.carousel', options);
  }
});
