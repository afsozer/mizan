// İcra kapak hesabı girdi şeması ve sıkı denetimi (Faz 2).
// Şemada olmayan alan reddedilir; rapora kişisel veri sızması önlenir.
import { parse } from 'yaml';
import { GirdiHatasi } from '../girdi.ts';
import { d, Decimal } from '../para.ts';
import { gecerliTarih, karsilastir } from '../tarih.ts';

export type HesapAlani = 'iscilik' | 'icra';
export type IcraTakipTuru = 'ilamsiz' | 'ilamli' | 'kambiyo';
export type IcraFaizTuru = 'yasal' | 'avans' | 'reeskont' | 'sozlesme';
export type TahsilHarciAsamasi =
  | 'tebligden-once'
  | 'hacizden-once'
  | 'satistan-once'
  | 'satistan-sonra'
  | 'maas-haczi';

export interface TakipOncesiKalem {
  ad: string;
  tutar: Decimal;
  aciklama?: string;
}

export interface IcraFaizGirdisi {
  tur: IcraFaizTuru;
  sozlesmeOrani?: Decimal;
  gerekce: string;
}

export interface IcraMasrafi {
  tarih: string;
  aciklama: string;
  tutar: Decimal;
}

export interface KismiOdeme {
  tarih: string;
  tutar: Decimal;
  aciklama: string;
}

export interface IcraTakipGirdisi {
  takipTarihi: string;
  takipTuru: IcraTakipTuru;
  asilAlacak: Decimal;
  takipOncesiKalemler: TakipOncesiKalem[];
  faiz: IcraFaizGirdisi;
  pesinHarcAlindiMi: boolean;
  tahsilHarciAsamasi: TahsilHarciAsamasi;
  feragatVarMi: boolean;
  vekaletUcreti: Decimal;
  masraflar: IcraMasrafi[];
  kismiOdemeler: KismiOdeme[];
}

export interface IcraGirdisi {
  alan: 'icra';
  dosya: {
    mahkeme: string;
    esasNo: string;
    kaynak: string;
    altAlan: string;
    kisaAd?: string;
    hazirlayan?: string;
  };
  hesapTarihi: string;
  parametreler?: {
    faizGunEsasi?: Decimal;
  };
  takip: IcraTakipGirdisi;
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
        alanHatasi(this.yer, `tanınmayan alan "${k}". İzinli alanlar: ${alanlar.join(', ')}`);
      }
    }
  }

  var(alan: string): boolean {
    return this.n[alan] !== undefined && this.n[alan] !== null;
  }

  alt(alan: string): Okuyucu {
    const v = this.n[alan];
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      alanHatasi(`${this.yer}.${alan}`, 'nesne bekleniyor');
    }
    return new Okuyucu(`${this.yer}.${alan}`, v as Nesne);
  }

  liste(alan: string): Okuyucu[] {
    const v = this.n[alan];
    if (!Array.isArray(v)) alanHatasi(`${this.yer}.${alan}`, 'liste bekleniyor');
    return v.map((o, i) => {
      if (!o || typeof o !== 'object' || Array.isArray(o)) {
        alanHatasi(`${this.yer}.${alan}[${i}]`, 'nesne bekleniyor');
      }
      return new Okuyucu(`${this.yer}.${alan}[${i}]`, o as Nesne);
    });
  }

  metin(alan: string): string {
    const v = this.n[alan];
    if (typeof v !== 'string' || !v.trim()) {
      alanHatasi(`${this.yer}.${alan}`, 'boş olmayan metin bekleniyor');
    }
    return v.trim();
  }

  tarih(alan: string): string {
    const v = this.n[alan];
    const t = v instanceof Date ? v.toISOString().slice(0, 10) : v;
    if (typeof t !== 'string' || !gecerliTarih(t)) {
      alanHatasi(`${this.yer}.${alan}`, 'YYYY-AA-GG tarih bekleniyor');
    }
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
    if (s.decimalPlaces() > 2) {
      alanHatasi(`${this.yer}.${alan}`, 'tutar en fazla iki ondalık (kuruş) olmalı');
    }
    return s;
  }

  oran(alan: string): Decimal {
    const s = this.sayi(alan);
    if (s.lte(0) || s.gt(1)) {
      alanHatasi(`${this.yer}.${alan}`, 'oran 0 ile 1 arasında yazılır (%30 -> 0.30)');
    }
    return s;
  }

  mantiksal(alan: string): boolean {
    const v = this.n[alan];
    if (typeof v !== 'boolean') alanHatasi(`${this.yer}.${alan}`, 'true/false bekleniyor');
    return v;
  }

  secenek<T extends string>(alan: string, secenekler: readonly T[]): T {
    const v = this.n[alan];
    if (typeof v !== 'string' || !secenekler.includes(v as T)) {
      alanHatasi(`${this.yer}.${alan}`, `${secenekler.join(' | ')} değerlerinden biri olmalı`);
    }
    return v as T;
  }
}

