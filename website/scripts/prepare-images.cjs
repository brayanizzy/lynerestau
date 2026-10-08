// Re-encode the supplied visuals for the web without resizing, cropping or retouching.
// Originals in /images remain unchanged. Requires sharp (or a NODE_PATH containing it).
const sharp = require('sharp');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const sources = [
  ['10_01_17', 'boissons'],
  ['10_01_41', 'poulet-plantains'],
  ['10_01_50', 'pizza'],
  ['10_01_57', 'poulet-riz-legumes'],
  ['10_02_05', 'poisson-accompagnements'],
  ['10_02_29', 'salle-restaurant'],
  ['10_02_39', 'accueil-saveurs'],
];

async function main() {
  const project = path.resolve(__dirname, '../..');
  const target = path.join(project, 'website/assets/visuels-20260928');
  await fs.mkdir(target, { recursive: true });
  let originalBytes = 0;
  let webBytes = 0;
  const manifest = [];
  for (const [time, name] of sources) {
    const source = `Image ChatGPT 28 sept. 2026, ${time}.png`;
    const input = await fs.readFile(path.join(project, 'images', source));
    const output = path.join(target, `${name}.webp`);
    const metadata = await sharp(input).metadata();
    await sharp(input).webp({ quality: 84, effort: 6 }).toFile(output);
    const bytes = await fs.readFile(output);
    originalBytes += input.length;
    webBytes += bytes.length;
    manifest.push({ source, asset: `assets/visuels-20260928/${name}.webp`, width: metadata.width, height: metadata.height,
      bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
  }
  await fs.writeFile(path.join(project, 'website/image-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ images: manifest.length, originalBytes, webBytes, reductionPercent: Math.round((1 - webBytes / originalBytes) * 100) }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
