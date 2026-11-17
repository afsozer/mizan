// UYAP Dokuman Formati (.udf, format_id="1.8") rapor ureticisi.
// Sifir dis paket ve sifir Node modulu kullanir: UTF-8 CDATA metin havuzu, startOffset/length
// indeksli paragraf ve tablo elemanlari, CRC-32 tablosu ve ZIP store (yontem 0) kabi ile
// hem Node'da hem tarayicida birebir ayni ikili ciktiyi verir.
import type { KalemKodu } from '../girdi.ts';
import type { HesapSonucu, KalemSonucu } from '../hesap.ts';
import { Decimal, tl, topla, yuzde } from '../para.ts';
import { trTarih } from '../tarih.ts';
import type { Kaynak, KaynakSatiri } from '../tablolar.ts';
import { donemYaz, sureAciklamasi } from '../kalemler/ortak.ts';
import type { RaporBilgisi } from './pdf.ts';
import { kanitDosyaAdi } from './defter.ts';

const CRC32_TABLO = (() => {
  const tablo = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    tablo[i] = c >>> 0;
  }
  return tablo;
})();

export function crc32Hesapla(veri: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < veri.length; i++) {
    crc = CRC32_TABLO[(crc ^ veri[i]!) & 0xff]! ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function zipTekDosya(dosyaAdi: string, icerik: Uint8Array): Uint8Array {
  const adBayt = new TextEncoder().encode(dosyaAdi);
  const adUzunluk = adBayt.byteLength;
  const veriUzunluk = icerik.byteLength;
  const crc = crc32Hesapla(icerik);

  const yerelBaslikUzunluk = 30 + adUzunluk;
  const merkeziBaslangic = yerelBaslikUzunluk + veriUzunluk;
  const merkeziBaslikUzunluk = 46 + adUzunluk;
  const bitisBaslangic = merkeziBaslangic + merkeziBaslikUzunluk;
  const toplamUzunluk = bitisBaslangic + 22;

  const cikti = new Uint8Array(toplamUzunluk);
  const gorunum = new DataView(cikti.buffer);

  // Sabit MS-DOS tarih/saat (2026-01-01 12:00:00) -> deterministik uretim
  const dosSaat = (12 << 11) | (0 << 5) | 0;
  const dosTarih = ((2026 - 1980) << 9) | (1 << 5) | 1;

  // Yerel dosya basligi (PK\x03\x04)
  gorunum.setUint32(0, 0x04034b50, true);
  gorunum.setUint16(4, 20, true);
  gorunum.setUint16(6, 0x0800, true); // UTF-8 dosya adi bayragi
  gorunum.setUint16(8, 0, true); // Sifir sikistirma (STORE = 0)
  gorunum.setUint16(10, dosSaat, true);
  gorunum.setUint16(12, dosTarih, true);
  gorunum.setUint32(14, crc, true);
  gorunum.setUint32(18, veriUzunluk, true);
  gorunum.setUint32(22, veriUzunluk, true);
  gorunum.setUint16(26, adUzunluk, true);
  gorunum.setUint16(28, 0, true);
  cikti.set(adBayt, 30);

  // Dosya verisi
  cikti.set(icerik, yerelBaslikUzunluk);

  // Merkezi dizin dosya basligi (PK\x01\x02)
  gorunum.setUint32(merkeziBaslangic, 0x02014b50, true);
  gorunum.setUint16(merkeziBaslangic + 4, 20, true);
  gorunum.setUint16(merkeziBaslangic + 6, 20, true);
  gorunum.setUint16(merkeziBaslangic + 8, 0x0800, true);
  gorunum.setUint16(merkeziBaslangic + 10, 0, true); // STORE = 0
  gorunum.setUint16(merkeziBaslangic + 12, dosSaat, true);
  gorunum.setUint16(merkeziBaslangic + 14, dosTarih, true);
  gorunum.setUint32(merkeziBaslangic + 16, crc, true);
  gorunum.setUint32(merkeziBaslangic + 20, veriUzunluk, true);
  gorunum.setUint32(merkeziBaslangic + 24, veriUzunluk, true);
  gorunum.setUint16(merkeziBaslangic + 28, adUzunluk, true);
  gorunum.setUint16(merkeziBaslangic + 30, 0, true);
  gorunum.setUint16(merkeziBaslangic + 32, 0, true);
  gorunum.setUint16(merkeziBaslangic + 34, 0, true);
  gorunum.setUint16(merkeziBaslangic + 36, 0, true);
  gorunum.setUint32(merkeziBaslangic + 38, 0, true);
  gorunum.setUint32(merkeziBaslangic + 42, 0, true);
  cikti.set(adBayt, merkeziBaslangic + 46);

  // Merkezi dizin sonu kaydi (EOCD, PK\x05\x06)
  gorunum.setUint32(bitisBaslangic, 0x06054b50, true);
  gorunum.setUint16(bitisBaslangic + 4, 0, true);
  gorunum.setUint16(bitisBaslangic + 6, 0, true);
  gorunum.setUint16(bitisBaslangic + 8, 1, true);
  gorunum.setUint16(bitisBaslangic + 10, 1, true);
  gorunum.setUint32(bitisBaslangic + 12, merkeziBaslikUzunluk, true);
  gorunum.setUint32(bitisBaslangic + 16, merkeziBaslangic, true);
  gorunum.setUint16(bitisBaslangic + 20, 0, true);

  return cikti;
}

/** YYYY-AA-GG_mahkeme-esas_altalan.udf */
export function udfDosyaAdi(s: HesapSonucu, uretimTarihi: string): string {
  return kanitDosyaAdi(s, uretimTarihi).replace(/\.pdf$/, '.udf');
}

export interface ParagrafSecenek {
  hiza?: '0' | '1' | '2' | '3';
  kalin?: boolean;
  italik?: boolean;
  boyut?: number;
  ustBosluk?: number;
  altBosluk?: number;
  solGirinti?: number;
}

export interface TabloSecenek {
  genislikler?: number[];
  sag?: number[];
  toplam?: string[];
  kalinSatirlar?: number[];
  kenarlik?: 'borderCell' | 'borderNone';
}

type BelgeBloku =
  | { tur: 'paragraf'; metin: string; secenek: ParagrafSecenek }
  | { tur: 'anahtarDeger'; satirlar: [string, string][]; solGenislik: number }
  | { tur: 'tablo'; basliklar: string[]; satirlar: string[][]; secenek: TabloSecenek };

function temizTekSatir(metin: string): string {
  return metin
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uD800-\uDFFF\uFFFE\uFFFF]/g, '')
    .replace(/\r\n|\r|\n|\t/g, ' ')
    .trim();
}

