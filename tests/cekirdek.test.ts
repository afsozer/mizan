import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as mizan from '../src/index.ts';
import { VERI_DIZINI } from '../src/node/tablolar-dosya.ts';

const SRC = join(import.meta.dirname, '..', 'src');

function dosyalar(dizin: string): string[] {
  return readdirSync(dizin).flatMap((ad) => {
    const yol = join(dizin, ad);
    return statSync(yol).isDirectory() ? dosyalar(yol) : yol.endsWith('.ts') ? [yol] : [];
  });
}

test('çekirdek (src/node dışı) Node modülü ve dosya erişimi kullanmaz', () => {
  const ihlal = dosyalar(SRC)
    .filter((y) => !relative(SRC, y).startsWith('node/'))
    .filter((y) => /from ['"]node:|require\(|import\.meta|from ['"]pdfmake['"]/.test(readFileSync(y, 'utf8')))
    .map((y) => relative(SRC, y));
  assert.deepEqual(ihlal, []);
});

test('tarayıcı yolu: JSON tablolar ve YAML metniyle çekirdek API aynı sonucu verir', () => {
  const f = mizan.TABLO_DOSYALARI;
  const ham = (ad: string) => ({ dosya: JSON.parse(readFileSync(join(VERI_DIZINI, ad), 'utf8')) });
  const tablolar = mizan.tablolariKur({
    asgariUcret: ham(f.asgariUcret),
    kidemTavani: ham(f.kidemTavani),
    sgk: ham(f.sgk),
    damga: ham(f.damga),
    yasalFaiz: ham(f.yasalFaiz),
    mevduatFaizi: ham(f.mevduatFaizi),
    gelirVergisi: ham(f.gelirVergisi),
  });
  const metin = readFileSync(join(import.meta.dirname, '..', 'ornekler', 'ornek-iscilik.yaml'), 'utf8');
  const s = mizan.hesapla(mizan.girdiMetindenCoz(metin), tablolar);
  assert.equal(s.toplam.brut.toFixed(2), '552872.22');
  const tanim = mizan.raporTanimi(s, { uretimZamani: '23.10.2026 12:00', surum: 'mizan test', girdiOzeti: '-' });
  assert.ok(Array.isArray((tanim as { content: unknown[] }).content));
  assert.match(mizan.defterSatiri(s, '2026-10-23', 'mizan test'), /60\.02/);
});
