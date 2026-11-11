import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { girdiOku } from '../src/node/girdi-dosya.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';
import { hesapla, udfOlustur, udfDosyaAdi, kanitDosyaAdi } from '../src/index.ts';
import { crc32Hesapla, udfXmlOlustur, zipTekDosya } from '../src/rapor/udf.ts';
import { girdi, testTablolari } from './yardimci.ts';

function ziptenCikar(zipBayt: Uint8Array): {
  dosyaAdi: string;
  crcYerel: number;
  crcMerkezi: number;
  sikistirilmisBoyut: number;
  acikBoyut: number;
  icerikBayt: Uint8Array;
} {
  const gorunum = new DataView(zipBayt.buffer, zipBayt.byteOffset, zipBayt.byteLength);
  // Yerel baslik imzasi: PK\x03\x04 (0x04034b50)
  assert.equal(gorunum.getUint32(0, true), 0x04034b50);
  // Sikistirma yontemi: 0 (STORE)
  assert.equal(gorunum.getUint16(8, true), 0);

  const crcYerel = gorunum.getUint32(14, true);
  const sikistirilmisBoyut = gorunum.getUint32(18, true);
  const acikBoyut = gorunum.getUint32(22, true);
  const adUzunluk = gorunum.getUint16(26, true);
  const ekUzunluk = gorunum.getUint16(28, true);
  assert.equal(sikistirilmisBoyut, acikBoyut);

  const dosyaAdi = new TextDecoder().decode(zipBayt.subarray(30, 30 + adUzunluk));
  const veriBaslangic = 30 + adUzunluk + ekUzunluk;
  const icerikBayt = zipBayt.subarray(veriBaslangic, veriBaslangic + sikistirilmisBoyut);

  // Merkezi dizin basligi imzasi: PK\x01\x02 (0x02014b50)
  const merkeziBaslangic = veriBaslangic + sikistirilmisBoyut;
  assert.equal(gorunum.getUint32(merkeziBaslangic, true), 0x02014b50);
  assert.equal(gorunum.getUint16(merkeziBaslangic + 10, true), 0);
  const crcMerkezi = gorunum.getUint32(merkeziBaslangic + 16, true);
  assert.equal(gorunum.getUint32(merkeziBaslangic + 20, true), sikistirilmisBoyut);
  assert.equal(gorunum.getUint32(merkeziBaslangic + 24, true), acikBoyut);
  assert.equal(gorunum.getUint32(merkeziBaslangic + 42, true), 0);

  // EOCD imzasi: PK\x05\x06 (0x06054b50)
  const eocdBaslangic = merkeziBaslangic + 46 + adUzunluk;
  assert.equal(eocdBaslangic + 22, zipBayt.byteLength);
  assert.equal(gorunum.getUint32(eocdBaslangic, true), 0x06054b50);
  assert.equal(gorunum.getUint16(eocdBaslangic + 8, true), 1);
  assert.equal(gorunum.getUint16(eocdBaslangic + 10, true), 1);
  assert.equal(gorunum.getUint32(eocdBaslangic + 12, true), 46 + adUzunluk);
  assert.equal(gorunum.getUint32(eocdBaslangic + 16, true), merkeziBaslangic);

  return { dosyaAdi, crcYerel, crcMerkezi, sikistirilmisBoyut, acikBoyut, icerikBayt };
}

function cdataHavuzunuCoz(xml: string): string {
  const eslesme = xml.match(/<content>([\s\S]*?)<\/content>/);
  assert.ok(eslesme, '<content> havuzu bulunmali');
  const parcalar = [...eslesme[1]!.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)].map((m) => m[1]!);
  assert.ok(parcalar.length >= 1, 'CDATA blogu bulunmali');
  return parcalar.join('');
}

test('CRC-32 standart vektoru ve ZIP store kabi dogrulamasi', () => {
  const ornek = new TextEncoder().encode('123456789');
  assert.equal(crc32Hesapla(ornek), 0xcbf43926);

  const trVeri = new TextEncoder().encode('İşçilik alacakları: ğüşiöç ĞÜŞİÖÇ');
  const zip = zipTekDosya('content.xml', trVeri);
  const cikan = ziptenCikar(zip);
  assert.equal(cikan.dosyaAdi, 'content.xml');
  assert.equal(cikan.crcYerel, crc32Hesapla(trVeri));
  assert.equal(cikan.crcMerkezi, crc32Hesapla(trVeri));
  assert.equal(cikan.acikBoyut, trVeri.byteLength);
  assert.deepEqual(cikan.icerikBayt, trVeri);
});

