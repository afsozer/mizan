import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hesapla } from '../src/hesap.ts';
import { mevduatFaiziHesapla } from '../src/faiz.ts';
import { d } from '../src/para.ts';
import { ihbarHaftasi } from '../src/kalemler/ihbar.ts';
import { izinGunu, yilDolumlari } from '../src/kalemler/yillik-izin.ts';
import { girdi, testTablolari } from './yardimci.ts';

const t = testTablolari();
const kalem = (s: ReturnType<typeof hesapla>, kod: string) => s.kalemler.find((k) => k.kod === kod)!;
const ust = (temel: Record<string, unknown>, ek: Record<string, unknown>) => ({ ...temel, ...ek });

test('kıdem: tavan, yıl/ay/gün oranlaması ve yalnız damga vergisi', () => {
  const s = hesapla(girdi(), t);
  const k = kalem(s, 'kidem');
  // giydirilmiş 10.000 > tavan 6.000; 6000 + 6000/12×8 + 6000/365×15
  assert.equal(k.hamBrut.toFixed(2), '10246.58');
  assert.deepEqual(
    k.kesintiler.map((x) => [x.ad, x.tutar.toFixed(2)]),
    [['Damga vergisi', '77.77']],
  );
  assert.equal(k.net.toFixed(2), '10168.81');
});

test('kıdem: bir yıldan kısa hizmette doğmaz', () => {
  const g = girdi({
    hizmet: { donemler: [{ giris: '2021-01-01', cikis: '2021-09-15' }], fesihTarihi: '2021-09-15', fesihSekli: 'fesih' },
  });
  assert.equal(kalem(hesapla(g, t), 'kidem').brut.toString(), '0');
});

test('tek dönemde 11 ay 30 gün bir yıla yuvarlanmaz', () => {
  // 02.01.2020 - 31.12.2020: takvimde 11 ay 30 gün; 30 gün = 1 ay kuralı yalnız dönem toplamında
  const g = girdi({
    hizmet: { donemler: [{ giris: '2020-01-02', cikis: '2020-12-31' }], fesihTarihi: '2020-12-31', fesihSekli: 'fesih' },
    ucret: { sonBrutAylik: 3000, yontem: 'sabit' },
    kalemler: { kidem: { hakVar: true, gerekce: 'x' }, ihbar: { hakVar: true, gerekce: 'x' } },
  });
  const s = hesapla(g, t);
  assert.equal(kalem(s, 'kidem').brut.toString(), '0');
  assert.equal(kalem(s, 'ihbar').hamBrut.toFixed(2), '2800.00'); // 4 hafta, 11 ay 30 gün
});

test('ihbar: hafta sınırları', () => {
  assert.deepEqual(ihbarHaftasi({ yil: 0, ay: 5, gun: 29 }), { hafta: 2, sinirda: false });
  assert.deepEqual(ihbarHaftasi({ yil: 0, ay: 6, gun: 0 }), { hafta: 4, sinirda: false }); // (a) "altı aydan az" değil
  assert.deepEqual(ihbarHaftasi({ yil: 1, ay: 6, gun: 0 }), { hafta: 4, sinirda: true }); // (b) ve (c) çakışır
  assert.deepEqual(ihbarHaftasi({ yil: 1, ay: 6, gun: 1 }), { hafta: 6, sinirda: false });
  assert.deepEqual(ihbarHaftasi({ yil: 3, ay: 0, gun: 0 }), { hafta: 6, sinirda: false }); // (d) "üç yıldan fazla" değil
  assert.deepEqual(ihbarHaftasi({ yil: 3, ay: 0, gun: 1 }), { hafta: 8, sinirda: false });
});

test('ihbar: giydirilmiş günlük ücret × 42 gün, gelir ve damga vergisi', () => {
  const g = girdi({ kalemler: { ihbar: { hakVar: true, gerekce: 'bildirimsiz fesih' } } });
  const k = kalem(hesapla(g, t), 'ihbar');
  assert.equal(k.hamBrut.toFixed(2), '14000.00');
  assert.deepEqual(
    k.kesintiler.map((x) => x.tutar.toFixed(2)),
    ['2100.00', '106.26'],
  );
  assert.equal(k.net.toFixed(2), '11793.74');
});