/** Ayrıştırılmış YAML nesnesinin üst düzey `alan` değerini okur (`alan` verilmezse `'iscilik'`). */
export function alanOku(veri: unknown): HesapAlani {
  const k = Okuyucu.kok(veri);
  if (!k.var('alan')) return 'iscilik';
  return k.secenek('alan', ['iscilik', 'icra'] as const);
}

/** YAML metninden üst düzey hesap alanını (`'iscilik' | 'icra'`) algılar. */
export function metindenAlanOku(metin: string): HesapAlani {
  return alanOku(parse(metin));
}

export function icraGirdiCoz(veri: unknown): IcraGirdisi {
  const k = Okuyucu.kok(veri);
  k.izinli(['alan', 'dosya', 'hesapTarihi', 'parametreler', 'takip']);

  if (!k.var('alan') || k.secenek('alan', ['icra'] as const) !== 'icra') {
    alanHatasi('girdi.alan', 'icra kapak hesabı için üst düzeyde "alan: icra" zorunludur');
  }

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

  let parametreler: IcraGirdisi['parametreler'];
  if (k.var('parametreler')) {
    const p = k.alt('parametreler');
    p.izinli(['faizGunEsasi']);
    const faizGunEsasi = p.var('faizGunEsasi') ? p.sayi('faizGunEsasi', 1) : undefined;
    if (faizGunEsasi && !faizGunEsasi.eq(365) && !faizGunEsasi.eq(360)) {
      alanHatasi('girdi.parametreler.faizGunEsasi', '365 ya da 360 olmalı');
    }
    parametreler = { faizGunEsasi };
  }

  const t = k.alt('takip');
  t.izinli([
    'takipTarihi',
    'takipTuru',
    'asilAlacak',
    'takipOncesiKalemler',
    'faiz',
    'pesinHarcAlindiMi',
    'tahsilHarciAsamasi',
    'feragatVarMi',
    'vekaletUcreti',
    'masraflar',
    'kismiOdemeler',
  ]);

  const takipTarihi = t.tarih('takipTarihi');
  if (karsilastir(hesapTarihi, takipTarihi) < 0) {
    alanHatasi('girdi.hesapTarihi', 'takipTarihi tarihinden önce olamaz');
  }

  const takipTuru = t.secenek('takipTuru', ['ilamsiz', 'ilamli', 'kambiyo'] as const);
  const asilAlacak = t.tutar('asilAlacak');
  if (asilAlacak.lte(0)) {
    alanHatasi('girdi.takip.asilAlacak', '0 değerinden büyük olmalı');
  }

  const takipOncesiKalemler: TakipOncesiKalem[] = t.var('takipOncesiKalemler')
    ? t.liste('takipOncesiKalemler').map((ok) => {
        ok.izinli(['ad', 'tutar', 'aciklama']);
        const ad = ok.var('ad') ? ok.metin('ad') : ok.metin('aciklama');
        const tutar = ok.tutar('tutar');
        const aciklama = ok.var('aciklama') ? ok.metin('aciklama') : undefined;
        return { ad, tutar, aciklama };
      })
    : [];

  const fz = t.alt('faiz');
  fz.izinli(['tur', 'sozlesmeOrani', 'gerekce']);
  const faizTuru = fz.secenek('tur', ['yasal', 'avans', 'reeskont', 'sozlesme'] as const);
  const sozlesmeOrani = fz.var('sozlesmeOrani') ? fz.oran('sozlesmeOrani') : undefined;
  if (faizTuru === 'sozlesme' && !sozlesmeOrani) {
    alanHatasi('girdi.takip.faiz.sozlesmeOrani', 'faiz türü "sozlesme" olduğunda zorunludur');
  }
  if (faizTuru !== 'sozlesme' && sozlesmeOrani !== undefined) {
    alanHatasi('girdi.takip.faiz.sozlesmeOrani', 'yalnız faiz türü "sozlesme" olduğunda verilir');
  }
  const faiz: IcraFaizGirdisi = {
    tur: faizTuru,
    ...(sozlesmeOrani ? { sozlesmeOrani } : {}),
    gerekce: fz.metin('gerekce'),
  };

  const pesinHarcAlindiMi = t.var('pesinHarcAlindiMi')
    ? t.mantiksal('pesinHarcAlindiMi')
    : takipTuru !== 'ilamli';
  if (takipTuru === 'ilamli' && pesinHarcAlindiMi) {
    alanHatasi(
      'girdi.takip.pesinHarcAlindiMi',
      '492 s.K. m.29 gereği yalnız ilama dayanmayan takiplerde peşin harç alınır; ilamlı takipte true olamaz',
    );
  }

  const tahsilHarciAsamasi = t.secenek('tahsilHarciAsamasi', [
    'tebligden-once',
    'hacizden-once',
    'satistan-once',
    'satistan-sonra',
    'maas-haczi',
  ] as const);

  const feragatVarMi = t.var('feragatVarMi') ? t.mantiksal('feragatVarMi') : false;
  const vekaletUcreti = t.var('vekaletUcreti') ? t.tutar('vekaletUcreti') : d(0);

  const masraflar: IcraMasrafi[] = t.var('masraflar')
    ? t.liste('masraflar').map((m) => {
        m.izinli(['tarih', 'ad', 'tutar', 'aciklama']);
        const tarih = m.var('tarih') ? m.tarih('tarih') : takipTarihi;
        if (karsilastir(tarih, takipTarihi) < 0 || karsilastir(tarih, hesapTarihi) > 0) {
          alanHatasi(`${m.yer}.tarih`, 'masraf tarihi takipTarihi ile hesapTarihi arasında olmalı');
        }
        const aciklama = m.var('aciklama') ? m.metin('aciklama') : m.metin('ad');
        const tutar = m.tutar('tutar');
        return { tarih, aciklama, tutar };
      })
    : [];

  const kismiOdemeler: KismiOdeme[] = t.var('kismiOdemeler')
    ? t.liste('kismiOdemeler').map((ko) => {
        ko.izinli(['tarih', 'tutar', 'aciklama']);
        const tarih = ko.tarih('tarih');
        if (karsilastir(tarih, takipTarihi) < 0 || karsilastir(tarih, hesapTarihi) > 0) {
          alanHatasi(`${ko.yer}.tarih`, 'kısmi ödeme tarihi takipTarihi ile hesapTarihi arasında olmalı');
        }
        const tutar = ko.tutar('tutar');
        if (tutar.lte(0)) {
          alanHatasi(`${ko.yer}.tutar`, 'kısmi ödeme tutarı 0 değerinden büyük olmalı');
        }
        const aciklama = ko.var('aciklama') ? ko.metin('aciklama') : 'Kısmi ödeme';
        return { tarih, tutar, aciklama };
      })
    : [];

  return {
    alan: 'icra',
    dosya,
    hesapTarihi,
    ...(parametreler ? { parametreler } : {}),
    takip: {
      takipTarihi,
      takipTuru,
      asilAlacak,
      takipOncesiKalemler,
      faiz,
      pesinHarcAlindiMi,
      tahsilHarciAsamasi,
      feragatVarMi,
      vekaletUcreti,
      masraflar,
      kismiOdemeler,
    },
  };
}

/** YAML metninden icra girdisi (dosya erişimi yok; tarayıcıda da çalışır). */
export function icraGirdiMetindenCoz(metin: string): IcraGirdisi {
  return icraGirdiCoz(parse(metin));
}
