// Tarihli PDF hesap raporu: girdiler, hukuki tercihler, her kalemin formülü ve dayanağı,
// brüt-net, faiz ve kullanılan tablo satırlarının resmi kaynakları. Yalnız pdfmake belge tanımı
// üretir; yazım Node'da src/node/pdf-yaz.ts, tarayıcıda pdfmake'in tarayıcı paketiyle yapılır.
// Tanım "Roboto" yazı tipini kullanır.
import type { HesapSonucu, KalemSonucu } from '../hesap.ts';
import { Decimal, tl, topla, yuzde } from '../para.ts';
import { trTarih } from '../tarih.ts';
import type { Kaynak } from '../tablolar.ts';
import { donemYaz, sureAciklamasi } from '../kalemler/ortak.ts';

type Icerik = Record<string, unknown> | string | Icerik[];

export interface RaporBilgisi {
  uretimZamani: string; // "22.10.2026 14:31"
  surum: string;
  girdiOzeti: string;
}

const RENK = { cizgi: '#9a9a9a', baslik: '#eeeeee', soluk: '#555555' };

function hucre(metin: string, ek: Record<string, unknown> = {}): Record<string, unknown> {
  return { text: metin, ...ek };
}

function tablo(basliklar: string[], satirlar: string[][], secenek: { genislik?: (string | number)[]; sag?: number[]; toplam?: string[] } = {}) {
  const sag = new Set(secenek.sag ?? []);
  const satir = (s: string[], kalin = false) =>
    s.map((m, i) => hucre(m, { alignment: sag.has(i) ? 'right' : 'left', bold: kalin }));
  const govde = [
    basliklar.map((b, i) => hucre(b, { bold: true, fillColor: RENK.baslik, alignment: sag.has(i) ? 'right' : 'left' })),
    ...satirlar.map((s) => satir(s)),
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
    },
    fontSize: 8,
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

function faizTuruAdi(tur: string): string {
  return tur === 'mevduat' ? 'en yüksek mevduat faizi' : 'yasal faiz';
}

function kalemBolumu(k: KalemSonucu, no: number): Icerik[] {
  const parca: Icerik[] = [baslik(`4.${no} ${k.ad}`, 2)];
  parca.push({ text: 'Dayanak', style: 'etiket' }, madde(k.dayanak));
  parca.push({ text: 'Formül', style: 'etiket' }, madde(k.formul));
  parca.push(ikiSutun(k.bilgiler));
  for (const [baslikMetni, d] of [
    ['', k.detay] as const,
    ...(k.ekDetaylar ?? []).map((e) => [e.baslik, e.tablo] as const),
  ]) {
    if (!d) continue;
    if (baslikMetni) parca.push({ text: baslikMetni, style: 'etiket' });
    const sag = d.basliklar.map((_, i) => i).filter((i) => i > 0 && !/Açıklama|Dönem|Dolum|Ödeme tarihi/.test(d.basliklar[i]!));
    parca.push(tablo(d.basliklar, d.satirlar, { sag, toplam: d.toplam }));
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
  parca.push(tablo(['Brütten nete', 'Tutar (TL)'], ozet.slice(0, -1), { genislik: ['*', 90], sag: [1], toplam: ozet[ozet.length - 1] }));

  for (const f of k.faizler) {
    parca.push({
      text: `Faiz: ${faizTuruAdi(f.tur)}, ${tl(f.matrah)} TL üzerine ${trTarih(f.baslangic)} - ${trTarih(f.bitis)} (girdi: ${f.gerekce})`,
      style: 'etiket',
    });
    if (f.kesitler.length === 0) {
      parca.push({ text: 'Faiz başlangıcı bitiş tarihinden sonra ya da matrah sıfır; faiz işlemedi.', fontSize: 8.5, margin: [0, 0, 0, 6] });
      continue;
    }
    const toplamGun = String(topla(f.kesitler.map((x) => new Decimal(x.gun))));
    const yildonumu = f.kesitler.some((x) => x.oranTarihi);
    parca.push(
      yildonumu
        ? tablo(
            ['Dönem', 'Gün', 'Oranın alındığı gün', 'Yıllık oran', 'Faiz (TL)'],
            f.kesitler.map((x) => [
              `${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`,
              String(x.gun),
              trTarih(x.oranTarihi!),
              yuzde(x.oran),
              tl(x.tutar),
            ]),
            { sag: [1, 3, 4], toplam: ['Toplam', toplamGun, '', '', tl(f.toplam)] },
          )
        : tablo(
            ['Dönem', 'Gün', 'Yıllık oran', 'Faiz (TL)'],
            f.kesitler.map((x) => [`${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`, String(x.gun), yuzde(x.oran), tl(x.tutar)]),
            { sag: [1, 2, 3], toplam: ['Toplam', toplamGun, '', tl(f.toplam)] },
          ),
    );
  }
  if (k.notlar.length) parca.push({ text: 'Notlar', style: 'etiket' }, madde(k.notlar));
  return parca;
}

export function raporTanimi(s: HesapSonucu, bilgi: RaporBilgisi): Record<string, unknown> {
  const g = s.girdi;
  const dsy = g.dosya;

  const ust: [string, string][] = [
    ['Dosya', `${dsy.mahkeme} ${dsy.esasNo}`],
    ['Bilirkişilik alt alanı', dsy.altAlan],
    ['Hesap tarihi', trTarih(g.hesapTarihi)],
    ['Faiz bitiş tarihi', trTarih(s.esaslar.faizBitis)],
    ['Rapor üretim zamanı', bilgi.uretimZamani],
  ];
  if (dsy.hazirlayan) ust.push(['Hazırlayan', dsy.hazirlayan]);

  const ozetSatirlari = s.kalemler.map((k) => [
    k.ad,
    tl(k.brut),
    tl(k.brut.minus(k.net)),
    tl(k.net),
    k.faizler.length ? k.faizler.map((f) => `${faizTuruAdi(f.tur)}, ${trTarih(f.baslangic)}`).join('; ') : '-',
    tl(topla(k.faizler.map((f) => f.toplam))),
  ]);

  const hizmetSatirlari: [string, string][] = g.hizmet.donemler.map((p, i) => [`Hizmet dönemi ${i + 1}`, donemYaz(g, p)]);
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
  if (g.hizmet.dogumTarihi) girdiler.push(['Doğum tarihi', 'girildi (yalnız yıllık izin yaş kuralında kullanıldı, raporda yaş olarak görünür)']);

  const kalemTercihleri: string[][] = [];
  for (const k of s.kalemler) {
    const kg = g.kalemler[k.kod]!;
    if ('hakVar' in kg) kalemTercihleri.push([k.ad, 'Hak varlığı', kg.hakVar ? 'var' : 'yok', kg.gerekce]);
    if ('ucretTuru' in kg) kalemTercihleri.push([k.ad, 'İzin ücretine esas ücret', kg.ucretTuru === 'ciplak' ? 'çıplak' : 'giydirilmiş', '-']);
    if (kg.takdiriIndirim) kalemTercihleri.push([k.ad, 'Takdiri indirim', yuzde(kg.takdiriIndirim.oran), kg.takdiriIndirim.gerekce]);
    if (kg.mahsup) kalemTercihleri.push([k.ad, 'Mahsup', `${tl(kg.mahsup.tutar)} TL`, kg.mahsup.aciklama]);
    if ('oncekiOdemeler' in kg && kg.oncekiOdemeler) {
      const op = kg.oncekiOdemeler;
      kalemTercihleri.push([k.ad, 'Önceki ödemelerin mahsubu', op.faiz === 'yasal' ? 'yasal faiziyle' : 'faizsiz', op.gerekce]);
    }
    if ('donemEsasi' in kg && kg.donemEsasi) {
      kalemTercihleri.push([k.ad, 'Bildirim süresi esası', kg.donemEsasi === 'son' ? 'son hizmet dönemi' : 'tüm dönemler', '-']);
    }
    if ('kullandirilanGun' in kg && kg.kullandirilanGun) {
      kalemTercihleri.push([k.ad, 'Kullandırılan bildirim süresi', `${kg.kullandirilanGun.toString()} gün`, '-']);
    }
    for (const f of kg.faiz ?? []) {
      kalemTercihleri.push([k.ad, 'Faiz', `${faizTuruAdi(f.tur)}, ${trTarih(f.baslangic)}${f.tutar ? `, ${tl(f.tutar)} TL` : ''}`, f.gerekce]);
    }
  }

  const kaynakBolumu: Icerik[] = [];
  for (const tabloAdi of [...new Set(s.kaynaklar.map((k) => k.tablo))]) {
    const satirlar = s.kaynaklar.filter((k) => k.tablo === tabloAdi);
    const ortakDogrulama = satirlar.every((k) => k.kaynak.dogrulama === satirlar[0]!.kaynak.dogrulama);
    kaynakBolumu.push({ text: tabloAdi, style: 'etiket', margin: [0, 6, 0, 1] });
    const aciklama = satirlar[0]!.tabloAciklamasi;
    if (aciklama) kaynakBolumu.push({ text: aciklama, fontSize: 7.5, color: RENK.soluk, margin: [0, 0, 0, 2] });
    if (ortakDogrulama) {
      kaynakBolumu.push({ text: `Doğrulama: ${satirlar[0]!.kaynak.dogrulama}`, fontSize: 7.5, color: RENK.soluk, margin: [0, 0, 0, 2] });
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
    { text: 'İŞÇİLİK ALACAKLARI HESAP RAPORU', style: 'baslik' },
    ikiSutun(ust),
    baslik('1. Özet'),
    tablo(['Kalem', 'Brüt (TL)', 'Kesinti (TL)', 'Net (TL)', 'Faiz türü ve başlangıcı', 'Faiz (TL)'], ozetSatirlari, {
      genislik: ['*', 62, 58, 62, 110, 58],
      sag: [1, 2, 3, 5],
      toplam: [
        'Toplam',
        tl(s.toplam.brut),
        tl(s.toplam.brut.minus(s.toplam.net)),
        tl(s.toplam.net),
        '',
        tl(s.toplam.faiz),
      ],
    }),
    baslik('2. Girdiler'),
    ikiSutun(girdiler),
    baslik('3. Hukuki tercihler ve hesap esasları'),
    {
      text: 'Aşağıdaki değerler hesabın sonucunu değiştiren tercihlerdir. "Girdi" olanlar hesap dosyasında açıkça yazılmıştır; "varsayılan" olanlar yanındaki dayanakla araç tarafından alınmıştır.',
      fontSize: 8.5,
      margin: [0, 0, 0, 4],
    },
    tablo(
      ['Esas', 'Değer', 'Kaynak', 'Dayanak'],
      s.parametreler.map((p) => [p.ad, p.deger, p.kaynak, p.dayanak]),
      { genislik: [110, 130, 50, '*'] },
    ),
    tablo(['Kalem', 'Tercih', 'Değer', 'Gerekçe (girdi)'], kalemTercihleri, { genislik: [95, 85, 110, '*'] }),
    baslik('4. Kalem hesapları'),
    ...s.kalemler.flatMap((k, i) => kalemBolumu(k, i + 1)),
    baslik('5. Kullanılan tablo satırları ve resmi kaynakları'),
    ...kaynakBolumu,
    tablo(
      ['Tablo dosyası', 'Doğrulama tarihi', 'SHA-256'],
      s.tabloOzetleri.map((t) => [t.ad, t.dogrulamaTarihi === '-' ? '-' : trTarih(t.dogrulamaTarihi), t.ozet]),
      { genislik: [120, 70, '*'] },
    ),
    baslik('6. Sınırlar ve uyarılar'),
    madde([
      ...s.uyarilar,
      'Hesap, girdi dosyasındaki olgu kabullerine (hizmet süresi, ücret, fazla çalışma saatleri, çalışılan tatil günleri) dayanır. Bu kabullerin ispatı ve değerlendirmesi mahkemeye aittir.',
      'Zamanaşımı araç tarafından uygulanmaz; dönemler girdi dosyasında zamanaşımı dikkate alınarak verilir.',
      'SGK prime esas kazanç üst sınırı brütten nete dönüşümde uygulanmamıştır. Kesintiler tek seferde ödeme varsayımıyla, hesap tarihindeki oranlarla hesaplanmıştır.',
      s.esaslar.asgariUcretIstisnasi
        ? 'Asgari ücret gelir ve damga vergisi istisnası, hesap tarihinin ayında başka ücret ödenmediği varsayımıyla bir kez uygulanmıştır.'
        : 'Asgari ücret gelir ve damga vergisi istisnası uygulanmamıştır (parametreler.vergi.asgariUcretIstisnasi).',
      'Tablo değerleri, tablonun doğrulama tarihine kadar resmi kaynaktan kontrol edilmiştir; kaynak bağlantıları 5. bölümdedir.',
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
      title: `İşçilik alacakları hesap raporu, ${dsy.mahkeme} ${dsy.esasNo}`,
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
        { text: `${dsy.mahkeme} ${dsy.esasNo} · ${bilgi.surum} · girdi ${bilgi.girdiOzeti.slice(0, 16)}`, fontSize: 7, color: RENK.soluk },
        { text: `${sayfa} / ${toplam}`, alignment: 'right', fontSize: 7, color: RENK.soluk, width: 40 },
      ],
      margin: [42, 16, 42, 0],
    }),
    content: icerik,
  };
}
