// İcra kapak hesabı PDF rapor tanımı (pdfmake) ve bilirkişilik defter satırı (Faz 2).
// src/rapor/pdf.ts görsel üslubuyla birebir uyumludur; hiçbir Node modülü kullanmaz.
import { Decimal, tl, topla, yuzde } from '../para.ts';
import { kisaltma } from '../rapor/defter.ts';
import type { RaporBilgisi } from '../rapor/pdf.ts';
import type { Kaynak } from '../tablolar.ts';
import { trTarih } from '../tarih.ts';
import {
  ICRA_FAIZ_TURU_ADLARI,
  ICRA_TAKIP_TURU_ADLARI,
  TAHSIL_ASAMA_ADLARI,
  type IcraHesapSonucu,
} from './hesap.ts';

type Icerik = Record<string, unknown> | string | Icerik[];

const RENK = { cizgi: '#9a9a9a', baslik: '#eeeeee', soluk: '#555555' };

function hucre(metin: string, ek: Record<string, unknown> = {}): Record<string, unknown> {
  return { text: metin, ...ek };
}

function tablo(
  basliklar: string[],
  satirlar: string[][],
  secenek: {
    genislik?: (string | number)[];
    sag?: number[];
    toplam?: string[];
    kalinSatirlar?: number[];
    fontSize?: number;
    yatayBosluk?: number;
  } = {},
) {
  const sag = new Set(secenek.sag ?? []);
  const kalin = new Set(secenek.kalinSatirlar ?? []);
  const satir = (s: string[], kalinMi = false) =>
    s.map((m, i) => hucre(m, { alignment: sag.has(i) ? 'right' : 'left', bold: kalinMi }));
  const govde = [
    basliklar.map((b, i) => hucre(b, { bold: true, fillColor: RENK.baslik, alignment: sag.has(i) ? 'right' : 'left' })),
    ...satirlar.map((s, idx) => satir(s, kalin.has(idx))),
  ];
  if (secenek.toplam) govde.push(satir(secenek.toplam, true));
  return {
    table: { headerRows: 1, widths: secenek.genislik ?? basliklar.map(() => '*'), body: govde, dontBreakRows: true },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0,
      hLineColor: () => RENK.cizgi,
      paddingTop: () => 2,
      paddingBottom: () => 2,
      ...(secenek.yatayBosluk !== undefined
        ? { paddingLeft: () => secenek.yatayBosluk!, paddingRight: () => secenek.yatayBosluk! }
        : {}),
    },
    fontSize: secenek.fontSize ?? 8,
    margin: [0, 2, 0, 6],
  };
}

