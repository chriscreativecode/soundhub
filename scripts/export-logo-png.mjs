import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(resolve(__dirname, '../public/logo.svg'));

await sharp(svg)
  .png()
  .toFile(resolve(__dirname, '../public/logo.png'));

console.log('Written: public/logo.png');
