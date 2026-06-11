const fs = require('fs');
const path = require('path');

const dir = 'd:/Kon/Projects/Antigravity/ReinforcementGame/src';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace single line functions: .addEventListener('click', resetRun)
  // Needs to happen carefully so it doesn't match the others.
  content = content.replace(/([a-zA-Z0-9_\.\?\:]+)\.addEventListener\('click',\s*([a-zA-Z0-9_]+)\)/g,
    "$1.addEventListener('pointerdown', (e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault(); $2(e); })");

  // Replace simple addEventListener('click', () => ...)
  content = content.replace(/([a-zA-Z0-9_\.\?\:]+)\.addEventListener\('click',\s*(async\s*)?\(\)\s*=>\s*\{/g, 
    "$1.addEventListener('pointerdown', $2(e) => { if (e && e.button !== 0) return; if (e && e.preventDefault) e.preventDefault();");
    
  // Replace simple addEventListener('click', (e) => ...)
  content = content.replace(/([a-zA-Z0-9_\.\?\:]+)\.addEventListener\('click',\s*(async\s*)?\((e|event)\)\s*=>\s*\{/g, 
    "$1.addEventListener('pointerdown', $2($3) => { if ($3 && $3.button !== 0) return; if ($3 && $3.preventDefault) $3.preventDefault();");

  // Replace DOM.btnFight.click() programmatic calls
  content = content.replace(/DOM\.btnFight\.click\(\)/g, "DOM.btnFight.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}))");
  content = content.replace(/DOM\.btnGodOff\.click\(\)/g, "DOM.btnGodOff.dispatchEvent(new PointerEvent('pointerdown', {button: 0, bubbles: true}))");

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated ' + filePath);
  }
}

function walk(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (let file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.js')) {
      processFile(fullPath);
    }
  }
}

walk(dir);