export class UdfKurucu {
  private bloklar: BelgeBloku[] = [];

  paragraf(metin: string, secenek: ParagrafSecenek = {}): void {
    this.bloklar.push({ tur: 'paragraf', metin: temizTekSatir(metin), secenek });
  }

  baslik(metin: string, seviye: 1 | 2 = 1): void {
    if (seviye === 1) {
      this.paragraf(metin, { hiza: '0', kalin: true, boyut: 12, ustBosluk: 8, altBosluk: 3 });
    } else {
      this.paragraf(metin, { hiza: '0', kalin: true, boyut: 11, ustBosluk: 6, altBosluk: 2 });
    }
  }

  etiket(metin: string): void {
    this.paragraf(metin, { hiza: '0', kalin: true, boyut: 10, ustBosluk: 4, altBosluk: 1 });
  }

  maddeler(liste: string[]): void {
    for (const m of liste) {
      this.paragraf(`- ${m}`, { hiza: '3', solGirinti: 14.17 });
    }
  }

  ikiSutun(satirlar: [string, string][], solGenislik = 150): void {
    if (satirlar.length === 0) return;
    this.bloklar.push({ tur: 'anahtarDeger', satirlar, solGenislik });
  }

  tablo(basliklar: string[], satirlar: string[][], secenek: TabloSecenek = {}): void {
    this.bloklar.push({ tur: 'tablo', basliklar, satirlar, secenek });
  }

