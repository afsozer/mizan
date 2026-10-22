// Tarihler her yerde "YYYY-AA-GG" metni olarak dolaşır; hesap UTC gün sayısıyla yapılır.

const GUN_MS = 86_400_000;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function gecerliTarih(t: string): boolean {
  const m = ISO.exec(t);
  if (!m) return false;
  const [, y, a, g] = m;
  const dt = new Date(Date.UTC(+y!, +a! - 1, +g!));
  return dt.getUTCFullYear() === +y! && dt.getUTCMonth() === +a! - 1 && dt.getUTCDate() === +g!;
}

function ms(t: string): number {
  if (!gecerliTarih(t)) throw new Error(`Geçersiz tarih: "${t}" (YYYY-AA-GG bekleniyor)`);
  const [y, a, g] = t.split('-').map(Number);
  return Date.UTC(y!, a! - 1, g!);
}

function isoYaz(zaman: number): string {
  return new Date(zaman).toISOString().slice(0, 10);
}

export function gunEkle(t: string, gun: number): string {
  return isoYaz(ms(t) + gun * GUN_MS);
}

/** b - a, gün olarak (a gün dahil değil). */
export function gunFarki(a: string, b: string): number {
  return Math.round((ms(b) - ms(a)) / GUN_MS);
}

/** a ile b arasındaki gün sayısı, iki uç dahil. */
export function dahilGun(a: string, b: string): number {
  return gunFarki(a, b) + 1;
}

export function karsilastir(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function enKucuk(a: string, b: string): string {
  return a <= b ? a : b;
}

export function enBuyuk(a: string, b: string): string {
  return a >= b ? a : b;
}

function aydakiGun(yil: number, ay: number): number {
  return new Date(Date.UTC(yil, ay, 0)).getUTCDate();
}

/** 29 Şubat'tan yıl eklenirken 28 Şubat'a düşer. */
export function yilEkle(t: string, yil: number): string {
  const [y, a, g] = t.split('-').map(Number);
  const hedefYil = y! + yil;
  const gun = Math.min(g!, aydakiGun(hedefYil, a!));
  return isoYaz(Date.UTC(hedefYil, a! - 1, gun));
}

export function yilAl(t: string): number {
  return Number(t.slice(0, 4));
}

export interface YilAyGun {
  yil: number;
  ay: number;
  gun: number;
}

/**
 * Takvim esaslı süre: giriş ve çıkış günleri dahil.
 * 01.03.2019 - 30.06.2026 → 7 yıl 4 ay 0 gün.
 */
export function sure(giris: string, cikis: string): YilAyGun {
  if (karsilastir(cikis, giris) < 0) throw new Error(`Çıkış (${cikis}) girişten (${giris}) önce`);
  const bitis = gunEkle(cikis, 1);
  const [y1, a1] = giris.split('-').map(Number);
  const [y2, a2] = bitis.split('-').map(Number);
  // Girişe sığan en çok tam ayı bul; ay eklerken ay sonuna kırpılır (31.01 + 1 ay = 29.02).
  let aylar = (y2! - y1!) * 12 + (a2! - a1!);
  while (aylar > 0 && karsilastir(ayEkle(giris, aylar), bitis) > 0) aylar -= 1;
  const gun = gunFarki(ayEkle(giris, aylar), bitis);
  return { yil: Math.floor(aylar / 12), ay: aylar % 12, gun };
}

export function ayEkle(t: string, ay: number): string {
  const [y, a, g] = t.split('-').map(Number);
  const toplam = y! * 12 + (a! - 1) + ay;
  const hedefYil = Math.floor(toplam / 12);
  const hedefAy = (toplam % 12) + 1;
  return isoYaz(Date.UTC(hedefYil, hedefAy - 1, Math.min(g!, aydakiGun(hedefYil, hedefAy))));
}

/** Birden fazla dönemin süresi toplanır; 30 gün 1 ay, 12 ay 1 yıl sayılır. */
export function sureTopla(liste: YilAyGun[]): YilAyGun {
  let yil = 0;
  let ay = 0;
  let gun = 0;
  for (const s of liste) {
    yil += s.yil;
    ay += s.ay;
    gun += s.gun;
  }
  ay += Math.floor(gun / 30);
  gun %= 30;
  yil += Math.floor(ay / 12);
  ay %= 12;
  return { yil, ay, gun };
}

export function sureYaz(s: YilAyGun): string {
  return `${s.yil} yıl ${s.ay} ay ${s.gun} gün`;
}

/** 2026-10-22 → 22.10.2026 */
export function trTarih(t: string): string {
  const [y, a, g] = t.split('-');
  return `${g}.${a}.${y}`;
}

export function bugun(): string {
  const simdi = new Date();
  const yerel = new Date(simdi.getTime() - simdi.getTimezoneOffset() * 60_000);
  return yerel.toISOString().slice(0, 10);
}
