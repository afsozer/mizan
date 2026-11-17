import { test } from 'node:test';
import assert from 'node:assert/strict';
import { d, Decimal } from '../src/para.ts';
import { girdiCoz } from '../src/girdi.ts';
import { hesapla } from '../src/hesap.ts';
import { UbgtTakvimi } from '../src/tablolar.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';
import { girdi, testTablolari } from './yardimci.ts';

test('ubgt-takvimi.json: 2016-2027 yillari, 2016 15 Temmuz istisnasi ve sabit/dini toplamlar', () => {
  const tablolar = tablolariYukle();
  const takvim = tablolar.ubgtTakvimi;
  assert.equal(takvim.yillar.length, 12);
  assert.deepEqual(
    takvim.yillar.map((y) => y.yil),
    [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027],
  );

  // 2016 yilinda 15 Temmuz genel tatil degildir (6752 s.K. yururluk: 29.10.2016)
  const yil2016 = takvim.yil(2016);
  assert.equal(yil2016.gunler.some((g) => g.tarih === '2016-07-15'), false);
  const sabit2016 = yil2016.gunler
    .filter((g) => g.tur === 'sabit')
    .reduce((t, g) => t.plus(d(g.gun)), new Decimal(0));
  const dini2016 = yil2016.gunler
    .filter((g) => g.tur === 'dini')
    .reduce((t, g) => t.plus(d(g.gun)), new Decimal(0));
  assert.equal(sabit2016.toString(), '6.5');
  assert.equal(dini2016.toString(), '8');

  // 2017-2027 arasinda 15 Temmuz her yil 1 gun sabit tatildir, sabit toplam 7.5 gundur
  for (let yil = 2017; yil <= 2027; yil++) {
    const satir = takvim.yil(yil);
    const temmuz15 = satir.gunler.find((g) => g.tarih === `${yil}-07-15` && g.tur === 'sabit');
    assert.ok(temmuz15, `${yil}-07-15 sabit tatil olmali`);
    assert.equal(temmuz15.gun, '1');

    const sabitToplam = satir.gunler
      .filter((g) => g.tur === 'sabit')
      .reduce((t, g) => t.plus(d(g.gun)), new Decimal(0));
    const diniToplam = satir.gunler
      .filter((g) => g.tur === 'dini')
      .reduce((t, g) => t.plus(d(g.gun)), new Decimal(0));
    assert.equal(sabitToplam.toString(), '7.5', `${yil} sabit tatil toplami 7.5 olmali`);
    assert.equal(diniToplam.toString(), '8', `${yil} dini bayram toplami 8 olmali`);
  }
});

test('UBGT: 2016 Temmuz doneminde 15 Temmuz tatil sayilmaz ve aciklama notu dusulur', () => {
  const t = testTablolari();
  const s2016 = hesapla(
    girdi({
      hesapTarihi: '2021-12-31',
      hizmet: {
        donemler: [{ giris: '2016-01-01', cikis: '2017-12-31' }],
        fesihTarihi: '2017-12-31',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        ubgt: {
          takvim: {
            donemler: [{ baslangic: '2016-07-10', bitis: '2016-07-20' }],
          },
          takdiriIndirim: { oran: 0, gerekce: 'indirim yok' },
        },
      },
    }),
    t,
  );
  const ubgt2016 = s2016.kalemler.find((k) => k.kod === 'ubgt')!;
  assert.equal(ubgt2016.detay!.satirlar.length, 0);
  assert.equal(ubgt2016.brut.toFixed(2), '0.00');
  assert.ok(ubgt2016.notlar.some((n) => n.includes('6752') && n.includes('29.10.2016')));

  // 2017 Temmuz ayni tarih araliginda 15 Temmuz 1 gun olarak hesaplanir
  const s2017 = hesapla(
    girdi({
      hesapTarihi: '2021-12-31',
      hizmet: {
        donemler: [{ giris: '2016-01-01', cikis: '2017-12-31' }],
        fesihTarihi: '2017-12-31',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        ubgt: {
          takvim: {
            donemler: [{ baslangic: '2017-07-10', bitis: '2017-07-20' }],
          },
          takdiriIndirim: { oran: 0, gerekce: 'indirim yok' },
        },
      },
    }),
    t,
  );
  const ubgt2017 = s2017.kalemler.find((k) => k.kod === 'ubgt')!;
  assert.equal(ubgt2017.detay!.satirlar.length, 1);
  assert.equal(ubgt2017.detay!.satirlar[0]![0], '15.07.2017');
  assert.equal(ubgt2017.detay!.satirlar[0]![2], '1');
  assert.equal(ubgt2017.brut.toFixed(2), '300.00');
});

