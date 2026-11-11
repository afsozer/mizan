import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hesapla } from '../src/hesap.ts';
import { raporTanimi } from '../src/rapor/pdf.ts';
import { alanAdi, KALEMLER, kalemYeni } from '../web/src/schema.ts';
import { girdi, testTablolari } from './yardimci.ts';

const t = testTablolari();
const kalem = (s: ReturnType<typeof hesapla>, kod: string) => s.kalemler.find((k) => k.kod === kod)!;

test('kötüniyet tazminatı: 4857 m.17/2 bildirim süresinin 3 katı (6, 12, 18, 24 hafta) × giydirilmiş günlük brüt', () => {
  // Test girdisinde giydirilmiş ücret = 9000 + 1000 = 10.000 TL; günlük = 10000 / 30 = 333,3333... TL
  // 1) 6 aydan az (4 ay): 2 × 3 = 6 hafta = 42 gün → 42 × 10000 / 30 = 14.000,00 TL
  const s6 = hesapla(
    girdi({
      hizmet: { donemler: [{ giris: '2021-05-01', cikis: '2021-08-15' }], fesihTarihi: '2021-08-15', fesihSekli: 'kötüniyetli fesih' },
      kalemler: { kotuniyet: { hakVar: true, gerekce: 'şikayet üzerine fesih' } },
    }),
    t,
  );
  assert.equal(kalem(s6, 'kotuniyet').hamBrut.toFixed(2), '14000.00');

  // 2) 6 ay - 1,5 yıl arası (10 ay): 4 × 3 = 12 hafta = 84 gün → 84 × 10000 / 30 = 28.000,00 TL
  const s12 = hesapla(
    girdi({
      hizmet: { donemler: [{ giris: '2020-11-01', cikis: '2021-09-15' }], fesihTarihi: '2021-09-15', fesihSekli: 'kötüniyetli fesih' },
      kalemler: { kotuniyet: { hakVar: true, gerekce: 'şikayet üzerine fesih' } },
    }),
    t,
  );
  assert.equal(kalem(s12, 'kotuniyet').hamBrut.toFixed(2), '28000.00');

  // 3) 1,5 yıl - 3 yıl arası (1 yıl 8 ay 15 gün): 6 × 3 = 18 hafta = 126 gün → 126 × 10000 / 30 = 42.000,00 TL
  const s18 = hesapla(
    girdi({
      kalemler: {
        kotuniyet: {
          hakVar: true,
          gerekce: 'şikayet üzerine fesih',
          faiz: [{ tur: 'yasal', baslangic: '2021-09-15', gerekce: 'temerrüt' }],
        },
      },
    }),
    t,
  );
  const k18 = kalem(s18, 'kotuniyet');
  assert.equal(k18.hamBrut.toFixed(2), '42000.00');
  // Kesinti: yalnız gelir vergisi (%15 → 6300,00) ve damga vergisi (binde 7,59 → 318,78), SGK/işsizlik yok
  assert.deepEqual(
    k18.kesintiler.map((x) => [x.ad, x.tutar.toFixed(2)]),
    [
      ['Gelir vergisi', '6300.00'],
      ['Damga vergisi', '318.78'],
    ],
  );
  assert.equal(k18.net.toFixed(2), '35381.22');
  assert.equal(k18.faizler[0]!.toplam.toFixed(2), '1477.48'); // 42000 × 0,12 × 107 / 365

  // 4) 3 yıldan fazla (4 yıl): 8 × 3 = 24 hafta = 168 gün → 168 × 10000 / 30 = 56.000,00 TL
  const s24 = hesapla(
    girdi({
      hizmet: { donemler: [{ giris: '2017-01-01', cikis: '2021-09-15' }], fesihTarihi: '2021-09-15', fesihSekli: 'kötüniyetli fesih' },
      kalemler: { kotuniyet: { hakVar: true, gerekce: 'tanıklık nedeniyle fesih' } },
    }),
    t,
  );
  assert.equal(kalem(s24, 'kotuniyet').hamBrut.toFixed(2), '56000.00');
});

