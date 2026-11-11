import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GirdiHatasi } from '../src/girdi.ts';
import {
  aautDefterSatiri,
  aautGirdiCoz,
  aautHesapla,
  aautKanitDosyaAdi,
  aautRaporTanimi,
  type AautGirdisi,
} from '../src/aaut/index.ts';
import { aautGirdiOku, girdiAlaniniAlgila } from '../src/node/girdi-dosya.ts';
import { pdfYaz } from '../src/node/pdf-yaz.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';

function ornekGirdi(ek: Record<string, unknown> = {}, uyusmazlikEk: Record<string, unknown> = {}): AautGirdisi {
  return aautGirdiCoz({
    alan: 'aaut',
    dosya: {
      mahkeme: 'Örnek Asliye Hukuk Mahkemesi',
      esasNo: '2026/10',
      kisaAd: 'ornek-asliye-hukuk',
      kaynak: 'kendi dosyam',
      altAlan: '60.02',
    },
    hesapTarihi: '2026-11-10',
    ...ek,
    uyusmazlik: {
      merci: 'asliye-hukuk',
      tur: 'nispi',
      davaDegeri: 1000000,
      ...uyusmazlikEk,
    },
  });
}

test('AAÜT kademeli nispi dilim hesabı: 2024-2025, 2025-2026 ve 2026-2027 dönemleri', () => {
  const tablolar = tablolariYukle();

  // 1) 2024-2025 dönemi (RG 03.10.2024/32681): 1.000.000 TL dava değeri
  // İlk 400.000 × %16 = 64.000 + Sonra gelen 400.000 × %15 = 60.000 + Kalan 200.000 × %14 = 28.000 = 152.000 TL
  const s24 = aautHesapla(ornekGirdi({ hesapTarihi: '2025-05-15' }, { davaDegeri: 1000000 }), tablolar);
  assert.equal(s24.tarifeDonemi, '2024-2025');
  assert.equal(s24.maktuUcret.toFixed(2), '30000.00');
  assert.equal(s24.davaci.hamNispiUcret.toFixed(2), '152000.00');
  assert.equal(s24.davaci.hukmedilenUcret.toFixed(2), '152000.00');
  assert.equal(s24.davaci.dilimler.length, 3);

  // 2) 2025-2026 dönemi (RG 04.11.2025/33067): 3.000.000 TL dava değeri
  // 600k×%16 (96k) + 600k×%15 (90k) + 1.200k×%14 (168k) + 600k×%13 (78k) = 432.000 TL
  const s25 = aautHesapla(ornekGirdi({ hesapTarihi: '2026-06-01' }, { davaDegeri: 3000000 }), tablolar);
  assert.equal(s25.tarifeDonemi, '2025-2026');
  assert.equal(s25.maktuUcret.toFixed(2), '45000.00');
  assert.equal(s25.davaci.hamNispiUcret.toFixed(2), '432000.00');
  assert.equal(s25.davaci.hukmedilenUcret.toFixed(2), '432000.00');
  assert.equal(s25.davaci.dilimler.length, 4);

  // 3) 2026-2027 dönemi (RG 03.11.2026/33419): 30.000.000 TL dava değeri (tüm 10 dilimi aşan hesap)
  // 800k×%16 (128k) + 800k×%15 (120k) + 1.600k×%14 (224k) + 1.600k×%13 (208k) + 2.400k×%11 (264k)
  // + 3.200k×%8 (256k) + 4.000k×%5 (200k) + 4.800k×%3 (144k) + 5.600k×%2 (112k) + 5.200k×%1 (52k) = 1.708.000 TL
  const s26 = aautHesapla(ornekGirdi({ hesapTarihi: '2026-11-10' }, { davaDegeri: 30000000 }), tablolar);
  assert.equal(s26.tarifeDonemi, '2026-2027');
  assert.equal(s26.maktuUcret.toFixed(2), '62000.00');
  assert.equal(s26.davaci.dilimler.length, 10);
  assert.equal(s26.davaci.hamNispiUcret.toFixed(2), '1708000.00');
  assert.equal(s26.davaci.hukmedilenUcret.toFixed(2), '1708000.00');
});