test('udfDosyaAdi kanitDosyaAdi ile uyumlu .udf uzantisi uretir', () => {
  const s = hesapla(girdi(), testTablolari());
  assert.equal(kanitDosyaAdi(s, '2026-11-11'), '2026-11-11_denizli-7-is-2021-1_60.02.pdf');
  assert.equal(udfDosyaAdi(s, '2026-11-11'), '2026-11-11_denizli-7-is-2021-1_60.02.udf');
});

test('ornek girdiyle uretilen UDF: ZIP, CRC32, tum bolumler ve Turkce karakter offset tutarliligi', () => {
  const { girdi: g, ozet } = girdiOku(join(import.meta.dirname, '..', 'ornekler', 'ornek-iscilik.yaml'));
  const s = hesapla(g, tablolariYukle());
  const bilgi = { uretimZamani: '11.11.2026 14:30', surum: 'mizan 0.1.1 (test)', girdiOzeti: ozet };

  const udfBayt = udfOlustur(s, bilgi);
  assert.equal(udfBayt[0], 0x50); // 'P'
  assert.equal(udfBayt[1], 0x4b); // 'K'
  assert.equal(udfBayt[2], 0x03);
  assert.equal(udfBayt[3], 0x04);

  const cikan = ziptenCikar(udfBayt);
  assert.equal(cikan.dosyaAdi, 'content.xml');
  const hesaplananCrc = crc32Hesapla(cikan.icerikBayt);
  assert.equal(cikan.crcYerel, hesaplananCrc);
  assert.equal(cikan.crcMerkezi, hesaplananCrc);

  const xml = new TextDecoder('utf-8', { fatal: true }).decode(cikan.icerikBayt);
  assert.equal(xml, udfXmlOlustur(s, bilgi));
  assert.match(xml, /<template format_id="1\.8">/);
  assert.match(xml, /<pageFormat mediaSizeName="1" leftMargin="56\.69" rightMargin="56\.69" topMargin="56\.69" bottomMargin="56\.69"/);
  assert.match(xml, /<elements resolver="hvl-default">/);
  assert.match(xml, /<table tableName="Sabit"/);

  const havuz = cdataHavuzunuCoz(xml);
  // Turkce karakterlerden dolayi UTF-8 bayt uzunlugu karakter uzunlugundan buyuk olmali
  const havuzBaytUzunlugu = new TextEncoder().encode(havuz).byteLength;
  assert.ok(havuzBaytUzunlugu > havuz.length, 'UTF-8 bayt sayisi karakter sayisindan buyuk olmali');
  // Standart raporda gecen Turkce harfler havuzda yer almali
  for (const harf of ['ç', 'ğ', 'ı', 'ö', 'ş', 'ü', 'Ç', 'İ', 'Ö', 'Ş', 'Ü']) {
    assert.ok(havuz.includes(harf), `Havuzda '${harf}' karakteri bulunmali`);
  }

  // <elements> icindeki tum <content startOffset="..." length="..." /> dilimlerini dogrula
  const elementsBolumu = xml.match(/<elements[^>]*>([\s\S]*?)<\/elements>/);
  assert.ok(elementsBolumu, '<elements> bolumu bulunmali');
  const contentEtiketleri = [...elementsBolumu[1]!.matchAll(/<content\s+([^>]+?)\/>/g)];
  assert.ok(contentEtiketleri.length > 50, 'Yeterli sayida <content> dilimi olmali');

  let beklenenOffset = 0;
  const dilimler: string[] = [];
  for (const [etiketIndex, eslesme] of contentEtiketleri.entries()) {
    const oznitelikler = eslesme[1]!;
    const startMatch = oznitelikler.match(/startOffset="(\d+)"/);
    const lenMatch = oznitelikler.match(/length="(\d+)"/);
    assert.ok(startMatch && lenMatch, `${etiketIndex}. <content> etiketinde startOffset ve length olmali`);
    const startOffset = Number(startMatch[1]);
    const length = Number(lenMatch[1]);

    assert.equal(startOffset, beklenenOffset, `${etiketIndex}. dilimde startOffset kesintisiz ilerlemeli`);
    assert.ok(length > 0, `${etiketIndex}. dilimde length pozitif olmali`);
    assert.ok(startOffset + length <= havuz.length, `${etiketIndex}. dilim havuz sinirini asmamali`);

    const parca = havuz.slice(startOffset, startOffset + length);
    assert.equal(parca.length, length);
    // BMP Turkce metin icin kod noktasi sayisi UTF-16 uzunlugu ile birebir ayni olmali
    assert.equal(Array.from(parca).length, length);
    dilimler.push(parca);
    beklenenOffset += length;
  }

  // Son dilimin bitisi tam olarak CDATA karakter havuzunun uzunluguna esit olmali
  assert.equal(beklenenOffset, havuz.length);
  assert.equal(dilimler.join(''), havuz);

  // Ilk paragraf ortalanmis ve kalin rapor basligi olmali
  assert.equal(dilimler[0], 'İŞÇİLİK ALACAKLARI HESAP RAPORU\n');
  assert.match(elementsBolumu[1]!, /^[\s]*<paragraph Alignment="1" LineSpacing="0\.14999998"[^>]*><content startOffset="0" length="32" bold="true" size="14" \/><\/paragraph>/);

  // Tum zorunlu bolum basliklari ve icerikleri havuzda yer almali
  const beklenenMetinler = [
    'İŞÇİLİK ALACAKLARI HESAP RAPORU',
    '1. Dosya ve Hesap Özeti',
    'Örnek İş Mahkemesi 2026/1',
    '552.872,22',
    '472.071,94',
    '47.905,57',
    '2. Hizmet Süresi ve Ücret',
    'Giydirilmiş brüt ücret',
    '44.000,00 TL',
    '3. Hukuki Tercihler ve Hesap Esasları',
    '4. Kalemler',
    '4.1 Kıdem tazminatı',
    '4.2 İhbar tazminatı',
    '4.3 Yıllık izin ücreti',
    '4.4 Fazla çalışma ücreti',
    '4.5 Hafta tatili ücreti',
    '4.6 Ulusal bayram ve genel tatil ücreti',
    'Dayanak',
    'Formül',
    'Brütten nete',
    '5. Kullanılan Resmi Tablo Satırları ve Kaynakları',
    '6. Kanıt ve Doğrulama Bilgileri',
    'mizan 0.1.1 (test)',
    ozet,
    'Sınırlar ve uyarılar',
    "Üretilen UDF belgesi resmi kullanımdan önce UYAP Doküman Editör'de açılarak elle doğrulanmalıdır.",
  ];
  for (const beklenen of beklenenMetinler) {
    assert.ok(havuz.includes(beklenen), `UDF metninde '${beklenen}' bulunmali`);
  }
});

