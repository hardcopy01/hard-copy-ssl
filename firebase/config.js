/* Firebase Config — uses vault */
var firebaseConfig = null;

function loadFirebase() {
  // Build config from vault
  if (!window._FC) { console.warn('[FB] Vault not loaded'); return; }
  firebaseConfig = {
    apiKey: window._FC.a,
    authDomain: window._FC.b,
    projectId: window._FC.c,
    storageBucket: window._FC.d,
    messagingSenderId: window._FC.e,
    appId: window._FC.f,
    measurementId: window._FC.g,
  };

  var scripts = [
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
  ];
  var loaded = 0;
  scripts.forEach(function (src) {
    var s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = function () { loaded++; if (loaded === scripts.length) initFirebase(); };
    document.head.appendChild(s);
  });
}

function initFirebase() {
  try {
    firebase.initializeApp(firebaseConfig);
    var db = firebase.firestore();
    window.dispatchEvent(new CustomEvent('hc:firebase_ready', { detail: { db: db } }));
  } catch (err) { /* silent */ }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadFirebase);
else loadFirebase();
