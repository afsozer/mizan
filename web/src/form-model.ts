import { girdiCoz, girdiMetindenCoz } from '../../src/index.ts';
import { parse, stringify } from 'yaml';

export type Deger = string | number | boolean | null | Nesne | Deger[];
export interface Nesne { [anahtar: string]: Deger | undefined }
export type Yol = (string | number)[];

export function bosForm(): Nesne {
  return {
    dosya: { mahkeme: '', esasNo: '', kaynak: '', altAlan: '' },
    hesapTarihi: '',
    hizmet: { donemler: [{ giris: '', cikis: '' }], fesihTarihi: '', fesihSekli: '' },
    ucret: { sonBrutAylik: '', yontem: '', yanHaklar: [] },
    parametreler: { vergi: { yontem: '' } },
    kalemler: {},
  };
}

/** Form değerlerini şemayla aynı yapıda kopyalar, tanımsız isteğe bağlı alanları çıkarır. */
export function formdanGirdiKur(form: Nesne): Nesne {
  const kopyala = (deger: Deger): Deger => {
    if (Array.isArray(deger)) return deger.map(kopyala);
    if (deger !== null && typeof deger === 'object') {
      return Object.fromEntries(Object.entries(deger).filter(([, v]) => v !== undefined).map(([k, v]) => [k, kopyala(v!)]));
    }
    return deger;
  };
  return kopyala(form) as Nesne;
}

export function yamlForma(metin: string): Nesne {
  girdiMetindenCoz(metin);
  return parse(metin) as Nesne;
}

export function formYamli(form: Nesne): string {
  return stringify(formdanGirdiKur(form), { lineWidth: 100 });
}

export function formuDogrula(form: Nesne) { return girdiCoz(formdanGirdiKur(form)); }

export function degerOku(form: Nesne, yol: Yol): Deger | undefined {
  let deger: Deger | undefined = form;
  for (const parca of yol) {
    if (deger === null || typeof deger !== 'object') return undefined;
    deger = Array.isArray(deger) ? deger[Number(parca)] : deger[String(parca)];
  }
  return deger;
}

export function alanDegistir(form: Nesne, yol: Yol, deger: Deger | undefined): Nesne {
  const sonuc = formdanGirdiKur(form);
  let nesne: Nesne | Deger[] = sonuc;
  yol.forEach((parca, i) => {
    const anahtar = String(parca);
    if (i === yol.length - 1) {
      if (Array.isArray(nesne)) {
        if (deger === undefined) nesne.splice(Number(parca), 1);
        else nesne[Number(parca)] = deger;
      } else if (deger === undefined) delete nesne[anahtar];
      else nesne[anahtar] = deger;
      return;
    }
    let alt = Array.isArray(nesne) ? nesne[Number(parca)] : nesne[anahtar];
    if (alt === null || typeof alt !== 'object') {
      alt = typeof yol[i + 1] === 'number' ? [] : {};
      if (Array.isArray(nesne)) nesne[Number(parca)] = alt;
      else nesne[anahtar] = alt;
    }
    nesne = alt;
  });
  return sonuc;
}

export function hataYolu(mesaj: string): string {
  const yol = mesaj.match(/^girdi(?:\.[a-zA-Z]+|\[\d+\])*/)?.[0];
  if (yol) return yol;
  if (mesaj.includes('parametreler.indirimMahsupSirasi')) return 'girdi.parametreler.indirimMahsupSirasi';
  return 'girdi';
}

/** Çekirdeğin "girdi.dosya.mahkeme: ..." biçimindeki mesajından yalnız açıklamayı bırakır. */
export function hataAciklamasi(mesaj: string): string {
  return mesaj.replace(/^girdi(?:\.[a-zA-Z]+|\[\d+\])*:\s*/, '');
}

export function yolYaz(yol: Yol): string {
  return 'girdi' + yol.map(p => typeof p === 'number' ? `[${p}]` : `.${p}`).join('');
}
