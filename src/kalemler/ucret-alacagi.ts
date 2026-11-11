// Ödenmeyen ücret alacağı (4857 s.K. m.32, m.34) ve ikramiye / ilave tediye / prim alacağı
// (4857 s.K. m.32, 6098 s.K. TBK m.405).
import type { UcretAlacagiDonemi, ZamanasimiParametresi } from '../girdi.ts';
import { d, Decimal, kurus, sayi, tl, topla } from '../para.ts';
import { ayEkle, dahilGun, enBuyuk, enKucuk, gecerliTarih, gunEkle, karsilastir, sure, trTarih } from '../tarih.ts';
import { KALEM_ADLARI, type Baglam, type KalemHesabi } from './ortak.ts';

function tamAyGunu(baslangic: string, bitis: string): number {
  const s = sure(baslangic, bitis);
  return (s.yil * 12 + s.ay) * 30 + s.gun;
}

/**
 * Tam ay (1 ay = 30 gün) kuralında kesit gün sayısı. Tam aylar kendi içinde 30 gün sayılır
 * (ör. Haziran 30, Temmuz 31 takvim günü olsa da ikisi de 30'ar gün verir); yalnız aynı tam ayın
 * ay ortasında ücret değişimiyle bölünmesi halinde o ayın kesitleri 30 güne orantılanır.
 */
function tamAyKesitGunu(donemBas: string, donemBit: string, kesitBas: string, kesitBit: string): Decimal {
  const s = sure(donemBas, donemBit);
  const tamAylar = s.yil * 12 + s.ay;
  let toplam = d(0);
  for (let m = 0; m < tamAylar; m++) {
    const ayBasi = ayEkle(donemBas, m);
    const aySonu = gunEkle(ayEkle(donemBas, m + 1), -1);
    const bas = enBuyuk(kesitBas, ayBasi);
    const bit = enKucuk(kesitBit, aySonu);
    if (karsilastir(bas, bit) <= 0) {
      const kesisim = dahilGun(bas, bit);
      const ayGun = dahilGun(ayBasi, aySonu);
      toplam = toplam.plus(kesisim === ayGun ? d(30) : d(30).times(kesisim).div(ayGun));
    }
  }
  if (s.gun > 0) {
    const kalanBasi = ayEkle(donemBas, tamAylar);
    const bas = enBuyuk(kesitBas, kalanBasi);
    const bit = enKucuk(kesitBit, donemBit);
    if (karsilastir(bas, bit) <= 0) {
      toplam = toplam.plus(dahilGun(bas, bit));
    }
  }
  return toplam;
}

function ucretDonemleriniKirp(
  donemler: UcretAlacagiDonemi[],
  zamanasimi: ZamanasimiParametresi | undefined,
): { donemler: UcretAlacagiDonemi[]; notlar: string[] } {
  if (!zamanasimi) return { donemler, notlar: [] };
  const { sinirTarihi, gerekce } = zamanasimi;
  const kalanlar: UcretAlacagiDonemi[] = [];
  const notlar: string[] = [];
  for (const donem of donemler) {
    if (karsilastir(donem.bitis, sinirTarihi) < 0) {
      notlar.push(
        `Zamanaşımı sınır tarihi (${trTarih(sinirTarihi)}; girdi: ${gerekce}) nedeniyle ${trTarih(donem.baslangic)} - ${trTarih(donem.bitis)} dönemi tamamen zamanaşımına uğradığından hesap dışı bırakıldı.`,
      );
      continue;
    }
    if (karsilastir(donem.baslangic, sinirTarihi) < 0) {
      const ilkGun = dahilGun(donem.baslangic, donem.bitis);
      const kalanGun = dahilGun(sinirTarihi, donem.bitis);
      const oran = d(kalanGun).div(ilkGun);
      const kirpilanBitis = gunEkle(sinirTarihi, -1);
      kalanlar.push({
        ...donem,
        baslangic: sinirTarihi,
        gunSayisi: donem.gunSayisi ? donem.gunSayisi.times(oran) : undefined,
        odenenBrut: donem.odenenBrut ? kurus(donem.odenenBrut.times(oran)) : undefined,
      });
      notlar.push(
        `Zamanaşımı sınır tarihi (${trTarih(sinirTarihi)}; girdi: ${gerekce}) nedeniyle ${trTarih(donem.baslangic)} - ${trTarih(donem.bitis)} döneminin ${trTarih(donem.baslangic)} - ${trTarih(kirpilanBitis)} kısmı (${ilkGun - kalanGun} gün) kırpıldı; kalan ${kalanGun} gün üzerinden hesaplandı.`,
      );
      continue;
    }
    kalanlar.push(donem);
  }
  return { donemler: kalanlar, notlar };
}

