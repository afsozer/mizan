import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GirdiHatasi,
  aileDefterSatiri,
  aileGirdiCoz,
  aileHesapla,
  aileKanitDosyaAdi,
  aileRaporTanimi,
  type AileGirdi,
} from '../src/index.ts';
import { aileGirdiOku, girdiAlaniniAlgila } from '../src/node/girdi-dosya.ts';
import { pdfYaz } from '../src/node/pdf-yaz.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';
import { testTablolari } from './yardimci.ts';

function aileGirdi(ek: Record<string, unknown> = {}): AileGirdi {
  const temel: Record<string, unknown> = {
    alan: 'aile',
    dosya: {
      mahkeme: 'Ankara 5. Aile Mahkemesi',
      esasNo: '2026/100',
      kaynak: 'kendi dosyam',
      altAlan: '05.01',
      kisaAd: 'test-aile',
    },
    hesapTarihi: '2026-10-15',
    evlilik: {
      evlenmeTarihi: '2016-05-01',
      malRejimiSonaErmeTarihi: '2024-06-01',
      sonaErmeNedeni: 'TMK m.166/1 bosanma davasi',
      davaTarihi: '2024-06-01',
      tasfiyeTarihi: '2026-10-15',
    },
    mallar: [
      {
        ad: 'Konut',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeTarihi: '2019-04-10',
        edinmeDegeri: 1000000,
        tasfiyeDegeri: 4000000,
      },
    ],
  };
  return aileGirdiCoz({ ...temel, ...ek });
}

test('siki kisisel veri kurali: kisi adi alanlari ve gecersiz taraf adlari reddedilir', () => {
  assert.throws(
    () =>
      aileGirdi({
        dosya: { mahkeme: 'X', esasNo: '1', kaynak: 'k', altAlan: '05.01', davaciAdi: 'Ad Soyad' },
      }),
    (e: unknown) =>
      e instanceof GirdiHatasi &&
      e.alanYolu === 'girdi.dosya.davaciAdi' &&
      /tanınmayan alan "davaciAdi"/.test(e.message),
  );
  assert.throws(
    () =>
      aileGirdi({
        evlilik: {
          evlenmeTarihi: '2018-01-01',
          malRejimiSonaErmeTarihi: '2024-01-01',
          sonaErmeNedeni: 'bosanma',
          davaliAdi: 'Ad Soyad',
        },
      }),
    /tanınmayan alan "davaliAdi"/,
  );
  assert.throws(
    () =>
      aileGirdi({
        mallar: [{ ad: 'Ev', malik: 'koca', edinmeDegeri: 100, tasfiyeDegeri: 200 }],
      }),
    /davaci \| davali/,
  );
  assert.throws(
    () => aileGirdiCoz({ dosya: { mahkeme: 'X', esasNo: '1', kaynak: 'k', altAlan: 'A' }, hesapTarihi: '2026-01-01' }),
    /girdi\.alan/,
  );
});

test('TMK m.227 deger artis payi: deger artisi ve 40 hane kesirli oran duyarligi', () => {
  // 100.000 / 300.000 = 1/3 (devirli kesir); 1/3 * 900.000 = tam 300.000,00 TL
  const g = aileGirdi({
    mallar: [
      {
        ad: 'Daire',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeDegeri: 300000,
        tasfiyeDegeri: 900000,
        digerEsKatkilari: [
          { aciklama: 'Davacinin ziynet satisi katkisi', katkiTutari: 100000 },
        ],
      },
    ],
  });
  const s = aileHesapla(g, { yasalFaiz: testTablolari().yasalFaiz });
  const mal = s.mallar[0]!;
  assert.equal(mal.toplamDigerEsDap.toFixed(2), '300000.00');
  assert.equal(mal.digerEsKatkilari[0]!.degerKaybiUygulandi, false);
  // Davalinin artik degeri: 900.000 - 300.000 (DAP borcu, TMK m.231/1) = 600.000 TL
  assert.equal(s.artikDeger.davali.artikDeger.toFixed(2), '600000.00');
  // Davacinin katilma alacagi: 600.000 * 0,5 = 300.000 TL; toplam alacagi = 300.000 DAP + 300.000 KA = 600.000 TL
  assert.equal(s.katilma.davaci.netKatilmaAlacagi.toFixed(2), '300000.00');
  assert.equal(s.takas.netBakiye.toFixed(2), '600000.00');
  assert.equal(s.takas.netAlacakli, 'davaci');
});

