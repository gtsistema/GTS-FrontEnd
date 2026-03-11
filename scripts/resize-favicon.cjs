const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const srcSvg = path.join(publicDir, 'favicon.svg');
const srcPng = path.join(publicDir, 'favicon.png');
const src = fs.existsSync(srcSvg) ? srcSvg : srcPng;

if (!fs.existsSync(src)) {
  console.error('favicon.svg or favicon.png not found in public/');
  process.exit(1);
}

async function run() {
  const cover = { fit: 'cover', position: 'center' };
  await sharp(src).resize(48, 48, cover).toFile(path.join(publicDir, 'favicon-48.png'));
  await sharp(src).resize(32, 32, cover).toFile(path.join(publicDir, 'favicon-32.png'));
  await sharp(src).resize(16, 16, cover).toFile(path.join(publicDir, 'favicon-16.png'));
  console.log('Created favicon-48.png, favicon-32.png and favicon-16.png from', path.basename(src));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
