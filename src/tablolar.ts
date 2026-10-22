// Resmi tablolar: her satır yürürlük aralığı ve kaynağıyla tutulur. Yükleme sırasında
// kaynaksız, çakışan ya da boşluklu satır reddedilir. Bitişi belli son satırdan sonrası sorulursa
// hesap durur. Açık uçlu son satır (kanunla belirlenen oranlar) doğrulama tarihinden sonra da
// kullanılır ama rapora uyarı düşer; eski oran sessizce yürümez.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { d, Decimal, tl, yuzde } from './para.ts';
import { gecerliTarih, gunEkle, karsilastir, trTarih, enBuyuk, enKucuk } from './tarih.ts';

export const VERI_DIZINI = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');

export interface Kaynak {
  ad: string;
  url?: string;
  belge?: string;
  resmiGazete?: { tarih: string; sayi: string; url?: string };
  dogrulama: string;
  not?: string;
}

export interface DonemSatiri {
  baslangic: string;
  bitis: string | null;
  kaynak: Kaynak;
}

export interface TabloDosyasi<S> {
  tablo: string;
  ad: string;
  aciklama?: string;
  /** Tablonun bu tarihe kadar resmi kaynaktan kontrol edildiği gün. */
  dogrulamaTarihi: string;
  satirlar: S[];
}

/** Hesapta kullanılan her tablo satırını, rapora kaynak listesi çıkarmak için toplar. */
export interface KaynakSatiri {
  tablo: string;
  tabloAciklamasi?: string;
  /** Sıralama için ISO başlangıç tarihi ya da yıl. */
  sira: string;
  aralik: string;
  deger: string;
  kaynak: Kaynak;
}

export class KaynakKaydi {
  kayitlar = new Map<string, KaynakSatiri>();
  uyarilar = new Set<string>();

  ekle(satir: KaynakSatiri): void {
    const anahtar = `${satir.tablo}|${satir.sira}`;
    if (!this.kayitlar.has(anahtar)) this.kayitlar.set(anahtar, satir);
  }

  /** Tablo tablo, her tablonun içinde tarih sırasıyla. */
  liste(): KaynakSatiri[] {
    const tablolar = [...new Set([...this.kayitlar.values()].map((k) => k.tablo))];
    return [...this.kayitlar.values()].sort(
      (a, b) => tablolar.indexOf(a.tablo) - tablolar.indexOf(b.tablo) || a.sira.localeCompare(b.sira),
    );
  }
}

const ALANLAR: Record<string, { etiket: string; tur: 'tl' | 'oran' }> = {
  brutAylik: { etiket: 'aylık', tur: 'tl' },
  brutGunluk: { etiket: 'günlük', tur: 'tl' },
  tutar: { etiket: '', tur: 'tl' },
  oran: { etiket: '', tur: 'oran' },
  sgkIsci: { etiket: 'SGK', tur: 'oran' },
  issizlikIsci: { etiket: 'işsizlik', tur: 'oran' },
};

function degerBicimle(alan: string, deger: string): string {
  const a = ALANLAR[alan] ?? { etiket: alan, tur: 'tl' as const };
  const metin = a.tur === 'tl' ? `${tl(d(deger))} TL` : yuzde(d(deger));
  return a.etiket ? `${a.etiket} ${metin}` : metin;
}

const SAYI = /^\d+(\.\d+)?$/;