function kapsananTakvimAySayisi(donemler: UcretAlacagiDonemi[]): Decimal | undefined {
  const aylar = new Set<string>();
  for (const donem of donemler) {
    let yil = Number(donem.baslangic.slice(0, 4));
    let ay = Number(donem.baslangic.slice(5, 7));
    const bitYil = Number(donem.bitis.slice(0, 4));
    const bitAy = Number(donem.bitis.slice(5, 7));
    while (yil < bitYil || (yil === bitYil && ay <= bitAy)) {
      aylar.add(`${yil}-${String(ay).padStart(2, '0')}`);
      ay++;
      if (ay > 12) {
        ay = 1;
        yil++;
      }
    }
  }
  return aylar.size > 1 ? d(aylar.size) : undefined;
}

export function ucretAlacagiHesapla(b: Baglam): KalemHesabi {
  const k = b.girdi.kalemler.ucretAlacagi!;
  const { gunlukBolen, zamanasimi } = b.esaslar;
  const { donemler, notlar: zamanasimiNotlari } = ucretDonemleriniKirp(k.donemler, zamanasimi);
  const satirlar: string[][] = [];
  const gunler: Decimal[] = [];
  const hesaplananlar: Decimal[] = [];
  const odenenler: Decimal[] = [];
  const tutarlar: Decimal[] = [];
  let bolunenSayisi = 0;
  let eksiyeDusenVar = false;

  for (const donem of donemler) {
    const takvimGun = dahilGun(donem.baslangic, donem.bitis);
    const tamAy = donem.tamAy ?? k.gunKurali === 'tam-ay';
    const donemHedefGun = donem.gunSayisi ?? (tamAy ? d(tamAyGunu(donem.baslangic, donem.bitis)) : d(takvimGun));
    const kesitler = donem.brutAylik
      ? [{ baslangic: donem.baslangic, bitis: donem.bitis, aylik: donem.brutAylik }]
      : b.ucret.kesitler(donem.baslangic, donem.bitis);
    if (kesitler.length > 1) bolunenSayisi++;

    const donemOdenen = donem.odenenBrut ?? d(0);
    let dagitilanOdenen = d(0);

    for (let i = 0; i < kesitler.length; i++) {
      const kesit = kesitler[i]!;
      const kesitTakvimGun = dahilGun(kesit.baslangic, kesit.bitis);
      const takvimOrani = d(kesitTakvimGun).div(takvimGun);
      const kesitGun = donem.gunSayisi
        ? donemHedefGun.times(takvimOrani)
        : tamAy
          ? tamAyKesitGunu(donem.baslangic, donem.bitis, kesit.baslangic, kesit.bitis)
          : d(kesitTakvimGun);
      const odenenOrani = donemHedefGun.isZero() ? takvimOrani : kesitGun.div(donemHedefGun);
      const gunluk = kesit.aylik.div(gunlukBolen);
      const hesaplanan = kurus(kesitGun.times(gunluk));
      const kesitOdenen = donemOdenen.isZero()
        ? d(0)
        : i === kesitler.length - 1
          ? donemOdenen.minus(dagitilanOdenen)
          : kurus(donemOdenen.times(odenenOrani));
      dagitilanOdenen = dagitilanOdenen.plus(kesitOdenen);

      let tutar = hesaplanan.minus(kesitOdenen);
      if (tutar.isNegative()) {
        eksiyeDusenVar = true;
        tutar = d(0);
      }

      gunler.push(kesitGun);
      hesaplananlar.push(hesaplanan);
      odenenler.push(kesitOdenen);
      tutarlar.push(tutar);
      satirlar.push([
        `${trTarih(kesit.baslangic)} - ${trTarih(kesit.bitis)}${donem.aciklama ? ` (${donem.aciklama})` : ''}`,
        sayi(kesitGun),
        tl(kesit.aylik),
        tl(gunluk, 4),
        tl(hesaplanan),
        kesitOdenen.isZero() ? '-' : tl(kesitOdenen),
        tl(tutar),
      ]);
    }
  }

  const toplamGun = topla(gunler);
  const toplamHesaplanan = topla(hesaplananlar);
  const toplamOdenen = topla(odenenler);
  const hamBrut = topla(tutarlar);

  const dayanak: string[] = [
    '4857 s.K. m.32/1: genel anlamda ücret bir kimseye bir iş karşılığında işveren veya üçüncü kişiler tarafından sağlanan ve para ile ödenen tutardır',
    '4857 s.K. m.32/5-6: ücret en geç ayda bir ödenir; iş sözleşmelerinin sona ermesinde işçinin ücreti tam olarak ödenir',
    ...(zamanasimi ? ['6098 s.K. TBK m.147/1-1 ve 4857 s.K. m.32/8: ücret alacaklarında 5 yıllık zamanaşımı'] : []),
  ];
  if (k.faiz?.some((f) => f.tur === 'mevduat')) {
    dayanak.push('4857 s.K. m.34/1: gününde ödenmeyen ücretler için mevduata uygulanan en yüksek faiz oranı uygulanır');
  }

  const formul: string[] = [`Günlük ücret = çıplak brüt aylık / ${sayi(gunlukBolen)}`, 'Hesaplanan brüt = gün × günlük ücret'];
  if (!toplamOdenen.isZero()) formul.push('Bakiye brüt = hesaplanan brüt - satırda ödenen brüt');

  const bilgiler: [string, string][] = [
    ['Ücret yöntemi', b.ucret.yontemAciklamasi()],
    ['Dönem sayısı', String(donemler.length)],
    ['Toplam gün', sayi(toplamGun)],
  ];
  if (k.gunKurali) {
    bilgiler.push(['Gün hesabı kuralı', k.gunKurali === 'tam-ay' ? 'tam ay (1 ay = 30 gün, girdi)' : 'takvim günü (girdi)']);
  }

  const notlar: string[] = [];
  if (bolunenSayisi > 0) {
    notlar.push('Ücret değişim tarihlerini kapsayan dönemler ücret kesitlerine bölünerek her kesit kendi dönem ücretiyle hesaplandı.');
  }
  const verilenGunSayisi = donemler.filter((x) => x.gunSayisi).length;
  if (verilenGunSayisi > 0) {
    notlar.push(`${verilenGunSayisi} dönemde gün sayısı girdi ile verildi; takvim günü yerine o sayı kullanıldı.`);
  }
  if (k.gunKurali === 'tam-ay' || donemler.some((x) => x.tamAy)) {
    notlar.push('Tam ay kuralı uygulanan dönemlerde 1 ay 30 gün sayıldı.');
  }
  if (donemler.some((x) => x.brutAylik)) {
    notlar.push('Satıra özel brüt aylık ücret verilen dönemlerde ücret motoru yerine satır ücreti kullanıldı.');
  }
  if (eksiyeDusenVar) {
    notlar.push('Satırda ödenen brüt tutar hesaplanan brütü aştığı için kalan bakiye 0 alındı.');
  }
  notlar.push(...zamanasimiNotlari);

  return {
    kod: 'ucretAlacagi',
    ad: KALEM_ADLARI.ucretAlacagi,
    dayanak,
    formul,
    bilgiler,
    detay: {
      basliklar: ['Dönem', 'Gün', 'Aylık brüt', 'Günlük ücret', 'Hesaplanan brüt', 'Ödenen brüt', 'Tutar (TL)'],
      satirlar,
      toplam: ['Toplam', sayi(toplamGun), '', '', tl(toplamHesaplanan), toplamOdenen.isZero() ? '-' : tl(toplamOdenen), tl(hamBrut)],
    },
    hamBrut,
    kesintiTuru: 'ucret',
    sgkAySayisi: kapsananTakvimAySayisi(donemler),
    notlar,
  };
}