test('UBGT: resmi ve dini tatil ayni miladi gune denk geldiginde cift sayim yapilmaz, yuksek katsayi alinir', () => {
  const t = tablolariYukle();

  // 2022-05-01: 1 Mayis (1 gun) + Ramazan Bayrami arifesi (0,5 gun) -> 1 gun alinmali (toplam 15 gun)
  const s2022 = hesapla(
    girdi({
      hesapTarihi: '2023-12-31',
      hizmet: {
        donemler: [{ giris: '2022-01-01', cikis: '2023-12-31' }],
        fesihTarihi: '2023-12-31',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        ubgt: {
          takvim: {
            donemler: [{ baslangic: '2022-01-01', bitis: '2022-12-31' }],
          },
          takdiriIndirim: { oran: 0, gerekce: 'indirim yok' },
        },
      },
    }),
    t,
  );
  const ubgt2022 = s2022.kalemler.find((k) => k.kod === 'ubgt')!;
  assert.deepEqual(ubgt2022.bilgiler.find((b) => b[0] === 'Toplam gün'), ['Toplam gün', '15']);
  const mayis1 = ubgt2022.detay!.satirlar.filter((s) => s[0] === '01.05.2022');
  assert.equal(mayis1.length, 1);
  assert.equal(mayis1[0]![2], '1');
  assert.ok(ubgt2022.notlar.some((n) => n.includes('01.05.2022') && n.includes('çift sayım yapılmadı')));

  // 2023-04-23: 23 Nisan (1 gun) + Ramazan Bayrami 3. gun (1 gun) -> 1 gun alinmali (toplam 14,5 gun)
  const s2023 = hesapla(
    girdi({
      hesapTarihi: '2023-12-31',
      hizmet: {
        donemler: [{ giris: '2022-01-01', cikis: '2023-12-31' }],
        fesihTarihi: '2023-12-31',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        ubgt: {
          takvim: {
            donemler: [{ baslangic: '2023-01-01', bitis: '2023-12-31' }],
          },
          takdiriIndirim: { oran: 0, gerekce: 'indirim yok' },
        },
      },
    }),
    t,
  );
  const ubgt2023 = s2023.kalemler.find((k) => k.kod === 'ubgt')!;
  assert.deepEqual(ubgt2023.bilgiler.find((b) => b[0] === 'Toplam gün'), ['Toplam gün', '14,5']);
  const nisan23 = ubgt2023.detay!.satirlar.filter((s) => s[0] === '23.04.2023');
  assert.equal(nisan23.length, 1);
  assert.equal(nisan23[0]![2], '1');
  assert.ok(ubgt2023.notlar.some((n) => n.includes('23.04.2023') && n.includes('çift sayım yapılmadı')));

  // 2027-05-19: 19 Mayis (1 gun) + Kurban Bayrami 4. gun (1 gun) -> 1 gun alinmali (toplam 14,5 gun)
  const turetildi2027 = t.ubgtTakvimi.turet({ donemler: [{ baslangic: '2027-01-01', bitis: '2027-12-31' }] });
  assert.equal(turetildi2027.gunler.length, 16);
  const toplam2027 = turetildi2027.gunler.reduce((acc, g) => acc.plus(g.gun), new Decimal(0));
  assert.equal(toplam2027.toString(), '14.5');
  const mayis19 = turetildi2027.gunler.filter((g) => g.tarih === '2027-05-19');
  assert.equal(mayis19.length, 1);
  assert.equal(mayis19[0]!.gun.toString(), '1');
  assert.ok(turetildi2027.notlar.some((n) => n.includes('19.05.2027') && n.includes('çift sayım yapılmadı')));

  // Sabit 0.5 gun (28 Ekim) ile dini 1 gun cakistiginda yuksek olan 1 gun alinir
  const yapayTakvim = new UbgtTakvimi(
    {
      tablo: 'ubgt-takvimi',
      ad: 'Test UBGT',
      dogrulamaTarihi: '2026-10-22',
      satirlar: [
        {
          yil: 2021,
          kaynak: { ad: '2429 s.K.', url: 'https://www.mevzuat.gov.tr', dogrulama: 'test' },
          gunler: [
            { tarih: '2021-10-28', ad: 'Cumhuriyet Bayrami arifesi', tur: 'sabit', gun: '0.5' },
            { tarih: '2021-10-28', ad: 'Bayram 1. gun', tur: 'dini', gun: '1' },
          ],
        },
      ],
    },
    'test',
  );
  const turetildi = yapayTakvim.turet({ donemler: [{ baslangic: '2021-10-01', bitis: '2021-10-31' }] });
  assert.equal(turetildi.gunler.length, 1);
  assert.equal(turetildi.gunler[0]!.gun.toString(), '1');
  assert.ok(turetildi.notlar.some((n) => n.includes('28.10.2021') && n.includes('çift sayım yapılmadı')));
});

