import { raporTanimi, kanitDosyaAdi, udfOlustur, udfDosyaAdi, icraRaporTanimi, icraKanitDosyaAdi, surumYaz } from '../../src/index.ts';
import type { HesapSonucu, IcraHesapSonucu } from '../../src/index.ts';
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
export async function pdfIndir(sonuc: HesapSonucu, yaml: string) {
  const zaman = new Date();
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake.js'), import('pdfmake/build/vfs_fonts.js'),
  ]);
  pdfMake.addVirtualFileSystem(vfs);
  const tanim = raporTanimi(sonuc, {
    surum: surum(),
    girdiOzeti: await sha256(yaml),
    uretimZamani: new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }).format(zaman),
  });
  const blob = await pdfMake.createPdf(tanim).getBlob();
  indir(blob, kanitDosyaAdi(sonuc, uretimTarihi(zaman)));
}
export async function udfIndir(sonuc: HesapSonucu, yaml: string) {
  const zaman = new Date();
  const baytlar = udfOlustur(sonuc, {
    surum: surum(),
    girdiOzeti: await sha256(yaml),
    uretimZamani: new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }).format(zaman),
  });
  const kopya = new Uint8Array(baytlar.byteLength);
  kopya.set(baytlar);
  indir(new Blob([kopya.buffer], { type: 'application/zip' }), udfDosyaAdi(sonuc, uretimTarihi(zaman)));
}
export async function icraPdfIndir(sonuc: IcraHesapSonucu, yaml: string) {
  const zaman = new Date();
  const [{ default: pdfMake }, { default: vfs }] = await Promise.all([
    import('pdfmake/build/pdfmake.js'), import('pdfmake/build/vfs_fonts.js'),
  ]);
  pdfMake.addVirtualFileSystem(vfs);
  const tanim = icraRaporTanimi(sonuc, {
    surum: surum(),
    girdiOzeti: await sha256(yaml),
    uretimZamani: new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'short', timeStyle: 'short' }).format(zaman),
  });
  const blob = await pdfMake.createPdf(tanim).getBlob();
  indir(blob, icraKanitDosyaAdi(sonuc, uretimTarihi(zaman)));
}
