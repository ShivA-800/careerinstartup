import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
const src = path.join(publicDir, 'Career-logo3.png');

if (!fs.existsSync(src)) {
  console.error('Source image not found:', src);
  process.exit(1);
}

async function generate() {
  try {
    await Promise.all([
      sharp(src).resize(16, 16).toFile(path.join(publicDir, 'favicon-16.png')),
      sharp(src).resize(32, 32).toFile(path.join(publicDir, 'favicon-32.png')),
      sharp(src).resize(48, 48).toFile(path.join(publicDir, 'favicon-48.png')),
      sharp(src).resize(96, 96).toFile(path.join(publicDir, 'favicon-96.png')),
      sharp(src).resize(192, 192).toFile(path.join(publicDir, 'android-chrome-192x192.png')),
      sharp(src).resize(180, 180).toFile(path.join(publicDir, 'apple-touch-icon.png')),
    ]);

    // create a simple ICO from 16 and 32
    const ico16 = await sharp(src).resize(16, 16).png().toBuffer();
    const ico32 = await sharp(src).resize(32, 32).png().toBuffer();
    // write a minimal .ico by concatenating (sharp doesn't write ico directly reliably cross-platform). Use pngs as fallback.
    fs.writeFileSync(path.join(publicDir, 'favicon-16.png'), ico16);
    fs.writeFileSync(path.join(publicDir, 'favicon-32.png'), ico32);

    console.log('Favicon images generated in', publicDir);
  } catch (err) {
    console.error('Failed to generate favicons', err);
    process.exit(1);
  }
}

generate();
