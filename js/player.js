/* === PLAYER — <video> + HLS.js === */
(function () {
  var video = document.getElementById('video-element');
  var wrapper = document.getElementById('video-wrapper');
  var loading = document.getElementById('loading-screen');
  var tapLayer = document.getElementById('tap-layer');
  var startScreen = document.getElementById('start-screen');
  var startPlay = document.getElementById('start-play');
  var centerBtn = document.getElementById('center-btn');
  var cbPause = document.getElementById('cb-pause');
  var cbPlay = document.getElementById('cb-play');
  var controls = document.getElementById('player-controls');
  var progressBar = document.getElementById('progress-bar');
  var countdown = document.getElementById('countdown-display');
  var playPauseBtn = document.getElementById('play-pause-btn');
  var iconPlay = document.getElementById('icon-play');
  var iconPause = document.getElementById('icon-pause');
  var volumeSlider = document.getElementById('volume-slider');
  var volIcon = document.getElementById('volume-icon');
  var offerFlash = document.getElementById('offer-flash');

  // Dynamic times from A/B config
  var OFFER_TIME = window.HC_AB.offerTime;
  var CHECKOUT_TIME = window.HC_AB.checkoutTime;
  var CD_TOTAL = 150;
  var CD_NORMAL = 25;

  var playing = false;
  var activated = false;
  var muted = true;
  var ctrlTimer = null;
  var ctrlVisible = false;
  var offerDone = false;
  var checkoutPixelFired = false;
  var currentSpeed = 1;

  var HLS_URL = window.HC_AB.getHlsUrl(window.HC_AB.videoId);

  // === INIT ===
  function init() {
    if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      var hls = new Hls({ enableWorker: true });
      hls.loadSource(HLS_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, onReady);
      hls.on(Hls.Events.ERROR, function (ev, data) {
        if (data.fatal) video.src = HLS_URL.replace('playlist.m3u8', 'play_720p.mp4');
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HLS_URL;
      video.addEventListener('loadedmetadata', onReady, { once: true });
    }
  }

  function onReady() {
    hideLoading();
    // Play video fast (10x) muted in background for dopamine preview
    video.muted = true;
    video.playbackRate = 4;
    video.play().catch(function () {});
    // Hide tap layer while start screen is showing
    tapLayer.style.display = 'none';
    startScreen.classList.remove('hidden');
  }

  // === VIDEO EVENTS ===
  video.addEventListener('play', function () { playing = true; syncUI(); fire('hc:videoplay'); });
  video.addEventListener('pause', function () { playing = false; syncUI(); if (activated) savePos(); fire('hc:videopause', { currentTime: video.currentTime }); });
  video.addEventListener('timeupdate', function () {
    if (activated) { updateBar(); updateCD(); savePos(); checkOffer(); checkCheckoutPixel(); }
    fire('hc:timeupdate', { currentTime: video.currentTime, duration: video.duration });
  });
  video.addEventListener('ended', function () { playing = false; syncUI(); });

  // === META PIXEL: InitiateCheckout when PiP activates ===
  function checkCheckoutPixel() {
    if (!checkoutPixelFired && video.currentTime >= CHECKOUT_TIME) {
      checkoutPixelFired = true;
      if (typeof fbq === 'function') {
        fbq('track', 'InitiateCheckout', {
          content_name: window.HC_AB.videoName,
          content_category: window.HC_AB.variant,
        });
      }
    }
  }

  // === START PLAY ===
  function onStartPlay(e) {
    e.preventDefault(); e.stopPropagation();
    startScreen.classList.add('hidden');
    tapLayer.style.display = '';
    var saved = localStorage.getItem('hc_video_time');
    var reachedCheckout = localStorage.getItem('hc_reached_checkout');
    if (saved && parseFloat(saved) > 10) {
      showResume(parseFloat(saved), reachedCheckout === 'true');
    } else {
      startVideo(0);
    }
  }
  startPlay.addEventListener('click', onStartPlay);
  startPlay.addEventListener('touchend', onStartPlay, { passive: false });

  function startVideo(seekTo) {
    activated = true; muted = false;
    video.muted = false; video.volume = 1;
    video.playbackRate = 1; currentSpeed = 1;
    video.currentTime = seekTo;
    video.play();
    if (volumeSlider) volumeSlider.value = 100;
    updateVolIcon(100);
    tapLayer.addEventListener('click', onControlTap);
    tapLayer.addEventListener('touchend', onControlTap, { passive: false });
    fire('hc:user_activated');
  }

  // === CONTROLS ===
  function onControlTap(e) { e.preventDefault(); e.stopPropagation(); if (ctrlVisible) hideCtrl(); else showCtrl(); }
  function showCtrl() {
    ctrlVisible = true; controls.classList.add('show'); centerBtn.classList.add('show');
    clearTimeout(ctrlTimer); ctrlTimer = setTimeout(function () { if (playing) hideCtrl(); }, 4000);
  }
  function hideCtrl() { ctrlVisible = false; controls.classList.remove('show'); centerBtn.classList.remove('show'); }

  centerBtn.addEventListener('click', function (e) { e.stopPropagation(); togglePlay(); });
  centerBtn.addEventListener('touchend', function (e) { e.stopPropagation(); e.preventDefault(); togglePlay(); }, { passive: false });
  playPauseBtn.addEventListener('click', function (e) { e.stopPropagation(); togglePlay(); });
  function togglePlay() { if (playing) video.pause(); else video.play(); }

  function syncUI() {
    iconPlay.style.display = playing ? 'none' : '';
    iconPause.style.display = playing ? '' : 'none';
    cbPause.style.display = playing ? '' : 'none';
    cbPlay.style.display = playing ? 'none' : '';
    if (playing) { clearTimeout(ctrlTimer); ctrlTimer = setTimeout(hideCtrl, 2000); }
  }

  // === PROGRESS ===
  function updateBar() {
    if (!video.duration) return;
    progressBar.style.width = (Math.pow(video.currentTime / video.duration, 0.82) * 100) + '%';
  }

  // === COUNTDOWN ===
  function updateCD() {
    var t = video.currentTime;
    if (t < OFFER_TIME) {
      var fake = getCD1(t);
      countdown.textContent = fmtT(fake) + ' até a oferta';
      countdown.className = fake <= 20 ? 'urgent' : '';
    } else if (t < CHECKOUT_TIME) {
      var fake2 = Math.max(0, Math.round(60 * (1 - (t - OFFER_TIME) / (CHECKOUT_TIME - OFFER_TIME))));
      countdown.textContent = fmtT(fake2) + ' até o checkout';
      countdown.className = fake2 <= 15 ? 'urgent' : '';
    } else {
      countdown.textContent = 'Você chegou ao checkout';
      countdown.className = 'reached';
    }
    if (t >= OFFER_TIME) localStorage.setItem('hc_reached_offer', 'true');
    if (t >= CHECKOUT_TIME) localStorage.setItem('hc_reached_checkout', 'true');
  }
  function getCD1(t) {
    if (t >= OFFER_TIME) return 0;
    if (t <= CD_NORMAL) return CD_TOTAL - t;
    return Math.max(0, Math.round((CD_TOTAL - CD_NORMAL) * (1 - (t - CD_NORMAL) / (OFFER_TIME - CD_NORMAL))));
  }
  function fmtT(s) { var m = Math.floor(s / 60), sec = Math.floor(s % 60); return m + ':' + (sec < 10 ? '0' : '') + sec; }

  // === OFFER FLASH ===
  function checkOffer() {
    if (!offerDone && video.currentTime >= OFFER_TIME && video.currentTime < OFFER_TIME + 5) {
      offerDone = true; offerFlash.style.display = 'block';
      setTimeout(function () { offerFlash.style.display = 'none'; }, 4000);
    }
  }

  // === SPEED ===
  var speedBtns = document.querySelectorAll('.speed-option');
  for (var i = 0; i < speedBtns.length; i++) {
    speedBtns[i].addEventListener('click', function (e) {
      e.stopPropagation();
      currentSpeed = parseFloat(this.getAttribute('data-speed'));
      video.playbackRate = currentSpeed;
      for (var j = 0; j < speedBtns.length; j++) speedBtns[j].classList.toggle('active', parseFloat(speedBtns[j].getAttribute('data-speed')) === currentSpeed);
    });
  }

  // === VOLUME ===
  if (volumeSlider) {
    volumeSlider.addEventListener('input', function (e) {
      e.stopPropagation(); var v = parseInt(this.value);
      video.volume = v / 100; video.muted = v === 0; muted = v === 0; updateVolIcon(v);
    });
  }
  volIcon.addEventListener('click', function (e) {
    e.stopPropagation();
    if (muted) { video.muted = false; video.volume = 1; muted = false; if (volumeSlider) volumeSlider.value = 100; updateVolIcon(100); }
    else { video.muted = true; muted = true; updateVolIcon(0); }
  });
  function updateVolIcon(v) {
    if (v === 0 || muted) volIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z"/><line x1="18" y1="9" x2="24" y2="15" stroke="#fff" stroke-width="2"/><line x1="24" y1="9" x2="18" y2="15" stroke="#fff" stroke-width="2"/></svg>';
    else volIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
  }

  // === RESUME ===
  function showResume(t, reachedCheckout) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:70;gap:12px;padding:20px;';
    var label = t >= OFFER_TIME ? 'Você está na parte da oferta' : 'Você estava assistindo ' + getLabel(t);
    var btns = '<button id="rc" style="background:#e50914;color:#fff;border:none;padding:14px 40px;font-size:15px;font-weight:700;border-radius:6px;cursor:pointer">Continuar de onde parei</button>';
    btns += '<button id="rz" style="background:transparent;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.15);padding:10px 28px;font-size:13px;border-radius:6px;cursor:pointer">Assistir do zero</button>';
    if (reachedCheckout) btns += '<button id="rck" style="background:#22c55e;color:#fff;border:none;padding:10px 28px;font-size:13px;font-weight:700;border-radius:6px;cursor:pointer">Ir para o checkout</button>';
    ov.innerHTML = '<p style="color:rgba(255,255,255,.4);font-size:13px">' + fmtT(t) + '</p><p style="color:#fff;font-size:20px;font-weight:600;text-align:center;max-width:480px;line-height:1.4;margin-bottom:12px">' + label + '</p>' + btns;
    wrapper.appendChild(ov);

    document.getElementById('rc').onclick = function () { ov.remove(); startVideo(t); };
    document.getElementById('rz').onclick = function () {
      localStorage.removeItem('hc_video_time'); localStorage.removeItem('hc_reached_offer'); localStorage.removeItem('hc_reached_checkout');
      ov.remove(); startVideo(0);
    };
    if (reachedCheckout && document.getElementById('rck')) {
      document.getElementById('rck').onclick = function () {
        ov.remove();
        document.getElementById('checkout-section').classList.add('visible');
        document.getElementById('checkout-iframe').src = window._CK;
        wrapper.classList.add('pip-mode');
        // Fire pixel
        if (typeof fbq === 'function') fbq('track', 'InitiateCheckout', { content_name: window.HC_AB.videoName, content_category: window.HC_AB.variant });
      };
    }
  }

  var SECTIONS = [
    { from: 0, to: 90, label: 'a introdução' },
    { from: 90, to: 180, label: 'a parte que separa quem entende do resto' },
    { from: 180, to: 270, label: 'a explicação do por que nada funcionou' },
    { from: 270, to: OFFER_TIME, label: 'a revelação do formato' },
    { from: OFFER_TIME, to: CHECKOUT_TIME, label: 'a oferta do Hard Copy Pro' },
    { from: CHECKOUT_TIME, to: Infinity, label: 'a oferta do Hard Copy Pro' },
  ];
  function getLabel(s) { for (var i = 0; i < SECTIONS.length; i++) { if (s >= SECTIONS[i].from && s < SECTIONS[i].to) return SECTIONS[i].label; } return 'o vídeo'; }

  function savePos() { if (video.currentTime > 5) localStorage.setItem('hc_video_time', video.currentTime.toString()); }
  function hideLoading() { loading.classList.add('hidden'); setTimeout(function () { loading.style.display = 'none'; }, 300); }
  function fire(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); }

  wrapper.addEventListener('mousemove', function () { if (activated && playing) showCtrl(); });
  window.addEventListener('beforeunload', savePos);

  window.HC_PLAYER = {
    wrapper: wrapper, video: video,
    play: function () { video.play(); }, pause: function () { video.pause(); },
    getTime: function () { return video.currentTime; }, getDuration: function () { return video.duration; },
    isPlaying: function () { return playing; },
  };

  init();
  setTimeout(function () { if (loading.style.display !== 'none') { hideLoading(); startScreen.classList.remove('hidden'); } }, 10000);
})();