test('yıllık izin: hak ediş basamakları, yaş kuralı ve boşluk kaydırması', () => {
  assert.equal(izinGunu(5).gun, 14);
  assert.equal(izinGunu(6).gun, 20);
  assert.equal(izinGunu(15).gun, 26);
  assert.equal(izinGunu(2, 50).gun, 20);
  assert.equal(izinGunu(2, 18).gun, 20);
  assert.equal(izinGunu(2, 19).gun, 14);
  assert.deepEqual(
    yilDolumlari([
      { giris: '2019-01-01', cikis: '2019-06-30' },
      { giris: '2019-08-01', cikis: '2021-09-15' },
    ]),
    ['2020-02-01', '2021-02-01'],
  );
});

test('yıllık izin: bakiye × çıplak günlük ücret, SGK dahil kesintiler', () => {
  const g = girdi({ kalemler: { yillikIzin: { kullanilanGun: 4, ucretTuru: 'ciplak' } } });
  const k = kalem(hesapla(g, t), 'yillikIzin');
  assert.equal(k.hamBrut.toFixed(2), '3000.00');
  assert.deepEqual(
    k.kesintiler.map((x) => x.tutar.toFixed(2)),
    ['420.00', '30.00', '382.50', '22.77'],
  );
  assert.equal(k.net.toFixed(2), '2144.73');
});

test('yıllık izin: 50 yaş kuralı hak edilen günü artırır', () => {
  const g = girdi({
    hizmet: {
      donemler: [{ giris: '2014-05-01', cikis: '2021-09-15' }],
      fesihTarihi: '2021-09-15',
      fesihSekli: 'fesih',
      dogumTarihi: '1966-01-01',
    },
    kalemler: { yillikIzin: { kullanilanGun: 0, ucretTuru: 'ciplak' } },
  });
  const k = kalem(hesapla(g, t), 'yillikIzin');
  // 1. yıl 14 (49 yaş), 2-5. yıllar 20 (50 yaş ve üstü), 6-7. yıllar 20
  assert.equal(k.detay!.toplam![3], '134');
});

const asgariUcretli = { ucret: { sonBrutAylik: 'asgari', yontem: 'asgari' } };

test('fazla çalışma: ücret değişiminde bölünür, düşülen gün orantılı dağılır', () => {
  const donem = { baslangic: '2020-12-01', bitis: '2021-01-31', haftalikFazlaSaat: 10 };
  const sifir = { oran: 0, gerekce: 'belgeye dayalı' };
  const g1 = girdi(ust(asgariUcretli, { kalemler: { fazlaCalisma: { donemler: [donem], takdiriIndirim: sifir } } }));
  const k1 = kalem(hesapla(g1, t), 'fazlaCalisma');
  assert.equal(k1.detay!.satirlar.length, 2);
  assert.equal(k1.hamBrut.toFixed(2), '1948.57');

  const g2 = girdi(
    ust(asgariUcretli, {
      kalemler: {
        fazlaCalisma: { donemler: [{ ...donem, dislanacakGun: 14 }], takdiriIndirim: { oran: 0.3, gerekce: 'tanık beyanı' } },
      },
    }),
  );
  const k2 = kalem(hesapla(g2, t), 'fazlaCalisma');
  assert.equal(k2.hamBrut.toFixed(2), '1508.57');
  assert.equal(k2.indirim!.tutar.toFixed(2), '452.57');
  assert.equal(k2.brut.toFixed(2), '1056.00');
});

test('fazla çalışma: tam hafta seçeneği', () => {
  const g = girdi(
    ust(asgariUcretli, {
      parametreler: { haftaHesabi: 'tam', vergi: { yontem: 'sabit', sabitOran: 0.15 } },
      kalemler: {
        fazlaCalisma: {
          donemler: [{ baslangic: '2020-12-01', bitis: '2021-01-31', haftalikFazlaSaat: 10, dislanacakGun: 14 }],
          takdiriIndirim: { oran: 0, gerekce: 'yok' },
        },
      },
    }),
  );
  assert.equal(kalem(hesapla(g, t), 'fazlaCalisma').hamBrut.toFixed(2), '1320.00');
});

