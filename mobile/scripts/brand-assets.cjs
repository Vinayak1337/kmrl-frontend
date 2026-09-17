// Export the existing DocSetu folded-page vector for native launch assets.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const dir = path.join(__dirname, '..', 'assets');
const glyph = (fill, stroke) => `<path d="M5 4h17l9 9v19H5V4Z" fill="${fill}"/><path d="M22 4v9h9M11 18h14M11 23h14M11 28h8" stroke="${stroke}" stroke-width="1.7" fill="none"/>`;
async function make(name, size, bg, fill, stroke, scale) {
 const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}<g transform="translate(${512-18*scale} ${512-18*scale}) scale(${scale})">${glyph(fill,stroke)}</g></svg>`;
 await sharp(Buffer.from(svg)).png().toFile(path.join(dir, `${name}.png`));
}
(async()=>{fs.mkdirSync(dir,{recursive:true});await Promise.all([
 make('icon',1024,'#294F43','#FFFEFA','#294F43',18),
 make('adaptive-icon',1024,null,'#FFFEFA','#294F43',15),
 make('monochrome',1024,null,'#FFFFFF','#FFFFFF',15),
 make('splash',512,null,'#294F43','#F6F5F0',22),
 make('splash-dark',512,null,'#ACCEB7','#151C18',22),
 make('favicon',64,'#294F43','#FFFEFA','#294F43',20),
]);})();
