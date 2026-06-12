import { DOM } from './dom.js';
import { getTooltipText } from './tooltips.js';
import { drawSequenceShiftLines } from './shiftLines.js';
import { state, runState } from '../engine/state.js';

export function drawBumpChart(bestSequenceHistory, maxSlots, imageCache) {
  const canvas = DOM.canvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const container = canvas.parentElement;
  const displayW = container.clientWidth;
  if (bestSequenceHistory.length < 1) return;

  const numEpochs = bestSequenceHistory.length;
  const ROW_HEIGHT = 20; // 20px per epoch
  const MARGIN_TOP = 15;
  const MARGIN_BOTTOM = 15;
  const MARGIN_LEFT = 0;
  const MARGIN_RIGHT = 65;

  const requiredH = Math.max(container.clientHeight, (numEpochs - 1) * ROW_HEIGHT + MARGIN_TOP + MARGIN_BOTTOM);
  canvas.style.height = `${requiredH}px`;

  const dpr = window.devicePixelRatio || 1;
  canvas.width = displayW * dpr;
  canvas.height = requiredH * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, displayW, requiredH);

  const graphW = displayW - MARGIN_LEFT - MARGIN_RIGHT;

  const colW = graphW / maxSlots;
  const colCenters = [];
  for (let i = 0; i < maxSlots; i++) {
    colCenters.push(MARGIN_LEFT + colW * (maxSlots - 1 - i) + colW / 2);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  colCenters.forEach(cx => {
    ctx.beginPath();
    ctx.moveTo(cx, MARGIN_TOP);
    ctx.lineTo(cx, requiredH - MARGIN_BOTTOM);
    ctx.stroke();
  });

  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  for (let i = 0; i < numEpochs; i++) {
    const y = MARGIN_TOP + (numEpochs - 1 - i) * ROW_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(MARGIN_LEFT, y);
    ctx.lineTo(MARGIN_LEFT + graphW, y);
    ctx.stroke();
  }

  const allIds = new Set();
  bestSequenceHistory.forEach(h => h.seq.forEach(b => allIds.add(b.id)));

  const idColorMap = {};
  const idNameMap = {};
  Array.from(allIds).forEach((id) => {
    bestSequenceHistory.forEach(h => {
      const b = h.seq.find(b => b.id === id);
      if (b) {
        idNameMap[id] = b.icon;
        idColorMap[id] = b.color || '#fff';
      }
    });
  });

  Array.from(allIds).forEach(id => {
    ctx.beginPath();
    ctx.strokeStyle = idColorMap[id];
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    let started = false;

    bestSequenceHistory.forEach((h, epochIdx) => {
      const posIdx = h.seq.findIndex(b => b.id === id);
      const y = MARGIN_TOP + (numEpochs - 1 - epochIdx) * ROW_HEIGHT;

      if (posIdx !== -1) {
        const x = colCenters[posIdx];
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      } else {
        started = false;
      }
    });
    ctx.stroke();

    const latest = bestSequenceHistory[bestSequenceHistory.length - 1];
    const latestPos = latest.seq.findIndex(b => b.id === id);
    if (latestPos !== -1) {
      const dotX = colCenters[latestPos];
      const dotY = MARGIN_TOP + 0;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = idColorMap[id];
      ctx.fill();
    }
  });

  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  for (let i = 0; i < numEpochs; i++) {
    const h = bestSequenceHistory[i];
    const y = MARGIN_TOP + (numEpochs - 1 - i) * ROW_HEIGHT;
    const isLatest = (i === numEpochs - 1);

    ctx.fillStyle = isLatest ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.fillText(`E${h.epoch}`, MARGIN_LEFT + graphW + 5, y + 3);
    ctx.fillStyle = isLatest ? 'var(--success)' : 'rgba(255,255,255,0.4)';
    ctx.fillText(`${h.score.toFixed(0)}`, MARGIN_LEFT + graphW + 35, y + 3);
  }
}

