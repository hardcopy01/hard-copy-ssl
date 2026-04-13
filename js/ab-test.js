/* A/B TEST — 50/50 split, 2 videos */
(function () {
  function getOrAssign() {
    var v = localStorage.getItem('hc_ab_variant');
    if (!v) { v = Math.random() < 0.5 ? 'A' : 'B'; localStorage.setItem('hc_ab_variant', v); }
    return v;
  }
  function getVisitorId() {
    var id = localStorage.getItem('hc_visitor_id');
    if (!id) { id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8); localStorage.setItem('hc_visitor_id', id); }
    return id;
  }

  var variant = getOrAssign();

  // Video config per variant
  var CONFIG = {
    A: {
      id: window._BC.vA,
      name: 'HARD LEAD SSL',
      offerTime: 356,    // 5:56
      checkoutTime: 618, // 10:18
    },
    B: {
      id: window._BC.vB,
      name: 'HARD LEAD VSL',
      offerTime: 321,    // 5:21
      checkoutTime: 582, // 9:42
    }
  };

  var current = CONFIG[variant] || CONFIG.A;

  window.HC_AB = {
    variant: variant,
    visitorId: getVisitorId(),
    videoId: current.id,
    videoName: current.name,
    offerTime: current.offerTime,
    checkoutTime: current.checkoutTime,
    getHlsUrl: function (vid) { return 'https://' + window._BC.h + '/' + vid + '/playlist.m3u8'; },
    config: CONFIG,
  };
})();
