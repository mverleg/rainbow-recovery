import { monsters, buildGrid, updateGrid, state } from './shared.js';

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
  function rainbowBottomY(offset = 48) {
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
  // Defer decorative character sizing until the sprite dimensions are ready
  const charTarget = 140; // target max dimension (in pixels)
  char.onUpdate(() => {
    if (!char.__sized && char.width > 0 && char.height > 0) {
      const base = Math.max(char.width, char.height);
      const s = base > 0 ? (charTarget / base) : 1;
      char.scale = vec2(s);
      char.__sized = true;
    }
  });

  const cols = 3;
  // Target maximum sprite size for uniform appearance (in pixels)
  const spriteMax = 150;
  // Horizontal spacing between columns
  const paddingX = spriteMax + 100;
  // Vertical gaps (separate):
  const topGap = spriteMax + 220;  // gap between char and first monster row (increased)
  const rowGap = spriteMax + 120;  // gap between monster rows (decreased vs previous)
  const startX = width() / 2 - ((cols - 1) * paddingX) / 2;
  // First row Y will be computed from char position below

  const items = []; const labels = [];

  const firstRowY = char.pos.y + topGap;
  monsters.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * paddingX;
    const y = firstRowY + row * rowGap;

    const item = add([
      sprite(m.key),
      anchor('center'),
      pos(x, y),
      scale(1),
      area({ cursor: 'pointer' }),
      { monsterKey: m.key, monsterLabel: m.label, baseScale: 1 },
    ]);

    // Defer sizing until sprite dimensions are available to avoid partial texture uploads
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

    // Ensure base sizing happens once when sprite dimensions are known
    item.onUpdate(() => {
      if (!item.__sized && item.width > 0 && item.height > 0) {
        const w = item.width;
        const h = item.height;
        const sRaw = Math.min(spriteMax / w, spriteMax / h);
        const s = (m.key === 'red' || m.key === 'blue') ? (sRaw * 1.3) : sRaw;
        item.baseScale = s;
        item.scale = vec2(s);
        item.__sized = true;
      }
      // Hover visual: slight scale-up and full opacity when hovered
      const hovered = typeof item.isHovering === 'function' ? item.isHovering() : (typeof item.isHovered === 'function' ? item.isHovered() : false);
      const isSelected = (i === selected);
      let mult = isSelected ? 1.2 : 1;
      if (hovered) mult = Math.max(mult, 1.1);
      item.scale = vec2((item.baseScale || 1) * mult);
      item.opacity = (isSelected || hovered) ? 1 : 0.9;
    });

    items.push(item);
  });

  let selected = -1;

  function updateSelection() {
    // Selection visuals handled per-item in onUpdate combining selection and hover states.
    // This function remains to keep keyboard navigation logic intact.
  }

  function clampIndex(i) {
    const n = items.length;
    return (i + n) % n;
  }

  function moveHorizontal(dir) {
    selected = clampIndex(selected + dir);
    updateSelection();
  }

  function moveVertical(dir) {
    const n = items.length;
    const cols = 3;
    const rows = Math.ceil(n / cols);
    const curCol = selected % cols;
    const curRow = Math.floor(selected / cols);
    let newRow = curRow + dir;
    if (newRow < 0) newRow = rows - 1;
    if (newRow >= rows) newRow = 0;
    let newIndex = newRow * cols + curCol;
    // If last row is shorter, clamp to last item
    if (newIndex >= n) newIndex = n - 1;
    selected = newIndex;
    updateSelection();
  }

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
    const startX = width() / 2 - ((cols - 1) * paddingX) / 2;

    title.pos = vec2(width() / 2, 48);
    char.pos = vec2(width() / 2, rainbowBottomY());
    help.pos = vec2(width() / 2, height() - 32);

    const firstRowY = char.pos.y + topGap;

    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * paddingX;
      const y = firstRowY + row * rowGap;
      item.pos = vec2(x, y);
      if (item.menuLabel) {
        item.menuLabel.pos = vec2(x, y + spriteMax / 2 + 24);
      }
    });
  }

  // Register relayout for this scene
  state.currentRelayout = relayoutMenu;

  // Keep grid updated on menu as well
  onUpdate(() => {
    try { updateGrid(camPos()); } catch (e) { /* ignore before scene ready */ }
  });

  // Do an initial relayout in case of early size changes
  relayoutMenu();
});
