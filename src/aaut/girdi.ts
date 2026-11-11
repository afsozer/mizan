// AAÜT vekalet ücreti hesabı girdi şeması ve doğrulayıcısı.
import { parse } from 'yaml';
import { GirdiHatasi } from '../girdi.ts';
import { d, Decimal } from '../para.ts';
import type { AautMaktuAnahtari } from '../tablolar.ts';
import { gecerliTarih } from '../tarih.ts';

export const AAUT_MERCILERI = [
  'sulh-hukuk',
  'sulh-ceza-infaz',
  'asliye-hukuk',
  'asliye-ticaret',
  'is',
  'aile',
  'tuketici',
  'fikri-sinai',
  'idare-vergi-durusmasiz',
  'idare-vergi-durusmali',
  'agir-ceza',
  'asliye-ceza',
  'cocuk',
  'cocuk-agir-ceza',
  'icra-dairesi',
  'icra-mahkemesi-is',
  'icra-mahkemesi-dava',
  'icra-mahkemesi-istihkak',
  'icra-tahliye',
  'icra-mahkemesi-ceza',
  'bam-bim-ilk-derece',
  'bam-bim-istinaf-tek-durusma',
  'bam-bim-istinaf-coklu-durusma',
  'yargitay-ilk-derece',
  'danistay-ilk-derece-durusmasiz',
  'danistay-ilk-derece-durusmali',
  'temyiz-durusmasi',
] as const;

export type AautMerci = (typeof AAUT_MERCILERI)[number];

export const AAUT_MERCI_ADLARI: Record<AautMerci, string> = {
  'sulh-hukuk': 'Sulh Hukuk Mahkemesi',
  'sulh-ceza-infaz': 'Sulh Ceza ve İnfaz Hakimliği',
  'asliye-hukuk': 'Asliye Hukuk Mahkemesi',
  'asliye-ticaret': 'Asliye Ticaret Mahkemesi',
  is: 'İş Mahkemesi',
  aile: 'Aile Mahkemesi',
  tuketici: 'Tüketici Mahkemesi',
  'fikri-sinai': 'Fikri ve Sınai Haklar Mahkemesi',
  'idare-vergi-durusmasiz': 'İdare ve Vergi Mahkemesi (Duruşmasız)',
  'idare-vergi-durusmali': 'İdare ve Vergi Mahkemesi (Duruşmalı)',
  'agir-ceza': 'Ağır Ceza Mahkemesi',
  'asliye-ceza': 'Asliye Ceza Mahkemesi',
  cocuk: 'Çocuk Mahkemesi',
  'cocuk-agir-ceza': 'Çocuk Ağır Ceza Mahkemesi',
  'icra-dairesi': 'İcra Dairesi',
  'icra-mahkemesi-is': 'İcra Mahkemesi (İş)',
  'icra-mahkemesi-dava': 'İcra Mahkemesi (Dava ve Duruşmalı İş)',
  'icra-mahkemesi-istihkak': 'İcra Mahkemesi (İstihkak Davası - AAÜT m.11/3)',
  'icra-tahliye': 'İcra Dairesi (Tahliye Takibi)',
  'icra-mahkemesi-ceza': 'İcra Mahkemesi (Ceza İşi)',
  'bam-bim-ilk-derece': 'Bölge Adliye / Bölge İdare Mahkemesi (İlk Derece)',
  'bam-bim-istinaf-tek-durusma': 'BAM / BİM (İstinaf - Tek Duruşmalı)',
  'bam-bim-istinaf-coklu-durusma': 'BAM / BİM (İstinaf - Çoklu Duruşma / Keşifli)',
  'yargitay-ilk-derece': 'Yargıtay (İlk Derece)',
  'danistay-ilk-derece-durusmasiz': 'Danıştay (İlk Derece - Duruşmasız)',
  'danistay-ilk-derece-durusmali': 'Danıştay (İlk Derece - Duruşmalı)',
  'temyiz-durusmasi': 'Yargıtay / Danıştay / Sayıştay Temyiz Duruşması',
};

