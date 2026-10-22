import { d, Decimal, kurus, sayi, tl, topla } from '../para.ts';
import type { Girdi } from '../girdi.ts';
import { gunEkle, gunFarki, karsilastir, sure, trTarih, yilEkle } from '../tarih.ts';
import { KALEM_ADLARI, type Baglam, type KalemHesabi } from './ortak.ts';

const IS_KANUNU_YURURLUK = '2003-06-10';

export interface HakEdis {
  sira: number;
  tarih: string;
  yas?: number;
  gun: number;
  aciklama: string;
}

/**
 * Hizmet yılı dolumları. Dönemler arasındaki boşluklar, yıl dolumunu boşluk kadar ileri
 * kaydırır; işçi çıkış gününün ertesi gününe kadar dolan yıllar sayılır.
 */
export function yilDolumlari(donemler: Girdi['hizmet']['donemler']): string[] {
  const ilk = donemler[0]!.giris;
  const sonGun = gunEkle(donemler[donemler.length - 1]!.cikis, 1);
  const sonuc: string[] = [];
  let kayma = 0;
  let i = 0;
  for (let n = 1; ; n++) {
    let aday = gunEkle(yilEkle(ilk, n), kayma);
    while (i < donemler.length - 1 && karsilastir(aday, gunEkle(donemler[i]!.cikis, 1)) > 0) {
      kayma += gunFarki(donemler[i]!.cikis, donemler[i + 1]!.giris) - 1;
      i++;
      aday = gunEkle(yilEkle(ilk, n), kayma);
    }
    if (karsilastir(aday, sonGun) > 0) break;
    sonuc.push(aday);
  }
  return sonuc;
}

/** 4857 m.53/4-5: 1-5 yıl (dahil) 14, 5-15 yıl 20, 15 yıl (dahil) ve üstü 26 gün; 18 ve altı ile 50 ve üstü yaşta en az 20. */
export function izinGunu(sira: number, yas?: number): { gun: number; aciklama: string } {
  let gun = sira <= 5 ? 14 : sira < 15 ? 20 : 26;
  let aciklama = sira <= 5 ? '1-5 yıl: 14 gün' : sira < 15 ? '5-15 yıl: 20 gün' : '15 yıl ve üstü: 26 gün';
  if (yas !== undefined && (yas <= 18 || yas >= 50) && gun < 20) {
    gun = 20;
    aciklama += `; ${yas} yaş, en az 20 gün`;
  }
  return { gun, aciklama };
}

function yasHesapla(dogum: string, tarih: string): number {
  return sure(dogum, gunEkle(tarih, -1)).yil;
}

export function yillikIzinHesapla(b: Baglam): KalemHesabi {
  const g = b.girdi;
  const k = g.kalemler.yillikIzin!;
  const notlar: string[] = [];
  const dolumlar = yilDolumlari(g.hizmet.donemler);
  const hakEdisler: HakEdis[] = dolumlar.map((tarih, i) => {
    const yas = g.hizmet.dogumTarihi ? yasHesapla(g.hizmet.dogumTarihi, tarih) : undefined;
    const { gun, aciklama } = izinGunu(i + 1, yas);
    return { sira: i + 1, tarih, yas, gun, aciklama };
  });
  if (hakEdisler.some((h) => karsilastir(h.tarih, IS_KANUNU_YURURLUK) < 0)) {
    notlar.push(
      '10.06.2003 öncesinde dolan hizmet yılları var; o yıllar için 1475 s.K. dönemindeki izin süreleri ayrıca değerlendirilmeli ' +
        '(araç 4857 s.K. m.53 sürelerini uyguladı).',
    );
  }
  if (!g.hizmet.dogumTarihi) notlar.push('Doğum tarihi girilmedi; 4857 s.K. m.53 yaş kuralı (en az 20 gün) uygulanmadı.');

  const hesaplanan = topla(hakEdisler.map((h) => d(h.gun)));
  const hakEdilen = k.hakEdilenGun ?? hesaplanan;
  if (k.hakEdilenGun && !k.hakEdilenGun.eq(hesaplanan)) {
    notlar.push(`Hak edilen gün girdi ile ${sayi(k.hakEdilenGun)} olarak verildi; aracın hesabı ${sayi(hesaplanan)} gün.`);
  }
  let bakiye = hakEdilen.minus(k.kullanilanGun);
  if (bakiye.isNegative()) {
    notlar.push('Kullanılan izin hak edilenden fazla; bakiye 0 alındı.');
    bakiye = d(0);
  }

  const aylik = k.ucretTuru === 'ciplak' ? b.ucret.sonCiplak : b.ucret.giydirilmis();
  const gunluk = aylik.div(b.esaslar.gunlukBolen);
  const tutar: Decimal = kurus(gunluk.times(bakiye));

  return {
    kod: 'yillikIzin',
    ad: KALEM_ADLARI.yillikIzin,
    dayanak: [
      '4857 s.K. m.53: izin süreleri (1-5 yıl 14, 5-15 yıl 20, 15 yıl ve üstü 26 gün; 18 ve altı, 50 ve üstü yaşta en az 20 gün)',
      '4857 s.K. m.59: kullanılmayan izin ücreti sözleşmenin sona erdiği tarihteki ücret üzerinden ödenir',
    ],
    formul: [
      'Bakiye gün = hak edilen gün - kullanılan gün',
      `Günlük ücret = son ${k.ucretTuru === 'ciplak' ? 'çıplak' : 'giydirilmiş'} brüt aylık / günlük bölen`,
      'İzin ücreti = bakiye gün × günlük ücret',
    ],
    bilgiler: [
      ['Hak edilen gün', `${sayi(hakEdilen)}${k.hakEdilenGun ? ' (girdi)' : ' (hesaplanan)'}`],
      ['Kullanılan gün', `${sayi(k.kullanilanGun)} (girdi)`],
      ['Bakiye gün', sayi(bakiye)],
      ['Ücret türü', k.ucretTuru === 'ciplak' ? 'çıplak brüt (girdi)' : 'giydirilmiş brüt (girdi)'],
      ['Esas aylık ücret', `${tl(aylik)} TL`],
      ['Günlük ücret', `${tl(gunluk, 4)} TL`],
    ],
    detay: {
      basliklar: ['Hizmet yılı', 'Dolum tarihi', 'Yaş', 'Gün', 'Açıklama'],
      satirlar: hakEdisler.map((h) => [String(h.sira), trTarih(h.tarih), h.yas === undefined ? '-' : String(h.yas), String(h.gun), h.aciklama]),
      toplam: ['Toplam', '', '', sayi(hesaplanan), ''],
    },
    hamBrut: tutar,
    kesintiTuru: 'ucret',
    notlar,
  };
}