test('CDATA icinde ]]> dizisi, XML 1.0 yasak kontrol karakterleri ve surrogate ciftleri temizlenir, 7 sutunlu tablo 480 pt kalir', () => {
  const g = girdi({
    dosya: {
      mahkeme: 'Şişli 3. İş Mahkemesi',
      esasNo: '2026/99',
      kaynak: 'kendi dosyam',
      altAlan: '60.02',
      hazirlayan: 'Test ]]> Uzman ĞÜŞİÖÇ\x00\x07\x1f\uFFFE😀',
    },
    kalemler: {
      kidem: {
        hakVar: true,
        gerekce: 'Gerekçe ]]> metni ğüşiöç\x01🚀',
        oncekiOdemeler: {
          faiz: 'yasal',
          gerekce: 'Önceki ödeme mahsubu',
          liste: [{ tarih: '2020-06-01', netTutar: 1000, aciklama: 'ilk ödeme' }],
        },
      },
    },
  });
  const s = hesapla(g, testTablolari());
  const xml = udfXmlOlustur(s, { uretimZamani: '11.11.2026 15:00', surum: 'mizan test', girdiOzeti: 'sha256-test' });
  assert.ok(xml.includes(']]]]><![CDATA[>'));
  assert.ok(!/[\x00-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF\uFFFE\uFFFF]/.test(xml));

  // Tum tablolarin columnSpans toplami tam 480 olmali (7 sutunlu oncekiOdemeler tablosu dahil)
  const spanEslesmeleri = [...xml.matchAll(/columnSpans="([^"]+)"/g)];
  assert.ok(spanEslesmeleri.some((m) => m[1] === '72,68,68,68,68,68,68'));
  for (const m of spanEslesmeleri) {
    const toplamGenislik = m[1]!.split(',').reduce((a, b) => a + Number(b), 0);
    assert.equal(toplamGenislik, 480);
  }

  const havuz = cdataHavuzunuCoz(xml);
  assert.ok(havuz.includes('Test ]]> Uzman ĞÜŞİÖÇ'));
  assert.ok(havuz.includes('Gerekçe ]]> metni ğüşiöç'));

  // Kidem detay tablosundaki 'Hesap' sutunu sola hizali (Alignment="0") olmali
  const hesapOffset = havuz.indexOf('Hesap\t');
  assert.ok(hesapOffset > 0);
  assert.match(
    xml,
    new RegExp(`<paragraph Alignment="0" LineSpacing="0\\.14999998"><content startOffset="${hesapOffset}" length="6" bold="true" \\/><\\/paragraph>`),
  );

  const elementsBolumu = xml.match(/<elements[^>]*>([\s\S]*?)<\/elements>/)![1]!;
  const contentEtiketleri = [...elementsBolumu.matchAll(/<content\s+([^>]+?)\/>/g)];
  let toplam = 0;
  const parcalar: string[] = [];
  for (const eslesme of contentEtiketleri) {
    const startOffset = Number(eslesme[1]!.match(/startOffset="(\d+)"/)![1]);
    const length = Number(eslesme[1]!.match(/length="(\d+)"/)![1]);
    assert.equal(startOffset, toplam);
    parcalar.push(havuz.slice(startOffset, startOffset + length));
    toplam += length;
  }
  assert.equal(toplam, havuz.length);
  assert.equal(parcalar.join(''), havuz);
});

