// Aile hukuku mal rejimi tasfiyesi UYAP Doküman Formatı (.udf, format_id="1.8") rapor üreticisi.
// src/aile/rapor.ts ile bölüm bölüm eşdeğerdir; sıfır dış paket ve sıfır Node modülü kullanır.
import { Decimal, sayi, tl, topla, yuzde } from '../para.ts';
import type { RaporBilgisi } from '../rapor/pdf.ts';
import {
  UDF_DOGRULAMA_UYARISI,
  UdfKurucu,
  faizKesitTablosuEkle,
  hesapKimligiEkle,
  kaynakTablolariEkle,
  tabloOzetleriEkle,
  udfPaketle,
} from '../rapor/udf.ts';
import { trTarih } from '../tarih.ts';
import { karsiTaraf, tarafAdi, type AileHesapSonucu, type MalHesapSonucu } from './hesap.ts';
import { aileKanitDosyaAdi } from './rapor.ts';

/** YYYY-AA-GG_mahkeme-esas_altalan.udf */
export function aileUdfDosyaAdi(sonuc: AileHesapSonucu, uretimTarihi: string): string {
  return aileKanitDosyaAdi(sonuc, uretimTarihi).replace(/\.pdf$/, '.udf');
}

function malDetayBolumuEkle(kurucu: UdfKurucu, m: MalHesapSonucu, sira: number): void {
  kurucu.baslik(
    `4.${sira} ${m.ad} (${tarafAdi(m.malik)} - ${m.nitelik === 'edinilmis' ? 'Edinilmiş mal' : 'Kişisel mal'})`,
    2,
  );

  const bilgiler: [string, string][] = [
    ['Malik taraf', tarafAdi(m.malik)],
    ['Malvarlığı kesimi', m.nitelik === 'edinilmis' ? 'Edinilmiş mal (TMK m.219, m.222/3)' : 'Kişisel mal (TMK m.220)'],
    ['Edinme değeri', `${tl(m.edinmeDegeri)} TL${m.edinmeTarihi ? ` (${trTarih(m.edinmeTarihi)})` : ''}`],
    ['Tasfiye (sürüm) değeri', `${tl(m.tasfiyeDegeri)} TL (TMK m.232, m.235/1)`],
  ];
  if (m.dogrudanBorc.gt(0)) {
    bilgiler.push(['Mala ilişkin doğrudan borç', `${tl(m.dogrudanBorc)} TL (TMK m.231/1)`]);
  }
  kurucu.ikiSutun(bilgiler, 160);

  if (m.krediDetayi) {
    const kr = m.krediDetayi;
    kurucu.etiket(
      'Konut / taşıt kredisi ve peşinat oranlaması (TMK m.219, m.227, m.230, m.231; Yargıtay 8. HD 2016/18180 E., 2018/18803 K.)',
    );
    kurucu.tablo(
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
      { genislikler: [140, 95, 58, 72, 115], sag: [1, 2, 3] },
    );
  }

  if (m.malikKisiselKatkiDetayi) {
    const mk = m.malikKisiselKatkiDetayi;
    kurucu.paragraf(
      `Malik eşin kişisel katkısı (TMK m.230/3): ${mk.aciklama} - ${tl(mk.katkiTutari)} TL / ${tl(m.edinmeDegeri)} TL = ${yuzde(mk.oran)} × ${tl(m.tasfiyeDegeri)} TL = ${tl(mk.tasfiyeKarsiligi)} TL`,
    );
  }

  if (m.digerEsKatkilari.length > 0) {
    kurucu.etiket(`${tarafAdi(m.digerEs)} değer artış payı alacağı hesabı (TMK m.227)`);
    kurucu.tablo(
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
        genislikler: [76, 62, 65, 55, 65, 95, 62],
        sag: [1, 2, 3, 4, 6],
        toplam: ['Toplam değer artış payı', '', '', '', '', '', tl(m.toplamDigerEsDap)],
      },
    );
  }
}

