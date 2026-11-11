import { test } from 'node:test';
import assert from 'node:assert/strict';
import { girdiMetindenCoz } from '../src/girdi.ts';
import { hesapla } from '../src/hesap.ts';
import { raporTanimi } from '../src/rapor/pdf.ts';
import { alanAdi, KALEMLER, kalemYeni } from '../web/src/schema.ts';
import { alanDegistir, formYamli, formuDogrula, hataYolu, yamlForma } from '../web/src/form-model.ts';
import { girdi, testTablolari } from './yardimci.ts';

const t = testTablolari();
const kalem = (s: ReturnType<typeof hesapla>, kod: string) => s.kalemler.find((k) => k.kod === kod)!;

test('ücret alacağı: 41 günlük bakiye maaş ve ücret değişiminde kesit bölünmesi', () => {
  // 15.12.2020 - 24.01.2021: Aralık 2020'de 17 gün (asgari 3.000 TL → günlük 100 TL = 1.700 TL),
  // Ocak 2021'de 24 gün (asgari 3.600 TL → günlük 120 TL = 2.880 TL); toplam 41 gün = 4.580 TL.
  const g = girdi({
    ucret: { sonBrutAylik: 'asgari', yontem: 'asgari', yanHaklar: [] },
    kalemler: {
      ucretAlacagi: {
        donemler: [{ baslangic: '2020-12-15', bitis: '2021-01-24', odenenBrut: 580, aciklama: 'bakiye maaş' }],
      },
    },
  });
  const s = hesapla(g, t);
  const k = kalem(s, 'ucretAlacagi');
  assert.equal(k.ad, 'Ücret alacağı');
  assert.equal(k.kesintiTuru, 'ucret');
  assert.equal(k.detay!.satirlar.length, 2);
  assert.equal(k.detay!.satirlar[0]![1], '17');
  assert.equal(k.detay!.satirlar[1]![1], '24');
  assert.equal(k.detay!.toplam![1], '41');
  assert.equal(k.detay!.toplam![4], '4.580,00');
  assert.equal(k.detay!.toplam![5], '580,00');
  assert.equal(k.hamBrut.toFixed(2), '4000.00');
  // SGK %14 = 560, işsizlik %1 = 40, GV %15 × 3400 = 510, DV %0,759 = 30,36 → net 2859,64
  assert.deepEqual(
    k.kesintiler.map((x) => [x.ad, x.tutar.toFixed(2)]),
    [
      ['SGK işçi payı', '560.00'],
      ['İşsizlik sigortası işçi payı', '40.00'],
      ['Gelir vergisi', '510.00'],
      ['Damga vergisi', '30.36'],
    ],
  );
  assert.equal(k.net.toFixed(2), '2859.64');
});

test('ücret alacağı: kuruş duyarlığı (40 hane Decimal), satıra özel brüt aylık ve tam ay kuralı', () => {
  // 10.000 TL / 30 = 333,3333... TL/gün; 41 gün × (10.000 / 30) = 13.666,666... → 13.666,67 TL
  // (erken yuvarlansaydı 333,33 × 41 = 13.666,53 TL olurdu).
  const g = girdi({
    kalemler: {
      ucretAlacagi: {
        gunKurali: 'tam-ay',
        donemler: [
          { baslangic: '2021-01-01', bitis: '2021-02-10', gunSayisi: 41, brutAylik: 10000 },
          { baslangic: '2021-03-01', bitis: '2021-03-31', brutAylik: 9000 }, // 31 takvim günü ama tam-ay kuralıyla 30 gün
        ],
      },
    },
  });
  const k = kalem(hesapla(g, t), 'ucretAlacagi');
  assert.equal(k.detay!.satirlar[0]![1], '41');
  assert.equal(k.detay!.satirlar[0]![6], '13.666,67');
  assert.equal(k.detay!.satirlar[1]![1], '30');
  assert.equal(k.detay!.satirlar[1]![6], '9.000,00');
  assert.equal(k.hamBrut.toFixed(2), '22666.67');
});

test('ücret alacağı: tam-ay kuralında çok aylı dönem ücret değişiminde her ay kendi içinde 30 gün sayılır', () => {
  // Haziran 2021 (30 takvim günü, asgari 3.600 TL) + Temmuz 2021 (31 takvim günü, asgari 4.500 TL):
  // tam-ay kuralında 29,5082 / 30,4918 yerine tam 30 / 30 gün olarak bölünmeli.
  const g = girdi({
    ucret: { sonBrutAylik: 'asgari', yontem: 'asgari', yanHaklar: [] },
    kalemler: {
      ucretAlacagi: {
        gunKurali: 'tam-ay',
        donemler: [{ baslangic: '2021-06-01', bitis: '2021-07-31' }],
      },
    },
  });
  const k = kalem(hesapla(g, t), 'ucretAlacagi');
  assert.equal(k.detay!.satirlar.length, 2);
  assert.equal(k.detay!.satirlar[0]![1], '30');
  assert.equal(k.detay!.satirlar[0]![6], '3.600,00');
  assert.equal(k.detay!.satirlar[1]![1], '30');
  assert.equal(k.detay!.satirlar[1]![6], '4.500,00');
  assert.equal(k.detay!.toplam![1], '60');
  assert.equal(k.hamBrut.toFixed(2), '8100.00');
});