test('AAÜT m.13/1 maktu alt sınırı, m.13/2 müddeabih üst sınırı ve m.11/3 c.3 istihkak istisnası', () => {
  const tablolar = tablolariYukle();

  // 2026-2027 Asliye Hukuk maktu = 62.000 TL.
  // Dava değeri 200.000 TL -> ham nispi %16 = 32.000 TL < 62.000 TL -> maktu taban 62.000 TL uygulanır.
  const maktuTaban = aautHesapla(ornekGirdi({}, { davaDegeri: 200000 }), tablolar);
  assert.equal(maktuTaban.davaci.hamNispiUcret.toFixed(2), '32000.00');
  assert.equal(maktuTaban.davaci.maktuTabanUygulandiMi, true);
  assert.equal(maktuTaban.davaci.muddeabihTavaniUygulandiMi, false);
  assert.equal(maktuTaban.davaci.hukmedilenUcret.toFixed(2), '62000.00');

  // Dava değeri 15.000 TL (< 62.000 TL maktu) -> müddeabih tavanı 15.000 TL uygulanır (AAÜT m.13/2).
  const muddeabihTavan = aautHesapla(ornekGirdi({}, { davaDegeri: 15000 }), tablolar);
  assert.equal(muddeabihTavan.davaci.hamNispiUcret.toFixed(2), '2400.00');
  assert.equal(muddeabihTavan.davaci.maktuTabanUygulandiMi, true);
  assert.equal(muddeabihTavan.davaci.muddeabihTavaniUygulandiMi, true);
  assert.equal(muddeabihTavan.davaci.hukmedilenUcret.toFixed(2), '15000.00');

  // İcra mahkemesi normal dava vs istihkak davası (AAÜT m.11/3 c.2 ve c.3):
  // 500.000 TL değerinde uyuşmazlıkta ham nispi = 80.000 TL, maktu = 23.000 TL.
  const icraDava = aautHesapla(ornekGirdi({}, { merci: 'icra-mahkemesi-dava', davaDegeri: 500000 }), tablolar);
  assert.equal(icraDava.davaci.maktuTavanUygulandiMi, true);
  assert.equal(icraDava.davaci.hukmedilenUcret.toFixed(2), '23000.00');

  const icraIstihkak = aautHesapla(ornekGirdi({}, { merci: 'icra-mahkemesi-istihkak', davaDegeri: 500000 }), tablolar);
  assert.equal(icraIstihkak.davaci.maktuTavanUygulandiMi, false);
  assert.equal(icraIstihkak.davaci.hukmedilenUcret.toFixed(2), '80000.00');
});

test('Kısmi kabul / kısmi ret halinde davacı ve davalı lehine ayrı karşı vekalet ücreti', () => {
  const tablolar = tablolariYukle();

  // 2026-2027 Asliye Hukuk (maktu 62.000 TL):
  // Dava değeri: 2.500.000 TL, Kabul: 1.800.000 TL, Ret: 700.000 TL
  // Davacı: 800k×%16 (128k) + 800k×%15 (120k) + 200k×%14 (28k) = 276.000 TL
  // Davalı: 700k×%16 = 112.000 TL
  const s = aautHesapla(
    ornekGirdi({}, { davaDegeri: 2500000, kabulTutari: 1800000, retTutari: 700000 }),
    tablolar,
  );
  assert.equal(s.davaci.hukmedilenUcret.toFixed(2), '276000.00');
  assert.equal(s.davali.hukmedilenUcret.toFixed(2), '112000.00');

  // Ret tutarı küçük olduğunda davalı lehine maktu taban ve reddedilen müddeabih tavanı:
  // Dava: 500.000 TL, Kabul: 480.000 TL, Ret: 20.000 TL (Asliye maktu 62.000 TL > 20.000 TL -> davalı 20.000 TL)
  const kucukRet = aautHesapla(
    ornekGirdi({}, { davaDegeri: 500000, kabulTutari: 480000, retTutari: 20000 }),
    tablolar,
  );
  assert.equal(kucukRet.davaci.hukmedilenUcret.toFixed(2), '76800.00'); // 480.000 × %16
  assert.equal(kucukRet.davali.muddeabihTavaniUygulandiMi, true);
  assert.equal(kucukRet.davali.hukmedilenUcret.toFixed(2), '20000.00');
});

