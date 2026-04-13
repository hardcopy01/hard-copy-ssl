/* ============================================
   DASHBOARD — Bunny-style A/B Metrics
   Wave retention charts + individual metrics
   ============================================ */

(function () {
  const DASH_PASSWORD = 'HDCPY102030';
  const PITCH_TIME = 618; // momento do pitch/checkout (dinâmico por vídeo)
  let db = null;
  let retentionChart = null;
  let chartA = null;
  let chartB = null;
  let chartJsLoaded = false;

  // ---- LOGIN (persists in session) ----
  function initLogin() {
    // Check if already logged in this session
    if (sessionStorage.getItem('hc_dash_auth') === 'true') {
      document.getElementById('login-section').style.display = 'none';
      document.getElementById('dashboard-content').style.display = 'block';
      initDashboard();
      return;
    }

    const loginBtn = document.getElementById('login-btn');
    const passwordInput = document.getElementById('password-input');
    const loginError = document.getElementById('login-error');

    loginBtn.addEventListener('click', tryLogin);
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') tryLogin();
    });

    function tryLogin() {
      const pwd = passwordInput.value.trim();
      if (pwd === DASH_PASSWORD) {
        sessionStorage.setItem('hc_dash_auth', 'true');
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('dashboard-content').style.display = 'block';
        initDashboard();
      } else {
        loginError.style.display = 'block';
        loginError.textContent = 'Senha incorreta';
        passwordInput.value = '';
        passwordInput.focus();
      }
    }
  }

  // ---- DASHBOARD INIT ----
  function initDashboard() {
    // Set date range display
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    document.getElementById('date-range').textContent =
      formatDate(monthAgo) + ' - ' + formatDate(now);

    loadFirebaseSDK(() => {
      try { firebase.initializeApp(firebaseConfig); } catch (e) { /* already init */ }
      db = firebase.firestore();

      loadChartJs(() => {
        chartJsLoaded = true;
        initCharts();
        loadMetrics();
      });

      document.getElementById('refresh-btn').addEventListener('click', loadMetrics);
      setInterval(loadMetrics, 30000);
    });
  }

  function formatDate(d) {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function loadFirebaseSDK(callback) {
    const scripts = [
      'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
      'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
    ];
    let loaded = 0;
    scripts.forEach((src) => {
      if (document.querySelector('script[src="' + src + '"]')) { loaded++; if (loaded === scripts.length) callback(); return; }
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => { loaded++; if (loaded === scripts.length) callback(); };
      document.head.appendChild(s);
    });
  }

  function loadChartJs(callback) {
    const src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
    if (document.querySelector('script[src="' + src + '"]')) { callback(); return; }
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = callback;
    document.head.appendChild(s);
  }

  // ---- CHARTS INIT ----
  function createAreaChart(canvasId, datasets, height) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: { color: 'rgba(255,255,255,0.7)', usePointStyle: true, pointStyle: 'circle', padding: 16, font: { size: 12 } },
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.85)',
            titleColor: '#fff',
            bodyColor: 'rgba(255,255,255,0.8)',
            borderColor: 'rgba(255,255,255,0.1)',
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label: function (ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y.toFixed(1) + '%'; },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: { color: 'rgba(255,255,255,0.4)', callback: (v) => v + '%', stepSize: 20 },
            grid: { color: 'rgba(255,255,255,0.05)' },
            border: { display: false },
          },
          x: {
            ticks: { color: 'rgba(255,255,255,0.4)', maxTicksLimit: 6, font: { size: 11 } },
            grid: { display: false },
            border: { display: false },
          },
        },
        elements: {
          point: { radius: 0, hoverRadius: 4 },
          line: { tension: 0.3, borderWidth: 2 },
        },
      },
    });
  }

  function initCharts() {
    // Main retention chart — both videos overlaid
    retentionChart = createAreaChart('retention-chart', [
      {
        label: 'Vídeo A',
        data: [],
        borderColor: '#e50914',
        backgroundColor: 'rgba(229, 9, 20, 0.12)',
        fill: true,
      },
      {
        label: 'Vídeo B',
        data: [],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.12)',
        fill: true,
      },
    ]);

    // Individual chart A
    chartA = createAreaChart('chart-a', [{
      label: 'Retenção',
      data: [],
      borderColor: '#e50914',
      backgroundColor: 'rgba(229, 9, 20, 0.15)',
      fill: true,
    }]);

    // Individual chart B
    chartB = createAreaChart('chart-b', [{
      label: 'Retenção',
      data: [],
      borderColor: '#22c55e',
      backgroundColor: 'rgba(34, 197, 94, 0.15)',
      fill: true,
    }]);
  }

  // ---- LOAD METRICS ----
  async function loadMetrics() {
    if (!db) return;

    try {
      const snapshot = await db.collection('events')
        .limit(10000)
        .get();

      const events = [];
      snapshot.forEach((doc) => events.push(doc.data()));

      const mA = computeFullMetrics(events, 'A');
      const mB = computeFullMetrics(events, 'B');

      renderABTable(mA, mB);
      renderIndividualMetrics('a', mA);
      renderIndividualMetrics('b', mB);
      renderRetentionCharts(mA, mB);
      renderInsight(mA, mB);

    } catch (err) {
      console.error('[Dashboard] Error:', err);
    }
  }

  // ---- COMPUTE METRICS ----
  function computeFullMetrics(allEvents, variant) {
    const events = allEvents.filter((e) => e.variant === variant);
    const visitors = new Set(events.map((e) => e.visitorId));

    const views = events.filter((e) => e.event === 'page_view').length;
    const uniqueViews = visitors.size;
    const playEvents = events.filter((e) => e.event === 'video_play');
    const plays = playEvents.length;
    const uniquePlays = new Set(playEvents.map((e) => e.visitorId)).size;
    const playRate = uniqueViews > 0 ? ((uniquePlays / uniqueViews) * 100) : 0;

    // Retention at pitch (reached checkout)
    const checkoutEvents = events.filter((e) => e.event === 'checkout_view');
    const checkoutVisitors = new Set(checkoutEvents.map((e) => e.visitorId)).size;
    const retentionPitch = uniquePlays > 0 ? ((checkoutVisitors / uniquePlays) * 100) : 0;
    const audiencePitch = checkoutVisitors;

    // Engagement: % of viewers who interacted (paused, speed change, etc.)
    const pauseEvents = events.filter((e) => e.event === 'video_pause');
    const engagedVisitors = new Set(pauseEvents.map((e) => e.visitorId)).size;
    const engagement = uniqueViews > 0 ? ((engagedVisitors / uniqueViews) * 100) : 0;

    // Button clicks (checkout_click or saiba_mais_click)
    const btnClicks = events.filter((e) => e.event === 'checkout_click' || e.event === 'saiba_mais_click').length;

    // Conversions (would need webhook/integration — for now track checkout_click as proxy)
    const conversions = events.filter((e) => e.event === 'purchase').length;
    const convRate = uniquePlays > 0 ? ((conversions / uniquePlays) * 100) : 0;

    // Revenue placeholder
    const revenue = conversions * 286; // R$286 à vista

    // Build retention curve data (% still watching at each time point)
    const retentionCurve = buildRetentionCurve(events, uniquePlays);

    return {
      variant,
      views,
      uniqueViews,
      plays,
      uniquePlays,
      playRate,
      retentionPitch,
      audiencePitch,
      engagement,
      btnClicks,
      conversions,
      convRate,
      revenue,
      retentionCurve,
    };
  }

  function buildRetentionCurve(events, totalPlays) {
    if (totalPlays === 0) return { labels: [], data: [] };

    // Use progress milestones and pause times to estimate retention
    const progressEvents = events.filter((e) => e.event === 'video_progress' || e.event === 'video_pause');

    // Build a map of max time reached per visitor
    const maxTimeByVisitor = {};
    progressEvents.forEach((e) => {
      const vid = e.visitorId;
      const time = e.videoTime || 0;
      if (!maxTimeByVisitor[vid] || time > maxTimeByVisitor[vid]) {
        maxTimeByVisitor[vid] = time;
      }
    });

    // Also count visitors who reached checkout as having watched up to PITCH_TIME
    events.filter((e) => e.event === 'checkout_view').forEach((e) => {
      const vid = e.visitorId;
      if (!maxTimeByVisitor[vid] || PITCH_TIME > maxTimeByVisitor[vid]) {
        maxTimeByVisitor[vid] = PITCH_TIME;
      }
    });

    const totalViewers = Object.keys(maxTimeByVisitor).length || 1;

    // Generate data points every 30 seconds up to 18 minutes
    const labels = [];
    const data = [];
    const maxTime = 18 * 60; // 18 min

    for (let t = 0; t <= maxTime; t += 30) {
      const mins = Math.floor(t / 60);
      const secs = t % 60;
      labels.push(mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0'));

      const viewersAtTime = Object.values(maxTimeByVisitor).filter((mt) => mt >= t).length;
      const pct = (viewersAtTime / totalViewers) * 100;
      data.push(Math.round(pct * 100) / 100);
    }

    return { labels, data };
  }

  // ---- RENDER A/B TABLE ----
  function renderABTable(mA, mB) {
    const totalViews = mA.views + mB.views;
    const trafficA = totalViews > 0 ? ((mA.views / totalViews) * 100).toFixed(2) : '50.00';
    const trafficB = totalViews > 0 ? ((mB.views / totalViews) * 100).toFixed(2) : '50.00';

    setText('ab-traffic-a', trafficA + '%');
    setText('ab-traffic-b', trafficB + '%');
    setText('ab-views-a', fmt(mA.views));
    setText('ab-views-b', fmt(mB.views));
    setText('ab-unique-a', fmt(mA.uniqueViews));
    setText('ab-unique-b', fmt(mB.uniqueViews));
    setText('ab-plays-a', fmt(mA.plays));
    setText('ab-plays-b', fmt(mB.plays));
    setText('ab-unique-plays-a', fmt(mA.uniquePlays));
    setText('ab-unique-plays-b', fmt(mB.uniquePlays));

    setTextWithWinner('ab-playrate-a', mA.playRate.toFixed(2) + '%', 'ab-playrate-b', mB.playRate.toFixed(2) + '%', mA.playRate, mB.playRate);
    setTextWithWinner('ab-retention-pitch-a', mA.retentionPitch.toFixed(2) + '%', 'ab-retention-pitch-b', mB.retentionPitch.toFixed(2) + '%', mA.retentionPitch, mB.retentionPitch);
  }

  // ---- RENDER INDIVIDUAL METRICS ----
  function renderIndividualMetrics(prefix, m) {
    const p = 'v' + prefix + '-';
    setText(p + 'views', fmt(m.views));
    setText(p + 'unique-views', fmt(m.uniqueViews));
    setText(p + 'plays', fmt(m.plays));
    setText(p + 'unique-plays', fmt(m.uniquePlays));
    setText(p + 'playrate', m.playRate.toFixed(2) + '%');
    setText(p + 'retention-pitch', m.retentionPitch.toFixed(2) + '%');
    setText(p + 'audience-pitch', fmt(m.audiencePitch));
    setText(p + 'engagement', m.engagement.toFixed(2) + '%');
    setText(p + 'btn-clicks', fmt(m.btnClicks));
    setText(p + 'conversions', fmt(m.conversions));
    setText(p + 'conv-rate', m.convRate.toFixed(2) + '%');
    setText(p + 'revenue', 'R$ ' + m.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  }

  // ---- RENDER RETENTION CHARTS ----
  function renderRetentionCharts(mA, mB) {
    if (!chartJsLoaded || !retentionChart) return;

    // Main chart — both videos
    const labels = mA.retentionCurve.labels.length >= mB.retentionCurve.labels.length
      ? mA.retentionCurve.labels : mB.retentionCurve.labels;

    retentionChart.data.labels = labels;
    retentionChart.data.datasets[0].data = mA.retentionCurve.data;
    retentionChart.data.datasets[1].data = mB.retentionCurve.data;
    retentionChart.update('none');

    // Individual chart A
    chartA.data.labels = mA.retentionCurve.labels;
    chartA.data.datasets[0].data = mA.retentionCurve.data;
    chartA.update('none');

    // Individual chart B
    chartB.data.labels = mB.retentionCurve.labels;
    chartB.data.datasets[0].data = mB.retentionCurve.data;
    chartB.update('none');
  }

  // ---- HELPERS ----
  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setTextWithWinner(idA, valA, idB, valB, numA, numB) {
    const elA = document.getElementById(idA);
    const elB = document.getElementById(idB);
    if (elA) { elA.textContent = valA; elA.classList.toggle('winner-cell', numA > numB); }
    if (elB) { elB.textContent = valB; elB.classList.toggle('winner-cell', numB > numA); }
  }

  function fmt(n) {
    return n.toLocaleString('pt-BR');
  }

  // ---- INSIGHT ----
  function renderInsight(mA, mB) {
    var card = document.getElementById('insight-card');
    var text = document.getElementById('insight-text');
    if (!card || !text) return;

    var insights = [];
    var nameA = 'HARD LEAD SSL', nameB = 'HARD LEAD VSL';

    if (mA.playRate > mB.playRate && mA.plays > 3) {
      insights.push(nameA + ' tem ' + (mA.playRate - mB.playRate).toFixed(1) + '% mais play rate que ' + nameB + '. O lead do SSL está engajando mais no início.');
    } else if (mB.playRate > mA.playRate && mB.plays > 3) {
      insights.push(nameB + ' tem ' + (mB.playRate - mA.playRate).toFixed(1) + '% mais play rate que ' + nameA + '. O lead do VSL tá atraindo mais.');
    }

    if (mA.retentionPitch > mB.retentionPitch && mA.audiencePitch > 0) {
      insights.push(nameA + ' retém ' + (mA.retentionPitch - mB.retentionPitch).toFixed(1) + '% mais leads até o pitch. A narrativa do SSL tá prendendo melhor.');
    } else if (mB.retentionPitch > mA.retentionPitch && mB.audiencePitch > 0) {
      insights.push(nameB + ' retém ' + (mB.retentionPitch - mA.retentionPitch).toFixed(1) + '% mais leads até o pitch. A narrativa do VSL tá performando melhor.');
    }

    if (mA.uniqueViews + mB.uniqueViews === 0) {
      insights.push('Ainda sem dados suficientes. Aguarde o tráfego começar para ver os insights.');
    }

    if (insights.length > 0) {
      text.textContent = insights[0];
      card.style.display = 'block';
    }
  }

  // ---- INIT ----
  initLogin();
})();
