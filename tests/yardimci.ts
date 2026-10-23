import { join } from 'node:path';
import { girdiCoz, type Girdi } from '../src/girdi.ts';
import type { Tablolar } from '../src/tablolar.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';

export const TEST_VERI = join(import.meta.dirname, 'veri');

export function testTablolari(): Tablolar {
  return tablolariYukle({}, TEST_VERI);
}

/** Testlerin ortak girdisi; `ek` ile kalem ve parametreler değiştirilir. */
export function girdi(ek: Record<string, unknown> = {}): Girdi {
  const temel: Record<string, unknown> = {
    dosya: { mahkeme: 'Denizli 7. İş Mahkemesi', esasNo: '2021/1', kaynak: 'kendi dosyam', altAlan: '60.02' },
    hesapTarihi: '2021-12-31',
    hizmet: {
      donemler: [{ giris: '2020-01-01', cikis: '2021-09-15' }],
      fesihTarihi: '2021-09-15',
      fesihSekli: 'işveren tarafından haklı neden gösterilmeden fesih',
    },
    ucret: { sonBrutAylik: 9000, yontem: 'sabit', yanHaklar: [{ ad: 'Yemek', tutar: 1000 }] },
    parametreler: { vergi: { yontem: 'sabit', sabitOran: 0.15 } },
    kalemler: { kidem: { hakVar: true, gerekce: 'işveren feshi' } },
  };
  return girdiCoz({ ...temel, ...ek });
}
