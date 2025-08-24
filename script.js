// Initialize Kaboom. Using global: true exposes helpers like add(), sprite(), pos(), etc.
const k = kaboom({
  canvas: document.querySelector('#game'),
  width: window.innerWidth,
  height: window.innerHeight,
  background: [ 230, 230, 230 ], // light gray background
  letterbox: true,
  global: true,
  // Set pixelDensity to 1 to keep a 1:1 mapping of CSS pixels to canvas pixels (optional)
  pixelDensity: 1,
});

// A global relayout callback that current scene can register
let currentRelayout = null;

// Grid overlay: draw a light grid across the canvas and keep it updated on resize
let gridV = [];
let gridH = [];

function clearGrid() {
  for (const line of gridV) destroy(line.node);
  for (const line of gridH) destroy(line.node);
  gridV = [];
  gridH = [];
}

// Use a 50% larger grid spacing everywhere (menu and levels)
const GRID = 96;

function buildGrid(spacing = GRID, lineW = 1, alpha = 0.6) {
  clearGrid();
  const w = width();
  const h = height();

  // Build slightly beyond screen to cover offsets
  const cols = Math.ceil(w / spacing) + 3;
  const rows = Math.ceil(h / spacing) + 3;

  // Vertical lines (slightly bluish gray)
  for (let i = -1; i < cols - 1; i++) {
    const v = add([
      rect(lineW, h + spacing * 2),
      anchor('topleft'),
      pos(0, -spacing),
      color(170, 180, 200),
      opacity(alpha),
      z(-1000),
    ]);
    gridV.push({ node: v, idx: i });
  }

  // Horizontal lines (slightly reddish gray)
  for (let j = -1; j < rows - 1; j++) {
    const hLine = add([
      rect(w + spacing * 2, lineW),
      anchor('topleft'),
      pos(-spacing, 0),
      color(200, 180, 180),
      opacity(alpha),
      z(-1000),
    ]);
    gridH.push({ node: hLine, idx: j });
  }

  // Initial position with zero camera offset
  updateGrid({ x: 0, y: 0 }, spacing);
}

function updateGrid(cam = { x: 0, y: 0 }, spacing = GRID) {
  const w = width();
  const h = height();
  const offX = ((-cam.x % spacing) + spacing) % spacing;
  const offY = ((-cam.y % spacing) + spacing) % spacing;

  for (const { node, idx } of gridV) {
    node.width = 1; // ensure thin line
    node.height = h + spacing * 2;
    node.pos = vec2(idx * spacing + offX, -spacing);
  }
  for (const { node, idx } of gridH) {
    node.width = w + spacing * 2;
    node.height = 1;
    node.pos = vec2(-spacing, idx * spacing + offY);
  }
}

// Keep canvas sized to the window on resize and rebuild the grid
window.addEventListener('resize', () => {
  // Use global resize helper from Kaboom (k.resize may not exist)
  if (typeof resize === 'function') {
    resize(window.innerWidth, window.innerHeight);
  } else if (k && k.canvas) {
    // Fallback: manually resize the canvas element
    k.canvas.width = window.innerWidth;
    k.canvas.height = window.innerHeight;
  }
  // Rebuild grid in whatever current scene is active
  buildGrid();
  // Ask current scene (if any) to recompute layout/positions
  if (typeof currentRelayout === 'function') {
    currentRelayout();
  }
  // Align grid with current camera
  try { updateGrid(camPos()); } catch (e) { /* ignore if scene not ready */ }
});

// Load all monster sprites from img/
const monsters = [
  { key: 'red',    path: 'img/red-monster.png',    label: 'Red' },
  { key: 'orange', path: 'img/orange-monster.png', label: 'Orange' },
  { key: 'yellow', path: 'img/yellow-monster.png', label: 'Yellow' },
  { key: 'green',  path: 'img/green-monster.png',  label: 'Green' },
  { key: 'blue',   path: 'img/blue-monster.png',   label: 'Blue' },
  { key: 'purple', path: 'img/purple-monster.png', label: 'Purple' },
];

for (const m of monsters) {
  loadSprite(m.key, m.path);
}
// Load player character sprites
loadSprite('char-front', 'img/char-front.png');
loadSprite('char-back', 'img/char-back.png');
loadSprite('char-right', 'img/char-right.png');

