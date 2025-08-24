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

  // Finite level metrics (set per TODO: 70x25)
  const LEVEL_W = 70; // cells
  const LEVEL_H = 25; // cells

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
          { solidWall: true },
        ]);
      }
    }
  }

  // Dynamic obstacles: moving blocks in corridors
  const movers = [];
  function addMover(cellX, cellY, axis, amplitudeCells, speed = 1, tint = [180, 80, 80]) {
    if (isSolidCell(cellX, cellY)) return;
    const base = cellToWorld(cellX, cellY);
    const node = add([
      rect(GRID * 0.9, GRID * 0.9),
      anchor('center'),
      pos(base),
      color(tint[0], tint[1], tint[2]),
      z(2),
      area(),
      { base: base.clone(), axis, amp: amplitudeCells * GRID, speed, phase: rand(0, Math.PI * 2) },
    ]);
    movers.push(node);
  }

  // Place a few movers horizontally and vertically in safe corridors
  for (let y = 3; y < LEVEL_H - 3; y += 6) {
    for (let x = 5; x < LEVEL_W - 5; x += 16) {
      if (!isSolidCell(x, y)) addMover(x, y, 'x', 3, 0.7);
    }
  }
  for (let x = 8; x < LEVEL_W - 8; x += 14) {
    for (let y = 4; y < LEVEL_H - 4; y += 10) {
      if (!isSolidCell(x, y)) addMover(x, y, 'y', 2, 0.9, [80, 80, 180]);
    }
  }

  onUpdate(() => {
    const t = time();
    for (const m of movers) {
      const offset = Math.sin(t * m.speed + m.phase) * m.amp;
      const p = m.base.clone();
      if (m.axis === 'x') p.x += offset; else p.y += offset;
      m.pos = p;
    }
  });

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

  // Utility: find nearest empty cell to a preferred position
  function findEmptyNear(prefX, prefY, maxRadius = 10) {
    if (!isSolidCell(prefX, prefY)) return vec2(prefX, prefY);
    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = prefX + dx;
          const cy = prefY + dy;
          if (!inBounds(cx, cy)) continue;
          if (!isSolidCell(cx, cy)) return vec2(cx, cy);
        }
      }
    }
    // Fallback: center of the map
    for (let y = 1; y < LEVEL_H - 1; y++) {
      for (let x = 1; x < LEVEL_W - 1; x++) {
        if (!isSolidCell(x, y)) return vec2(x, y);
      }
    }
    return vec2(1, 1);
  }

  // Player
  // Compute a safe spawn position once
  const startCell = findEmptyNear(2, 2);
  const startPos = cellToWorld(startCell.x, startCell.y);
  const player = add([
    sprite('char-front'),
    // Spawn at a safe empty cell near the entrance (fixes top-left inside wall issue)
    pos(startPos),
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

  // Red monster near the end (bottom-right), with occasional corner patrol
  const redSpawnCell = findEmptyNear(LEVEL_W - 3, LEVEL_H - 3);
  const redMonster = add([
    sprite('red'),
    anchor('center'),
    pos(cellToWorld(redSpawnCell.x, redSpawnCell.y)),
    z(5),
    area(),
    { baseScale: 1, patrolIndex: 0, nextSwitch: time() + rand(1, 3), patrolPaused: false },
  ]);
  // Size monster once
  redMonster.onUpdate(() => {
    if (!redMonster.__sized && redMonster.width > 0 && redMonster.height > 0) {
      const base = Math.max(redMonster.width, redMonster.height);
      redMonster.baseScale = (GRID * 0.9) / base;
      redMonster.scale = vec2(redMonster.baseScale);
      redMonster.__sized = true;
    }
  });
  // Simple square patrol clockwise around its spawn corner occasionally
  const patrolDirs = ['left', 'up', 'right', 'down'];
  const patrolVecs = {
    left: vec2(-1, 0),
    right: vec2(1, 0),
    up: vec2(0, -1),
    down: vec2(0, 1),
  };
  let redTarget = redMonster.pos.clone();
  const RED_SPEED = GRID * 3.5;
  onUpdate(() => {
    // Occasionally decide to start or pause patrol
    if (time() >= redMonster.nextSwitch) {
      redMonster.patrolPaused = !redMonster.patrolPaused;
      redMonster.nextSwitch = time() + (redMonster.patrolPaused ? rand(1.2, 2.2) : rand(2.5, 4.5));
      if (!redMonster.patrolPaused) {
        // choose next segment one cell length
        for (let i = 0; i < 4; i++) {
          const dir = patrolDirs[(redMonster.patrolIndex + i) % 4];
          const v = patrolVecs[dir];
          const curCell = worldToCell(redMonster.pos);
          const ncell = vec2(curCell.x + v.x, curCell.y + v.y);
          if (!isSolidCell(ncell.x, ncell.y)) {
            redMonster.patrolIndex = (redMonster.patrolIndex + i + 1) % 4;
            redTarget = cellToWorld(ncell.x, ncell.y);
            break;
          }
        }
      }
    }
    if (!redMonster.patrolPaused) {
      const delta = redTarget.sub(redMonster.pos);
      const dist = delta.len();
      if (dist > 0.001) {
        const step = RED_SPEED * dt();
        if (step >= dist) {
          redMonster.pos = redTarget;
        } else {
          redMonster.pos = redMonster.pos.add(delta.unit().scale(step));
        }
      }
    }
  });

  // Relayout handler for window resize (rebuild grid and keep dead-zone logic consistent)
  state.currentRelayout = () => {
    // No specific layout, but rebuild grid sizes and re-apply camera snap once
    updateGrid(camPos());
  };
});
