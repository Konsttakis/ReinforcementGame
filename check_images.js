const fs = require('fs');

const relicsStr = fs.readFileSync('src/data/relics.js', 'utf8');
const arrayStr = relicsStr.substring(relicsStr.indexOf('['));

const idRegex = /id:\s*['"]([^'"]+)['"]/g;
let match;
let ids = [];
while ((match = idRegex.exec(arrayStr)) !== null) {
  ids.push(match[1]);
}

const dirFiles = fs.readdirSync('assets/relics');
const imageNames = dirFiles.map(f => f.replace('.jpeg', '').replace('.jpg', '').replace('.png', ''));

const missing = ids.filter(id => !imageNames.includes(id));
console.log('Total Relics:', ids.length);
console.log('Total Images:', dirFiles.length);
console.log('Missing images for IDs:', missing);
