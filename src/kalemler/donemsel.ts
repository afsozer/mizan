// Fazla çalışma, hafta tatili ve UBGT: dönem dönem, o dönemin ücretiyle hesaplanan kalemler.
import { Decimal, kurus, sayi, tl, topla } from '../para.ts';
import { dahilGun, trTarih } from '../tarih.ts';
import { haftaSayisi, KALEM_ADLARI, type Baglam, type KalemHesabi } from './ortak.ts';

export function fazlaCalismaHesapla(b: Baglam): KalemHesabi {
  const k = b.girdi.kalemler.fazlaCalisma!;
  const { aylikCalismaSaati, fazlaCalismaCarpani: carpan } = b.esaslar;
  const satirlar: string[][] = [];
  const tutarlar: Decimal[] = [];
  for (const donem of k.donemler) {
    const donemGun = dahilGun(donem.baslangic, donem.bitis);
    for (const kesit of b.ucret.kesitler(donem.baslangic, donem.bitis)) {
      const gun = dahilGun(kesit.baslangic, kesit.bitis);
      const { dusulen, hafta } = haftaSayisi(b, gun, donemGun, donem.dislanacakGun);
      const saatUcreti = kesit.aylik.div(aylikCalismaSaati);
      const tutar = kurus(hafta.times(donem.haftalikFazlaSaat).times(saatUcreti).times(carpan));
      tutarlar.push(tutar);
      satirlar.push([
        `${trTarih(kesit.baslangic)} - ${trTarih(kesit.bitis)}`,
        String(gun),
        sayi(dusulen, 2),
        sayi(hafta, 4),
        sayi(donem.haftalikFazlaSaat),
        tl(kesit.aylik),
        tl(saatUcreti, 4),
        tl(tutar),
      ]);
    }
  }
  const hamBrut = topla(tutarlar);
  return {
    kod: 'fazlaCalisma',
    ad: KALEM_ADLARI.fazlaCalisma,
    dayanak: [
      '4857 s.K. m.41/1: haftalık 45 saati aşan çalışma fazla çalışmadır',
      '4857 s.K. m.41/2: her saat için saat ücretinin yüzde elli fazlası ödenir',
    ],
    formul: [
      'Kesit haftası = (dönem günü - düşülen gün) / 7 × kesit günü / dönem günü',
      `Saat ücreti = çıplak brüt aylık / ${sayi(aylikCalismaSaati)}`,
      `Tutar = kesit haftası × haftalık fazla çalışma saati × saat ücreti × ${sayi(carpan)}`,
    ],
    bilgiler: [
      ['Ücret yöntemi', b.ucret.yontemAciklamasi()],
      ['Dönem sayısı', String(k.donemler.length)],
    ],
    detay: {
      basliklar: ['Dönem', 'Gün', 'Düşülen', 'Hafta', 'FÇ saat/hafta', 'Aylık brüt', 'Saat ücreti', 'Tutar (TL)'],
      satirlar,
      toplam: ['Toplam', '', '', '', '', '', '', tl(hamBrut)],
    },
    hamBrut,
    kesintiTuru: 'ucret',
    notlar: [
      'Dönem haftası ve düşülen günler (izin, rapor) dönem içindeki ücret kesitlerine gün sayısıyla orantılı dağıtıldı.',
    ],
  };
}

