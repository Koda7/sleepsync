import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, 'dist');
const index = resolve(dist, 'index.html');

if (existsSync(index)) {
  for (const route of ['insights', 'sleep-log']) {
    const dir = resolve(dist, route);
    mkdirSync(dir, { recursive: true });
    copyFileSync(index, resolve(dir, 'index.html'));
    console.log(`  SPA fallback: copied index.html -> ${route}/index.html`);
  }
}