test('Manevi tazminat (AYM iptali / mülga m.10/2), maddi tazminat (AAÜT m.13/3-4) ve nafaka (AAÜT m.9/1-2) özel kuralları', () => {
  const tablolar = tablolariYukle();

  // 1a) 14.12.2025 sonrası manevi tazminat kısmi ret (AYM E.2024/29, K.2024/226; RG 08.01.2026/33131 ile m.10/2 mülga):
  // Davalı lehine karşı vekalet ücretine hükmedilemez (0,00 TL)!
  const maneviKismiYeni = aautHesapla(
    ornekGirdi(
      { hesapTarihi: '2026-11-10' },
      {
        nitelik: 'manevi-tazminat',
        davaDegeri: 1000000,
        kabulTutari: 100000,
        retTutari: 900000,
      },
    ),
    tablolar,
  );
  assert.equal(maneviKismiYeni.davaci.hukmedilenUcret.toFixed(2), '62000.00');
  assert.equal(maneviKismiYeni.davali.hukmedilenUcret.toFixed(2), '0.00');
  assert.ok(maneviKismiYeni.davali.dayanak.some((d) => d.includes('E.2024/29')));

  // 1b) 14.12.2025 öncesi manevi tazminat kısmi ret (mülga AAÜT m.10/2 yürürlükteyken):
  // Davalı ücreti davacı ücretini (45.000 TL) geçemez.
  const maneviKismiEski = aautHesapla(
    ornekGirdi(
      { hesapTarihi: '2025-11-20' },
      {
        nitelik: 'manevi-tazminat',
        davaDegeri: 1000000,
        kabulTutari: 100000,
        retTutari: 900000,
      },
    ),
    tablolar,
  );
  assert.equal(maneviKismiEski.davaci.hukmedilenUcret.toFixed(2), '45000.00');
  assert.equal(maneviKismiEski.davali.davaciUcretiTavaniUygulandiMi, true);
  assert.equal(maneviKismiEski.davali.hukmedilenUcret.toFixed(2), '45000.00');

  // 2) Maddi tazminat kısmi ret (2026-2027 AAÜT m.13/3):
  // Kabul 100.000 TL (maktu taban 62.000 TL), Ret 900.000 TL (nispi 143.000 TL) -> davalı 62.000 TL ile sınırlı!
  const maddiKismi = aautHesapla(
    ornekGirdi(
      { hesapTarihi: '2026-11-10' },
      {
        nitelik: 'maddi-tazminat',
        davaDegeri: 1000000,
        kabulTutari: 100000,
        retTutari: 900000,
      },
    ),
    tablolar,
  );
  assert.equal(maddiKismi.davaci.hukmedilenUcret.toFixed(2), '62000.00');
  assert.equal(maddiKismi.davali.hamNispiUcret.toFixed(2), '143000.00');
  assert.equal(maddiKismi.davali.davaciUcretiTavaniUygulandiMi, true);
  assert.equal(maddiKismi.davali.hukmedilenUcret.toFixed(2), '62000.00');

  // 3) Manevi tazminat tam ret: Kabul 0 TL, Ret 1.000.000 TL -> AAÜT m.10 uyarınca maktu 62.000 TL
  const maneviTamRet = aautHesapla(
    ornekGirdi(
      {},
      {
        nitelik: 'manevi-tazminat',
        davaDegeri: 1000000,
        kabulTutari: 0,
        retTutari: 1000000,
      },
    ),
    tablolar,
  );
  assert.equal(maneviTamRet.davaci.hukmedilenUcret.toFixed(2), '0.00');
  assert.equal(maneviTamRet.davali.tamRetMaktuUygulandiMi, true);
  assert.equal(maneviTamRet.davali.hukmedilenUcret.toFixed(2), '62000.00');

  // 4) Nafaka davasında kısmi ret: AAÜT m.9/2 uyarınca reddedilen kısım için vekalet ücretine hükmedilemez
  const nafaka = aautHesapla(
    ornekGirdi(
      {},
      {
        merci: 'aile',
        nitelik: 'nafaka',
        davaDegeri: 600000,
        kabulTutari: 400000,
        retTutari: 200000,
      },
    ),
    tablolar,
  );
  assert.equal(nafaka.davaci.hukmedilenUcret.toFixed(2), '64000.00');
  assert.equal(nafaka.davali.nafakaRetIstisnasiMi, true);
  assert.equal(nafaka.davali.hukmedilenUcret.toFixed(2), '0.00');
});

