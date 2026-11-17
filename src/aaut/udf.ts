// AAÜT vekalet ücreti UYAP Doküman Formatı (.udf, format_id="1.8") rapor üreticisi.
// src/aaut/rapor.ts ile bölüm bölüm eşdeğerdir; sıfır dış paket ve sıfır Node modülü kullanır.
import { tl, yuzde } from '../para.ts';
import type { RaporBilgisi } from '../rapor/pdf.ts';
import {
  UDF_DOGRULAMA_UYARISI,
  UdfKurucu,
  hesapKimligiEkle,
  kaynakTablolariEkle,
  tabloOzetleriEkle,
  udfPaketle,
} from '../rapor/udf.ts';
import { trTarih } from '../tarih.ts';
import { AAUT_ASAMA_ADLARI, AAUT_NITELIK_ADLARI } from './girdi.ts';
import type { AautHesapSonucu, AautTarafHesabi } from './hesap.ts';
import { aautKanitDosyaAdi } from './rapor.ts';

/** YYYY-AA-GG_mahkeme-esas_altalan.udf */
export function aautUdfDosyaAdi(sonuc: AautHesapSonucu, uretimTarihi: string): string {
  return aautKanitDosyaAdi(sonuc, uretimTarihi).replace(/\.pdf$/, '.udf');
}

function tarafBolumuEkle(kurucu: UdfKurucu, t: AautTarafHesabi, no: string): void {
  kurucu.baslik(`${no} ${t.baslik}`, 2);

  if (t.dayanak.length) {
    kurucu.etiket('Dayanak');
    kurucu.maddeler(t.dayanak);
  }
  if (t.formul.length) {
    kurucu.etiket('Formül ve uygulama adımları');
    kurucu.maddeler(t.formul);
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
  kurucu.ikiSutun(bilgiler, 165);

  if (t.dilimler.length > 0) {
    kurucu.etiket('Üçüncü Kısım kademeli dilim hesabı');
    kurucu.tablo(
      ['Dilim', 'Tarife kademesi', 'Oran', 'Dilim matrahı (TL)', 'Dilim ücreti (TL)'],
      t.dilimler.map((dl) => [
        String(dl.sira),
        dl.aciklama,
        yuzde(dl.oran),
        tl(dl.matrah),
        tl(dl.tutar),
      ]),
      {
        genislikler: [35, 205, 50, 95, 95],
        sag: [0, 2, 3, 4],
        toplam: ['', 'Kademeli nispi toplam', '', tl(t.esasTutar), tl(t.hamNispiUcret)],
      },
    );
  }

  if (t.notlar.length) {
    kurucu.etiket('Notlar');
    kurucu.maddeler(t.notlar);
  }
}

export function aautUdfXmlOlustur(s: AautHesapSonucu, bilgi: RaporBilgisi): string {
  const g = s.girdi;
  const dsy = g.dosya;
  const u = g.uyusmazlik;
  const kurucu = new UdfKurucu();

  kurucu.paragraf('AAÜT VEKALET ÜCRETİ HESAP RAPORU', { hiza: '1', kalin: true, boyut: 14, altBosluk: 6 });

  const ust: [string, string][] = [
    ['Dosya', `${dsy.mahkeme} ${dsy.esasNo}`],
    ['Bilirkişilik alt alanı', dsy.altAlan],
    ['Hüküm / hesap tarihi (AAÜT m.21)', trTarih(g.hesapTarihi)],
    ['Uygulanan tarife dönemi', `${s.tarifeDonemi} AAÜT`],
    ['Rapor üretim zamanı', bilgi.uretimZamani],
  ];
  if (dsy.hazirlayan) ust.push(['Hazırlayan', dsy.hazirlayan]);
  kurucu.ikiSutun(ust, 165);

  // 1. Özet
  kurucu.baslik('1. Özet', 1);
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
  kurucu.tablo(
    ['Taraf / Kalem', 'Esas tutar', 'Kademeli nispi', 'Merci maktu', 'Hükmedilecek ücret (TL)'],
    ozetSatirlari,
    { genislikler: [155, 85, 75, 70, 95], sag: [1, 2, 3, 4] },
  );

  // 2. Girdiler
  kurucu.baslik('2. Girdiler', 1);
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
  kurucu.ikiSutun(girdiler, 165);

  // 3. Hukuki tercihler ve tarife esasları
  kurucu.baslik('3. Hukuki tercihler ve tarife esasları', 1);
  kurucu.tablo(
    ['Esas', 'Değer', 'Kaynak', 'Dayanak'],
    s.parametreler.map((p) => [p.ad, p.deger, p.kaynak, p.dayanak]),
    { genislikler: [115, 135, 50, 180] },
  );

  // 4. Taraf bazında vekalet ücreti hesapları
  kurucu.baslik('4. Taraf bazında vekalet ücreti hesapları', 1);
  let altNo = 1;
  if (!s.davaci.hukmedilenUcret.isZero() || u.kabulTutari.gt(0) || (u.tur === 'maktu' && u.maktuSonuc === 'kabul')) {
    tarafBolumuEkle(kurucu, s.davaci, `4.${altNo}`);
    altNo++;
  }
  if (!s.davali.hukmedilenUcret.isZero() || u.retTutari.gt(0) || (u.tur === 'maktu' && u.maktuSonuc === 'ret')) {
    tarafBolumuEkle(kurucu, s.davali, `4.${altNo}`);
  }

  // 5. Kullanılan tablo satırları ve resmi kaynakları
  kurucu.baslik('5. Kullanılan tablo satırları ve resmi kaynakları', 1);
  kaynakTablolariEkle(kurucu, s.kaynaklar, 130);
  tabloOzetleriEkle(kurucu, s.tabloOzetleri, [140, 70, 270]);

  // 6. Sınırlar ve uyarılar
  kurucu.baslik('6. Sınırlar ve uyarılar', 1);
  kurucu.maddeler([
    ...s.uyarilar,
    ...s.notlar,
    'Avukatlık Asgari Ücret Tarifesi m.21 uyarınca avukatlık ücretinin takdirinde, hukuki yardımın tamamlandığı veya davada hükmün verildiği tarihte yürürlükte olan tarife esas alınır.',
    'AAÜT m.13 uyarınca tarifenin üçüncü kısmına göre hesaplanan nispi vekalet ücreti, ikinci kısmın ikinci bölümünde ilgili mahkeme için öngörülen maktu ücretten az olamaz ve kabul veya reddedilen müddeabih miktarını geçemez.',
    'Hesap yalnız 1136 sayılı Avukatlık Kanunu m.168 ve AAÜT uyarınca hükmedilecek karşı yan (yasal) vekalet ücretini kapsar; avukat ile müvekkil arasındaki sözleşmesel ücreti (m.164) kapsamaz.',
    UDF_DOGRULAMA_UYARISI,
  ]);

  // 7. Hesap kimliği
  kurucu.baslik('7. Hesap kimliği', 1);
  hesapKimligiEkle(kurucu, bilgi, 165);

  return kurucu.xmlUret();
}

export function aautUdfOlustur(sonuc: AautHesapSonucu, bilgi: RaporBilgisi): Uint8Array {
  return udfPaketle(aautUdfXmlOlustur(sonuc, bilgi));
}
