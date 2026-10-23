// Raporun hangi kod ve tabloyla üretildiğini sonradan ispatlamak için sürüm bilgisi. Bilgiyi Node'da
// src/node/surum.ts git'ten okur; tarayıcı paketinde derleme sırasında gömülür.

export interface Surum {
  surum: string;
  commit: string | null;
  degisiklikVar: boolean;
}

export function surumYaz(s: Surum): string {
  const commit = s.commit ? `commit ${s.commit}` : 'commit yok';
  return `mizan ${s.surum} (${commit}${s.degisiklikVar ? ', commit edilmemiş değişiklik var' : ''})`;
}
