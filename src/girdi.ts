// Girdi dosyası (YAML) okuma ve sıkı şema denetimi. Şemada olmayan alan reddedilir;
// böylece rapora ad, kimlik numarası gibi kişisel veri taşıyacak bir alan açılmaz.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { d, Decimal } from './para.ts';
import { gecerliTarih, karsilastir } from './tarih.ts';

export type KalemKodu = 'kidem' | 'ihbar' | 'yillikIzin' | 'fazlaCalisma' | 'haftaTatili' | 'ubgt';
export type FaizTuru = 'mevduat' | 'yasal';
export type UcretYontemi = 'asgari' | 'asgari-orani' | 'sabit' | 'donemsel';

export interface FaizGirdisi {
  tur: FaizTuru;
  baslangic: string;
  gerekce: string;
  /** Kısmi faiz (dava/ıslah ayrımı): verilmezse kalan tutarın tamamı. */
  tutar?: Decimal;
}

export interface TakdiriIndirim {
  oran: Decimal;
  gerekce: string;
}

export interface Mahsup {
  tutar: Decimal;
  aciklama: string;
}

interface OrtakKalem {
  faiz?: FaizGirdisi[];
  mahsup?: Mahsup;
  takdiriIndirim?: TakdiriIndirim;
}

export interface KidemGirdisi extends OrtakKalem {
  hakVar: boolean;
  gerekce: string;
}

export interface IhbarGirdisi extends OrtakKalem {
  hakVar: boolean;
  gerekce: string;
  /** 4857 m.17 sınır sürelerinde yorum farkı için elle hafta sayısı. */
  haftaSayisi?: Decimal;
}

export interface YillikIzinGirdisi extends OrtakKalem {
  kullanilanGun: Decimal;
  hakEdilenGun?: Decimal;
  ucretTuru: 'ciplak' | 'giydirilmis';
}

export interface CalismaDonemi {
  baslangic: string;
  bitis: string;
  /** Dönem içinde çalışılmayan günler (yıllık izin, rapor): hafta sayısından düşülür. */
  dislanacakGun: Decimal;
}

export interface FazlaCalismaGirdisi extends OrtakKalem {
  donemler: (CalismaDonemi & { haftalikFazlaSaat: Decimal })[];
  carpan?: Decimal;
  takdiriIndirim: TakdiriIndirim;
}

export interface HaftaTatiliGirdisi extends OrtakKalem {
  donemler: (CalismaDonemi & { haftalikGun: Decimal })[];
  carpan?: Decimal;
  takdiriIndirim: TakdiriIndirim;
}

export interface UbgtGirdisi extends OrtakKalem {
  gunler: { tarih: string; gun: Decimal; aciklama?: string }[];
  carpan?: Decimal;
  takdiriIndirim: TakdiriIndirim;
}

export interface VergiParametresi {
  yontem: 'dilim' | 'sabit';
  sabitOran?: Decimal;
  yil?: number;
  oncekiKumulatifMatrah: Decimal;
  /** GVK m.23/1-18 ve DVK (2) sayılı tablo IV-34: ödeme ayında bir kez. */
  asgariUcretIstisnasi?: boolean;
}

export interface Girdi {
  dosya: { mahkeme: string; esasNo: string; kaynak: string; altAlan: string; kisaAd?: string; hazirlayan?: string };
  hesapTarihi: string;
  faizBitis?: string;
  hizmet: {
    donemler: { giris: string; cikis: string }[];
    fesihTarihi: string;
    fesihSekli: string;
    /** Yalnız yıllık izinde yaş kuralı (4857 m.53/3) için; raporda yaş olarak görünür. */
    dogumTarihi?: string;
  };
  ucret: {
    /** "asgari" yazılırsa son ücret tarihindeki asgari ücret alınır. */
    sonBrutAylik: Decimal | 'asgari';
    sonUcretTarihi?: string;
    yontem: UcretYontemi;
    donemsel?: { baslangic: string; bitis: string; brutAylik: Decimal }[];
    yanHaklar: { ad: string; tutar: Decimal }[];
  };
  parametreler: {
    gunlukBolen?: Decimal;
    aylikCalismaSaati?: Decimal;
    haftaHesabi?: 'ondalik' | 'tam';
    faizGunEsasi?: Decimal;
    faizMatrahi?: 'brut' | 'net';
    indirimMahsupSirasi?: 'once-indirim' | 'once-mahsup';
    vergi: VergiParametresi;
  };
  tablolar?: { mevduatFaizi?: string };
  kalemler: {
    kidem?: KidemGirdisi;
    ihbar?: IhbarGirdisi;
    yillikIzin?: YillikIzinGirdisi;
    fazlaCalisma?: FazlaCalismaGirdisi;
    haftaTatili?: HaftaTatiliGirdisi;
    ubgt?: UbgtGirdisi;
  };
}

