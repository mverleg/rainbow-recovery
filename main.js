// Main entry: initialize Kaplay first, then dynamically import modules that register scenes.
const canvas = document.querySelector('#game');
const k = kaplay({
  canvas: canvas,
  width: canvas.clientWidth,
  height: canvas.clientHeight,
  background: [0, 0, 0],  // Changed from gray [230, 230, 230] to black
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
  const { state, buildGrid, updateGrid, monsters } = await import('./shared.js');
  // Import scenes which call scene() so they see the Kaplay globals
  await import('./menu.js');
  await import('./level.js');

  // Keep canvas sized to window on resize and rebuild the grid for current scene
  window.addEventListener('resize', () => {
    if (typeof resize === 'function') {
      resize(canvas.clientWidth, canvas.clientHeight);
    } else if (k && k.canvas) {
      k.canvas.width = canvas.clientWidth;
      k.canvas.height = canvas.clientHeight;
    }
    buildGrid();
    if (typeof state.currentRelayout === 'function') {
      state.currentRelayout();
    }
    try { updateGrid(camPos()); } catch (e) { /* ignore if scene not ready */ }
  });

  // Load all monster and player sprites
  for (const m of monsters) {
    loadSprite(m.key, m.path);
  }
  loadSprite('char-front', 'img/char-front.png');
  loadSprite('char-back', 'img/char-back.png');
  loadSprite('char-right', 'img/char-right.png');

  onLoad(() => {
    // Focus the canvas so keyboard controls (arrows/Enter) work immediately
    try { k.canvas && k.canvas.focus && k.canvas.focus(); } catch {}
    go('menu');
  });

  // Initial grid build (for first scene before any resize events)
  buildGrid();

  console.log('Dedicated to Leo and Benni; thanks for playing!');
  console.log('Kaplay main initialized');
})();
