// Tabloları data/ dizininden okuyan Node katmanı. Çekirdek (src/tablolar.ts) dosyaya dokunmaz.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TABLO_DOSYALARI, tablolariKur, type HamTablo, type Tablolar } from '../tablolar.ts';

export const VERI_DIZINI = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'data');

export function tabloOku(yol: string): HamTablo {
  const metin = readFileSync(yol, 'utf8');
  return { dosya: JSON.parse(metin), ozet: createHash('sha256').update(metin).digest('hex') };
}

export interface TabloYollari {
  /** "kamu" ya da bir tablo dosyası yolu (ör. banka yazısından girilen oranlar). */
  mevduatFaizi?: string;
}

export function tablolariYukle(yollar: TabloYollari = {}, dizin = VERI_DIZINI): Tablolar {
  const oku = (ad: string) => tabloOku(join(dizin, ad));
  const f = TABLO_DOSYALARI;
  return tablolariKur({
    asgariUcret: oku(f.asgariUcret),
    kidemTavani: oku(f.kidemTavani),
    sgk: oku(f.sgk),
    damga: oku(f.damga),
    yasalFaiz: oku(f.yasalFaiz),
    mevduatFaizi:
      yollar.mevduatFaizi === 'kamu'
        ? oku(f.mevduatFaiziKamu)
        : yollar.mevduatFaizi
          ? tabloOku(resolve(yollar.mevduatFaizi))
          : oku(f.mevduatFaizi),
    gelirVergisi: oku(f.gelirVergisi),
  });
}