test('UBGT takvim secenekleri: diniBayramlarDahil, haricTarihler ve gunler ile birlestirme', () => {
  const t = testTablolari();

  // diniBayramlarDahil: false -> 2021 yilinda yalniz sabit tatiller (7,5 gun)
  const yalnizSabit = hesapla(
    girdi({
      hizmet: {
        donemler: [{ giris: '2021-01-01', cikis: '2021-12-31' }],
        fesihTarihi: '2021-12-31',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        ubgt: {
          takvim: { diniBayramlarDahil: false },
          takdiriIndirim: { oran: 0, gerekce: 'indirim yok' },
        },
      },
    }),
    t,
  );
  const ubgtSabit = yalnizSabit.kalemler.find((k) => k.kod === 'ubgt')!;
  assert.deepEqual(ubgtSabit.bilgiler.find((b) => b[0] === 'Toplam gün'), ['Toplam gün', '7,5']);

  // haricTarihler ve gunler ile takvim birlestirme (ayni gun mukerrer sayilmaz)
  const birlesik = hesapla(
    girdi({
      hizmet: {
        donemler: [{ giris: '2021-04-01', cikis: '2021-05-31' }],
        fesihTarihi: '2021-05-31',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        ubgt: {
          gunler: [
            { tarih: '2021-04-23', gun: 1 }, // takvimde de var -> mukerrer sayilmamali
            { tarih: '2021-05-12', gun: 0.5, aciklama: 'Ramazan Bayrami arifesi' }, // dini bayram takvimde kapali ama elle eklendi
          ],
          takvim: {
            donemler: [{ baslangic: '2021-04-01', bitis: '2021-05-31' }],
            diniBayramlarDahil: false,
            haricTarihler: ['2021-05-19'],
          },
          takdiriIndirim: { oran: 0, gerekce: 'indirim yok' },
        },
      },
    }),
    t,
  );
  const ubgtBirlesik = birlesik.kalemler.find((k) => k.kod === 'ubgt')!;
  // 2021 Nisan-Mayis sabit tatiller: 23 Nisan (1), 1 Mayis (1), 19 Mayis (haric tutuldu).
  // Elle: 23 Nisan (1, mukerrer sayilmaz) + 12 Mayis (0.5) -> toplam 3 satir, 2,5 gun
  assert.equal(ubgtBirlesik.detay!.satirlar.length, 3);
  assert.deepEqual(ubgtBirlesik.bilgiler.find((b) => b[0] === 'Toplam gün'), ['Toplam gün', '2,5']);
  assert.ok(ubgtBirlesik.notlar.some((n) => n.includes('mükerrer sayılmadı')));

  // Web formundaki liste satiri bicimi ({ tarih: '...' }) de haricTarihler icinde kabul edilir
  const webBicimi = girdi({
    hizmet: {
      donemler: [{ giris: '2021-04-01', cikis: '2021-05-31' }],
      fesihTarihi: '2021-05-31',
      fesihSekli: 'isveren feshi',
    },
    kalemler: {
      ubgt: {
        takvim: {
          donemler: [{ baslangic: '2021-04-01', bitis: '2021-05-31' }],
          diniBayramlarDahil: false,
          haricTarihler: [{ tarih: '2021-05-19' }],
        },
        takdiriIndirim: { oran: 0, gerekce: 'indirim yok' },
      },
    },
  });
  assert.deepEqual(webBicimi.kalemler.ubgt!.takvim!.haricTarihler, ['2021-05-19']);
});