  xmlUret(): string {
    const havuzParcalari: string[] = [];
    const elemanlar: string[] = [];
    let offset = 0;

    const dilimEkle = (metin: string, kalin = false, italik = false, boyut?: number): string => {
      const baslangic = offset;
      const uzunluk = metin.length;
      havuzParcalari.push(metin);
      offset += uzunluk;
      let oznitelik = `startOffset="${baslangic}" length="${uzunluk}"`;
      if (kalin) oznitelik += ' bold="true"';
      if (italik) oznitelik += ' italic="true"';
      if (boyut !== undefined) oznitelik += ` size="${boyut}"`;
      return `<content ${oznitelik} />`;
    };

    const sonBlokIndex = this.bloklar.length - 1;

    this.bloklar.forEach((blok, bIdx) => {
      const sonBlokMu = bIdx === sonBlokIndex;

      if (blok.tur === 'paragraf') {
        const s = blok.secenek;
        const sonEki = sonBlokMu ? '' : '\n';
        const metin = (blok.metin || ' ') + sonEki;
        const ic = dilimEkle(metin, Boolean(s.kalin), Boolean(s.italik), s.boyut);
        let pOznitelik = `Alignment="${s.hiza ?? '3'}" LineSpacing="0.14999998"`;
        if (s.solGirinti !== undefined) pOznitelik += ` LeftIndent="${s.solGirinti}"`;
        if (s.ustBosluk !== undefined) pOznitelik += ` SpaceAbove="${s.ustBosluk}"`;
        if (s.altBosluk !== undefined) pOznitelik += ` SpaceBelow="${s.altBosluk}"`;
        elemanlar.push(`<paragraph ${pOznitelik}>${ic}</paragraph>`);
        return;
      }

      if (blok.tur === 'anahtarDeger') {
        const satirXml: string[] = [];
        const sonSatirIndex = blok.satirlar.length - 1;
        const solGenislik = Math.min(Math.max(Math.round(blok.solGenislik), 1), 479);
        const sagGenislik = 480 - solGenislik;
        blok.satirlar.forEach(([anahtar, deger], rIdx) => {
          const sonSatirMi = sonBlokMu && rIdx === sonSatirIndex;
          const temizAnahtar = temizTekSatir(anahtar) || '-';
          const temizDeger = temizTekSatir(deger) || '-';
          const solIc = dilimEkle(`${temizAnahtar}:\t`, true);
          const sagIc = dilimEkle(temizDeger + (sonSatirMi ? '' : '\n'), false);
          satirXml.push(
            `<row rowName="row${rIdx + 1}" rowType="dataRow">` +
              `<cell border="borderNone"><paragraph Alignment="0" LineSpacing="0.14999998">${solIc}</paragraph></cell>` +
              `<cell border="borderNone"><paragraph Alignment="0" LineSpacing="0.14999998">${sagIc}</paragraph></cell>` +
              `</row>`,
          );
        });
        elemanlar.push(
          `<table tableName="Sabit" columnCount="2" columnSpans="${solGenislik},${sagGenislik}" border="borderNone">${satirXml.join('')}</table>`,
        );
        return;
      }

      const sutunSayisi = blok.basliklar.length;
      const tabanGenislik = Math.floor(480 / sutunSayisi);
      const genislikler =
        blok.secenek.genislikler && blok.secenek.genislikler.length === sutunSayisi
          ? blok.secenek.genislikler
          : blok.basliklar.map((_, idx) => (idx === 0 ? 480 - tabanGenislik * (sutunSayisi - 1) : tabanGenislik));
      const sag = new Set(blok.secenek.sag ?? []);
      const kalinSatirlar = new Set(blok.secenek.kalinSatirlar ?? []);
      const kenarlik = blok.secenek.kenarlik ?? 'borderCell';

      const tumSatirlar: { hucreler: string[]; kalin: boolean; tip: 'headerRow' | 'dataRow' }[] = [
        { hucreler: blok.basliklar, kalin: true, tip: 'headerRow' },
        ...blok.satirlar.map((h, idx) => ({ hucreler: h, kalin: kalinSatirlar.has(idx), tip: 'dataRow' as const })),
      ];
      if (blok.secenek.toplam) {
        tumSatirlar.push({ hucreler: blok.secenek.toplam, kalin: true, tip: 'dataRow' });
      }

      const satirXml: string[] = [];
      const sonSatirIndex = tumSatirlar.length - 1;
      tumSatirlar.forEach((satir, rIdx) => {
        const hucreXml: string[] = [];
        for (let c = 0; c < sutunSayisi; c++) {
          const sonSutunMu = c === sutunSayisi - 1;
          const enSonHucreMi = sonBlokMu && rIdx === sonSatirIndex && sonSutunMu;
          const ham = temizTekSatir(satir.hucreler[c] ?? '');
          const gorunen = ham || '-';
          const ayirici = enSonHucreMi ? '' : sonSutunMu ? '\n' : '\t';
          const hiza = sag.has(c) ? '2' : '0';
          const ic = dilimEkle(gorunen + ayirici, satir.kalin);
          hucreXml.push(
            `<cell border="${kenarlik}"><paragraph Alignment="${hiza}" LineSpacing="0.14999998">${ic}</paragraph></cell>`,
          );
        }
        satirXml.push(`<row rowName="row${rIdx + 1}" rowType="${satir.tip}">${hucreXml.join('')}</row>`);
      });

      elemanlar.push(
        `<table tableName="Sabit" columnCount="${sutunSayisi}" columnSpans="${genislikler.join(',')}" border="${kenarlik}">${satirXml.join('')}</table>`,
      );
    });

    const havuz = havuzParcalari.join('');
    const guvenliHavuz = havuz.replaceAll(']]>', ']]]]><![CDATA[>');

    return (
      '<?xml version="1.0" encoding="UTF-8" ?>\n' +
      '<template format_id="1.8">\n' +
      `<content><![CDATA[${guvenliHavuz}]]></content>\n` +
      '<properties><pageFormat mediaSizeName="1" leftMargin="56.69" rightMargin="56.69" topMargin="56.69" bottomMargin="56.69" paperOrientation="1" headerFOffset="20.0" footerFOffset="20.0" /></properties>\n' +
      '<elements resolver="hvl-default">\n' +
      elemanlar.join('\n') +
      '\n</elements>\n' +
      '<styles><style name="default" description="Gecerli" family="Dialog" size="12" bold="false" italic="false" /><style name="hvl-default" family="Times New Roman" size="12" description="Govde" /></styles>\n' +
      '</template>'
    );
  }
}

