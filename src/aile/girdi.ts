// Aile hukuku mal rejimi tasfiyesi (edinilmis mallara katilma rejimi, 4721 s.K. TMK m.202-241)
// girdi dosyasi (YAML) okuma ve siki sema denetimi. Esler icin kisi adi alani acilmaz;
// taraflar yalniz "davaci" ve "davali" olarak adlandirilir.
import { parse } from 'yaml';
import { GirdiHatasi } from '../girdi.ts';
import { d, Decimal } from '../para.ts';
import { gecerliTarih, karsilastir } from '../tarih.ts';

export type TarafKodu = 'davaci' | 'davali';
export type MalNiteligi = 'edinilmis' | 'kisisel';
export type DegerKaybiTabani = 'baslangic-degeri' | 'surum-orani';
export type DenklestirmeYonu = 'edinilmisten-kisisele' | 'kisiselden-edinilmise';
export type EklenecekDegerTuru = 'son-bir-yil-bagis' | 'katilma-alacagini-azaltma-kasti';
export type HakkaniyetNedeni = 'zina' | 'hayata-kast';
export type FaizBaslangicEsasi = 'tasfiye-tarihi' | 'dava-tarihi' | 'ozel-tarih' | 'yok';

export interface KatkiGirdisi {
  aciklama: string;
  katkiTutari: Decimal;
  /** Iyilestirme/koruma katkisi edinmeden farkli bir tarihte yapildiysa o tarihteki mal degeri; verilmezse edinmeDegeri. */
  katkiTarihiMalDegeri?: Decimal;
  degerKaybiTabani?: DegerKaybiTabani;
  degerKaybiGerekcesi?: string;
}

export interface KrediGirdisi {
  /** Diger esin kisisel malindan odenen pesinat (TMK m.227 deger artis payi). */
  digerEsKisiselPesinat?: Decimal;
  /** Malik esin kisisel malindan odenen pesinat (TMK m.230 denklestirme / kisisel pay). */
  malikKisiselPesinat?: Decimal;
  /** Evlilik ici edinilmis mallardan odenen pesinat (TMK m.219). */
  edinilmisPesinat?: Decimal;
  /** Krediyle karsilanan alim bedeli kismi; verilmezse edinmeDegeri - toplamPesinat. */
  cekilenKredi?: Decimal;
  /** Mal rejiminin devami suresince odenen kredi taksitleri toplami (edinilmis mal kesimi). */
  evlilikIciOdenen: Decimal;
  /** Mal rejimi sona erdikten sonra odenen ya da kalan kredi borcu toplami (mala iliskin borc / kisisel kesim). */
  evlilikSonrasiOdenen?: Decimal;
  /** Diger esin kisisel malindan odedigi kredi taksitleri varsa (TMK m.227). */
  digerEsKisiselKrediOdemesi?: Decimal;
  degerKaybiTabani?: DegerKaybiTabani;
  degerKaybiGerekcesi?: string;
}

export interface MalGirdisi {
  ad: string;
  malik: TarafKodu;
  nitelik: MalNiteligi;
  edinmeTarihi?: string;
  edinmeDegeri: Decimal;
  tasfiyeDegeri: Decimal;
  malaIliskinBorc?: Decimal;
  digerEsKatkilari: KatkiGirdisi[];
  malikKisiselKatkisi?: { aciklama: string; katkiTutari: Decimal };
  kredi?: KrediGirdisi;
}

export interface EklenecekDegerGirdisi {
  es: TarafKodu;
  tur: EklenecekDegerTuru;
  aciklama: string;
  devirTarihi?: string;
  tutar: Decimal;
}

export interface DenklestirmeGirdisi {
  es: TarafKodu;
  yon: DenklestirmeYonu;
  aciklama: string;
  /** TMK m.230/1 dogrudan borc odemesi icin sabit tutar. */
  tutar?: Decimal;
  /** TMK m.230/3 deger artisi/azalmasi olan mala katki icin oranlamali girdiler. */
  katkiTutari?: Decimal;
  edinmeDegeri?: Decimal;
  tasfiyeDegeri?: Decimal;
}

