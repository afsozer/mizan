import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const paket = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };
let commit: string | null = null;
let degisiklikVar = true;
try {
  commit = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  degisiklikVar = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim().length > 0;
} catch { /* Git bilgisi yoksa raporda commit yok olarak gösterilir. */ }

export default defineConfig({
  root,
  base: './',
  plugins: [preact()],
  define: { __MIZAN_SURUM__: JSON.stringify({ surum: paket.version, commit, degisiklikVar }) },
  build: { outDir: 'dist', emptyOutDir: true },
  // Sunucu ayağa kalkınca arayüz varsayılan tarayıcıda kendiliğinden açılır.
  server: { host: '127.0.0.1', open: true, fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  preview: { host: '127.0.0.1', open: true },
});
