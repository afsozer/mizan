import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  GirdiHatasi,
  icraDefterSatiri,
  icraGirdiCoz,
  icraHesapla,
  icraKanitDosyaAdi,
  icraRaporTanimi,
  metindenAlanOku,
} from '../src/index.ts';
import { herhangiGirdiOku } from '../src/node/girdi-dosya.ts';
import { pdfYaz } from '../src/node/pdf-yaz.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';

function temelIcraGirdisi(ek: Record<string, unknown> = {}) {
  const varsayilanTakip = {
    takipTarihi: '2026-01-10',
    takipTuru: 'ilamsiz',
    asilAlacak: 100000,
    takipOncesiKalemler: [{ ad: 'İşlemiş faiz', tutar: 10000 }],
    faiz: { tur: 'yasal', gerekce: '3095 s.K. m.1 yasal faiz' },
    pesinHarcAlindiMi: true,
    tahsilHarciAsamasi: 'hacizden-once',
    feragatVarMi: false,
    vekaletUcreti: 16000,
    masraflar: [],
    kismiOdemeler: [],
  };
  return icraGirdiCoz({
    alan: 'icra',
    dosya: {
      mahkeme: 'Örnek İcra Dairesi',
      esasNo: '2026/1',
      kaynak: 'örnek hesap',
      altAlan: '60.05',
    },
    hesapTarihi: '2026-07-11',
    ...ek,
    takip: { ...varsayilanTakip, ...((ek.takip as Record<string, unknown>) ?? {}) },
  });
}

