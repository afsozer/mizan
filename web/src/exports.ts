import {
  aautKanitDosyaAdi,
  aautRaporTanimi,
  aautUdfDosyaAdi,
  aautUdfOlustur,
  aileKanitDosyaAdi,
  aileRaporTanimi,
  aileUdfDosyaAdi,
  aileUdfOlustur,
  icraKanitDosyaAdi,
  icraRaporTanimi,
  icraUdfDosyaAdi,
  icraUdfOlustur,
  kanitDosyaAdi,
  raporTanimi,
  surumYaz,
  udfDosyaAdi,
  udfOlustur,
} from '../../src/index.ts';
import type { AautHesapSonucu, AileHesapSonucu, HesapSonucu, IcraHesapSonucu, RaporBilgisi } from '../../src/index.ts';
import { sha256 } from './tables.ts';

export const surum = () => surumYaz(__MIZAN_SURUM__);
export function uretimTarihi(zaman = new Date()): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Istanbul' }).format(zaman);
}
export function indir(icerik: string | Blob, ad: string, tur = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(typeof icerik === 'string' ? new Blob([icerik], { type: tur }) : icerik);
  const a = document.createElement('a');
  a.href = url;
  a.download = ad;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function raporBilgisiKur(yaml: string, zaman: Date): Promise<RaporBilgisi> {
  return {
    surum: surum(),
    girdiOzeti: await sha256(yaml),
    uretimZamani: new Intl.DateTimeFormat('tr-TR', {
      timeZone: 'Europe/Istanbul',
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(zaman),
  };
}

async function pdfDosyasiIndir<T>(
  sonuc: T,
  yaml: string,
  tanimiKur: (s: T, bilgi: RaporBilgisi) => Record<string, unknown>,
  dosyaAdi: (s: T, tarih: string) => string,
) {
  const zaman = new Date();
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake.js'), import('pdfmake/build/vfs_fonts.js'),
  ]);
  pdfMake.addVirtualFileSystem(vfs);
  const tanim = tanimiKur(sonuc, await raporBilgisiKur(yaml, zaman));
  const blob = await pdfMake.createPdf(tanim).getBlob();
  indir(blob, dosyaAdi(sonuc, uretimTarihi(zaman)));
}

async function udfDosyasiIndir<T>(
  sonuc: T,
  yaml: string,
  olustur: (s: T, bilgi: RaporBilgisi) => Uint8Array,
  dosyaAdi: (s: T, tarih: string) => string,
) {
  const zaman = new Date();
  const baytlar = olustur(sonuc, await raporBilgisiKur(yaml, zaman));
  const kopya = new Uint8Array(baytlar.byteLength);
  kopya.set(baytlar);
  indir(new Blob([kopya.buffer], { type: 'application/zip' }), dosyaAdi(sonuc, uretimTarihi(zaman)));
}

export async function pdfIndir(sonuc: HesapSonucu, yaml: string) {
  await pdfDosyasiIndir(sonuc, yaml, raporTanimi, kanitDosyaAdi);
}
export async function udfIndir(sonuc: HesapSonucu, yaml: string) {
  await udfDosyasiIndir(sonuc, yaml, udfOlustur, udfDosyaAdi);
}
export async function icraPdfIndir(sonuc: IcraHesapSonucu, yaml: string) {
  await pdfDosyasiIndir(sonuc, yaml, icraRaporTanimi, icraKanitDosyaAdi);
}
export async function icraUdfIndir(sonuc: IcraHesapSonucu, yaml: string) {
  await udfDosyasiIndir(sonuc, yaml, icraUdfOlustur, icraUdfDosyaAdi);
}
export async function aautPdfIndir(sonuc: AautHesapSonucu, yaml: string) {
  await pdfDosyasiIndir(sonuc, yaml, aautRaporTanimi, aautKanitDosyaAdi);
}
export async function aautUdfIndir(sonuc: AautHesapSonucu, yaml: string) {
  await udfDosyasiIndir(sonuc, yaml, aautUdfOlustur, aautUdfDosyaAdi);
}
export async function ailePdfIndir(sonuc: AileHesapSonucu, yaml: string) {
  await pdfDosyasiIndir(sonuc, yaml, aileRaporTanimi, aileKanitDosyaAdi);
}
export async function aileUdfIndir(sonuc: AileHesapSonucu, yaml: string) {
  await udfDosyasiIndir(sonuc, yaml, aileUdfOlustur, aileUdfDosyaAdi);
}