test('TMK m.227/1 c.son ve m.227/3 deger kaybi: baslangic degeri tabani ve yazili anlasma parametresi', () => {
  // Tasfiye degeri (600.000) < edinme degeri (1.000.000); katki 400.000 (%40).
  // Oransal karsilik = 240.000 TL; varsayilan TMK m.227/1 c.son tabani = 400.000 TL.
  const varsayilanGirdi = aileGirdi({
    mallar: [
      {
        ad: 'Arac',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeDegeri: 1000000,
        tasfiyeDegeri: 600000,
        digerEsKatkilari: [
          { aciklama: 'Davaci kisisel mevduat katkisi', katkiTutari: 400000 },
        ],
      },
    ],
  });
  const sVarsayilan = aileHesapla(varsayilanGirdi, { yasalFaiz: testTablolari().yasalFaiz });
  const katki1 = sVarsayilan.mallar[0]!.digerEsKatkilari[0]!;
  assert.equal(katki1.surumKarsiligi.toFixed(2), '240000.00');
  assert.equal(katki1.alacak.toFixed(2), '400000.00');
  assert.equal(katki1.degerKaybiUygulandi, true);

  // TMK m.227/3 yazili anlasma gerekcesi olmadan surum-orani secilirse hata verir
  assert.throws(
    () =>
      aileGirdi({
        mallar: [
          {
            ad: 'Arac',
            malik: 'davali',
            nitelik: 'edinilmis',
            edinmeDegeri: 1000000,
            tasfiyeDegeri: 600000,
            digerEsKatkilari: [
              { aciklama: 'Katki', katkiTutari: 400000, degerKaybiTabani: 'surum-orani' },
            ],
          },
        ],
      }),
    /degerKaybiGerekcesi/,
  );

  // TMK m.227/3 yazili anlasma gerekcesiyle surum-orani secildiginde 240.000 TL uygulanir
  const sozlesmeliGirdi = aileGirdi({
    mallar: [
      {
        ad: 'Arac',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeDegeri: 1000000,
        tasfiyeDegeri: 600000,
        digerEsKatkilari: [
          {
            aciklama: 'Katki',
            katkiTutari: 400000,
            degerKaybiTabani: 'surum-orani',
            degerKaybiGerekcesi: 'TMK m.227/3 uyarinca noter onayli yazili deger kaybina katilma sozlesmesi',
          },
        ],
      },
    ],
  });
  const sSozlesmeli = aileHesapla(sozlesmeliGirdi, { yasalFaiz: testTablolari().yasalFaiz });
  const katki2 = sSozlesmeli.mallar[0]!.digerEsKatkilari[0]!;
  assert.equal(katki2.alacak.toFixed(2), '240000.00');
  assert.equal(katki2.degerKaybiUygulandi, false);
});

