import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const demoDistDir = path.resolve(__dirname, '../dist/demo');
const oldPath = path.join(demoDistDir, 'index-prod.html');
const newPath = path.join(demoDistDir, 'index.html');

if (fs.existsSync(oldPath)) {
  fs.renameSync(oldPath, newPath);
  console.log('Successfully renamed index-prod.html to index.html');
} else {
  console.log('index-prod.html not found in dist/demo directory');
}