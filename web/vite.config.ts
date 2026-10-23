import { defineConfig, type Connect, type Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';
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

/**
 * Yerel sunucuya kapatma ucu: arayüzdeki "Kapat" düğmesi POST /__mizan/kapat çağırır ve sunucu
 * (dolayısıyla npm run arayuz) sonlanır. GET /__mizan/durum arayüze yerel sunucuda çalıştığını
 * bildirir; statik yayında (ör. GitHub Pages) bu uç olmadığı için düğme görünmez. Yalnız aynı
 * kökenden gelen istek kabul edilir, başka bir site sunucuyu kapatamaz.
 */
function kapatmaUcu(): Plugin {
  const ara: Connect.NextHandleFunction = (req: IncomingMessage, res: ServerResponse, sonraki) => {
    if (req.url === '/durum' && req.method === 'GET') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ yerel: true }));
      return;
    }
    if (req.url === '/kapat' && req.method === 'POST') {
      const koken = req.headers.origin;
      if (!koken || koken !== `http://${req.headers.host}`) {
        res.statusCode = 403;
        res.end('Yalnız aynı kökenden kapatılabilir');
        return;
      }
      res.statusCode = 204;
      res.end(() => setTimeout(() => process.exit(0), 100));
      return;
    }
    sonraki();
  };
  return {
    name: 'mizan-kapatma-ucu',
    configureServer: (sunucu) => { sunucu.middlewares.use('/__mizan', ara); },
    configurePreviewServer: (sunucu) => { sunucu.middlewares.use('/__mizan', ara); },
  };
}

export default defineConfig({
  root,
  base: './',
  plugins: [preact(), kapatmaUcu()],
  define: { __MIZAN_SURUM__: JSON.stringify({ surum: paket.version, commit, degisiklikVar }) },
  build: { outDir: 'dist', emptyOutDir: true },
  // Sunucu ayağa kalkınca arayüz varsayılan tarayıcıda kendiliğinden açılır.
  server: { host: '127.0.0.1', open: true, fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] } },
  preview: { host: '127.0.0.1', open: true },
});
