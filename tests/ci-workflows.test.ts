import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

const KOK = join(import.meta.dirname, '..');

interface Adim {
  name?: string;
  uses?: string;
  run?: string;
  id?: string;
  with?: Record<string, unknown>;
}

interface Is {
  name?: string;
  'runs-on'?: string;
  needs?: string;
  environment?: { name?: string; url?: string };
  steps?: Adim[];
}

interface IsAkisi {
  name?: string;
  on?: {
    push?: { branches?: string[] };
    pull_request?: unknown;
    workflow_dispatch?: unknown;
  };
  permissions?: Record<string, string>;
  concurrency?: { group?: string; 'cancel-in-progress'?: boolean };
  jobs?: Record<string, Is>;
}

function akisOku(dosyaAdi: string): IsAkisi {
  const yol = join(KOK, '.github', 'workflows', dosyaAdi);
  const icerik = readFileSync(yol, 'utf8');
  return YAML.parse(icerik) as IsAkisi;
}

test('ci.yml gecerli YAML yapisi ve zorunlu denetim adimlarini icerir', () => {
  const ci = akisOku('ci.yml');
  assert.ok(ci.on && 'push' in ci.on && 'pull_request' in ci.on);
  assert.ok(ci.on.push?.branches?.includes('main'));
  assert.ok(ci.on.push?.branches?.includes('**'));

  const isler = Object.values(ci.jobs ?? {});
  assert.equal(isler.length, 1);
  const is = isler[0]!;
  assert.equal(is['runs-on'], 'ubuntu-latest');

  const adimlar = is.steps ?? [];
  const checkout = adimlar.find((a) => a.uses === 'actions/checkout@v4');
  assert.ok(checkout);
  assert.equal(checkout.with?.['fetch-depth'], 0);

  const nodeKurulum = adimlar.find((a) => a.uses === 'actions/setup-node@v4');
  assert.ok(nodeKurulum);
  assert.equal(nodeKurulum.with?.['node-version'], '24');
  assert.equal(nodeKurulum.with?.['cache'], 'npm');

  const komutlar = adimlar.map((a) => a.run).filter((k): k is string => typeof k === 'string');
  const beklenenKomutlar = [
    'npm ci',
    'npm run typecheck',
    'npx tsc --noEmit -p web',
    'npm test',
    'npm run web:build',
    'node bin/mizan.ts tablolar',
    "! git grep -n '[\u00e2\u00ee\u00fb\u00c2\u00ce\u00db\u2014]'",
  ];
  for (const komut of beklenenKomutlar) {
    assert.ok(komutlar.includes(komut), `ci.yml icinde beklenen komut eksik: ${komut}`);
  }
});

test('pages.yml en az yetki ilkesi ve GitHub Pages dagitim adimlarini icerir', () => {
  const pages = akisOku('pages.yml');
  assert.ok(pages.on && 'push' in pages.on && 'workflow_dispatch' in pages.on);
  assert.deepEqual(pages.on.push?.branches, ['main']);
  assert.deepEqual(pages.permissions, {
    contents: 'read',
    pages: 'write',
    'id-token': 'write',
  });
  assert.deepEqual(pages.concurrency, {
    group: 'pages',
    'cancel-in-progress': false,
  });

  const build = pages.jobs?.['build'];
  assert.ok(build);
  assert.equal(build['runs-on'], 'ubuntu-latest');

  const buildAdimlari = build.steps ?? [];
  const checkout = buildAdimlari.find((a) => a.uses === 'actions/checkout@v4');
  assert.ok(checkout);
  assert.equal(checkout.with?.['fetch-depth'], 0);

  const nodeKurulum = buildAdimlari.find((a) => a.uses === 'actions/setup-node@v4');
  assert.ok(nodeKurulum);
  assert.equal(nodeKurulum.with?.['node-version'], '24');
  assert.equal(nodeKurulum.with?.['cache'], 'npm');

  const buildKomutlari = buildAdimlari.map((a) => a.run).filter((k): k is string => typeof k === 'string');
  for (const komut of ['npm ci', 'npm test', 'npm run web:build']) {
    assert.ok(buildKomutlari.includes(komut), `pages.yml build icinde beklenen komut eksik: ${komut}`);
  }

  assert.ok(buildAdimlari.some((a) => a.uses === 'actions/configure-pages@v5'));
  const upload = buildAdimlari.find((a) => a.uses === 'actions/upload-pages-artifact@v3');
  assert.ok(upload);
  assert.equal(upload.with?.['path'], 'web/dist');

  const deploy = pages.jobs?.['deploy'];
  assert.ok(deploy);
  assert.equal(deploy.needs, 'build');
  assert.equal(deploy['runs-on'], 'ubuntu-latest');
  assert.equal(deploy.environment?.name, 'github-pages');
  const deployAdim = deploy.steps?.find((a) => a.uses === 'actions/deploy-pages@v4');
  assert.ok(deployAdim);
  assert.equal(deployAdim.id, 'deployment');
});

test('web/vite.config.ts ve web/index.html alt dizin (GitHub Pages) dagitimina uygundur', () => {
  const viteConfig = readFileSync(join(KOK, 'web', 'vite.config.ts'), 'utf8');
  assert.match(viteConfig, /base:\s*['"]\.\/['"]/);

  const indexHtml = readFileSync(join(KOK, 'web', 'index.html'), 'utf8');
  assert.match(indexHtml, /Content-Security-Policy/);
  assert.match(indexHtml, /default-src 'self'/);

  const appTsx = readFileSync(join(KOK, 'web', 'src', 'App.tsx'), 'utf8');
  assert.match(appTsx, /fetch\(['"]\/__mizan\/durum['"]\)/);
  assert.match(appTsx, /\.catch\(\(\)\s*=>\s*yerelSunucuYaz\(false\)\)/);
});
