import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hesapla } from '../src/hesap.ts';
import { kesintiHesapla, VergiBirikimi } from '../src/kesinti.ts';
import { d } from '../src/para.ts';
import { KaynakKaydi } from '../src/tablolar.ts';
import { raporTanimi } from '../src/rapor/pdf.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';
import { alanAdi } from '../web/src/schema.ts';
import { hataYolu, yamlForma, formuDogrula } from '../web/src/form-model.ts';
import { girdi, testTablolari } from './yardimci.ts';

const gercekTablolar = tablolariYukle();
const testTablo = testTablolari();
const kalem = (s: ReturnType<typeof hesapla>, kod: string) => s.kalemler.find((k) => k.kod === kod)!;

test('SGK tablosu 2016 (6,5x), 2017-2025 (7,5x) ve 2026 (9x) üst sınır katlarını içerir', () => {
  assert.equal(gercekTablolar.sgk.bul('2016-06-15').ustSinirKati, '6.5');
  assert.equal(gercekTablolar.sgk.bul('2016-12-31').ustSinirKati, '6.5');
  assert.equal(gercekTablolar.sgk.bul('2017-01-01').ustSinirKati, '7.5');
  assert.equal(gercekTablolar.sgk.bul('2025-12-31').ustSinirKati, '7.5');
  assert.equal(gercekTablolar.sgk.bul('2026-01-01').ustSinirKati, '9');
});

test('SGK üst sınırı: varsayılan false iken yüksek ücrette tavan uygulanmaz', () => {
  const g = girdi({
    hesapTarihi: '2026-06-30',
    hizmet: {
      donemler: [{ giris: '2024-01-01', cikis: '2026-06-30' }],
      fesihTarihi: '2026-06-30',
      fesihSekli: 'işveren feshi',
    },
    ucret: { sonBrutAylik: 450000, yontem: 'sabit', yanHaklar: [] },
    parametreler: { vergi: { yontem: 'sabit', sabitOran: 0.2 } },
    kalemler: { yillikIzin: { kullanilanGun: 0, hakEdilenGun: 28, ucretTuru: 'ciplak' } },
  });
  const s = hesapla(g, gercekTablolar);
  assert.equal(s.esaslar.sgkUstSiniri, false);
  const izin = kalem(s, 'yillikIzin');
  // 28 gün × 450.000 / 30 = 420.000 TL; tavan uygulanmadığından matrah 420.000 TL
  assert.equal(izin.brut.toFixed(2), '420000.00');
  const sgk = izin.kesintiler.find((x) => x.ad === 'SGK işçi payı')!;
  const issizlik = izin.kesintiler.find((x) => x.ad === 'İşsizlik sigortası işçi payı')!;
  assert.equal(sgk.matrah.toFixed(2), '420000.00');
  assert.equal(sgk.tutar.toFixed(2), '58800.00');
  assert.equal(issizlik.tutar.toFixed(2), '4200.00');
});

