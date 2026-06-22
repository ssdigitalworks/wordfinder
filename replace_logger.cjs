const fs = require('fs');
const path = require('path');

const walkSync = function(dir, filelist) {
  files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      if (file.endsWith('.ts') && file !== 'logger.ts') {
        filelist.push(path.join(dir, file));
      }
    }
  });
  return filelist;
};

const libFiles = walkSync('src/lib');
const apiFiles = walkSync('src/pages/api');
const allFiles = [...libFiles, ...apiFiles];

allFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  if (content.includes('console.log(') || content.includes('console.warn(') || content.includes('console.error(')) {
    // Check if logger is imported
    if (!content.includes("import { logger } from")) {
      const depth = file.split(path.sep).length - 2;
      const relativePath = depth === 0 ? './logger' : '../'.repeat(depth) + 'lib/logger';
      content = `import { logger } from '${relativePath}';\n` + content;
    }

    content = content.replace(/console\.log\(/g, 'logger.info(');
    content = content.replace(/console\.warn\(/g, 'logger.warn(');
    content = content.replace(/console\.error\(/g, 'logger.error(');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
});
