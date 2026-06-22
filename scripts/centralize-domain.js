import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const srcDir = path.join(rootDir, 'src');

function scanAndReplace(dir) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanAndReplace(fullPath);
    } else if (file.endsWith('.astro') || file.endsWith('.ts') || file.endsWith('.js')) {
      // Skip config.ts itself to avoid circular references/recursion
      if (fullPath.endsWith('config.ts') || fullPath.endsWith('config.js')) continue;

      let content = fs.readFileSync(fullPath, 'utf-8');
      if (!content.includes('https://scrabblewordfinder.com')) continue;

      console.log(`Processing: ${path.relative(rootDir, fullPath)}`);

      // 1. Add import statement if not already present
      const importStmt = "import { SITE_URL } from '@lib/config';";
      if (!content.includes('SITE_URL') && !content.includes(importStmt)) {
        if (file.endsWith('.astro')) {
          const frontmatterStart = content.indexOf('---');
          if (frontmatterStart !== -1) {
            // Insert inside existing frontmatter block after the opening '---'
            const nextLineIndex = content.indexOf('\n', frontmatterStart + 3);
            content = content.substring(0, nextLineIndex + 1) + importStmt + '\n' + content.substring(nextLineIndex + 1);
          } else {
            // Create a new frontmatter block at the top
            content = `---\n${importStmt}\n---\n` + content;
          }
        } else {
          // Standard JS/TS file: insert at the very top
          content = `${importStmt}\n` + content;
        }
      }

      // 2. Perform URL replacements
      // Replace single-quoted URL with paths
      content = content.replace(/'https:\/\/scrabblewordfinder\.com\/([^'\n]*)'/g, (match, pathPart) => {
        return pathPart ? `\`\${SITE_URL}/${pathPart}\`` : 'SITE_URL';
      });

      // Replace double-quoted URL with paths
      content = content.replace(/"https:\/\/scrabblewordfinder\.com\/([^"\n]*)"/g, (match, pathPart) => {
        return pathPart ? `\`\${SITE_URL}/${pathPart}\`` : 'SITE_URL';
      });

      // Replace absolute single/double quoted URLs with no path
      content = content.replace(/'https:\/\/scrabblewordfinder\.com'/g, 'SITE_URL');
      content = content.replace(/"https:\/\/scrabblewordfinder\.com"/g, 'SITE_URL');

      fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }
}

console.log('--- CENTRALIZING DOMAIN NAME TO SITE_URL ---');
scanAndReplace(srcDir);
console.log('--- DOMAIN CENTRALIZATION COMPLETE ---');
