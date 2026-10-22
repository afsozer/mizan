// Hukuki tercihler ve hesap esasları. Her değer raporda "girdi" ya da "varsayılan" diye
// işaretlenir; varsayılanın dayanağı yanında yazar. Takdiri indirim, hak varlığı, vergi
// yöntemi gibi tercihlerin varsayılanı yoktur, girdi dosyasında açıkça yazılmak zorundadır.
import { d, Decimal, yuzde, sayi } from './para.ts';
import type { Girdi } from './girdi.ts';
import { trTarih, yilAl } from './tarih.ts';

export interface Parametre {
  ad: string;
  deger: string;
  kaynak: 'girdi' | 'varsayılan';
  dayanak: string;
}

export interface Esaslar {
  gunlukBolen: Decimal;
  aylikCalismaSaati: Decimal;
  haftaHesabi: 'ondalik' | 'tam';
  faizGunEsasi: Decimal;
  faizMatrahi: 'brut' | 'net';
  indirimMahsupSirasi?: 'once-indirim' | 'once-mahsup';
  vergiYili: number;
  asgariUcretIstisnasi: boolean;
  fazlaCalismaCarpani: Decimal;
  haftaTatiliCarpani: Decimal;
  ubgtCarpani: Decimal;
  faizBitis: string;
  liste: Parametre[];
}

