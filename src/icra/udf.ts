// İcra kapak hesabı UYAP Doküman Formatı (.udf, format_id="1.8") rapor üreticisi.
// src/icra/rapor.ts ile bölüm bölüm eşdeğerdir; sıfır dış paket ve sıfır Node modülü kullanır.
import { tl } from '../para.ts';
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
  KALEM_MAHSUP_SIRA_ADLARI,
  TAHSIL_ASAMA_ADLARI,
  icraFaizOzetiMetni,
  type IcraHesapSonucu,
} from './hesap.ts';
import {
  ICRA_ALACAK_KALEMI_BASLIKLARI,
  ICRA_KISMI_ODEME_ACIKLAMASI,
  ICRA_KISMI_ODEME_BASLIKLARI,
  icraAlacakKalemSatirlari,
  icraHarcSatirlari,
  icraKanitDosyaAdi,
  icraKismiOdemeSatirlari,
  icraOzetSatirlari,
} from './rapor.ts';

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
  kurucu.tablo(['Kalem', 'Dayanak / Açıklama', 'Tutar (TL)'], icraOzetSatirlari(s), {
    genislikler: [165, 225, 90],
    sag: [2],
    kalinSatirlar: [2, 11, 14],
  });

  // 2. Takip Çıkışı, Masraflar ve Esaslar
  kurucu.baslik('2. Takip Çıkışı, Masraflar ve Esaslar', 1);
  const kalemlerGoster =
    s.alacakKalemleri.length > 1 || s.alacakKalemleri[0]?.faizBaslangicTarihi !== g.takip.takipTarihi;
  kurucu.ikiSutun(
    [
      ['Takip türü', ICRA_TAKIP_TURU_ADLARI[s.takipTuru]],
      ['Takip tarihi', trTarih(g.takip.takipTarihi)],
      ['Asıl alacak', `${tl(s.asilAlacak)} TL`],
      ["Takip öncesi fer'iler toplamı", `${tl(s.takipOncesiToplam)} TL`],
      ['Takip çıkışı toplamı', `${tl(s.takipCikisToplami)} TL`],
      [
        'Takip sonrası faiz türü',
        `${icraFaizOzetiMetni(s)} · gün esası 1/${gunEsasi}${s.alacakKalemleri.length === 1 ? ` (${s.alacakKalemleri[0]!.faiz.gerekce})` : ''}`,
      ],
      ...(s.alacakKalemleri.length > 1 && s.kismiOdemeAdimlari.length > 0
        ? ([['Çoklu kalem mahsup sırası', KALEM_MAHSUP_SIRA_ADLARI[s.kalemMahsupSirasi]]] as [string, string][])
        : []),
      ['Tahsil harcı aşaması', TAHSIL_ASAMA_ADLARI[h.tahsilHarciAsamasi]],
      ['Takipten feragat / vazgeçme', h.feragatVarMi ? 'Var (492 s.K. m.23)' : 'Yok'],
    ],
    150,
  );

  if (kalemlerGoster) {
    kurucu.etiket('Alacak Kalemleri');
    kurucu.tablo(ICRA_ALACAK_KALEMI_BASLIKLARI, icraAlacakKalemSatirlari(s), {
      genislikler: [22, 138, 64, 116, 70, 70],
      sag: [0, 4, 5],
      toplam: ['Toplam', '', '', '', tl(s.asilAlacak), tl(s.kalanAsilAlacak)],
    });
  }

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
  kurucu.tablo(['Harç kalemi', 'Hukuki dayanak ve açıklama', 'Oran', 'Tutar (TL)'], icraHarcSatirlari(s), {
    genislikler: [130, 220, 50, 80],
    sag: [2, 3],
    kalinSatirlar: [6, 9],
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
    kurucu.paragraf(ICRA_KISMI_ODEME_ACIKLAMASI);
    kurucu.tablo(ICRA_KISMI_ODEME_BASLIKLARI, icraKismiOdemeSatirlari(s), {
      genislikler: [16, 46, 34, 44, 40, 44, 40, 46, 42, 42, 42, 44],
      sag: [0, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    });
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