test('UBGT girdi dogrulama: gunler veya takvim zorunlu, takvim donemleri hizmet icinde olmali', () => {
  assert.throws(
    () =>
      girdi({
        kalemler: {
          ubgt: {
            takdiriIndirim: { oran: 0, gerekce: 'indirim yok' },
          },
        },
      }),
    /gunler.*takvim/,
  );

  assert.throws(
    () =>
      girdi({
        kalemler: {
          ubgt: {
            takvim: {
              donemler: [{ baslangic: '2019-01-01', bitis: '2019-06-01' }],
            },
            takdiriIndirim: { oran: 0, gerekce: 'indirim yok' },
          },
        },
      }),
    /hizmet döneminin içinde değil/,
  );
});

test('Yillik izin: 10.06.2003 oncesi 1475 s.K. m.49 basamaklari (12 / 18 / 24 gun) ve Yargitay 9. HD ornegi', () => {
  const t = testTablolari();

  // Yargitay 9. HD 14.12.2020, 2017/14806 E., 2020/18319 K.:
  // 11.06.1993 - 01.05.2013 arasi 19 tam yil:
  // 1-5. yillar (1994-1998, 2003 oncesi, 1475 m.49): 5 x 12 = 60 gun
  // 6-9. yillar (1999-2002, 2003 oncesi, 1475 m.49): 4 x 18 = 72 gun
  // 10-14. yillar (11.06.2003 - 11.06.2007, 4857 m.53): 5 x 20 = 100 gun
  // 15-19. yillar (11.06.2008 - 11.06.2012, 4857 m.53): 5 x 26 = 130 gun
  // Toplam = 362 gun
  const s1475 = hesapla(
    girdi({
      hizmet: {
        donemler: [{ giris: '1993-06-11', cikis: '2013-05-01' }],
        fesihTarihi: '2013-05-01',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        yillikIzin: {
          kullanilanGun: 0,
          ucretTuru: 'ciplak',
          eskiKanun4857Oncesi: true,
        },
      },
    }),
    t,
  );
  const izin1475 = s1475.kalemler.find((k) => k.kod === 'yillikIzin')!;
  // 362 gun x (9000 / 30 = 300 TL) = 108600.00 TL
  assert.equal(izin1475.brut.toFixed(2), '108600.00');
  assert.ok(izin1475.dayanak.some((d) => d.includes('1475')));
  assert.ok(izin1475.notlar.some((n) => n.includes('1475 s.K. m.49') && n.includes('10.06.2003 öncesinde')));
  assert.ok(
    izin1475.notlar.some(
      (n) => n.includes('Doğum tarihi girilmedi') && n.includes('1475 s.K. m.49 (18 ve küçük yaşta en az 18 gün)'),
    ),
  );
  assert.equal(
    s1475.uyarilar.some((u) => u.includes('10.06.2003 öncesinde dolan')),
    false,
  );

  // Secilmediginde (varsayilan) 4857 s.K. m.53 uygulanir (5x14 + 9x20 + 5x26 = 380 gun) ve notlarda uyari yer alir
  const sVarsayilan = hesapla(
    girdi({
      hizmet: {
        donemler: [{ giris: '1993-06-11', cikis: '2013-05-01' }],
        fesihTarihi: '2013-05-01',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        yillikIzin: {
          kullanilanGun: 0,
          ucretTuru: 'ciplak',
        },
      },
    }),
    t,
  );
  const izinVarsayilan = sVarsayilan.kalemler.find((k) => k.kod === 'yillikIzin')!;
  assert.equal(izinVarsayilan.brut.toFixed(2), '114000.00'); // 380 x 300
  assert.ok(izinVarsayilan.notlar.some((n) => n.includes('10.06.2003 öncesinde dolan hizmet yılları var')));
});

