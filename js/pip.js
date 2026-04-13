/* === PIP + Checkout === */
(function () {
  var CHECKOUT_TIME = window.HC_AB.checkoutTime;
  var CHECKOUT_URL = window._CK;

  var wrapper = document.getElementById('video-wrapper');
  var checkoutSection = document.getElementById('checkout-section');
  var checkoutIframe = document.getElementById('checkout-iframe');
  var pipClose = document.getElementById('pip-close');

  var pipActivated = false;
  var checkoutPreloaded = false;
  var pipClosed = false;

  function preloadCheckout() {
    if (checkoutPreloaded) return;
    checkoutPreloaded = true;
    checkoutIframe.src = CHECKOUT_URL;
  }

  function activatePiP() {
    if (pipActivated) return;
    pipActivated = true;
    preloadCheckout();
    wrapper.classList.add('pip-mode');
    setTimeout(function () {
      document.body.style.background = '#fff';
      checkoutSection.classList.add('visible');
    }, 400);
    if (window.HC_TRACKER) window.HC_TRACKER.track('checkout_view');
  }

  wrapper.addEventListener('click', function (e) {
    if (!pipActivated || pipClosed || !wrapper.classList.contains('pip-mode')) return;
    if (e.target === pipClose || pipClose.contains(e.target)) return;
    e.stopPropagation();
    if (window.HC_PLAYER) { if (window.HC_PLAYER.isPlaying()) window.HC_PLAYER.pause(); else window.HC_PLAYER.play(); }
  });

  pipClose.addEventListener('click', function (e) {
    e.stopPropagation(); e.preventDefault(); pipClosed = true;
    if (window.HC_PLAYER) window.HC_PLAYER.pause();
    wrapper.style.display = 'none';
  });
  pipClose.addEventListener('touchend', function (e) {
    e.stopPropagation(); e.preventDefault(); pipClosed = true;
    if (window.HC_PLAYER) window.HC_PLAYER.pause();
    wrapper.style.display = 'none';
  }, { passive: false });

  window.addEventListener('hc:timeupdate', function (e) {
    var t = e.detail.currentTime;
    if (t >= CHECKOUT_TIME - 15 && !checkoutPreloaded) preloadCheckout();
    if (t >= CHECKOUT_TIME && !pipActivated) activatePiP();
  });
})();