test('alan ayrımı ve kişisel veri / şema denetimi', () => {
  assert.equal(metindenAlanOku('alan: icra\ndosya: {}\n'), 'icra');
  assert.equal(metindenAlanOku('dosya: {}\n'), 'iscilik');
  assert.equal(metindenAlanOku('alan: iscilik\ndosya: {}\n'), 'iscilik');

  assert.throws(
    () =>
      icraGirdiCoz({
        alan: 'icra',
        dosya: { mahkeme: 'X', esasNo: '1', kaynak: 'k', altAlan: '60.05', borcluAdi: 'Ad Soyad' },
        hesapTarihi: '2026-05-01',
        takip: {},
      }),
    /tanınmayan alan "borcluAdi"/,
  );

  assert.throws(
    () => temelIcraGirdisi({ takip: { takipTuru: 'ilamli', pesinHarcAlindiMi: true } }),
    /492 s\.K\. m\.29/,
  );

  assert.throws(
    () => temelIcraGirdisi({ takip: { faiz: { tur: 'sozlesme', gerekce: 'sözleşme' } } }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.faiz.sozlesmeOrani' && /sozlesmeOrani/.test(err.message),
  );

  // Kısmi ödeme tahsilYeri / tahsilHarciOrani / kesilenTahsilHarci geçerlilik denetimleri
  assert.throws(
    () =>
      temelIcraGirdisi({
        takip: {
          kismiOdemeler: [
            { tarih: '2026-02-01', tutar: 1000, tahsilYeri: 'haricen', tahsilHarciOrani: 0.0455 },
          ],
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.kismiOdemeler[0].tahsilHarciOrani',
  );
  assert.throws(
    () =>
      temelIcraGirdisi({
        takip: {
          kismiOdemeler: [
            { tarih: '2026-02-01', tutar: 1000, tahsilYeri: 'haricen', kesilenTahsilHarci: 45 },
          ],
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.kismiOdemeler[0].kesilenTahsilHarci',
  );
  assert.throws(
    () =>
      temelIcraGirdisi({
        takip: {
          kismiOdemeler: [
            { tarih: '2026-02-01', tutar: 1000, tahsilHarciOrani: 0.0455, kesilenTahsilHarci: 45 },
          ],
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.kismiOdemeler[0].kesilenTahsilHarci',
  );
  assert.throws(
    () =>
      temelIcraGirdisi({
        takip: {
          kismiOdemeler: [{ tarih: '2026-02-01', tutar: 1000, kesilenTahsilHarci: 1001 }],
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.kismiOdemeler[0].kesilenTahsilHarci',
  );
  assert.throws(
    () =>
      temelIcraGirdisi({
        takip: {
          kismiOdemeler: [{ tarih: '2026-02-01', tutar: 1000, kesilenTahsilHarci: -1 }],
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.kismiOdemeler[0].kesilenTahsilHarci',
  );
  assert.throws(
    () =>
      temelIcraGirdisi({
        takip: {
          kismiOdemeler: [{ tarih: '2026-02-01', tutar: 1000, tahsilHarciOrani: -0.01 }],
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.kismiOdemeler[0].tahsilHarciOrani',
  );
  assert.throws(
    () =>
      temelIcraGirdisi({
        takip: {
          kismiOdemeler: [{ tarih: '2026-02-01', tutar: 1000, tahsilHarciOrani: 1.01 }],
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.kismiOdemeler[0].tahsilHarciOrani',
  );
  assert.equal(
    temelIcraGirdisi({
      takip: { kismiOdemeler: [{ tarih: '2026-02-01', tutar: 1000, tahsilHarciOrani: 0 }] },
    }).takip.kismiOdemeler[0]?.tahsilHarciOrani?.toString(),
    '0',
  );
});

test('492 s.K. harçlar, peşin harç mahsubu, feragat indirimi ve 2548 s.K. cezaevi harcı ayrımı', () => {
  const tablolar = tablolariYukle();
  // Asıl alacak 100.000 + takip öncesi 10.000 = 110.000 TL takip çıkışı (harç matrahı)
  const g = temelIcraGirdisi({
    hesapTarihi: '2026-01-10', // 0 gün faiz ile saf harç/kapak denetimi
  });
  const s = icraHesapla(g, tablolar);

  assert.equal(s.takipCikisToplami.toFixed(2), '110000.00');
  assert.equal(s.harclar.harcMatrahi.toFixed(2), '110000.00');
  // 2026 Seri No: 98 Tebliği icra başvurma harcı = 732,00 TL
  assert.equal(s.harclar.basvurmaHarci.toFixed(2), '732.00');
  // Peşin harç = 110.000 * 0,005 = 550,00 TL
  assert.equal(s.harclar.pesinHarc.toFixed(2), '550.00');
  // Hacizden önce tahsil harcı (%4,55) = 110.000 * 0,0455 = 5.005,00 TL
  assert.equal(s.harclar.hesaplananTahsilHarci.toFixed(2), '5005.00');
  // Mahsup edilen peşin harç = 550,00 TL -> Bakiye tahsil harcı = 4.455,00 TL
  assert.equal(s.harclar.mahsupEdilenPesinHarc.toFixed(2), '550.00');
  assert.equal(s.harclar.bakiyeTahsilHarci.toFixed(2), '4455.00');
  // 2548 s.K. m.1 cezaevi yapı harcı (%2) = 110.000 * 0,02 = 2.200,00 TL
  assert.equal(s.harclar.cezaeviHarci.toFixed(2), '2200.00');

  // Alacaklı brüt alacağı = 110.000 + 732 + 550 + 16.000 = 127.282,00 TL
  assert.equal(s.alacakliBrutAlacagi.toFixed(2), '127282.00');
  // Borçlunun ödeyeceği kapak tutarı = 127.282,00 + 4.455,00 = 131.737,00 TL (cezaevi harcı borçluya yüklenmez!)
  assert.equal(s.borclununOdeyecegiKapakTutari.toFixed(2), '131737.00');
  // Alacaklıya net ödenecek tutar = 127.282,00 - 2.200,00 = 125.082,00 TL
  assert.equal(s.alacakliyaNetOdenecekTutar.toFixed(2), '125082.00');

  // Feragat (492 s.K. m.23): satıştan önce (%9,10) -> yarı oran (%4,55); 2548 s.K. m.1 cezaevi harcı doğmaz (0,00 TL)
  const feragatSatisOncesi = icraHesapla(
    temelIcraGirdisi({
      hesapTarihi: '2026-01-10',
      takip: { tahsilHarciAsamasi: 'satistan-once', feragatVarMi: true },
    }),
    tablolar,
  );
  assert.equal(feragatSatisOncesi.harclar.feragatIndirimiUygulandiMi, true);
  assert.equal(feragatSatisOncesi.harclar.uygulananTahsilOrani.toString(), '0.0455');
  assert.equal(feragatSatisOncesi.harclar.hesaplananTahsilHarci.toFixed(2), '5005.00');
  assert.equal(feragatSatisOncesi.harclar.cezaeviHarci.toFixed(2), '0.00');

  // Feragat (492 s.K. m.23 c.2): satıştan sonra vazgeçmede indirim uygulanmaz, tam (%11,38) alınır ve cezaevi harcı doğar
  const feragatSatisSonrasi = icraHesapla(
    temelIcraGirdisi({
      hesapTarihi: '2026-01-10',
      takip: { tahsilHarciAsamasi: 'satistan-sonra', feragatVarMi: true },
    }),
    tablolar,
  );
  assert.equal(feragatSatisSonrasi.harclar.feragatIndirimiUygulandiMi, false);
  assert.equal(feragatSatisSonrasi.harclar.uygulananTahsilOrani.toString(), '0.1138');
  assert.equal(feragatSatisSonrasi.harclar.cezaeviHarci.toFixed(2), '2200.00');
  assert.ok(feragatSatisSonrasi.uyarilar.some((u) => u.includes('492 s.K. m.23 c.2')));

  // Tebliğden önce ödeme: tahsil harcı %0, bakiye tahsil harcı 0, cezaevi harcı 0, peşin harç borçluya yüklenmez (alacaklıya iadeye tabidir)
  const tebligOncesi = icraHesapla(
    temelIcraGirdisi({
      hesapTarihi: '2026-01-10',
      takip: { tahsilHarciAsamasi: 'tebligden-once' },
    }),
    tablolar,
  );
  assert.equal(tebligOncesi.harclar.hesaplananTahsilHarci.toFixed(2), '0.00');
  assert.equal(tebligOncesi.harclar.mahsupEdilenPesinHarc.toFixed(2), '0.00');
  assert.equal(tebligOncesi.harclar.bakiyeTahsilHarci.toFixed(2), '0.00');
  assert.equal(tebligOncesi.harclar.cezaeviHarci.toFixed(2), '0.00');
  assert.equal(tebligOncesi.borclununOdeyecegiKapakTutari.toFixed(2), '126732.00');
  assert.ok(tebligOncesi.uyarilar.some((u) => u.includes('alacaklıya iadeye tabidir')));

  // Borcu aşan kısmi ödemede fazla ödeme uyarısı üretilir
  const asanOdeme = icraHesapla(
    temelIcraGirdisi({
      hesapTarihi: '2026-01-10',
      takip: {
        kismiOdemeler: [{ tarih: '2026-01-10', tutar: 150000, aciklama: 'Fazla ödeme' }],
      },
    }),
    tablolar,
  );
  assert.ok(asanOdeme.uyarilar.some((u) => u.includes('fazla ödeme oluştu')));
});

test('TBK m.100 çoklu kısmi ödeme mahsubu ve TCMB avans faizi oran değişim gününde kesit bölünmesi', () => {
  const tablolar = tablolariYukle();
  // Takip tarihi: 2025-11-20, Hesap tarihi: 2026-03-10
  // TCMB avans faizi 2025-12-19'a kadar %43,25, 2025-12-20'den itibaren %39,25
  // 1. kısmi ödeme: 2026-01-19 (2025-11-20 -> 2025-12-19: 29 gün %43,25; 2025-12-20 -> 2026-01-19: 31 gün %39,25)
  // 2. kısmi ödeme: 2026-02-18 (2026-01-19 -> 2026-02-18: 30 gün %39,25)
  // Son dönem: 2026-02-18 -> 2026-03-10: 20 gün %39,25
  const g = temelIcraGirdisi({
    hesapTarihi: '2026-03-10',
    takip: {
      takipTarihi: '2025-11-20',
      takipTuru: 'ilamsiz',
      asilAlacak: 100000,
      takipOncesiKalemler: [{ ad: 'Takip öncesi faiz', tutar: 5000 }],
      faiz: { tur: 'avans', gerekce: '3095 s.K. m.2/2 ticari avans faizi' },
      pesinHarcAlindiMi: true,
      tahsilHarciAsamasi: 'satistan-once',
      feragatVarMi: false,
      vekaletUcreti: 10000,
      masraflar: [{ tarih: '2025-12-01', tutar: 1000, aciklama: 'Tebligat ve haciz gideri' }],
      kismiOdemeler: [
        { tarih: '2026-01-19', tutar: 15000, aciklama: '1. kısmi ödeme (faiz ve gideri aşmayan)', tahsilYeri: 'haricen' },
        { tarih: '2026-02-18', tutar: 30000, aciklama: '2. kısmi ödeme (anaparayı azaltan)', tahsilYeri: 'haricen' },
      ],
    },
  });

  const s = icraHesapla(g, tablolar);

  // 1. kısmi ödeme öncesi dönem faizi: 2 kesit (29 gün %42,25 + 31 gün %39,75)
  const adim1 = s.kismiOdemeAdimlari[0]!;
  assert.equal(adim1.donemFaizi.kesitler.length, 2);
  assert.deepEqual(
    adim1.donemFaizi.kesitler.map((k) => [k.baslangic, k.bitis, k.gun, k.oran.toString(), k.tutar.toFixed(2)]),
    [
      ['2025-11-21', '2025-12-19', 29, '0.4225', '3356.85'],
      ['2025-12-20', '2026-01-19', 31, '0.3975', '3376.03'],
    ],
  );
  assert.equal(adim1.donemFaizi.toplam.toFixed(2), '6732.88');

  // Başlangıç faiz/gider havuzu:
  // takipOncesi (5000) + 2025 başvurma harcı (615.40) + peşin harç (105000 * 0.005 = 525.00) + vekalet (10000) = 16140.40
  // + 1. dönem masrafı (1000) + 1. dönem faizi (6732.88) = 23873.28 TL
  assert.equal(adim1.mahsupOncesiFaizVeGider.toFixed(2), '23873.28');
  // 15.000 TL ödeme tamamıyla faiz/giderden düşer, asıl alacak 100.000 TL kalır!
  assert.equal(adim1.faizVeGiderdenMahsup.toFixed(2), '15000.00');
  assert.equal(adim1.asilAlacaktanMahsup.toFixed(2), '0.00');
  assert.equal(adim1.kalanFaizVeGider.toFixed(2), '8873.28');
  assert.equal(adim1.kalanAsilAlacak.toFixed(2), '100000.00');

  // 2. kısmi ödeme (30.000 TL):
  // 30 gün * 100.000 * 0.3975 / 365 = 3267.12 TL faiz
  // Mahsup öncesi faiz/gider = 8873.28 + 3267.12 = 12140.40 TL
  // 30.000 TL ödemenin 12.140,40 TL'si faiz/gideri sıfırlar, kalan 17.859,60 TL anaparadan düşer -> kalan anapara = 82.140,40 TL!
  const adim2 = s.kismiOdemeAdimlari[1]!;
  assert.equal(adim2.donemFaizi.toplam.toFixed(2), '3267.12');
  assert.equal(adim2.mahsupOncesiFaizVeGider.toFixed(2), '12140.40');
  assert.equal(adim2.faizVeGiderdenMahsup.toFixed(2), '12140.40');
  assert.equal(adim2.asilAlacaktanMahsup.toFixed(2), '17859.60');
  assert.equal(adim2.kalanFaizVeGider.toFixed(2), '0.00');
  assert.equal(adim2.kalanAsilAlacak.toFixed(2), '82140.40');

  // Son dönem (20 gün) faizi yalnız kalan 82.140,40 TL anapara üzerinden yürür:
  // 82140.40 * 0.3975 * 20 / 365 = 1789.09 TL
  const sonDonem = s.faizDonemleri[2]!;
  assert.equal(sonDonem.matrah.toFixed(2), '82140.40');
  assert.equal(sonDonem.toplam.toFixed(2), '1789.09');
  assert.equal(s.kalanAsilAlacak.toFixed(2), '82140.40');
  assert.equal(s.kalanFaizVeGider.toFixed(2), '1789.09');
});

test('uçtan uca: ornekler/ornek-icra.yaml ile PDF rapor ve defter satırı üretimi', async () => {
  const okunan = herhangiGirdiOku(join(import.meta.dirname, '..', 'ornekler', 'ornek-icra.yaml'));
  assert.equal(okunan.alan, 'icra');
  const s = icraHesapla(okunan.girdi, tablolariYukle());

  assert.equal(icraKanitDosyaAdi(s, '2026-11-11'), '2026-11-11_ornek-icra-2026-1_60.05.pdf');
  const satir = icraDefterSatiri(s, '2026-11-11', 'mizan 0.1.0');
  assert.equal(satir.split('|').length, 9);
  assert.match(satir, /borçlunun ödeyeceği kapak tutarı/);
  assert.match(satir, /alacaklıya net ödenecek tutar/);

  const tanim = icraRaporTanimi(s, {
    uretimZamani: '11.11.2026 14:00',
    surum: 'mizan test',
    girdiOzeti: okunan.ozet,
  });
  const tanimMetni = JSON.stringify(tanim);
  assert.ok(tanimMetni.includes('Borçlunun ödeyeceği kapak tutarı'));
  assert.ok(tanimMetni.includes('Alacaklıya net ödenecek tutar'));

  const yol = join(mkdtempSync(join(tmpdir(), 'mizan-icra-')), 'ornek-icra.pdf');
  await pdfYaz(tanim, yol);
  assert.equal(readFileSync(yol).subarray(0, 5).toString(), '%PDF-');
  assert.ok(statSync(yol).size > 10_000);
});

test('492 s.K. m.28/1-b ve Yargıtay 12. HD 2022/10807 E.: vezne kısmi ödemesinde tahsil ve cezaevi harcı ayrıştırılır', () => {
  const tablolar = tablolariYukle();
  const g = temelIcraGirdisi({
    hesapTarihi: '2026-09-02',
    takip: {
      takipTarihi: '2026-08-14',
      takipTuru: 'ilamsiz',
      asilAlacak: 10000,
      takipOncesiKalemler: [],
      faiz: { tur: 'yasal', gerekce: '3095 s.K. m.1 yasal faiz' },
      pesinHarcAlindiMi: true,
      tahsilHarciAsamasi: 'hacizden-once',
      feragatVarMi: false,
      vekaletUcreti: 6750,
      masraflar: [
        { tarih: '2026-08-14', tutar: 530, aciklama: 'Tebligat ve dosya masrafı' },
        { tarih: '2026-08-20', tutar: 104, aciklama: 'Sorgu gideri' },
      ],
      kismiOdemeler: [{ tarih: '2026-09-02', tutar: 18724, aciklama: 'Vezne kısmi ödemesi' }],
    },
  });

  const s = icraHesapla(g, tablolar);
  assert.equal(s.harclar.basvurmaHarci.toFixed(2), '732.00');
  assert.equal(s.harclar.pesinHarc.toFixed(2), '50.00');
  assert.equal(s.harclar.hesaplananTahsilHarci.toFixed(2), '455.00');
  assert.equal(s.harclar.mahsupEdilenPesinHarc.toFixed(2), '50.00');

  const adim = s.kismiOdemeAdimlari[0]!;
  assert.equal(adim.tahsilYeri, 'vezne');
  assert.equal(adim.donemFaizi.toplam.toFixed(2), '161.37');
  assert.equal(adim.kesilenTahsilHarci.toFixed(2), '405.00');
  assert.equal(adim.alacakliyaMahsupEdilen.toFixed(2), '18319.00');
  assert.equal(adim.kalanAsilAlacak.toFixed(2), '8.37');

  assert.equal(s.harclar.odemelerdenKesilenTahsilHarci.toFixed(2), '405.00');
  assert.equal(s.harclar.bakiyeTahsilHarci.toFixed(2), '0.00');
  assert.equal(s.harclar.hesaplananCezaeviHarci.toFixed(2), '200.00');
  assert.equal(s.harclar.odemelerdenKesilenCezaeviHarci.toFixed(2), '200.00');
  assert.equal(s.harclar.cezaeviHarci.toFixed(2), '0.00');
  assert.equal(s.borclununOdeyecegiKapakTutari.toFixed(2), '8.37');
  assert.equal(s.alacakliyaNetOdenecekTutar.toFixed(2), '8.37');
  assert.equal(s.uyarilar.length, 0);

  const raporMetni = JSON.stringify(
    icraRaporTanimi(s, { uretimZamani: '17.11.2026 12:00', surum: 'mizan test', girdiOzeti: 'sha256-vezne' }),
  );
  assert.ok(raporMetni.includes('Tahsil yeri'));
  assert.ok(raporMetni.includes('Harç kesintisi (TL)'));
  assert.ok(raporMetni.includes('Alacaklıya mahsup (TL)'));
  assert.ok(raporMetni.includes('Ödemelerden kesilen tahsil harcı'));
  assert.ok(raporMetni.includes('Ödemelerden kesilen cezaevi harcı'));
});

test('aşamalı tahsilHarciOrani (%4,55 + %9,10 tavan sınırı) ve karma vezne/haricen ödemeleri', () => {
  const tablolar = tablolariYukle();
  const g = temelIcraGirdisi({
    hesapTarihi: '2026-01-10',
    takip: {
      takipTarihi: '2026-01-10',
      takipTuru: 'ilamsiz',
      asilAlacak: 100000,
      takipOncesiKalemler: [],
      faiz: { tur: 'yasal', gerekce: '3095 s.K. m.1' },
      pesinHarcAlindiMi: true,
      tahsilHarciAsamasi: 'satistan-once',
      feragatVarMi: false,
      vekaletUcreti: 60000,
      masraflar: [],
      kismiOdemeler: [
        { tarih: '2026-01-10', tutar: 100000, tahsilYeri: 'vezne', tahsilHarciOrani: 0.0455, aciklama: 'Haciz öncesi vezne' },
        { tarih: '2026-01-10', tutar: 10000, tahsilYeri: 'haricen', aciklama: 'Haricen kısmi tahsilat' },
        { tarih: '2026-01-10', tutar: 55000, tahsilYeri: 'vezne', aciklama: 'Haciz sonrası vezne' },
      ],
    },
  });

  const s = icraHesapla(g, tablolar);
  // 1. adım: 100.000 * 0,0455 = 4.550; aşama tavanı = 4.550 - 500 (peşin) = 4.050 -> 4.050 kesilir
  assert.equal(s.kismiOdemeAdimlari[0]!.tahsilYeri, 'vezne');
  assert.equal(s.kismiOdemeAdimlari[0]!.kesilenTahsilHarci.toFixed(2), '4050.00');
  assert.equal(s.kismiOdemeAdimlari[0]!.alacakliyaMahsupEdilen.toFixed(2), '95950.00');
  // 2. adım: haricen -> 0 kesinti
  assert.equal(s.kismiOdemeAdimlari[1]!.tahsilYeri, 'haricen');
  assert.equal(s.kismiOdemeAdimlari[1]!.kesilenTahsilHarci.toFixed(2), '0.00');
  assert.equal(s.kismiOdemeAdimlari[1]!.alacakliyaMahsupEdilen.toFixed(2), '10000.00');
  // 3. adım: 55.000 * 0,091 = 5.005; kalan %9,10 tavanı = 9.100 - 500 - 4.050 = 4.550 -> 4.550 kesilir
  assert.equal(s.kismiOdemeAdimlari[2]!.tahsilYeri, 'vezne');
  assert.equal(s.kismiOdemeAdimlari[2]!.kesilenTahsilHarci.toFixed(2), '4550.00');
  assert.equal(s.kismiOdemeAdimlari[2]!.alacakliyaMahsupEdilen.toFixed(2), '50450.00');

  assert.equal(s.harclar.odemelerdenKesilenTahsilHarci.toFixed(2), '8600.00');
  assert.equal(s.harclar.bakiyeTahsilHarci.toFixed(2), '0.00');
  assert.equal(s.harclar.odemelerdenKesilenCezaeviHarci.toFixed(2), '2000.00');
  assert.equal(s.harclar.cezaeviHarci.toFixed(2), '0.00');
  assert.equal(s.kalanAsilAlacak.toFixed(2), '4832.00');
  assert.equal(s.borclununOdeyecegiKapakTutari.toFixed(2), '4832.00');
  assert.equal(s.alacakliyaNetOdenecekTutar.toFixed(2), '4832.00');
});

test('makbuzda kesilenTahsilHarci kalan bakiye harcı aşarsa İİK m.15 uyarısı verilir ve gerçek kesinti düşülür', () => {
  const tablolar = tablolariYukle();
  const g = temelIcraGirdisi({
    hesapTarihi: '2026-01-10',
    takip: {
      takipTarihi: '2026-01-10',
      takipTuru: 'ilamsiz',
      asilAlacak: 10000,
      takipOncesiKalemler: [],
      faiz: { tur: 'yasal', gerekce: '3095 s.K. m.1' },
      pesinHarcAlindiMi: true,
      tahsilHarciAsamasi: 'hacizden-once',
      feragatVarMi: false,
      vekaletUcreti: 0,
      masraflar: [],
      kismiOdemeler: [
        { tarih: '2026-01-10', tutar: 10000, tahsilYeri: 'vezne', kesilenTahsilHarci: 600, aciklama: 'Makbuz kesintisi' },
      ],
    },
  });

  const s = icraHesapla(g, tablolar);
  assert.ok(s.uyarilar.some((u) => u.includes('İİK m.15') && u.includes('2022/10807 E., 2023/3309 K.')));
  assert.equal(s.kismiOdemeAdimlari[0]!.kesilenTahsilHarci.toFixed(2), '600.00');
  assert.equal(s.kismiOdemeAdimlari[0]!.alacakliyaMahsupEdilen.toFixed(2), '9400.00');
  assert.equal(s.harclar.odemelerdenKesilenTahsilHarci.toFixed(2), '600.00');
  assert.equal(s.harclar.bakiyeTahsilHarci.toFixed(2), '0.00');
  // Başlangıç borcu: 10.000 + 732 + 50 = 10.782; 9.400 mahsup sonrası kalan asıl alacak = 1.382,00 TL
  assert.equal(s.kalanAsilAlacak.toFixed(2), '1382.00');
  assert.equal(s.borclununOdeyecegiKapakTutari.toFixed(2), '1382.00');
});

test('alacakKalemleri ve faiz.baslangicTarihi şema geçerlilik denetimleri', () => {
  assert.throws(
    () =>
      icraGirdiCoz({
        alan: 'icra',
        dosya: { mahkeme: 'Örnek İcra', esasNo: '2026/2', kaynak: 'test', altAlan: '60.05' },
        hesapTarihi: '2026-05-01',
        takip: {
          takipTarihi: '2026-01-10',
          takipTuru: 'ilamsiz',
          asilAlacak: 1000,
          alacakKalemleri: [
            {
              ad: 'Ana kalem',
              tutar: 1000,
              faiz: { tur: 'yasal', gerekce: 'yasal faiz' },
            },
          ],
          tahsilHarciAsamasi: 'hacizden-once',
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.asilAlacak',
  );

  assert.throws(
    () =>
      icraGirdiCoz({
        alan: 'icra',
        dosya: { mahkeme: 'Örnek İcra', esasNo: '2026/2', kaynak: 'test', altAlan: '60.05' },
        hesapTarihi: '2026-05-01',
        takip: {
          takipTarihi: '2026-01-10',
          takipTuru: 'ilamsiz',
          faiz: { tur: 'yasal', gerekce: 'yasal' },
          alacakKalemleri: [
            {
              ad: 'Ana kalem',
              tutar: 1000,
              faiz: { tur: 'yasal', gerekce: 'yasal faiz' },
            },
          ],
          tahsilHarciAsamasi: 'hacizden-once',
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.faiz',
  );

  assert.throws(
    () =>
      icraGirdiCoz({
        alan: 'icra',
        dosya: { mahkeme: 'Örnek İcra', esasNo: '2026/2', kaynak: 'test', altAlan: '60.05' },
        hesapTarihi: '2026-05-01',
        takip: {
          takipTarihi: '2026-01-10',
          takipTuru: 'ilamsiz',
          alacakKalemleri: [],
          tahsilHarciAsamasi: 'hacizden-once',
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.alacakKalemleri',
  );

  assert.throws(
    () =>
      icraGirdiCoz({
        alan: 'icra',
        dosya: { mahkeme: 'Örnek İcra', esasNo: '2026/2', kaynak: 'test', altAlan: '60.05' },
        hesapTarihi: '2026-05-01',
        takip: {
          takipTarihi: '2026-01-10',
          takipTuru: 'ilamli',
          alacakKalemleri: [
            {
              ad: 'İlam kalemi',
              tutar: 1000,
              pesinHarcaTabiMi: true,
              faiz: { tur: 'yasal', gerekce: 'yasal' },
            },
          ],
          tahsilHarciAsamasi: 'hacizden-once',
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.alacakKalemleri[0].pesinHarcaTabiMi',
  );

  assert.throws(
    () =>
      icraGirdiCoz({
        alan: 'icra',
        dosya: { mahkeme: 'Örnek İcra', esasNo: '2026/2', kaynak: 'test', altAlan: '60.05' },
        hesapTarihi: '2026-05-01',
        takip: {
          takipTarihi: '2026-01-10',
          takipTuru: 'ilamsiz',
          alacakKalemleri: [
            {
              ad: 'Farklı tarihli kalem',
              tutar: 1000,
              faizBaslangicTarihi: '2026-02-01',
              faiz: { tur: 'yasal', baslangicTarihi: '2026-03-01', gerekce: 'yasal' },
            },
          ],
          tahsilHarciAsamasi: 'hacizden-once',
        },
      }),
    (err: unknown) => err instanceof GirdiHatasi && err.alanYolu === 'girdi.takip.alacakKalemleri[0].faiz.baslangicTarihi',
  );
});

test('TTK m.1530/7 ticari temerrüt faizi 1 Ocak değişim kesitleriyle kuruşuna kadar hesaplanır', () => {
  const tablolar = tablolariYukle();
  const g = temelIcraGirdisi({
    hesapTarihi: '2023-08-02',
    takip: {
      takipTarihi: '2020-12-30',
      takipTuru: 'ilamsiz',
      asilAlacak: 149924.51,
      takipOncesiKalemler: [],
      faiz: { tur: 'ttk1530', gerekce: '6102 s.K. TTK m.1530/7 mal ve hizmet tedarikinde temerrüt' },
      pesinHarcAlindiMi: true,
      tahsilHarciAsamasi: 'hacizden-once',
      feragatVarMi: false,
      vekaletUcreti: 17616.51,
      masraflar: [{ tarih: '2020-12-30', tutar: 134.3, aciklama: 'Dosya masrafı' }],
      kismiOdemeler: [],
    },
  });

  const s = icraHesapla(g, tablolar);
  assert.equal(s.faizDonemleri.length, 1);
  assert.equal(s.faizDonemleri[0]!.kesitler.length, 4);
  assert.deepEqual(
    s.faizDonemleri[0]!.kesitler.map((k) => k.tutar.toFixed(2)),
    ['61.61', '27361.22', '25861.98', '10328.36'],
  );
  // TCMB TTK m.1530/7 tebligleri 1 Ocak gecerlilik tarihli oldugundan 01.01 kesitleriyle 63.613,17 TL hesaplanir
  assert.equal(s.toplamTakipSonrasiFaiz.toFixed(2), '63613.17');
  assert.equal(s.harclar.pesinHarc.toFixed(2), '749.62');
  assert.equal(s.harclar.bakiyeTahsilHarci.toFixed(2), '6071.95');
  assert.equal(s.harclar.hesaplananTahsilHarci.toFixed(2), '6821.57');
  assert.ok(s.dayanaklar.some((d) => d.includes('Türk Ticaret Kanunu m.1530/7')));
});

test('çoklu alacak kalemleri farklı faiz başlangıçları, faiz türleri ve peşin harç ayrımıyla hesaplanır', () => {
  const tablolar = tablolariYukle();
  const ortakVeri = (ekKalemPesin: boolean) =>
    icraGirdiCoz({
      alan: 'icra',
      dosya: { mahkeme: 'Örnek İcra Dairesi', esasNo: '2026/10', kaynak: 'test', altAlan: '60.05' },
      hesapTarihi: '2023-05-02',
      parametreler: { faizGunEsasi: 365 },
      takip: {
        takipTarihi: '2021-12-29',
        takipTuru: 'ilamsiz',
        pesinHarcAlindiMi: true,
        tahsilHarciAsamasi: 'satistan-once',
        feragatVarMi: false,
        vekaletUcreti: 44341.09,
        alacakKalemleri: [
          {
            ad: 'Asıl fatura alacağı',
            tutar: 215337.37,
            faizBaslangicTarihi: '2021-12-29',
            pesinHarcaTabiMi: true,
            faiz: { tur: 'ttk1530', gerekce: 'TTK m.1530/7 ticari temerrüt faizi' },
          },
          {
            ad: 'İcra inkar tazminatı',
            tutar: 43067.47,
            faizBaslangicTarihi: '2023-03-31',
            pesinHarcaTabiMi: ekKalemPesin,
            faiz: { tur: 'yasal', gerekce: 'İlam tarihinden itibaren yasal faiz' },
          },
          {
            ad: 'İlam vekalet ücreti',
            tutar: 33147.23,
            faizBaslangicTarihi: '2023-03-31',
            pesinHarcaTabiMi: ekKalemPesin,
            faiz: { tur: 'yasal', gerekce: 'İlam tarihinden itibaren yasal faiz' },
          },
          {
            ad: 'Yargılama giderleri',
            tutar: 3741.44,
            faizBaslangicTarihi: '2023-03-31',
            pesinHarcaTabiMi: ekKalemPesin,
            faiz: { tur: 'yasal', gerekce: 'İlam tarihinden itibaren yasal faiz' },
          },
        ],
      },
    });

  const sTamPesin = icraHesapla(ortakVeri(true), tablolar);
  assert.equal(sTamPesin.asilAlacak.toFixed(2), '295293.51');
  assert.equal(sTamPesin.alacakKalemleri.length, 4);
  assert.equal(sTamPesin.alacakKalemleri[0]!.islenenFaiz.toFixed(2), '45818.19');
  assert.equal(
    sTamPesin.alacakKalemleri[1]!.islenenFaiz
      .plus(sTamPesin.alacakKalemleri[2]!.islenenFaiz)
      .plus(sTamPesin.alacakKalemleri[3]!.islenenFaiz)
      .toFixed(2),
    '630.89',
  );
  assert.equal(sTamPesin.toplamTakipSonrasiFaiz.toFixed(2), '46449.08');
  assert.equal(sTamPesin.harclar.pesinHarc.toFixed(2), '1476.47');

  const sKismiPesin = icraHesapla(ortakVeri(false), tablolar);
  assert.equal(sKismiPesin.toplamTakipSonrasiFaiz.toFixed(2), '46449.08');
  // Yalnız 1. kalem (215.337,37 TL) peşin harca tabi -> binde 5 = 1.076,69 TL
  assert.equal(sKismiPesin.harclar.pesinHarc.toFixed(2), '1076.69');
  assert.equal(sKismiPesin.harclar.hesaplananTahsilHarci.toFixed(2), '26871.71');
  assert.equal(sKismiPesin.harclar.bakiyeTahsilHarci.toFixed(2), '25795.02');
});

test('çoklu kalemde TBK m.102 kısmi ödeme mahsubu: sira, yuksek-faiz, orantili ve muacceliyet', () => {
  const tablolar = tablolariYukle();
  const senaryoKur = (kalemMahsupSirasi: 'sira' | 'yuksek-faiz' | 'orantili') =>
    icraHesapla(
      icraGirdiCoz({
        alan: 'icra',
        dosya: { mahkeme: 'Örnek İcra', esasNo: '2025/99', kaynak: 'test', altAlan: '60.05' },
        hesapTarihi: '2025-07-01',
        parametreler: { kalemMahsupSirasi },
        takip: {
          takipTarihi: '2025-01-01',
          takipTuru: 'ilamli',
          tahsilHarciAsamasi: 'hacizden-once',
          vekaletUcreti: 0,
          alacakKalemleri: [
            {
              ad: 'Yasal faizli kalem',
              tutar: 100000,
              faizBaslangicTarihi: '2025-01-01',
              faiz: { tur: 'yasal', gerekce: 'yasal %24' },
            },
            {
              ad: 'TTK 1530 kalemi',
              tutar: 50000,
              faizBaslangicTarihi: '2025-01-01',
              faiz: { tur: 'ttk1530', gerekce: 'TTK 1530 %53,25' },
            },
            {
              ad: 'İleri vadeli kalem',
              tutar: 30000,
              faizBaslangicTarihi: '2025-06-01',
              faiz: { tur: 'sozlesme', sozlesmeOrani: 0.6, gerekce: 'akdi %60' },
            },
          ],
          kismiOdemeler: [
            // 2025 başvurma harcı (615,40 TL) + 90.000,00 TL anapara mahsubu
            { tarih: '2025-01-01', tutar: 90615.4, tahsilYeri: 'haricen', aciklama: 'Haricen kısmi tahsilat' },
          ],
        },
      }),
      tablolar,
    );

  const sSira = senaryoKur('sira');
  assert.deepEqual(
    sSira.alacakKalemleri.map((k) => k.kalanAnapara.toFixed(2)),
    ['10000.00', '50000.00', '30000.00'],
  );

  const sYuksek = senaryoKur('yuksek-faiz');
  assert.deepEqual(
    sYuksek.alacakKalemleri.map((k) => k.kalanAnapara.toFixed(2)),
    ['60000.00', '0.00', '30000.00'],
  );

  const sOrantili = senaryoKur('orantili');
  assert.deepEqual(
    sOrantili.alacakKalemleri.map((k) => k.kalanAnapara.toFixed(2)),
    ['40000.00', '20000.00', '30000.00'],
  );

  // Eşit 3 kalemde kuruş yuvarlamalı orantılı dağıtım (10.000 TL dağıtım -> 3.333,33 + 3.333,33 + 3.333,34)
  const sYuvarlama = icraHesapla(
    icraGirdiCoz({
      alan: 'icra',
      dosya: { mahkeme: 'Örnek İcra', esasNo: '2025/100', kaynak: 'test', altAlan: '60.05' },
      hesapTarihi: '2025-01-01',
      parametreler: { kalemMahsupSirasi: 'orantili' },
      takip: {
        takipTarihi: '2025-01-01',
        takipTuru: 'ilamli',
        tahsilHarciAsamasi: 'hacizden-once',
        alacakKalemleri: [
          { ad: 'A', tutar: 10000, faiz: { tur: 'yasal', gerekce: 'yasal' } },
          { ad: 'B', tutar: 10000, faiz: { tur: 'yasal', gerekce: 'yasal' } },
          { ad: 'C', tutar: 10000, faiz: { tur: 'yasal', gerekce: 'yasal' } },
        ],
        kismiOdemeler: [
          { tarih: '2025-01-01', tutar: 10615.4, tahsilYeri: 'haricen', aciklama: 'Orantılı test' },
        ],
      },
    }),
    tablolar,
  );
  assert.deepEqual(
    sYuvarlama.alacakKalemleri.map((k) => k.mahsupEdilenAnapara.toFixed(2)),
    ['3333.33', '3333.33', '3333.34'],
  );
  assert.equal(sYuvarlama.kalanAsilAlacak.toFixed(2), '20000.00');
});