export const UDF_DOGRULAMA_UYARISI =
  "Üretilen UDF belgesi resmi kullanımdan önce UYAP Doküman Editör'de açılarak elle doğrulanmalıdır.";

export function udfPaketle(xml: string): Uint8Array {
  return zipTekDosya('content.xml', new TextEncoder().encode(xml));
}

export function kaynakYaz(k: Kaynak): string {
  const parca = [k.ad];
  if (k.resmiGazete) parca.push(`RG ${trTarih(k.resmiGazete.tarih)}/${k.resmiGazete.sayi}`);
  if (k.belge) parca.push(k.belge);
  if (k.url) parca.push(k.url);
  return parca.join(' · ');
}

export interface FaizKesitSatiri {
  baslangic: string;
  bitis: string;
  gun: number;
  oran: Decimal;
  tutar: Decimal;
}

export function faizKesitTablosuEkle(
  kurucu: UdfKurucu,
  kesitler: FaizKesitSatiri[],
  toplamTutar: Decimal,
  secenek: { toplamEtiketi?: string; oranBos?: string; genislikler?: number[] } = {},
): void {
  const toplamGun = String(topla(kesitler.map((x) => new Decimal(x.gun))));
  kurucu.tablo(
    ['Dönem', 'Gün', 'Yıllık oran', 'Faiz (TL)'],
    kesitler.map((x) => [
      `${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`,
      String(x.gun),
      yuzde(x.oran),
      tl(x.tutar),
    ]),
    {
      genislikler: secenek.genislikler,
      sag: [1, 2, 3],
      toplam: [secenek.toplamEtiketi ?? 'Toplam', toplamGun, secenek.oranBos ?? '-', tl(toplamTutar)],
    },
  );
}

export function kaynakTablolariEkle(
  kurucu: UdfKurucu,
  kaynaklar: KaynakSatiri[],
  degerGenislik = 120,
): void {
  const kaynakGenislik = 480 - 95 - degerGenislik;
  for (const tabloAdi of [...new Set(kaynaklar.map((k) => k.tablo))]) {
    const satirlar = kaynaklar.filter((k) => k.tablo === tabloAdi);
    const ortakDogrulama = satirlar.every((k) => k.kaynak.dogrulama === satirlar[0]!.kaynak.dogrulama);
    kurucu.etiket(tabloAdi);
    const aciklama = satirlar[0]!.tabloAciklamasi;
    if (aciklama) kurucu.paragraf(aciklama);
    if (ortakDogrulama) {
      kurucu.paragraf(`Doğrulama: ${satirlar[0]!.kaynak.dogrulama}`);
    }
    kurucu.tablo(
      ['Yürürlük', 'Değer', 'Kaynak'],
      satirlar.map((k) => [
        k.aralik,
        k.deger,
        kaynakYaz(k.kaynak) + (ortakDogrulama ? '' : ` · Doğrulama: ${k.kaynak.dogrulama}`),
      ]),
      { genislikler: [95, degerGenislik, kaynakGenislik] },
    );
  }
}

