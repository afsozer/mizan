import type { Decimal } from '../para.ts';
import type { Girdi, KalemKodu } from '../girdi.ts';
import type { Esaslar } from '../parametreler.ts';
import type { KaynakKaydi, Tablolar } from '../tablolar.ts';
import type { Ucret } from '../ucret.ts';
import { d } from '../para.ts';
import { sure, sureTopla, type YilAyGun } from '../tarih.ts';

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

/** Tek dönemde takvim süresi olduğu gibi; birden fazla dönemde toplanıp 30 gün 1 ay sayılır. */
export function toplamHizmet(g: Girdi): YilAyGun {
  const sureler = g.hizmet.donemler.map((p) => sure(p.giris, p.cikis));
  return sureler.length === 1 ? sureler[0]! : sureTopla(sureler);
}

/**
 * Kesitteki hafta sayısı. Hafta önce dönem düzeyinde bulunur ((dönem günü - düşülen) / 7, "tam"
 * seçilmişse aşağı yuvarlanır), sonra kesitlere gün sayısıyla orantılı dağıtılır; böylece sonuç
 * dönemin kaç ücret kesitine bölündüğüne bağlı olmaz.
 */
export function haftaSayisi(b: Baglam, kesitGun: number, donemGun: number, dislanacak: Decimal) {
  const ham = enAzSifir(d(donemGun).minus(dislanacak)).div(7);
  const donemHaftasi = b.esaslar.haftaHesabi === 'tam' ? ham.floor() : ham;
  const oran = d(kesitGun).div(donemGun);
  return { dusulen: dislanacak.times(oran), hafta: donemHaftasi.times(oran) };
}

function enAzSifir(x: Decimal): Decimal {
  return x.isNegative() ? d(0) : x;
}

