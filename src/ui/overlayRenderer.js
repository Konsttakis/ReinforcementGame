import { DOM } from './dom.js';

export function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  if (DOM.elToastContainer) {
    DOM.elToastContainer.appendChild(t);
  }
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 300);
  }, 2000);
}

export function showOverlay(title, text, type, showRestart, resetRunFn) {
  if (!DOM.elOverlayContent || !DOM.elOverlayTitle || !DOM.elOverlayText) return;
  DOM.elOverlayContent.className = `overlay-content ${type}`;
  DOM.elOverlayTitle.textContent = title;
  DOM.elOverlayText.textContent = text;
  
  if (showRestart && DOM.btnRestart) {
    DOM.btnRestart.classList.remove('hidden');
    if (resetRunFn) {
      DOM.btnRestart.onclick = resetRunFn;
    }
  } else if (DOM.btnRestart) {
    DOM.btnRestart.classList.add('hidden');
  }
  
  if (DOM.elOverlay) {
    DOM.elOverlay.classList.remove('hidden');
  }
}

export function hideOverlay() {
  if (DOM.elOverlay) {
    DOM.elOverlay.classList.add('hidden');
  }
}