test('SGK üst sınırı: 2016 (6,5x), 2025 (7,5x) ve 2026 (9x) dönemlerinde tavan aşımı', () => {
  // 1) 2016 dönemi: asgari ücret 1.647,00 TL × 6,5 = 10.705,50 TL
  const g2016 = girdi({
    hesapTarihi: '2016-12-31',
    hizmet: {
      donemler: [{ giris: '2015-01-01', cikis: '2016-12-31' }],
      fesihTarihi: '2016-12-31',
      fesihSekli: 'işveren feshi',
    },
    ucret: { sonBrutAylik: 30000, yontem: 'sabit', yanHaklar: [] },
    parametreler: { sgkUstSiniri: true, vergi: { yontem: 'sabit', sabitOran: 0.2 } },
    kalemler: { yillikIzin: { kullanilanGun: 0, hakEdilenGun: 20, ucretTuru: 'ciplak' } },
  });
  const s2016 = hesapla(g2016, gercekTablolar);
  const izin2016 = kalem(s2016, 'yillikIzin');
  // Brüt: 20 × 30.000 / 30 = 20.000,00 TL > tavan 10.705,50 TL
  assert.equal(izin2016.brut.toFixed(2), '20000.00');
  const sgk2016 = izin2016.kesintiler.find((x) => x.ad === 'SGK işçi payı')!;
  const iss2016 = izin2016.kesintiler.find((x) => x.ad === 'İşsizlik sigortası işçi payı')!;
  const gv2016 = izin2016.kesintiler.find((x) => x.ad === 'Gelir vergisi')!;
  assert.equal(sgk2016.matrah.toFixed(2), '10705.50');
  assert.equal(sgk2016.tutar.toFixed(2), '1498.77');
  assert.equal(iss2016.tutar.toFixed(2), '107.06');
  assert.match(sgk2016.dayanak, /5510 s\.K\. m\.82 üst sınır 6,5 × 1\.647,00 = 10\.705,50 TL/);
  // GV matrahı = 20.000 - 1.498,77 - 107,06 = 18.394,17 TL
  assert.equal(gv2016.matrah.toFixed(2), '18394.17');
  assert.equal(gv2016.tutar.toFixed(2), '3678.83');

  // 2) 2025 dönemi: asgari ücret 26.005,50 TL × 7,5 = 195.041,25 TL
  const g2025 = girdi({
    hesapTarihi: '2025-06-30',
    hizmet: {
      donemler: [{ giris: '2023-01-01', cikis: '2025-06-30' }],
      fesihTarihi: '2025-06-30',
      fesihSekli: 'işveren feshi',
    },
    ucret: { sonBrutAylik: 300000, yontem: 'sabit', yanHaklar: [] },
    parametreler: { sgkUstSiniri: true, vergi: { yontem: 'sabit', sabitOran: 0.2 } },
    kalemler: { yillikIzin: { kullanilanGun: 0, hakEdilenGun: 30, ucretTuru: 'ciplak' } },
  });
  const s2025 = hesapla(g2025, gercekTablolar);
  const izin2025 = kalem(s2025, 'yillikIzin');
  const sgk2025 = izin2025.kesintiler.find((x) => x.ad === 'SGK işçi payı')!;
  const iss2025 = izin2025.kesintiler.find((x) => x.ad === 'İşsizlik sigortası işçi payı')!;
  assert.equal(sgk2025.matrah.toFixed(2), '195041.25');
  assert.equal(sgk2025.tutar.toFixed(2), '27305.78');
  assert.equal(iss2025.tutar.toFixed(2), '1950.41');
  assert.match(sgk2025.dayanak, /5510 s\.K\. m\.82 üst sınır 7,5 × 26\.005,50 = 195\.041,25 TL/);

  // 3) 2026 dönemi (7566 s.K. m.24): asgari ücret 33.030,00 TL × 9 = 297.270,00 TL
  const g2026 = girdi({
    hesapTarihi: '2026-06-30',
    hizmet: {
      donemler: [{ giris: '2024-01-01', cikis: '2026-06-30' }],
      fesihTarihi: '2026-06-30',
      fesihSekli: 'işveren feshi',
    },
    ucret: { sonBrutAylik: 450000, yontem: 'sabit', yanHaklar: [] },
    parametreler: { sgkUstSiniri: true, vergi: { yontem: 'sabit', sabitOran: 0.2 } },
    kalemler: { yillikIzin: { kullanilanGun: 0, hakEdilenGun: 28, ucretTuru: 'ciplak' } },
  });
  const s2026 = hesapla(g2026, gercekTablolar);
  const izin2026 = kalem(s2026, 'yillikIzin');
  const sgk2026 = izin2026.kesintiler.find((x) => x.ad === 'SGK işçi payı')!;
  const iss2026 = izin2026.kesintiler.find((x) => x.ad === 'İşsizlik sigortası işçi payı')!;
  assert.equal(sgk2026.matrah.toFixed(2), '297270.00');
  assert.equal(sgk2026.tutar.toFixed(2), '41617.80');
  assert.equal(iss2026.tutar.toFixed(2), '2972.70');
  assert.match(sgk2026.dayanak, /5510 s\.K\. m\.82 üst sınır 9 × 33\.030,00 = 297\.270,00 TL/);
  const paramSatiri = s2026.parametreler.find((p) => p.ad === 'SGK prime esas kazanç üst sınırı')!;
  assert.equal(paramSatiri.kaynak, 'girdi');
  assert.match(paramSatiri.dayanak, /5510 s\.K\. m\.82/);
});

