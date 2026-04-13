/* === OVERLAYS — Pause instantâneo, vermelho, zoom === */
(function () {
  var overlay = document.getElementById('pause-overlay');
  var text = document.getElementById('pause-overlay-text');
  var btn = document.getElementById('pause-overlay-btn');

  var HOOKS = [
    { from: 0, to: 90, text: 'Calma. A narrativa que tá sendo construída agora vai fazer sentido nos próximos segundos. Fica aqui.' },
    { from: 90, to: 180, text: 'Essa parte é onde você vai entender o que nenhum curso de marketing te ensinou. Se você sair agora, vai continuar fazendo a mesma coisa que todo mundo faz. Espera.' },
    { from: 180, to: 270, text: 'Você vai perder a explicação de por que tudo que você tentou até hoje não funcionou. Essa resposta tá a segundos de aparecer. Não sai agora.' },
    { from: 270, to: 330, text: 'O formato que Hollywood não consegue mais usar, mas que a Coreia do Sul dominou. Falta pouco pra você entender.' },
    { from: 330, to: 376, text: 'Nos próximos segundos você vai entender por que ficou até aqui sem saber por quê. Calma. Não sai agora.' },
    { from: 376, to: 480, text: 'A oferta acabou de começar. Essa é a parte que você não pode perder.' },
    { from: 480, to: 570, text: 'Calma, eu tô te explicando tudo o que você vai levar. Cada segundo que passa é mais valor na mesa. Espera um pouco, não sai agora.' },
    { from: 570, to: 616, text: 'O preço tá prestes a aparecer. Pode acreditar: é muito mais barato do que você tá imaginando. Espera mais um pouco.' },
    { from: 616, to: Infinity, text: 'Você chegou até a oferta. Não faz sentido sair agora.' },
  ];

  function getHook(s) {
    for (var i = 0; i < HOOKS.length; i++) { if (s >= HOOKS[i].from && s < HOOKS[i].to) return HOOKS[i].text; }
    return HOOKS[HOOKS.length - 1].text;
  }

  // Activated after 6s grace period
  var ready = false;
  window.addEventListener('hc:user_activated', function () {
    setTimeout(function () { ready = true; }, 6000);
  });

  // INSTANT show on pause
  window.addEventListener('hc:videopause', function (e) {
    if (!ready) return;
    text.textContent = getHook(e.detail.currentTime);
    overlay.classList.add('show');
  });

  // Hide on play
  window.addEventListener('hc:videoplay', function () {
    overlay.classList.remove('show');
  });

  // Button
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    overlay.classList.remove('show');
    if (window.HC_PLAYER) window.HC_PLAYER.play();
  });
  btn.addEventListener('touchend', function (e) {
    e.stopPropagation(); e.preventDefault();
    overlay.classList.remove('show');
    if (window.HC_PLAYER) window.HC_PLAYER.play();
  }, { passive: false });
})();
