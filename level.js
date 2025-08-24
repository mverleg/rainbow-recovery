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

  // Finite level metrics
  const LEVEL_W = 100; // cells
  const LEVEL_H = 30;  // cells

  // Data-driven map and legend
  const LEGEND = {
    '#': { type: 'wall' },
    '.': { type: 'empty' },
  };

  // Build a simple map with a solid border and some interior blocks
  const map = [];
  for (let y = 0; y < LEVEL_H; y++) {
    let row = '';
    for (let x = 0; x < LEVEL_W; x++) {
      const border = (x === 0 || y === 0 || x === LEVEL_W - 1 || y === LEVEL_H - 1);
      let ch = border ? '#' : '.';
      // Add some interior pillars and bars
      if (!border) {
        // Vertical pillars every 12 columns between y=5..(H-6)
        if ((x % 12 === 6) && y >= 5 && y <= LEVEL_H - 6) ch = '#';
        // Horizontal bars every 7 rows between x=15..(W-16)
        if ((y % 7 === 3) && x >= 15 && x <= LEVEL_W - 16) ch = '#';
      }
      row += ch;
    }
    map.push(row);
  }

  function cellToWorld(cx, cy) {
    return vec2((cx + 0.5) * GRID, (cy + 0.5) * GRID);
  }
  function worldToCell(p) {
    return vec2(Math.floor(p.x / GRID), Math.floor(p.y / GRID));
  }
  function inBounds(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < LEVEL_W && cy < LEVEL_H;
  }
  function isSolidCell(cx, cy) {
    if (!inBounds(cx, cy)) return true; // out of bounds is solid
    const ch = map[cy][cx];
    return LEGEND[ch]?.type === 'wall';
  }

  // Render map tiles (walls only for now)
  for (let y = 0; y < LEVEL_H; y++) {
    for (let x = 0; x < LEVEL_W; x++) {
      if (isSolidCell(x, y)) {
        add([
          rect(GRID * 0.98, GRID * 0.98),
          anchor('center'),
          pos(cellToWorld(x, y)),
          color(120, 120, 140),
          z(1),
          area(),
        ]);
      }
    }
  }

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
      lastActiveTime: time(),
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
    const fromCell = worldToCell(from);
    const nextCell = vec2(fromCell.x + v.x, fromCell.y + v.y);
    if (isSolidCell(nextCell.x, nextCell.y)) {
      // Blocked: don't move, but update facing
      player.dir = d;
      setSpriteForDir(d);
      return;
    }
    const to = vec2(from.x + v.x * GRID, from.y + v.y * GRID);
    player.pos = from; // eliminate drift
    player.target = to;
    player.dir = d;
    player.moving = true;
    player.lastActiveTime = time();
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
      player.lastActiveTime = time();
      if (!player.moving) startMove(k);
    });
    onKeyPress(alt, () => {
      player.nextDir = k;
      player.lastActiveTime = time();
      if (!player.moving) startMove(k);
    });
  }

  // Movement update
  onUpdate(() => {
    const anyKeyDown = isKeyDown('up') || isKeyDown('down') || isKeyDown('left') || isKeyDown('right')
      || isKeyDown('w') || isKeyDown('a') || isKeyDown('s') || isKeyDown('d');

    if (player.moving) {
      player.lastActiveTime = time();
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
      if (anyKeyDown) {
        player.lastActiveTime = time();
      } else {
        if (time() - player.lastActiveTime >= 1) {
          // Switch back to front-facing sprite when idle for 1s
          player.use(sprite('char-front'));
          player.flipX = false;
        }
      }
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

    // Clamp camera inside level bounds
    const minCamX = GRID * 0.5;
    const maxCamX = LEVEL_W * GRID - GRID * 0.5;
    const minCamY = GRID * 0.5;
    const maxCamY = LEVEL_H * GRID - GRID * 0.5;
    const halfW = w / 2;
    const halfH = h / 2;

    // If viewport is larger than level dimension, center camera on that axis
    if (w >= LEVEL_W * GRID) {
      newCamX = (LEVEL_W * GRID) / 2;
    } else {
      newCamX = Math.min(Math.max(newCamX, minCamX + halfW), maxCamX - halfW);
    }
    if (h >= LEVEL_H * GRID) {
      newCamY = (LEVEL_H * GRID) / 2;
    } else {
      newCamY = Math.min(Math.max(newCamY, minCamY + halfH), maxCamY - halfH);
    }

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