function ikiSutun(satirlar: [string, string][]) {
  return {
    table: { widths: [150, '*'], body: satirlar.map(([a, b]) => [hucre(a, { color: RENK.soluk }), hucre(b)]) },
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

/** YYYY-AA-GG_icradairesi-esas_altalan.pdf (defter kuralı 4). */
export function icraKanitDosyaAdi(s: IcraHesapSonucu, uretimTarihi: string): string {
  const dsy = s.girdi.dosya;
  const merci =
    dsy.kisaAd ??
    kisaltma(dsy.mahkeme)
      .replace(/-(icra-dairesi|icra-mudurlugu)$/, '-icra');
  return `${uretimTarihi}_${merci}-${kisaltma(dsy.esasNo)}_${dsy.altAlan}.pdf`;
}

/** Bilirkişilik hesap kayıt defterine yapıştırılacak satır. */
export function icraDefterSatiri(s: IcraHesapSonucu, uretimTarihi: string, surum: string): string {
  const dsy = s.girdi.dosya;
  const takipTuruKisa = ICRA_TAKIP_TURU_ADLARI[s.takipTuru].toLocaleLowerCase('tr-TR');
  const ozet =
    `icra kapak hesabı (${takipTuruKisa}); takip çıkışı ${tl(s.takipCikisToplami)} TL, ` +
    `takip sonrası faiz ${tl(s.toplamTakipSonrasiFaiz)} TL, ` +
    `borçlunun ödeyeceği kapak tutarı ${tl(s.borclununOdeyecegiKapakTutari)} TL, ` +
    `alacaklıya net ödenecek tutar ${tl(s.alacakliyaNetOdenecekTutar)} TL; ${surum}`;
  const hucreler = [
    trTarih(uretimTarihi),
    dsy.kaynak,
    `${dsy.mahkeme} ${dsy.esasNo}`,
    dsy.altAlan,
    ozet,
    icraKanitDosyaAdi(s, uretimTarihi),
    '',
  ];
  return `| ${hucreler.map((h) => h.replace(/\|/g, '/')).join(' | ')} |`;
}

export const ICRA_KISMI_ODEME_BASLIKLARI = [
  '#',
  'Ödeme tarihi',
  'Tahsil yeri',
  'Ödeme (TL)',
  'Harç kesintisi (TL)',
  'Alacaklıya mahsup (TL)',
  'Dönem faizi (TL)',
  'Mahsup öncesi faiz/gider (TL)',
  'Faiz/giderden düşülen (TL)',
  'Anaparadan düşülen (TL)',
  'Kalan faiz/gider (TL)',
  'Kalan anapara (TL)',
];

export const ICRA_KISMI_ODEME_ACIKLAMASI =
  '492 s.K. m.28/1-b ve Yargıtay 12. HD 2022/10807 E., 2023/3309 K. uyarınca icra veznesine yapılan kısmi ödemelerden öncelikle tahsil harcı kesintisi ayrıştırılmış; 6098 s.K. TBK m.100/1 gereğince alacaklıya mahsup edilen tutar önce ödeme tarihine kadar işlemiş faiz ve takip giderlerinden, artan tutar ise asıl alacaktan düşülmüştür. TBK m.121/3 uyarınca işlemiş faize tekrar faiz yürütülmemiştir.';

export function icraOzetSatirlari(s: IcraHesapSonucu): string[][] {
  const g = s.girdi;
  const h = s.harclar;
  const alacakliyaMahsupToplami = s.toplamKismiOdeme.minus(h.odemelerdenKesilenTahsilHarci);
  return [
    ['Asıl alacak (takip çıkışı anapara)', 'Anapara', tl(s.asilAlacak)],
    ["Takip öncesi birikmiş faiz ve fer'iler", 'TBK m.121/3 (faiz yürütülmez)', tl(s.takipOncesiToplam)],
    ['Takip çıkışı toplamı (harç matrahı)', '492 s.K. m.20', tl(s.takipCikisToplami)],
    ['Başvurma harcı', '492 s.K. (1) sayılı tarife B/I-1', tl(h.basvurmaHarci)],
    [
      'Peşin harç (alacaklıca yatırılan)',
      g.takip.pesinHarcAlindiMi ? `492 s.K. m.29 (${yuzde(h.pesinHarcOrani)})` : 'Alınmadı (ilamlı / muaf)',
      tl(h.pesinHarc),
    ],
    [
      'Ödemelerden kesilen tahsil harcı',
      '492 s.K. m.28/1-b (vezne tahsilatlarından kesilen)',
      tl(h.odemelerdenKesilenTahsilHarci),
    ],
    [
      'Bakiye icra tahsil harcı',
      `492 s.K. B/I-3 (${yuzde(h.uygulananTahsilOrani)} tahsil harcından ${tl(h.mahsupEdilenPesinHarc)} TL peşin harç ve ${tl(h.odemelerdenKesilenTahsilHarci)} TL vezne kesintisi mahsubu)`,
      tl(h.bakiyeTahsilHarci),
    ],
    ['İcra vekalet ücreti', 'AAÜT / İİK m.138', tl(s.vekaletUcreti)],
    ['Takip masrafları toplamı', 'İİK m.59', tl(s.toplamMasraf)],
    ['Takip sonrası işlemiş faiz toplamı', ICRA_FAIZ_TURU_ADLARI[g.takip.faiz.tur], tl(s.toplamTakipSonrasiFaiz)],
    [
      'Kısmi ödemeler toplamı (mahsup)',
      h.odemelerdenKesilenTahsilHarci.gt(0)
        ? `6098 s.K. TBK m.100 (${tl(alacakliyaMahsupToplami)} TL alacaklıya mahsup + ${tl(h.odemelerdenKesilenTahsilHarci)} TL harç)`
        : '6098 s.K. TBK m.100',
      s.toplamKismiOdeme.isZero() ? '0,00' : '-' + tl(s.toplamKismiOdeme),
    ],
    ['Borçlunun ödeyeceği kapak tutarı', 'Kalan anapara + faiz/gider + bakiye tahsil harcı', tl(s.borclununOdeyecegiKapakTutari)],
    [
      'Ödemelerden kesilen cezaevi harcı',
      '2548 s.K. m.1 (önceki vezne reddiyatlarından kesilen)',
      tl(h.odemelerdenKesilenCezaeviHarci),
    ],
    [
      'Bakiye cezaevleri yapı harcı (alacaklıdan kesilen)',
      `2548 s.K. m.1 (${yuzde(h.cezaeviHarciOrani)}; toplam ${tl(h.hesaplananCezaeviHarci)} TL'den kalan; borçluya yüklenmez)`,
      '-' + tl(h.cezaeviHarci),
    ],
    ['Alacaklıya net ödenecek tutar', 'Tahsil ve bakiye cezaevi harçları düşüldükten sonra net reddiyat', tl(s.alacakliyaNetOdenecekTutar)],
  ];
}

export function icraHarcSatirlari(s: IcraHesapSonucu): string[][] {
  const g = s.girdi;
  const h = s.harclar;
  return [
    ['Harç matrahı (takip çıkışı)', '492 s.K. m.20 (takip sonrası faiz matraha girmez)', '-', tl(h.harcMatrahi)],
    ['Başvurma harcı', '492 s.K. (1) sayılı tarife B/I-1 (maktu)', '-', tl(h.basvurmaHarci)],
    [
      'Peşin harç',
      g.takip.pesinHarcAlindiMi ? '492 s.K. m.28-29 (ilamsız takipte takip çıkışı üzerinden)' : '492 s.K. m.29 (alınmadı)',
      g.takip.pesinHarcAlindiMi ? yuzde(h.pesinHarcOrani) : '%0',
      tl(h.pesinHarc),
    ],
    [
      'İcra tahsil harcı (hesaplanan)',
      `${TAHSIL_ASAMA_ADLARI[h.tahsilHarciAsamasi]}${h.feragatIndirimiUygulandiMi ? ' · 492 s.K. m.23 feragat 1/2 indirimi' : ''}`,
      yuzde(h.uygulananTahsilOrani),
      tl(h.hesaplananTahsilHarci),
    ],
    ['Mahsup edilen peşin harç', '492 s.K. m.29/2 (tahsil harcından mahsup)', '-', '-' + tl(h.mahsupEdilenPesinHarc)],
    [
      'Ödemelerden kesilen tahsil harcı',
      '492 s.K. m.28/1-b (vezne ödemelerinden kesilen)',
      '-',
      '-' + tl(h.odemelerdenKesilenTahsilHarci),
    ],
    ['Bakiye tahsil harcı (borçlu öder)', 'Tahsil harcı - peşin harç - ödemelerden kesilen', '-', tl(h.bakiyeTahsilHarci)],
    [
      'Cezaevleri yapı harcı (hesaplanan)',
      '2548 s.K. m.1 (alacaklıya ödenecek paradan kesilir, borçluya yüklenmez)',
      yuzde(h.cezaeviHarciOrani),
      tl(h.hesaplananCezaeviHarci),
    ],
    [
      'Ödemelerden kesilen cezaevi harcı',
      '2548 s.K. m.1 (vezne reddiyatlarından kesilen)',
      '-',
      '-' + tl(h.odemelerdenKesilenCezaeviHarci),
    ],
    ['Bakiye cezaevi yapı harcı (alacaklı öder)', 'Hesaplanan cezaevi harcı - ödemelerden kesilen', '-', tl(h.cezaeviHarci)],
  ];
}

export function icraKismiOdemeSatirlari(s: IcraHesapSonucu): string[][] {
  return s.kismiOdemeAdimlari.map((adim) => [
    String(adim.sira),
    trTarih(adim.tarih),
    adim.tahsilYeri === 'haricen' ? 'Haricen' : 'Vezne',
    tl(adim.odemeTutari),
    tl(adim.kesilenTahsilHarci),
    tl(adim.alacakliyaMahsupEdilen),
    tl(adim.donemFaizi.toplam),
    tl(adim.mahsupOncesiFaizVeGider),
    tl(adim.faizVeGiderdenMahsup),
    tl(adim.asilAlacaktanMahsup),
    tl(adim.kalanFaizVeGider),
    tl(adim.kalanAsilAlacak),
  ]);
}

export function icraRaporTanimi(s: IcraHesapSonucu, bilgi: RaporBilgisi): Record<string, unknown> {
  const g = s.girdi;
  const dsy = g.dosya;
  const h = s.harclar;
  const gunEsasi = (g.parametreler?.faizGunEsasi ?? new Decimal(365)).toString();

  const ust: [string, string][] = [
    ['Dosya / İcra Dairesi', `${dsy.mahkeme} ${dsy.esasNo}`],
    ['Bilirkişilik alt alanı', dsy.altAlan],
    ['Takip tarihi ve türü', `${trTarih(g.takip.takipTarihi)} · ${ICRA_TAKIP_TURU_ADLARI[s.takipTuru]}`],
    ['Kapak (hesap) tarihi', trTarih(g.hesapTarihi)],
    ['Rapor üretim zamanı', bilgi.uretimZamani],
  ];
  if (dsy.hazirlayan) ust.push(['Hazırlayan', dsy.hazirlayan]);

  const ozetSatirlari = icraOzetSatirlari(s);

  const takipOncesiBolumu: Icerik[] =
    s.takipOncesiKalemler.length > 0
      ? [
          { text: 'Takip Öncesi Kalemler', style: 'etiket' },
          tablo(
            ['Kalem', 'Açıklama', 'Tutar (TL)'],
            s.takipOncesiKalemler.map((k) => [k.ad, k.aciklama ?? '-', tl(k.tutar)]),
            { genislik: [140, '*', 90], sag: [2], toplam: ['Takip öncesi toplam', '', tl(s.takipOncesiToplam)] },
          ),
        ]
      : [];

  const masrafBolumu: Icerik[] =
    s.masraflar.length > 0
      ? [
          { text: 'Takip Masrafları', style: 'etiket' },
          tablo(
            ['Tarih', 'Açıklama', 'Tutar (TL)'],
            s.masraflar.map((m) => [trTarih(m.tarih), m.aciklama, tl(m.tutar)]),
            { genislik: [80, '*', 90], sag: [2], toplam: ['Toplam masraf', '', tl(s.toplamMasraf)] },
          ),
        ]
      : [];

  const harcSatirlari = icraHarcSatirlari(s);

  const faizBolumu: Icerik[] = [];
  for (const fd of s.faizDonemleri) {
    faizBolumu.push({
      text: `${fd.aciklama}: ${ICRA_FAIZ_TURU_ADLARI[fd.tur]}, ${tl(fd.matrah)} TL anapara üzerine (${fd.gerekce})`,
      style: 'etiket',
    });
    if (fd.kesitler.length === 0) {
      faizBolumu.push({
        text: 'Bu dönemde faiz işlemedi (gün sayısı 0 ya da kalan asıl alacak 0,00 TL).',
        fontSize: 8.5,
        margin: [0, 0, 0, 6],
      });
    } else {
      const toplamGun = String(topla(fd.kesitler.map((x) => new Decimal(x.gun))));
      faizBolumu.push(
        tablo(
          ['Dönem', 'Gün', 'Yıllık oran', 'Faiz (TL)'],
          fd.kesitler.map((x) => [`${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`, String(x.gun), yuzde(x.oran), tl(x.tutar)]),
          { sag: [1, 2, 3], toplam: ['Dönem toplamı', toplamGun, '', tl(fd.toplam)] },
        ),
      );
    }
  }

  const kismiOdemeBolumu: Icerik[] =
    s.kismiOdemeAdimlari.length > 0
      ? [
          baslik('5. TBK m.100 Kısmi Ödemelerin Mahsubu'),
          {
            text: ICRA_KISMI_ODEME_ACIKLAMASI,
            fontSize: 8.5,
            margin: [0, 0, 0, 4],
          },
          tablo(ICRA_KISMI_ODEME_BASLIKLARI, icraKismiOdemeSatirlari(s), {
            genislik: [14, 42, 34, 44, 42, 46, 40, 48, 46, 46, 44, 46],
            sag: [0, 3, 4, 5, 6, 7, 8, 9, 10, 11],
            fontSize: 7,
            yatayBosluk: 2,
          }),
        ]
      : [];

  const kaynakBolumu: Icerik[] = [];
  for (const tabloAdi of [...new Set(s.kaynaklar.map((k) => k.tablo))]) {
    const satirlar = s.kaynaklar.filter((k) => k.tablo === tabloAdi);
    const ortakDogrulama = satirlar.every((k) => k.kaynak.dogrulama === satirlar[0]!.kaynak.dogrulama);
    kaynakBolumu.push({ text: tabloAdi, style: 'etiket', margin: [0, 6, 0, 1] });
    const aciklama = satirlar[0]!.tabloAciklamasi;
    if (aciklama) kaynakBolumu.push({ text: aciklama, fontSize: 7.5, color: RENK.soluk, margin: [0, 0, 0, 2] });
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
        { genislik: [95, 120, '*'] },
      ),
    );
  }

  const icerik: Icerik[] = [
    { text: 'İCRA KAPAK HESABI RAPORU', style: 'baslik' },
    ikiSutun(ust),
    baslik('1. Kapak Hesabı Özeti'),
    tablo(['Kalem', 'Dayanak / Açıklama', 'Tutar (TL)'], ozetSatirlari, {
      genislik: [175, '*', 85],
      sag: [2],
      kalinSatirlar: [2, 11, 14],
    }),
    baslik('2. Takip Çıkışı, Masraflar ve Esaslar'),
    ikiSutun([
      ['Takip türü', ICRA_TAKIP_TURU_ADLARI[s.takipTuru]],
      ['Takip tarihi', trTarih(g.takip.takipTarihi)],
      ['Asıl alacak', `${tl(s.asilAlacak)} TL`],
      ['Takip öncesi fer\'iler toplamı', `${tl(s.takipOncesiToplam)} TL`],
      ['Takip çıkışı toplamı', `${tl(s.takipCikisToplami)} TL`],
      [
        'Takip sonrası faiz türü',
        `${ICRA_FAIZ_TURU_ADLARI[g.takip.faiz.tur]}${g.takip.faiz.sozlesmeOrani ? ` (${yuzde(g.takip.faiz.sozlesmeOrani)})` : ''} · gün esası 1/${gunEsasi} (${g.takip.faiz.gerekce})`,
      ],
      ['Tahsil harcı aşaması', TAHSIL_ASAMA_ADLARI[h.tahsilHarciAsamasi]],
      ['Takipten feragat / vazgeçme', h.feragatVarMi ? 'Var (492 s.K. m.23)' : 'Yok'],
    ]),
    ...takipOncesiBolumu,
    ...masrafBolumu,
    baslik('3. Harç Hesabı (492 s.K. ve 2548 s.K.)'),
    tablo(['Harç kalemi', 'Hukuki dayanak ve açıklama', 'Oran', 'Tutar (TL)'], harcSatirlari, {
      genislik: [130, '*', 50, 75],
      sag: [2, 3],
      kalinSatirlar: [6, 9],
    }),
    baslik('4. Takip Sonrası Faiz Hesabı'),
    ...faizBolumu,
    ...kismiOdemeBolumu,
    baslik('6. Hukuki Dayanaklar, Sınırlar ve Resmi Kaynaklar'),
    madde([
      ...s.dayanaklar,
      ...s.uyarilar,
      '2548 s.K. m.1 gereğince %2 cezaevleri yapı harcı borçluya yükletilmez; alacaklıya ödenecek paradan kesilir. Bu nedenle "Borçlunun ödeyeceği kapak tutarı" ile "Alacaklıya net ödenecek tutar" ayrı satırlarda gösterilmiştir.',
    ]),
    ...kaynakBolumu,
    tablo(
      ['Tablo dosyası', 'Doğrulama tarihi', 'SHA-256'],
      s.tabloOzetleri.map((t) => [t.ad, t.dogrulamaTarihi === '-' ? '-' : trTarih(t.dogrulamaTarihi), t.ozet]),
      { genislik: [140, 70, '*'] },
    ),
    baslik('7. Hesap Kimliği'),
    ikiSutun([
      ['Araç', bilgi.surum],
      ['Girdi dosyası SHA-256', bilgi.girdiOzeti],
    ]),
  ];

  return {
    pageSize: 'A4',
    pageMargins: [42, 40, 42, 46],
    info: {
      title: `İcra kapak hesabı raporu, ${dsy.mahkeme} ${dsy.esasNo}`,
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
