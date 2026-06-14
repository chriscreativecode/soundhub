import { cpSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const deployDir = join(root, 'dist', 'deploy');
const demoDir = join(root, 'dist', 'demo');
const readmeDir = join(root, 'dist', 'readme');

// Clean and recreate deploy folder
rmSync(deployDir, { recursive: true, force: true });
mkdirSync(deployDir, { recursive: true });

// Copy demo build to root of deploy/
cpSync(demoDir, deployDir, { recursive: true });

// Copy readme build to deploy/readme/
cpSync(readmeDir, join(deployDir, 'readme'), { recursive: true });

console.log('Deploy folder prepared:');
console.log('  dist/demo/   → dist/deploy/         (upload to public_html/)');
console.log('  dist/readme/ → dist/deploy/readme/  (upload to public_html/readme/)');
