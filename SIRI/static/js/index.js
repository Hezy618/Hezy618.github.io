document.addEventListener('DOMContentLoaded', function () {
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

  // Initialize all divs with carousel class
  bulmaCarousel.attach('.carousel', options);

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
});
