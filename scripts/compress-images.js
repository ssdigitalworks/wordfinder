import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

async function compressImage(filename, targetSizeKb, quality = 80) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    return;
  }

  const originalSize = fs.statSync(filePath).size;
  console.log(`\nCompressing ${filename}...`);
  console.log(`Original size: ${(originalSize / 1024).toFixed(2)} KB`);

  try {
    // Compress PNG using palette-based quantization for maximum size reduction
    const buffer = await sharp(filePath)
      .png({ quality, compressionLevel: 9, palette: true })
      .toBuffer();

    const tempPath = filePath + '.tmp';
    fs.writeFileSync(tempPath, buffer);

    const newSize = fs.statSync(tempPath).size;
    console.log(`Compressed size: ${(newSize / 1024).toFixed(2)} KB`);

    if (newSize < originalSize) {
      fs.renameSync(tempPath, filePath);
      console.log(`Success! Saved ${((originalSize - newSize) / 1024).toFixed(2)} KB (${((1 - newSize / originalSize) * 100).toFixed(1)}% reduction)`);
    } else {
      fs.unlinkSync(tempPath);
      console.log(`Compressed size is not smaller. Keeping original.`);
    }
  } catch (err) {
    console.error(`Failed to compress ${filename}:`, err);
  }
}

async function run() {
  console.log('--- COMPRESSING PUBLIC IMAGES ---');
  await compressImage('og-default.png', 300, 75);
  await compressImage('logo.png', 30, 60);
  console.log('\n--- COMPRESSION COMPLETE ---');
}

run().catch(console.error);