test('Ön inceleme öncesi 1/2 (AAÜT m.6, m.15) ve icra ödeme süresi içinde 3/4 (AAÜT m.11/4) oranları', () => {
  const tablolar = tablolariYukle();

  // 1) Ön inceleme tutanağı imzalanmadan feragat / sulh (1/2 oran):
  // 2026-2027 Asliye Hukuk, 1.000.000 TL kabul -> ham nispi 158.000 TL × 1/2 = 79.000 TL
  const onInceleme = aautHesapla(
    ornekGirdi(
      {},
      {
        davaDegeri: 1000000,
        asama: 'on-inceleme-oncesi',
        asamaGerekcesi: 'Ön inceleme tutanağı imzalanmadan önce feragat (AAÜT m.6/1)',
      },
    ),
    tablolar,
  );
  assert.equal(onInceleme.davaci.hamNispiUcret.toFixed(2), '158000.00');
  assert.equal(onInceleme.davaci.hukmedilenUcret.toFixed(2), '79000.00');

  // 2) İcra dairesinde ödeme süresi içinde borcun ödenmesi (3/4 oran, AAÜT m.11/4):
  // 2026-2027 İcra Dairesi (maktu 12.500 TL), takip tutarı 200.000 TL -> nispi 32.000 TL × 3/4 = 24.000 TL
  const icraOdeme = aautHesapla(
    ornekGirdi(
      {},
      {
        merci: 'icra-dairesi',
        davaDegeri: 200000,
        asama: 'odeme-suresi-icinde',
        asamaGerekcesi: 'Ödeme emri tebliğinden itibaren 7 günlük ödeme süresi içinde ödeme (AAÜT m.11/4)',
      },
    ),
    tablolar,
  );
  assert.equal(icraOdeme.maktuUcret.toFixed(2), '12500.00');
  assert.equal(icraOdeme.davaci.hamNispiUcret.toFixed(2), '32000.00');
  assert.equal(icraOdeme.davaci.hukmedilenUcret.toFixed(2), '24000.00');

  // 3) Maktu uyuşmazlık hesabı (Ağır Ceza Mahkemesi 2026-2027 = 86.000 TL)
  const maktuCeza = aautHesapla(
    aautGirdiCoz({
      alan: 'aaut',
      dosya: { mahkeme: 'Örnek 1. Ağır Ceza Mahkemesi', esasNo: '2026/5', kaynak: 'kendi dosyam', altAlan: '60.02' },
      hesapTarihi: '2026-11-10',
      uyusmazlik: { merci: 'agir-ceza', tur: 'maktu', maktuSonuc: 'ret' },
    }),
    tablolar,
  );
  assert.equal(maktuCeza.davaci.hukmedilenUcret.toFixed(2), '0.00');
  assert.equal(maktuCeza.davali.hukmedilenUcret.toFixed(2), '86000.00');
});

test('Girdi doğrulama kuralları ve örnek YAML üzerinden uçtan uca PDF + defter satırı üretimi', async () => {
  assert.throws(
    () => ornekGirdi({}, { asama: 'on-inceleme-oncesi' }),
    (e: unknown) => e instanceof GirdiHatasi && e.alanYolu === 'girdi.uyusmazlik.asamaGerekcesi',
  );
  assert.throws(
    () => ornekGirdi({}, { merci: 'asliye-hukuk', asama: 'odeme-suresi-icinde', asamaGerekcesi: 'x' }),
    /yalnız "icra-dairesi"/,
  );
  assert.throws(
    () => ornekGirdi({}, { davaDegeri: 100000, kabulTutari: 70000, retTutari: 40000 }),
    /toplamı davaDegeri/,
  );
  assert.throws(
    () => ornekGirdi({}, { merci: 'icra-dairesi', davaDegeri: 100000, kabulTutari: 70000, retTutari: 30000 }),
    /icra dairesi takiplerinde kısmi ret/,
  );
  assert.throws(
    () =>
      aautGirdiCoz({
        alan: 'aaut',
        dosya: { mahkeme: 'Örnek Aile Mahkemesi', esasNo: '2026/1', kaynak: 'kendi dosyam', altAlan: '60.02' },
        hesapTarihi: '2026-11-10',
        uyusmazlik: { merci: 'aile', tur: 'maktu', nitelik: 'nafaka', maktuSonuc: 'ret' },
      }),
    /maktu hesapta uyuşmazlık niteliği/,
  );

  const ornekYol = join(import.meta.dirname, '..', 'ornekler', 'ornek-aaut.yaml');
  assert.equal(girdiAlaniniAlgila(ornekYol), 'aaut');
  const { girdi, ozet } = aautGirdiOku(ornekYol);
  const sonuc = aautHesapla(girdi, tablolariYukle());

  assert.equal(sonuc.davaci.hukmedilenUcret.toFixed(2), '276000.00');
  assert.equal(sonuc.davali.hukmedilenUcret.toFixed(2), '112000.00');
  assert.equal(aautKanitDosyaAdi(sonuc, '2026-11-10'), '2026-11-10_ornek-asliye-hukuk-2026-10_60.02.pdf');

  const satir = aautDefterSatiri(sonuc, '2026-11-10', 'mizan 0.1.0');
  assert.match(satir, /aaüt \(2026-2027\)/);
  assert.match(satir, /davacı\/alacaklı vekalet ücreti 276\.000,00 TL, davalı karşı vekalet ücreti 112\.000,00 TL/);

  const pdfYol = join(mkdtempSync(join(tmpdir(), 'mizan-aaut-')), 'aaut-rapor.pdf');
  await pdfYaz(
    aautRaporTanimi(sonuc, { uretimZamani: '10.11.2026 14:00', surum: 'mizan test', girdiOzeti: ozet }),
    pdfYol,
  );
  assert.equal(readFileSync(pdfYol).subarray(0, 5).toString(), '%PDF-');
  assert.ok(statSync(pdfYol).size > 8_000);
});
