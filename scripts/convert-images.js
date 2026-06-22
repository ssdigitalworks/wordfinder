import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const blogImgDir = path.join(rootDir, 'public', 'images', 'blog');
const contentDir = path.join(rootDir, 'src', 'content', 'blog');

async function run() {
  console.log('--- CONVERTING BLOG IMAGES TO WEBP ---');

  if (!fs.existsSync(blogImgDir)) {
    console.error(`Error: Directory not found at ${blogImgDir}`);
    return;
  }

  const files = fs.readdirSync(blogImgDir);
  const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));

  if (pngFiles.length === 0) {
    console.log('No PNG files found in blog images directory.');
    return;
  }

  for (const file of pngFiles) {
    const pngPath = path.join(blogImgDir, file);
    const webpName = file.substring(0, file.lastIndexOf('.')) + '.webp';
    const webpPath = path.join(blogImgDir, webpName);

    console.log(`Converting ${file} -> ${webpName}...`);
    try {
      await sharp(pngPath)
        .webp({ quality: 80 })
        .toFile(webpPath);
      
      const pngSize = fs.statSync(pngPath).size;
      const webpSize = fs.statSync(webpPath).size;
      console.log(`Saved ${(pngSize - webpSize) / 1024 / 1024} MB. New size: ${webpSize / 1024} KB`);

      // Delete the original PNG file
      fs.unlinkSync(pngPath);
      console.log(`Deleted original PNG: ${file}`);
    } catch (err) {
      console.error(`Failed to convert ${file}:`, err);
    }
  }

  console.log('\nUpdating references in markdown posts...');
  if (fs.existsSync(contentDir)) {
    const posts = fs.readdirSync(contentDir);
    for (const post of posts) {
      if (post.endsWith('.md')) {
        const postPath = path.join(contentDir, post);
        let content = fs.readFileSync(postPath, 'utf-8');
        let updated = false;

        // Replace any .png with .webp for images in public/images/blog
        if (content.includes('.png')) {
          content = content.replace(/\.png/g, '.webp');
          updated = true;
        }

        if (updated) {
          fs.writeFileSync(postPath, content, 'utf-8');
          console.log(`Updated image references in ${post}`);
        }
      }
    }
  }

  // Also replace any reference in layout/page files if present
  console.log('\nChecking other files for references...');
  const srcPagesDir = path.join(rootDir, 'src');
  function scanDir(dir) {
    const list = fs.readdirSync(dir);
    for (const file of list) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        if (file !== 'node_modules' && file !== '.astro' && file !== 'dist') {
          scanDir(fullPath);
        }
      } else if (file.endsWith('.astro') || file.endsWith('.ts') || file.endsWith('.js')) {
        let content = fs.readFileSync(fullPath, 'utf-8');
        if (content.includes('/images/blog/') && content.includes('.png')) {
          content = content.replace(/\/images\/blog\/([\w-]+)\.png/g, '/images/blog/$1.webp');
          fs.writeFileSync(fullPath, content, 'utf-8');
          console.log(`Updated references in ${path.relative(rootDir, fullPath)}`);
        }
      }
    }
  }
  scanDir(srcPagesDir);

  console.log('--- CONVERSION COMPLETE ---');
}

run().catch(console.error);