test('ücret alacağı ve ikramiye: 4857 s.K. m.34 mevduat faizi ve PDF raporu uyumu', () => {
  const g = girdi({
    kalemler: {
      ucretAlacagi: {
        donemler: [{ baslangic: '2021-03-01', bitis: '2021-03-30', gunSayisi: 30 }],
        faiz: [{ tur: 'mevduat', baslangic: '2021-03-15', gerekce: 'temerrüt (4857 s.K. m.34)' }],
      },
      ikramiye: {
        satirlar: [{ ad: 'Bahar dönemi ikramiyesi', tarih: '2021-06-01', hesapSekli: 'tutar', deger: 5000 }],
        faiz: [{ tur: 'mevduat', baslangic: '2021-06-01', gerekce: 'ödeme günü (4857 s.K. m.34)' }],
      },
    },
  });
  const s = hesapla(g, t);
  const ua = kalem(s, 'ucretAlacagi');
  const ik = kalem(s, 'ikramiye');

  assert.ok(ua.dayanak.some((d) => d.includes('4857 s.K. m.34')));
  assert.ok(ik.dayanak.some((d) => d.includes('4857 s.K. m.34')));
  // 9.000 TL × %20 × 291 / 365 = 1.435,07 TL
  assert.equal(ua.faizler[0]!.toplam.toFixed(2), '1435.07');
  // 5.000 TL × %30 × 213 / 365 = 875,34 TL
  assert.equal(ik.faizler[0]!.toplam.toFixed(2), '875.34');

  const tanim = raporTanimi(s, { uretimZamani: '11.11.2026 12:00', surum: 'mizan test', girdiOzeti: 'abc' });
  const json = JSON.stringify(tanim);
  assert.match(json, /en yüksek mevduat faizi \(4857 s\.K\. m\.34\)/);
});

test('ikramiye: sabit tutar, günlük ve aylık-oran hesap şekilleri ile TBK m.405 kıstelyevm', () => {
  const g = girdi({
    ucret: { sonBrutAylik: 10000, yontem: 'sabit', yanHaklar: [] },
    kalemler: {
      ikramiye: {
        satirlar: [
          // 1) Sabit tutar + kıstelyevm: 6.000 × 0,5 = 3.000,00 TL
          { ad: 'Yıl sonu primi', donem: '2021 yılı', hesapSekli: 'tutar', deger: 6000, calisilanOran: 0.5 },
          // 2) Günlük + kıstelyevm (kuruş duyarlığı): (10.000 / 30) × 20 × 0,5 = 3.333,333... → 3.333,33 TL
          { ad: 'İlave tediye', tarih: '2021-06-30', hesapSekli: 'gunluk', deger: 20, calisilanOran: 0.5 },
          // 3) Aylık oran + kıstelyevm: 10.000 × 1,5 × 0,25 = 3.750,00 TL
          {
            ad: 'Sözleşme ikramiyesi',
            donem: { baslangic: '2021-01-01', bitis: '2021-09-15' },
            hesapSekli: 'aylik-oran',
            deger: 1.5,
            calisilanOran: 0.25,
          },
        ],
        mahsup: { tutar: 583.33, aciklama: 'avans mahsubu' },
        takdiriIndirim: { oran: 0.1, gerekce: 'hakkaniyet indirimi' },
      },
    },
    parametreler: { indirimMahsupSirasi: 'once-indirim', vergi: { yontem: 'sabit', sabitOran: 0.15 } },
  });
  const s = hesapla(g, t);
  const k = kalem(s, 'ikramiye');
  assert.equal(k.ad, 'İkramiye ve ilave tediye / prim alacağı');
  assert.equal(k.hamBrut.toFixed(2), '10083.33'); // 3000 + 3333,33 + 3750
  assert.equal(k.indirim!.tutar.toFixed(2), '1008.33');
  assert.equal(k.brut.toFixed(2), '8491.67'); // 10083,33 - 1008,33 - 583,33
  assert.ok(k.notlar.some((n) => n.includes('TBK m.405/2')));
});

