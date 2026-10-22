// Bilirkişilik hesap kayıt defterine yapıştırılacak satır ve kanıt dosyası adı.
// Defter sütunları: Tarih | Kaynak | Mahkeme ve esas no | Alt alan | Hesaplanan kalemler | Kanıt dosyası | Teyit
import type { HesapSonucu } from '../hesap.ts';
import { tl } from '../para.ts';
import { trTarih } from '../tarih.ts';

const TR: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u',
  '\u00e2': 'a', '\u00ee': 'i', '\u00fb': 'u',
};

export function kisaltma(metin: string): string {
  return metin
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü\u00e2\u00ee\u00fb]/g, (h) => TR[h] ?? h)
    .replace(/\bmahkemesi\b/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** YYYY-AA-GG_mahkeme-esas_altalan.pdf (defter kuralı 4). */
export function kanitDosyaAdi(s: HesapSonucu, uretimTarihi: string): string {
  const dsy = s.girdi.dosya;
  const mahkeme = dsy.kisaAd ?? kisaltma(dsy.mahkeme);
  return `${uretimTarihi}_${mahkeme}-${kisaltma(dsy.esasNo)}_${dsy.altAlan}.pdf`;
}

export function defterSatiri(s: HesapSonucu, uretimTarihi: string, surum: string): string {
  const dsy = s.girdi.dosya;
  const kalemler = s.kalemler.filter((k) => !k.brut.isZero()).map((k) => k.ad.toLocaleLowerCase('tr-TR'));
  const ozet =
    `${kalemler.join(', ')}; brüt toplam ${tl(s.toplam.brut)} TL` +
    (s.toplam.faiz.isZero() ? '' : `, faiz ${tl(s.toplam.faiz)} TL`) +
    `; ${surum}`;
  const hucreler = [trTarih(uretimTarihi), dsy.kaynak, `${dsy.mahkeme} ${dsy.esasNo}`, dsy.altAlan, ozet, kanitDosyaAdi(s, uretimTarihi), ''];
  return `| ${hucreler.map((h) => h.replace(/\|/g, '/')).join(' | ')} |`;
}