export function tabloOzetleriEkle(
  kurucu: UdfKurucu,
  tabloOzetleri: { ad: string; dogrulamaTarihi: string; ozet: string }[],
  genislikler: number[] = [120, 80, 280],
): void {
  kurucu.tablo(
    ['Tablo dosyası', 'Doğrulama tarihi', 'SHA-256'],
    tabloOzetleri.map((t) => [t.ad, t.dogrulamaTarihi === '-' ? '-' : trTarih(t.dogrulamaTarihi), t.ozet]),
    { genislikler },
  );
}

export function hesapKimligiEkle(kurucu: UdfKurucu, bilgi: RaporBilgisi, solGenislik = 150): void {
  kurucu.ikiSutun(
    [
      ['Araç', bilgi.surum],
      ['Girdi dosyası SHA-256', bilgi.girdiOzeti],
    ],
    solGenislik,
  );
}

function faizTuruAdi(tur: string, kod?: KalemKodu): string {
  if (tur !== 'mevduat') return 'yasal faiz';
  return kod && kod !== 'kidem' ? 'en yüksek mevduat faizi (4857 s.K. m.34)' : 'en yüksek mevduat faizi';
}

function kalemBolumuEkle(kurucu: UdfKurucu, k: KalemSonucu, no: number): void {
  kurucu.baslik(`4.${no} ${k.ad}`, 2);
  kurucu.etiket('Dayanak');
  kurucu.maddeler(k.dayanak);
  kurucu.etiket('Formül');
  kurucu.maddeler(k.formul);
  kurucu.ikiSutun(k.bilgiler);

  for (const [baslikMetni, d] of [
    ['', k.detay] as const,
    ...(k.ekDetaylar ?? []).map((e) => [e.baslik, e.tablo] as const),
  ]) {
    if (!d) continue;
    if (baslikMetni) kurucu.etiket(baslikMetni);
    const sag = d.basliklar
      .map((_, i) => i)
      .filter((i) => i > 0 && !/Açıklama|Dönem|Dolum|Ödeme tarihi|Hesap şekli|^Hesap$/.test(d.basliklar[i]!));
    kurucu.tablo(d.basliklar, d.satirlar, { sag, toplam: d.toplam });
  }

  const ozet: string[][] = [['Hesaplanan brüt', tl(k.hamBrut)]];
  if (k.indirim) ozet.push([`Takdiri indirim (${yuzde(k.indirim.oran)})`, '-' + tl(k.indirim.tutar)]);
  if (k.mahsup) ozet.push([`Mahsup (${k.mahsup.aciklama})`, '-' + tl(k.mahsup.tutar)]);
  ozet.push(['Brüt alacak', tl(k.brut)]);
  for (const ks of k.kesintiler) {
    if (ks.tutar.isNegative()) ozet.push([`${ks.ad} (${ks.dayanak})`, '+' + tl(ks.tutar.abs())]);
    else ozet.push([`${ks.ad} (${ks.oran}; matrah ${tl(ks.matrah)}; ${ks.dayanak})`, '-' + tl(ks.tutar)]);
  }
  ozet.push(['Net alacak', tl(k.net)]);
  kurucu.tablo(['Brütten nete', 'Tutar (TL)'], ozet.slice(0, -1), {
    genislikler: [360, 120],
    sag: [1],
    toplam: ozet[ozet.length - 1],
  });

  for (const f of k.faizler) {
    kurucu.etiket(
      `Faiz: ${faizTuruAdi(f.tur, k.kod)}, ${tl(f.matrah)} TL üzerine ${trTarih(f.baslangic)} - ${trTarih(f.bitis)} (girdi: ${f.gerekce})`,
    );
    if (f.kesitler.length === 0) {
      kurucu.paragraf('Faiz başlangıcı bitiş tarihinden sonra ya da matrah sıfır; faiz işlemedi.');
      continue;
    }
    const toplamGun = String(topla(f.kesitler.map((x) => new Decimal(x.gun))));
    const yildonumu = f.kesitler.some((x) => x.oranTarihi);
    if (yildonumu) {
      kurucu.tablo(
        ['Dönem', 'Gün', 'Oranın alındığı gün', 'Yıllık oran', 'Faiz (TL)'],
        f.kesitler.map((x) => [
          `${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`,
          String(x.gun),
          trTarih(x.oranTarihi!),
          yuzde(x.oran),
          tl(x.tutar),
        ]),
        { sag: [1, 3, 4], toplam: ['Toplam', toplamGun, '-', '-', tl(f.toplam)] },
      );
    } else {
      faizKesitTablosuEkle(kurucu, f.kesitler, f.toplam);
    }
  }

  if (k.notlar.length) {
    kurucu.etiket('Notlar');
    kurucu.maddeler(k.notlar);
  }
}