// Menu scene: shows all monsters; click or use arrows+Enter to select
scene('menu', () => {
  const rainbow = document.querySelector('.rainbow-container');
  if (rainbow) rainbow.style.display = 'block';
  buildGrid();

  // Title
  const title = add([
    text('Choose a Monster', { size: 32 }),
    pos(width() / 2, 48),
    anchor('center'),
    color(0, 0, 0),
    z(10),
  ]);

  // Decorative player character (non-interactive) positioned under the rainbow
  function rainbowBottomY(offset = 24) {
    const el = document.querySelector('.rainbow-container');
    if (!el) return 110; // fallback if rainbow missing
    const rect = el.getBoundingClientRect();
    // rect.bottom is the pixel y from viewport top; Kaboom uses the same CSS pixel space
    return Math.min(height() - 10, Math.max(80, rect.bottom + offset));
  }

  const char = add([
    sprite('char-front'),
    anchor('center'),
    pos(width() / 2, rainbowBottomY()),
    z(5),
    opacity(0.95),
  ]);
  // Fit the character into a target max dimension (in pixels)
  const charTarget = 140; // make the player character larger on main page
  const charBase = Math.max(char.width, char.height);
  const charScale = charBase > 0 ? (charTarget / charBase) : 1;
  char.scale = vec2(charScale);

  const cols = 3;
  // Target maximum sprite size for uniform appearance (in pixels)
  const spriteMax = 150;
  // Cell padding should be large enough to accommodate enlarged selection (1.2x)
  const paddingX = spriteMax + 100;
  const paddingY = spriteMax + 100;
  const startX = width() / 2 - ((cols - 1) * paddingX) / 2;
  const startY = height() / 2 - paddingY / 2;

  const items = []; const labels = [];

  monsters.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * paddingX;
    const y = startY + row * paddingY;

    const item = add([
      sprite(m.key),
      anchor('center'),
      pos(x, y),
      scale(1),
      area({ cursor: 'pointer' }),
      { monsterKey: m.key, monsterLabel: m.label, baseScale: 1 },
    ]);

    // Compute a uniform base scale so the sprite fits within spriteMax box
    const w = item.width;
    const h = item.height;
    const sRaw = Math.min(spriteMax / Math.max(1, w), spriteMax / Math.max(1, h));
    // Slightly increase red monster size for better prominence
    const s = m.key === 'red' ? sRaw * 1.1 : sRaw;
    item.baseScale = s;
    item.scale = vec2(s);

    // Label under sprite, positioned based on spriteMax to keep spacing consistent
    const label = add([
      text(m.label, { size: 18 }),
      anchor('top'),
      pos(x, y + spriteMax / 2 + 24),
      color(20, 20, 20),
    ]);
    labels.push(label);
    item.menuLabel = label;

    item.onClick(() => {
      go('level', m.key);
    });

    // Hover visual: slight scale-up and full opacity when hovered
    item.onUpdate(() => {
      const hovered = typeof item.isHovering === 'function' ? item.isHovering() : (typeof item.isHovered === 'function' ? item.isHovered() : false);
      const isSelected = (i === selected);
      let mult = isSelected ? 1.2 : 1;
      if (hovered) mult = Math.max(mult, 1.1);
      item.scale = vec2(item.baseScale * mult);
      item.opacity = (isSelected || hovered) ? 1 : 0.9;
    });

    items.push(item);
  });

  let selected = -1;

  onKeyPress('left', () => moveHorizontal(-1));
  onKeyPress('right', () => moveHorizontal(1));
  onKeyPress('up', () => moveVertical(-1));
  onKeyPress('down', () => moveVertical(1));
  onKeyPress(['enter', 'space'], () => {
    let idx = selected;
    // If nothing selected, try hovered item
    if (idx < 0) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const hovered = typeof it.isHovering === 'function' ? it.isHovering() : (typeof it.isHovered === 'function' ? it.isHovered() : false);
        if (hovered) { idx = i; break; }
      }
    }
    // Fallback to first item
    if (idx < 0) idx = 0;
    go('level', monsters[idx].key);
  });

  // Also allow clicking anywhere near the selected item with Enter hint
  updateSelection();

  // Help text
  const help = add([
    text('Use Arrow Keys + Enter, or Click a Monster', { size: 18 }),
    pos(width() / 2, height() - 32),
    anchor('center'),
    color(40, 40, 40),
  ]);

  function relayoutMenu() {
    // recompute layout metrics
    const paddingX = spriteMax + 100;
    const paddingY = spriteMax + 100;
    const startX = width() / 2 - ((cols - 1) * paddingX) / 2;
    const startY = height() / 2 - paddingY / 2;

    title.pos = vec2(width() / 2, 48);
    char.pos = vec2(width() / 2, rainbowBottomY());
    help.pos = vec2(width() / 2, height() - 32);

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * paddingX;
      const y = startY + row * paddingY;
      item.pos = vec2(x, y);
      if (item.menuLabel) {
        item.menuLabel.pos = vec2(x, y + spriteMax / 2 + 24);
      }
    });
  }

  // Register relayout for this scene
  currentRelayout = relayoutMenu;

  // Do an initial relayout in case of early size changes
  relayoutMenu();
});

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
    currentRelayout = () => {};
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
  currentRelayout = () => {
    // After resize, ensure grid rebuild aligns with camera
    updateGrid(camPos());
  };
});

// Start the game once assets are loaded
onLoad(() => {
  go('menu');
});

// Initial grid build (for first scene before any resize events)
buildGrid();

console.log('Kaboom menu initialized');
