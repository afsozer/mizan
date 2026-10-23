#!/usr/bin/env node
// TCMB EVDS'den "Bankalarca Mevduatlara Fiilen Uygulanan Azami Faiz Oranları" serilerini çekip
// data/mevduat-faizi.json (tüm bankalar) ve data/mevduat-faizi-kamu.json (kamu bankaları) yazar.
// Uç nokta EVDS web arayüzünün kullandığı anahtarsız servistir, belgelenmiş API değildir;
// değişirse EVDS'de seriyi elle indirip aynı biçime çevirin.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { d } from '../src/para.ts';
import { VERI_DIZINI } from '../src/node/tablolar-dosya.ts';
import { ayEkle, bugun, gunEkle } from '../src/tarih.ts';

const UC = 'https://evds3.tcmb.gov.tr/igmevdsms-dis/fe';
const METAVERI =
  'https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/File+Resources/YFA/Metaveri_Bankalar+Mevduat+Fiilen+Uygulanan+Faiz';
const BASLANGIC = '2016-01';

const SERILER = [
  {
    kod: 'TP.TRY.MT04.S',
    dosya: 'mevduat-faizi.json',
    tablo: 'mevduat-faizi',
    ad: 'Bankalarca mevduata fiilen uygulanan azami faiz (TCMB, 1 yıla kadar vadeli TL, vekil seri)',
  },
  {
    kod: 'TP.TRY.MT04.K',
    dosya: 'mevduat-faizi-kamu.json',
    tablo: 'mevduat-faizi-kamu',
    ad: 'Kamu bankalarınca mevduata fiilen uygulanan azami faiz (TCMB, 1 yıla kadar vadeli TL, vekil seri)',
  },
];

const ACIKLAMA =
  '1475 s.K. m.14: kıdem tazminatı geç ödenirse mevduata uygulanan en yüksek faiz. Yargıtay ölçütü (9. HD 06.11.2025, ' +
  '2025/6610 E., 2025/8609 K.): bir yıllık mevduata fiilen uygulanan en yüksek oran; fesih tarihindeki oran ilk yıl, her ' +
  'yıldönümündeki oran sonraki yıl için sabit uygulanır, yıl içi değişiklikler dikkate alınmaz. Yargıtay oranın bankalara ' +
  'müzekkere yazılarak tespitini ister. Bu tablo TCMB EVDS serisidir ve vekil seri niteliğindedir: değer o ayın en yüksek ' +
  'oranıdır, "1 yıla kadar" dilimi 6 aydan uzun 12 ay dahil vadeleri kapsar. Banka yazısı varsa onun oranları ayrı bir ' +
  'tablo dosyasıyla girilmeli (girdi: tablolar.mevduatFaizi).';

interface EvdsSatiri {
  Tarih: string;
  [seri: string]: unknown;
}

async function cek(): Promise<EvdsSatiri[]> {
  const bitis = bugun().split('-').reverse().join('-');
  const govde = {
    type: 'json',
    series: SERILER.map((s) => s.kod).join('-'),
    aggregationTypes: SERILER.map(() => 'avg').join('-'),
    formulas: SERILER.map(() => '0').join('-'),
    startDate: `01-${BASLANGIC.slice(5)}-${BASLANGIC.slice(0, 4)}`,
    endDate: bitis,
    frequency: '5',
    decimalSeperator: '.',
    decimal: '2',
    dateFormat: '0',
    lang: 'tr',
    yon: '0',
    sira: '0',
    ozelFormuller: [],
    groupSeperator: true,
    isRaporSayfasi: false,
  };
  const yanit = await fetch(UC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(govde) });
  if (!yanit.ok) throw new Error(`EVDS yanıtı ${yanit.status}`);
  const veri = (await yanit.json()) as EvdsSatiri[] | { items: EvdsSatiri[] };
  return Array.isArray(veri) ? veri : veri.items;
}

function yuzdedenOrana(deger: string): string {
  return d(deger).div(100).toString();
}

async function main(): Promise<void> {
  const satirlar = await cek();
  const erisim = bugun();
  for (const s of SERILER) {
    const alan = s.kod.replace(/\./g, '_');
    const tablo = satirlar
      .filter((x) => typeof x[alan] === 'string' && x[alan] !== '')
      .map((x) => {
        const baslangic = `${x.Tarih}-01`;
        return {
          baslangic,
          bitis: gunEkle(ayEkle(baslangic, 1), -1),
          oran: yuzdedenOrana(x[alan] as string),
          kaynak: {
            ad: `TCMB EVDS, Bankalarca Mevduatlara Fiilen Uygulanan Azami Faiz Oranları (Stok-Aylık), seri ${s.kod}, ${x.Tarih}`,
            url: METAVERI,
            dogrulama: `EVDS'den ${erisim} tarihinde çekildi (scripts/mevduat-guncelle.ts); yüzde değer ${x[alan] as string}, ayın en yüksek oranı`,
          },
        };
      });
    const dosya = { tablo: s.tablo, ad: s.ad, aciklama: ACIKLAMA, dogrulamaTarihi: erisim, satirlar: tablo };
    writeFileSync(join(VERI_DIZINI, s.dosya), JSON.stringify(dosya, null, 2) + '\n');
    console.log(`${s.dosya}: ${tablo.length} ay, son ${tablo[tablo.length - 1]?.baslangic.slice(0, 7)}`);
  }
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