export function esaslariBelirle(g: Girdi): Esaslar {
  const liste: Parametre[] = [];
  const p = g.parametreler;

  function sec<T>(ad: string, girdi: T | undefined, varsayilan: T, yaz: (v: T) => string, dayanak: string): T {
    const deger = girdi ?? varsayilan;
    liste.push({ ad, deger: yaz(deger), kaynak: girdi === undefined ? 'varsayılan' : 'girdi', dayanak });
    return deger;
  }

  const gunlukBolen = sec('Günlük ücret böleni', p.gunlukBolen, d(30), (v) => sayi(v), 'Aylık ücret / 30 (Yargıtay uygulaması)');
  const aylikCalismaSaati = sec(
    'Aylık çalışma saati',
    p.aylikCalismaSaati,
    d(225),
    (v) => sayi(v),
    'Haftalık 45 saat (4857 s.K. m.63) esasına göre aylık 225 saat (Yargıtay uygulaması)',
  );
  const haftaHesabi = sec(
    'Hafta sayısı hesabı',
    p.haftaHesabi,
    'ondalik' as const,
    (v) => (v === 'ondalik' ? '(dönem günü - düşülen) / 7, kesirli' : '(dönem günü - düşülen) / 7, tam haftaya aşağı yuvarlanır'),
    'Hesap esası; dönem haftası ücret kesitlerine gün sayısıyla orantılı dağıtılır',
  );
  const faizGunEsasi = sec('Faiz gün esası', p.faizGunEsasi, d(365), (v) => `yıllık oran / ${sayi(v)} × gün`, 'Basit faiz');
  const faizMatrahi = sec(
    'Faiz matrahı',
    p.faizMatrahi,
    'brut' as const,
    (v) => (v === 'brut' ? 'brüt alacak' : 'net alacak'),
    'Hesap esası',
  );
  if (p.indirimMahsupSirasi) {
    liste.push({
      ad: 'Takdiri indirim ve mahsup sırası',
      deger: p.indirimMahsupSirasi === 'once-indirim' ? 'önce indirim, sonra mahsup' : 'önce mahsup, sonra indirim',
      kaynak: 'girdi',
      dayanak: 'Hukuki tercih',
    });
  }

  sec(
    'Süre hesabı',
    p.sureHesabi,
    'takvim' as const,
    (x) => (x === 'takvim' ? 'takvim esaslı, giriş ve çıkış günü dahil' : 'gün sayısı; 1 yıl 365 gün, 1 ay 30 gün'),
    'Hesap esası; birden fazla dönem takvimde toplanıp 30 gün 1 ay sayılır',
  );

  const v = p.vergi;
  liste.push({
    ad: 'Gelir vergisi yöntemi',
    deger:
      v.yontem === 'sabit'
        ? `sabit oran ${yuzde(v.sabitOran!)}`
        : `GVK m.103 ücret tarifesi, kümülatif matrah (önceki matrah ${sayi(v.oncekiKumulatifMatrah, 2)} TL)`,
    kaynak: 'girdi',
    dayanak: 'Hukuki tercih (GVK m.61, m.94, m.103)',
  });
  const vergiYili = sec('Vergi yılı', v.yil, yilAl(g.hesapTarihi), (x) => String(x), 'Hesap tarihinin yılı');
  if (v.yontem === 'dilim') {
    sec(
      'Gelir vergisi matrah birikimi',
      v.birikim,
      'kalemler-arasi' as const,
      (x) => (x === 'kalemler-arasi' ? 'kalemlerin matrahları sırayla birikir' : 'her kalem önceki matrahtan ayrı başlar'),
      'Hukuki tercih (GVK m.103 kümülatif tarife)',
    );
  }
  const asgariUcretIstisnasi = sec(
    'Asgari ücret GV ve DV istisnası',
    v.asgariUcretIstisnasi,
    false,
    (x) => (x ? 'ödeme ayında (hesap tarihinin ayı) bir kez uygulanır' : 'uygulanmaz'),
    'GVK m.23/1-18 ve 488 s.K. (2) sayılı tablo IV-34 (7349 s.K., 01.01.2022\'den); GVGT Seri 319 m.4/5: ayın ücret ödemelerine bir kez; ' +
      'GİB özelgesi 13.12.2023 (gib.gov.tr/mevzuat/kanun/433/ozelge/23152): kalan istisna ihbar ve kıdeme de uygulanır',
  );

  const k = g.kalemler;
  const fazlaCalismaCarpani = k.fazlaCalisma
    ? sec('Fazla çalışma çarpanı', k.fazlaCalisma.carpan, d('1.5'), (x) => sayi(x), '4857 s.K. m.41/2: saat ücretinin yüzde elli fazlası')
    : d('1.5');
  const haftaTatiliCarpani = k.haftaTatili
    ? sec(
        'Hafta tatili çarpanı',
        k.haftaTatili.carpan,
        d('1.5'),
        (x) => sayi(x),
        '4857 s.K. m.46 süreyi düzenler, ücret oranını yazmaz; %50 zamlı ödeme Yargıtay uygulaması',
      )
    : d('1.5');
  const ubgtCarpani = k.ubgt
    ? sec('UBGT çarpanı', k.ubgt.carpan, d(1), (x) => sayi(x), '4857 s.K. m.47/1: çalışılan her gün için ayrıca bir günlük ücret')
    : d(1);

  const faizBitis = sec('Faiz bitiş tarihi', g.faizBitis, g.hesapTarihi, (x) => trTarih(x), 'Hesap tarihi');

  const mevduatVar = Object.values(k).some((kg) => kg?.faiz?.some((f) => f.tur === 'mevduat'));
  if (mevduatVar) {
    sec(
      'Mevduat faizi oran tablosu',
      g.tablolar?.mevduatFaizi,
      'tum',
      (v) =>
        v === 'tum'
          ? 'TCMB, bankalarca fiilen uygulanan azami faiz, 1 yıla kadar vadeli (tüm bankalar, vekil seri)'
          : v === 'kamu'
            ? 'TCMB, kamu bankalarınca fiilen uygulanan azami faiz, 1 yıla kadar vadeli (vekil seri)'
            : `girdi tablosu: ${v}`,
      '1475 s.K. m.14; bir yıllık mevduata fiilen uygulanan en yüksek oran, özel-kamu banka ayrımı yok ' +
        '(Yargıtay 9. HD 2025/6610 E., 2025/8609 K.); "kamu bankalarınca" talep edilmişse taleple bağlılık (22. HD 2016/16498 E.)',
    );
    liste.push({
      ad: 'Mevduat faizi yöntemi',
      deger: 'başlangıç tarihindeki oran ilk yıl, her yıldönümündeki oran o yıl boyunca sabit',
      kaynak: 'varsayılan',
      dayanak: 'Yargıtay 9. HD 06.11.2025, 2025/6610 E., 2025/8609 K. (yıl içi değişiklikler dikkate alınmaz)',
    });
  }

  return {
    gunlukBolen,
    aylikCalismaSaati,
    haftaHesabi,
    faizGunEsasi,
    faizMatrahi,
    indirimMahsupSirasi: p.indirimMahsupSirasi,
    vergiYili,
    asgariUcretIstisnasi,
    fazlaCalismaCarpani,
    haftaTatiliCarpani,
    ubgtCarpani,
    faizBitis,
    liste,
  };
}
