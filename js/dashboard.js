/* === DASHBOARD — Hard Copy SSL === */
(function () {
  var PASS = 'HDCPY102030';
  var db = null;
  var retentionChart = null, chartA = null, chartB = null;
  var chartReady = false;
  var currentRange = '30d';

  // ==== LOGIN (persists in session) ====
  if (sessionStorage.getItem('hc_dash_auth') === 'true') {
    showDashboard();
  } else {
    document.getElementById('login-btn').onclick = tryLogin;
    document.getElementById('password-input').onkeydown = function (e) { if (e.key === 'Enter') tryLogin(); };
  }

  function tryLogin() {
    if (document.getElementById('password-input').value.trim() === PASS) {
      sessionStorage.setItem('hc_dash_auth', 'true');
      showDashboard();
    } else {
      var err = document.getElementById('login-error');
      err.style.display = 'block'; err.textContent = 'Senha incorreta';
    }
  }

  function showDashboard() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('dashboard-content').style.display = 'block';
    waitForFirebase();
  }

  // ==== WAIT FOR FIREBASE ====
  function waitForFirebase() {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      db = firebase.firestore();
      setupDateButtons();
      document.getElementById('refresh-btn').onclick = function () {
        this.textContent = 'Carregando...';
        var btn = this;
        loadMetrics().finally(function () { btn.textContent = 'Atualizar'; });
      };
      loadChartJs(function () { chartReady = true; initCharts(); loadMetrics(); });
      setInterval(loadMetrics, 30000);
    } else {
      setTimeout(waitForFirebase, 500);
    }
  }

  // ==== DATE BUTTONS ====
  function setupDateButtons() {
    var btns = document.querySelectorAll('.date-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].onclick = (function (btn) {
        return function () {
          for (var j = 0; j < btns.length; j++) btns[j].classList.remove('active');
          btn.classList.add('active');
          currentRange = btn.getAttribute('data-range');
          loadMetrics();
        };
      })(btns[i]);
    }
  }

  function getFromDate() {
    var now = new Date();
    if (currentRange === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    if (currentRange === '7d') return new Date(now.getTime() - 7 * 86400000).toISOString();
    if (currentRange === '30d') return new Date(now.getTime() - 30 * 86400000).toISOString();
    return null;
  }

  // ==== LOAD METRICS ====
  function loadMetrics() {
    if (!db) return Promise.resolve();
    return db.collection('events').limit(5000).get().then(function (snap) {
      var all = [];
      snap.forEach(function (d) { all.push(d.data()); });

      // Filter by date
      var from = getFromDate();
      var events = from ? all.filter(function (e) { return e.timestamp && e.timestamp >= from; }) : all;

      var mA = compute(events, 'A');
      var mB = compute(events, 'B');
      renderTable(mA, mB);
      renderCards('a', mA);
      renderCards('b', mB);
      if (chartReady) renderCharts(mA, mB);
      renderInsight(mA, mB);
    }).catch(function (err) {
      console.error('[Dash]', err.message);
    });
  }

  // ==== COMPUTE ====
  function compute(allEvents, variant) {
    var ev = allEvents.filter(function (e) { return e.variant === variant; });
    var visitors = unique(ev, 'visitorId');
    var views = count(ev, 'page_view');
    var playEv = ev.filter(function (e) { return e.event === 'video_play'; });
    var plays = playEv.length;
    var uPlays = unique(playEv, 'visitorId');
    var playRate = visitors > 0 ? (uPlays / visitors * 100) : 0;
    var ckEv = ev.filter(function (e) { return e.event === 'checkout_view'; });
    var ckVisitors = unique(ckEv, 'visitorId');
    var retPitch = uPlays > 0 ? (ckVisitors / uPlays * 100) : 0;
    var pauseEv = ev.filter(function (e) { return e.event === 'video_pause'; });
    var engaged = unique(pauseEv, 'visitorId');
    var engagement = visitors > 0 ? (engaged / visitors * 100) : 0;
    var btnClicks = count(ev, 'checkout_click') + count(ev, 'saiba_mais_click');
    var conversions = count(ev, 'purchase');
    var convRate = uPlays > 0 ? (conversions / uPlays * 100) : 0;
    var revenue = conversions * 286;
    var curve = buildCurve(ev, uPlays);

    return {
      views: views, uniqueViews: visitors, plays: plays, uniquePlays: uPlays,
      playRate: playRate, retentionPitch: retPitch, audiencePitch: ckVisitors,
      engagement: engagement, btnClicks: btnClicks, conversions: conversions,
      convRate: convRate, revenue: revenue, curve: curve
    };
  }

  function count(ev, name) { return ev.filter(function (e) { return e.event === name; }).length; }
  function unique(ev, field) { var s = {}; ev.forEach(function (e) { if (e[field]) s[e[field]] = 1; }); return Object.keys(s).length; }

  function buildCurve(ev, totalPlays) {
    if (totalPlays === 0) return { labels: [], data: [] };
    var maxTime = {};
    ev.forEach(function (e) {
      if (e.event === 'video_progress' || e.event === 'video_pause' || e.event === 'checkout_view') {
        var t = e.videoTime || 0;
        if (e.event === 'checkout_view') t = Math.max(t, 600);
        if (!maxTime[e.visitorId] || t > maxTime[e.visitorId]) maxTime[e.visitorId] = t;
      }
    });
    var total = Object.keys(maxTime).length || 1;
    var labels = [], data = [];
    for (var s = 0; s <= 840; s += 30) {
      labels.push(pad(Math.floor(s / 60)) + ':' + pad(s % 60));
      var n = 0;
      for (var k in maxTime) { if (maxTime[k] >= s) n++; }
      data.push(Math.round(n / total * 10000) / 100);
    }
    return { labels: labels, data: data };
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  // ==== RENDER TABLE ====
  function renderTable(a, b) {
    var tot = a.views + b.views;
    set('ab-traffic-a', tot > 0 ? (a.views / tot * 100).toFixed(1) + '%' : '50%');
    set('ab-traffic-b', tot > 0 ? (b.views / tot * 100).toFixed(1) + '%' : '50%');
    set('ab-views-a', a.views); set('ab-views-b', b.views);
    set('ab-unique-a', a.uniqueViews); set('ab-unique-b', b.uniqueViews);
    set('ab-plays-a', a.plays); set('ab-plays-b', b.plays);
    set('ab-unique-plays-a', a.uniquePlays); set('ab-unique-plays-b', b.uniquePlays);
    setW('ab-playrate-a', a.playRate.toFixed(1) + '%', 'ab-playrate-b', b.playRate.toFixed(1) + '%', a.playRate, b.playRate);
    setW('ab-retention-pitch-a', a.retentionPitch.toFixed(1) + '%', 'ab-retention-pitch-b', b.retentionPitch.toFixed(1) + '%', a.retentionPitch, b.retentionPitch);
  }

  // ==== RENDER CARDS ====
  function renderCards(prefix, m) {
    var p = 'v' + prefix + '-';
    set(p + 'views', m.views); set(p + 'unique-views', m.uniqueViews);
    set(p + 'plays', m.plays); set(p + 'unique-plays', m.uniquePlays);
    set(p + 'playrate', m.playRate.toFixed(1) + '%');
    set(p + 'retention-pitch', m.retentionPitch.toFixed(1) + '%');
    set(p + 'audience-pitch', m.audiencePitch);
    set(p + 'engagement', m.engagement.toFixed(1) + '%');
    set(p + 'btn-clicks', m.btnClicks);
    set(p + 'conversions', m.conversions);
    set(p + 'conv-rate', m.convRate.toFixed(1) + '%');
    set(p + 'revenue', 'R$ ' + m.revenue.toFixed(2));
  }

  // ==== CHARTS ====
  function loadChartJs(cb) {
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    s.onload = cb; document.head.appendChild(s);
  }

  function makeChart(id, color, bgColor) {
    return new Chart(document.getElementById(id).getContext('2d'), {
      type: 'line', data: { labels: [], datasets: [{ label: 'Retenção', data: [], borderColor: color, backgroundColor: bgColor, fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#555', callback: function (v) { return v + '%'; } }, grid: { color: 'rgba(255,255,255,.05)' } }, x: { ticks: { color: '#555', maxTicksLimit: 6 }, grid: { display: false } } } }
    });
  }

  function initCharts() {
    retentionChart = new Chart(document.getElementById('retention-chart').getContext('2d'), {
      type: 'line', data: { labels: [], datasets: [
        { label: 'HARD LEAD SSL', data: [], borderColor: '#e50914', backgroundColor: 'rgba(229,9,20,.12)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0 },
        { label: 'HARD LEAD VSL', data: [], borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,.12)', fill: true, tension: 0.3, borderWidth: 2, pointRadius: 0 }
      ] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#aaa' } } }, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#555', callback: function (v) { return v + '%'; } }, grid: { color: 'rgba(255,255,255,.05)' } }, x: { ticks: { color: '#555', maxTicksLimit: 6 }, grid: { display: false } } } }
    });
    chartA = makeChart('chart-a', '#e50914', 'rgba(229,9,20,.15)');
    chartB = makeChart('chart-b', '#22c55e', 'rgba(34,197,94,.15)');
  }

  function renderCharts(a, b) {
    var labels = a.curve.labels.length >= b.curve.labels.length ? a.curve.labels : b.curve.labels;
    retentionChart.data.labels = labels;
    retentionChart.data.datasets[0].data = a.curve.data;
    retentionChart.data.datasets[1].data = b.curve.data;
    retentionChart.update('none');
    chartA.data.labels = a.curve.labels; chartA.data.datasets[0].data = a.curve.data; chartA.update('none');
    chartB.data.labels = b.curve.labels; chartB.data.datasets[0].data = b.curve.data; chartB.update('none');
  }

  // ==== INSIGHT ====
  function renderInsight(a, b) {
    var card = document.getElementById('insight-card');
    var text = document.getElementById('insight-text');
    if (!card) return;
    var msg = '';
    if (a.views + b.views === 0) msg = 'Ainda sem dados. Aguarde o tráfego começar.';
    else if (a.playRate > b.playRate && a.plays > 2) msg = 'HARD LEAD SSL tem ' + (a.playRate - b.playRate).toFixed(1) + '% mais play rate. O lead SSL engaja mais no início.';
    else if (b.playRate > a.playRate && b.plays > 2) msg = 'HARD LEAD VSL tem ' + (b.playRate - a.playRate).toFixed(1) + '% mais play rate. O lead VSL atrai mais.';
    else msg = 'Os dois vídeos estão com performance similar. Continue coletando dados.';
    text.textContent = msg; card.style.display = 'block';
  }

  // ==== HELPERS ====
  function set(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function setW(idA, vA, idB, vB, nA, nB) {
    var a = document.getElementById(idA), b = document.getElementById(idB);
    if (a) { a.textContent = vA; a.classList.toggle('winner-cell', nA > nB); }
    if (b) { b.textContent = vB; b.classList.toggle('winner-cell', nB > nA); }
  }
})();