function kaynakDenetle(k: unknown, yer: string): asserts k is Kaynak {
  if (!k || typeof k !== 'object') throw new Error(`${yer}: kaynak yok`);
  const kaynak = k as Record<string, unknown>;
  if (typeof kaynak.ad !== 'string' || !kaynak.ad.trim()) throw new Error(`${yer}: kaynak.ad boş`);
  const url = kaynak.url;
  if (url !== undefined && (typeof url !== 'string' || !/^https?:\/\//.test(url))) {
    throw new Error(`${yer}: kaynak.url http(s) bağlantısı olmalı`);
  }
  if (url === undefined && (typeof kaynak.belge !== 'string' || !kaynak.belge.trim())) {
    throw new Error(`${yer}: kaynak.url ya da kaynak.belge (ör. UYAP evrakı) zorunlu`);
  }
  if (typeof kaynak.dogrulama !== 'string' || !kaynak.dogrulama.trim()) {
    throw new Error(`${yer}: kaynak.dogrulama boş (değer kaynağın neresinden okundu?)`);
  }
}

export function tabloOku<S>(yol: string): { dosya: TabloDosyasi<S>; ozet: string } {
  const metin = readFileSync(yol, 'utf8');
  const dosya = JSON.parse(metin) as TabloDosyasi<S>;
  const ozet = createHash('sha256').update(metin).digest('hex');
  return { dosya, ozet };
}

export class DonemselTablo<S extends DonemSatiri> {
  readonly kod: string;
  readonly ad: string;
  readonly aciklama?: string;
  readonly dogrulamaTarihi: string;
  readonly satirlar: S[];
  readonly ozet: string;
  readonly degerAlanlari: (keyof S & string)[];

  constructor(dosya: TabloDosyasi<S>, degerAlanlari: (keyof S & string)[], ozet = '') {
    this.kod = dosya.tablo;
    this.ad = dosya.ad;
    this.aciklama = dosya.aciklama;
    this.dogrulamaTarihi = dosya.dogrulamaTarihi;
    this.satirlar = dosya.satirlar;
    this.degerAlanlari = degerAlanlari;
    this.ozet = ozet;
    this.denetle();
  }

  private denetle(): void {
    const yer = `Tablo "${this.kod}"`;
    if (!gecerliTarih(this.dogrulamaTarihi)) throw new Error(`${yer}: dogrulamaTarihi geçersiz`);
    if (this.satirlar.length === 0) throw new Error(`${yer}: satır yok`);
    this.satirlar.forEach((s, i) => {
      const sy = `${yer}, satır ${i + 1}`;
      if (!gecerliTarih(s.baslangic)) throw new Error(`${sy}: baslangic geçersiz`);
      if (s.bitis !== null && (!gecerliTarih(s.bitis) || karsilastir(s.bitis, s.baslangic) < 0)) {
        throw new Error(`${sy}: bitis geçersiz`);
      }
      if (s.bitis === null && i !== this.satirlar.length - 1) throw new Error(`${sy}: yalnız son satırın bitişi boş olabilir`);
      for (const alan of this.degerAlanlari) {
        const v = s[alan];
        if (typeof v !== 'string' || !SAYI.test(v)) throw new Error(`${sy}: "${alan}" sayı metni olmalı ("1234.56")`);
      }
      kaynakDenetle(s.kaynak, sy);
      const sonraki = this.satirlar[i + 1];
      if (sonraki && (s.bitis === null || gunEkle(s.bitis, 1) !== sonraki.baslangic)) {
        throw new Error(`${sy}: sonraki satır ${s.bitis ? trTarih(gunEkle(s.bitis, 1)) : '?'} tarihinde başlamalı (boşluk ya da çakışma var)`);
      }
    });
  }

  private aralikYaz(s: S): string {
    return `${trTarih(s.baslangic)} - ${s.bitis ? trTarih(s.bitis) : 'devam'}`;
  }

  private kapsamDenetle(tarih: string, kayit?: KaynakKaydi): void {
    const ilk = this.satirlar[0]!;
    if (karsilastir(tarih, ilk.baslangic) < 0) {
      throw new Error(`${this.ad} tablosu ${trTarih(ilk.baslangic)} tarihinden başlıyor; ${trTarih(tarih)} için satır yok`);
    }
    const son = this.satirlar[this.satirlar.length - 1]!;
    if (son.bitis !== null && karsilastir(tarih, son.bitis) > 0) {
      throw new Error(
        `${this.ad} tablosu ${trTarih(son.bitis)} tarihinde bitiyor; ${trTarih(tarih)} için değer yok. ` +
          `Kaynak yeni dönemi yayımladıysa data/${this.kod}.json dosyasına ekleyin`,
      );
    }
    if (son.bitis === null && karsilastir(tarih, this.dogrulamaTarihi) > 0) {
      kayit?.uyarilar.add(
        `${this.ad} tablosu ${trTarih(this.dogrulamaTarihi)} tarihinde doğrulandı; son satır ${trTarih(tarih)} için de kullanıldı. ` +
          `Bu tarihe kadar oran değişmişse data/${this.kod}.json güncellenmeli.`,
      );
    }
  }

  bul(tarih: string, kayit?: KaynakKaydi): S {
    this.kapsamDenetle(tarih, kayit);
    const satir = this.satirlar.find(
      (s) => karsilastir(s.baslangic, tarih) <= 0 && (s.bitis === null || karsilastir(tarih, s.bitis) <= 0),
    );
    if (!satir) throw new Error(`${this.ad} tablosunda ${trTarih(tarih)} tarihini kapsayan satır yok`);
    this.kaydet(satir, kayit);
    return satir;
  }

  /** [bas, bit] aralığını tablo satır sınırlarında böler (iki uç dahil). */
  kesitler(bas: string, bit: string, kayit?: KaynakKaydi): { baslangic: string; bitis: string; satir: S }[] {
    this.kapsamDenetle(bas, kayit);
    this.kapsamDenetle(bit, kayit);
    const sonuc: { baslangic: string; bitis: string; satir: S }[] = [];
    for (const s of this.satirlar) {
      const sBit = s.bitis ?? '9999-12-31';
      if (karsilastir(sBit, bas) < 0 || karsilastir(s.baslangic, bit) > 0) continue;
      sonuc.push({ baslangic: enBuyuk(s.baslangic, bas), bitis: enKucuk(sBit, bit), satir: s });
      this.kaydet(s, kayit);
    }
    return sonuc;
  }

  /** Satır başlangıçlarından [bas, bit] içine düşenler: ücret değişim sınırları. */
  sinirlar(bas: string, bit: string): string[] {
    return this.satirlar
      .map((s) => s.baslangic)
      .filter((t) => karsilastir(t, bas) > 0 && karsilastir(t, bit) <= 0);
  }

  private kaydet(s: S, kayit?: KaynakKaydi): void {
    kayit?.ekle({
      tablo: this.ad,
      tabloAciklamasi: this.aciklama,
      sira: s.baslangic,
      aralik: this.aralikYaz(s),
      deger: this.degerAlanlari.map((a) => degerBicimle(a, String(s[a]))).join(', '),
      kaynak: s.kaynak,
    });
  }
}

// --- Tablo türleri ---

export interface AsgariUcretSatiri extends DonemSatiri {
  brutAylik: string;
  brutGunluk: string;
}
export interface KidemTavaniSatiri extends DonemSatiri {
  tutar: string;
}
export interface OranSatiri extends DonemSatiri {
  oran: string;
}
export interface SgkSatiri extends DonemSatiri {
  sgkIsci: string;
  issizlikIsci: string;
}

export interface GelirVergisiYili {
  yil: number;
  dilimler: { ustSinir: string | null; oran: string }[];
  kaynak: Kaynak;
}

export class GelirVergisiTarifesi {
  readonly ad = 'Gelir vergisi tarifesi (ücret)';
  readonly aciklama?: string;
  readonly dogrulamaTarihi: string;
  readonly yillar: GelirVergisiYili[];
  readonly ozet: string;

  constructor(dosya: TabloDosyasi<GelirVergisiYili>, ozet = '') {
    this.yillar = dosya.satirlar;
    this.aciklama = dosya.aciklama;
    this.dogrulamaTarihi = dosya.dogrulamaTarihi;
    this.ozet = ozet;
    if (!gecerliTarih(this.dogrulamaTarihi)) throw new Error('Gelir vergisi tarifesi: dogrulamaTarihi geçersiz');
    const yillar = this.yillar.map((y) => y.yil);
    if (new Set(yillar).size !== yillar.length) throw new Error('Gelir vergisi tarifesi: aynı yıl birden fazla kez yazılmış');
    for (const y of this.yillar) {
      const yer = `Gelir vergisi tarifesi ${y.yil}`;
      const sinirlar = y.dilimler.filter((dl) => dl.ustSinir !== null).map((dl) => d(dl.ustSinir!));
      if (sinirlar.some((x, i) => i > 0 && x.lte(sinirlar[i - 1]!))) throw new Error(`${yer}: dilim üst sınırları artan sırada olmalı`);
      kaynakDenetle(y.kaynak, yer);
      if (y.dilimler.length === 0) throw new Error(`${yer}: dilim yok`);
      y.dilimler.forEach((dl, i) => {
        if (!SAYI.test(dl.oran)) throw new Error(`${yer}: oran sayı metni olmalı`);
        const son = i === y.dilimler.length - 1;
        if (son !== (dl.ustSinir === null)) throw new Error(`${yer}: yalnız son dilimin üst sınırı boş olur`);
        if (dl.ustSinir !== null && !SAYI.test(dl.ustSinir)) throw new Error(`${yer}: ustSinir sayı metni olmalı`);
      });
    }
  }

  yil(yil: number, kayit?: KaynakKaydi): GelirVergisiYili {
    const y = this.yillar.find((t) => t.yil === yil);
    if (!y) throw new Error(`${yil} yılı gelir vergisi tarifesi tabloda yok (data/gelir-vergisi.json)`);
    let alt = '0';
    const dilimler = y.dilimler.map((dl) => {
      const metin = dl.ustSinir === null ? `${tl(d(alt), 0)} üzeri: ${yuzde(d(dl.oran))}` : `${tl(d(alt), 0)}-${tl(d(dl.ustSinir), 0)}: ${yuzde(d(dl.oran))}`;
      alt = dl.ustSinir ?? alt;
      return metin;
    });
    kayit?.ekle({ tablo: this.ad, tabloAciklamasi: this.aciklama, sira: String(yil), aralik: String(yil), deger: dilimler.join('; '), kaynak: y.kaynak });
    return y;
  }

  /** Kümülatif matrahtaki artışa düşen vergi: V(onceki + matrah) - V(onceki). */
  vergi(yil: number, matrah: Decimal, oncekiKumulatif: Decimal, kayit?: KaynakKaydi): Decimal {
    const tarife = this.yil(yil, kayit);
    return toplamVergi(tarife, oncekiKumulatif.plus(matrah)).minus(toplamVergi(tarife, oncekiKumulatif));
  }
}

function toplamVergi(tarife: GelirVergisiYili, matrah: Decimal): Decimal {
  let vergi = d(0);
  let alt = d(0);
  for (const dl of tarife.dilimler) {
    const ust = dl.ustSinir === null ? null : d(dl.ustSinir);
    if (matrah.lte(alt)) break;
    const dilimdeki = (ust === null ? matrah : Decimal.min(matrah, ust)).minus(alt);
    vergi = vergi.plus(dilimdeki.times(dl.oran));
    if (ust === null) break;
    alt = ust;
  }
  return vergi;
}

export interface Tablolar {
  asgariUcret: DonemselTablo<AsgariUcretSatiri>;
  kidemTavani: DonemselTablo<KidemTavaniSatiri>;
  sgk: DonemselTablo<SgkSatiri>;
  damga: DonemselTablo<OranSatiri>;
  yasalFaiz: DonemselTablo<OranSatiri>;
  mevduatFaizi: DonemselTablo<OranSatiri>;
  gelirVergisi: GelirVergisiTarifesi;
}

export interface TabloYollari {
  /** "kamu" ya da bir tablo dosyası yolu (ör. banka yazısından girilen oranlar). */
  mevduatFaizi?: string;
}

export function tablolariYukle(yollar: TabloYollari = {}, dizin = VERI_DIZINI): Tablolar {
  const yukle = <S extends DonemSatiri>(yol: string, alanlar: (keyof S & string)[]) => {
    const { dosya, ozet } = tabloOku<S>(yol);
    return new DonemselTablo<S>(dosya, alanlar, ozet);
  };
  const gv = tabloOku<GelirVergisiYili>(join(dizin, 'gelir-vergisi.json'));
  return {
    asgariUcret: yukle<AsgariUcretSatiri>(join(dizin, 'asgari-ucret.json'), ['brutAylik', 'brutGunluk']),
    kidemTavani: yukle<KidemTavaniSatiri>(join(dizin, 'kidem-tavani.json'), ['tutar']),
    sgk: yukle<SgkSatiri>(join(dizin, 'sgk-isci-payi.json'), ['sgkIsci', 'issizlikIsci']),
    damga: yukle<OranSatiri>(join(dizin, 'damga-vergisi.json'), ['oran']),
    yasalFaiz: yukle<OranSatiri>(join(dizin, 'yasal-faiz.json'), ['oran']),
    mevduatFaizi: yukle<OranSatiri>(
      yollar.mevduatFaizi === 'kamu'
        ? join(dizin, 'mevduat-faizi-kamu.json')
        : resolve(yollar.mevduatFaizi ?? join(dizin, 'mevduat-faizi.json')),
      ['oran'],
    ),
    gelirVergisi: new GelirVergisiTarifesi(gv.dosya, gv.ozet),
  };
}
