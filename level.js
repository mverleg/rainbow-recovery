import { GRID, buildGrid, updateGrid, state } from './shared.js';

// Level scene
scene('level', (monsterKey) => {
  const rainbow = document.querySelector('.rainbow-container');
  if (rainbow) rainbow.style.display = 'none';
  buildGrid();

  onKeyPress('escape', () => go('menu'));

  if (monsterKey !== 'red') {
    // Show simple message for non-ready levels
    add([
      sprite(monsterKey),
      anchor('center'),
      pos(width() / 2, height() / 2 - 40),
      scale(2),
    ]);
    add([
      text('Level not ready', { size: 28 }),
      anchor('center'),
      pos(width() / 2, 52),
      color(0, 0, 0),
    ]);
    add([
      text('Press Esc or Click to return', { size: 18 }),
      anchor('center'),
      pos(width() / 2, height() - 32),
      color(40, 40, 40),
    ]);
    onClick(() => go('menu'));
    state.currentRelayout = () => {};
    return;
  }

  // --- RED LEVEL IMPLEMENTATION ---

  // Infinite world: we no longer define finite world metrics or borders.

  // Player
  const player = add([
    sprite('char-front'),
    // Start on the center of a grid cell
    pos(GRID * 2 + GRID * 0.5, GRID * 2 + GRID * 0.5),
    anchor('center'),
    area(),
    z(10),
    {
      moving: false,
      target: vec2(0, 0),
      dir: 'down',
      nextDir: null, // queue a direction pressed while moving
    },
  ]);
  // Scale player to roughly fit a grid cell
  onUpdate(() => {
    if (!player.__sized) {
      const base = Math.max(player.width, player.height);
      const s = base > 0 ? (GRID * 0.95) / base : 1;
      player.scale = vec2(s);
      player.__sized = true;
    }
  });

  const SPEED = GRID * 6; // pixels per second

});