test('Yillik izin 1475 s.K. m.49: 15+ yil (24 gun), 10.06.2003 siniri, <=18 yas (18 gun) ve 50+ yas farki', () => {
  const t = testTablolari();

  // 1) 15. yili 2003 oncesinde dolan isci (01.01.1985 - 01.07.2004, 19 tam yil):
  // 1-5 (1986-1990): 5 x 12 = 60
  // 6-14 (1991-1999): 9 x 18 = 162
  // 15-18 (2000-2003 Ocak, 2003-06-10 oncesi): 4 x 24 = 96
  // 19 (01.01.2004, 2003-06-10 sonrasi): 1 x 26 = 26
  // Toplam = 344 gun (344 x 300 = 103200 TL)
  const s24 = hesapla(
    girdi({
      hizmet: {
        donemler: [{ giris: '1985-01-01', cikis: '2004-07-01' }],
        fesihTarihi: '2004-07-01',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        yillikIzin: {
          kullanilanGun: 0,
          ucretTuru: 'ciplak',
          donemKanunu: '1475-4857',
        },
      },
    }),
    t,
  );
  assert.equal(s24.kalemler[0]!.brut.toFixed(2), '103200.00');

  // 2) Tam 10.06.2003 siniri:
  // giris 2001-06-10 -> 1. yil dolumu 2002-06-10 (1475 -> 12 gun), 2. yil dolumu 2003-06-10 (4857 -> 14 gun) = 26 gun
  const sSinir = hesapla(
    girdi({
      hizmet: {
        donemler: [{ giris: '2001-06-10', cikis: '2003-07-01' }],
        fesihTarihi: '2003-07-01',
        fesihSekli: 'isveren feshi',
      },
      kalemler: {
        yillikIzin: {
          kullanilanGun: 0,
          ucretTuru: 'ciplak',
          eskiKanun4857Oncesi: true,
        },
      },
    }),
    t,
  );
  assert.equal(sSinir.kalemler[0]!.brut.toFixed(2), '7800.00'); // 26 x 300

  // 3) <=18 yas kurali: 1475 s.K. m.49'da 18 ve daha kucuk yastaki iscilere en az 18 gun verilir
  // Dogum: 1983-06-01, giris: 2000-01-01, cikis: 2002-06-01
  // 1. yil dolumu 2001-01-01 (yas 17 <= 18 -> 18 gun)
  // 2. yil dolumu 2002-01-01 (yas 18 <= 18 -> 18 gun)
  // Toplam = 36 gun (36 x 300 = 10800 TL)
  const sGenc = hesapla(
    girdi({
      hizmet: {
        donemler: [{ giris: '2000-01-01', cikis: '2002-06-01' }],
        fesihTarihi: '2002-06-01',
        fesihSekli: 'isveren feshi',
        dogumTarihi: '1983-06-01',
      },
      kalemler: {
        yillikIzin: {
          kullanilanGun: 0,
          ucretTuru: 'ciplak',
          eskiKanun4857Oncesi: true,
        },
      },
    }),
    t,
  );
  assert.equal(sGenc.kalemler[0]!.brut.toFixed(2), '10800.00');

  // 4) 50+ yas kurali farki: 1475 s.K. m.49'da 50+ yas kurali YOKTUR, 4857 s.K. m.53'te vardir (en az 20 gun)
  // Dogum: 1950-01-01, giris: 2001-01-01, cikis: 2004-06-01
  // 1. yil (2002-01-01, yas 51, 1475 m.49): 12 gun
  // 2. yil (2003-01-01, yas 52, 1475 m.49): 12 gun
  // 3. yil (2004-01-01, yas 53, 4857 m.53): 20 gun
  // Toplam = 44 gun (44 x 300 = 13200 TL)
  const sYas50 = hesapla(
    girdi({
      hizmet: {
        donemler: [{ giris: '2001-01-01', cikis: '2004-06-01' }],
        fesihTarihi: '2004-06-01',
        fesihSekli: 'isveren feshi',
        dogumTarihi: '1950-01-01',
      },
      kalemler: {
        yillikIzin: {
          kullanilanGun: 0,
          ucretTuru: 'ciplak',
          eskiKanun4857Oncesi: true,
        },
      },
    }),
    t,
  );
  assert.equal(sYas50.kalemler[0]!.brut.toFixed(2), '13200.00');

  // Celiskili parametreler reddedilmeli
  assert.throws(
    () =>
      girdiCoz({
        dosya: { mahkeme: 'Denizli 7. Is Mahkemesi', esasNo: '2021/1', kaynak: 'kendi dosyam', altAlan: '60.02' },
        hesapTarihi: '2021-12-31',
        hizmet: {
          donemler: [{ giris: '2000-01-01', cikis: '2021-09-15' }],
          fesihTarihi: '2021-09-15',
          fesihSekli: 'isveren feshi',
        },
        ucret: { sonBrutAylik: 9000, yontem: 'sabit' },
        parametreler: { vergi: { yontem: 'sabit', sabitOran: 0.15 } },
        kalemler: {
          yillikIzin: {
            kullanilanGun: 0,
            ucretTuru: 'ciplak',
            eskiKanun4857Oncesi: true,
            donemKanunu: 'yalniz-4857',
          },
        },
      }),
    /çelişiyor/,
  );
});