test('konut kredisi oranlamasi: pesinat + evlilik ici ve evlilik sonrasi kredi odemeleri (Yargitay 8. HD ilkesi)', () => {
  // Edinme: 2.000.000 TL; Tasfiye: 6.000.000 TL.
  // Davaci kisisel pesinat: 400.000 (%20) -> DAP = 1.200.000 TL
  // Malik (davali) kisisel pesinat: 200.000 (%10) -> Malik kisisel kesimi = 600.000 TL
  // Edinilmis pesinat: 200.000 (%10) -> Edinilmis pesinat kesimi = 600.000 TL
  // Cekilen kredi: 1.200.000 (%60). Faizli toplam geri odeme: 1.800.000 (1.200.000 evlilik ici = 2/3, 600.000 evlilik sonrasi = 1/3).
  // Kredi edinilmis orani = 0.60 * 2/3 = 0.40 -> 2.400.000 TL
  // Kredi evlilik sonrasi orani = 0.60 * 1/3 = 0.20 -> 1.200.000 TL (mala iliskin borc/kisisel kesim)
  // Malik kisisel + evlilik sonrasi kredi borcu = 600.000 + 1.200.000 = 1.800.000 TL
  // Artik deger = 6.000.000 - 1.800.000 (borc ve kisisel kayma) - 1.200.000 (davaci DAP borcu) = 3.000.000 TL!
  const g = aileGirdi({
    mallar: [
      {
        ad: 'Kredili Konut',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeDegeri: 2000000,
        tasfiyeDegeri: 6000000,
        kredi: {
          digerEsKisiselPesinat: 400000,
          malikKisiselPesinat: 200000,
          edinilmisPesinat: 200000,
          cekilenKredi: 1200000,
          evlilikIciOdenen: 1200000,
          evlilikSonrasiOdenen: 600000,
        },
      },
    ],
  });
  const s = aileHesapla(g, { yasalFaiz: testTablolari().yasalFaiz });
  const m = s.mallar[0]!;
  assert.equal(m.toplamDigerEsDap.toFixed(2), '1200000.00');
  assert.equal(m.krediDetayi!.malikKisiselTasfiyeKarsiligi.toFixed(2), '600000.00');
  assert.equal(m.krediDetayi!.evlilikSonrasiKrediTasfiyeBorcu.toFixed(2), '1200000.00');
  assert.equal(m.toplamMalaIliskinBorcVeKisiselKayma.toFixed(2), '1800000.00');
  assert.equal(m.edinilmisNetDeger.toFixed(2), '3000000.00');
  assert.equal(s.artikDeger.davali.artikDeger.toFixed(2), '3000000.00');
  assert.equal(s.katilma.davaci.netKatilmaAlacagi.toFixed(2), '1500000.00');
  assert.equal(s.takas.davaciToplamAlacak.toFixed(2), '2700000.00');

  // Kredi varken malikKisiselKatkisi veya katkiTarihiMalDegeri olmayan digerEsKatkilari cifte sayimi onlemek icin reddedilir
  assert.throws(
    () =>
      aileGirdi({
        mallar: [
          {
            ad: 'Kredili Konut',
            malik: 'davali',
            nitelik: 'edinilmis',
            edinmeDegeri: 2000000,
            tasfiyeDegeri: 6000000,
            malikKisiselKatkisi: { aciklama: 'Pesinat', katkiTutari: 200000 },
            kredi: { evlilikIciOdenen: 1800000 },
          },
        ],
      }),
    /kredi\.malikKisiselPesinat/,
  );
  assert.throws(
    () =>
      aileGirdi({
        mallar: [
          {
            ad: 'Kredili Konut',
            malik: 'davali',
            nitelik: 'edinilmis',
            edinmeDegeri: 2000000,
            tasfiyeDegeri: 6000000,
            digerEsKatkilari: [{ aciklama: 'Edinme ani pesinati', katkiTutari: 400000 }],
            kredi: { evlilikIciOdenen: 1600000 },
          },
        ],
      }),
    /kredi\.digerEsKisiselPesinat/,
  );
});

test('TMK m.229 eklenecek degerler ve TMK m.230 denklestirme (sabit ve oranlamali)', () => {
  const g = aileGirdi({
    mallar: [
      {
        ad: 'Mevduat',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeDegeri: 500000,
        tasfiyeDegeri: 500000,
      },
    ],
    eklenecekDegerler: [
      {
        es: 'davali',
        tur: 'son-bir-yil-bagis',
        aciklama: 'Son bir yilda rizasiz bagis',
        devirTarihi: '2024-02-01',
        tutar: 300000,
      },
    ],
    denklestirmeler: [
      {
        es: 'davali',
        yon: 'edinilmisten-kisisele',
        aciklama: 'Davalinin kisisel arsasina edinilmis kazanc ile yapilan iyilestirme (TMK m.230/3)',
        katkiTutari: 100000,
        edinmeDegeri: 400000,
        tasfiyeDegeri: 1200000, // %25 * 1.200.000 = +300.000 TL
      },
      {
        es: 'davali',
        yon: 'kisiselden-edinilmise',
        aciklama: 'Edinilmis mal vergi borcunun kisisel maldan odenmesi (TMK m.230/1)',
        tutar: 100000, // -100.000 TL
      },
    ],
  });
  const s = aileHesapla(g, { yasalFaiz: testTablolari().yasalFaiz });
  // 500.000 (edinilmis) + 300.000 (eklenecek) + 300.000 (denklestirme +) - 100.000 (denklestirme -) = 1.000.000 TL
  assert.equal(s.artikDeger.davali.artikDeger.toFixed(2), '1000000.00');
  assert.equal(s.katilma.davaci.netKatilmaAlacagi.toFixed(2), '500000.00');
});

