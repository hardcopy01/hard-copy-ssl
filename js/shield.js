/* ============================================
   SHIELD — Security & Anti-Inspect
   - Disable right-click
   - Disable keyboard shortcuts (F12, Ctrl+Shift+I, Ctrl+U)
   - Detect DevTools open
   - Disable text selection
   - Disable drag
   - Disable view-source
   - Console warning
   ============================================ */

(function () {
  // === DISABLE RIGHT CLICK ===
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); return false; });

  // === DISABLE KEYBOARD SHORTCUTS ===
  document.addEventListener('keydown', function (e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); return false; }
    // Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) { e.preventDefault(); return false; }
    // Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) { e.preventDefault(); return false; }
    // Ctrl+Shift+C (Inspect element)
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) { e.preventDefault(); return false; }
    // Ctrl+U (View source)
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) { e.preventDefault(); return false; }
    // Ctrl+S (Save page)
    if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) { e.preventDefault(); return false; }
  });

  // === DISABLE TEXT SELECTION ===
  document.addEventListener('selectstart', function (e) { e.preventDefault(); });

  // === DISABLE DRAG ===
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // === DEVTOOLS DETECTION ===
  var devOpen = false;

  // Method 1: debugger loop (pauses execution when DevTools is open)
  setInterval(function () {
    var start = performance.now();
    debugger;
    var end = performance.now();
    if (end - start > 100) {
      if (!devOpen) {
        devOpen = true;
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-size:20px;font-family:sans-serif;text-align:center;padding:20px;">Acesso não autorizado.</div>';
      }
    }
  }, 1000);

  // Method 2: Console size detection
  var threshold = 160;
  var check = function () {
    if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
      if (!devOpen) {
        devOpen = true;
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff;font-size:20px;font-family:sans-serif;text-align:center;padding:20px;">Acesso não autorizado.</div>';
      }
    }
  };
  setInterval(check, 500);

  // === CONSOLE WARNING ===
  console.log('%cPARE!', 'color:red;font-size:60px;font-weight:bold');
  console.log('%cEste recurso do navegador é destinado a desenvolvedores.', 'font-size:16px');
  console.log('%cSe alguém pediu para você colar algo aqui, isso é golpe.', 'font-size:14px;color:red');

  // === CLEAR CONSOLE PERIODICALLY ===
  setInterval(function () {
    if (!devOpen) console.clear();
  }, 2000);
})();