function ikramiyeUcretTarihi(
  donem: string | { baslangic: string; bitis: string } | undefined,
  tarih: string | undefined,
  varsayilan: string,
): string {
  if (tarih) return tarih;
  if (typeof donem === 'object') return donem.bitis;
  if (typeof donem === 'string') {
    if (gecerliTarih(donem)) return donem;
    const eslesme = /^(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})$/.exec(donem);
    if (eslesme && gecerliTarih(eslesme[2]!)) return eslesme[2]!;
  }
  return varsayilan;
}

function ikramiyeDonemYaz(donem: string | { baslangic: string; bitis: string } | undefined, tarih: string | undefined): string {
  let donemMetni: string | undefined;
  if (typeof donem === 'object') {
    donemMetni = `${trTarih(donem.baslangic)} - ${trTarih(donem.bitis)}`;
  } else if (typeof donem === 'string') {
    if (gecerliTarih(donem)) {
      donemMetni = trTarih(donem);
    } else {
      const eslesme = /^(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})$/.exec(donem);
      donemMetni = eslesme ? `${trTarih(eslesme[1]!)} - ${trTarih(eslesme[2]!)}` : donem;
    }
  }
  if (donemMetni && tarih) return donemMetni === trTarih(tarih) ? donemMetni : `${donemMetni} (${trTarih(tarih)})`;
  return donemMetni ?? trTarih(tarih!);
}

