// Aile hukuku mal rejimi tasfiyesi PDF raporu (pdfmake belge tanimi) ve bilirkişilik
// hesap kayit defteri satiri. Dosya erisimi veya Node modulu kullanmaz.
import { Decimal, sayi, tl, topla, yuzde } from '../para.ts';
import { kisaltma } from '../rapor/defter.ts';
import type { RaporBilgisi } from '../rapor/pdf.ts';
import type { Kaynak } from '../tablolar.ts';
import { trTarih } from '../tarih.ts';
import { karsiTaraf, tarafAdi, type AileHesapSonucu, type MalHesapSonucu } from './hesap.ts';

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
    table: { widths: [160, '*'], body: satirlar.map(([a, b]) => [hucre(a, { color: RENK.soluk }), hucre(b)]) },
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

function malDetayBolumu(m: MalHesapSonucu, sira: number): Icerik[] {
  const parca: Icerik[] = [
    baslik(`4.${sira} ${m.ad} (${tarafAdi(m.malik)} - ${m.nitelik === 'edinilmis' ? 'Edinilmiş mal' : 'Kişisel mal'})`, 2),
  ];

  const bilgiler: [string, string][] = [
    ['Malik taraf', tarafAdi(m.malik)],
    ['Malvarlığı kesimi', m.nitelik === 'edinilmis' ? 'Edinilmiş mal (TMK m.219, m.222/3)' : 'Kişisel mal (TMK m.220)'],
    ['Edinme değeri', `${tl(m.edinmeDegeri)} TL${m.edinmeTarihi ? ` (${trTarih(m.edinmeTarihi)})` : ''}`],
    ['Tasfiye (sürüm) değeri', `${tl(m.tasfiyeDegeri)} TL (TMK m.232, m.235/1)`],
  ];
  if (m.dogrudanBorc.gt(0)) {
    bilgiler.push(['Mala ilişkin doğrudan borç', `${tl(m.dogrudanBorc)} TL (TMK m.231/1)`]);
  }
  parca.push(ikiSutun(bilgiler));

  if (m.krediDetayi) {
    const kr = m.krediDetayi;
    parca.push(
      {
        text: 'Konut / taşıt kredisi ve peşinat oranlaması (TMK m.219, m.227, m.230, m.231; Yargıtay 8. HD 2016/18180 E., 2018/18803 K.)',
        style: 'etiket',
      },
      tablo(
        ['Bileşen', 'Edinme / ödeme tutarı (TL)', 'Maldaki oranı', 'Tasfiye karşılığı (TL)', 'Hukuki niteliği'],
        [
          [
            `Diğer eş (${tarafAdi(m.digerEs)}) kişisel peşinat / kredi katkısı`,
            tl(kr.digerEsKisiselPesinat.plus(kr.digerEsKisiselKrediOdemesi)),
            yuzde(kr.digerEsKatkiOrani),
            tl(Decimal.max(new Decimal(0), topla(m.digerEsKatkilari.map((x) => x.alacak)))),
            'Değer artış payı (TMK m.227)',
          ],
          [
            `Malik eş (${tarafAdi(m.malik)}) kişisel peşinatı`,
            tl(kr.malikKisiselPesinat),
            yuzde(kr.malikKisiselOrani),
            tl(kr.malikKisiselTasfiyeKarsiligi),
            'Kişisel mal denkleştirmesi (TMK m.230)',
          ],
          [
            'Evlilik içi kredi ödemesi + edinilmiş peşinat',
            `${tl(kr.evlilikIciOdenen)} kredi + ${tl(kr.edinilmisPesinat)} peşinat`,
            yuzde(kr.edinilmisPayOrani),
            tl(kr.edinilmisTasfiyePayi),
            'Edinilmiş mal kesimi (TMK m.219, m.231)',
          ],
          [
            'Mal rejimi sonrası kredi ödemesi / kalan kredi borcu',
            tl(kr.evlilikSonrasiOdenen),
            yuzde(kr.evlilikSonrasiKrediOrani),
            tl(kr.evlilikSonrasiKrediTasfiyeBorcu),
            'Mala ilişkin borç / kişisel ödeme (TMK m.230, m.231)',
          ],
        ],
        { genislik: ['*', 95, 58, 72, 115], sag: [1, 2, 3] },
      ),
    );
  }

  if (m.malikKisiselKatkiDetayi) {
    const mk = m.malikKisiselKatkiDetayi;
    parca.push({
      text: `Malik eşin kişisel katkısı (TMK m.230/3): ${mk.aciklama} - ${tl(mk.katkiTutari)} TL / ${tl(m.edinmeDegeri)} TL = ${yuzde(mk.oran)} × ${tl(m.tasfiyeDegeri)} TL = ${tl(mk.tasfiyeKarsiligi)} TL`,
      fontSize: 8.5,
      margin: [0, 0, 0, 6],
    });
  }

  if (m.digerEsKatkilari.length > 0) {
    parca.push(
      { text: `${tarafAdi(m.digerEs)} değer artış payı alacağı hesabı (TMK m.227)`, style: 'etiket' },
      tablo(
        [
          'Katkı açıklaması',
          'Katkı tutarı (TL)',
          'Esas mal değeri (TL)',
          'Katkı oranı',
          'Sürüm karşılığı (TL)',
          'Uygulanan kural',
          'Alacak (TL)',
        ],
        m.digerEsKatkilari.map((k) => [
          k.aciklama,
          tl(k.katkiTutari),
          tl(k.esasMalDegeri),
          `%${sayi(k.katkiOrani.times(100), 6)}`,
          tl(k.surumKarsiligi),
          k.degerKaybiUygulandi
            ? 'Değer kaybı tabanı (TMK m.227/1 c.son)'
            : k.degerKaybiVar
              ? 'Yazılı anlaşma sürüm oranı (TMK m.227/3)'
              : 'Katkı oranı × tasfiye değeri (TMK m.227/1)',
          tl(k.alacak),
        ]),
        {
          genislik: ['*', 62, 65, 55, 65, 95, 62],
          sag: [1, 2, 3, 4, 6],
          toplam: ['Toplam değer artış payı', '', '', '', '', '', tl(m.toplamDigerEsDap)],
        },
      ),
    );
  }

  return parca;
}

