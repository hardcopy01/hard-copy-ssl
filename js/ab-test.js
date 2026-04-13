/* A/B TEST — 50/50 Split */
var AB_CONFIG = {
  videoA: 'aef956e4-6223-458e-b4b1-7eeb22cda7ff',
  videoB: null,
  libraryId: '636608',
  cdnHost: 'vz-b17a97ce-88f.b-cdn.net',
};

function getOrAssignVariant() {
  var v = localStorage.getItem('hc_ab_variant');
  if (!v) { v = Math.random() < 0.5 ? 'A' : 'B'; localStorage.setItem('hc_ab_variant', v); }
  return v;
}
function getVideoId(variant) {
  if (variant === 'B' && AB_CONFIG.videoB) return AB_CONFIG.videoB;
  return AB_CONFIG.videoA;
}
function getEmbedUrl(videoId) {
  return 'https://iframe.mediadelivery.net/embed/' + AB_CONFIG.libraryId + '/' + videoId + '?autoplay=true&muted=true&preload=true&controls=false';
}
function getVisitorId() {
  var id = localStorage.getItem('hc_visitor_id');
  if (!id) { id = 'v_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 8); localStorage.setItem('hc_visitor_id', id); }
  return id;
}

window.HC_AB = {
  variant: getOrAssignVariant(),
  visitorId: getVisitorId(),
  getVideoId: getVideoId,
  getEmbedUrl: getEmbedUrl,
  config: AB_CONFIG,
};
