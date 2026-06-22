const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix the messed up PowerShell replacement first
      content = content.replace(/getRateLimitStatus\("\$\(\$\(\(Split-Path \$file\.FullName -Leaf\)\.Replace\('\.ts',''\)\)\):\$ip",, /g, 'getRateLimitStatus(ip, ');
      
      // Now do the proper replacement
      const routeName = path.basename(fullPath, '.ts');
      
      let changed = false;
      // Normal getRateLimitStatus(ip, 
      const regex = /getRateLimitStatus\(ip,/g;
      if (regex.test(content)) {
        content = content.replace(regex, `getRateLimitStatus('${routeName}:' + ip,`);
        changed = true;
      }
      
      // checkRateLimit(ip,
      const regexCheck = /checkRateLimit\(ip,/g;
      if (regexCheck.test(content)) {
        content = content.replace(regexCheck, `checkRateLimit('${routeName}:' + ip,`);
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
      }
    }
  }
}

processDir('C:/Users/brawl/.gemini/antigravity/scratch/scrabble-word-finder/src/pages/api');