test('TMK m.231/2: eksi artik deger sifir (0) kabul edilir ve diger esin TMK m.227 DAP alacagi korunur', () => {
  const g = aileGirdi({
    mallar: [
      {
        ad: 'Isyeri',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeDegeri: 1000000,
        tasfiyeDegeri: 2000000,
        malaIliskinBorc: 1500000, // net edinilmis = 500.000 TL
        digerEsKatkilari: [
          { aciklama: 'Davaci kisisel mal katkisi (%40)', katkiTutari: 400000 }, // DAP = 800.000 TL
        ],
      },
    ],
  });
  const s = aileHesapla(g, { yasalFaiz: testTablolari().yasalFaiz });
  // Ham artik deger = 2.000.000 - 1.500.000 - 800.000 = -300.000 TL -> TMK m.231/2 uyarinca 0,00 TL!
  assert.equal(s.artikDeger.davali.hamArtikDeger.toFixed(2), '-300000.00');
  assert.equal(s.artikDeger.davali.eksiBakiyeSifirlandi, true);
  assert.equal(s.artikDeger.davali.artikDeger.toFixed(2), '0.00');
  assert.equal(s.katilma.davaci.netKatilmaAlacagi.toFixed(2), '0.00');
  // Ancak davacinin 800.000 TL deger artis payi alacagi (TMK m.227) aynen dogar!
  assert.equal(s.takas.davaciDegerArtisPayi.toFixed(2), '800000.00');
  assert.equal(s.takas.netBakiye.toFixed(2), '800000.00');
});

test('TMK m.236/1 c.2 karsilikli takas ve TMK m.236/2 zina/hayata kast hakkaniyet indirimi (DAP etkilenmez)', () => {
  // Davalinin artik degeri: 2.000.000 TL -> Davacinin KA = 1.000.000 TL
  // Davacinin artik degeri: 1.350.000 - 150.000 = 1.200.000 TL -> Davalinin ham KA = 600.000 TL
  // Ayrica davalinin davaci malina 150.000 TL DAP alacagi var.
  // Davali zina nedeniyle kusurlu: indirimOrani = 1.0 (katilma alacagi tamamen kaldirildi).
  // Yargitay 8. HD 2014/12512 E. uyarinca TMK m.236/2 yalniz katilma alacagina uygulanir; davalinin 150.000 TL DAP alacagi korunur!
  const g = aileGirdi({
    mallar: [
      {
        ad: 'Davali Konutu',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeDegeri: 1000000,
        tasfiyeDegeri: 2000000,
      },
      {
        ad: 'Davaci Araci',
        malik: 'davaci',
        nitelik: 'edinilmis',
        edinmeDegeri: 500000,
        tasfiyeDegeri: 1350000,
        digerEsKatkilari: [
          { aciklama: 'Davalinin kisisel katkisi (1/9 oran)', katkiTutari: 55555.55, katkiTarihiMalDegeri: 499999.95 }, // 1/9 * 1.350.000 = 150.000 TL
        ],
      },
    ],
    parametreler: {
      hakkaniyetIndirimi: {
        kusurluEs: 'davali',
        neden: 'zina',
        indirimOrani: 1,
        gerekce: 'TMK m.161 zina nedeniyle bosanma karari kesinlesmis olup TMK m.236/2 uyarinca kusurlu davalinin katilma alacagi kaldirilmistir',
      },
    },
  });
  const s = aileHesapla(g, { yasalFaiz: testTablolari().yasalFaiz });
  assert.equal(s.artikDeger.davaci.artikDeger.toFixed(2), '1200000.00');
  assert.equal(s.katilma.davali.hamKatilmaAlacagi.toFixed(2), '600000.00');
  assert.equal(s.katilma.davali.netKatilmaAlacagi.toFixed(2), '0.00');
  assert.equal(s.takas.davaliDegerArtisPayi.toFixed(2), '150000.00');
  // Takas: Davaci alacagi 1.000.000 TL KA - Davali alacagi 150.000 TL DAP = 850.000 TL davaci lehine net bakiye
  assert.equal(s.takas.netBakiye.toFixed(2), '850000.00');
  assert.equal(s.takas.netAlacakli, 'davaci');
});

