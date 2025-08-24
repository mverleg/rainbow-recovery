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

  // Helpers
  function gridCenter(p) {
    // Snap arbitrary position to nearest grid center
    const cx = Math.round((p.x - GRID * 0.5) / GRID) * GRID + GRID * 0.5;
    const cy = Math.round((p.y - GRID * 0.5) / GRID) * GRID + GRID * 0.5;
    return vec2(cx, cy);
  }

  function dirToVec(d) {
    switch (d) {
      case 'up': return vec2(0, -1);
      case 'down': return vec2(0, 1);
      case 'left': return vec2(-1, 0);
      case 'right': return vec2(1, 0);
    }
    return vec2(0, 0);
  }

  function setSpriteForDir(d) {
    if (d === 'up') {
      player.use(sprite('char-back'));
      player.flipX = false;
    } else if (d === 'down') {
      player.use(sprite('char-front'));
      player.flipX = false;
    } else if (d === 'right') {
      player.use(sprite('char-right'));
      player.flipX = false;
    } else if (d === 'left') {
      player.use(sprite('char-right'));
      player.flipX = true;
    }
  }

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

  // defer scale until texture is ready
  player.onUpdate(() => {
    if (!player.__sized && player.width > 0 && player.height > 0) {
      const base = Math.max(player.width, player.height);
      const s = base > 0 ? (GRID * 0.95) / base : 1;
      player.scale = vec2(s);
      player.__sized = true;
    }
  });

  const SPEED = GRID * 6; // pixels per second

  function startMove(d) {
    if (!d) return;
    const v = dirToVec(d);
    if (v.x === 0 && v.y === 0) return;
    // Always move from snapped center to the adjacent center
    const from = gridCenter(player.pos);
    const to = vec2(from.x + v.x * GRID, from.y + v.y * GRID);
    player.pos = from; // eliminate drift
    player.target = to;
    player.dir = d;
    player.moving = true;
    setSpriteForDir(d);
  }

  function handleQueuedOrHeld() {
    // Determine next move when at a grid center
    const holdOrder = ['up', 'right', 'down', 'left'];
    let d = null;
    if (player.nextDir && isKeyDown(player.nextDir)) {
      d = player.nextDir;
    } else if (player.dir && isKeyDown(player.dir)) {
      d = player.dir;
    } else {
      for (const k of holdOrder) {
        if (isKeyDown(k)) { d = k; break; }
      }
    }
    player.nextDir = null;
    if (d) startMove(d);
  }

  // Input
  const keyMap = [
    ['up', 'w'],
    ['down', 's'],
    ['left', 'a'],
    ['right', 'd'],
  ];

  for (const [k, alt] of keyMap) {
    onKeyPress(k, () => {
      player.nextDir = k;
      if (!player.moving) startMove(k);
    });
    onKeyPress(alt, () => {
      player.nextDir = k;
      if (!player.moving) startMove(k);
    });
  }

  // Movement update
  onUpdate(() => {
    if (player.moving) {
      const to = player.target;
      const delta = to.sub(player.pos);
      const dist = delta.len();
      if (dist <= 0.0001) {
        // Arrived
        player.pos = to;
        player.moving = false;
        handleQueuedOrHeld();
      } else {
        const step = SPEED * dt();
        if (step >= dist) {
          player.pos = to;
          player.moving = false;
          handleQueuedOrHeld();
        } else {
          const dir = delta.unit();
          player.pos = player.pos.add(dir.scale(step));
        }
      }
    } else {
      // Idle at grid center: check held keys to start moving
      handleQueuedOrHeld();
    }
  });

  // Camera dead-zone follow and grid update
  function applyCamera() {
    const w = width();
    const h = height();
    const cam = camPos();
    const screenX = player.pos.x - cam.x + w / 2;
    const screenY = player.pos.y - cam.y + h / 2;
    const deadL = 0.4 * w;
    const deadR = 0.6 * w;
    const deadT = 0.4 * h;
    const deadB = 0.6 * h;
    let newCamX = cam.x;
    let newCamY = cam.y;
    if (screenX < deadL) newCamX = player.pos.x + w / 2 - deadL;
    if (screenX > deadR) newCamX = player.pos.x + w / 2 - deadR;
    if (screenY < deadT) newCamY = player.pos.y + h / 2 - deadT;
    if (screenY > deadB) newCamY = player.pos.y + h / 2 - deadB;
    if (newCamX !== cam.x || newCamY !== cam.y) camPos(vec2(newCamX, newCamY));

    // Update the background grid to match camera
    updateGrid(camPos());
  }

  onUpdate(applyCamera);

  // Relayout handler for window resize (rebuild grid and keep dead-zone logic consistent)
  state.currentRelayout = () => {
    // No specific layout, but rebuild grid sizes and re-apply camera snap once
    updateGrid(camPos());
  };
});
