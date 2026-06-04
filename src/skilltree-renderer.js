import { SKILL_TREE_DATA, getSkillLevel, canUnlock, buySkill, respecTree, isPrereqMet } from './skilltree.js';

export function initSkillTree(metaStateRef, saveCallback, uiCallback) {
  const canvas = document.getElementById('skill-tree-canvas');
  const ctx = canvas.getContext('2d');
  const container = document.getElementById('skill-tree-container');
  
  // Modal elements
  const modal = document.getElementById('skill-purchase-modal');
  const mTitle = document.getElementById('skill-modal-title');
  const mDesc = document.getElementById('skill-modal-desc');
  const mProg = document.getElementById('skill-modal-progress');
  const btnBuy = document.getElementById('btn-buy-skill');
  const btnClose = document.getElementById('btn-close-skill-modal');
  const labDnaDisplay = document.getElementById('lab-dna-display');
  const btnRespec = document.getElementById('btn-respec');

  let metaState = metaStateRef;
  
  let camera = { x: 0, y: 0, zoom: 1 };
  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let selectedNodeId = null;

  const NODE_RADIUS = 30;
  const TIER_HEIGHT = 150;
  
  const BRANCH_OFFSETS = {
    trunk: 0,
    genome: -1800,
    warfare: -1200,
    fortune: -600,
    chaos: 0,
    inventory: 600,
    alchemy: 1200,
    resilience: 1800
  };

  // Compute absolute positions
  const nodes = SKILL_TREE_DATA.map(node => {
    const baseX = BRANCH_OFFSETS[node.branch];
    const absX = baseX + (node.localX * 120);
    const absY = - (node.tier * TIER_HEIGHT); // Up is negative Y
    return { ...node, absX, absY };
  });

  function resize() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    draw();
  }

  // Camera starts looking at genesis node
  camera.y = TIER_HEIGHT; 

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // Origin at center bottom
    ctx.translate(canvas.width / 2 + camera.x, canvas.height - 100 + camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Draw lines
    nodes.forEach(node => {
      node.prereq.forEach(reqId => {
        const reqNode = nodes.find(n => n.id === reqId);
        if (reqNode) {
          const isUnlocked = getSkillLevel(node.id, metaState) > 0;
          const isAvailable = isPrereqMet(node.id, metaState);
          
          ctx.beginPath();
          ctx.moveTo(reqNode.absX, reqNode.absY);
          // bezier curve for cool tech tree look
          ctx.bezierCurveTo(
            reqNode.absX, reqNode.absY - 50,
            node.absX, node.absY + 50,
            node.absX, node.absY
          );
          ctx.lineWidth = isUnlocked ? 6 : (isAvailable ? 3 : 2);
          ctx.strokeStyle = isUnlocked ? node.color : (isAvailable ? '#555' : '#222');
          if (isUnlocked) {
             ctx.shadowColor = node.color;
             ctx.shadowBlur = 10;
          } else {
             ctx.shadowBlur = 0;
          }
          ctx.stroke();
          ctx.shadowBlur = 0; // reset
        }
      });
    });

    // Draw nodes
    nodes.forEach(node => {
      const level = getSkillLevel(node.id, metaState);
      const available = isPrereqMet(node.id, metaState);
      const isMax = level >= node.maxLevel;

      ctx.beginPath();
      ctx.arc(node.absX, node.absY, NODE_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = level > 0 ? '#111' : '#000';
      ctx.fill();

      ctx.lineWidth = isMax ? 5 : (level > 0 ? 3 : (available ? 2 : 1));
      ctx.strokeStyle = isMax ? '#fcd34d' : (level > 0 ? node.color : (available ? '#fff' : '#333'));
      if (level > 0) {
        ctx.shadowColor = isMax ? '#fcd34d' : node.color;
        ctx.shadowBlur = 15;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw progress arc
      if (level > 0 && !isMax) {
        ctx.beginPath();
        ctx.arc(node.absX, node.absY, NODE_RADIUS - 4, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * (level / node.maxLevel)));
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 4;
        ctx.stroke();
      }

      // Draw initials or icon
      ctx.fillStyle = level > 0 ? '#fff' : (available ? '#aaa' : '#444');
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initials = node.name.substring(0, 2).toUpperCase();
      ctx.fillText(initials, node.absX, node.absY);

      // Draw Name below
      ctx.font = '12px "Space Grotesk"';
      ctx.fillText(node.name, node.absX, node.absY + NODE_RADIUS + 15);
      
      // Draw level
      ctx.fillStyle = isMax ? '#fcd34d' : '#888';
      ctx.fillText(`${level}/${node.maxLevel}`, node.absX, node.absY + NODE_RADIUS + 30);
    });

    ctx.restore();
    
    labDnaDisplay.textContent = metaState.dna;
  }

  // Events
  let isClick = false;
  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    isClick = true;
    dragStart = { x: e.clientX - camera.x, y: e.clientY - camera.y };
  });

  window.addEventListener('mouseup', () => { isDragging = false; });
  
  window.addEventListener('mousemove', e => {
    if (isDragging) {
      camera.x = e.clientX - dragStart.x;
      camera.y = e.clientY - dragStart.y;
      isClick = false;
      draw();
    }
  });

  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const zoomAmount = e.deltaY > 0 ? 0.9 : 1.1;
    camera.zoom *= zoomAmount;
    camera.zoom = Math.max(0.2, Math.min(camera.zoom, 3));
    draw();
  });

  canvas.addEventListener('click', e => {
    if (!isClick) return; // it was a drag
    
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Transform click to world coordinates
    const worldX = (clickX - (canvas.width / 2 + camera.x)) / camera.zoom;
    const worldY = (clickY - (canvas.height - 100 + camera.y)) / camera.zoom;

    const clickedNode = nodes.find(n => {
      const dx = worldX - n.absX;
      const dy = worldY - n.absY;
      return Math.sqrt(dx*dx + dy*dy) <= NODE_RADIUS;
    });

    if (clickedNode) {
      openModal(clickedNode);
    } else {
      modal.classList.add('hidden');
    }
  });

  function openModal(node) {
    selectedNodeId = node.id;
    const level = getSkillLevel(node.id, metaState);
    const maxed = level >= node.maxLevel;
    
    mTitle.textContent = node.name;
    mTitle.style.color = node.color;
    mDesc.textContent = node.desc(level > 0 && !maxed ? level + 1 : (maxed ? level : 1));
    mProg.textContent = `Level ${level}/${node.maxLevel}`;
    
    if (maxed) {
      btnBuy.disabled = true;
      btnBuy.textContent = 'MAXED';
    } else {
      const cost = node.costs[level];
      const hasPrereq = isPrereqMet(node.id, metaState);
      btnBuy.disabled = metaState.dna < cost || (!hasPrereq && level === 0);
      btnBuy.textContent = (!hasPrereq && level === 0) ? 'Locked (Requires Prerequisite)' : `Buy (Cost: ${cost} DNA)`;
    }
    
    modal.classList.remove('hidden');
  }

  btnBuy.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedNodeId) {
      if (buySkill(selectedNodeId, metaState, saveCallback)) {
        uiCallback();
        draw();
        openModal(nodes.find(n => n.id === selectedNodeId)); // refresh modal
      }
    }
  });

  btnClose.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    modal.classList.add('hidden');
  });

  btnRespec.addEventListener('click', () => {
    if (confirm('Are you sure you want to refund all your DNA? This is free!')) {
      respecTree(metaState, saveCallback);
      uiCallback();
      modal.classList.add('hidden');
      draw();
    }
  });

  window.addEventListener('resize', resize);
  
  // Public method to refresh
  return {
    refresh: (newMetaState) => {
      metaState = newMetaState;
      resize();
    }
  };
}