export function ikramiyeHesapla(b: Baglam): KalemHesabi {
  const k = b.girdi.kalemler.ikramiye!;
  const { gunlukBolen, zamanasimi } = b.esaslar;
  const satirlar: string[][] = [];
  const tutarlar: Decimal[] = [];
  const zamanasimiNotlari: string[] = [];
  const aktifSatirlar = k.satirlar.filter((s) => {
    if (!zamanasimi) return true;
    const ucretTarihi = ikramiyeUcretTarihi(s.donem, s.tarih, b.ucret.sonUcretTarihi);
    if (karsilastir(ucretTarihi, zamanasimi.sinirTarihi) < 0) {
      zamanasimiNotlari.push(
        `Zamanaşımı sınır tarihi (${trTarih(zamanasimi.sinirTarihi)}; girdi: ${zamanasimi.gerekce}) öncesinde kalan "${s.ad}" (${ikramiyeDonemYaz(s.donem, s.tarih)}) satırı hesap dışı bırakıldı.`,
      );
      return false;
    }
    return true;
  });
  let eksiyeDusenVar = false;

  for (const s of aktifSatirlar) {
    const ucretTarihi = ikramiyeUcretTarihi(s.donem, s.tarih, b.ucret.sonUcretTarihi);
    const donemTarih = ikramiyeDonemYaz(s.donem, s.tarih);
    const oran = s.calisilanOran ?? d(1);
    const oranMetni = s.calisilanOran ? sayi(s.calisilanOran, 4) : '1';

    let esasAylikMetni = '-';
    let hesapMetni: string;
    let hesaplanan: Decimal;

    if (s.hesapSekli === 'tutar') {
      hesapMetni = `Sabit tutar: ${tl(s.deger)} TL`;
      hesaplanan = kurus(s.deger.times(oran));
    } else if (s.hesapSekli === 'gunluk') {
      const aylik = s.brutAylik ?? b.ucret.ciplak(ucretTarihi);
      const gunluk = aylik.div(gunlukBolen);
      esasAylikMetni = tl(aylik);
      hesapMetni = `${sayi(s.deger)} gün × ${tl(gunluk, 4)} TL/gün`;
      hesaplanan = kurus(gunluk.times(s.deger).times(oran));
    } else {
      const aylik = s.brutAylik ?? b.ucret.ciplak(ucretTarihi);
      esasAylikMetni = tl(aylik);
      hesapMetni = `${tl(aylik)} TL × ${sayi(s.deger)}`;
      hesaplanan = kurus(aylik.times(s.deger).times(oran));
    }

    let tutar = s.odenenBrut ? hesaplanan.minus(s.odenenBrut) : hesaplanan;
    if (s.odenenBrut && !s.odenenBrut.isZero()) {
      hesapMetni += ` (-${tl(s.odenenBrut)} TL ödenen)`;
    }
    if (tutar.isNegative()) {
      eksiyeDusenVar = true;
      tutar = d(0);
    }

    tutarlar.push(tutar);
    satirlar.push([s.ad + (s.aciklama ? ` (${s.aciklama})` : ''), donemTarih, hesapMetni, esasAylikMetni, oranMetni, tl(tutar)]);
  }

  const hamBrut = topla(tutarlar);

  const dayanak: string[] = [
    '4857 s.K. m.32/2: ücret, prim, ikramiye ve bu nitelikteki her çeşit istihkak Türk parası ile ödenir',
    '6098 s.K. TBK m.405/1: ikramiyeyi istem hakkı anlaşma, çalışma şartı veya işverenin tek taraflı taahhüdü halinde doğar',
    '6098 s.K. TBK m.405/2: hizmet sözleşmesi ikramiyenin verildiği dönemden önce sona ermişse, çalıştığı süreye yansıyan bölümü (kıstelyevm) ödenir',
    ...(zamanasimi ? ['6098 s.K. TBK m.147/1-1 ve 4857 s.K. m.32/8: ücret ve ikramiye alacaklarında 5 yıllık zamanaşımı'] : []),
  ];
  if (k.faiz?.some((f) => f.tur === 'mevduat')) {
    dayanak.push('4857 s.K. m.34/1: gününde ödenmeyen ücretler için mevduata uygulanan en yüksek faiz oranı uygulanır');
  }

  const formulKaynak = aktifSatirlar.length ? aktifSatirlar : k.satirlar;
  const formul: string[] = [];
  if (formulKaynak.some((s) => s.hesapSekli === 'tutar')) {
    formul.push('Sabit tutar: tutar = sabit brüt tutar × çalışılan oran');
  }
  if (formulKaynak.some((s) => s.hesapSekli === 'gunluk')) {
    formul.push(`Günlük: günlük ücret = çıplak brüt aylık / ${sayi(gunlukBolen)}; tutar = günlük ücret × gün × çalışılan oran`);
  }
  if (formulKaynak.some((s) => s.hesapSekli === 'aylik-oran')) {
    formul.push('Aylık oran: tutar = çıplak brüt aylık × oran × çalışılan oran');
  }

  const notlar: string[] = [];
  if (aktifSatirlar.some((s) => s.calisilanOran && s.calisilanOran.lt(1))) {
    notlar.push('Dönem tamamlanmadan sona eren satırlarda TBK m.405/2 uyarınca çalışılan süreye yansıyan oran (kıstelyevm) uygulandı.');
  }
  if (aktifSatirlar.some((s) => s.brutAylik)) {
    notlar.push('Satıra özel brüt aylık ücret verilen satırlarda ücret motoru yerine satır ücreti kullanıldı.');
  }
  if (eksiyeDusenVar) {
    notlar.push('Satırda ödenen brüt tutar hesaplanan brütü aştığı için kalan bakiye 0 alındı.');
  }
  notlar.push(...zamanasimiNotlari);

  return {
    kod: 'ikramiye',
    ad: KALEM_ADLARI.ikramiye,
    dayanak,
    formul,
    bilgiler: [
      ['Ücret yöntemi', b.ucret.yontemAciklamasi()],
      ['Satır sayısı', String(aktifSatirlar.length)],
    ],
    detay: {
      basliklar: ['Kalem', 'Dönem / tarih', 'Hesap şekli', 'Esas aylık (TL)', 'Kıstelyevm', 'Tutar (TL)'],
      satirlar,
      toplam: ['Toplam', '', '', '', '', tl(hamBrut)],
    },
    hamBrut,
    kesintiTuru: 'ucret',
    notlar,
  };
}