export function haftaTatiliHesapla(b: Baglam): KalemHesabi {
  const k = b.girdi.kalemler.haftaTatili!;
  const { gunlukBolen, haftaTatiliCarpani: carpan } = b.esaslar;
  const satirlar: string[][] = [];
  const tutarlar: Decimal[] = [];
  for (const donem of k.donemler) {
    const donemGun = dahilGun(donem.baslangic, donem.bitis);
    for (const kesit of b.ucret.kesitler(donem.baslangic, donem.bitis)) {
      const gun = dahilGun(kesit.baslangic, kesit.bitis);
      const { dusulen, hafta } = haftaSayisi(b, gun, donemGun, donem.dislanacakGun);
      const gunluk = kesit.aylik.div(gunlukBolen);
      const tutar = kurus(hafta.times(donem.haftalikGun).times(gunluk).times(carpan));
      tutarlar.push(tutar);
      satirlar.push([
        `${trTarih(kesit.baslangic)} - ${trTarih(kesit.bitis)}`,
        String(gun),
        sayi(dusulen, 2),
        sayi(hafta, 4),
        sayi(donem.haftalikGun),
        tl(kesit.aylik),
        tl(gunluk, 4),
        tl(tutar),
      ]);
    }
  }
  const hamBrut = topla(tutarlar);
  return {
    kod: 'haftaTatili',
    ad: KALEM_ADLARI.haftaTatili,
    dayanak: [
      '4857 s.K. m.46/1: yedi günlük zaman dilimi içinde kesintisiz en az 24 saat dinlenme',
      'Hafta tatilinde çalışılan gün için %50 zamlı günlük ücret: Yargıtay uygulaması (çarpan parametredir)',
    ],
    formul: [
      'Kesit haftası = (dönem günü - düşülen gün) / 7 × kesit günü / dönem günü',
      `Günlük ücret = çıplak brüt aylık / ${sayi(gunlukBolen)}`,
      `Tutar = kesit haftası × haftada çalışılan tatil günü × günlük ücret × ${sayi(carpan)}`,
    ],
    bilgiler: [['Ücret yöntemi', b.ucret.yontemAciklamasi()]],
    detay: {
      basliklar: ['Dönem', 'Gün', 'Düşülen', 'Hafta', 'Tatil günü/hafta', 'Aylık brüt', 'Günlük ücret', 'Tutar (TL)'],
      satirlar,
      toplam: ['Toplam', '', '', '', '', '', '', tl(hamBrut)],
    },
    hamBrut,
    kesintiTuru: 'ucret',
    notlar: [
      'Hafta tatilinde yapılan çalışma ayrıca fazla çalışma hesabına katıldıysa aynı saatler iki kez ödenmiş olur; dönem girdileri buna göre kurulmalı.',
    ],
  };
}

export function ubgtHesapla(b: Baglam): KalemHesabi {
  const k = b.girdi.kalemler.ubgt!;
  const { gunlukBolen, ubgtCarpani: carpan } = b.esaslar;
  const tutarlar: Decimal[] = [];
  const satirlar = k.gunler.map((g) => {
    const aylik = b.ucret.ciplak(g.tarih);
    const gunluk = aylik.div(gunlukBolen);
    const tutar = kurus(g.gun.times(gunluk).times(carpan));
    tutarlar.push(tutar);
    return [trTarih(g.tarih), g.aciklama ?? '', sayi(g.gun), tl(aylik), tl(gunluk, 4), tl(tutar)];
  });
  const hamBrut = topla(tutarlar);
  const toplamGun = topla(k.gunler.map((g) => g.gun));
  return {
    kod: 'ubgt',
    ad: KALEM_ADLARI.ubgt,
    dayanak: [
      '2429 s.K.: ulusal bayram ve genel tatil günleri',
      '4857 s.K. m.47/1: tatil yapmayarak çalışılan her gün için ayrıca bir günlük ücret',
    ],
    formul: [`Günlük ücret = çıplak brüt aylık / ${sayi(gunlukBolen)}`, `Tutar = gün × günlük ücret × ${sayi(carpan)}`],
    bilgiler: [
      ['Ücret yöntemi', b.ucret.yontemAciklamasi()],
      ['Toplam gün', sayi(toplamGun)],
    ],
    detay: {
      basliklar: ['Tarih', 'Açıklama', 'Gün', 'Aylık brüt', 'Günlük ücret', 'Tutar (TL)'],
      satirlar,
      toplam: ['Toplam', '', sayi(toplamGun), '', '', tl(hamBrut)],
    },
    hamBrut,
    kesintiTuru: 'ucret',
    notlar: ['Çalışılan bayram ve tatil günleri girdi dosyasında tek tek verilir; araç takvimden gün türetmez.'],
  };
}

