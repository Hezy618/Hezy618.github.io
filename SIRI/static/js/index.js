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
});
