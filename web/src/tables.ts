import { TABLO_DOSYALARI, tablolariKur } from '../../src/index.ts';
import type { HamTablo, HamTablolar, Tablolar } from '../../src/index.ts';

export interface TabloBelgesi { dosyaAdi: string; metin: string; ham: HamTablo }
const metinler = import.meta.glob<string>('../../data/*.json', { query: '?raw', import: 'default', eager: true });
export async function sha256(metin: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('SHA-256 için uygulamayı localhost veya HTTPS üzerinden açın.');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(metin));
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
export async function tabloHazirla(dosyaAdi: string, metin: string): Promise<TabloBelgesi> {
  return { dosyaAdi, metin, ham: { dosya: JSON.parse(metin) as unknown, ozet: await sha256(metin) } };
}
export async function paketTablolari(): Promise<TabloBelgesi[]> {
  return Promise.all(Object.values(TABLO_DOSYALARI).map(ad => {
    const metin = metinler[`../../data/${ad}`];
    if (metin === undefined) throw new Error(`Paket tablosu okunamadı: ${ad}`);
    return tabloHazirla(ad, metin);
  }));
}
export function hesapTablolari(belgeler: TabloBelgesi[], secim: string | undefined): Tablolar {
  const dosyaBul = (ad: string): HamTablo => {
    const paketAdlari: string[] = Object.values(TABLO_DOSYALARI);
    const tablo = belgeler.find(b => b.dosyaAdi === ad) ?? belgeler.find(b =>
      !paketAdlari.includes(b.dosyaAdi) && b.dosyaAdi === ad.split(/[\\/]/).at(-1),
    );
    if (!tablo) throw new Error(`girdi.tablolar.mevduatFaizi: ${ad} bu oturumda yüklü değil. Banka yazısı JSON dosyasını Tablolar bölümünden yükleyin.`);
    return tablo.ham;
  };
  const mevduatAdi = secim === undefined || secim === 'tum' ? TABLO_DOSYALARI.mevduatFaizi
    : secim === 'kamu' ? TABLO_DOSYALARI.mevduatFaiziKamu : secim;
  const ham: HamTablolar = {
    asgariUcret: dosyaBul(TABLO_DOSYALARI.asgariUcret),
    kidemTavani: dosyaBul(TABLO_DOSYALARI.kidemTavani),
    sgk: dosyaBul(TABLO_DOSYALARI.sgk),
    damga: dosyaBul(TABLO_DOSYALARI.damga),
    yasalFaiz: dosyaBul(TABLO_DOSYALARI.yasalFaiz),
    gelirVergisi: dosyaBul(TABLO_DOSYALARI.gelirVergisi),
    mevduatFaizi: dosyaBul(mevduatAdi),
  };
  return tablolariKur(ham);
}