export function aileKanitDosyaAdi(s: AileHesapSonucu, uretimTarihi: string): string {
  const dsy = s.girdi.dosya;
  const mahkeme = dsy.kisaAd ?? kisaltma(dsy.mahkeme);
  return `${uretimTarihi}_${mahkeme}-${kisaltma(dsy.esasNo)}_${dsy.altAlan}.pdf`;
}

export function aileDefterSatiri(s: AileHesapSonucu, uretimTarihi: string, surum: string): string {
  const dsy = s.girdi.dosya;
  const kalemAdlari: string[] = [];
  if (s.takas.davaciDegerArtisPayi.gt(0) || s.takas.davaliDegerArtisPayi.gt(0)) {
    kalemAdlari.push('değer artış payı alacağı');
  }
  if (s.katilma.davaci.netKatilmaAlacagi.gt(0) || s.katilma.davali.netKatilmaAlacagi.gt(0) || s.mallar.some((m) => m.nitelik === 'edinilmis')) {
    kalemAdlari.push('katılma alacağı');
  }
  const bakiyeMetni =
    s.takas.netAlacakli === 'denk'
      ? 'net bakiye 0,00 TL'
      : `${tarafAdi(s.takas.netAlacakli).toLocaleLowerCase('tr-TR')} lehine net bakiye ${tl(s.takas.netBakiye)} TL`;
  const faizParcalari: string[] = [];
  if (s.toplamFaiz.davaci.gt(0) && s.toplamFaiz.davali.gt(0)) {
    faizParcalari.push(`davacı faizi ${tl(s.toplamFaiz.davaci)} TL`, `davalı faizi ${tl(s.toplamFaiz.davali)} TL`);
  } else if (s.toplamFaiz.davaci.gt(0)) {
    faizParcalari.push(s.takas.netAlacakli === 'davaci' ? `faiz ${tl(s.toplamFaiz.davaci)} TL` : `davacı faizi ${tl(s.toplamFaiz.davaci)} TL`);
  } else if (s.toplamFaiz.davali.gt(0)) {
    faizParcalari.push(s.takas.netAlacakli === 'davali' ? `faiz ${tl(s.toplamFaiz.davali)} TL` : `davalı faizi ${tl(s.toplamFaiz.davali)} TL`);
  }
  const ozet =
    `${kalemAdlari.join(', ')}; ${bakiyeMetni}` +
    (faizParcalari.length ? `, ${faizParcalari.join(', ')}` : '') +
    `; ${surum}`;
  const hucreler = [
    trTarih(uretimTarihi),
    dsy.kaynak,
    `${dsy.mahkeme} ${dsy.esasNo}`,
    dsy.altAlan,
    ozet,
    aileKanitDosyaAdi(s, uretimTarihi),
    '',
  ];
  return `| ${hucreler.map((h) => h.replace(/\|/g, '/')).join(' | ')} |`;
}