test('UDF raporu yeni kalem tercihlerini, 4857 s.K. m.34 faiz adini ve SGK/zamanasimi uyarilarini PDF ile esitler', () => {
  const g = girdi({
    hizmet: {
      donemler: [{ giris: '2001-01-01', cikis: '2021-07-15' }],
      fesihTarihi: '2021-07-15',
      fesihSekli: 'İşveren feshi',
    },
    hesapTarihi: '2021-09-01',
    parametreler: {
      vergi: { yontem: 'dilim' },
      sgkUstSiniri: true,
      zamanasimi: { sinirTarihi: '2020-01-01', gerekce: "Davalı zamanaşımı def'i" },
    },
    kalemler: {
      yillikIzin: {
        kullanilanGun: 0,
        ucretTuru: 'ciplak',
        eskiKanun4857Oncesi: true,
      },
      ucretAlacagi: {
        gunKurali: 'tam-ay',
        donemler: [{ baslangic: '2021-06-01', bitis: '2021-06-30' }],
        faiz: [{ tur: 'mevduat', baslangic: '2021-07-01', gerekce: 'Temerrüt' }],
      },
      bostaGecenSure: {
        hakVar: true,
        gerekce: 'Kesinleşen işe iade kararı',
        aySayisi: 4,
        brutAylik: 10000,
        ekYanHaklar: 500,
      },
      iseBaslatmama: {
        hakVar: true,
        gerekce: 'İşe başlatmama',
        aySayisi: 5,
        esasBrutAylik: 10000,
      },
      ubgt: {
        takvim: { diniBayramlarDahil: true, donemler: [{ baslangic: '2021-01-01', bitis: '2021-07-15' }] },
        takdiriIndirim: { oran: 0, gerekce: 'Resmi kayıt' },
      },
    },
  });
  const s = hesapla(g, tablolariYukle());
  const xml = udfXmlOlustur(s, { uretimZamani: '11.11.2026 16:00', surum: 'mizan test', girdiOzeti: 'sha256-sync' });
  const havuz = cdataHavuzunuCoz(xml);

  for (const beklenen of [
    'en yüksek mevduat faizi (4857 s.K. m.34)',
    '10.06.2003 öncesi kanun',
    '1475 s.K. m.49 (12/18/24 gün)',
    'Gün hesabı kuralı',
    'tam ay (30 gün)',
    'Takvim türetmesi',
    'sabit ve dini tatiller',
    'Esas alınan ay sayısı',
    'Döneme özgü çıplak brüt aylık',
    'Döneme özgü aylık yan haklar',
    'Esas çıplak brüt aylık',
    "Zamanaşımı def'i nedeniyle 01.01.2020 öncesi dönem, satır ve günler ücret alacağı, ikramiye, fazla çalışma, hafta tatili ve UBGT hesaplarından dışlanmıştır",
    'SGK ve işsizlik sigortası işçi payı matrahı, 5510 s.K. m.82 uyarınca hesap tarihindeki aylık prime esas kazanç üst sınırıyla sınırlanmıştır.',
  ]) {
    assert.ok(havuz.includes(beklenen), `UDF metninde '${beklenen}' bulunmali`);
  }
});