export function aileUdfXmlOlustur(s: AileHesapSonucu, bilgi: RaporBilgisi): string {
  const g = s.girdi;
  const dsy = g.dosya;
  const kurucu = new UdfKurucu();

  kurucu.paragraf('MAL REJİMİ TASFİYESİ (DEĞER ARTIŞ PAYI VE KATILMA ALACAĞI) HESAP RAPORU', {
    hiza: '1',
    kalin: true,
    boyut: 13,
    altBosluk: 6,
  });

  const ust: [string, string][] = [
    ['Dosya', `${dsy.mahkeme} ${dsy.esasNo}`],
    ['Bilirkişilik alt alanı', dsy.altAlan],
    ['Hesap tarihi', trTarih(g.hesapTarihi)],
    ['Tasfiye (değerlendirme) tarihi', trTarih(s.tasfiyeTarihi)],
    ['Faiz bitiş tarihi', trTarih(s.faizBitis)],
    ['Rapor üretim zamanı', bilgi.uretimZamani],
  ];
  if (dsy.hazirlayan) ust.push(['Hazırlayan', dsy.hazirlayan]);
  kurucu.ikiSutun(ust, 160);

  // 1. Tasfiye özeti ve net bakiye
  kurucu.baslik('1. Tasfiye özeti ve net bakiye', 1);
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
        ? 'Karşı eşin artık değerindeki pay (TMK m.236/2 indirim sonrası)'
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
      ? "Karşılıklı alacaklar birbirini karşıladığından net bakiye 0,00 TL'dir."
      : `Genel mahsup/takas sonucunda ${tarafAdi(s.takas.netAlacakli)} lehine (${tarafAdi(karsiTaraf(s.takas.netAlacakli))} aleyhine) net bakiye asıl alacak ${tl(s.takas.netBakiye)} TL'dir.`;

  kurucu.tablo(['Kalem', 'Davacı (TL)', 'Davalı (TL)', 'Açıklama'], ozetSatirlari, {
    genislikler: [165, 75, 75, 165],
    sag: [1, 2],
    toplam: [
      'Genel takas sonrası net bakiye',
      s.takas.netAlacakli === 'davaci' ? tl(s.takas.netBakiye) : '0,00',
      s.takas.netAlacakli === 'davali' ? tl(s.takas.netBakiye) : '0,00',
      netBakiyeMetni,
    ],
  });

  // 2. Girdiler
  kurucu.baslik('2. Girdiler', 1);
  const girdiler: [string, string][] = [
    ['Taraflar', 'Davacı ve Davalı (kişisel veri kuralı gereği raporda kişi adı kullanılmaz)'],
    ['Evlenme tarihi', trTarih(g.evlilik.evlenmeTarihi)],
    ['Mal rejiminin sona erme tarihi', `${trTarih(g.evlilik.malRejimiSonaErmeTarihi)} (${g.evlilik.sonaErmeNedeni}; TMK m.225)`],
    ['Tasfiye / değerlendirme tarihi', `${trTarih(s.tasfiyeTarihi)} (TMK m.232, m.235/1)`],
  ];
  if (g.evlilik.davaTarihi) {
    girdiler.push(['Tasfiye davası tarihi', trTarih(g.evlilik.davaTarihi)]);
  }
  kurucu.ikiSutun(girdiler, 160);

  // 3. Hukuki tercihler ve hesap esasları
  kurucu.baslik('3. Hukuki tercihler ve hesap esasları', 1);
  kurucu.paragraf(
    'Aşağıdaki değerler hesabın sonucunu değiştiren tercihlerdir. "Girdi" olanlar hesap dosyasında açıkça yazılmıştır; "varsayılan" olanlar yanındaki dayanakla araç tarafından alınmıştır.',
  );
  kurucu.tablo(
    ['Esas', 'Değer', 'Kaynak', 'Dayanak'],
    s.parametreler.map((p) => [p.ad, p.deger, p.kaynak, p.dayanak]),
    { genislikler: [115, 135, 50, 180] },
  );

  // 4. Mal mal oranlama ve değer artış payı hesabı
  kurucu.baslik('4. Mal mal oranlama ve değer artış payı hesabı', 1);
  if (s.mallar.length > 0) {
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
    kurucu.tablo(
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
      { genislikler: [93, 40, 44, 58, 58, 65, 60, 62], sag: [3, 4, 5, 6, 7] },
    );
    s.mallar.forEach((m, i) => malDetayBolumuEkle(kurucu, m, i + 1));
  } else {
    kurucu.paragraf('Girdide mal satırı bulunmamaktadır.');
  }

  if (s.eklenecekDegerler.length > 0) {
    kurucu.etiket('Eklenecek değerler (TMK m.229, m.235/2)');
    kurucu.tablo(
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
      { genislikler: [55, 130, 158, 62, 75], sag: [4] },
    );
  }

  if (s.denklestirmeler.length > 0) {
    kurucu.etiket('Kişisel mallar ile edinilmiş mallar arasında denkleştirme (TMK m.230)');
    kurucu.tablo(
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
      { genislikler: [55, 105, 115, 130, 75], sag: [4] },
    );
  }

  // 5. Artık değer ve katılma alacağı tablosu
  kurucu.baslik('5. Artık değer ve katılma alacağı tablosu (TMK m.231, m.236)', 1);
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
  kurucu.tablo(['Artık değer hesabı (TMK m.231)', 'Davacı (TL)', 'Davalı (TL)', 'Dayanak'], artikDegerSatirlari, {
    genislikler: [209, 78, 78, 115],
    sag: [1, 2],
    toplam: ['Artık değer (TMK m.231/2 eksi bakiye = 0)', tl(adDavaci.artikDeger), tl(adDavali.artikDeger), 'TMK m.231/1-2'],
  });

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
  kurucu.tablo(['Katılma alacağı ve takas hesabı (TMK m.236)', 'Davacı alacağı (TL)', 'Davalı alacağı (TL)', 'Dayanak'], katilmaSatirlari, {
    genislikler: [201, 82, 82, 115],
    sag: [1, 2],
    toplam: ['Takas sonrası net katılma alacağı', tl(s.takas.davaciNetKatilma), tl(s.takas.davaliNetKatilma), 'TMK m.236/1 c.2'],
  });

  // 6. Yasal faiz hesabı (TMK m.239/3)
  kurucu.baslik('6. Yasal faiz hesabı (TMK m.239/3)', 1);
  if (s.alacakKalemleri.length === 0) {
    kurucu.paragraf('Faize konu alacak doğmamıştır.');
  } else {
    for (const ak of s.alacakKalemleri) {
      if (!ak.faiz) {
        kurucu.paragraf(`${ak.ad} (${tl(ak.tutar)} TL): faiz hesaplanmadı.`);
        continue;
      }
      const f = ak.faiz;
      kurucu.etiket(`${ak.ad}: ${tl(f.matrah)} TL üzerine ${trTarih(f.baslangic)} - ${trTarih(f.bitis)} yasal faiz (${f.gerekce})`);
      if (f.kesitler.length === 0) {
        kurucu.paragraf(
          "Faiz başlangıcı bitiş tarihine eşit veya sonrasında olduğundan işlemiş faiz 0,00 TL'dir (TMK m.239/3 uyarınca tasfiye/karar tarihinden itibaren işler).",
        );
      } else {
        faizKesitTablosuEkle(kurucu, f.kesitler, f.toplam, {
          toplamEtiketi: 'Toplam',
          oranBos: '',
          genislikler: [180, 60, 100, 140],
        });
      }
    }
  }

  // 7. Kullanılan tablo satırları ve resmi kaynakları
  kurucu.baslik('7. Kullanılan tablo satırları ve resmi kaynakları', 1);
  if (s.kaynaklar.length > 0) {
    kaynakTablolariEkle(kurucu, s.kaynaklar, 120);
  } else {
    kurucu.paragraf('Bu hesapta dönemli faiz tablosu satırı kullanılmamıştır.');
  }
  if (s.tabloOzetleri.length > 0) {
    tabloOzetleriEkle(kurucu, s.tabloOzetleri, [120, 70, 290]);
  }

  // 8. Sınırlar ve uyarılar
  kurucu.baslik('8. Sınırlar ve uyarılar', 1);
  kurucu.maddeler([
    ...s.uyarilar,
    ...s.notlar,
    'Hesap, girdi dosyasındaki olgu kabullerine (malların edinme ve tasfiye sürüm değerleri, kişisel ve edinilmiş mal katkıları, kredi ödeme kırılımları) dayanır. Bu olguların ispatı ve hukuki nitelendirmesi mahkemeye aittir (HMK m.33, TMK m.222).',
    'TMK m.236/2 uyarınca zina veya hayata kast nedeniyle boşanma halinde kusurlu eşin artık değerdeki pay oranının azaltılması veya kaldırılması yalnız katılma alacağına uygulanır; değer artış payı alacağına (TMK m.227) uygulanmaz.',
    'Kişisel veri kuralı gereği raporda eşlerin kimlik bilgilerine yer verilmemiş, taraflar yalnız Davacı ve Davalı olarak adlandırılmıştır.',
    UDF_DOGRULAMA_UYARISI,
  ]);

  // 9. Hesap kimliği
  kurucu.baslik('9. Hesap kimliği', 1);
  hesapKimligiEkle(kurucu, bilgi, 160);

  return kurucu.xmlUret();
}

export function aileUdfOlustur(sonuc: AileHesapSonucu, bilgi: RaporBilgisi): Uint8Array {
  return udfPaketle(aileUdfXmlOlustur(sonuc, bilgi));
}