export const AAUT_MERCI_MAKTU_ANAHTARI: Record<AautMerci, AautMaktuAnahtari> = {
  'sulh-hukuk': 'sulhHukuk',
  'sulh-ceza-infaz': 'sulhCezaInfaz',
  'asliye-hukuk': 'asliye',
  'asliye-ticaret': 'asliye',
  is: 'asliye',
  aile: 'asliye',
  tuketici: 'tuketici',
  'fikri-sinai': 'fikriSinai',
  'idare-vergi-durusmasiz': 'idareVergiDurusmasiz',
  'idare-vergi-durusmali': 'idareVergiDurusmali',
  'agir-ceza': 'agirCeza',
  'asliye-ceza': 'asliye',
  cocuk: 'cocuk',
  'cocuk-agir-ceza': 'cocukAgirCeza',
  'icra-dairesi': 'icraDairesi',
  'icra-mahkemesi-is': 'icraMahkemesiIs',
  'icra-mahkemesi-dava': 'icraMahkemesiDava',
  'icra-mahkemesi-istihkak': 'icraMahkemesiDava',
  'icra-tahliye': 'icraTahliye',
  'icra-mahkemesi-ceza': 'icraMahkemesiCeza',
  'bam-bim-ilk-derece': 'bamBimIlkDerece',
  'bam-bim-istinaf-tek-durusma': 'bamBimIstinafTekDurusma',
  'bam-bim-istinaf-coklu-durusma': 'bamBimIstinafCokluDurusma',
  'yargitay-ilk-derece': 'yargitayIlkDerece',
  'danistay-ilk-derece-durusmasiz': 'danistayIlkDereceDurusmasiz',
  'danistay-ilk-derece-durusmali': 'danistayIlkDereceDurusmali',
  'temyiz-durusmasi': 'temyizDurusmasi',
};

export const AAUT_MAKTU_ZORUNLU_MERCILER: readonly AautMerci[] = [
  'sulh-ceza-infaz',
  'agir-ceza',
  'asliye-ceza',
  'cocuk',
  'cocuk-agir-ceza',
  'icra-tahliye',
  'icra-mahkemesi-ceza',
] as const;

export const AAUT_UCRET_TURLERI = ['nispi', 'maktu'] as const;
export type AautUcretTuru = (typeof AAUT_UCRET_TURLERI)[number];

export const AAUT_NITELIKLERI = ['genel', 'manevi-tazminat', 'maddi-tazminat', 'nafaka'] as const;
export type AautUyusmazlikNiteligi = (typeof AAUT_NITELIKLERI)[number];

export const AAUT_NITELIK_ADLARI: Record<AautUyusmazlikNiteligi, string> = {
  genel: 'Genel alacak / dava / takip (AAÜT m.13)',
  'manevi-tazminat': 'Manevi tazminat davası (AAÜT m.10)',
  'maddi-tazminat': 'Maddi tazminat davası (AAÜT m.13/3-4)',
  nafaka: 'Nafaka davası (AAÜT m.9)',
};

export const AAUT_ASAMALARI = ['karar', 'on-inceleme-oncesi', 'odeme-suresi-icinde'] as const;
export type AautAsamasi = (typeof AAUT_ASAMALARI)[number];

export const AAUT_ASAMA_ADLARI: Record<AautAsamasi, string> = {
  karar: 'Esastan karar / takip kesinleşmesi (tam ücret, %100)',
  'on-inceleme-oncesi': 'Ön inceleme tutanağı imzalanıncaya kadar feragat / kabul / sulh / konusuz kalma (1/2 oran, AAÜT m.6)',
  'odeme-suresi-icinde': 'İcra takibinde ödeme süresi içinde borcun ödenmesi (3/4 oran, AAÜT m.11/4)',
};

export interface AautUyusmazlikGirdisi {
  merci: AautMerci;
  tur: AautUcretTuru;
  nitelik: AautUyusmazlikNiteligi;
  davaDegeri: Decimal;
  kabulTutari: Decimal;
  retTutari: Decimal;
  maktuSonuc: 'kabul' | 'ret';
  asama: AautAsamasi;
  asamaGerekcesi?: string;
}

export interface AautGirdisi {
  alan: 'aaut';
  dosya: {
    mahkeme: string;
    esasNo: string;
    kaynak: string;
    altAlan: string;
    kisaAd?: string;
    hazirlayan?: string;
  };
  /** AAÜT m.21 uyarınca yürürlükteki tarifenin belirlendiği karar veya hukuki yardımın tamamlandığı tarih. */
  hesapTarihi: string;
  uyusmazlik: AautUyusmazlikGirdisi;
}

type Nesne = Record<string, unknown>;

function alanHatasi(alanYolu: string, aciklama: string): never {
  throw new GirdiHatasi(alanYolu, `${alanYolu}: ${aciklama}`);
}

class Okuyucu {
  readonly yer: string;
  readonly n: Nesne;

  constructor(yer: string, n: Nesne) {
    this.yer = yer;
    this.n = n;
  }

  static kok(veri: unknown): Okuyucu {
    if (!veri || typeof veri !== 'object' || Array.isArray(veri)) {
      throw new GirdiHatasi('girdi', 'Girdi dosyası bir YAML nesnesi olmalı');
    }
    return new Okuyucu('girdi', veri as Nesne);
  }

  izinli(alanlar: string[]): void {
    for (const k of Object.keys(this.n)) {
      if (!alanlar.includes(k)) {
        alanHatasi(`${this.yer}.${k}`, `tanınmayan alan "${k}". İzinli alanlar: ${alanlar.join(', ')}`);
      }
    }
  }

