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

  // Dynamic obstacles: moving blocks that bounce between walls and push the player
  const movers = [];
  function addMover(cellX, cellY, axis, initialDir = 1, speedCellsPerSec = 2, tint = [180, 80, 80]) {
    if (isSolidCell(cellX, cellY)) return;
    const posWorld = cellToWorld(cellX, cellY);
    const node = add([
      rect(GRID * 0.9, GRID * 0.9),
      anchor('center'),
      pos(posWorld),
      color(tint[0], tint[1], tint[2]),
      z(2),
      area(),
      { axis, dir: initialDir, speed: speedCellsPerSec * GRID },
    ]);
    movers.push(node);
  }

  // Place a few movers horizontally and vertically in safe corridors
  for (let y = 3; y < LEVEL_H - 3; y += 6) {
    for (let x = 5; x < LEVEL_W - 5; x += 16) {
      if (!isSolidCell(x, y)) addMover(x, y, 'x', 1, 2.2);
    }
  }
  for (let x = 8; x < LEVEL_W - 8; x += 14) {
    for (let y = 4; y < LEVEL_H - 4; y += 10) {
      if (!isSolidCell(x, y)) addMover(x, y, 'y', 1, 2.8, [80, 80, 180]);
    }
  }

  onUpdate(() => {
    // First pass: check for obstacle-to-obstacle collisions
    for (let i = 0; i < movers.length; i++) {
      for (let j = i + 1; j < movers.length; j++) {
        const m1 = movers[i];
        const m2 = movers[j];
        const dist = m1.pos.sub(m2.pos).len();
        const collisionRange = GRID * 0.9; // Both obstacles are roughly this size
        if (dist < collisionRange) {
          // They're colliding, reverse both directions
          m1.dir *= -1;
          m2.dir *= -1;
        }
      }
    }

    // Second pass: update positions with wall and player collision checks
    for (const m of movers) {
      const delta = vec2(0, 0);
      if (m.axis === 'x') delta.x = m.dir * m.speed * dt(); else delta.y = m.dir * m.speed * dt();
      let newPos = m.pos.add(delta);
      
      // Check if new position would hit a wall - bounce at grid boundary
      const ncell = worldToCell(newPos);
      if (isSolidCell(ncell.x, ncell.y) || ncell.x < 1 || ncell.y < 1 || ncell.x >= LEVEL_W - 1 || ncell.y >= LEVEL_H - 1) {
        m.dir *= -1;
        // Don't move this frame, just reverse direction
        continue;
      }

      // Check if overlapping with player
      const playerDist = player.pos.sub(newPos).len();
      const overlapRange = GRID * 0.9;
      if (playerDist < overlapRange) {
        const newPlayerPos = player.pos.add(delta);
        const playerCell = worldToCell(newPlayerPos);
        
        // Check if player would be pushed into wall or boundary
        if (isSolidCell(playerCell.x, playerCell.y) || playerCell.x < 1 || playerCell.y < 1 || playerCell.x >= LEVEL_W - 1 || playerCell.y >= LEVEL_H - 1) {
          // Player would be crushed - hurt them and turn obstacle around
          hurtPlayer();
          m.dir *= -1;
          continue;
        }
        
        // Check if player would be pushed into another obstacle
        let crushedByAnotherObstacle = false;
        for (const other of movers) {
          if (other === m) continue;
          const distToOther = newPlayerPos.sub(other.pos).len();
          if (distToOther < GRID * 0.9) {
            crushedByAnotherObstacle = true;
            break;
          }
        }
        
        if (crushedByAnotherObstacle) {
          // Player would be crushed between obstacles
          hurtPlayer();
          m.dir *= -1;
          continue;
        } else {
          // Safe to push player
          player.pos = newPlayerPos;
        }
      }

      // Safe to move obstacle
      m.pos = newPos;
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

  // Player lives system
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
        text('♥', { size: 24 }),
        pos(20 + i * 30, 20),
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
    
    // Wait 1 second then allow any key to return to menu
    wait(1, () => {
      onKeyPress(() => go('menu'));
    });
  }

  // Red monster at bottom-right corner, patrols within 15 cells, shoots red balls when player in range
  const redSpawnCell = findEmptyNear(LEVEL_W - 3, LEVEL_H - 3);
  const redMonster = add([
    sprite('red'),
    anchor('center'),
    pos(cellToWorld(redSpawnCell.x, redSpawnCell.y)),
    z(5),
    area(),
    { baseScale: 1, home: cellToWorld(redSpawnCell.x, redSpawnCell.y), nextMovement: time() + rand(2, 4), nextShot: time() + rand(0.5, 1) },
  ]);
  // Size monster once - should be 3x3 cells as per requirements
  redMonster.onUpdate(() => {
    if (!redMonster.__sized && redMonster.width > 0 && redMonster.height > 0) {
      const base = Math.max(redMonster.width, redMonster.height);
      redMonster.baseScale = (GRID * 3) / base; // 3x3 cells
      redMonster.scale = vec2(redMonster.baseScale);
      redMonster.__sized = true;
    }
  });

  // List to track active red balls
  const redBalls = [];

  const RED_SPEED = GRID * 2.5;
  const SHOOT_RANGE = 20; // cells
  const PATROL_RADIUS = 15; // cells

  onUpdate(() => {
    // Movement: occasionally move several steps in a random direction, constrained to 15 cells from home
    if (time() >= redMonster.nextMovement) {
      redMonster.nextMovement = time() + rand(2.5, 4.5); // next movement in 2.5-4.5 seconds
      // Try to move 2-4 steps in a random cardinal direction, constrained by patrol radius
      const steps = Math.floor(rand(2, 5));
      const dirs = ['left', 'right', 'up', 'down'];
      const dir = dirs[Math.floor(rand(0, 4))];
      let dx = 0, dy = 0;
      switch (dir) {
        case 'left': dx = -steps; break;
        case 'right': dx = steps; break;
        case 'up': dy = -steps; break;
        case 'down': dy = steps; break;
      }
      const currentCell = worldToCell(redMonster.pos);
      const homeCell = worldToCell(redMonster.home);
      const targetCell = vec2(currentCell.x + dx, currentCell.y + dy);
      // Check if target is within patrol radius and not solid
      const distFromHome = vec2(targetCell.x - homeCell.x, targetCell.y - homeCell.y).len();
      if (distFromHome <= PATROL_RADIUS && !isSolidCell(targetCell.x, targetCell.y)) {
        // Move to target cell instantly (discrete grid movement, not smooth)
        const targetWorld = cellToWorld(targetCell.x, targetCell.y);
        redMonster.pos = targetWorld;
      }
    }

    // Shooting: fire red balls at player if within range
    if (time() >= redMonster.nextShot) {
      redMonster.nextShot = time() + rand(1.5, 2.5); // next shot attempt in 1.5-2.5 seconds
      const playerCell = worldToCell(player.pos);
      const monsterCell = worldToCell(redMonster.pos);
      const dist = vec2(playerCell.x - monsterCell.x, playerCell.y - monsterCell.y).len();
      if (dist <= SHOOT_RANGE) {
        // Choose direction closest to player (axis-aligned only)
        const dx = playerCell.x - monsterCell.x;
        const dy = playerCell.y - monsterCell.y;
        let shootDir = 'right'; // default
        if (Math.abs(dx) > Math.abs(dy)) {
          shootDir = dx > 0 ? 'right' : 'left';
        } else {
          shootDir = dy > 0 ? 'down' : 'up';
        }
        // Create red ball projectile
        const ballVel = vec2(0, 0);
        switch (shootDir) {
          case 'left': ballVel.x = -GRID * 8; break;
          case 'right': ballVel.x = GRID * 8; break;
          case 'up': ballVel.y = -GRID * 8; break;
          case 'down': ballVel.y = GRID * 8; break;
        }
        const ball = add([
          circle(GRID * 0.15),
          anchor('center'),
          pos(redMonster.pos),
          color(220, 50, 50),
          z(3),
          area(),
          { velocity: ballVel },
        ]);
        redBalls.push(ball);
      }
    }

      // Update red balls: move them and destroy on wall collision or player hit
    for (let i = redBalls.length - 1; i >= 0; i--) {
      const ball = redBalls[i];
      if (!ball.exists()) {
        redBalls.splice(i, 1);
        continue;
      }
      ball.pos = ball.pos.add(ball.velocity.scale(dt()));
      const ballCell = worldToCell(ball.pos);
      
      // Check collision with player
      const playerDist = player.pos.sub(ball.pos).len();
      if (playerDist < GRID * 0.6) {
        hurtPlayer();
        ball.destroy();
        redBalls.splice(i, 1);
        continue;
      }
      
      // Check collision with walls
      if (isSolidCell(ballCell.x, ballCell.y)) {
        ball.destroy();
        redBalls.splice(i, 1);
      }
    }

    // Win condition: if player is close to red monster, they win
    const playerToMonster = player.pos.sub(redMonster.pos).len();
    if (playerToMonster < GRID * 1.5) {
      add([
        text('You reached the Red Monster!', { size: 32 }),
        anchor('center'),
        pos(width() / 2, height() / 2 - 40),
        color(220, 50, 50),
        z(100),
      ]);
      add([
        text('Press Esc to return to menu', { size: 18 }),
        anchor('center'),
        pos(width() / 2, height() / 2 + 20),
        color(40, 40, 40),
        z(100),
      ]);
      // Disable further updates by removing the monster and balls
      redMonster.destroy();
      for (const ball of redBalls) ball.destroy();
      redBalls.length = 0;
    }
  });

  // Relayout handler for window resize (rebuild grid and keep dead-zone logic consistent)
  state.currentRelayout = () => {
    // No specific layout, but rebuild grid sizes and re-apply camera snap once
    updateGrid(camPos());
  };
});
