/* ============================================
   FIREBASE CONFIG
   ============================================

   INSTRUÇÕES: Substitua o firebaseConfig abaixo
   com as credenciais do seu projeto Firebase.

   1. Acesse https://console.firebase.google.com
   2. Crie um novo projeto (ex: "hard-copy-ssl")
   3. Vá em Project Settings > General > Your apps
   4. Clique em "Web" (</>)  e registre o app
   5. Copie o firebaseConfig e cole abaixo
   6. Ative o Firestore Database (modo de teste)

   ============================================ */

// TODO: Substitua com suas credenciais Firebase
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  storageBucket: "SEU_PROJETO.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID",
};

// Carrega Firebase SDK dinamicamente (não bloqueia render)
function loadFirebase() {
  const scripts = [
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js',
  ];

  let loaded = 0;

  function onLoad() {
    loaded++;
    if (loaded === scripts.length) {
      initFirebase();
    }
  }

  scripts.forEach((src) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = onLoad;
    s.onerror = () => console.warn('[Firebase] Failed to load:', src);
    document.head.appendChild(s);
  });
}

function initFirebase() {
  try {
    if (firebaseConfig.apiKey === 'SUA_API_KEY') {
      console.warn('[Firebase] Config não configurada. Métricas não serão salvas.');
      return;
    }

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Notify tracker that Firebase is ready
    window.dispatchEvent(new CustomEvent('hc:firebase_ready', {
      detail: { db },
    }));

    console.log('[Firebase] Inicializado com sucesso');
  } catch (err) {
    console.error('[Firebase] Erro na inicialização:', err);
  }
}

// Start loading after page is interactive
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFirebase);
} else {
  loadFirebase();
}
