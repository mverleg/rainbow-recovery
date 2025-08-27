// Red level implementation - walls, obstacles, red monster
import { GRID, state } from '../shared.js';

export function isSolidCell(cx, cy, LEVEL_W, LEVEL_H, inBounds) {
  if (!inBounds(cx, cy)) return true; // out of bounds is solid
  const border = (cx === 0 || cy === 0 || cx === LEVEL_W - 1 || cy === LEVEL_H - 1);
  if (border) return true;
  // Add some interior pillars and bars
  // Vertical pillars every 12 columns between y=5..(H-6)
  if ((cx % 12 === 6) && cy >= 5 && cy <= LEVEL_H - 6) return true;
  // Horizontal bars every 7 rows between x=15..(W-16)
  if ((cy % 7 === 3) && cx >= 15 && cx <= LEVEL_W - 16) return true;
  return false;
}

// Export the same function as isSolidCellLocal for compatibility
export const isSolidCellLocal = isSolidCell;

export function createRedLevel(LEVEL_W, LEVEL_H, cellToWorld, worldToCell, inBounds, findEmptyNear, hurtPlayer, player) {
  
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
      
      // Check if new position would hit a wall - bounce before entering wall
      const ncell = worldToCell(newPos);
      const currentCell = worldToCell(m.pos);
      
      // Check if we're moving towards a solid cell or boundary
      const wouldHitWall = isSolidCell(ncell.x, ncell.y) || ncell.x < 1 || ncell.y < 1 || ncell.x >= LEVEL_W - 1 || ncell.y >= LEVEL_H - 1;
      
      // Also check if we're getting too close to wall boundaries (prevent halfway penetration)
      let tooCloseToWall = false;
      if (m.axis === 'x') {
        const edgeX = m.dir > 0 ? Math.ceil(newPos.x / GRID) : Math.floor(newPos.x / GRID);
        tooCloseToWall = isSolidCell(edgeX, ncell.y);
      } else {
        const edgeY = m.dir > 0 ? Math.ceil(newPos.y / GRID) : Math.floor(newPos.y / GRID);
        tooCloseToWall = isSolidCell(ncell.x, edgeY);
      }
      
      if (wouldHitWall || tooCloseToWall) {
        m.dir *= -1;
        // Don't move this frame, just reverse direction
        continue;
      }

      // Check if overlapping with player (only if player exists)
      if (player) {
        const playerDist = player.pos.sub(newPos).len();
        const overlapRange = GRID * 0.9;
        if (playerDist < overlapRange) {
          const newPlayerPos = player.pos.add(delta);
          const playerCell = worldToCell(newPlayerPos);
          
          // Check if player would be pushed into wall or boundary
          if (isSolidCell(playerCell.x, playerCell.y) || playerCell.x < 1 || playerCell.y < 1 || playerCell.x >= LEVEL_W - 1 || playerCell.y >= LEVEL_H - 1) {
            // Player would be crushed - hurt them and turn obstacle around
            if (hurtPlayer) hurtPlayer();
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
            if (hurtPlayer) hurtPlayer();
            m.dir *= -1;
            continue;
          } else {
            // Safe to push player
            player.pos = newPlayerPos;
          }
        }
      }

      // Safe to move obstacle
      m.pos = newPos;
    }
  });

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

    // Shooting: fire red balls at player if within range (only if player exists)
    if (player && time() >= redMonster.nextShot) {
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
      
      // Check collision with player (only if player exists)
      if (player) {
        const playerDist = player.pos.sub(ball.pos).len();
        if (playerDist < GRID * 0.6) {
          if (hurtPlayer) hurtPlayer();
          ball.destroy();
          redBalls.splice(i, 1);
          continue;
        }
      }
      
      // Check collision with walls
      if (isSolidCell(ballCell.x, ballCell.y)) {
        ball.destroy();
        redBalls.splice(i, 1);
      }
    }

    // Win condition: if player is close to red monster, they win (only if player exists)
    if (player) {
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
    }
  });

  // Return objects needed by level.js for cleanup
  return { 
    redMonster, 
    redBalls,
    isSolidCell: isSolidCell
  };
}