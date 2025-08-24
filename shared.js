// Shared utilities and state for the game
// Note: Kaboom is loaded globally via CDN. Helpers like add(), sprite(), pos(), etc. are global.

// A mutable state object that scenes can update (e.g., to set relayout callback)
export const state = {
  currentRelayout: null,
};

// Use a 50% larger grid spacing everywhere (menu and levels)
export const GRID = 96;

let gridV = [];
let gridH = [];

export function clearGrid() {
  for (const line of gridV) destroy(line.node);
  for (const line of gridH) destroy(line.node);
  gridV = [];
  gridH = [];
}

export function buildGrid(spacing = GRID, lineW = 1, alpha = 0.6) {
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

export function updateGrid(cam = { x: 0, y: 0 }, spacing = GRID) {
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

// List of monsters with sprites and labels (used by menu and main sprite loading)
export const monsters = [
  { key: 'red',    path: 'img/red-monster.png',    label: 'Red' },
  { key: 'orange', path: 'img/orange-monster.png', label: 'Orange' },
  { key: 'yellow', path: 'img/yellow-monster.png', label: 'Yellow' },
  { key: 'green',  path: 'img/green-monster.png',  label: 'Green' },
  { key: 'blue',   path: 'img/blue-monster.png',   label: 'Blue' },
  { key: 'purple', path: 'img/purple-monster.png', label: 'Purple' },
];