// --- Küçük şema yardımcıları ---

type Nesne = Record<string, unknown>;

class Okuyucu {
  readonly yer: string;
  readonly n: Nesne;

  constructor(yer: string, n: Nesne) {
    this.yer = yer;
    this.n = n;
  }

  static kok(veri: unknown): Okuyucu {
    if (!veri || typeof veri !== 'object' || Array.isArray(veri)) throw new Error('Girdi dosyası bir YAML nesnesi olmalı');
    return new Okuyucu('girdi', veri as Nesne);
  }

  izinli(alanlar: string[]): void {
    for (const k of Object.keys(this.n)) {
      if (!alanlar.includes(k)) {
        throw new Error(`${this.yer}: tanınmayan alan "${k}". İzinli alanlar: ${alanlar.join(', ')}`);
      }
    }
  }

  var(alan: string): boolean {
    return this.n[alan] !== undefined && this.n[alan] !== null;
  }

  alt(alan: string): Okuyucu {
    const v = this.n[alan];
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error(`${this.yer}.${alan}: nesne bekleniyor`);
    return new Okuyucu(`${this.yer}.${alan}`, v as Nesne);
  }

  liste(alan: string): Okuyucu[] {
    const v = this.n[alan];
    if (!Array.isArray(v)) throw new Error(`${this.yer}.${alan}: liste bekleniyor`);
    return v.map((o, i) => {
      if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error(`${this.yer}.${alan}[${i}]: nesne bekleniyor`);
      return new Okuyucu(`${this.yer}.${alan}[${i}]`, o as Nesne);
    });
  }

  metin(alan: string): string {
    const v = this.n[alan];
    if (typeof v !== 'string' || !v.trim()) throw new Error(`${this.yer}.${alan}: boş olmayan metin bekleniyor`);
    return v.trim();
  }

  tarih(alan: string): string {
    const v = this.n[alan];
    const t = v instanceof Date ? v.toISOString().slice(0, 10) : v;
    if (typeof t !== 'string' || !gecerliTarih(t)) throw new Error(`${this.yer}.${alan}: YYYY-AA-GG tarih bekleniyor`);
    return t;
  }

  sayi(alan: string, enAz = 0): Decimal {
    const v = this.n[alan];
    if (typeof v !== 'number' && (typeof v !== 'string' || !/^-?\d+(\.\d+)?$/.test(v.trim()))) {
      throw new Error(`${this.yer}.${alan}: sayı bekleniyor (ondalık ayırıcı nokta)`);
    }
    const s = d(typeof v === 'number' ? String(v) : v.trim());
    if (s.lt(enAz)) throw new Error(`${this.yer}.${alan}: ${enAz} ya da daha büyük olmalı`);
    return s;
  }

  /** TL tutarı: en fazla iki ondalık (kuruş). */
  tutar(alan: string): Decimal {
    const s = this.sayi(alan);
    if (s.decimalPlaces() > 2) throw new Error(`${this.yer}.${alan}: tutar en fazla iki ondalık (kuruş) olmalı`);
    return s;
  }

  oran(alan: string): Decimal {
    const s = this.sayi(alan);
    if (s.gt(1)) throw new Error(`${this.yer}.${alan}: oran 0 ile 1 arasında yazılır (%30 → 0.30)`);
    return s;
  }

  mantiksal(alan: string): boolean {
    const v = this.n[alan];
    if (typeof v !== 'boolean') throw new Error(`${this.yer}.${alan}: true/false bekleniyor`);
    return v;
  }

  secenek<T extends string>(alan: string, secenekler: readonly T[]): T {
    const v = this.n[alan];
    if (typeof v !== 'string' || !secenekler.includes(v as T)) {
      throw new Error(`${this.yer}.${alan}: ${secenekler.join(' | ')} değerlerinden biri olmalı`);
    }
    return v as T;
  }
}

