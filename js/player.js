/* ============================================
   PLAYER — Reescrito do zero. Simples. Sem bugs.

   Tap layer z-index 50 captura TUDO.
   Nenhum botão do Bunny aparece NUNCA.
   Mobile e desktop mesmo código.

   FLOW:
   1. Video autoplay muted via Bunny
   2. Tap anywhere → unmute + play (remove tap layer, Bunny plays with sound)
   3. Once playing: tap = toggle controls, center btn = play/pause
   4. Pause → instant red overlay with hook
   ============================================ */

(function () {
  // Elements
  var iframe = document.getElementById('bunny-iframe');
  var wrapper = document.getElementById('video-wrapper');
  var loading = document.getElementById('loading-screen');
  var tapLayer = document.getElementById('tap-layer');
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

  // Config
  var OFFER_TIME = 376;    // 6:16
  var CHECKOUT_TIME = 616;  // 10:16
  var CD_TOTAL = 150;       // 2:30 fake countdown
  var CD_NORMAL = 25;       // first 25s normal speed

  // State
  var player = null;
  var playing = false;
  var time = 0;
  var dur = 0;
  var activated = false;
  var muted = true;
  var ctrlTimer = null;
  var ctrlVisible = false;
  var offerDone = false;

  // === INIT ===
  function init() {
    var vid = window.HC_AB.getVideoId(window.HC_AB.variant);
    iframe.src = window.HC_AB.getEmbedUrl(vid);
    iframe.onload = function () {
      player = new playerjs.Player(iframe);
      player.on('ready', onReady);
      player.on('play', function () { playing = true; syncUI(); fire('hc:videoplay'); });
      player.on('pause', function () { playing = false; syncUI(); savePos(); fire('hc:videopause', { currentTime: time }); });
      player.on('timeupdate', function (d) {
        time = d.seconds || 0;
        dur = d.duration || dur;
        if (activated) { updateBar(); updateCD(); savePos(); checkOffer(); }
        fire('hc:timeupdate', { currentTime: time, duration: dur });
      });
      player.on('ended', function () { playing = false; syncUI(); });
    };
  }

  function onReady() {
    hideLoading();
    player.getDuration(function (d) { dur = d; });

    // Check returning user
    var saved = localStorage.getItem('hc_video_time');
    var reachedCheckout = localStorage.getItem('hc_reached_checkout');
    if (saved && parseFloat(saved) > 10) {
      showResume(parseFloat(saved), reachedCheckout === 'true');
    }
    // Video plays muted. User taps tap-layer to unmute.
  }

  // === TAP LAYER (first tap = unmute, then removed) ===
  function onFirstTap(e) {
    e.preventDefault();
    e.stopPropagation();
    if (activated) return;
    activated = true;
    muted = false;
    player.unmute();
    player.setVolume(100);
    if (volumeSlider) volumeSlider.value = 100;
    updateVolIcon(100);

    // Remove tap layer → exposes Bunny iframe for one click
    tapLayer.style.display = 'none';

    // Bunny will pause when unmuted. User sees Bunny play btn and clicks it.
    // Once Bunny fires 'play', we restore our controls layer.
    var restore = function () {
      // Put tap layer back as our control interceptor
      tapLayer.style.display = '';
      tapLayer.removeEventListener('click', onFirstTap);
      tapLayer.removeEventListener('touchend', onFirstTap);
      // Now tap layer = controls toggle
      tapLayer.addEventListener('click', onControlTap);
      tapLayer.addEventListener('touchend', onControlTap, { passive: false });
    };

    // Listen for play to restore
    var onPlay = function () {
      window.removeEventListener('hc:videoplay', onPlay);
      setTimeout(restore, 300);
    };
    window.addEventListener('hc:videoplay', onPlay);

    // Fallback: restore after 12s even if no play
    setTimeout(function () {
      if (tapLayer.style.display === 'none') restore();
    }, 12000);

    fire('hc:user_activated');
  }

  tapLayer.addEventListener('click', onFirstTap);
  tapLayer.addEventListener('touchend', onFirstTap, { passive: false });

  // === CONTROLS TOGGLE (after activation) ===
  function onControlTap(e) {
    e.preventDefault();
    e.stopPropagation();
    if (ctrlVisible) hideCtrl(); else showCtrl();
  }

  function showCtrl() {
    ctrlVisible = true;
    controls.classList.add('show');
    centerBtn.classList.add('show');
    clearTimeout(ctrlTimer);
    ctrlTimer = setTimeout(function () { if (playing) hideCtrl(); }, 4000);
  }

  function hideCtrl() {
    ctrlVisible = false;
    controls.classList.remove('show');
    centerBtn.classList.remove('show');
  }

  // === CENTER BUTTON ===
  centerBtn.addEventListener('click', function (e) { e.stopPropagation(); togglePlay(); });
  centerBtn.addEventListener('touchend', function (e) { e.stopPropagation(); e.preventDefault(); togglePlay(); }, { passive: false });

  // === BOTTOM PLAY/PAUSE ===
  playPauseBtn.addEventListener('click', function (e) { e.stopPropagation(); togglePlay(); });

  function togglePlay() {
    if (playing) player.pause(); else player.play();
  }

  // === SYNC UI ===
  function syncUI() {
    iconPlay.style.display = playing ? 'none' : '';
    iconPause.style.display = playing ? '' : 'none';
    cbPause.style.display = playing ? '' : 'none';
    cbPlay.style.display = playing ? 'none' : '';
    // Auto-hide controls when playing starts
    if (playing) {
      clearTimeout(ctrlTimer);
      ctrlTimer = setTimeout(function () { hideCtrl(); }, 2000);
    }
  }

  // === PROGRESS BAR ===
  function updateBar() {
    if (!dur) return;
    progressBar.style.width = (Math.pow(time / dur, 0.82) * 100) + '%';
  }

  // === COUNTDOWN ===
  function updateCD() {
    if (time < OFFER_TIME) {
      var fake = getCD1(time);
      countdown.textContent = fmtT(fake) + ' até a oferta';
      countdown.className = fake <= 20 ? 'urgent' : '';
    } else if (time < CHECKOUT_TIME) {
      var fake2 = Math.max(0, Math.round(60 * (1 - (time - OFFER_TIME) / (CHECKOUT_TIME - OFFER_TIME))));
      countdown.textContent = fmtT(fake2) + ' até o checkout';
      countdown.className = fake2 <= 15 ? 'urgent' : '';
    } else {
      countdown.textContent = 'Você chegou ao checkout';
      countdown.className = 'reached';
    }
    if (time >= OFFER_TIME) localStorage.setItem('hc_reached_offer', 'true');
    if (time >= CHECKOUT_TIME) localStorage.setItem('hc_reached_checkout', 'true');
  }

  function getCD1(t) {
    if (t >= OFFER_TIME) return 0;
    if (t <= CD_NORMAL) return CD_TOTAL - t;
    return Math.max(0, Math.round((CD_TOTAL - CD_NORMAL) * (1 - (t - CD_NORMAL) / (OFFER_TIME - CD_NORMAL))));
  }

  function fmtT(s) { var m = Math.floor(s / 60), sec = Math.floor(s % 60); return m + ':' + (sec < 10 ? '0' : '') + sec; }

  // === OFFER FLASH ===
  function checkOffer() {
    if (!offerDone && time >= OFFER_TIME && time < OFFER_TIME + 5) {
      offerDone = true;
      offerFlash.style.display = 'block';
      setTimeout(function () { offerFlash.style.display = 'none'; }, 4000);
    }
  }

  // === VOLUME ===
  if (volumeSlider) {
    volumeSlider.addEventListener('input', function (e) {
      e.stopPropagation();
      var v = parseInt(this.value);
      player.setVolume(v); muted = v === 0; updateVolIcon(v);
    });
  }
  volIcon.addEventListener('click', function (e) {
    e.stopPropagation();
    if (muted) { player.unmute(); player.setVolume(100); muted = false; if (volumeSlider) volumeSlider.value = 100; updateVolIcon(100); }
    else { player.mute(); muted = true; updateVolIcon(0); }
  });

  function updateVolIcon(v) {
    if (v === 0 || muted) volIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3z"/><line x1="18" y1="9" x2="24" y2="15" stroke="#fff" stroke-width="2"/><line x1="24" y1="9" x2="18" y2="15" stroke="#fff" stroke-width="2"/></svg>';
    else volIcon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
  }

  // === SPEED (for when Bunny Direct Play is enabled) ===
  var speedBtns = document.querySelectorAll('.speed-option');
  for (var i = 0; i < speedBtns.length; i++) {
    speedBtns[i].addEventListener('click', function (e) {
      e.stopPropagation();
      var spd = parseFloat(this.getAttribute('data-speed'));
      try { iframe.contentWindow.postMessage(JSON.stringify({ context: 'player.js', version: '4.0', method: 'playbackRate', value: spd }), '*'); } catch (err) {}
      for (var j = 0; j < speedBtns.length; j++) speedBtns[j].classList.toggle('active', parseFloat(speedBtns[j].getAttribute('data-speed')) === spd);
    });
  }

  // === RESUME ===
  function showResume(t, reachedCheckout) {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.92);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:70;gap:12px;padding:20px;';

    var label = t >= OFFER_TIME ? 'Você está na parte da oferta' : 'Você estava assistindo ' + getResumeLabel(t);
    var btns = '<button id="rc" style="background:#e50914;color:#fff;border:none;padding:14px 40px;font-size:15px;font-weight:700;border-radius:6px;cursor:pointer">Continuar de onde parei</button>';
    btns += '<button id="rz" style="background:transparent;color:rgba(255,255,255,.5);border:1px solid rgba(255,255,255,.15);padding:10px 28px;font-size:13px;border-radius:6px;cursor:pointer">Assistir do zero</button>';
    if (reachedCheckout) btns += '<button id="rck" style="background:#22c55e;color:#fff;border:none;padding:10px 28px;font-size:13px;font-weight:700;border-radius:6px;cursor:pointer">Ir para o checkout</button>';

    ov.innerHTML = '<p style="color:rgba(255,255,255,.4);font-size:13px">' + fmtT(t) + '</p><p style="color:#fff;font-size:20px;font-weight:600;text-align:center;max-width:480px;line-height:1.4;margin-bottom:12px">' + label + '</p>' + btns;
    wrapper.appendChild(ov);

    function go(seek) {
      ov.remove(); activated = true; muted = false;
      player.unmute(); player.setVolume(100);
      if (volumeSlider) volumeSlider.value = 100; updateVolIcon(100);
      player.setCurrentTime(seek);
      // Remove first-tap handler, add control handler
      tapLayer.style.display = 'none';
      tapLayer.removeEventListener('click', onFirstTap);
      tapLayer.removeEventListener('touchend', onFirstTap);
      var restoreDone = false;
      var doRestore = function () {
        if (restoreDone) return; restoreDone = true;
        tapLayer.style.display = '';
        tapLayer.addEventListener('click', onControlTap);
        tapLayer.addEventListener('touchend', onControlTap, { passive: false });
      };
      window.addEventListener('hc:videoplay', function h() { window.removeEventListener('hc:videoplay', h); setTimeout(doRestore, 300); });
      setTimeout(doRestore, 12000);
      fire('hc:user_activated');
    }

    document.getElementById('rc').onclick = function () { go(t); };
    document.getElementById('rz').onclick = function () {
      localStorage.removeItem('hc_video_time'); localStorage.removeItem('hc_reached_offer'); localStorage.removeItem('hc_reached_checkout');
      go(0);
    };
    if (reachedCheckout && document.getElementById('rck')) {
      document.getElementById('rck').onclick = function () {
        ov.remove();
        document.getElementById('checkout-section').classList.add('visible');
        document.getElementById('checkout-iframe').src = 'https://checkout.ticto.app/O6C3AE389';
        wrapper.classList.add('pip-mode');
      };
    }
  }

  var RESUME_SECTIONS = [
    { from: 0, to: 90, label: 'a introdução' },
    { from: 90, to: 180, label: 'a parte que separa quem entende do resto' },
    { from: 180, to: 270, label: 'a explicação do por que nada funcionou' },
    { from: 270, to: 376, label: 'a revelação do formato' },
    { from: 376, to: 616, label: 'a oferta do Hard Copy Pro' },
    { from: 616, to: Infinity, label: 'a oferta do Hard Copy Pro' },
  ];
  function getResumeLabel(s) {
    for (var i = 0; i < RESUME_SECTIONS.length; i++) { if (s >= RESUME_SECTIONS[i].from && s < RESUME_SECTIONS[i].to) return RESUME_SECTIONS[i].label; }
    return 'o vídeo';
  }

  // === SAVE ===
  function savePos() { if (time > 5) localStorage.setItem('hc_video_time', time.toString()); }

  // === HELPERS ===
  function hideLoading() { loading.classList.add('hidden'); setTimeout(function () { loading.style.display = 'none'; }, 300); }
  function fire(name, detail) { window.dispatchEvent(new CustomEvent(name, { detail: detail || {} })); }

  // === HOVER (desktop) ===
  wrapper.addEventListener('mousemove', function () { if (activated && playing) showCtrl(); });

  // === SAVE ON LEAVE ===
  window.addEventListener('beforeunload', savePos);

  // === API ===
  window.HC_PLAYER = {
    wrapper: wrapper, play: function () { player.play(); }, pause: function () { player.pause(); },
    getTime: function () { return time; }, getDuration: function () { return dur; }, isPlaying: function () { return playing; },
  };

  // === GO ===
  init();
  setTimeout(function () { if (loading.style.display !== 'none') hideLoading(); }, 8000);
})();
