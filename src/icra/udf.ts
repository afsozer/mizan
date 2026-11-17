// İcra kapak hesabı UYAP Doküman Formatı (.udf, format_id="1.8") rapor üreticisi.
// src/icra/rapor.ts ile bölüm bölüm eşdeğerdir; sıfır dış paket ve sıfır Node modülü kullanır.
import { tl, yuzde } from '../para.ts';
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
import {
  ICRA_FAIZ_TURU_ADLARI,
  ICRA_TAKIP_TURU_ADLARI,
  TAHSIL_ASAMA_ADLARI,
  type IcraHesapSonucu,
} from './hesap.ts';
import { icraKanitDosyaAdi } from './rapor.ts';

/** YYYY-AA-GG_icradairesi-esas_altalan.udf */
export function icraUdfDosyaAdi(sonuc: IcraHesapSonucu, uretimTarihi: string): string {
  return icraKanitDosyaAdi(sonuc, uretimTarihi).replace(/\.pdf$/, '.udf');
}

export function icraUdfXmlOlustur(s: IcraHesapSonucu, bilgi: RaporBilgisi): string {
  const g = s.girdi;
  const dsy = g.dosya;
  const h = s.harclar;
  const gunEsasi = (g.parametreler?.faizGunEsasi ?? 365).toString();
  const kurucu = new UdfKurucu();

  kurucu.paragraf('İCRA KAPAK HESABI RAPORU', { hiza: '1', kalin: true, boyut: 14, altBosluk: 6 });

  const ust: [string, string][] = [
    ['Dosya / İcra Dairesi', `${dsy.mahkeme} ${dsy.esasNo}`],
    ['Bilirkişilik alt alanı', dsy.altAlan],
    ['Takip tarihi ve türü', `${trTarih(g.takip.takipTarihi)} · ${ICRA_TAKIP_TURU_ADLARI[s.takipTuru]}`],
    ['Kapak (hesap) tarihi', trTarih(g.hesapTarihi)],
    ['Rapor üretim zamanı', bilgi.uretimZamani],
  ];
  if (dsy.hazirlayan) ust.push(['Hazırlayan', dsy.hazirlayan]);
  kurucu.ikiSutun(ust, 150);

  // 1. Kapak Hesabı Özeti
  kurucu.baslik('1. Kapak Hesabı Özeti', 1);
  const ozetSatirlari: string[][] = [
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
      'Bakiye icra tahsil harcı',
      `492 s.K. B/I-3 (${yuzde(h.uygulananTahsilOrani)} tahsil harcından ${tl(h.mahsupEdilenPesinHarc)} TL peşin harç mahsubu)`,
      tl(h.bakiyeTahsilHarci),
    ],
    ['İcra vekalet ücreti', 'AAÜT / İİK m.138', tl(s.vekaletUcreti)],
    ['Takip masrafları toplamı', 'İİK m.59', tl(s.toplamMasraf)],
    ['Takip sonrası işlemiş faiz toplamı', ICRA_FAIZ_TURU_ADLARI[g.takip.faiz.tur], tl(s.toplamTakipSonrasiFaiz)],
    ['Kısmi ödemeler toplamı (mahsup)', '6098 s.K. TBK m.100', s.toplamKismiOdeme.isZero() ? '0,00' : '-' + tl(s.toplamKismiOdeme)],
    ['Borçlunun ödeyeceği kapak tutarı', 'Kalan anapara + faiz/gider + bakiye tahsil harcı', tl(s.borclununOdeyecegiKapakTutari)],
    [
      'Cezaevleri yapı harcı (alacaklıdan kesilen)',
      `2548 s.K. m.1 (${yuzde(h.cezaeviHarciOrani)}; borçluya yüklenmez)`,
      '-' + tl(h.cezaeviHarci),
    ],
    ['Alacaklıya net ödenecek tutar', 'Tahsil ve cezaevi harçları düşüldükten sonra net reddiyat', tl(s.alacakliyaNetOdenecekTutar)],
  ];
  kurucu.tablo(['Kalem', 'Dayanak / Açıklama', 'Tutar (TL)'], ozetSatirlari, {
    genislikler: [165, 225, 90],
    sag: [2],
    kalinSatirlar: [2, 10, 12],
  });

  // 2. Takip Çıkışı, Masraflar ve Esaslar
  kurucu.baslik('2. Takip Çıkışı, Masraflar ve Esaslar', 1);
  kurucu.ikiSutun(
    [
      ['Takip türü', ICRA_TAKIP_TURU_ADLARI[s.takipTuru]],
      ['Takip tarihi', trTarih(g.takip.takipTarihi)],
      ['Asıl alacak', `${tl(s.asilAlacak)} TL`],
      ["Takip öncesi fer'iler toplamı", `${tl(s.takipOncesiToplam)} TL`],
      ['Takip çıkışı toplamı', `${tl(s.takipCikisToplami)} TL`],
      [
        'Takip sonrası faiz türü',
        `${ICRA_FAIZ_TURU_ADLARI[g.takip.faiz.tur]}${g.takip.faiz.sozlesmeOrani ? ` (${yuzde(g.takip.faiz.sozlesmeOrani)})` : ''} · gün esası 1/${gunEsasi} (${g.takip.faiz.gerekce})`,
      ],
      ['Tahsil harcı aşaması', TAHSIL_ASAMA_ADLARI[h.tahsilHarciAsamasi]],
      ['Takipten feragat / vazgeçme', h.feragatVarMi ? 'Var (492 s.K. m.23)' : 'Yok'],
    ],
    150,
  );

  if (s.takipOncesiKalemler.length > 0) {
    kurucu.etiket('Takip Öncesi Kalemler');
    kurucu.tablo(
      ['Kalem', 'Açıklama', 'Tutar (TL)'],
      s.takipOncesiKalemler.map((k) => [k.ad, k.aciklama ?? '-', tl(k.tutar)]),
      { genislikler: [140, 250, 90], sag: [2], toplam: ['Takip öncesi toplam', '', tl(s.takipOncesiToplam)] },
    );
  }

  if (s.masraflar.length > 0) {
    kurucu.etiket('Takip Masrafları');
    kurucu.tablo(
      ['Tarih', 'Açıklama', 'Tutar (TL)'],
      s.masraflar.map((m) => [trTarih(m.tarih), m.aciklama, tl(m.tutar)]),
      { genislikler: [80, 310, 90], sag: [2], toplam: ['Toplam masraf', '', tl(s.toplamMasraf)] },
    );
  }

  // 3. Harç Hesabı
  kurucu.baslik('3. Harç Hesabı (492 s.K. ve 2548 s.K.)', 1);
  const harcSatirlari: string[][] = [
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
    ['Bakiye tahsil harcı (borçlu öder)', 'Tahsil harcı - mahsup edilen peşin harç', '-', tl(h.bakiyeTahsilHarci)],
    [
      'Cezaevleri yapı harcı (alacaklı öder)',
      '2548 s.K. m.1 (alacaklıya ödenecek paradan kesilir, borçluya yüklenmez)',
      yuzde(h.cezaeviHarciOrani),
      tl(h.cezaeviHarci),
    ],
  ];
  kurucu.tablo(['Harç kalemi', 'Hukuki dayanak ve açıklama', 'Oran', 'Tutar (TL)'], harcSatirlari, {
    genislikler: [130, 220, 50, 80],
    sag: [2, 3],
    kalinSatirlar: [5, 6],
  });

  // 4. Takip Sonrası Faiz Hesabı
  kurucu.baslik('4. Takip Sonrası Faiz Hesabı', 1);
  for (const fd of s.faizDonemleri) {
    kurucu.etiket(`${fd.aciklama}: ${ICRA_FAIZ_TURU_ADLARI[fd.tur]}, ${tl(fd.matrah)} TL anapara üzerine (${fd.gerekce})`);
    if (fd.kesitler.length === 0) {
      kurucu.paragraf('Bu dönemde faiz işlemedi (gün sayısı 0 ya da kalan asıl alacak 0,00 TL).');
    } else {
      faizKesitTablosuEkle(kurucu, fd.kesitler, fd.toplam, {
        toplamEtiketi: 'Dönem toplamı',
        oranBos: '',
        genislikler: [180, 60, 100, 140],
      });
    }
  }

  // 5. TBK m.100 Kısmi Ödemelerin Mahsubu
  if (s.kismiOdemeAdimlari.length > 0) {
    kurucu.baslik('5. TBK m.100 Kısmi Ödemelerin Mahsubu', 1);
    kurucu.paragraf(
      '6098 s.K. TBK m.100/1 uyarınca her kısmi ödeme tarihine kadar işlemiş faiz ve takip giderleri hesaplanmış; yapılan ödeme öncelikle faiz ve giderlerden, artan tutar ise asıl alacaktan düşülmüştür. TBK m.121/3 uyarınca işlemiş faize tekrar faiz yürütülmemiştir.',
    );
    kurucu.tablo(
      [
        '#',
        'Ödeme tarihi',
        'Ödeme (TL)',
        'Dönem faizi (TL)',
        'Mahsup öncesi faiz/gider (TL)',
        'Faiz/giderden düşülen (TL)',
        'Anaparadan düşülen (TL)',
        'Kalan faiz/gider (TL)',
        'Kalan anapara (TL)',
      ],
      s.kismiOdemeAdimlari.map((adim) => [
        String(adim.sira),
        trTarih(adim.tarih),
        tl(adim.odemeTutari),
        tl(adim.donemFaizi.toplam),
        tl(adim.mahsupOncesiFaizVeGider),
        tl(adim.faizVeGiderdenMahsup),
        tl(adim.asilAlacaktanMahsup),
        tl(adim.kalanFaizVeGider),
        tl(adim.kalanAsilAlacak),
      ]),
      {
        genislikler: [20, 56, 56, 54, 62, 58, 58, 56, 60],
        sag: [0, 2, 3, 4, 5, 6, 7, 8],
      },
    );
  }

  // 6. Hukuki Dayanaklar, Sınırlar ve Resmi Kaynaklar
  kurucu.baslik('6. Hukuki Dayanaklar, Sınırlar ve Resmi Kaynaklar', 1);
  kurucu.maddeler([
    ...s.dayanaklar,
    ...s.uyarilar,
    '2548 s.K. m.1 gereğince %2 cezaevleri yapı harcı borçluya yükletilmez; alacaklıya ödenecek paradan kesilir. Bu nedenle "Borçlunun ödeyeceği kapak tutarı" ile "Alacaklıya net ödenecek tutar" ayrı satırlarda gösterilmiştir.',
    UDF_DOGRULAMA_UYARISI,
  ]);
  kaynakTablolariEkle(kurucu, s.kaynaklar, 120);
  tabloOzetleriEkle(kurucu, s.tabloOzetleri, [140, 70, 270]);

  // 7. Hesap Kimliği
  kurucu.baslik('7. Hesap Kimliği', 1);
  hesapKimligiEkle(kurucu, bilgi, 150);

  return kurucu.xmlUret();
}

export function icraUdfOlustur(sonuc: IcraHesapSonucu, bilgi: RaporBilgisi): Uint8Array {
  return udfPaketle(icraUdfXmlOlustur(sonuc, bilgi));
}
