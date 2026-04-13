/* ============================================
   TRACKER — Event tracking for A/B metrics
   Stores events in Firebase Firestore
   ============================================ */

(function () {
  const eventQueue = [];
  let firebaseReady = false;
  let db = null;

  // Milestones for retention tracking
  const MILESTONES = [25, 50, 75, 100];
  const reachedMilestones = new Set();
  let firstPlayTracked = false;

  function track(eventName, extra = {}) {
    const event = {
      event: eventName,
      variant: window.HC_AB ? window.HC_AB.variant : 'unknown',
      visitorId: window.HC_AB ? window.HC_AB.visitorId : 'unknown',
      timestamp: new Date().toISOString(),
      videoTime: window.HC_PLAYER ? Math.floor(window.HC_PLAYER.getTime()) : 0,
      url: window.location.href,
      ...extra,
    };

    if (firebaseReady && db) {
      sendToFirebase(event);
    } else {
      eventQueue.push(event);
    }

    // Also log locally for debugging
    console.log('[HC Tracker]', eventName, event);
  }

  function sendToFirebase(event) {
    try {
      db.collection('events').add({
        ...event,
        serverTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.warn('[HC Tracker] Firebase error:', err);
    }
  }

  function flushQueue() {
    while (eventQueue.length > 0) {
      sendToFirebase(eventQueue.shift());
    }
  }

  // ---- AUTO TRACK EVENTS ----

  // Page view
  track('page_view');

  // First play
  window.addEventListener('hc:videoplay', () => {
    if (!firstPlayTracked) {
      firstPlayTracked = true;
      track('video_play');
    }
  });

  // Pause
  window.addEventListener('hc:videopause', (e) => {
    track('video_pause', { pauseAt: Math.floor(e.detail.currentTime) });
  });

  // Progress milestones
  window.addEventListener('hc:timeupdate', (e) => {
    const { currentTime, duration } = e.detail;
    if (!duration) return;
    const pct = Math.floor((currentTime / duration) * 100);

    for (const milestone of MILESTONES) {
      if (pct >= milestone && !reachedMilestones.has(milestone)) {
        reachedMilestones.add(milestone);
        track('video_progress', { milestone });
      }
    }
  });

  // ---- FIREBASE INIT LISTENER ----
  window.addEventListener('hc:firebase_ready', (e) => {
    db = e.detail.db;
    firebaseReady = true;
    flushQueue();
  });

  // ---- EXPOSE TRACKER API ----
  window.HC_TRACKER = { track };
})();
