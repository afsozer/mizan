import { d, Decimal, kurus, tl } from '../para.ts';
import { sure, sureYaz, trTarih } from '../tarih.ts';
import { KALEM_ADLARI, toplamHizmet, type Baglam, type KalemHesabi } from './ortak.ts';

export function kidemHesapla(b: Baglam): KalemHesabi {
  const g = b.girdi;
  const k = g.kalemler.kidem!;
  const hizmet = toplamHizmet(g);
  const notlar: string[] = [];
  const bilgiler: [string, string][] = [
    ['Hak durumu', `${k.hakVar ? 'Var' : 'Yok'} (girdi: ${k.gerekce})`],
    ['Fesih', `${trTarih(g.hizmet.fesihTarihi)}, ${g.hizmet.fesihSekli}`],
    ...g.hizmet.donemler.map(
      (p, i) => [`Hizmet dönemi ${i + 1}`, `${trTarih(p.giris)} - ${trTarih(p.cikis)} (${sureYaz(sure(p.giris, p.cikis))})`] as [string, string],
    ),
    ['Toplam hizmet', sureYaz(hizmet)],
  ];
  const sonuc: KalemHesabi = {
    kod: 'kidem',
    ad: KALEM_ADLARI.kidem,
    dayanak: [
      '1475 s.K. m.14/1: her tam yıl için 30 günlük ücret, yıldan artan süre için aynı oran',
      '1475 s.K. m.14: esas ücrete para ve para ile ölçülebilen menfaatler eklenir (giydirilmiş ücret)',
      '1475 s.K. m.14: yıllık tutar, en yüksek devlet memuruna bir hizmet yılı için ödenecek azami emeklilik ikramiyesini geçemez (tavan)',
    ],
    formul: [
      'Esas ücret = min(giydirilmiş brüt aylık ücret, fesih tarihindeki kıdem tavanı)',
      'Kıdem = esas × yıl + esas / 12 × ay + esas / 365 × gün',
    ],
    bilgiler,
    hamBrut: d(0),
    kesintiTuru: 'kidem',
    notlar,
  };

  if (!k.hakVar) {
    notlar.push('Girdide kıdem tazminatı hakkı olmadığı belirtildi; tutar hesaplanmadı.');
    return sonuc;
  }
  if (hizmet.yil < 1) {
    notlar.push('Toplam hizmet bir yıldan az; 1475 s.K. m.14 uyarınca kıdem tazminatı doğmaz.');
    return sonuc;
  }

  const giydirilmis = b.ucret.giydirilmis();
  const tavanSatiri = b.tablolar.kidemTavani.bul(g.hizmet.fesihTarihi, b.kayit);
  const tavan = d(tavanSatiri.tutar);
  const esas = Decimal.min(giydirilmis, tavan);
  bilgiler.push(['Son çıplak brüt ücret', `${tl(b.ucret.sonCiplak)} TL`]);
  for (const y of g.ucret.yanHaklar) bilgiler.push([`+ ${y.ad}`, `${tl(y.tutar)} TL`]);
  bilgiler.push(['Giydirilmiş brüt ücret', `${tl(giydirilmis)} TL`]);
  bilgiler.push(['Kıdem tavanı', `${tl(tavan)} TL (${trTarih(tavanSatiri.baslangic)} dönemi)`]);
  bilgiler.push(['Esas ücret', `${tl(esas)} TL${giydirilmis.gt(tavan) ? ' (tavan uygulandı)' : ''}`]);

  const yilT = kurus(esas.times(hizmet.yil));
  const ayT = kurus(esas.div(12).times(hizmet.ay));
  const gunT = kurus(esas.div(365).times(hizmet.gun));
  sonuc.detay = {
    basliklar: ['Süre', 'Hesap', 'Tutar (TL)'],
    satirlar: [
      [`${hizmet.yil} yıl`, `${tl(esas)} × ${hizmet.yil}`, tl(yilT)],
      [`${hizmet.ay} ay`, `${tl(esas)} / 12 × ${hizmet.ay}`, tl(ayT)],
      [`${hizmet.gun} gün`, `${tl(esas)} / 365 × ${hizmet.gun}`, tl(gunT)],
    ],
  };
  sonuc.hamBrut = yilT.plus(ayT).plus(gunT);
  sonuc.detay.toplam = ['Toplam', '', tl(sonuc.hamBrut)];
  if (g.hizmet.donemler.length > 1) {
    notlar.push('Birden fazla hizmet dönemi toplandı (1475 s.K. m.14/2); 30 gün 1 ay, 12 ay 1 yıl sayıldı.');
  }
  return sonuc;
}