test('TMK m.239/3 yasal faiz: tasfiye tarihi ve deger artis payinda dava tarihi tercihi (data/yasal-faiz.json)', () => {
  const tablolar = tablolariYukle();
  const g = aileGirdi({
    hesapTarihi: '2026-10-15',
    evlilik: {
      evlenmeTarihi: '2018-01-01',
      malRejimiSonaErmeTarihi: '2024-05-01',
      sonaErmeNedeni: 'bosanma',
      davaTarihi: '2024-05-01',
      tasfiyeTarihi: '2026-06-30',
    },
    mallar: [
      {
        ad: 'Konut',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeDegeri: 1000000,
        tasfiyeDegeri: 2000000,
        digerEsKatkilari: [{ aciklama: 'Davaci katkisi', katkiTutari: 500000 }], // DAP = 1.000.000 TL; Artik deger = 1.000.000 -> KA = 500.000 TL
      },
    ],
    parametreler: {
      degerArtisPayiFaizi: {
        baslangicEsasi: 'dava-tarihi',
        gerekce: 'Deger artis payi alacagina dava tarihinden yasal faiz talebi',
      },
      katilmaAlacagiFaizi: {
        baslangicEsasi: 'tasfiye-tarihi',
        gerekce: 'TMK m.239/3 uyarinca karar tarihinden yasal faiz',
      },
    },
  });
  const s = aileHesapla(g, { yasalFaiz: tablolar.yasalFaiz });
  assert.equal(s.alacakKalemleri.length, 2);
  const dapFaiz = s.alacakKalemleri.find((f) => f.tur === 'deger-artis-payi')!.faiz!;
  const kaFaiz = s.alacakKalemleri.find((f) => f.tur === 'katilma-alacagi')!.faiz!;
  // 2024-05-01 -> 2026-10-15 arasinda 3 donem (%9, %24, %31)
  assert.equal(dapFaiz.kesitler.length, 3);
  assert.ok(dapFaiz.toplam.gt(0));
  // 2026-06-30 -> 2026-10-15 arasinda 2 donem (%24 ve %31)
  assert.equal(kaFaiz.kesitler.length, 2);
  assert.ok(kaFaiz.toplam.gt(0));

  // Denk alacaklarda tum-alacaklar takasi sonrasi faiz 0,00 TL olmalidir (TBK m.143/1)
  const denkVeri = {
    hesapTarihi: '2026-10-15',
    evlilik: {
      evlenmeTarihi: '2018-01-01',
      malRejimiSonaErmeTarihi: '2024-05-01',
      sonaErmeNedeni: 'bosanma',
      tasfiyeTarihi: '2026-05-15',
    },
    mallar: [
      {
        ad: 'Mal 1',
        malik: 'davali',
        nitelik: 'edinilmis',
        edinmeDegeri: 500000,
        tasfiyeDegeri: 1000000,
        digerEsKatkilari: [{ aciklama: 'Davaci katkisi', katkiTutari: 250000 }], // Davaci DAP 500.000
      },
      {
        ad: 'Mal 2',
        malik: 'davaci',
        nitelik: 'edinilmis',
        edinmeDegeri: 500000,
        tasfiyeDegeri: 1000000,
        digerEsKatkilari: [{ aciklama: 'Davali katkisi', katkiTutari: 250000 }], // Davali DAP 500.000
      },
    ],
  };
  const denkSonuc = aileHesapla(aileGirdi(denkVeri), { yasalFaiz: tablolar.yasalFaiz });
  assert.equal(denkSonuc.takas.netAlacakli, 'denk');
  assert.equal(denkSonuc.takas.netBakiye.toFixed(2), '0.00');
  assert.equal(denkSonuc.toplamFaiz.davaci.toFixed(2), '0.00');
  assert.equal(denkSonuc.toplamFaiz.davali.toFixed(2), '0.00');

  // yalniz-katilma modunda karsilikli DAP faizleri toplanmaz, defter satirinda ayri yazilir
  const ayriTakasSonuc = aileHesapla(
    aileGirdi({
      ...denkVeri,
      parametreler: { takasKapsami: 'yalniz-katilma' },
    }),
    { yasalFaiz: tablolar.yasalFaiz },
  );
  const ayriSatir = aileDefterSatiri(ayriTakasSonuc, '2026-10-15', 'mizan test');
  assert.match(ayriSatir, /davacı faizi .* TL, davalı faizi .* TL/);
});

