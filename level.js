import { GRID, buildGrid, updateGrid, state } from './shared.js';
import { createRedLevel } from './red.js';

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

  function cellToWorld(cx, cy) {
    return vec2((cx + 0.5) * GRID, (cy + 0.5) * GRID);
  }
  function worldToCell(p) {
    return vec2(Math.floor(p.x / GRID), Math.floor(p.y / GRID));
  }
  function inBounds(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < LEVEL_W && cy < LEVEL_H;
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




  const SPEED = GRID * 6; // pixels per second




  // Player lives system - reset everything on level re-entry
  let playerLives = 3;
  let invulnerable = false;
  let invulnerabilityEnd = 0;
  let gameOver = false;

  // Hearts display
  const hearts = [];
  function updateHeartsDisplay() {
    // Remove existing hearts
    hearts.forEach(heart => heart.destroy());
    hearts.length = 0;
    
    // Add hearts for current lives
    for (let i = 0; i < playerLives; i++) {
      const heart = add([
        text('♥', { size: 72 }),
        pos(20 + i * 80, 20),
        color(220, 50, 50),
        z(100),
        fixed(),
      ]);
      hearts.push(heart);
    }
  }
  updateHeartsDisplay();

  function hurtPlayer() {
    if (invulnerable || gameOver) return;
    
    playerLives--;
    updateHeartsDisplay();
    
    if (playerLives <= 0) {
      gameOver = true;
      showGameOverScreen();
      return;
    }
    
    // Start invulnerability and blinking
    invulnerable = true;
    invulnerabilityEnd = time() + 1.0; // 1 second invulnerability
    
    // Blinking effect
    const originalOpacity = player.opacity || 1;
    let blinkState = false;
    const blinkInterval = 0.1;
    let nextBlink = time() + blinkInterval;
    
    const blinkUpdate = () => {
      if (time() >= invulnerabilityEnd) {
        invulnerable = false;
        player.opacity = originalOpacity;
        return;
      }
      
      if (time() >= nextBlink) {
        blinkState = !blinkState;
        player.opacity = blinkState ? 0.3 : originalOpacity;
        nextBlink = time() + blinkInterval;
      }
    };
    
    player.onUpdate(blinkUpdate);
  }

  function showGameOverScreen() {
    // Clear existing game elements
    redMonster.destroy();
    for (const ball of redBalls) ball.destroy();
    redBalls.length = 0;
    
    add([
      rect(width(), height()),
      pos(0, 0),
      color(0, 0, 0, 0.8),
      z(200),
      fixed(),
    ]);
    
    add([
      text('Game Over', { size: 48 }),
      anchor('center'),
      pos(width() / 2, height() / 2 - 80),
      color(220, 50, 50),
      z(201),
      fixed(),
    ]);
    
    add([
      text('Thanks for playing Rainbow Recovery!', { size: 24 }),
      anchor('center'),
      pos(width() / 2, height() / 2 - 20),
      color(255, 255, 255),
      z(201),
      fixed(),
    ]);
    
    add([
      text('Dedicated to Leo and Benni', { size: 18 }),
      anchor('center'),
      pos(width() / 2, height() / 2 + 20),
      color(200, 200, 200),
      z(201),
      fixed(),
    ]);
    
    add([
      text('Press any key to return to menu', { size: 16 }),
      anchor('center'),
      pos(width() / 2, height() / 2 + 60),
      color(150, 150, 150),
      z(201),
      fixed(),
    ]);
    
    // Wait 1 second then allow any key or mouse press to return to menu
    wait(1, () => {
      onKeyPress(() => go('menu'));
      onClick(() => go('menu'));
    });
  }

  // First create a temporary red level to get isSolidCell
  const tempRedLevel = createRedLevel(LEVEL_W, LEVEL_H, cellToWorld, worldToCell, inBounds, null, null, null);
  const { isSolidCell } = tempRedLevel;

  // Now define findEmptyNear using the correct isSolidCell
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

  // Create the actual red level with findEmptyNear properly passed
  const redLevel = createRedLevel(LEVEL_W, LEVEL_H, cellToWorld, worldToCell, inBounds, findEmptyNear, null, null);
  const { redMonster, redBalls } = redLevel;

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

  // Functions that depend on player being declared
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
