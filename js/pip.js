/* ============================================
   PIP — Picture-in-Picture + Checkout
   - Activates at 10:22 (622 seconds)
   - Mini player: click to play/pause
   - X button: closes mini player (only checkout remains)
   - On return visit: resume works normally with offer state
   ============================================ */

(function () {
  var CHECKOUT_TIME = 616; // 10:16
  var CHECKOUT_URL = 'https://checkout.ticto.app/O6C3AE389';

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

    // Minimize video
    wrapper.classList.add('pip-mode');

    // Show checkout
    setTimeout(function () {
      document.body.style.background = '#fff';
      checkoutSection.classList.add('visible');
    }, 400);

    // Track
    if (window.HC_TRACKER) window.HC_TRACKER.track('checkout_view');
  }

  // ---- CLICK ON PIP = play/pause ----
  wrapper.addEventListener('click', function (e) {
    if (!pipActivated || pipClosed) return;
    if (!wrapper.classList.contains('pip-mode')) return;

    // Don't interfere with pip-close button
    if (e.target === pipClose || pipClose.contains(e.target)) return;

    e.stopPropagation();
    if (window.HC_PLAYER) {
      if (window.HC_PLAYER.isPlaying()) {
        window.HC_PLAYER.pause();
      } else {
        window.HC_PLAYER.play();
      }
    }
  });

  // ---- X BUTTON = close mini player, keep only checkout ----
  pipClose.addEventListener('click', function (e) {
    e.stopPropagation();
    e.preventDefault();
    pipClosed = true;

    // Pause video
    if (window.HC_PLAYER) window.HC_PLAYER.pause();

    // Hide the mini player entirely
    wrapper.style.display = 'none';
  });

  // Mobile touch
  pipClose.addEventListener('touchend', function (e) {
    e.stopPropagation();
    e.preventDefault();
    pipClosed = true;
    if (window.HC_PLAYER) window.HC_PLAYER.pause();
    wrapper.style.display = 'none';
  }, { passive: false });

  // ---- LISTEN FOR TIME UPDATE ----
  window.addEventListener('hc:timeupdate', function (e) {
    var t = e.detail.currentTime;

    // Preload checkout 15s before
    if (t >= CHECKOUT_TIME - 15 && !checkoutPreloaded) preloadCheckout();

    // Activate PiP at checkout time
    if (t >= CHECKOUT_TIME && !pipActivated) activatePiP();
  });
})();
