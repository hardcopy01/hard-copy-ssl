/* Firebase Config — Hard Copy SSL */

var firebaseConfig = {
  apiKey: "AIzaSyA-r8tr8GIZwVquD_Kx79iZ8uiuK0nr-5I",
  authDomain: "hdcpy2025.firebaseapp.com",
  projectId: "hdcpy2025",
  storageBucket: "hdcpy2025.firebasestorage.app",
  messagingSenderId: "565567759217",
  appId: "1:565567759217:web:847d42d94d764bb3eeccd0",
  measurementId: "G-TNSQBQ34SE"
};

function loadFirebase() {
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
    console.log('[Firebase] Inicializado com sucesso');
  } catch (err) {
    console.error('[Firebase] Erro:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFirebase);
} else {
  loadFirebase();
}
