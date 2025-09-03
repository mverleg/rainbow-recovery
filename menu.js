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
  function rainbowBottomY(offset = 5) {  // Reduced from 20 to 5 to move char up
    const el = document.querySelector('.rainbow-container');
    if (!el) return 60; // fallback if rainbow missing, reduced from 80 to 60
    const rect = el.getBoundingClientRect();
    // rect.bottom is the pixel y from viewport top; Kaplay uses the same CSS pixel space
    return Math.min(height() - 10, Math.max(50, rect.bottom + offset));  // reduced min from 60 to 50
  }

  const char = add([
    sprite('char-front'),
    anchor('center'),
    pos(width() / 2, rainbowBottomY()),
    z(1),
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
  // Vertical gaps (separate) - responsive to screen height:
  const baseTopGap = spriteMax + 40;  // Reduced from 80 to 40
  const baseRowGap = spriteMax + 30;  // Reduced from 60 to 30
  // Adjust spacing for small screens - if screen height is insufficient, reduce gaps
  // Account for: title(48+16), char position, topGap, monsters with labels, rowGaps, help text(32+16)
  const titleSpace = 48 + 16; // title Y + some margin
  const charSpace = 140; // target char size
  const helpSpace = 32 + 16; // help text + margin
  const labelSpace = 24; // space for labels below sprites
  const rows = Math.ceil(monsters.length / cols);
  const minRequiredHeight = titleSpace + charSpace + baseTopGap + (rows * (spriteMax + labelSpace)) + ((rows - 1) * baseRowGap) + helpSpace;
  const availableHeight = height();
  const heightRatio = Math.min(1, availableHeight / minRequiredHeight);
  const topGap = Math.max(spriteMax + 30, baseTopGap * heightRatio);  // minimum 30px gap
  const rowGap = Math.max(spriteMax + 20, baseRowGap * heightRatio);  // minimum 20px gap
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
      area(),
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
      if (m.key === 'red') {
        window.location.href = 'red/';
      } else {
        go('level', m.key);
      }
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
      
      // Update cursor style based on hover state
      if (hovered) {
        document.body.style.cursor = 'pointer';
      } else if (!items.some(otherItem => {
        const otherHovered = typeof otherItem.isHovering === 'function' ? otherItem.isHovering() : (typeof otherItem.isHovered === 'function' ? otherItem.isHovered() : false);
        return otherHovered;
      })) {
        document.body.style.cursor = 'default';
      }
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
    if (monsters[idx].key === 'red') {
      window.location.href = 'red/';
    } else {
      go('level', monsters[idx].key);
    }
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
    // recompute layout metrics including responsive spacing
    const paddingX = spriteMax + 100;
    const startX = width() / 2 - ((cols - 1) * paddingX) / 2;
    
    // Recalculate responsive spacing for current screen size
    const baseTopGap = spriteMax + 40;  // Reduced from 80 to 40
    const baseRowGap = spriteMax + 30;  // Reduced from 60 to 30
    // Account for: title(48+16), char position, topGap, monsters with labels, rowGaps, help text(32+16)
    const titleSpace = 48 + 16; // title Y + some margin
    const charSpace = 140; // target char size
    const helpSpace = 32 + 16; // help text + margin
    const labelSpace = 24; // space for labels below sprites
    const rows = Math.ceil(monsters.length / cols);
    const minRequiredHeight = titleSpace + charSpace + baseTopGap + (rows * (spriteMax + labelSpace)) + ((rows - 1) * baseRowGap) + helpSpace;
    const availableHeight = height();
    const heightRatio = Math.min(1, availableHeight / minRequiredHeight);
    const currentTopGap = Math.max(spriteMax + 30, baseTopGap * heightRatio);
    const currentRowGap = Math.max(spriteMax + 20, baseRowGap * heightRatio);

    title.pos = vec2(width() / 2, 48);
    char.pos = vec2(width() / 2, rainbowBottomY());
    help.pos = vec2(width() / 2, height() - 32);

    const firstRowY = char.pos.y + currentTopGap;

    // Calculate positions with more aggressive boundary checking
    const bottomBound = height() - 60; // 60px margin for help text
    
    // First pass: calculate all positions
    let positions = [];
    items.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * paddingX;
      let y = firstRowY + row * currentRowGap;
      const labelY = y + spriteMax / 2 + 24;
      positions.push({ x, y, labelY });
    });
    
    // Check if any labels exceed bounds and compress if needed
    const maxLabelY = Math.max(...positions.map(p => p.labelY));
    if (maxLabelY > bottomBound) {
      const excessHeight = maxLabelY - bottomBound;
      const adjustedFirstRowY = Math.max(char.pos.y + 20, firstRowY - excessHeight); // minimum 20px gap from char
      
      // Recalculate all positions with compressed layout
      positions = [];
      items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = startX + col * paddingX;
        const compressedRowGap = Math.max(spriteMax + 10, currentRowGap * 0.8); // further compress row gaps if needed
        const y = adjustedFirstRowY + row * compressedRowGap;
        const labelY = y + spriteMax / 2 + 24;
        positions.push({ x, y, labelY });
      });
    }
    
    // Apply the calculated positions
    items.forEach((item, i) => {
      item.pos = vec2(positions[i].x, positions[i].y);
      if (item.menuLabel) {
        item.menuLabel.pos = vec2(positions[i].x, positions[i].y + spriteMax / 2 + 24);
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