function faizOku(o: Okuyucu): FaizGirdisi[] | undefined {
  if (!o.var('faiz')) return undefined;
  const liste = o.liste('faiz').map((f) => {
    f.izinli(['tur', 'baslangic', 'gerekce', 'tutar']);
    return {
      tur: f.secenek('tur', ['mevduat', 'yasal'] as const),
      baslangic: f.tarih('baslangic'),
      gerekce: f.metin('gerekce'),
      tutar: f.var('tutar') ? f.tutar('tutar') : undefined,
    };
  });
  const kalanli = liste.filter((f) => f.tutar === undefined);
  if (kalanli.length > 1) throw new Error(`${o.yer}.faiz: tutarı boş bırakılan (kalan) en fazla bir satır olabilir`);
  if (kalanli.length === 1 && liste[liste.length - 1]!.tutar !== undefined) {
    throw new Error(`${o.yer}.faiz: tutarı boş satır (kalan) listenin sonunda olmalı`);
  }
  return liste;
}

function ortakOku(o: Okuyucu): OrtakKalem {
  let mahsup: Mahsup | undefined;
  if (o.var('mahsup')) {
    const m = o.alt('mahsup');
    m.izinli(['tutar', 'aciklama']);
    mahsup = { tutar: m.tutar('tutar'), aciklama: m.metin('aciklama') };
  }
  return { faiz: faizOku(o), mahsup, takdiriIndirim: o.var('takdiriIndirim') ? indirimOku(o) : undefined };
}

function indirimOku(o: Okuyucu): TakdiriIndirim {
  if (!o.var('takdiriIndirim')) {
    throw new Error(`${o.yer}.takdiriIndirim: bu kalemde açıkça yazılmalı (indirim yoksa oran: 0 ve gerekçe)`);
  }
  const t = o.alt('takdiriIndirim');
  t.izinli(['oran', 'gerekce']);
  return { oran: t.oran('oran'), gerekce: t.metin('gerekce') };
}

function donemOku<A extends string>(o: Okuyucu, ekAlan: A): CalismaDonemi & Record<A, Decimal> {
  o.izinli(['baslangic', 'bitis', 'dislanacakGun', ekAlan]);
  const baslangic = o.tarih('baslangic');
  const bitis = o.tarih('bitis');
  if (karsilastir(bitis, baslangic) < 0) throw new Error(`${o.yer}: bitiş başlangıçtan önce`);
  return {
    baslangic,
    bitis,
    dislanacakGun: o.var('dislanacakGun') ? o.sayi('dislanacakGun') : d(0),
    [ekAlan]: o.sayi(ekAlan),
  } as CalismaDonemi & Record<A, Decimal>;
}

const ORTAK = ['faiz', 'mahsup', 'takdiriIndirim'];