test('UBGT takvim türetmesi: zamanaşımı aktifken takvimden türetilen sınır öncesi tatiller elenir', () => {
  const t = testTablolari();
  const s = hesapla(
    girdi({
      hizmet: {
        donemler: [{ giris: '2020-01-01', cikis: '2021-06-01' }],
        fesihTarihi: '2021-06-01',
        fesihSekli: 'işveren feshi',
      },
      parametreler: {
        zamanasimi: { sinirTarihi: '2021-05-01', gerekce: '5 yıllık zamanaşımı def\'i' },
        vergi: { yontem: 'sabit', sabitOran: 0.15 },
      },
      kalemler: {
        ubgt: {
          takvim: { diniBayramlarDahil: false },
          takdiriIndirim: { oran: 0, gerekce: 'belgeye dayalı' },
        },
      },
    }),
    t,
  );
  const ubgt = s.kalemler.find((k) => k.kod === 'ubgt')!;
  // 2021-05-01 .. 2021-06-01 arasındaki sabit tatiller: 01.05.2021 (1 gün) ve 19.05.2021 (1 gün) = 2 gün × 300 TL = 600 TL
  assert.deepEqual(
    ubgt.detay!.satirlar.map((r) => r[0]),
    ['01.05.2021', '19.05.2021'],
  );
  assert.equal(ubgt.hamBrut.toFixed(2), '600.00');
  assert.ok(ubgt.notlar.some((n) => n.includes('Zamanaşımı sınır tarihi (01.05.2021')));
});
