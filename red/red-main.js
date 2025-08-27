// Red level main entry: initialize Kaplay and load red level specifically
const k = kaplay({
  canvas: document.querySelector('#game'),
  width: window.innerWidth,
  height: window.innerHeight,
  background: [230, 230, 230],
  letterbox: true,
  global: true,
  pixelDensity: 1,
});

// Ensure the canvas can receive keyboard focus for key events
if (k && k.canvas) {
  try {
    k.canvas.setAttribute('tabindex', '0');
    // Focus on first interaction or immediately after load
    k.canvas.addEventListener('click', () => k.canvas.focus(), { once: false });
  } catch (e) {
    console.warn('Canvas focus setup failed:', e);
  }
}

(async () => {
  // Import shared utilities and state after Kaplay has initialized globals
  const { state, buildGrid, updateGrid, monsters } = await import('../shared.js');
  // Import red level specific code
  await import('../red-level.js');

  // Keep canvas sized to window on resize and rebuild the grid for current scene
  window.addEventListener('resize', () => {
    if (typeof resize === 'function') {
      resize(window.innerWidth, window.innerHeight);
    } else if (k && k.canvas) {
      k.canvas.width = window.innerWidth;
      k.canvas.height = window.innerHeight;
    }
    buildGrid();
    if (typeof state.currentRelayout === 'function') {
      state.currentRelayout();
    }
    try { updateGrid(camPos()); } catch (e) { /* ignore if scene not ready */ }
  });

  // Load only red monster and player sprites
  const redMonster = monsters.find(m => m.key === 'red');
  if (redMonster) {
    loadSprite(redMonster.key, redMonster.path);
  }
  loadSprite('char-front', '../img/char-front.png');
  loadSprite('char-back', '../img/char-back.png');
  loadSprite('char-right', '../img/char-right.png');

  onLoad(() => {
    // Focus the canvas so keyboard controls (arrows/Enter) work immediately
    try { k.canvas && k.canvas.focus && k.canvas.focus(); } catch {}
    go('red-level');
  });

  // Initial grid build (for first scene before any resize events)
  buildGrid();

  console.log('Red level main initialized');
})();