test('ücret alacağı ve ikramiye: dönem ve şema doğrulama kuralları', () => {
  assert.throws(
    () =>
      girdi({
        kalemler: {
          ucretAlacagi: {
            donemler: [{ baslangic: '2019-01-01', bitis: '2019-01-31' }],
          },
        },
      }),
    /hizmet döneminin içinde değil/,
  );
  assert.throws(
    () =>
      girdi({
        kalemler: {
          ucretAlacagi: {
            donemler: [
              { baslangic: '2021-01-01', bitis: '2021-01-31' },
              { baslangic: '2021-01-15', bitis: '2021-02-15' },
            ],
          },
        },
      }),
    /çakışıyor/,
  );
  assert.throws(
    () =>
      girdi({
        kalemler: {
          ikramiye: {
            satirlar: [{ ad: 'İkramiye', hesapSekli: 'tutar', deger: 1000 }],
          },
        },
      }),
    /donem ya da tarih/,
  );
  assert.throws(
    () =>
      girdi({
        kalemler: {
          ikramiye: {
            satirlar: [{ ad: 'İkramiye', tarih: '2019-05-01', hesapSekli: 'tutar', deger: 1000 }],
          },
        },
      }),
    /dışında/,
  );
  assert.throws(
    () =>
      girdi({
        kalemler: {
          ikramiye: {
            satirlar: [{ ad: 'İkramiye', donem: '2020/1. yarıyıl', hesapSekli: 'gunluk', deger: 15 }],
          },
        },
      }),
    /ücretin alınacağı tarih/,
  );
});

test('web form ve YAML dönüşümü: ucretAlacagi ve ikramiye kayıpsız çalışır', () => {
  assert.ok(KALEMLER.some((k) => k.key === 'ucretAlacagi'));
  assert.ok(KALEMLER.some((k) => k.key === 'ikramiye'));
  assert.equal(alanAdi('girdi.kalemler.ucretAlacagi.donemler[0].gunSayisi'), 'Ödenmeyen gün sayısı');
  assert.equal(alanAdi('girdi.kalemler.ucretAlacagi.donemler[0].tamAy'), 'Satırda tam ay kuralı');
  assert.equal(alanAdi('girdi.kalemler.ikramiye.satirlar[0].calisilanOran'), 'Kıstelyevm (çalışılan süre oranı)');
  assert.equal(alanAdi('girdi.kalemler.ikramiye.satirlar[0].odenenBrut'), 'Ödenen brüt tutar (TL)');
  assert.equal(alanAdi('girdi.kalemler.ikramiye.satirlar[0].aciklama'), 'Açıklama');
  assert.equal(hataYolu('Ücret alacağı: faiz satırlarındaki tutarların toplamı aşıyor'), 'girdi.kalemler.ucretAlacagi');
  assert.equal(
    hataYolu('İkramiye ve ilave tediye / prim alacağı: faiz satırlarındaki tutarların toplamı aşıyor'),
    'girdi.kalemler.ikramiye',
  );

  const temelYaml = [
    'dosya: { mahkeme: Örnek İş Mahkemesi, esasNo: 2021/1, kaynak: örnek hesap, altAlan: "60.02" }',
    'hesapTarihi: 2021-12-31',
    'hizmet: { donemler: [{ giris: 2020-01-01, cikis: 2021-09-15 }], fesihTarihi: 2021-09-15, fesihSekli: fesih }',
    'ucret: { sonBrutAylik: 9000, yontem: sabit }',
    'parametreler: { vergi: { yontem: sabit, sabitOran: 0.15 } }',
    'kalemler:',
    '  ucretAlacagi:',
    '    donemler:',
    '      - { baslangic: 2021-08-01, bitis: 2021-09-10, gunSayisi: 41, odenenBrut: 300 }',
    '    faiz:',
    '      - { tur: mevduat, baslangic: 2021-09-15, gerekce: "4857 s.K. m.34" }',
    '  ikramiye:',
    '    satirlar:',
    '      - { ad: Bayram ikramiyesi, donem: 2021/2, tarih: 2021-07-20, hesapSekli: gunluk, deger: 15, calisilanOran: 0.8 }',
  ].join('\n');

  let form = yamlForma(temelYaml);
  form = alanDegistir(form, ['kalemler', 'ucretAlacagi', 'donemler', 0, 'odenenBrut'], 500);
  const uretilenYaml = formYamli(form);
  const dogrulanan = formuDogrula(form);
  const cozulmus = girdiMetindenCoz(uretilenYaml);
  assert.deepEqual(dogrulanan, cozulmus);

  const s = hesapla(dogrulanan, t);
  // 41 × 300 - 500 = 11.800 TL
  assert.equal(kalem(s, 'ucretAlacagi').brut.toFixed(2), '11800.00');
  // (9.000 / 30) × 15 × 0,8 = 3.600 TL
  assert.equal(kalem(s, 'ikramiye').brut.toFixed(2), '3600.00');

  // Boş yeni kalemler doğrulamada reddedilir
  assert.throws(() => formuDogrula(alanDegistir(form, ['kalemler'], { ucretAlacagi: kalemYeni('ucretAlacagi') })));
  assert.throws(() => formuDogrula(alanDegistir(form, ['kalemler'], { ikramiye: kalemYeni('ikramiye') })));
});
