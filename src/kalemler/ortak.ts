import type { Decimal } from '../para.ts';
import type { Girdi, KalemKodu, Mahsup } from '../girdi.ts';
import type { Esaslar } from '../parametreler.ts';
import type { KaynakKaydi, Tablolar } from '../tablolar.ts';
import type { Ucret } from '../ucret.ts';
import { d } from '../para.ts';
import { dahilGun, sure, sureTopla, sureYaz, trTarih, type YilAyGun } from '../tarih.ts';

export interface Baglam {
  girdi: Girdi;
  tablolar: Tablolar;
  kayit: KaynakKaydi;
  esaslar: Esaslar;
  ucret: Ucret;
}

export interface DetayTablo {
  basliklar: string[];
  satirlar: string[][];
  toplam?: string[];
}

/** Kesinti türü: kıdemde yalnız damga, ihbarda gelir ve damga, ücret niteliğindekilerde SGK dahil hepsi. */
export type KesintiTuru = 'kidem' | 'ihbar' | 'ucret';

export interface KalemHesabi {
  kod: KalemKodu;
  ad: string;
  dayanak: string[];
  formul: string[];
  bilgiler: [string, string][];
  detay?: DetayTablo;
  /** Ana tablodan sonra basılan ek tablolar (ör. önceki ödemelerin faizli mahsubu). */
  ekDetaylar?: { baslik: string; tablo: DetayTablo }[];
  /** Kalemin kendi hesapladığı mahsup (girdideki mahsup yerine geçer). */
  hesaplananMahsup?: Mahsup;
  /** Takdiri indirim ve mahsuptan önceki brüt, kuruşa yuvarlanmış. */
  hamBrut: Decimal;
  kesintiTuru: KesintiTuru;
  notlar: string[];
}

export const KALEM_ADLARI: Record<KalemKodu, string> = {
  kidem: 'Kıdem tazminatı',
  ihbar: 'İhbar tazminatı',
  yillikIzin: 'Yıllık izin ücreti',
  fazlaCalisma: 'Fazla çalışma ücreti',
  haftaTatili: 'Hafta tatili ücreti',
  ubgt: 'Ulusal bayram ve genel tatil ücreti',
};

/** Gün sayısını 1 yıl 365, 1 ay 30 gün kabulüyle yıl/ay/güne çevirir. */
export function gundenSure(gun: number): YilAyGun {
  const yil = Math.floor(gun / 365);
  const kalan = gun - yil * 365;
  return { yil, ay: Math.floor(kalan / 30), gun: kalan % 30 };
}

type Donem = Girdi['hizmet']['donemler'][number];

/**
 * Hizmet süresi. Takvim esasında tek dönem olduğu gibi, birden fazla dönem toplanıp 30 gün 1 ay
 * sayılır. Gün esasında dönemlerin gün sayıları (iki uç dahil) toplanır, düşülecek günler çıkarılır.
 */
export function hizmetSuresi(g: Girdi, donemler: Donem[] = g.hizmet.donemler, dusulecek = true): YilAyGun {
  if (g.parametreler.sureHesabi === 'gun') {
    const toplam = donemler.reduce((t, p) => t + dahilGun(p.giris, p.cikis), 0);
    const dusulen = dusulecek ? (g.hizmet.dislanacakGun?.toNumber() ?? 0) : 0;
    return gundenSure(Math.max(0, toplam - dusulen));
  }
  const sureler = donemler.map((p) => sure(p.giris, p.cikis));
  return sureler.length === 1 ? sureler[0]! : sureTopla(sureler);
}

export function toplamHizmet(g: Girdi): YilAyGun {
  return hizmetSuresi(g);
}

/** Bir hizmet döneminin rapor satırı: tarihler ve seçilen esasa göre süresi. */
export function donemYaz(g: Girdi, p: Donem): string {
  const sureMetni = g.parametreler.sureHesabi === 'gun' ? `${dahilGun(p.giris, p.cikis)} gün` : sureYaz(sure(p.giris, p.cikis));
  return `${trTarih(p.giris)} - ${trTarih(p.cikis)} (${sureMetni})`;
}

/** Raporda sürenin nasıl bulunduğunu anlatan metin. */
export function sureAciklamasi(g: Girdi, donemler: Donem[] = g.hizmet.donemler, dusulecek = true): string {
  const s = sureYaz(hizmetSuresi(g, donemler, dusulecek));
  if (g.parametreler.sureHesabi !== 'gun') return s;
  const toplam = donemler.reduce((t, p) => t + dahilGun(p.giris, p.cikis), 0);
  const dusulen = dusulecek ? (g.hizmet.dislanacakGun?.toNumber() ?? 0) : 0;
  const dusme = dusulen ? `, düşülen ${dusulen} gün: ${g.hizmet.dislanacakGerekce}` : '';
  return `${s}; gün esası: ${toplam} gün${dusme}; 1 yıl 365, 1 ay 30 gün`;
}

/**
 * Kesitteki hafta sayısı. Hafta önce dönem düzeyinde bulunur ((dönem günü - düşülen) / 7, "tam"
 * seçilmişse aşağı yuvarlanır), sonra kesitlere gün sayısıyla orantılı dağıtılır; böylece sonuç
 * dönemin kaç ücret kesitine bölündüğüne bağlı olmaz.
 */
export function haftaSayisi(b: Baglam, kesitGun: number, donemGun: number, dislanacak: Decimal, verilen?: Decimal) {
  const ham = enAzSifir(d(donemGun).minus(dislanacak)).div(7);
  const donemHaftasi = verilen ?? (b.esaslar.haftaHesabi === 'tam' ? ham.floor() : ham);
  const oran = d(kesitGun).div(donemGun);
  return { dusulen: dislanacak.times(oran), hafta: donemHaftasi.times(oran) };
}

function enAzSifir(x: Decimal): Decimal {
  return x.isNegative() ? d(0) : x;
}