test('zamanaşımı kırpması: tam dönem atlama, kısmi dönem orantılı kırpma ve UBGT gün eleme', () => {
  const g = girdi({
    hizmet: {
      donemler: [{ giris: '2020-01-01', cikis: '2021-09-15' }],
      fesihTarihi: '2021-09-15',
      fesihSekli: 'işveren feshi',
    },
    ucret: { sonBrutAylik: 9000, yontem: 'sabit', yanHaklar: [] },
    parametreler: {
      zamanasimi: {
        sinirTarihi: '2021-01-15',
        gerekce: 'Islah tarihinden geriye 5 yıllık zamanaşımı def\'i (TBK m.147)',
      },
      vergi: { yontem: 'sabit', sabitOran: 0.15 },
    },
    kalemler: {
      fazlaCalisma: {
        donemler: [
          // Tamamen sınır öncesi (atlanmalı)
          { baslangic: '2020-01-01', bitis: '2020-06-30', haftalikFazlaSaat: 10 },
          // Kısmen sınır öncesi: 2021-01-01 .. 2021-01-28 (28 gün, 14 gün düşülen);
          // 2021-01-15'ten sonrası 14 gün (yarısı), düşülen gün 14 × (14/28) = 7 güne orantılanmalı -> kalan 1 hafta
          { baslangic: '2021-01-01', bitis: '2021-01-28', haftalikFazlaSaat: 10, dislanacakGun: 14 },
        ],
        takdiriIndirim: { oran: 0, gerekce: 'belgeye dayalı' },
      },
      haftaTatili: {
        donemler: [
          // Elle haftaSayisi verilen dönem: 28 günde 4 hafta; yarısı kırpılınca 2 hafta kalmalı
          { baslangic: '2021-01-01', bitis: '2021-01-28', haftalikGun: 1, haftaSayisi: 4 },
        ],
        takdiriIndirim: { oran: 0, gerekce: 'belgeye dayalı' },
      },
      ubgt: {
        gunler: [
          { tarih: '2020-10-29', gun: 1, aciklama: 'Cumhuriyet Bayramı' },
          { tarih: '2021-01-01', gun: 1, aciklama: 'Yılbaşı' },
          { tarih: '2021-05-01', gun: 1, aciklama: 'Emek ve Dayanışma Günü' },
        ],
        takdiriIndirim: { oran: 0, gerekce: 'belgeye dayalı' },
      },
    },
  });

  const s = hesapla(g, testTablo);
  const fc = kalem(s, 'fazlaCalisma');
  // 1 hafta × 10 saat × (9000 / 225 = 40 TL) × 1,5 = 600,00 TL
  assert.equal(fc.hamBrut.toFixed(2), '600.00');
  assert.equal(fc.detay!.satirlar.length, 1);
  assert.equal(fc.detay!.satirlar[0]![0], '15.01.2021 - 28.01.2021');
  assert.ok(fc.notlar.some((n) => n.includes('01.01.2020 - 30.06.2020 dönemi tamamen zamanaşımına uğradığından')));
  assert.ok(fc.notlar.some((n) => n.includes('01.01.2021 - 14.01.2021 kısmı (14 gün) kırpıldı')));

  const ht = kalem(s, 'haftaTatili');
  // 2 hafta × 1 gün × (9000 / 30 = 300 TL) × 1,5 = 900,00 TL
  assert.equal(ht.hamBrut.toFixed(2), '900.00');
  assert.ok(ht.notlar.some((n) => n.includes('01.01.2021 - 14.01.2021 kısmı (14 gün) kırpıldı')));

  const ubgt = kalem(s, 'ubgt');
  // Yalnız 2021-05-01 kalır: 1 gün × 300 TL = 300,00 TL
  assert.equal(ubgt.hamBrut.toFixed(2), '300.00');
  assert.equal(ubgt.detay!.satirlar.length, 1);
  assert.ok(ubgt.notlar.some((n) => n.includes('2 tatil günü (29.10.2020, 01.01.2021) hesap dışı bırakıldı')));

  const zParam = s.parametreler.find((p) => p.ad === 'Zamanaşımı sınır tarihi')!;
  assert.equal(zParam.kaynak, 'girdi');
  assert.match(zParam.deger, /15\.01\.2021/);

  const tanim = JSON.stringify(raporTanimi(s, { uretimZamani: '11.11.2026 12:00', surum: 'mizan test', girdiOzeti: 'abc' }));
  assert.match(tanim, /Zamanaşımı def'i nedeniyle 15\.01\.2021 öncesi/);
});

test('web şema ve form-model sgkUstSiniri ve zamanasimi alanlarını tanır', () => {
  assert.equal(alanAdi('girdi.parametreler.sgkUstSiniri'), 'SGK prime esas kazanç üst sınırı');
  assert.equal(alanAdi('girdi.parametreler.zamanasimi'), 'Zamanaşımı def\'i kırpması');
  assert.equal(alanAdi('girdi.parametreler.zamanasimi.sinirTarihi'), 'Zamanaşımı sınır tarihi');
  const tablesViewMetni = readFileSync(join(import.meta.dirname, '..', 'web', 'src', 'TablesView.tsx'), 'utf8');
  assert.match(tablesViewMetni, /ustSinirKati:\s*'Üst sınır katı'/);
  assert.match(tablesViewMetni, /key === 'ustSinirKati'/);
  assert.equal(hataYolu('Hata: parametreler.sgkUstSiniri'), 'girdi.parametreler.sgkUstSiniri');
  assert.equal(hataYolu('Hata: parametreler.zamanasimi'), 'girdi.parametreler.zamanasimi');

  const yaml = [
    'dosya: { mahkeme: X İş Mahkemesi, esasNo: 2026/1, kaynak: kendi dosyam, altAlan: "60.02" }',
    'hesapTarihi: 2026-06-30',
    'hizmet: { donemler: [{ giris: 2020-01-01, cikis: 2026-06-30 }], fesihTarihi: 2026-06-30, fesihSekli: fesih }',
    'ucret: { sonBrutAylik: 40000, yontem: sabit }',
    'parametreler:',
    '  sgkUstSiniri: true',
    '  zamanasimi: { sinirTarihi: 2021-06-30, gerekce: "dava tarihinden 5 yıl öncesi" }',
    '  vergi: { yontem: sabit, sabitOran: 0.15 }',
    'kalemler: { kidem: { hakVar: true, gerekce: x } }',
  ].join('\n');
  const dogrulanan = formuDogrula(yamlForma(yaml));
  assert.equal(dogrulanan.parametreler.sgkUstSiniri, true);
  assert.deepEqual(dogrulanan.parametreler.zamanasimi, {
    sinirTarihi: '2021-06-30',
    gerekce: 'dava tarihinden 5 yıl öncesi',
  });
});

test('SGK üst sınırı: sgkAySayisi verildiğinde tavan ay sayısıyla çarpılır', () => {
  // 2026-06-30: aylık tavan 33.030 × 9 = 297.270 TL; 4 aylık kalemde (ör. boşta geçen süre ücreti) 4 × 297.270 = 1.189.080 TL
  const kes = kesintiHesapla(
    d(1500000),
    'ucret',
    '2026-06-30',
    2026,
    { yontem: 'sabit', sabitOran: d('0.20'), oncekiKumulatifMatrah: d(0) },
    new VergiBirikimi(d(0)),
    gercekTablolar,
    new KaynakKaydi(),
    true,
    d(4),
  );
  const sgk = kes.kesintiler.find((x) => x.ad === 'SGK işçi payı')!;
  const iss = kes.kesintiler.find((x) => x.ad === 'İşsizlik sigortası işçi payı')!;
  assert.equal(sgk.matrah.toFixed(2), '1189080.00');
  assert.equal(sgk.tutar.toFixed(2), '166471.20');
  assert.equal(iss.tutar.toFixed(2), '11890.80');
  assert.match(sgk.dayanak, /5510 s\.K\. m\.82 üst sınır 9 × 33\.030,00 × 4 ay = 1\.189\.080,00 TL/);
});

test('SGK üst sınırı: boşta geçen süre ücreti (4 ay) ve çok aylı ücret alacağı (3 ay) tavanı ay sayısıyla çarpar', () => {
  const g = girdi({
    hesapTarihi: '2026-06-30',
    hizmet: {
      donemler: [{ giris: '2024-01-01', cikis: '2026-06-30' }],
      fesihTarihi: '2026-06-30',
      fesihSekli: 'geçersiz fesih',
    },
    ucret: { sonBrutAylik: 350000, yontem: 'sabit', yanHaklar: [] },
    parametreler: { sgkUstSiniri: true, vergi: { yontem: 'sabit', sabitOran: 0.2 } },
    kalemler: {
      bostaGecenSure: { hakVar: true, gerekce: 'işe iade kararı kesinleşti' },
      ucretAlacagi: {
        gunKurali: 'tam-ay',
        donemler: [{ baslangic: '2026-04-01', bitis: '2026-06-30' }],
      },
    },
  });
  const s = hesapla(g, gercekTablolar);

  // Boşta geçen süre: 4 × 350.000 = 1.400.000 TL > 4 × 297.270 = 1.189.080 TL
  const bgs = kalem(s, 'bostaGecenSure');
  assert.equal(bgs.brut.toFixed(2), '1400000.00');
  const bgsSgk = bgs.kesintiler.find((x) => x.ad === 'SGK işçi payı')!;
  assert.equal(bgsSgk.matrah.toFixed(2), '1189080.00');
  assert.match(bgsSgk.dayanak, /× 4 ay = 1\.189\.080,00 TL/);

  // Ücret alacağı (Nisan, Mayıs, Haziran = 3 takvim ayı): 3 × 350.000 = 1.050.000 TL > 3 × 297.270 = 891.810 TL
  const ua = kalem(s, 'ucretAlacagi');
  assert.equal(ua.brut.toFixed(2), '1050000.00');
  const uaSgk = ua.kesintiler.find((x) => x.ad === 'SGK işçi payı')!;
  assert.equal(uaSgk.matrah.toFixed(2), '891810.00');
  assert.match(uaSgk.dayanak, /× 3 ay = 891\.810,00 TL/);

  // Tek 31 günlük ay (Mayıs 2026) için 1 aylık tavan (297.270 TL) uygulanır
  const tekAy = hesapla(
    girdi({
      hesapTarihi: '2026-06-30',
      hizmet: {
        donemler: [{ giris: '2024-01-01', cikis: '2026-06-30' }],
        fesihTarihi: '2026-06-30',
        fesihSekli: 'fesih',
      },
      ucret: { sonBrutAylik: 350000, yontem: 'sabit', yanHaklar: [] },
      parametreler: { sgkUstSiniri: true, vergi: { yontem: 'sabit', sabitOran: 0.2 } },
      kalemler: { ucretAlacagi: { donemler: [{ baslangic: '2026-05-01', bitis: '2026-05-31' }] } },
    }),
    gercekTablolar,
  );
  assert.equal(kalem(tekAy, 'ucretAlacagi').kesintiler.find((x) => x.ad === 'SGK işçi payı')!.matrah.toFixed(2), '297270.00');
});

test('zamanaşımı kırpması: ücret alacağı dönemlerini ve ikramiye satırlarını 4857 s.K. m.32/8 uyarınca kırpar', () => {
  const g = girdi({
    hizmet: {
      donemler: [{ giris: '2020-01-01', cikis: '2021-09-15' }],
      fesihTarihi: '2021-09-15',
      fesihSekli: 'işveren feshi',
    },
    ucret: { sonBrutAylik: 9000, yontem: 'sabit', yanHaklar: [] },
    parametreler: {
      zamanasimi: {
        sinirTarihi: '2021-01-15',
        gerekce: 'Dava tarihinden geriye 5 yıllık zamanaşımı def\'i (4857 s.K. m.32/8)',
      },
      vergi: { yontem: 'sabit', sabitOran: 0.15 },
    },
    kalemler: {
      ucretAlacagi: {
        donemler: [
          // Tamamen sınır öncesi -> atlanmalı
          { baslangic: '2020-05-01', bitis: '2020-05-31' },
          // Kısmen sınır öncesi: 28 takvim günü, elle gunSayisi: 20, odenenBrut: 600 -> yarısı (14/28) kalır: gunSayisi=10, odenenBrut=300
          { baslangic: '2021-01-01', bitis: '2021-01-28', gunSayisi: 20, odenenBrut: 600 },
        ],
      },
      ikramiye: {
        satirlar: [
          { ad: '2020 ikramiyesi', tarih: '2020-12-31', hesapSekli: 'tutar', deger: 3000 },
          { ad: '2021 ikramiyesi', tarih: '2021-06-30', hesapSekli: 'gunluk', deger: 10 },
        ],
      },
    },
  });

  const s = hesapla(g, testTablo);
  const ua = kalem(s, 'ucretAlacagi');
  // 10 gün × (9.000 / 30 = 300 TL) - 300 TL = 2.700,00 TL
  assert.equal(ua.hamBrut.toFixed(2), '2700.00');
  assert.equal(ua.detay!.satirlar.length, 1);
  assert.ok(ua.notlar.some((n) => n.includes('01.05.2020 - 31.05.2020 dönemi tamamen zamanaşımına uğradığından')));
  assert.ok(ua.notlar.some((n) => n.includes('01.01.2021 - 14.01.2021 kısmı (14 gün) kırpıldı')));

  const ikr = kalem(s, 'ikramiye');
  // Yalnız 2021 ikramiyesi kalır: 10 × 300 = 3.000,00 TL
  assert.equal(ikr.hamBrut.toFixed(2), '3000.00');
  assert.equal(ikr.detay!.satirlar.length, 1);
  assert.ok(ikr.notlar.some((n) => n.includes('"2020 ikramiyesi" (31.12.2020) satırı hesap dışı bırakıldı')));

  const tanim = JSON.stringify(raporTanimi(s, { uretimZamani: '11.11.2026 12:00', surum: 'mizan test', girdiOzeti: 'abc' }));
  assert.match(tanim, /ücret alacağı, ikramiye, fazla çalışma, hafta tatili ve UBGT/);
});