test('kötüniyet tazminatı: tam 1,5 yıl sınırı, haftaSayisi, çoklu dönemde donemEsasi ve hakVar: false', () => {
  const sinirHizmet = {
    donemler: [{ giris: '2020-01-01', cikis: '2021-06-30' }],
    fesihTarihi: '2021-06-30',
    fesihSekli: 'fesih',
  };
  const varsayilan = kalem(
    hesapla(girdi({ hizmet: sinirHizmet, kalemler: { kotuniyet: { hakVar: true, gerekce: 'x' } } }), t),
    'kotuniyet',
  );
  assert.equal(varsayilan.hamBrut.toFixed(2), '28000.00'); // 12 hafta
  assert.ok(varsayilan.notlar.some((n) => n.includes('haftaSayisi: 18')));

  const ustYorum = kalem(
    hesapla(girdi({ hizmet: sinirHizmet, kalemler: { kotuniyet: { hakVar: true, gerekce: 'x', haftaSayisi: 18 } } }), t),
    'kotuniyet',
  );
  assert.equal(ustYorum.hamBrut.toFixed(2), '42000.00');

  const cokluHizmet = {
    donemler: [
      { giris: '2015-01-01', cikis: '2018-12-31' },
      { giris: '2020-01-01', cikis: '2021-09-15' },
    ],
    fesihTarihi: '2021-09-15',
    fesihSekli: 'fesih',
  };
  assert.throws(
    () => girdi({ hizmet: cokluHizmet, kalemler: { kotuniyet: { hakVar: true, gerekce: 'x' } } }),
    /kotuniyet\.donemEsasi/,
  );
  const sonDonem = kalem(
    hesapla(girdi({ hizmet: cokluHizmet, kalemler: { kotuniyet: { hakVar: true, gerekce: 'x', donemEsasi: 'son' } } }), t),
    'kotuniyet',
  );
  const tumDonem = kalem(
    hesapla(girdi({ hizmet: cokluHizmet, kalemler: { kotuniyet: { hakVar: true, gerekce: 'x', donemEsasi: 'tumu' } } }), t),
    'kotuniyet',
  );
  assert.equal(sonDonem.hamBrut.toFixed(2), '42000.00'); // 18 hafta
  assert.equal(tumDonem.hamBrut.toFixed(2), '56000.00'); // 24 hafta

  const hakYok = kalem(
    hesapla(girdi({ kalemler: { kotuniyet: { hakVar: false, gerekce: 'iş güvencesi kapsamında' } } }), t),
    'kotuniyet',
  );
  assert.equal(hakYok.brut.toString(), '0');
});

test('boşta geçen süre ücreti: varsayılan 4 ay son giydirilmiş brüt, döneme özgü ücret, SGK+GV+DV ve mevduat/yasal faiz', () => {
  // Varsayılan: 4 ay × 10.000 TL (son giydirilmiş) = 40.000,00 TL
  const s1 = hesapla(
    girdi({
      kalemler: {
        bostaGecenSure: {
          hakVar: true,
          gerekce: 'işe iade kararı kesinleşti',
          faiz: [{ tur: 'mevduat', baslangic: '2021-03-15', gerekce: 'başvuru tarihi' }],
        },
      },
    }),
    t,
  );
  const k1 = kalem(s1, 'bostaGecenSure');
  assert.equal(k1.hamBrut.toFixed(2), '40000.00');
  assert.ok(k1.notlar.some((n) => n.includes('son giydirilmiş brüt aylık ücret esas alındı')));
  assert.ok(k1.dayanak.some((d) => d.includes('4857 s.K. m.34')));
  // Kesinti: SGK %14 (5600), işsizlik %1 (400), GV %15 (34000 × 0,15 = 5100), DV binde 7,59 (303,60)
  assert.deepEqual(
    k1.kesintiler.map((x) => [x.ad, x.tutar.toFixed(2)]),
    [
      ['SGK işçi payı', '5600.00'],
      ['İşsizlik sigortası işçi payı', '400.00'],
      ['Gelir vergisi', '5100.00'],
      ['Damga vergisi', '303.60'],
    ],
  );
  assert.equal(k1.net.toFixed(2), '28596.40');
  assert.equal(k1.faizler[0]!.toplam.toFixed(2), '6378.08'); // 40000 × 0,20 × 291 / 365

  // Döneme özgü brutAylik ve ekYanHaklar + 3 ay + yasal faiz
  const s2 = hesapla(
    girdi({
      kalemler: {
        bostaGecenSure: {
          hakVar: true,
          gerekce: '3 ay sonra işe başlatıldı',
          aySayisi: 3,
          brutAylik: 11000,
          ekYanHaklar: 1500,
          faiz: [{ tur: 'yasal', baslangic: '2021-09-15', gerekce: 'temerrüt' }],
        },
      },
    }),
    t,
  );
  const k2 = kalem(s2, 'bostaGecenSure');
  assert.equal(k2.hamBrut.toFixed(2), '37500.00'); // 3 × (11000 + 1500)

  // 4 aydan fazla veya 0 ay reddedilir
  assert.throws(
    () => girdi({ kalemler: { bostaGecenSure: { hakVar: true, gerekce: 'x', aySayisi: 5 } } }),
    /en çok 4 ay/,
  );
  assert.throws(
    () => girdi({ kalemler: { bostaGecenSure: { hakVar: true, gerekce: 'x', aySayisi: 0 } } }),
    /en çok 4 ay/,
  );
});

