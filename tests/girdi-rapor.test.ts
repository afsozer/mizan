import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { girdiOku } from '../src/girdi.ts';
import { hesapla } from '../src/hesap.ts';
import { defterSatiri, kanitDosyaAdi, kisaltma } from '../src/rapor/defter.ts';
import { pdfYaz, raporTanimi } from '../src/rapor/pdf.ts';
import { tablolariYukle } from '../src/tablolar.ts';
import { girdi, testTablolari, TEST_VERI } from './yardimci.ts';

test('şemada olmayan alan (ör. işçi adı) reddedilir', () => {
  assert.throws(
    () =>
      girdi({
        dosya: { mahkeme: 'X', esasNo: '1', kaynak: 'k', altAlan: '60.02', isciAdi: 'Ad Soyad' },
      }),
    /tanınmayan alan "isciAdi"/,
  );
  assert.throws(() => girdi({ muvekkil: 'Ad Soyad' }), /tanınmayan alan "muvekkil"/);
});

test('fazla çalışmada takdiri indirim açıkça yazılmalı', () => {
  assert.throws(
    () => girdi({ kalemler: { fazlaCalisma: { donemler: [{ baslangic: '2021-01-01', bitis: '2021-01-28', haftalikFazlaSaat: 5 }] } } }),
    /takdiriIndirim/,
  );
});

test('oran yüzde olarak yazılırsa uyarır', () => {
  assert.throws(
    () =>
      girdi({
        kalemler: {
          ubgt: { gunler: [{ tarih: '2021-05-01', gun: 1 }], takdiriIndirim: { oran: 30, gerekce: 'x' } },
        },
      }),
    /0 ile 1 arasında/,
  );
});

test('kanıt dosyası adı ve defter satırı', () => {
  assert.equal(kisaltma('Denizli 7. İş Mahkemesi'), 'denizli-7-is');
  assert.equal(kisaltma('2026/118'), '2026-118');
  const s = hesapla(girdi(), testTablolari());
  assert.equal(kanitDosyaAdi(s, '2026-11-03'), '2026-11-03_denizli-7-is-2021-1_60.02.pdf');
  const satir = defterSatiri(s, '2026-11-03', 'mizan 0.1.0');
  assert.match(satir, /^\| 03\.11\.2026 \| kendi dosyam \| Denizli 7\. İş Mahkemesi 2021\/1 \| 60\.02 \| kıdem tazminatı; brüt toplam 10\.246,58 TL/);
  assert.equal(satir.split('|').length, 9);
});

test('uçtan uca: test tablolarıyla PDF üretilir', async () => {
  const g = girdi({
    kalemler: {
      kidem: { hakVar: true, gerekce: 'x', faiz: [{ tur: 'mevduat', baslangic: '2021-09-15', gerekce: 'fesih tarihi' }] },
      ihbar: { hakVar: true, gerekce: 'x' },
      yillikIzin: { kullanilanGun: 4, ucretTuru: 'ciplak' },
    },
  });
  const s = hesapla(g, testTablolari());
  const yol = join(mkdtempSync(join(tmpdir(), 'mizan-')), 'rapor.pdf');
  await pdfYaz(raporTanimi(s, { uretimZamani: '03.11.2026 10:00', surum: 'mizan test', girdiOzeti: 'abc' }), yol);
  assert.equal(readFileSync(yol).subarray(0, 5).toString(), '%PDF-');
  assert.ok(statSync(yol).size > 10_000);
});

test('banka yazısından girilen mevduat tablosu kullanılır, yol girdi dosyasına göre çözülür', () => {
  const dizin = mkdtempSync(join(tmpdir(), 'mizan-'));
  const kaynak = { ad: 'Test Bankası yazısı', belge: 'UYAP evrak 01.01.2022', dogrulama: 'test' };
  writeFileSync(
    join(dizin, 'banka.json'),
    JSON.stringify({
      tablo: 'banka',
      ad: 'Banka yazısı (test)',
      dogrulamaTarihi: '2022-12-31',
      satirlar: [{ baslangic: '2021-09-15', bitis: '2022-09-14', oran: '0.5', kaynak }],
    }),
  );
  writeFileSync(
    join(dizin, 'girdi.yaml'),
    [
      'dosya: { mahkeme: X İş Mahkemesi, esasNo: 2021/1, kaynak: kendi dosyam, altAlan: "60.02" }',
      'hesapTarihi: 2021-12-31',
      'hizmet: { donemler: [{ giris: 2020-01-01, cikis: 2021-09-15 }], fesihTarihi: 2021-09-15, fesihSekli: fesih }',
      'ucret: { sonBrutAylik: 9000, yontem: sabit }',
      'parametreler: { vergi: { yontem: sabit, sabitOran: 0.15 } }',
      'tablolar: { mevduatFaizi: ./banka.json }',
      'kalemler: { kidem: { hakVar: true, gerekce: x, faiz: [{ tur: mevduat, baslangic: 2021-09-15, gerekce: fesih }] } }',
    ].join('\n'),
  );
  const { girdi: g } = girdiOku(join(dizin, 'girdi.yaml'));
  const tablolar = tablolariYukle({ mevduatFaizi: g.tablolar?.mevduatFaizi }, TEST_VERI);
  const f = hesapla(g, tablolar).kalemler[0]!.faizler[0]!;
  assert.equal(f.tabloAdi, 'Banka yazısı (test)');
  assert.equal(f.kesitler[0]!.oran.toString(), '0.5');
});

test('uçtan uca: gerçek tablolar ve örnek girdiyle PDF', async () => {
  const { girdi: g, ozet } = girdiOku(join(import.meta.dirname, '..', 'ornekler', 'ornek-iscilik.yaml'));
  const s = hesapla(g);
  const brut = (kod: string) => s.kalemler.find((k) => k.kod === kod)!.brut.toFixed(2);
  // giydirilmiş 44.000 < 2026/1 tavanı 64.948,77; 5 yıl 4 ay
  assert.equal(brut('kidem'), '234666.67');
  // 8 hafta = 56 gün × 44.000 / 30
  assert.equal(brut('ihbar'), '82133.33');
  // 5 yıl × 14 gün - 28 kullanılan = 42 gün × 40.000 / 30
  assert.equal(brut('yillikIzin'), '56000.00');
  const kidemFaizi = s.kalemler.find((k) => k.kod === 'kidem')!.faizler[0]!;
  assert.deepEqual(
    kidemFaizi.kesitler.map((x) => [x.oranTarihi, x.gun]),
    [['2026-06-30', 114]],
  );
  const yol = join(mkdtempSync(join(tmpdir(), 'mizan-')), 'ornek.pdf');
  await pdfYaz(raporTanimi(s, { uretimZamani: '22.10.2026 12:00', surum: 'mizan test', girdiOzeti: ozet }), yol);
  assert.equal(readFileSync(yol).subarray(0, 5).toString(), '%PDF-');
});
