// Bir tarihteki çıplak brüt aylık ücreti seçilen yönteme göre belirler. Yöntem hukuki
// tercihtir (ör. son ücretin asgari ücrete oranıyla geriye yürütülmesi) ve rapora yazılır.
import { d, Decimal, sayi, tl, topla } from './para.ts';
import type { Girdi } from './girdi.ts';
import type { KaynakKaydi, Tablolar } from './tablolar.ts';
import { gunEkle, karsilastir, trTarih } from './tarih.ts';

export interface UcretKesiti {
  baslangic: string;
  bitis: string;
  aylik: Decimal;
}

export class Ucret {
  readonly girdi: Girdi;
  readonly tablolar: Tablolar;
  readonly kayit: KaynakKaydi;
  readonly sonUcretTarihi: string;
  readonly sonCiplak: Decimal;
  /** Yalnız "asgari-orani" yönteminde: son ücret / o tarihteki asgari ücret. */
  readonly oran?: Decimal;

  constructor(girdi: Girdi, tablolar: Tablolar, kayit: KaynakKaydi) {
    this.girdi = girdi;
    this.tablolar = tablolar;
    this.kayit = kayit;
    this.sonUcretTarihi = girdi.ucret.sonUcretTarihi ?? girdi.hizmet.fesihTarihi;
    // Asgari ücret tablosuna yalnız gerektiğinde bakılır; kullanılmayan satır kaynak listesine girmez.
    const asgariSon = () => d(tablolar.asgariUcret.bul(this.sonUcretTarihi, kayit).brutAylik);
    this.sonCiplak = girdi.ucret.sonBrutAylik === 'asgari' ? asgariSon() : girdi.ucret.sonBrutAylik;
    if (girdi.ucret.yontem === 'asgari-orani') this.oran = this.sonCiplak.div(asgariSon());
  }

  yanHaklarToplami(): Decimal {
    return topla(this.girdi.ucret.yanHaklar.map((y) => y.tutar));
  }

  giydirilmis(): Decimal {
    return this.sonCiplak.plus(this.yanHaklarToplami());
  }

  ciplak(tarih: string): Decimal {
    const u = this.girdi.ucret;
    switch (u.yontem) {
      case 'sabit':
        return this.sonCiplak;
      case 'asgari':
        return d(this.tablolar.asgariUcret.bul(tarih, this.kayit).brutAylik);
      case 'asgari-orani':
        return d(this.tablolar.asgariUcret.bul(tarih, this.kayit).brutAylik).times(this.oran!);
      case 'donemsel': {
        const satir = u.donemsel!.find((p) => karsilastir(p.baslangic, tarih) <= 0 && karsilastir(tarih, p.bitis) <= 0);
        if (!satir) throw new Error(`Dönemsel ücret listesinde ${trTarih(tarih)} tarihini kapsayan satır yok`);
        return satir.brutAylik;
      }
    }
  }

  /** [bas, bit] aralığını ücretin değiştiği günlerde böler; aralığın her günü kapsanmalıdır. */
  kesitler(bas: string, bit: string): UcretKesiti[] {
    const u = this.girdi.ucret;
    if (u.yontem === 'sabit') return [{ baslangic: bas, bitis: bit, aylik: this.sonCiplak }];
    if (u.yontem === 'asgari' || u.yontem === 'asgari-orani') {
      return this.tablolar.asgariUcret.kesitler(bas, bit, this.kayit).map((k) => ({
        baslangic: k.baslangic,
        bitis: k.bitis,
        aylik: u.yontem === 'asgari' ? d(k.satir.brutAylik) : d(k.satir.brutAylik).times(this.oran!),
      }));
    }
    const sonuc: UcretKesiti[] = [];
    for (let gun = bas; karsilastir(gun, bit) <= 0; ) {
      const satir = u.donemsel!.find((p) => karsilastir(p.baslangic, gun) <= 0 && karsilastir(gun, p.bitis) <= 0);
      if (!satir) throw new Error(`Dönemsel ücret listesinde ${trTarih(gun)} tarihini kapsayan satır yok`);
      const son = karsilastir(satir.bitis, bit) < 0 ? satir.bitis : bit;
      sonuc.push({ baslangic: gun, bitis: son, aylik: satir.brutAylik });
      gun = gunEkle(son, 1);
    }
    return sonuc;
  }

  yontemAciklamasi(): string {
    const u = this.girdi.ucret;
    switch (u.yontem) {
      case 'sabit':
        return `Tüm dönemlerde son çıplak brüt ücret (${tl(this.sonCiplak)} TL)`;
      case 'asgari':
        return 'Her dönemde o dönemin brüt asgari ücreti';
      case 'asgari-orani':
        return (
          `Son çıplak brüt ücretin (${tl(this.sonCiplak)} TL) ${trTarih(this.sonUcretTarihi)} tarihindeki brüt asgari ücrete oranı ` +
          `(${sayi(this.oran!, 6)}) her dönemin asgari ücretine uygulanır`
        );
      case 'donemsel':
        return 'Girdi dosyasında dönem dönem verilen brüt ücretler';
    }
  }
}
