/* A/B TEST — uses vault for IDs */
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
  // Video B not set yet — uses A for both
  var vidB = null;

  window.HC_AB = {
    variant: variant,
    visitorId: getVisitorId(),
    getVideoId: function (v) { return (v === 'B' && vidB) ? vidB : window._BC.v; },
    getHlsUrl: function (vid) { return 'https://' + window._BC.h + '/' + vid + '/playlist.m3u8'; },
  };
})();
