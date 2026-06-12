import { DOM } from './dom.js';

const COLOR_POOL = [
  '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#14b8a6', 
  '#6366f1', '#d946ef', '#f43f5e', '#22d3ee', '#a855f7'
];
let activeColors = new Map();

export function drawSequenceShiftLines(containerId = 'previous-sequences-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Clear existing SVG
  let svg = container.querySelector('.shift-lines-svg');
  if (svg) {
    svg.remove();
  }

  const rows = Array.from(container.querySelectorAll('.previous-sequence-row'));
  if (rows.length < 2) return;

  // Create new SVG
  svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'shift-lines-svg');
  svg.style.position = 'absolute';
  svg.style.top = '0';
  svg.style.left = '0';
  svg.style.width = '100%';
  svg.style.height = Math.max(container.scrollHeight, container.clientHeight) + 'px';
  svg.style.pointerEvents = 'none';
  svg.style.zIndex = '10';
  
  // ensure container is relative
  container.style.position = 'relative';
  container.insertBefore(svg, container.firstChild);

  const containerRect = container.getBoundingClientRect();

  // Update color pool based on currently visible beasts
  const currentActiveIds = new Set();
  container.querySelectorAll('.sequence-slot[data-beast-id]').forEach(slot => {
    currentActiveIds.add(slot.getAttribute('data-beast-id'));
  });

  // Free colors of beasts that are no longer in the list
  for (const id of activeColors.keys()) {
    if (!currentActiveIds.has(id)) {
      activeColors.delete(id);
    }
  }

  // Assign colors to new beasts
  const usedColors = new Set(activeColors.values());
  for (const id of currentActiveIds) {
    if (!activeColors.has(id)) {
      const availableColors = COLOR_POOL.filter(c => !usedColors.has(c));
      const chosenColor = availableColors.length > 0 
        ? availableColors[0] 
        : COLOR_POOL[Math.floor(Math.random() * COLOR_POOL.length)];
      activeColors.set(id, chosenColor);
      usedColors.add(chosenColor);
    }
  }

  // Draw lines between consecutive rows
  for (let i = 0; i < rows.length - 1; i++) {
    const rowNewer = rows[i];
    const rowOlder = rows[i + 1];

    const slotsNewer = Array.from(rowNewer.querySelectorAll('.sequence-slot'));
    const slotsOlder = Array.from(rowOlder.querySelectorAll('.sequence-slot'));

    slotsOlder.forEach((slotOld, oldIndex) => {
      const beastId = slotOld.getAttribute('data-beast-id');
      if (!beastId) return;

      const newIndex = slotsNewer.findIndex(s => s.getAttribute('data-beast-id') === beastId);
      if (newIndex !== -1) {
        const slotNew = slotsNewer[newIndex];
        
        const rectOld = slotOld.getBoundingClientRect();
        const rectNew = slotNew.getBoundingClientRect();

        const startX = rectOld.left + rectOld.width / 2 - containerRect.left + container.scrollLeft;
        const startY = rectOld.top + rectOld.height / 2 - containerRect.top + container.scrollTop;
        
        const endX = rectNew.left + rectNew.width / 2 - containerRect.left + container.scrollLeft;
        const endY = rectNew.top + rectNew.height / 2 - containerRect.top + container.scrollTop;

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const controlYOffset = Math.abs(endY - startY) * 0.5;
        const d = `M ${startX} ${startY} C ${startX} ${startY - controlYOffset}, ${endX} ${endY + controlYOffset}, ${endX} ${endY}`;
        
        path.setAttribute('d', d);
        path.setAttribute('class', 'shift-line');
        path.style.stroke = activeColors.get(beastId);
        path.style.strokeWidth = '3px';
        path.style.opacity = '0.75';

        svg.appendChild(path);
      }
    });
  }
}