export function udfXmlOlustur(s: HesapSonucu, bilgi: RaporBilgisi): string {
  const g = s.girdi;
  const dsy = g.dosya;
  const kurucu = new UdfKurucu();

  // Ortalanmis kalin rapor basligi
  kurucu.paragraf('İŞÇİLİK ALACAKLARI HESAP RAPORU', { hiza: '1', kalin: true, boyut: 14, altBosluk: 6 });

  // 1. Dosya ve Hesap Ozeti
  kurucu.baslik('1. Dosya ve Hesap Özeti', 1);
  const ust: [string, string][] = [
    ['Dosya', `${dsy.mahkeme} ${dsy.esasNo}`],
    ['Bilirkişilik alt alanı', dsy.altAlan],
    ['Hesap tarihi', trTarih(g.hesapTarihi)],
    ['Faiz bitiş tarihi', trTarih(s.esaslar.faizBitis)],
    ['Rapor üretim zamanı', bilgi.uretimZamani],
  ];
  if (dsy.hazirlayan) ust.push(['Hazırlayan', dsy.hazirlayan]);
  kurucu.ikiSutun(ust);

  const ozetSatirlari = s.kalemler.map((k) => [
    k.ad,
    tl(k.brut),
    tl(k.brut.minus(k.net)),
    tl(k.net),
    k.faizler.length ? k.faizler.map((f) => `${faizTuruAdi(f.tur, k.kod)}, ${trTarih(f.baslangic)}`).join('; ') : '-',
    tl(topla(k.faizler.map((f) => f.toplam))),
  ]);
  kurucu.tablo(
    ['Kalem', 'Brüt (TL)', 'Kesinti (TL)', 'Net (TL)', 'Faiz türü ve başlangıcı', 'Faiz (TL)'],
    ozetSatirlari,
    {
      genislikler: [120, 68, 62, 68, 100, 62],
      sag: [1, 2, 3, 5],
      toplam: [
        'Toplam',
        tl(s.toplam.brut),
        tl(s.toplam.brut.minus(s.toplam.net)),
        tl(s.toplam.net),
        '-',
        tl(s.toplam.faiz),
      ],
    },
  );

  // 2. Hizmet Suresi ve Ucret
  kurucu.baslik('2. Hizmet Süresi ve Ücret', 1);
  const hizmetSatirlari: [string, string][] = g.hizmet.donemler.map((p, i) => [
    `Hizmet dönemi ${i + 1}`,
    donemYaz(g, p),
  ]);
  const girdiler: [string, string][] = [
    ...hizmetSatirlari,
    ['Toplam hizmet', sureAciklamasi(g)],
    ['Fesih', `${trTarih(g.hizmet.fesihTarihi)}, ${g.hizmet.fesihSekli}`],
    [
      'Son çıplak brüt ücret',
      `${tl(s.ucret.sonCiplak)} TL (${trTarih(s.ucret.sonUcretTarihi)}${g.ucret.sonBrutAylik === 'asgari' ? ', asgari ücret' : ''})`,
    ],
    ...g.ucret.yanHaklar.map((y) => [`Yan hak: ${y.ad}`, `${tl(y.tutar)} TL`] as [string, string]),
    ['Giydirilmiş brüt ücret', `${tl(s.ucret.giydirilmis)} TL`],
    ['Ücret yöntemi (dönemsel kalemler)', s.ucret.yontem],
  ];
  if (g.hizmet.dogumTarihi) {
    girdiler.push([
      'Doğum tarihi',
      'girildi (yalnız yıllık izin yaş kuralında kullanıldı, raporda yaş olarak görünür)',
    ]);
  }
  kurucu.ikiSutun(girdiler);

  // 3. Hukuki Tercihler ve Hesap Esaslari
  kurucu.baslik('3. Hukuki Tercihler ve Hesap Esasları', 1);
  kurucu.paragraf(
    'Aşağıdaki değerler hesabın sonucunu değiştiren tercihlerdir. "Girdi" olanlar hesap dosyasında açıkça yazılmıştır; "varsayılan" olanlar yanındaki dayanakla araç tarafından alınmıştır.',
  );
  kurucu.tablo(
    ['Esas', 'Değer', 'Kaynak', 'Dayanak'],
    s.parametreler.map((p) => [p.ad, p.deger, p.kaynak, p.dayanak]),
    { genislikler: [115, 130, 55, 180] },
  );

  const kalemTercihleri: string[][] = [];
  for (const k of s.kalemler) {
    const kg = g.kalemler[k.kod]!;
    if ('hakVar' in kg) kalemTercihleri.push([k.ad, 'Hak varlığı', kg.hakVar ? 'var' : 'yok', kg.gerekce]);
    if ('ucretTuru' in kg) {
      kalemTercihleri.push([
        k.ad,
        'İzin ücretine esas ücret',
        kg.ucretTuru === 'ciplak' ? 'çıplak' : 'giydirilmiş',
        '-',
      ]);
      if (kg.eskiKanun4857Oncesi !== undefined || kg.donemKanunu !== undefined) {
        const eskiSecili = kg.eskiKanun4857Oncesi === true || kg.donemKanunu === '1475-4857';
        kalemTercihleri.push([
          k.ad,
          '10.06.2003 öncesi kanun',
          eskiSecili ? '1475 s.K. m.49 (12/18/24 gün)' : '4857 s.K. m.53 (14/20/26 gün)',
          '-',
        ]);
      }
    }
    if ('gunKurali' in kg && kg.gunKurali) {
      kalemTercihleri.push([k.ad, 'Gün hesabı kuralı', kg.gunKurali === 'tam-ay' ? 'tam ay (30 gün)' : 'takvim günü', '-']);
    }
    if ('takvim' in kg && kg.takvim) {
      kalemTercihleri.push([
        k.ad,
        'Takvim türetmesi',
        kg.takvim.diniBayramlarDahil === false ? 'yalnız sabit tatiller' : 'sabit ve dini tatiller',
        '2429 s.K. ve Diyanet takvimi',
      ]);
    }
    if (kg.takdiriIndirim) {
      kalemTercihleri.push([k.ad, 'Takdiri indirim', yuzde(kg.takdiriIndirim.oran), kg.takdiriIndirim.gerekce]);
    }
    if (kg.mahsup) {
      kalemTercihleri.push([k.ad, 'Mahsup', `${tl(kg.mahsup.tutar)} TL`, kg.mahsup.aciklama]);
    }
    if ('oncekiOdemeler' in kg && kg.oncekiOdemeler) {
      const op = kg.oncekiOdemeler;
      kalemTercihleri.push([
        k.ad,
        'Önceki ödemelerin mahsubu',
        op.faiz === 'yasal' ? 'yasal faiziyle' : 'faizsiz',
        op.gerekce,
      ]);
    }
    if ('donemEsasi' in kg && kg.donemEsasi) {
      kalemTercihleri.push([
        k.ad,
        'Bildirim süresi esası',
        kg.donemEsasi === 'son' ? 'son hizmet dönemi' : 'tüm dönemler',
        '-',
      ]);
    }
    if ('kullandirilanGun' in kg && kg.kullandirilanGun) {
      kalemTercihleri.push([k.ad, 'Kullandırılan bildirim süresi', `${kg.kullandirilanGun.toString()} gün`, '-']);
    }
    if ('aySayisi' in kg && kg.aySayisi) {
      kalemTercihleri.push([k.ad, 'Esas alınan ay sayısı', `${kg.aySayisi.toString()} ay`, '-']);
    }
    if ('brutAylik' in kg && kg.brutAylik) {
      kalemTercihleri.push([k.ad, 'Döneme özgü çıplak brüt aylık', `${tl(kg.brutAylik)} TL`, '-']);
    }
    if ('ekYanHaklar' in kg && kg.ekYanHaklar !== undefined) {
      kalemTercihleri.push([k.ad, 'Döneme özgü aylık yan haklar', `${tl(kg.ekYanHaklar)} TL`, '-']);
    }
    if ('esasBrutAylik' in kg && kg.esasBrutAylik) {
      kalemTercihleri.push([k.ad, 'Esas çıplak brüt aylık', `${tl(kg.esasBrutAylik)} TL`, '-']);
    }
    for (const f of kg.faiz ?? []) {
      kalemTercihleri.push([
        k.ad,
        'Faiz',
        `${faizTuruAdi(f.tur, k.kod)}, ${trTarih(f.baslangic)}${f.tutar ? `, ${tl(f.tutar)} TL` : ''}`,
        f.gerekce,
      ]);
    }
  }
  if (kalemTercihleri.length > 0) {
    kurucu.tablo(['Kalem', 'Tercih', 'Değer', 'Gerekçe (girdi)'], kalemTercihleri, {
      genislikler: [100, 95, 110, 175],
    });
  }

  // 4. Kalemler
  kurucu.baslik('4. Kalemler', 1);
  s.kalemler.forEach((k, i) => kalemBolumuEkle(kurucu, k, i + 1));

  // 5. Kullanilan Resmi Tablo Satirlari ve Kaynaklari
  kurucu.baslik('5. Kullanılan Resmi Tablo Satırları ve Kaynakları', 1);
  kaynakTablolariEkle(kurucu, s.kaynaklar, 120);

  // 6. Kanit ve Dogrulama Bilgileri
  kurucu.baslik('6. Kanıt ve Doğrulama Bilgileri', 1);
  hesapKimligiEkle(kurucu, bilgi);
  tabloOzetleriEkle(kurucu, s.tabloOzetleri, [120, 80, 280]);
  kurucu.etiket('Sınırlar ve uyarılar');
  kurucu.maddeler([
    ...s.uyarilar,
    'Hesap, girdi dosyasındaki olgu kabullerine (hizmet süresi, ücret, fazla çalışma saatleri, çalışılan tatil günleri) dayanır. Bu kabullerin ispatı ve değerlendirmesi mahkemeye aittir.',
    s.esaslar.zamanasimi
      ? `Zamanaşımı def'i nedeniyle ${trTarih(s.esaslar.zamanasimi.sinirTarihi)} öncesi dönem, satır ve günler ücret alacağı, ikramiye, fazla çalışma, hafta tatili ve UBGT hesaplarından dışlanmıştır (girdi: ${s.esaslar.zamanasimi.gerekce}).`
      : 'Zamanaşımı araç tarafından uygulanmaz; dönemler girdi dosyasında zamanaşımı dikkate alınarak verilir.',
    s.esaslar.sgkUstSiniri
      ? 'SGK ve işsizlik sigortası işçi payı matrahı, 5510 s.K. m.82 uyarınca hesap tarihindeki aylık prime esas kazanç üst sınırıyla sınırlanmıştır. Kesintiler tek seferde ödeme varsayımıyla, hesap tarihindeki oranlarla hesaplanmıştır.'
      : 'SGK prime esas kazanç üst sınırı brütten nete dönüşümde uygulanmamıştır. Kesintiler tek seferde ödeme varsayımıyla, hesap tarihindeki oranlarla hesaplanmıştır.',
    s.esaslar.asgariUcretIstisnasi
      ? 'Asgari ücret gelir ve damga vergisi istisnası, hesap tarihinin ayında başka ücret ödenmediği varsayımıyla bir kez uygulanmıştır.'
      : 'Asgari ücret gelir ve damga vergisi istisnası uygulanmamıştır (parametreler.vergi.asgariUcretIstisnasi).',
    'Tablo değerleri, tablonun doğrulama tarihine kadar resmi kaynaktan kontrol edilmiştir; kaynak bağlantıları 5. bölümdedir.',
    UDF_DOGRULAMA_UYARISI,
  ]);

  return kurucu.xmlUret();
}

export function udfOlustur(sonuc: HesapSonucu, bilgi: RaporBilgisi): Uint8Array {
  return udfPaketle(udfXmlOlustur(sonuc, bilgi));
}