export function aileRaporTanimi(s: AileHesapSonucu, bilgi: RaporBilgisi): Record<string, unknown> {
  const g = s.girdi;
  const dsy = g.dosya;

  const ust: [string, string][] = [
    ['Dosya', `${dsy.mahkeme} ${dsy.esasNo}`],
    ['Bilirkişilik alt alanı', dsy.altAlan],
    ['Hesap tarihi', trTarih(g.hesapTarihi)],
    ['Tasfiye (değerlendirme) tarihi', trTarih(s.tasfiyeTarihi)],
    ['Faiz bitiş tarihi', trTarih(s.faizBitis)],
    ['Rapor üretim zamanı', bilgi.uretimZamani],
  ];
  if (dsy.hazirlayan) ust.push(['Hazırlayan', dsy.hazirlayan]);

  const ozetSatirlari: string[][] = [
    [
      'Değer artış payı alacağı (TMK m.227)',
      tl(s.takas.davaciDegerArtisPayi),
      tl(s.takas.davaliDegerArtisPayi),
      'Diğer eşin malına yapılan katkının tasfiye değerindeki karşılığı',
    ],
    [
      'Artık değere katılma alacağı (TMK m.236/1, takas öncesi)',
      tl(s.takas.davaciKatilma),
      tl(s.takas.davaliKatilma),
      s.girdi.parametreler.hakkaniyetIndirimi
        ? `Karşı eşin artık değerindeki pay (TMK m.236/2 indirim sonrası)`
        : 'Karşı eşin artık değerinin yasal/sözleşmesel pay oranı',
    ],
    [
      'Karşılıklı katılma alacaklarının takası (TMK m.236/1 c.2)',
      s.takas.katilmaTakasTutari.gt(0) ? `-${tl(s.takas.katilmaTakasTutari)}` : '0,00',
      s.takas.katilmaTakasTutari.gt(0) ? `-${tl(s.takas.katilmaTakasTutari)}` : '0,00',
      'TMK m.236/1 c.2 uyarınca katılma alacaklarının takası',
    ],
    [
      'Takas sonrası net katılma alacağı',
      tl(s.takas.davaciNetKatilma),
      tl(s.takas.davaliNetKatilma),
      'Katılma alacaklarının takası sonrası kalan tutar',
    ],
    [
      'Toplam tasfiye alacağı (DAP + net katılma)',
      tl(s.takas.davaciToplamAlacak),
      tl(s.takas.davaliToplamAlacak),
      'Değer artış payı ve takas sonrası katılma alacağı toplamı',
    ],
    ...(s.takas.genelTakasTutari.gt(0)
      ? [
          [
            'Genel takas / mahsup (TBK m.139, m.143/1)',
            `-${tl(s.takas.genelTakasTutari)}`,
            `-${tl(s.takas.genelTakasTutari)}`,
            'Karşılıklı toplam tasfiye alacaklarının takası',
          ],
        ]
      : []),
    [
      'İşlemiş yasal faiz (TMK m.239/3)',
      tl(s.toplamFaiz.davaci),
      tl(s.toplamFaiz.davali),
      `${trTarih(s.faizBitis)} tarihine kadar hesaplanan yasal faiz`,
    ],
  ];

  const netBakiyeMetni =
    s.takas.netAlacakli === 'denk'
      ? 'Karşılıklı alacaklar birbirini karşıladığından net bakiye 0,00 TL\'dir.'
      : `Genel mahsup/takas sonucunda ${tarafAdi(s.takas.netAlacakli)} lehine (${tarafAdi(karsiTaraf(s.takas.netAlacakli))} aleyhine) net bakiye asıl alacak ${tl(s.takas.netBakiye)} TL'dir.`;

  const girdiler: [string, string][] = [
    ['Taraflar', 'Davacı ve Davalı (kişisel veri kuralı gereği raporda kişi adı kullanılmaz)'],
    ['Evlenme tarihi', trTarih(g.evlilik.evlenmeTarihi)],
    ['Mal rejiminin sona erme tarihi', `${trTarih(g.evlilik.malRejimiSonaErmeTarihi)} (${g.evlilik.sonaErmeNedeni}; TMK m.225)`],
    ['Tasfiye / değerlendirme tarihi', `${trTarih(s.tasfiyeTarihi)} (TMK m.232, m.235/1)`],
  ];
  if (g.evlilik.davaTarihi) {
    girdiler.push(['Tasfiye davası tarihi', trTarih(g.evlilik.davaTarihi)]);
  }

  const malOzetSatirlari = s.mallar.map((m) => [
    m.ad,
    tarafAdi(m.malik),
    m.nitelik === 'edinilmis' ? 'Edinilmiş' : 'Kişisel',
    tl(m.edinmeDegeri),
    tl(m.tasfiyeDegeri),
    tl(m.toplamMalaIliskinBorcVeKisiselKayma),
    tl(m.toplamDigerEsDap),
    tl(m.edinilmisNetDeger),
  ]);

  const ekBolumler: Icerik[] = [];
  if (s.eklenecekDegerler.length > 0) {
    ekBolumler.push(
      { text: 'Eklenecek değerler (TMK m.229, m.235/2)', style: 'etiket' },
      tablo(
        ['Eş', 'Hukuki dayanak', 'Açıklama', 'Devir tarihi', 'Eklenecek tutar (TL)'],
        s.eklenecekDegerler.map((e) => [
          tarafAdi(e.es),
          e.tur === 'son-bir-yil-bagis'
            ? 'TMK m.229/1-1 (son 1 yılda rızasız karşılıksız kazandırma)'
            : 'TMK m.229/1-2 (katılma alacağını azaltma kastıyla devir)',
          e.aciklama,
          e.devirTarihi ? trTarih(e.devirTarihi) : '-',
          tl(e.tutar),
        ]),
        { genislik: [55, 130, '*', 62, 75], sag: [4] },
      ),
    );
  }

  if (s.denklestirmeler.length > 0) {
    ekBolumler.push(
      { text: 'Kişisel mallar ile edinilmiş mallar arasında denkleştirme (TMK m.230)', style: 'etiket' },
      tablo(
        ['Eş', 'Kayma yönü', 'Açıklama', 'Hesap yöntemi', 'Denkleştirme tutarı (TL)'],
        s.denklestirmeler.map((dk) => [
          tarafAdi(dk.es),
          dk.yon === 'edinilmisten-kisisele'
            ? 'Edinilmişten kişisele (+ aktif)'
            : 'Kişiselden edinilmişe (- pasif)',
          dk.aciklama,
          dk.yontem === 'sabit'
            ? 'Doğrudan borç ödemesi (TMK m.230/1)'
            : `${tl(dk.katkiTutari!)} / ${tl(dk.edinmeDegeri!)} (%${sayi(dk.katkiOrani!.times(100), 4)}) × ${tl(dk.tasfiyeDegeri!)} (TMK m.230/3)`,
          tl(dk.tutar),
        ]),
        { genislik: [55, 105, '*', 130, 75], sag: [4] },
      ),
    );
  }

  const adDavaci = s.artikDeger.davaci;
  const adDavali = s.artikDeger.davali;
  const artikDegerSatirlari: string[][] = [
    [
      '(+) Edinilmiş malların tasfiye (sürüm) değeri',
      tl(adDavaci.edinilmisMallarDegeri),
      tl(adDavali.edinilmisMallarDegeri),
      'TMK m.219, m.232, m.235/1',
    ],
    [
      '(+) Eklenecek değerler',
      tl(adDavaci.eklenecekDegerler),
      tl(adDavali.eklenecekDegerler),
      'TMK m.229, m.235/2',
    ],
    [
      '(+) Denkleştirme alacağı (edinilmişten kişisele)',
      tl(adDavaci.denklestirmeAlacagi),
      tl(adDavali.denklestirmeAlacagi),
      'TMK m.230/1, m.230/3',
    ],
    ['(=) Edinilmiş mal aktif toplamı', tl(adDavaci.aktifToplam), tl(adDavali.aktifToplam), 'TMK m.231/1'],
    [
      '(-) Edinilmiş mallara ilişkin borçlar ve kişisel denkleştirme',
      tl(adDavaci.edinilmisMalBorclari),
      tl(adDavali.edinilmisMalBorclari),
      'TMK m.230, m.231/1',
    ],
    [
      '(-) Diğer eşin değer artış payı alacağı',
      tl(adDavaci.digerEsDegerArtisPayi),
      tl(adDavali.digerEsDegerArtisPayi),
      'TMK m.227, m.231/1',
    ],
    ['(=) Ham artık değer bakiyesi', tl(adDavaci.hamArtikDeger), tl(adDavali.hamArtikDeger), 'Aktif - Pasif'],
  ];

  const katilmaSatirlari: string[][] = [
    [
      'Karşı eşin artık değeri',
      tl(s.katilma.davaci.karsiArtikDeger),
      tl(s.katilma.davali.karsiArtikDeger),
      'TMK m.231',
    ],
    [
      'Yasal / sözleşmesel katılma payı oranı',
      yuzde(s.katilma.davaci.bazPayOrani),
      yuzde(s.katilma.davali.bazPayOrani),
      g.parametreler.katilmaOrani ? 'TMK m.237, m.238' : 'TMK m.236/1 c.1',
    ],
    [
      'Ham katılma alacağı',
      tl(s.katilma.davaci.hamKatilmaAlacagi),
      tl(s.katilma.davali.hamKatilmaAlacagi),
      'Karşı artık değer × pay oranı',
    ],
  ];
  if (s.katilma.davaci.hakkaniyetIndirimi || s.katilma.davali.hakkaniyetIndirimi) {
    katilmaSatirlari.push([
      'Zina / hayata kast hakkaniyet indirimi (TMK m.236/2)',
      s.katilma.davaci.hakkaniyetIndirimi
        ? `-${tl(s.katilma.davaci.hakkaniyetIndirimi.indirimTutari)} (uygulanan pay ${yuzde(s.katilma.davaci.hakkaniyetIndirimi.uygulananPayOrani)})`
        : '0,00',
      s.katilma.davali.hakkaniyetIndirimi
        ? `-${tl(s.katilma.davali.hakkaniyetIndirimi.indirimTutari)} (uygulanan pay ${yuzde(s.katilma.davali.hakkaniyetIndirimi.uygulananPayOrani)})`
        : '0,00',
      'TMK m.236/2',
    ]);
  }
  katilmaSatirlari.push(
    [
      'Takas öncesi net katılma alacağı',
      tl(s.katilma.davaci.netKatilmaAlacagi),
      tl(s.katilma.davali.netKatilmaAlacagi),
      'TMK m.236',
    ],
    [
      'Karşılıklı katılma alacaklarının takası',
      s.takas.katilmaTakasTutari.gt(0) ? `-${tl(s.takas.katilmaTakasTutari)}` : '0,00',
      s.takas.katilmaTakasTutari.gt(0) ? `-${tl(s.takas.katilmaTakasTutari)}` : '0,00',
      'TMK m.236/1 c.2',
    ],
  );

  const faizBolumu: Icerik[] = [];
  if (s.alacakKalemleri.length === 0) {
    faizBolumu.push({ text: 'Faize konu alacak doğmamıştır.', fontSize: 8.5, margin: [0, 0, 0, 6] });
  } else {
    for (const ak of s.alacakKalemleri) {
      if (!ak.faiz) {
        faizBolumu.push({
          text: `${ak.ad} (${tl(ak.tutar)} TL): faiz hesaplanmadı.`,
          fontSize: 8.5,
          margin: [0, 0, 0, 6],
        });
        continue;
      }
      const f = ak.faiz;
      faizBolumu.push({
        text: `${ak.ad}: ${tl(f.matrah)} TL üzerine ${trTarih(f.baslangic)} - ${trTarih(f.bitis)} yasal faiz (${f.gerekce})`,
        style: 'etiket',
      });
      if (f.kesitler.length === 0) {
        faizBolumu.push({
          text: 'Faiz başlangıcı bitiş tarihine eşit veya sonrasında olduğundan işlemiş faiz 0,00 TL\'dir (TMK m.239/3 uyarınca tasfiye/karar tarihinden itibaren işler).',
          fontSize: 8.5,
          margin: [0, 0, 0, 6],
        });
      } else {
        const toplamGun = String(topla(f.kesitler.map((x) => new Decimal(x.gun))));
        faizBolumu.push(
          tablo(
            ['Dönem', 'Gün', 'Yıllık oran', 'Faiz (TL)'],
            f.kesitler.map((x) => [`${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`, String(x.gun), yuzde(x.oran), tl(x.tutar)]),
            { sag: [1, 2, 3], toplam: ['Toplam', toplamGun, '', tl(f.toplam)] },
          ),
        );
      }
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
    { text: 'MAL REJİMİ TASFİYESİ (DEĞER ARTIŞ PAYI VE KATILMA ALACAĞI) HESAP RAPORU', style: 'baslik' },
    ikiSutun(ust),
    baslik('1. Tasfiye özeti ve net bakiye'),
    tablo(['Kalem', 'Davacı (TL)', 'Davalı (TL)', 'Açıklama'], ozetSatirlari, {
      genislik: ['*', 75, 75, 165],
      sag: [1, 2],
      toplam: [
        'Genel takas sonrası net bakiye',
        s.takas.netAlacakli === 'davaci' ? tl(s.takas.netBakiye) : '0,00',
        s.takas.netAlacakli === 'davali' ? tl(s.takas.netBakiye) : '0,00',
        netBakiyeMetni,
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
      { genislik: [115, 135, 50, '*'] },
    ),
    baslik('4. Mal mal oranlama ve değer artış payı hesabı'),
    ...(s.mallar.length > 0
      ? [
          tablo(
            [
              'Mal',
              'Malik',
              'Kesim',
              'Edinme (TL)',
              'Tasfiye (TL)',
              'Borç / kişisel pay (TL)',
              'Diğer eş DAP (TL)',
              'Artık değere giren (TL)',
            ],
            malOzetSatirlari,
            { genislik: ['*', 40, 44, 58, 58, 65, 60, 62], sag: [3, 4, 5, 6, 7] },
          ),
          ...s.mallar.flatMap((m, i) => malDetayBolumu(m, i + 1)),
        ]
      : [{ text: 'Girdide mal satırı bulunmamaktadır.', fontSize: 8.5, margin: [0, 0, 0, 6] }]),
    ...ekBolumler,
    baslik('5. Artık değer ve katılma alacağı tablosu (TMK m.231, m.236)'),
    tablo(['Artık değer hesabı (TMK m.231)', 'Davacı (TL)', 'Davalı (TL)', 'Dayanak'], artikDegerSatirlari, {
      genislik: ['*', 78, 78, 115],
      sag: [1, 2],
      toplam: ['Artık değer (TMK m.231/2 eksi bakiye = 0)', tl(adDavaci.artikDeger), tl(adDavali.artikDeger), 'TMK m.231/1-2'],
    }),
    tablo(['Katılma alacağı ve takas hesabı (TMK m.236)', 'Davacı alacağı (TL)', 'Davalı alacağı (TL)', 'Dayanak'], katilmaSatirlari, {
      genislik: ['*', 82, 82, 115],
      sag: [1, 2],
      toplam: ['Takas sonrası net katılma alacağı', tl(s.takas.davaciNetKatilma), tl(s.takas.davaliNetKatilma), 'TMK m.236/1 c.2'],
    }),
    baslik('6. Yasal faiz hesabı (TMK m.239/3)'),
    ...faizBolumu,
    baslik('7. Kullanılan tablo satırları ve resmi kaynakları'),
    ...(kaynakBolumu.length > 0
      ? kaynakBolumu
      : [{ text: 'Bu hesapta dönemli faiz tablosu satırı kullanılmamıştır.', fontSize: 8.5, margin: [0, 0, 0, 6] }]),
    ...(s.tabloOzetleri.length > 0
      ? [
          tablo(
            ['Tablo dosyası', 'Doğrulama tarihi', 'SHA-256'],
            s.tabloOzetleri.map((t) => [t.ad, t.dogrulamaTarihi === '-' ? '-' : trTarih(t.dogrulamaTarihi), t.ozet]),
            { genislik: [120, 70, '*'] },
          ),
        ]
      : []),
    baslik('8. Sınırlar ve uyarılar'),
    madde([
      ...s.uyarilar,
      ...s.notlar,
      'Hesap, girdi dosyasındaki olgu kabullerine (malların edinme ve tasfiye sürüm değerleri, kişisel ve edinilmiş mal katkıları, kredi ödeme kırılımları) dayanır. Bu olguların ispatı ve hukuki nitelendirmesi mahkemeye aittir (HMK m.33, TMK m.222).',
      'TMK m.236/2 uyarınca zina veya hayata kast nedeniyle boşanma halinde kusurlu eşin artık değerdeki pay oranının azaltılması veya kaldırılması yalnız katılma alacağına uygulanır; değer artış payı alacağına (TMK m.227) uygulanmaz.',
      'Kişisel veri kuralı gereği raporda eşlerin kimlik bilgilerine yer verilmemiş, taraflar yalnız Davacı ve Davalı olarak adlandırılmıştır.',
    ]),
    baslik('9. Hesap kimliği'),
    ikiSutun([
      ['Araç', bilgi.surum],
      ['Girdi dosyası SHA-256', bilgi.girdiOzeti],
    ]),
  ];

  return {
    pageSize: 'A4',
    pageMargins: [42, 40, 42, 46],
    info: {
      title: `Mal rejimi tasfiyesi hesap raporu, ${dsy.mahkeme} ${dsy.esasNo}`,
      author: dsy.hazirlayan ?? 'mizan',
      creator: bilgi.surum,
      subject: `Bilirkişilik alt alanı ${dsy.altAlan}`,
    },
    defaultStyle: { font: 'Roboto', fontSize: 9, lineHeight: 1.15 },
    styles: {
      baslik: { fontSize: 13, bold: true, margin: [0, 0, 0, 8] },
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
