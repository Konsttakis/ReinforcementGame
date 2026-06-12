const fs = require('fs');
const synergiesStr = fs.readFileSync('src/engine/registries/synergies.js', 'utf8');
const tooltipsStr = fs.readFileSync('src/ui/tooltips.js', 'utf8');

const regex = /([A-Z_]+):\s*\(/g;
let match;
let missing = [];
while ((match = regex.exec(synergiesStr)) !== null) {
  const syn = match[1];
  if (!tooltipsStr.includes("'" + syn + "'")) {
    missing.push(syn);
  }
}
console.log('Missing synergies in tooltips:', missing);