test('dönem dışı ve çakışan girdiler reddedilir, tablo bitişinden sonrası hesaplanmaz', () => {
  const sifir = { oran: 0, gerekce: 'x' };
  assert.throws(
    () => girdi({ kalemler: { fazlaCalisma: { donemler: [{ baslangic: '2021-01-01', bitis: '2021-12-31', haftalikFazlaSaat: 5 }], takdiriIndirim: sifir } } }),
    /hizmet döneminin içinde değil/,
  );
  assert.throws(
    () =>
      girdi({
        kalemler: {
          fazlaCalisma: {
            donemler: [
              { baslangic: '2021-01-01', bitis: '2021-03-31', haftalikFazlaSaat: 5 },
              { baslangic: '2021-03-01', bitis: '2021-06-30', haftalikFazlaSaat: 5 },
            ],
            takdiriIndirim: sifir,
          },
        },
      }),
    /çakışıyor/,
  );
  assert.throws(() => girdi({ kalemler: { ubgt: { gunler: [{ tarih: '2019-10-29', gun: 1 }], takdiriIndirim: sifir } } }), /dışında/);
  assert.throws(() => girdi({ ucret: { sonBrutAylik: 9000, yontem: 'sabit', donemsel: [] } }), /yalnız yöntem "donemsel"/);
  assert.throws(() => girdi({ kalemler: { kidem: { hakVar: true, gerekce: 'x', mahsup: { tutar: 10.555, aciklama: 'x' } } } }), /kuruş/);
});

test('dönemsel ücret listesindeki boşluk hata verir', () => {
  const g = girdi({
    ucret: {
      sonBrutAylik: 9000,
      yontem: 'donemsel',
      donemsel: [
        { baslangic: '2020-01-01', bitis: '2020-06-30', brutAylik: 5000 },
        { baslangic: '2020-09-01', bitis: '2021-09-15', brutAylik: 6000 },
      ],
    },
    kalemler: {
      fazlaCalisma: {
        donemler: [{ baslangic: '2020-01-01', bitis: '2020-12-31', haftalikFazlaSaat: 5 }],
        takdiriIndirim: { oran: 0, gerekce: 'x' },
      },
    },
  });
  assert.throws(() => hesapla(g, t), /01\.07\.2020 tarihini kapsayan satır yok/);
});

test('hafta tatili ve UBGT', () => {
  const g = girdi(
    ust(asgariUcretli, {
      kalemler: {
        haftaTatili: {
          donemler: [{ baslangic: '2021-01-01', bitis: '2021-01-28', haftalikGun: 1 }],
          takdiriIndirim: { oran: 0, gerekce: 'yok' },
        },
        ubgt: {
          gunler: [
            { tarih: '2020-10-29', gun: 1 },
            { tarih: '2021-05-01', gun: 0.5 },
            { tarih: '2021-07-15', gun: 1 },
          ],
          takdiriIndirim: { oran: 0, gerekce: 'yok' },
        },
      },
    }),
  );
  const s = hesapla(g, t);
  assert.equal(kalem(s, 'haftaTatili').hamBrut.toFixed(2), '720.00');
  assert.equal(kalem(s, 'ubgt').hamBrut.toFixed(2), '310.00');
});

test('asgari ücrete oranlama geriye yürür', () => {
  const g = girdi({
    ucret: { sonBrutAylik: 9000, sonUcretTarihi: '2021-09-15', yontem: 'asgari-orani', yanHaklar: [] },
    kalemler: { ubgt: { gunler: [{ tarih: '2020-06-01', gun: 1 }], takdiriIndirim: { oran: 0, gerekce: 'yok' } } },
  });
  // oran 9000/4500 = 2; 2020'de 3000 × 2 = 6000 → günlük 200
  assert.equal(kalem(hesapla(g, t), 'ubgt').hamBrut.toFixed(2), '200.00');
});

test('gelir vergisi dilim yönteminde kalemler sırayla birikir', () => {
  const g = girdi({
    parametreler: { vergi: { yontem: 'dilim' } },
    kalemler: {
      ihbar: { hakVar: true, gerekce: 'x' },
      yillikIzin: { kullanilanGun: 4, ucretTuru: 'ciplak' },
    },
  });
  const s = hesapla(g, t);
  const gv = (kod: string) => kalem(s, kod).kesintiler.find((x) => x.ad === 'Gelir vergisi')!.tutar.toFixed(2);
  assert.equal(gv('ihbar'), '2300.00'); // V(14000)
  assert.equal(gv('yillikIzin'), '510.00'); // V(16550) - V(14000)
});

