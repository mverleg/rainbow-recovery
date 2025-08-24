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

  function snapToGridCenter(v) {
    // Snap to the center of the nearest tile, not the intersection lines
    return vec2(
      Math.round(v.x / GRID) * GRID + GRID * 0.5,
      Math.round(v.y / GRID) * GRID + GRID * 0.5,
    );
  }

  const SPEED = GRID * 6; // pixels per second

  function setDir(dir) {
    if (dir === player.dir) return;
    player.dir = dir;
    if (dir === 'down') player.use(sprite('char-front'));
    if (dir === 'up') player.use(sprite('char-back'));
    if (dir === 'right') { player.use(sprite('char-right')); player.flipX = false; }
    if (dir === 'left')  { player.use(sprite('char-right')); player.flipX = true; }
  }

  function tryStartMove(dir) {
    if (player.moving) {
      // Queue the latest desired direction to execute right after current step
      player.nextDir = dir;
      return false;
    }
    const cur = snapToGridCenter(player.pos);
    let next = cur.clone();
    if (dir === 'left') next.x -= GRID;
    if (dir === 'right') next.x += GRID;
    if (dir === 'up') next.y -= GRID;
    if (dir === 'down') next.y += GRID;
    player.target = next;
    player.moving = true;
    setDir(dir);
    return true;
  }

  // Use per-key handlers; when specifying keys, Kaboom's onKeyPress callbacks do not receive the key name.
  function handlePress(dir) {
    if (player.moving) {
      // queue for after current cell
      player.nextDir = dir;
    } else {
      tryStartMove(dir);
    }
  }
  onKeyPress('left', () => handlePress('left'));
  onKeyPress('a', () => handlePress('left'));
  onKeyPress('right', () => handlePress('right'));
  onKeyPress('d', () => handlePress('right'));
  onKeyPress('up', () => handlePress('up'));
  onKeyPress('w', () => handlePress('up'));
  onKeyPress('down', () => handlePress('down'));
  onKeyPress('s', () => handlePress('down'));

  // Continuous movement queueing if key held
  onUpdate(() => {
    // Smooth move toward target
    if (player.moving) {
      const delta = player.target.sub(player.pos);
      const dist = delta.len();
      const step = SPEED * dt();
      if (dist <= step) {
        player.pos = player.target.clone();
        player.moving = false;
        // If a direction was queued (e.g., pressed while moving), execute it immediately
        if (player.nextDir) {
          const nd = player.nextDir;
          player.nextDir = null;
          tryStartMove(nd);
        }
      } else {
        player.pos = player.pos.add(delta.unit().scale(step));
      }
    } else {
      // Not moving: prefer any queued direction first, then fallback to held keys
      if (player.nextDir) {
        const nd = player.nextDir;
        player.nextDir = null;
        tryStartMove(nd);
      } else {
        let dirHeld = null;
        if (isKeyDown('left') || isKeyDown('a')) dirHeld = 'left';
        else if (isKeyDown('right') || isKeyDown('d')) dirHeld = 'right';
        else if (isKeyDown('up') || isKeyDown('w')) dirHeld = 'up';
        else if (isKeyDown('down') || isKeyDown('s')) dirHeld = 'down';
        if (dirHeld) tryStartMove(dirHeld);
      }
    }

    // Camera: keep player centered; infinite world (no clamping)
    camPos(player.pos);

    // Scroll the grid with camera
    updateGrid(camPos());
  });

  // Initial camera center near player and grid
  camPos(player.pos);
  updateGrid(camPos());

  // Relayout handler: update grid after resize
  state.currentRelayout = () => {
    // After resize, ensure grid rebuild aligns with camera
    updateGrid(camPos());
  };
});