  var(alan: string): boolean {
    return this.n[alan] !== undefined && this.n[alan] !== null && this.n[alan] !== '';
  }

  alt(alan: string): Okuyucu {
    const v = this.n[alan];
    if (!v || typeof v !== 'object' || Array.isArray(v)) alanHatasi(`${this.yer}.${alan}`, 'nesne bekleniyor');
    return new Okuyucu(`${this.yer}.${alan}`, v as Nesne);
  }

  metin(alan: string): string {
    const v = this.n[alan];
    if (typeof v !== 'string' || !v.trim()) alanHatasi(`${this.yer}.${alan}`, 'boş olmayan metin bekleniyor');
    return v.trim();
  }

  tarih(alan: string): string {
    const v = this.n[alan];
    const t = v instanceof Date ? v.toISOString().slice(0, 10) : v;
    if (typeof t !== 'string' || !gecerliTarih(t)) alanHatasi(`${this.yer}.${alan}`, 'YYYY-AA-GG tarih bekleniyor');
    return t;
  }

  sayi(alan: string, enAz = 0): Decimal {
    const v = this.n[alan];
    if (typeof v !== 'number' && (typeof v !== 'string' || !/^-?\d+(\.\d+)?$/.test(v.trim()))) {
      alanHatasi(`${this.yer}.${alan}`, 'sayı bekleniyor (ondalık ayırıcı nokta)');
    }
    const s = d(typeof v === 'number' ? String(v) : v.trim());
    if (s.lt(enAz)) alanHatasi(`${this.yer}.${alan}`, `${enAz} ya da daha büyük olmalı`);
    return s;
  }

  tutar(alan: string): Decimal {
    const s = this.sayi(alan);
    if (s.decimalPlaces() > 2) alanHatasi(`${this.yer}.${alan}`, 'tutar en fazla iki ondalık (kuruş) olmalı');
    return s;
  }

  secenek<T extends string>(alan: string, secenekler: readonly T[]): T {
    const v = this.n[alan];
    if (typeof v !== 'string' || !secenekler.includes(v as T)) {
      alanHatasi(`${this.yer}.${alan}`, `${secenekler.join(' | ')} değerlerinden biri olmalı`);
    }
    return v as T;
  }
}