test('yasal faiz: oran değişiminde bölünür, gün = bitiş - başlangıç; dava ve ıslah ayrı', () => {
  const g = girdi({
    kalemler: {
      ihbar: {
        hakVar: true,
        gerekce: 'x',
        faiz: [
          { tur: 'yasal', baslangic: '2020-12-15', gerekce: 'dava', tutar: 1000 },
          { tur: 'yasal', baslangic: '2021-12-31', gerekce: 'ıslah' },
        ],
      },
    },
  });
  const ihbar = kalem(hesapla(g, t), 'ihbar').faizler;
  assert.deepEqual(
    ihbar[0]!.kesitler.map((x) => x.gun),
    [16, 365],
  );
  assert.equal(ihbar[0]!.toplam.toFixed(2), '123.95'); // 1000 × (0,09 × 16 + 0,12 × 365) / 365
  assert.equal(ihbar[1]!.matrah.toFixed(2), '13000.00');
  assert.equal(ihbar[1]!.toplam.toString(), '0');
});

test('mevduat faizi: yıl içi değişiklik dikkate alınmaz, yıldönümünde oran yenilenir', () => {
  const tek = mevduatFaiziHesapla(t.mevduatFaizi, d('10246.58'), '2021-03-15', '2021-12-31', d(365), 'fesih');
  // tablo 01.04.2021'de %30'a çıkıyor ama yıl boyunca 15.03.2021'deki %20 uygulanır
  assert.deepEqual(
    tek.kesitler.map((x) => [x.oranTarihi, x.gun, x.oran.toString()]),
    [['2021-03-15', 291, '0.2']],
  );
  assert.equal(tek.toplam.toFixed(2), '1633.84');

  const iki = mevduatFaiziHesapla(t.mevduatFaizi, d(1000), '2020-06-01', '2021-12-31', d(365), 'fesih');
  assert.deepEqual(
    iki.kesitler.map((x) => [x.oranTarihi, x.gun, x.oran.toString()]),
    [
      ['2020-06-01', 365, '0.2'],
      ['2021-06-01', 213, '0.3'],
    ],
  );
  assert.equal(iki.toplam.toFixed(2), '375.07'); // 200 + 1000 × 0,30 × 213 / 365
});

test('asgari ücret istisnası ödeme ayında bir kez; ücret kalemi yoksa ihbar ve kıdeme', () => {
  const g = girdi({
    hesapTarihi: '2022-12-31',
    parametreler: { vergi: { yontem: 'dilim', asgariUcretIstisnasi: true } },
    kalemler: { kidem: { hakVar: true, gerekce: 'x' }, ihbar: { hakVar: true, gerekce: 'x' } },
  });
  const s = hesapla(g, t);
  // Aralık 2022: önceki aylar 11 × 3825 = 42075; V(45900) - V(42075) = 3825 × 0,20
  const ihbar = kalem(s, 'ihbar');
  const istisna = (k: typeof ihbar, ad: string) => k.kesintiler.find((x) => x.ad === ad)?.tutar.toFixed(2);
  assert.equal(istisna(ihbar, 'Asgari ücret GV istisnası'), '-765.00');
  assert.equal(ihbar.net.toFixed(2), '12358.74');
  // DV istisnası 4500 × 0,00759 önce kıdemin damga vergisine
  const kidem = kalem(s, 'kidem');
  assert.equal(istisna(kidem, 'Asgari ücret DV istisnası'), '-34.16');
  assert.equal(kidem.net.toFixed(2), '10202.97');
  assert.equal(istisna(ihbar, 'Asgari ücret DV istisnası'), undefined);

  const once = girdi({ parametreler: { vergi: { yontem: 'dilim', asgariUcretIstisnasi: true } } });
  assert.throws(() => hesapla(once, t), /01\.01\.2022/);
});

test('indirim ve mahsup birlikteyse sıra açıkça istenir', () => {
  const kalemler = {
    fazlaCalisma: {
      donemler: [{ baslangic: '2021-01-01', bitis: '2021-01-28', haftalikFazlaSaat: 10 }],
      takdiriIndirim: { oran: 0.3, gerekce: 'tanık' },
      mahsup: { tutar: 100, aciklama: 'bordroda ödenen' },
    },
  };
  assert.throws(() => hesapla(girdi({ kalemler }), t), /indirimMahsupSirasi/);
  const g = girdi({ kalemler, parametreler: { indirimMahsupSirasi: 'once-mahsup', vergi: { yontem: 'sabit', sabitOran: 0.15 } } });
  const k = kalem(hesapla(g, t), 'fazlaCalisma');
  // sabit 9000: 4 hafta × 10 × 40 × 1,5 = 2400; (2400 - 100) × 0,7
  assert.equal(k.brut.toFixed(2), '1610.00');
});