test('işe başlatmama tazminatı: 4-8 ay zorunlu parametre, çıplak brüt ücret, yalnız damga vergisi (GVK m.25/1-1)', () => {
  // Zorunlu aySayisi: verilmezse ya da 4-8 dışındaysa hata verir
  assert.throws(
    () => girdi({ kalemler: { iseBaslatmama: { hakVar: true, gerekce: 'x' } } }),
    /iseBaslatmama\.aySayisi/,
  );
  assert.throws(
    () => girdi({ kalemler: { iseBaslatmama: { hakVar: true, gerekce: 'x', aySayisi: 3 } } }),
    /4 ile 8 ay arasında/,
  );
  assert.throws(
    () => girdi({ kalemler: { iseBaslatmama: { hakVar: true, gerekce: 'x', aySayisi: 9 } } }),
    /4 ile 8 ay arasında/,
  );

  // Son çıplak brüt ücret (9000 TL; 1000 TL yemek yan hakkı katılmaz!) × 5 ay = 45.000,00 TL
  const s1 = hesapla(
    girdi({
      parametreler: { vergi: { yontem: 'dilim' } },
      kalemler: {
        iseBaslatmama: {
          hakVar: true,
          gerekce: '6 yıllık kıdeme göre 5 ay',
          aySayisi: 5,
          faiz: [{ tur: 'yasal', baslangic: '2021-10-15', gerekce: 'işe başlatmama tarihi' }],
        },
        ihbar: { hakVar: true, gerekce: 'bildirimsiz fesih' },
      },
    }),
    t,
  );
  const k1 = kalem(s1, 'iseBaslatmama');
  assert.equal(k1.hamBrut.toFixed(2), '45000.00');
  assert.equal(k1.kesintiler.length, 1);
  assert.equal(k1.kesintiler[0]!.ad, 'Damga vergisi');
  assert.equal(k1.kesintiler[0]!.tutar.toFixed(2), '341.55'); // 45000 × 0,00759
  assert.match(k1.kesintiler[0]!.dayanak, /GVK m\.25\/1-1/);
  assert.match(k1.kesintiler[0]!.dayanak, /5510 s\.K\. m\.80\/1-b/);
  assert.doesNotMatch(k1.kesintiler[0]!.dayanak, /25\/1-7/);
  assert.equal(k1.net.toFixed(2), '44658.45');
  // İşe başlatmama tazminatı gelir vergisinden müstesna olduğundan ihbarın vergi dilimi matrahını artırmaz
  assert.equal(kalem(s1, 'ihbar').kesintiler.find((x) => x.ad === 'Gelir vergisi')!.tutar.toFixed(2), '2300.00');

  // İşe başlatmama tarihindeki esasBrutAylik ayrıca verilirse onu esas alır
  const s2 = hesapla(
    girdi({
      kalemler: {
        iseBaslatmama: {
          hakVar: true,
          gerekce: '8 ay',
          aySayisi: 8,
          esasBrutAylik: 12500,
        },
      },
    }),
    t,
  );
  assert.equal(kalem(s2, 'iseBaslatmama').hamBrut.toFixed(2), '100000.00');
});

test('web şeması ve PDF rapor tanımı yeni kalemleri içerir', () => {
  assert.equal(alanAdi('girdi.kalemler.kotuniyet.haftaSayisi'), 'Kötüniyet süresi (hafta)');
  assert.equal(alanAdi('girdi.kalemler.bostaGecenSure.aySayisi'), 'Boşta geçen süre (ay)');
  assert.equal(alanAdi('girdi.kalemler.iseBaslatmama.aySayisi'), 'Tazminat süresi (ay)');
  assert.ok(KALEMLER.some((k) => k.key === 'kotuniyet'));
  assert.ok(KALEMLER.some((k) => k.key === 'bostaGecenSure'));
  assert.ok(KALEMLER.some((k) => k.key === 'iseBaslatmama'));
  assert.deepEqual(kalemYeni('iseBaslatmama'), { hakVar: '', gerekce: '', aySayisi: '' });

  const s = hesapla(
    girdi({
      kalemler: {
        kotuniyet: { hakVar: true, gerekce: 'kötüniyet' },
        bostaGecenSure: { hakVar: true, gerekce: 'boşta geçen süre', aySayisi: 4, brutAylik: 9500, ekYanHaklar: 500 },
        iseBaslatmama: { hakVar: true, gerekce: 'işe başlatmama', aySayisi: 4, esasBrutAylik: 9500 },
      },
    }),
    t,
  );
  const tanim = raporTanimi(s, { uretimZamani: '11.11.2026 12:00', surum: 'mizan test', girdiOzeti: 'abc' });
  assert.ok(JSON.stringify(tanim).includes('Kötüniyet tazminatı'));
  assert.ok(JSON.stringify(tanim).includes('Boşta geçen süre ücreti'));
  assert.ok(JSON.stringify(tanim).includes('İşe başlatmama tazminatı'));
});