test('uctan uca: ornek-aile.yaml otomatik algilanir, hesaplanir, PDF ve defter satiri uretilir', async () => {
  const ornekYol = join(import.meta.dirname, '..', 'ornekler', 'ornek-aile.yaml');
  assert.equal(girdiAlaniniAlgila(ornekYol), 'aile');
  const { girdi: g, ozet } = aileGirdiOku(ornekYol);
  const s = aileHesapla(g, { yasalFaiz: tablolariYukle().yasalFaiz });

  // 1. mal (Aile konutu, davali): edinme 1.000.000, tasfiye 5.000.000
  // Davaci kisisel pesinat %20 -> 1.000.000 TL DAP
  // Malik kisisel pesinat %10 (500.000) + evlilik sonrasi kredi %20 (1.000.000) = 1.500.000 TL borc/kisisel kayma
  // Davali artik deger: 5.000.000 + 300.000 (eklenecek) - 1.500.000 - 1.000.000 (DAP) = 2.800.000 TL -> Davaci KA = 1.400.000 TL
  // 2. mal (Binek arac, davaci): edinme 600.000, tasfiye 1.200.000, davali katkisi 150.000 (%25) -> Davali DAP = 300.000 TL
  // Davaci artik deger: 1.200.000 + 100.000 (denklestirme) - 300.000 (DAP) = 1.000.000 TL -> Davali KA = 500.000 TL
  // Takas: Davaci net KA = 1.400.000 - 500.000 = 900.000 TL; Davaci toplam = 1.000.000 DAP + 900.000 KA = 1.900.000 TL
  // Davali toplam = 300.000 DAP; Net bakiye = 1.900.000 - 300.000 = 1.600.000 TL (Davaci lehine)
  assert.equal(s.takas.davaciDegerArtisPayi.toFixed(2), '1000000.00');
  assert.equal(s.takas.davaliDegerArtisPayi.toFixed(2), '300000.00');
  assert.equal(s.artikDeger.davali.artikDeger.toFixed(2), '2800000.00');
  assert.equal(s.artikDeger.davaci.artikDeger.toFixed(2), '1000000.00');
  assert.equal(s.katilma.davaci.netKatilmaAlacagi.toFixed(2), '1400000.00');
  assert.equal(s.katilma.davali.netKatilmaAlacagi.toFixed(2), '500000.00');
  assert.equal(s.takas.netBakiye.toFixed(2), '1600000.00');
  assert.equal(s.takas.netAlacakli, 'davaci');

  assert.equal(aileKanitDosyaAdi(s, '2026-10-22'), '2026-10-22_ornek-aile-2026-1_05.01.pdf');
  const satir = aileDefterSatiri(s, '2026-10-22', 'mizan 0.1.0');
  assert.match(satir, /davacı lehine net bakiye 1\.600\.000,00 TL/);
  assert.equal(satir.split('|').length, 9);

  const pdfYol = join(mkdtempSync(join(tmpdir(), 'mizan-aile-')), 'ornek-aile.pdf');
  await pdfYaz(aileRaporTanimi(s, { uretimZamani: '22.10.2026 12:00', surum: 'mizan test', girdiOzeti: ozet }), pdfYol);
  assert.equal(readFileSync(pdfYol).subarray(0, 5).toString(), '%PDF-');
  assert.ok(statSync(pdfYol).size > 10_000);
});