export function aautGirdiCoz(veri: unknown): AautGirdisi {
  const k = Okuyucu.kok(veri);
  k.izinli(['alan', 'dosya', 'hesapTarihi', 'uyusmazlik']);

  const alan = k.secenek('alan', ['aaut'] as const);

  const dsy = k.alt('dosya');
  dsy.izinli(['mahkeme', 'esasNo', 'kaynak', 'altAlan', 'kisaAd', 'hazirlayan']);
  const dosya = {
    mahkeme: dsy.metin('mahkeme'),
    esasNo: dsy.metin('esasNo'),
    kaynak: dsy.metin('kaynak'),
    altAlan: dsy.metin('altAlan'),
    kisaAd: dsy.var('kisaAd') ? dsy.metin('kisaAd') : undefined,
    hazirlayan: dsy.var('hazirlayan') ? dsy.metin('hazirlayan') : undefined,
  };

  const hesapTarihi = k.tarih('hesapTarihi');

  const u = k.alt('uyusmazlik');
  u.izinli([
    'merci',
    'tur',
    'nitelik',
    'davaDegeri',
    'kabulTutari',
    'retTutari',
    'maktuSonuc',
    'asama',
    'asamaGerekcesi',
  ]);

  const merci = u.secenek('merci', AAUT_MERCILERI);
  const tur = u.secenek('tur', AAUT_UCRET_TURLERI);
  const nitelik: AautUyusmazlikNiteligi = u.var('nitelik')
    ? u.secenek('nitelik', AAUT_NITELIKLERI)
    : 'genel';
  const asama: AautAsamasi = u.var('asama') ? u.secenek('asama', AAUT_ASAMALARI) : 'karar';
  const asamaGerekcesi = u.var('asamaGerekcesi') ? u.metin('asamaGerekcesi') : undefined;

  if (asama !== 'karar' && !asamaGerekcesi) {
    alanHatasi('girdi.uyusmazlik.asamaGerekcesi', 'indirimli aşama seçildiğinde gerekçe yazılmalı');
  }

  if (asama === 'odeme-suresi-icinde' && merci !== 'icra-dairesi' && merci !== 'icra-tahliye') {
    alanHatasi(
      'girdi.uyusmazlik.asama',
      '"odeme-suresi-icinde" (AAÜT m.11/4) yalnız "icra-dairesi" veya "icra-tahliye" mercilerinde kullanılır',
    );
  }

  if (asama === 'on-inceleme-oncesi' && (merci === 'icra-dairesi' || merci === 'icra-tahliye')) {
    alanHatasi(
      'girdi.uyusmazlik.asama',
      'icra dairelerinde "on-inceleme-oncesi" yerine ödeme süresi içi ödeme için "odeme-suresi-icinde" kullanılır',
    );
  }

  if (tur === 'nispi' && AAUT_MAKTU_ZORUNLU_MERCILER.includes(merci)) {
    alanHatasi('girdi.uyusmazlik.tur', `"${merci}" merciinde vekalet ücreti yalnız "maktu" olarak hesaplanır`);
  }

  if (tur === 'maktu' && nitelik !== 'genel') {
    alanHatasi(
      'girdi.uyusmazlik.nitelik',
      'maktu hesapta uyuşmazlık niteliği ("manevi-tazminat", "maddi-tazminat", "nafaka") seçilemez',
    );
  }

  let davaDegeri = d(0);
  let kabulTutari = d(0);
  let retTutari = d(0);
  let maktuSonuc: 'kabul' | 'ret' = 'kabul';

  if (tur === 'nispi') {
    if (u.var('maktuSonuc')) {
      alanHatasi('girdi.uyusmazlik.maktuSonuc', 'yalnız tur "maktu" iken kullanılır');
    }
    if (!u.var('davaDegeri') && !u.var('kabulTutari') && !u.var('retTutari')) {
      alanHatasi('girdi.uyusmazlik.davaDegeri', 'nispi hesapta dava/takip değeri zorunludur');
    }

    const girilenDava = u.var('davaDegeri') ? u.tutar('davaDegeri') : undefined;
    const girilenKabul = u.var('kabulTutari') ? u.tutar('kabulTutari') : undefined;
    const girilenRet = u.var('retTutari') ? u.tutar('retTutari') : undefined;

    if (girilenDava !== undefined && girilenKabul === undefined && girilenRet === undefined) {
      davaDegeri = girilenDava;
      kabulTutari = girilenDava;
      retTutari = d(0);
    } else if (girilenDava !== undefined && girilenKabul !== undefined && girilenRet === undefined) {
      if (girilenKabul.gt(girilenDava)) {
        alanHatasi('girdi.uyusmazlik.kabulTutari', 'kabul edilen tutar dava değerini aşamaz');
      }
      davaDegeri = girilenDava;
      kabulTutari = girilenKabul;
      retTutari = girilenDava.minus(girilenKabul);
    } else if (girilenDava !== undefined && girilenKabul === undefined && girilenRet !== undefined) {
      if (girilenRet.gt(girilenDava)) {
        alanHatasi('girdi.uyusmazlik.retTutari', 'reddedilen tutar dava değerini aşamaz');
      }
      davaDegeri = girilenDava;
      retTutari = girilenRet;
      kabulTutari = girilenDava.minus(girilenRet);
    } else if (girilenDava === undefined) {
      kabulTutari = girilenKabul ?? d(0);
      retTutari = girilenRet ?? d(0);
      davaDegeri = kabulTutari.plus(retTutari);
    } else {
      davaDegeri = girilenDava;
      kabulTutari = girilenKabul!;
      retTutari = girilenRet!;
      if (!kabulTutari.plus(retTutari).eq(davaDegeri)) {
        alanHatasi(
          'girdi.uyusmazlik',
          `kabulTutari (${kabulTutari.toFixed(2)}) ve retTutari (${retTutari.toFixed(2)}) toplamı davaDegeri (${davaDegeri.toFixed(2)}) ile eşit olmalı`,
        );
      }
    }

    if (davaDegeri.lte(0)) {
      alanHatasi('girdi.uyusmazlik.davaDegeri', 'nispi hesapta dava/takip değeri 0\'dan büyük olmalı');
    }

    if (merci === 'icra-dairesi' && (retTutari.gt(0) || kabulTutari.lt(davaDegeri))) {
      alanHatasi(
        'girdi.uyusmazlik.retTutari',
        'icra dairesi takiplerinde kısmi ret ve borçlu lehine karşı vekalet ücreti hesaplanmaz',
      );
    }
  } else {
    if (u.var('davaDegeri') || u.var('kabulTutari') || u.var('retTutari')) {
      alanHatasi('girdi.uyusmazlik', 'maktu hesapta davaDegeri, kabulTutari ve retTutari alanları kullanılmaz');
    }
    maktuSonuc = u.var('maktuSonuc') ? u.secenek('maktuSonuc', ['kabul', 'ret'] as const) : 'kabul';
  }

  return {
    alan,
    dosya,
    hesapTarihi,
    uyusmazlik: {
      merci,
      tur,
      nitelik,
      davaDegeri,
      kabulTutari,
      retTutari,
      maktuSonuc,
      asama,
      asamaGerekcesi,
    },
  };
}

export function aautGirdiMetindenCoz(metin: string): AautGirdisi {
  return aautGirdiCoz(parse(metin));
}
