// Red level scene definition - adapted from level.js but red-specific
import { GRID, state } from '../shared.js';
import { createRedLevel, isSolidCellLocal } from './red.js';

// Red level scene
scene('red-level', () => {
  const rainbow = document.querySelector('.rainbow-container');
  if (rainbow) rainbow.style.display = 'none';

  // Grid metrics
  const LEVEL_W = 40;
  const LEVEL_H = 30;

  function cellToWorld(cx, cy) {
    return vec2(cx * GRID + GRID / 2, cy * GRID + GRID / 2);
  }

  function worldToCell(worldPos) {
    return vec2(Math.floor(worldPos.x / GRID), Math.floor(worldPos.y / GRID));
  }

  function gridCenter(pos) {
    const cell = worldToCell(pos);
    return cellToWorld(cell.x, cell.y);
  }

  function inBounds(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < LEVEL_W && cy < LEVEL_H;
  }

  function dirToVec(dir) {
    switch (dir) {
      case 'up': return vec2(0, -1);
      case 'down': return vec2(0, 1);
      case 'left': return vec2(-1, 0);
      case 'right': return vec2(1, 0);
      default: return vec2(0, 0);
    }
  }

  function hurtPlayer() {
    // Simple respawn at start position
    const startCell = findEmptyNear(2, 2);
    const startPos = cellToWorld(startCell.x, startCell.y);
    player.pos = startPos;
  }

  function gameOver() {
    // Game over overlay
    add([
      rect(width(), height()),
      color(0, 0, 0, 0.7),
      z(200),
      fixed(),
    ]);
    
    add([
      text('Level Complete!', { size: 48 }),
      pos(width() / 2, height() / 2 - 60),
      anchor('center'),
      color(255, 255, 255),
      z(201),
      fixed(),
    ]);
    
    add([
      text('Click or press any key to return to menu', { size: 24 }),
      anchor('center'),
      pos(width() / 2, height() / 2 + 60),
      color(150, 150, 150),
      z(201),
      fixed(),
    ]);
    
    // Wait 1 second then allow any key or mouse press to return to menu
    wait(1, () => {
      onKeyPress(() => window.location.href = '../');
      onClick(() => window.location.href = '../');
    });
  }

  // Use the shared isSolidCellLocal function from red.js

  function findEmptyNear(prefX, prefY, maxRadius = 10) {
    if (!isSolidCellLocal(prefX, prefY, LEVEL_W, LEVEL_H, inBounds)) return vec2(prefX, prefY);
    for (let r = 1; r <= maxRadius; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const cx = prefX + dx;
          const cy = prefY + dy;
          if (!inBounds(cx, cy)) continue;
          if (!isSolidCellLocal(cx, cy, LEVEL_W, LEVEL_H, inBounds)) return vec2(cx, cy);
        }
      }
    }
    // Fallback: center of the map
    for (let y = 1; y < LEVEL_H - 1; y++) {
      for (let x = 1; x < LEVEL_W - 1; x++) {
        if (!isSolidCellLocal(x, y, LEVEL_W, LEVEL_H, inBounds)) return vec2(x, y);
      }
    }
    return vec2(1, 1);
  }

  // Player - create first so we can pass it to createRedLevel
  const startCell = findEmptyNear(2, 2);
  const startPos = cellToWorld(startCell.x, startCell.y);
  const player = add([
    sprite('char-front'),
    pos(startPos),
    anchor('center'),
    area(),
    z(10),
    {
      moving: false,
      target: vec2(0, 0),
      dir: 'down',
      nextDir: null,
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

  // Create the red level with player reference
  const redLevel = createRedLevel(LEVEL_W, LEVEL_H, cellToWorld, worldToCell, inBounds, findEmptyNear, hurtPlayer, player);
  const { redMonster, redBalls, isSolidCell } = redLevel;

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
    const from = gridCenter(player.pos);
    const fromCell = worldToCell(from);
    const nextCell = vec2(fromCell.x + v.x, fromCell.y + v.y);
    if (isSolidCell(nextCell.x, nextCell.y)) {
      player.dir = d;
      setSpriteForDir(d);
      return;
    }
    const to = vec2(from.x + v.x * GRID, from.y + v.y * GRID);
    player.pos = from;
    player.target = to;
    player.dir = d;
    player.moving = true;
    player.lastActiveTime = time();
    setSpriteForDir(d);
  }

  function handleQueuedOrHeld() {
    const holdOrder = ['up', 'right', 'down', 'left'];
    let d = null;
    if (player.nextDir && isKeyDown(player.nextDir)) {
      d = player.nextDir;
    } else if (player.dir && isKeyDown(player.dir)) {
      d = player.dir;
    } else {
      for (const key of holdOrder) {
        if (isKeyDown(key)) { d = key; break; }
      }
    }
    if (d) startMove(d);
  }

  // Movement handling
  onKeyPress(['up', 'down', 'left', 'right'], (key) => {
    if (player.moving) {
      player.nextDir = key;
    } else {
      startMove(key);
    }
  });

  // Player movement update
  player.onUpdate(() => {
    if (player.moving) {
      const moveSpeed = GRID * 8;
      const delta = player.target.sub(player.pos);
      if (delta.len() < 2) {
        player.pos = player.target;
        player.moving = false;
        player.nextDir = null;
        handleQueuedOrHeld();
      } else {
        const move = delta.unit().scale(moveSpeed * dt());
        player.pos = player.pos.add(move);
      }
    }
  });

  // Pass player reference to red level
  if (redLevel.setPlayer) {
    redLevel.setPlayer(player);
  }

  // Camera follows player
  player.onUpdate(() => {
    camPos(player.pos);
  });

  // Win condition: collect all red balls
  onUpdate(() => {
    const remaining = redBalls.filter(ball => !ball.collected);
    if (remaining.length === 0) {
      gameOver();
    }
  });

  // ESC to return to menu
  onKeyPress('escape', () => {
    window.location.href = '../';
  });
});