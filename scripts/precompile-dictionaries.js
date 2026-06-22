import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const dataDir = path.join(rootDir, 'public', 'data');

const dicts = ['twl', 'sowpods', 'enable'];

console.log('--- PRECOMPILING DICTIONARIES ---');

dicts.forEach(dict => {
  const txtPath = path.join(dataDir, `${dict}.txt`);
  const jsonPath = path.join(dataDir, `${dict}.json`);

  if (!fs.existsSync(txtPath)) {
    console.warn(`Warning: Text file not found at ${txtPath}`);
    return;
  }

  console.log(`Processing ${dict}.txt...`);
  const content = fs.readFileSync(txtPath, 'utf-8');
  const rawWords = content
    .replace(/^\uFEFF/, '') // Strip BOM
    .split('\n')
    .map(w => w.trim().toUpperCase())
    .filter(w => /^[A-Z]+$/.test(w));

  const wordSet = new Set(rawWords);
  const wordList = Array.from(wordSet).sort();

  console.log(`Saving ${wordList.length} clean words to ${dict}.json...`);
  fs.writeFileSync(jsonPath, JSON.stringify(wordList));
});

console.log('--- PRECOMPILATION COMPLETE ---');
