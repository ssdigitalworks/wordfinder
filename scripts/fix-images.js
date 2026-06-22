import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const ogPath = path.join(rootDir, 'public', 'og-default.png');
const logoPath = path.join(rootDir, 'public', 'logo.png');

async function fixImages() {
  console.log('--- RECTIFYING SITE IMAGES ---');

  // 1. Process og-default.png (Resize & Pad to 1200x630, convert to true PNG)
  if (fs.existsSync(ogPath)) {
    console.log('Processing og-default.png...');
    try {
      const ogTempPath = path.join(rootDir, 'public', 'og-default-temp.png');
      
      // Resizing to 1200x630 using "contain" fit and a warm white background (#FAF9F6)
      await sharp(ogPath)
        .resize(1200, 630, {
          fit: 'contain',
          background: { r: 250, g: 249, b: 246, alpha: 1 }
        })
        .png()
        .toFile(ogTempPath);

      fs.unlinkSync(ogPath);
      fs.renameSync(ogTempPath, ogPath);
      console.log('Successfully updated og-default.png to 1200x630 true PNG.');
    } catch (err) {
      console.error('Failed to process og-default.png:', err);
    }
  } else {
    console.warn(`og-default.png not found at ${ogPath}`);
  }

  // 2. Process logo.png (Convert to true PNG)
  if (fs.existsSync(logoPath)) {
    console.log('Processing logo.png...');
    try {
      const logoTempPath = path.join(rootDir, 'public', 'logo-temp.png');
      
      await sharp(logoPath)
        .png()
        .toFile(logoTempPath);

      fs.unlinkSync(logoPath);
      fs.renameSync(logoTempPath, logoPath);
      console.log('Successfully converted logo.png to true PNG.');
    } catch (err) {
      console.error('Failed to process logo.png:', err);
    }
  } else {
    console.warn(`logo.png not found at ${logoPath}`);
  }

  console.log('--- IMAGE RECTIFICATION COMPLETE ---');
}

fixImages().catch(console.error);
