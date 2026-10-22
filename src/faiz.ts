// Basit faiz. Başlangıç günü faize girmez, bitiş günü girer; toplam gün = bitiş - başlangıç.
// Yasal faiz oran tablosunun değiştiği günlerde bölünür. Kıdemdeki mevduat faizinde Yargıtay
// yöntemi uygulanır: başlangıçtaki oran ilk yıl, her yıldönümündeki oran o yıl boyunca sabit.
import { d, Decimal, kurus, topla } from './para.ts';
import type { FaizTuru } from './girdi.ts';
import type { DonemselTablo, KaynakKaydi, OranSatiri } from './tablolar.ts';
import { dahilGun, enKucuk, gunEkle, gunFarki, karsilastir, yilEkle } from './tarih.ts';

export interface FaizKesiti {
  baslangic: string;
  bitis: string;
  gun: number;
  oran: Decimal;
  /** Yıldönümü yönteminde oranın alındığı gün. */
  oranTarihi?: string;
  tutar: Decimal;
}

export interface FaizSonucu {
  tur: FaizTuru;
  tabloAdi: string;
  matrah: Decimal;
  baslangic: string;
  bitis: string;
  gerekce: string;
  kesitler: FaizKesiti[];
  toplam: Decimal;
}

export function faizHesapla(
  tablo: DonemselTablo<OranSatiri>,
  tur: FaizTuru,
  matrah: Decimal,
  baslangic: string,
  bitis: string,
  gunEsasi: Decimal,
  gerekce: string,
  kayit?: KaynakKaydi,
): FaizSonucu {
  const sonuc: FaizSonucu = { tur, tabloAdi: tablo.ad, matrah, baslangic, bitis, gerekce, kesitler: [], toplam: d(0) };
  if (karsilastir(baslangic, bitis) >= 0 || matrah.isZero()) return sonuc;
  for (const k of tablo.kesitler(gunEkle(baslangic, 1), bitis, kayit)) {
    const gun = dahilGun(k.baslangic, k.bitis);
    const oran = d(k.satir.oran);
    sonuc.kesitler.push({ baslangic: k.baslangic, bitis: k.bitis, gun, oran, tutar: kurus(matrah.times(oran).times(gun).div(gunEsasi)) });
  }
  sonuc.toplam = topla(sonuc.kesitler.map((k) => k.tutar));
  return sonuc;
}

/** Mevduat faizi, yıldönümü yöntemi (Yargıtay 9. HD 06.11.2025, 2025/6610 E., 2025/8609 K.). */
export function mevduatFaiziHesapla(
  tablo: DonemselTablo<OranSatiri>,
  matrah: Decimal,
  baslangic: string,
  bitis: string,
  gunEsasi: Decimal,
  gerekce: string,
  kayit?: KaynakKaydi,
): FaizSonucu {
  const sonuc: FaizSonucu = { tur: 'mevduat', tabloAdi: tablo.ad, matrah, baslangic, bitis, gerekce, kesitler: [], toplam: d(0) };
  if (karsilastir(baslangic, bitis) >= 0 || matrah.isZero()) return sonuc;
  for (let yil = 0; ; yil++) {
    const yilBasi = yilEkle(baslangic, yil);
    if (karsilastir(yilBasi, bitis) >= 0) break;
    const yilSonu = enKucuk(yilEkle(baslangic, yil + 1), bitis);
    const oran = d(tablo.bul(yilBasi, kayit).oran);
    const gun = gunFarki(yilBasi, yilSonu);
    sonuc.kesitler.push({
      baslangic: gunEkle(yilBasi, 1),
      bitis: yilSonu,
      gun,
      oran,
      oranTarihi: yilBasi,
      tutar: kurus(matrah.times(oran).times(gun).div(gunEsasi)),
    });
  }
  sonuc.toplam = topla(sonuc.kesitler.map((k) => k.tutar));
  return sonuc;
}