export interface HakkaniyetIndirimiGirdisi {
  kusurluEs: TarafKodu;
  neden: HakkaniyetNedeni;
  /** Kusurlu esin artik degerdeki indirimli pay orani (or. kaldirma icin 0, yariya indirme icin 0.25). */
  yeniPayOrani?: Decimal;
  /** Katilma alacagindan dusulecek hakkaniyet indirimi orani (0-1 arasi; kaldirma icin 1, yariya indirme icin 0.5). */
  indirimOrani?: Decimal;
  gerekce: string;
}

export interface AileFaizTercihi {
  baslangicEsasi: FaizBaslangicEsasi;
  baslangicTarihi?: string;
  gerekce: string;
}

export interface AileParametreGirdisi {
  degerKaybiTabani?: DegerKaybiTabani;
  degerKaybiGerekcesi?: string;
  katilmaOrani?: { davaci: Decimal; davali: Decimal; gerekce: string };
  hakkaniyetIndirimi?: HakkaniyetIndirimiGirdisi;
  takasKapsami?: 'yalniz-katilma' | 'tum-alacaklar';
  faizGunEsasi?: Decimal;
  degerArtisPayiFaizi?: AileFaizTercihi;
  katilmaAlacagiFaizi?: AileFaizTercihi;
}

export interface AileGirdi {
  alan: 'aile';
  dosya: { mahkeme: string; esasNo: string; kaynak: string; altAlan: string; kisaAd?: string; hazirlayan?: string };
  hesapTarihi: string;
  faizBitis?: string;
  evlilik: {
    evlenmeTarihi: string;
    malRejimiSonaErmeTarihi: string;
    sonaErmeNedeni: string;
    davaTarihi?: string;
    tasfiyeTarihi?: string;
  };
  mallar: MalGirdisi[];
  eklenecekDegerler: EklenecekDegerGirdisi[];
  denklestirmeler: DenklestirmeGirdisi[];
  parametreler: AileParametreGirdisi;
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
      throw new GirdiHatasi('girdi', 'Girdi dosyasi bir YAML nesnesi olmali');
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
    return this.n[alan] !== undefined && this.n[alan] !== null;
  }

  alt(alan: string): Okuyucu {
    const v = this.n[alan];
    if (!v || typeof v !== 'object' || Array.isArray(v)) alanHatasi(`${this.yer}.${alan}`, 'nesne bekleniyor');
    return new Okuyucu(`${this.yer}.${alan}`, v as Nesne);
  }

  liste(alan: string): Okuyucu[] {
    const v = this.n[alan];
    if (!Array.isArray(v)) alanHatasi(`${this.yer}.${alan}`, 'liste bekleniyor');
    return v.map((o, i) => {
      if (!o || typeof o !== 'object' || Array.isArray(o)) alanHatasi(`${this.yer}.${alan}[${i}]`, 'nesne bekleniyor');
      return new Okuyucu(`${this.yer}.${alan}[${i}]`, o as Nesne);
    });
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

  tutar(alan: string, sifirdanBuyuk = false): Decimal {
    const s = this.sayi(alan, 0);
    if (s.decimalPlaces() > 2) alanHatasi(`${this.yer}.${alan}`, 'tutar en fazla iki ondalık (kuruş) olmalı');
    if (sifirdanBuyuk && s.lte(0)) alanHatasi(`${this.yer}.${alan}`, 'sıfırdan büyük tutar bekleniyor');
    return s;
  }

  oran(alan: string): Decimal {
    const s = this.sayi(alan, 0);
    if (s.gt(1)) alanHatasi(`${this.yer}.${alan}`, 'oran 0 ile 1 arasında yazılır (%50 -> 0.50)');
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

const TARAFLAR = ['davaci', 'davali'] as const;
const DEGER_KAYBI_SECENEKLERI = ['baslangic-degeri', 'surum-orani'] as const;

function katkiOku(o: Okuyucu, edinmeDegeri: Decimal): KatkiGirdisi {
  o.izinli(['aciklama', 'katkiTutari', 'katkiTarihiMalDegeri', 'degerKaybiTabani', 'degerKaybiGerekcesi']);
  const katkiTutari = o.tutar('katkiTutari', true);
  const katkiTarihiMalDegeri = o.var('katkiTarihiMalDegeri') ? o.tutar('katkiTarihiMalDegeri', true) : undefined;
  const esasDeger = katkiTarihiMalDegeri ?? edinmeDegeri;
  if (katkiTutari.gt(esasDeger)) {
    alanHatasi(`${o.yer}.katkiTutari`, 'katkı tutarı malın katkı/edinme tarihindeki değerini aşamaz');
  }
  const degerKaybiTabani = o.var('degerKaybiTabani') ? o.secenek('degerKaybiTabani', DEGER_KAYBI_SECENEKLERI) : undefined;
  const degerKaybiGerekcesi = o.var('degerKaybiGerekcesi') ? o.metin('degerKaybiGerekcesi') : undefined;
  if (degerKaybiTabani === 'surum-orani' && !degerKaybiGerekcesi) {
    alanHatasi(`${o.yer}.degerKaybiGerekcesi`, 'değer kaybında sürüm oranı seçildiyse yazılı anlaşma gerekçesi (TMK m.227/3) yazılmalı');
  }
  return { aciklama: o.metin('aciklama'), katkiTutari, katkiTarihiMalDegeri, degerKaybiTabani, degerKaybiGerekcesi };
}

function krediOku(o: Okuyucu, edinmeDegeri: Decimal): KrediGirdisi {
  o.izinli([
    'digerEsKisiselPesinat',
    'malikKisiselPesinat',
    'edinilmisPesinat',
    'cekilenKredi',
    'evlilikIciOdenen',
    'evlilikSonrasiOdenen',
    'digerEsKisiselKrediOdemesi',
    'degerKaybiTabani',
    'degerKaybiGerekcesi',
  ]);
  const digerEsKisiselPesinat = o.var('digerEsKisiselPesinat') ? o.tutar('digerEsKisiselPesinat') : undefined;
  const malikKisiselPesinat = o.var('malikKisiselPesinat') ? o.tutar('malikKisiselPesinat') : undefined;
  const edinilmisPesinat = o.var('edinilmisPesinat') ? o.tutar('edinilmisPesinat') : undefined;
  const toplamPesinat = (digerEsKisiselPesinat ?? d(0)).plus(malikKisiselPesinat ?? d(0)).plus(edinilmisPesinat ?? d(0));
  if (toplamPesinat.gt(edinmeDegeri)) {
    alanHatasi(o.yer, 'peşinat toplamı malın edinme değerini aşamaz');
  }
  const cekilenKredi = o.var('cekilenKredi') ? o.tutar('cekilenKredi') : undefined;
  if (cekilenKredi !== undefined && !toplamPesinat.plus(cekilenKredi).eq(edinmeDegeri)) {
    alanHatasi(`${o.yer}.cekilenKredi`, 'peşinat toplamı ile çekilen kredi toplamı edinme değerine eşit olmalı');
  }
  const etkinKredi = cekilenKredi ?? edinmeDegeri.minus(toplamPesinat);
  const evlilikIciOdenen = o.tutar('evlilikIciOdenen');
  const evlilikSonrasiOdenen = o.var('evlilikSonrasiOdenen') ? o.tutar('evlilikSonrasiOdenen') : undefined;
  const digerEsKisiselKrediOdemesi = o.var('digerEsKisiselKrediOdemesi') ? o.tutar('digerEsKisiselKrediOdemesi') : undefined;
  const toplamKrediOdemesi = evlilikIciOdenen.plus(evlilikSonrasiOdenen ?? d(0)).plus(digerEsKisiselKrediOdemesi ?? d(0));
  if (etkinKredi.gt(0) && toplamKrediOdemesi.lte(0)) {
    alanHatasi(`${o.yer}.evlilikIciOdenen`, 'kredi ödemeleri toplamı sıfırdan büyük olmalı');
  }
  const degerKaybiTabani = o.var('degerKaybiTabani') ? o.secenek('degerKaybiTabani', DEGER_KAYBI_SECENEKLERI) : undefined;
  const degerKaybiGerekcesi = o.var('degerKaybiGerekcesi') ? o.metin('degerKaybiGerekcesi') : undefined;
  if (degerKaybiTabani === 'surum-orani' && !degerKaybiGerekcesi) {
    alanHatasi(`${o.yer}.degerKaybiGerekcesi`, 'değer kaybında sürüm oranı seçildiyse yazılı anlaşma gerekçesi (TMK m.227/3) yazılmalı');
  }
  return {
    digerEsKisiselPesinat,
    malikKisiselPesinat,
    edinilmisPesinat,
    cekilenKredi,
    evlilikIciOdenen,
    evlilikSonrasiOdenen,
    digerEsKisiselKrediOdemesi,
    degerKaybiTabani,
    degerKaybiGerekcesi,
  };
}

function malOku(o: Okuyucu): MalGirdisi {
  o.izinli([
    'ad',
    'malik',
    'nitelik',
    'edinmeTarihi',
    'edinmeDegeri',
    'tasfiyeDegeri',
    'malaIliskinBorc',
    'digerEsKatkilari',
    'malikKisiselKatkisi',
    'kredi',
  ]);
  const ad = o.metin('ad');
  const malik = o.secenek('malik', TARAFLAR);
  const nitelik = o.var('nitelik') ? o.secenek('nitelik', ['edinilmis', 'kisisel'] as const) : 'edinilmis';
  const edinmeTarihi = o.var('edinmeTarihi') ? o.tarih('edinmeTarihi') : undefined;
  const katkiVar = o.var('digerEsKatkilari') || o.var('malikKisiselKatkisi') || o.var('kredi');
  const edinmeDegeri = o.tutar('edinmeDegeri', katkiVar);
  const tasfiyeDegeri = o.tutar('tasfiyeDegeri');
  const malaIliskinBorc = o.var('malaIliskinBorc') ? o.tutar('malaIliskinBorc') : undefined;
  const digerEsKatkilari = o.var('digerEsKatkilari') ? o.liste('digerEsKatkilari').map((k) => katkiOku(k, edinmeDegeri)) : [];

  let malikKisiselKatkisi: MalGirdisi['malikKisiselKatkisi'];
  if (o.var('malikKisiselKatkisi')) {
    if (nitelik === 'kisisel') {
      alanHatasi(`${o.yer}.malikKisiselKatkisi`, 'yalnız edinilmiş mallarda malik kişisel katkısı düşülür');
    }
    const mk = o.alt('malikKisiselKatkisi');
    mk.izinli(['aciklama', 'katkiTutari']);
    const katkiTutari = mk.tutar('katkiTutari', true);
    if (katkiTutari.gt(edinmeDegeri)) {
      alanHatasi(`${mk.yer}.katkiTutari`, 'kişisel katkı tutarı malın edinme değerini aşamaz');
    }
    malikKisiselKatkisi = { aciklama: mk.metin('aciklama'), katkiTutari };
  }

  let kredi: KrediGirdisi | undefined;
  if (o.var('kredi')) {
    if (nitelik === 'kisisel') {
      alanHatasi(`${o.yer}.kredi`, 'kredi oranlaması edinilmiş mallar içindir; kişisel mala katkı için digerEsKatkilari veya denklestirmeler kullanılır');
    }
    if (malikKisiselKatkisi) {
      alanHatasi(`${o.yer}.malikKisiselKatkisi`, 'kredi kullanılan malda malik eşin kişisel peşinat katkısı kredi.malikKisiselPesinat alanından girilmeli');
    }
    if (digerEsKatkilari.some((k) => !k.katkiTarihiMalDegeri)) {
      alanHatasi(`${o.yer}.digerEsKatkilari`, 'kredi kullanılan malda edinme anı kişisel katkıları kredi.digerEsKisiselPesinat alanından girilmeli; edinme sonrası iyileştirme katkılarında katkiTarihiMalDegeri belirtilmeli');
    }
    kredi = krediOku(o.alt('kredi'), edinmeDegeri);
  }

  const edinmeBazliDigerEs = digerEsKatkilari
    .filter((k) => !k.katkiTarihiMalDegeri)
    .reduce((a, b) => a.plus(b.katkiTutari), d(0));
  const malikBazli = malikKisiselKatkisi?.katkiTutari ?? d(0);
  const krediPesinat = kredi
    ? (kredi.digerEsKisiselPesinat ?? d(0)).plus(kredi.malikKisiselPesinat ?? d(0)).plus(kredi.edinilmisPesinat ?? d(0))
    : d(0);
  if (edinmeDegeri.gt(0) && edinmeBazliDigerEs.plus(malikBazli).plus(krediPesinat).gt(edinmeDegeri)) {
    alanHatasi(o.yer, 'edinme tarihindeki katkılar ve peşinat toplamı edinme değerini aşamaz');
  }

  return {
    ad,
    malik,
    nitelik,
    edinmeTarihi,
    edinmeDegeri,
    tasfiyeDegeri,
    malaIliskinBorc,
    digerEsKatkilari,
    malikKisiselKatkisi,
    kredi,
  };
}

function eklenecekOku(o: Okuyucu): EklenecekDegerGirdisi {
  o.izinli(['es', 'tur', 'aciklama', 'devirTarihi', 'tutar']);
  return {
    es: o.secenek('es', TARAFLAR),
    tur: o.secenek('tur', ['son-bir-yil-bagis', 'katilma-alacagini-azaltma-kasti'] as const),
    aciklama: o.metin('aciklama'),
    devirTarihi: o.var('devirTarihi') ? o.tarih('devirTarihi') : undefined,
    tutar: o.tutar('tutar', true),
  };
}

function denklestirmeOku(o: Okuyucu): DenklestirmeGirdisi {
  o.izinli(['es', 'yon', 'aciklama', 'tutar', 'katkiTutari', 'edinmeDegeri', 'tasfiyeDegeri']);
  const es = o.secenek('es', TARAFLAR);
  const yon = o.secenek('yon', ['edinilmisten-kisisele', 'kisiselden-edinilmise'] as const);
  const aciklama = o.metin('aciklama');
  const sabitVar = o.var('tutar');
  const oranliVar = o.var('katkiTutari') || o.var('edinmeDegeri') || o.var('tasfiyeDegeri');
  if (sabitVar === oranliVar) {
    alanHatasi(o.yer, 'doğrudan borç ödemesi için "tutar", değer artışlı mala katkı için "katkiTutari", "edinmeDegeri" ve "tasfiyeDegeri" alanlarından yalnız biri seçilmeli');
  }
  if (sabitVar) {
    return { es, yon, aciklama, tutar: o.tutar('tutar', true) };
  }
  const katkiTutari = o.tutar('katkiTutari', true);
  const edinmeDegeri = o.tutar('edinmeDegeri', true);
  const tasfiyeDegeri = o.tutar('tasfiyeDegeri');
  if (katkiTutari.gt(edinmeDegeri)) {
    alanHatasi(`${o.yer}.katkiTutari`, 'katkı tutarı malın edinme değerini aşamaz');
  }
  return { es, yon, aciklama, katkiTutari, edinmeDegeri, tasfiyeDegeri };
}

function faizTercihiOku(
  o: Okuyucu,
  izinliEsaslar: readonly FaizBaslangicEsasi[],
  davaTarihi?: string,
): AileFaizTercihi {
  o.izinli(['baslangicEsasi', 'baslangicTarihi', 'gerekce']);
  const baslangicEsasi = o.secenek('baslangicEsasi', izinliEsaslar);
  const baslangicTarihi = o.var('baslangicTarihi') ? o.tarih('baslangicTarihi') : undefined;
  const gerekce = o.metin('gerekce');
  if (baslangicEsasi === 'dava-tarihi' && !baslangicTarihi && !davaTarihi) {
    alanHatasi(`${o.yer}.baslangicTarihi`, 'baslangicEsasi "dava-tarihi" seçildiğinde evlilik.davaTarihi ya da baslangicTarihi verilmeli');
  }
  if (baslangicEsasi === 'ozel-tarih' && !baslangicTarihi) {
    alanHatasi(`${o.yer}.baslangicTarihi`, 'baslangicEsasi "ozel-tarih" seçildiğinde baslangicTarihi verilmeli');
  }
  return { baslangicEsasi, baslangicTarihi, gerekce };
}

export function aileGirdiCoz(veri: unknown): AileGirdi {
  const k = Okuyucu.kok(veri);
  k.izinli(['alan', 'dosya', 'hesapTarihi', 'faizBitis', 'evlilik', 'mallar', 'eklenecekDegerler', 'denklestirmeler', 'parametreler']);
  k.secenek('alan', ['aile'] as const);

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
  const faizBitis = k.var('faizBitis') ? k.tarih('faizBitis') : undefined;

  const ev = k.alt('evlilik');
  ev.izinli(['evlenmeTarihi', 'malRejimiSonaErmeTarihi', 'sonaErmeNedeni', 'davaTarihi', 'tasfiyeTarihi']);
  const evlenmeTarihi = ev.tarih('evlenmeTarihi');
  const malRejimiSonaErmeTarihi = ev.tarih('malRejimiSonaErmeTarihi');
  if (karsilastir(malRejimiSonaErmeTarihi, evlenmeTarihi) < 0) {
    alanHatasi('girdi.evlilik.malRejimiSonaErmeTarihi', 'mal rejiminin sona erme tarihi evlenme tarihinden önce olamaz');
  }
  const evlilik = {
    evlenmeTarihi,
    malRejimiSonaErmeTarihi,
    sonaErmeNedeni: ev.metin('sonaErmeNedeni'),
    davaTarihi: ev.var('davaTarihi') ? ev.tarih('davaTarihi') : undefined,
    tasfiyeTarihi: ev.var('tasfiyeTarihi') ? ev.tarih('tasfiyeTarihi') : undefined,
  };

  const mallar = k.var('mallar') ? k.liste('mallar').map(malOku) : [];
  const eklenecekDegerler = k.var('eklenecekDegerler') ? k.liste('eklenecekDegerler').map(eklenecekOku) : [];
  const denklestirmeler = k.var('denklestirmeler') ? k.liste('denklestirmeler').map(denklestirmeOku) : [];

  if (mallar.length === 0 && eklenecekDegerler.length === 0 && denklestirmeler.length === 0) {
    alanHatasi('girdi.mallar', 'tasfiye hesabı için en az bir mal, eklenecek değer veya denkleştirme kalemi gerekli');
  }

  const parametreler: AileParametreGirdisi = {};
  if (k.var('parametreler')) {
    const p = k.alt('parametreler');
    p.izinli([
      'degerKaybiTabani',
      'degerKaybiGerekcesi',
      'katilmaOrani',
      'hakkaniyetIndirimi',
      'takasKapsami',
      'faizGunEsasi',
      'degerArtisPayiFaizi',
      'katilmaAlacagiFaizi',
    ]);
    if (p.var('degerKaybiTabani')) {
      parametreler.degerKaybiTabani = p.secenek('degerKaybiTabani', DEGER_KAYBI_SECENEKLERI);
    }
    if (p.var('degerKaybiGerekcesi')) {
      parametreler.degerKaybiGerekcesi = p.metin('degerKaybiGerekcesi');
    }
    if (parametreler.degerKaybiTabani === 'surum-orani' && !parametreler.degerKaybiGerekcesi) {
      alanHatasi('girdi.parametreler.degerKaybiGerekcesi', 'değer kaybında sürüm oranı seçildiyse yazılı anlaşma gerekçesi (TMK m.227/3) yazılmalı');
    }

    if (p.var('katilmaOrani')) {
      const ko = p.alt('katilmaOrani');
      ko.izinli(['davaci', 'davali', 'gerekce']);
      parametreler.katilmaOrani = {
        davaci: ko.oran('davaci'),
        davali: ko.oran('davali'),
        gerekce: ko.metin('gerekce'),
      };
    }

    if (p.var('hakkaniyetIndirimi')) {
      const hi = p.alt('hakkaniyetIndirimi');
      hi.izinli(['kusurluEs', 'neden', 'yeniPayOrani', 'indirimOrani', 'gerekce']);
      const kusurluEs = hi.secenek('kusurluEs', TARAFLAR);
      const neden = hi.secenek('neden', ['zina', 'hayata-kast'] as const);
      const yeniPayVar = hi.var('yeniPayOrani');
      const indirimVar = hi.var('indirimOrani');
      if (yeniPayVar === indirimVar) {
        alanHatasi(hi.yer, 'yeniPayOrani ya da indirimOrani alanlarından yalnız biri verilmeli');
      }
      const bazOran = parametreler.katilmaOrani ? parametreler.katilmaOrani[kusurluEs] : d('0.5');
      let yeniPayOrani: Decimal | undefined;
      let indirimOrani: Decimal | undefined;
      if (yeniPayVar) {
        yeniPayOrani = hi.oran('yeniPayOrani');
        if (yeniPayOrani.gt(bazOran)) {
          alanHatasi(`${hi.yer}.yeniPayOrani`, `indirimli pay oranı yasal/sözleşmesel katılma payı oranını (${bazOran.toString()}) aşamaz`);
        }
      } else {
        indirimOrani = hi.oran('indirimOrani');
      }
      parametreler.hakkaniyetIndirimi = {
        kusurluEs,
        neden,
        yeniPayOrani,
        indirimOrani,
        gerekce: hi.metin('gerekce'),
      };
    }

    if (p.var('takasKapsami')) {
      parametreler.takasKapsami = p.secenek('takasKapsami', ['yalniz-katilma', 'tum-alacaklar'] as const);
    }
    if (p.var('faizGunEsasi')) {
      parametreler.faizGunEsasi = p.sayi('faizGunEsasi', 1);
    }
    if (p.var('degerArtisPayiFaizi')) {
      parametreler.degerArtisPayiFaizi = faizTercihiOku(
        p.alt('degerArtisPayiFaizi'),
        ['tasfiye-tarihi', 'dava-tarihi', 'ozel-tarih', 'yok'] as const,
        evlilik.davaTarihi,
      );
    }
    if (p.var('katilmaAlacagiFaizi')) {
      parametreler.katilmaAlacagiFaizi = faizTercihiOku(
        p.alt('katilmaAlacagiFaizi'),
        ['tasfiye-tarihi', 'ozel-tarih', 'yok'] as const,
        evlilik.davaTarihi,
      );
    }
  }

  return {
    alan: 'aile',
    dosya,
    hesapTarihi,
    faizBitis,
    evlilik,
    mallar,
    eklenecekDegerler,
    denklestirmeler,
    parametreler,
  };
}

export function aileGirdiMetindenCoz(metin: string): AileGirdi {
  return aileGirdiCoz(parse(metin));
}
