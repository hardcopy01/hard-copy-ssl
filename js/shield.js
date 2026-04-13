/* === SHIELD — Proteção leve (sem falsos positivos) === */
(function () {
  // Disable right-click
  document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // Disable keyboard shortcuts
  document.addEventListener('keydown', function (e) {
    if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) { e.preventDefault(); return false; }
    if (e.ctrlKey && (e.keyCode === 85 || e.keyCode === 83)) { e.preventDefault(); return false; }
  });

  // Disable text selection and drag
  document.addEventListener('selectstart', function (e) { e.preventDefault(); });
  document.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // Console warning
  console.log('%cPARE!', 'color:red;font-size:60px;font-weight:bold');
  console.log('%cEste recurso é destinado a desenvolvedores.', 'font-size:16px');
})();
