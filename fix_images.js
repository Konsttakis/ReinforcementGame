const fs = require('fs');
let content = fs.readFileSync('src/main.js', 'utf8');

const files = fs.readdirSync('assets/beasts');
const validAssets = files.filter(f => f.endsWith('.png') || f.endsWith('.jpeg') || f.endsWith('.jpg')).map(f => f.split('.')[0]);

const newLogic = `function makeBeast(name, min, max, stat, syn, rarity, icon, color, image = null) {
  if (!image) {
    const slug = name.toLowerCase().replace(/ /g, '_');
    const validAssets = ${JSON.stringify(validAssets)};
    if (validAssets.includes('beast_' + slug)) {
      image = 'assets/beasts/beast_' + slug + '.jpeg';
    } else if (validAssets.includes(slug)) {
      image = 'assets/beasts/' + slug + '.png';
    } else {
      image = null;
    }
  }
  const b = createBeast(name, min, max, stat, syn);`;

content = content.replace(
  /function makeBeast\(name, min, max, stat, syn, rarity, icon, color, image = null\) \{\s*if \(\!image\) \{[\s\S]*?\}\s*const b = createBeast\(name, min, max, stat, syn\);/,
  newLogic
);

fs.writeFileSync('src/main.js', content);
console.log('Successfully updated main.js to fallback to null for missing images.');
