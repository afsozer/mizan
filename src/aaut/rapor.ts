// AAÜT vekalet ücreti hesap raporu (pdfmake belge tanımı) ve bilirkişilik kayıt defteri satırı.
import { tl, yuzde } from '../para.ts';
import { kisaltma } from '../rapor/defter.ts';
import type { RaporBilgisi } from '../rapor/pdf.ts';
import type { Kaynak } from '../tablolar.ts';
import { trTarih } from '../tarih.ts';
import { AAUT_ASAMA_ADLARI, AAUT_NITELIK_ADLARI } from './girdi.ts';
import type { AautHesapSonucu, AautTarafHesabi } from './hesap.ts';

type Icerik = Record<string, unknown> | string | Icerik[];

const RENK = { cizgi: '#9a9a9a', baslik: '#eeeeee', soluk: '#555555' };

function hucre(metin: string, ek: Record<string, unknown> = {}): Record<string, unknown> {
  return { text: metin, ...ek };
}

function tablo(
  basliklar: string[],
  satirlar: string[][],
  secenek: { genislik?: (string | number)[]; sag?: number[]; toplam?: string[] } = {},
) {
  const sag = new Set(secenek.sag ?? []);
  const satir = (s: string[], kalin = false) =>
    s.map((m, i) => hucre(m, { alignment: sag.has(i) ? 'right' : 'left', bold: kalin }));
  const govde = [
    basliklar.map((b, i) =>
      hucre(b, { bold: true, fillColor: RENK.baslik, alignment: sag.has(i) ? 'right' : 'left' }),
    ),
    ...satirlar.map((s) => satir(s)),
  ];
  if (secenek.toplam) govde.push(satir(secenek.toplam, true));
  return {
    table: {
      headerRows: 1,
      widths: secenek.genislik ?? basliklar.map(() => '*'),
      body: govde,
      dontBreakRows: true,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => RENK.cizgi,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
    fontSize: 8,
    margin: [0, 2, 0, 6],
  };
}

function ikiSutun(satirlar: [string, string][]) {
  return {
    table: {
      widths: [165, '*'],
      body: satirlar.map(([a, b]) => [hucre(a, { color: RENK.soluk }), hucre(b)]),
    },
    layout: 'noBorders',
    fontSize: 8.5,
    margin: [0, 0, 0, 6],
  };
}

function baslik(metin: string, seviye: 1 | 2 = 1) {
  return { text: metin, style: seviye === 1 ? 'b1' : 'b2' };
}

function madde(liste: string[]) {
  return { ul: liste, fontSize: 8.5, margin: [0, 0, 0, 6] };
}

function kaynakYaz(k: Kaynak): string {
  const parca = [k.ad];
  if (k.resmiGazete) parca.push(`RG ${trTarih(k.resmiGazete.tarih)}/${k.resmiGazete.sayi}`);
  if (k.belge) parca.push(k.belge);
  if (k.url) parca.push(k.url);
  return parca.join(' · ');
}

function tarafBolumu(t: AautTarafHesabi, no: string): Icerik[] {
  const parca: Icerik[] = [baslik(`${no} ${t.baslik}`, 2)];

  if (t.dayanak.length) {
    parca.push({ text: 'Dayanak', style: 'etiket' }, madde(t.dayanak));
  }
  if (t.formul.length) {
    parca.push({ text: 'Formül ve uygulama adımları', style: 'etiket' }, madde(t.formul));
  }

  const bilgiler: [string, string][] = [
    ['Esas alınan tutar (matrah)', `${tl(t.esasTutar)} TL`],
    ['Merci maktu ücreti', `${tl(t.maktuUcret)} TL`],
  ];
  if (!t.hamNispiUcret.isZero()) {
    bilgiler.push(['Kademeli nispi toplam (ham)', `${tl(t.hamNispiUcret)} TL`]);
  }
  if (!t.asamaCarpani.eq(1)) {
    bilgiler.push(['Aşama oranı', yuzde(t.asamaCarpani)]);
  }
  bilgiler.push(['Hükmedilecek vekalet ücreti', `${tl(t.hukmedilenUcret)} TL`]);
  parca.push(ikiSutun(bilgiler));

  if (t.dilimler.length > 0) {
    parca.push({ text: 'Üçüncü Kısım kademeli dilim hesabı', style: 'etiket' });
    parca.push(
      tablo(
        ['Dilim', 'Tarife kademesi', 'Oran', 'Dilim matrahı (TL)', 'Dilim ücreti (TL)'],
        t.dilimler.map((dl) => [
          String(dl.sira),
          dl.aciklama,
          yuzde(dl.oran),
          tl(dl.matrah),
          tl(dl.tutar),
        ]),
        {
          genislik: [30, '*', 50, 95, 95],
          sag: [0, 2, 3, 4],
          toplam: ['', 'Kademeli nispi toplam', '', tl(t.esasTutar), tl(t.hamNispiUcret)],
        },
      ),
    );
  }

  if (t.notlar.length) {
    parca.push({ text: 'Notlar', style: 'etiket' }, madde(t.notlar));
  }

  return parca;
}

export function aautRaporTanimi(s: AautHesapSonucu, bilgi: RaporBilgisi): Record<string, unknown> {
  const g = s.girdi;
  const dsy = g.dosya;
  const u = g.uyusmazlik;

  const ust: [string, string][] = [
    ['Dosya', `${dsy.mahkeme} ${dsy.esasNo}`],
    ['Bilirkişilik alt alanı', dsy.altAlan],
    ['Hüküm / hesap tarihi (AAÜT m.21)', trTarih(g.hesapTarihi)],
    ['Uygulanan tarife dönemi', `${s.tarifeDonemi} AAÜT`],
    ['Rapor üretim zamanı', bilgi.uretimZamani],
  ];
  if (dsy.hazirlayan) ust.push(['Hazırlayan', dsy.hazirlayan]);

  const ozetSatirlari: string[][] = [];
  if (!s.davaci.hukmedilenUcret.isZero() || u.kabulTutari.gt(0) || (u.tur === 'maktu' && u.maktuSonuc === 'kabul')) {
    ozetSatirlari.push([
      s.davaci.baslik,
      u.tur === 'maktu' ? 'Maktu iş' : `${tl(s.davaci.esasTutar)} TL (kabul)`,
      u.tur === 'maktu' ? '-' : `${tl(s.davaci.hamNispiUcret)} TL`,
      `${tl(s.maktuUcret)} TL`,
      `${tl(s.davaci.hukmedilenUcret)} TL`,
    ]);
  }
  if (!s.davali.hukmedilenUcret.isZero() || u.retTutari.gt(0) || (u.tur === 'maktu' && u.maktuSonuc === 'ret')) {
    ozetSatirlari.push([
      s.davali.baslik,
      u.tur === 'maktu' ? 'Maktu iş (ret)' : `${tl(s.davali.esasTutar)} TL (ret)`,
      u.tur === 'maktu' ? '-' : `${tl(s.davali.hamNispiUcret)} TL`,
      `${tl(s.maktuUcret)} TL`,
      `${tl(s.davali.hukmedilenUcret)} TL`,
    ]);
  }

  const girdiler: [string, string][] = [
    ['Yargı mercii / takip mercii', s.merciAdi],
    ['Vekalet ücreti türü', u.tur === 'nispi' ? 'Nispi (Üçüncü Kısım)' : 'Maktu (İkinci Kısım)'],
    ['Uyuşmazlık niteliği', AAUT_NITELIK_ADLARI[u.nitelik]],
    ['Aşama', AAUT_ASAMA_ADLARI[u.asama]],
  ];
  if (u.asamaGerekcesi) {
    girdiler.push(['Aşama gerekçesi', u.asamaGerekcesi]);
  }
  if (u.tur === 'nispi') {
    girdiler.push(
      ['Dava / takip değeri (müddeabih)', `${tl(u.davaDegeri)} TL`],
      ['Kabul edilen tutar', `${tl(u.kabulTutari)} TL`],
      ['Reddedilen tutar', `${tl(u.retTutari)} TL`],
    );
  } else {
    girdiler.push(['Maktu iş sonucu', u.maktuSonuc === 'kabul' ? 'Kabul (davacı lehine)' : 'Ret (davalı lehine)']);
  }

  const tarafBolumleri: Icerik[] = [];
  let altNo = 1;
  if (!s.davaci.hukmedilenUcret.isZero() || u.kabulTutari.gt(0) || (u.tur === 'maktu' && u.maktuSonuc === 'kabul')) {
    tarafBolumleri.push(...tarafBolumu(s.davaci, `4.${altNo}`));
    altNo++;
  }
  if (!s.davali.hukmedilenUcret.isZero() || u.retTutari.gt(0) || (u.tur === 'maktu' && u.maktuSonuc === 'ret')) {
    tarafBolumleri.push(...tarafBolumu(s.davali, `4.${altNo}`));
  }

  const kaynakBolumu: Icerik[] = [];
  for (const tabloAdi of [...new Set(s.kaynaklar.map((k) => k.tablo))]) {
    const satirlar = s.kaynaklar.filter((k) => k.tablo === tabloAdi);
    const ortakDogrulama = satirlar.every((k) => k.kaynak.dogrulama === satirlar[0]!.kaynak.dogrulama);
    kaynakBolumu.push({ text: tabloAdi, style: 'etiket', margin: [0, 6, 0, 1] });
    const aciklama = satirlar[0]!.tabloAciklamasi;
    if (aciklama) {
      kaynakBolumu.push({ text: aciklama, fontSize: 7.5, color: RENK.soluk, margin: [0, 0, 0, 2] });
    }
    if (ortakDogrulama) {
      kaynakBolumu.push({
        text: `Doğrulama: ${satirlar[0]!.kaynak.dogrulama}`,
        fontSize: 7.5,
        color: RENK.soluk,
        margin: [0, 0, 0, 2],
      });
    }
    kaynakBolumu.push(
      tablo(
        ['Yürürlük', 'Değer', 'Kaynak'],
        satirlar.map((k) => [
          k.aralik,
          k.deger,
          kaynakYaz(k.kaynak) + (ortakDogrulama ? '' : `\nDoğrulama: ${k.kaynak.dogrulama}`),
        ]),
        { genislik: [95, 130, '*'] },
      ),
    );
  }

  const icerik: Icerik[] = [
    { text: 'AAÜT VEKALET ÜCRETİ HESAP RAPORU', style: 'baslik' },
    ikiSutun(ust),
    baslik('1. Özet'),
    tablo(
      ['Taraf / Kalem', 'Esas tutar', 'Kademeli nispi', 'Merci maktu', 'Hükmedilecek ücret (TL)'],
      ozetSatirlari,
      {
        genislik: ['*', 85, 75, 70, 95],
        sag: [1, 2, 3, 4],
      },
    ),
    baslik('2. Girdiler'),
    ikiSutun(girdiler),
    baslik('3. Hukuki tercihler ve tarife esasları'),
    tablo(
      ['Esas', 'Değer', 'Kaynak', 'Dayanak'],
      s.parametreler.map((p) => [p.ad, p.deger, p.kaynak, p.dayanak]),
      { genislik: [115, 135, 50, '*'] },
    ),
    baslik('4. Taraf bazında vekalet ücreti hesapları'),
    ...tarafBolumleri,
    baslik('5. Kullanılan tablo satırları ve resmi kaynakları'),
    ...kaynakBolumu,
    tablo(
      ['Tablo dosyası', 'Doğrulama tarihi', 'SHA-256'],
      s.tabloOzetleri.map((t) => [
        t.ad,
        t.dogrulamaTarihi === '-' ? '-' : trTarih(t.dogrulamaTarihi),
        t.ozet,
      ]),
      { genislik: [140, 70, '*'] },
    ),
    baslik('6. Sınırlar ve uyarılar'),
    madde([
      ...s.uyarilar,
      ...s.notlar,
      'Avukatlık Asgari Ücret Tarifesi m.21 uyarınca avukatlık ücretinin takdirinde, hukuki yardımın tamamlandığı veya davada hükmün verildiği tarihte yürürlükte olan tarife esas alınır.',
      'AAÜT m.13 uyarınca tarifenin üçüncü kısmına göre hesaplanan nispi vekalet ücreti, ikinci kısmın ikinci bölümünde ilgili mahkeme için öngörülen maktu ücretten az olamaz ve kabul veya reddedilen müddeabih miktarını geçemez.',
      'Hesap yalnız 1136 sayılı Avukatlık Kanunu m.168 ve AAÜT uyarınca hükmedilecek karşı yan (yasal) vekalet ücretini kapsar; avukat ile müvekkil arasındaki sözleşmesel ücreti (m.164) kapsamaz.',
    ]),
    baslik('7. Hesap kimliği'),
    ikiSutun([
      ['Araç', bilgi.surum],
      ['Girdi dosyası SHA-256', bilgi.girdiOzeti],
    ]),
  ];

  return {
    pageSize: 'A4',
    pageMargins: [42, 40, 42, 46],
    info: {
      title: `AAÜT vekalet ücreti hesap raporu, ${dsy.mahkeme} ${dsy.esasNo}`,
      author: dsy.hazirlayan ?? 'mizan',
      creator: bilgi.surum,
      subject: `Bilirkişilik alt alanı ${dsy.altAlan}`,
    },
    defaultStyle: { font: 'Roboto', fontSize: 9, lineHeight: 1.15 },
    styles: {
      baslik: { fontSize: 14, bold: true, margin: [0, 0, 0, 8] },
      b1: { fontSize: 11.5, bold: true, margin: [0, 10, 0, 4] },
      b2: { fontSize: 10, bold: true, margin: [0, 8, 0, 3] },
      etiket: { fontSize: 8.5, bold: true, margin: [0, 2, 0, 1] },
    },
    footer: (sayfa: number, toplam: number) => ({
      columns: [
        {
          text: `${dsy.mahkeme} ${dsy.esasNo} · ${bilgi.surum} · girdi ${bilgi.girdiOzeti.slice(0, 16)}`,
          fontSize: 7,
          color: RENK.soluk,
        },
        { text: `${sayfa} / ${toplam}`, alignment: 'right', fontSize: 7, color: RENK.soluk, width: 40 },
      ],
      margin: [42, 16, 42, 0],
    }),
    content: icerik,
  };
}

/** YYYY-AA-GG_mahkeme-esas_altalan.pdf (defter kuralı 4). */
export function aautKanitDosyaAdi(s: AautHesapSonucu, uretimTarihi: string): string {
  const dsy = s.girdi.dosya;
  const mahkeme = dsy.kisaAd ?? kisaltma(dsy.mahkeme);
  return `${uretimTarihi}_${mahkeme}-${kisaltma(dsy.esasNo)}_${dsy.altAlan}.pdf`;
}

export function aautDefterSatiri(s: AautHesapSonucu, uretimTarihi: string, surum: string): string {
  const dsy = s.girdi.dosya;
  const parcalar: string[] = [];
  if (!s.davaci.hukmedilenUcret.isZero()) {
    parcalar.push(`davacı/alacaklı vekalet ücreti ${tl(s.davaci.hukmedilenUcret)} TL`);
  }
  if (!s.davali.hukmedilenUcret.isZero()) {
    parcalar.push(`davalı karşı vekalet ücreti ${tl(s.davali.hukmedilenUcret)} TL`);
  }
  if (parcalar.length === 0) {
    parcalar.push('vekalet ücreti 0,00 TL');
  }
  const ozet = `aaüt (${s.tarifeDonemi}); ${parcalar.join(', ')}; ${surum}`;
  const hucreler = [
    trTarih(uretimTarihi),
    dsy.kaynak,
    `${dsy.mahkeme} ${dsy.esasNo}`,
    dsy.altAlan,
    ozet,
    aautKanitDosyaAdi(s, uretimTarihi),
    '',
  ];
  return `| ${hucreler.map((h) => h.replace(/\|/g, '/')).join(' | ')} |`;
}