export function girdiCoz(veri: unknown): Girdi {
  const k = Okuyucu.kok(veri);
  k.izinli(['dosya', 'hesapTarihi', 'faizBitis', 'hizmet', 'ucret', 'parametreler', 'tablolar', 'kalemler']);

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

  const h = k.alt('hizmet');
  h.izinli(['donemler', 'fesihTarihi', 'fesihSekli', 'dogumTarihi']);
  const donemler = h.liste('donemler').map((p) => {
    p.izinli(['giris', 'cikis']);
    const giris = p.tarih('giris');
    const cikis = p.tarih('cikis');
    if (karsilastir(cikis, giris) < 0) throw new Error(`${p.yer}: çıkış girişten önce`);
    return { giris, cikis };
  });
  if (donemler.length === 0) throw new Error('girdi.hizmet.donemler: en az bir dönem gerekli');
  for (let i = 1; i < donemler.length; i++) {
    if (karsilastir(donemler[i]!.giris, donemler[i - 1]!.cikis) <= 0) {
      throw new Error('girdi.hizmet.donemler: dönemler sıralı ve çakışmasız olmalı');
    }
  }
  const hizmet = {
    donemler,
    fesihTarihi: h.tarih('fesihTarihi'),
    fesihSekli: h.metin('fesihSekli'),
    dogumTarihi: h.var('dogumTarihi') ? h.tarih('dogumTarihi') : undefined,
  };

  const u = k.alt('ucret');
  u.izinli(['sonBrutAylik', 'sonUcretTarihi', 'yontem', 'donemsel', 'yanHaklar']);
  const yontem = u.secenek('yontem', ['asgari', 'asgari-orani', 'sabit', 'donemsel'] as const);
  const ucret = {
    sonBrutAylik: u.n.sonBrutAylik === 'asgari' ? ('asgari' as const) : u.tutar('sonBrutAylik'),
    sonUcretTarihi: u.var('sonUcretTarihi') ? u.tarih('sonUcretTarihi') : undefined,
    yontem,
    donemsel: u.var('donemsel')
      ? u.liste('donemsel').map((p) => {
          p.izinli(['baslangic', 'bitis', 'brutAylik']);
          return { baslangic: p.tarih('baslangic'), bitis: p.tarih('bitis'), brutAylik: p.tutar('brutAylik') };
        })
      : undefined,
    yanHaklar: u.var('yanHaklar')
      ? u.liste('yanHaklar').map((y) => {
          y.izinli(['ad', 'tutar']);
          return { ad: y.metin('ad'), tutar: y.tutar('tutar') };
        })
      : [],
  };
  if (yontem === 'donemsel' && !ucret.donemsel?.length) throw new Error('girdi.ucret.donemsel: yöntem "donemsel" ise dönem listesi gerekli');
  if (yontem !== 'donemsel' && ucret.donemsel) throw new Error('girdi.ucret.donemsel: yalnız yöntem "donemsel" iken kullanılır');

  const p = k.alt('parametreler');
  p.izinli(['gunlukBolen', 'aylikCalismaSaati', 'haftaHesabi', 'faizGunEsasi', 'faizMatrahi', 'indirimMahsupSirasi', 'vergi']);
  const v = p.alt('vergi');
  v.izinli(['yontem', 'sabitOran', 'yil', 'oncekiKumulatifMatrah', 'asgariUcretIstisnasi']);
  const vergiYontem = v.secenek('yontem', ['dilim', 'sabit'] as const);
  if (vergiYontem === 'dilim' && v.var('sabitOran')) throw new Error('girdi.parametreler.vergi.sabitOran: yalnız yöntem "sabit" iken kullanılır');
  const vergi: VergiParametresi = {
    yontem: vergiYontem,
    sabitOran: vergiYontem === 'sabit' ? v.oran('sabitOran') : undefined,
    yil: v.var('yil') ? v.sayi('yil').toNumber() : undefined,
    oncekiKumulatifMatrah: v.var('oncekiKumulatifMatrah') ? v.sayi('oncekiKumulatifMatrah') : d(0),
    asgariUcretIstisnasi: v.var('asgariUcretIstisnasi') ? v.mantiksal('asgariUcretIstisnasi') : undefined,
  };
  const parametreler = {
    gunlukBolen: p.var('gunlukBolen') ? p.sayi('gunlukBolen', 1) : undefined,
    aylikCalismaSaati: p.var('aylikCalismaSaati') ? p.sayi('aylikCalismaSaati', 1) : undefined,
    haftaHesabi: p.var('haftaHesabi') ? p.secenek('haftaHesabi', ['ondalik', 'tam'] as const) : undefined,
    faizGunEsasi: p.var('faizGunEsasi') ? p.sayi('faizGunEsasi', 1) : undefined,
    faizMatrahi: p.var('faizMatrahi') ? p.secenek('faizMatrahi', ['brut', 'net'] as const) : undefined,
    indirimMahsupSirasi: p.var('indirimMahsupSirasi')
      ? p.secenek('indirimMahsupSirasi', ['once-indirim', 'once-mahsup'] as const)
      : undefined,
    vergi,
  };

  let tablolar: Girdi['tablolar'];
  if (k.var('tablolar')) {
    const t = k.alt('tablolar');
    t.izinli(['mevduatFaizi']);
    tablolar = { mevduatFaizi: t.var('mevduatFaizi') ? t.metin('mevduatFaizi') : undefined };
  }

  const km = k.alt('kalemler');
  km.izinli(['kidem', 'ihbar', 'yillikIzin', 'fazlaCalisma', 'haftaTatili', 'ubgt']);
  const kalemler: Girdi['kalemler'] = {};
  if (km.var('kidem')) {
    const o = km.alt('kidem');
    o.izinli(['hakVar', 'gerekce', ...ORTAK]);
    kalemler.kidem = { hakVar: o.mantiksal('hakVar'), gerekce: o.metin('gerekce'), ...ortakOku(o) };
  }
  if (km.var('ihbar')) {
    const o = km.alt('ihbar');
    o.izinli(['hakVar', 'gerekce', 'haftaSayisi', ...ORTAK]);
    kalemler.ihbar = {
      hakVar: o.mantiksal('hakVar'),
      gerekce: o.metin('gerekce'),
      haftaSayisi: o.var('haftaSayisi') ? o.sayi('haftaSayisi', 1) : undefined,
      ...ortakOku(o),
    };
  }
  if (km.var('yillikIzin')) {
    const o = km.alt('yillikIzin');
    o.izinli(['kullanilanGun', 'hakEdilenGun', 'ucretTuru', ...ORTAK]);
    kalemler.yillikIzin = {
      kullanilanGun: o.sayi('kullanilanGun'),
      hakEdilenGun: o.var('hakEdilenGun') ? o.sayi('hakEdilenGun') : undefined,
      ucretTuru: o.secenek('ucretTuru', ['ciplak', 'giydirilmis'] as const),
      ...ortakOku(o),
    };
  }
  if (km.var('fazlaCalisma')) {
    const o = km.alt('fazlaCalisma');
    o.izinli(['donemler', 'carpan', ...ORTAK]);
    kalemler.fazlaCalisma = {
      ...ortakOku(o),
      donemler: o.liste('donemler').map((x) => donemOku(x, 'haftalikFazlaSaat')),
      carpan: o.var('carpan') ? o.sayi('carpan') : undefined,
      takdiriIndirim: indirimOku(o),
    };
  }
  if (km.var('haftaTatili')) {
    const o = km.alt('haftaTatili');
    o.izinli(['donemler', 'carpan', ...ORTAK]);
    kalemler.haftaTatili = {
      ...ortakOku(o),
      donemler: o.liste('donemler').map((x) => donemOku(x, 'haftalikGun')),
      carpan: o.var('carpan') ? o.sayi('carpan') : undefined,
      takdiriIndirim: indirimOku(o),
    };
  }
  if (km.var('ubgt')) {
    const o = km.alt('ubgt');
    o.izinli(['gunler', 'carpan', ...ORTAK]);
    kalemler.ubgt = {
      ...ortakOku(o),
      gunler: o.liste('gunler').map((g) => {
        g.izinli(['tarih', 'gun', 'aciklama']);
        return { tarih: g.tarih('tarih'), gun: g.sayi('gun'), aciklama: g.var('aciklama') ? g.metin('aciklama') : undefined };
      }),
      carpan: o.var('carpan') ? o.sayi('carpan') : undefined,
      takdiriIndirim: indirimOku(o),
    };
  }
  if (Object.keys(kalemler).length === 0) throw new Error('girdi.kalemler: en az bir kalem gerekli');

  const icinde = (bas: string, bit: string) =>
    donemler.some((p) => karsilastir(p.giris, bas) <= 0 && karsilastir(bit, p.cikis) <= 0);
  for (const kod of ['fazlaCalisma', 'haftaTatili'] as const) {
    const liste = [...(kalemler[kod]?.donemler ?? [])].sort((a, b) => karsilastir(a.baslangic, b.baslangic));
    liste.forEach((p, i) => {
      if (!icinde(p.baslangic, p.bitis)) {
        throw new Error(`girdi.kalemler.${kod}: ${p.baslangic} - ${p.bitis} dönemi tek bir hizmet döneminin içinde değil`);
      }
      const onceki = liste[i - 1];
      if (onceki && karsilastir(p.baslangic, onceki.bitis) <= 0) throw new Error(`girdi.kalemler.${kod}: dönemler çakışıyor`);
    });
  }
  for (const g of kalemler.ubgt?.gunler ?? []) {
    if (!icinde(g.tarih, g.tarih)) throw new Error(`girdi.kalemler.ubgt: ${g.tarih} hizmet dönemlerinin dışında`);
  }
  const mevduatVar = Object.values(kalemler).some((kg) => kg?.faiz?.some((f) => f.tur === 'mevduat'));
  if (tablolar?.mevduatFaizi && !mevduatVar) {
    throw new Error('girdi.tablolar.mevduatFaizi: hiçbir kalemde mevduat faizi yok; alan kullanılmıyor');
  }

  return {
    dosya,
    hesapTarihi: k.tarih('hesapTarihi'),
    faizBitis: k.var('faizBitis') ? k.tarih('faizBitis') : undefined,
    hizmet,
    ucret,
    parametreler,
    tablolar,
    kalemler,
  };
}

export function girdiOku(yol: string): { girdi: Girdi; metin: string; ozet: string } {
  const metin = readFileSync(yol, 'utf8');
  const girdi = girdiCoz(parse(metin));
  const mevduat = girdi.tablolar?.mevduatFaizi;
  if (mevduat && mevduat !== 'kamu') girdi.tablolar!.mevduatFaizi = resolve(dirname(yol), mevduat);
  return { girdi, metin, ozet: createHash('sha256').update(metin).digest('hex') };
}