export function drawConvergenceChart(history, epochsToRun, maxSlots, imageCache) {
  const convCanvas = DOM.convCanvas;
  if (!convCanvas) return;
  const convCtx = convCanvas.getContext('2d');
  const w = convCanvas.width;
  const h = convCanvas.height;
  convCtx.clearRect(0, 0, w, h);

  if (history.length === 0) return;

  const dpr = window.devicePixelRatio || 1;
  convCanvas.width = convCanvas.clientWidth * dpr;
  convCanvas.height = convCanvas.clientHeight * dpr;
  convCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const drawW = convCanvas.clientWidth;
  const drawH = convCanvas.clientHeight;

  let maxScore = 1;
  let minScore = Infinity;
  history.forEach(pop => pop.scores.forEach(score => {
    if (score > maxScore) maxScore = score;
    if (score < minScore) minScore = score;
  }));
  if (minScore === Infinity) minScore = 0;
  if (maxScore === minScore) maxScore = minScore + 10;
  const scoreRange = maxScore - minScore;

  // Draw Background Grid & Labels
  convCtx.fillStyle = 'rgba(255,255,255,0.9)';
  convCtx.font = 'bold 12px JetBrains Mono, monospace';
  convCtx.textAlign = 'center';
  convCtx.fillText('POPULATION FITNESS DISTRIBUTION', drawW / 2, 16);

  convCtx.textAlign = 'left';
  convCtx.fillStyle = 'rgba(255,255,255,0.5)';
  convCtx.font = '10px JetBrains Mono, monospace';
  convCtx.fillText(`Max: ${maxScore.toFixed(0)}`, 10, 30);
  convCtx.fillText(`Min: ${minScore.toFixed(0)}`, 10, drawH - 25);

  convCtx.textAlign = 'right';
  convCtx.fillText('Epochs \u2192', drawW - 10, drawH - 10);

  // Draw Axis lines
  convCtx.strokeStyle = 'rgba(255,255,255,0.2)';
  convCtx.lineWidth = 1;
  convCtx.beginPath();
  convCtx.moveTo(40, 20);
  convCtx.lineTo(40, drawH - 20);
  convCtx.lineTo(drawW - 10, drawH - 20);
  convCtx.stroke();

  const pointRadius = 2.5;

  let lastDrawnEpoch = -100;
  let lastDrawnScore = -1;
  let lastDrawnSeqString = "";

  history.forEach((pop, epochIdx) => {
    const x = 45 + (epochIdx / Math.max(1, epochsToRun - 1)) * (drawW - 60);
    let epochMaxScore = 0;

    pop.scores.forEach(score => {
      if (score > epochMaxScore) epochMaxScore = score;
      const y = drawH - 25 - ((score - minScore) / scoreRange) * (drawH - 50);
      convCtx.beginPath();
      if (score >= maxScore - 0.1) {
        convCtx.fillStyle = '#ffaa00';
        convCtx.arc(x, y, pointRadius + 1.5, 0, Math.PI * 2);
      } else {
        convCtx.fillStyle = 'rgba(0, 255, 100, 0.3)';
        convCtx.arc(x, y, pointRadius, 0, Math.PI * 2);
      }
      convCtx.fill();
    });

    const currentSeqString = pop.bestSeq.map(b => b.icon).join('');
    const isNewSequence = currentSeqString !== lastDrawnSeqString;
    const isBigJump = epochMaxScore >= lastDrawnScore * 1.15;

      if (epochIdx === 0 || (isNewSequence && isBigJump)) {
        lastDrawnEpoch = epochIdx;
        lastDrawnScore = epochMaxScore;
        lastDrawnSeqString = currentSeqString;

        convCtx.globalAlpha = 1.0;
        convCtx.fillStyle = '#ffffff';
        convCtx.font = '12px sans-serif';
        convCtx.textAlign = 'center';
        
        const emojiStartY = drawH - 25;
        
        pop.bestSeq.forEach((beast, idx) => {
          const y = emojiStartY - (((maxSlots - 1) - idx) * 14);
          if (beast.image && imageCache[beast.image] && imageCache[beast.image].complete) {
            convCtx.drawImage(imageCache[beast.image], x - 7, y - 10, 14, 14);
          } else {
            convCtx.fillText(beast.icon, x, y);
          }
        });
      }
    });

    // Build the current turn's recorded sequences
    let currentTurnRecorded = [];
    let highestRecordedScore = -1;

    history.forEach((pop, epochIdx) => {
      let epochMaxScore = Math.max(...pop.scores);
      const isFinalEpoch = (epochIdx === epochsToRun - 1);
      
      if (epochIdx === 0 || epochMaxScore >= highestRecordedScore * 1.10 || (isFinalEpoch && epochMaxScore > highestRecordedScore)) {
        if (epochMaxScore > highestRecordedScore) {
          highestRecordedScore = epochMaxScore;
        }
        currentTurnRecorded.push({
          level: state.level,
          turn: runState.combatRound,
          epoch: epochIdx,
          score: epochMaxScore,
          seq: pop.bestSeq.slice()
        });
      }
    });

    let totalRecordCount = (runState.globalSequenceHistory ? runState.globalSequenceHistory.length : 0) + currentTurnRecorded.length;
    const forceRedraw = (history.length === epochsToRun);

    if (DOM.elPreviousSequencesList && (window._lastRenderedRecordCount !== totalRecordCount || forceRedraw)) {
      window._lastRenderedRecordCount = totalRecordCount;
      DOM.elPreviousSequencesList.innerHTML = '';
      
      let allRecorded = [];
      if (runState.globalSequenceHistory) {
        allRecorded = runState.globalSequenceHistory.concat(currentTurnRecorded);
      } else {
        allRecorded = currentTurnRecorded;
      }

      if (allRecorded.length > 15) {
        allRecorded = allRecorded.slice(allRecorded.length - 15);
      }

      allRecorded.slice().reverse().forEach(record => {
        const row = document.createElement('div');
        row.className = 'previous-sequence-row';
        row.style.position = 'relative';
        row.style.zIndex = '2';
        
        let slotsHtml = '';
        record.seq.forEach(b => {
          if (b.image) {
            slotsHtml += `<div class="sequence-slot filled has-tooltip" data-beast-id="${b.id}" data-tooltip="${getTooltipText(b).replace(/"/g, '&quot;')}"><img src="${b.image}" class="beast-sprite-small" /></div>`;
          } else {
            slotsHtml += `<div class="sequence-slot filled has-tooltip" data-beast-id="${b.id}" data-tooltip="${getTooltipText(b).replace(/"/g, '&quot;')}">${b.icon}</div>`;
          }
        });

        row.innerHTML = `
          <div class="previous-sequence-info">
            <span class="epoch">L${record.level} T${record.turn} <span style="color:#666">E${record.epoch}</span></span>
            <span class="dmg">Dmg: ${record.score.toFixed(0)}</span>
          </div>
          <div class="previous-sequence-slots">
            ${slotsHtml}
          </div>
        `;
        DOM.elPreviousSequencesList.appendChild(row);
      });
      drawSequenceShiftLines('previous-sequences-list');
    }
}
