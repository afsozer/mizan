// Resmi tablolar: her satır yürürlük aralığı ve kaynağıyla tutulur. Yükleme sırasında
// kaynaksız, çakışan ya da boşluklu satır reddedilir. Bitişi belli son satırdan sonrası sorulursa
// hesap durur. Açık uçlu son satır (kanunla belirlenen oranlar) doğrulama tarihinden sonra da
// kullanılır ama rapora uyarı düşer; eski oran sessizce yürümez.
import { d, Decimal, sayi, tl, topla, yuzde } from './para.ts';
import { gecerliTarih, gunEkle, karsilastir, trTarih, enBuyuk, enKucuk, yilAl } from './tarih.ts';

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

const ALANLAR: Record<string, { etiket: string; tur: 'tl' | 'oran' | 'kat' }> = {
  brutAylik: { etiket: 'aylık', tur: 'tl' },
  brutGunluk: { etiket: 'günlük', tur: 'tl' },
  tutar: { etiket: '', tur: 'tl' },
  oran: { etiket: '', tur: 'oran' },
  sgkIsci: { etiket: 'SGK', tur: 'oran' },
  issizlikIsci: { etiket: 'işsizlik', tur: 'oran' },
  ustSinirKati: { etiket: 'üst sınır', tur: 'kat' },
  reeskontOrani: { etiket: 'reeskont', tur: 'oran' },
  avansOrani: { etiket: 'avans', tur: 'oran' },
  asgariGiderimTutari: { etiket: 'asgari giderim', tur: 'tl' },
  basvurmaHarci: { etiket: 'başvurma', tur: 'tl' },
  pesinHarcOrani: { etiket: 'peşin harç', tur: 'oran' },
  tahsilTebligdenOnce: { etiket: 'tebliğden önce', tur: 'oran' },
  tahsilHacizdenOnce: { etiket: 'hacizden önce', tur: 'oran' },
  tahsilSatistanOnce: { etiket: 'satıştan önce', tur: 'oran' },
  tahsilSatistanSonra: { etiket: 'satıştan sonra', tur: 'oran' },
  tahsilMaasHaczi: { etiket: 'maaş haczi', tur: 'oran' },
  feragatCarpani: { etiket: 'feragat çarpanı', tur: 'oran' },
  cezaeviHarciOrani: { etiket: 'cezaevi harcı', tur: 'oran' },
};

function degerBicimle(alan: string, deger: string): string {
  const a = ALANLAR[alan] ?? { etiket: alan, tur: 'tl' as const };
  const metin = a.tur === 'tl' ? `${tl(d(deger))} TL` : a.tur === 'kat' ? `${sayi(d(deger))} kat` : yuzde(d(deger));
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
  ustSinirKati: string;
}
export interface AvansReeskontSatiri extends DonemSatiri {
  reeskontOrani: string;
  avansOrani: string;
}
export interface Ttk1530FaizSatiri extends DonemSatiri {
  oran: string;
  asgariGiderimTutari: string;
}
export interface IcraHarclariSatiri extends DonemSatiri {
  basvurmaHarci: string;
  pesinHarcOrani: string;
  tahsilTebligdenOnce: string;
  tahsilHacizdenOnce: string;
  tahsilSatistanOnce: string;
  tahsilSatistanSonra: string;
  tahsilMaasHaczi: string;
  feragatCarpani: string;
  cezaeviHarciOrani: string;
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

export interface UbgtTakvimGunu {
  tarih: string;
  gun: string;
  ad: string;
  tur: 'sabit' | 'dini';
}

export interface UbgtTakvimYili {
  yil: number;
  gunler: UbgtTakvimGunu[];
  kaynak: Kaynak;
}

export class UbgtTakvimi {
  readonly kod = 'ubgt-takvimi';
  readonly ad = 'Ulusal bayram ve genel tatil takvimi (2429 s.K.)';
  readonly aciklama?: string;
  readonly dogrulamaTarihi: string;
  readonly yillar: UbgtTakvimYili[];
  readonly satirlar: UbgtTakvimYili[];
  readonly ozet: string;

  constructor(dosya: TabloDosyasi<UbgtTakvimYili>, ozet = '') {
    this.yillar = dosya.satirlar;
    this.satirlar = dosya.satirlar;
    this.aciklama = dosya.aciklama;
    this.dogrulamaTarihi = dosya.dogrulamaTarihi;
    this.ozet = ozet;
    if (!gecerliTarih(this.dogrulamaTarihi)) throw new Error('UBGT takvimi: dogrulamaTarihi geçersiz');
    const yillar = this.yillar.map((y) => y.yil);
    if (new Set(yillar).size !== yillar.length) throw new Error('UBGT takvimi: aynı yıl birden fazla kez yazılmış');
    for (const y of this.yillar) {
      const yer = `UBGT takvimi ${y.yil}`;
      kaynakDenetle(y.kaynak, yer);
      if (!Array.isArray(y.gunler) || y.gunler.length === 0) throw new Error(`${yer}: tatil günü yok`);
      for (const g of y.gunler) {
        if (!gecerliTarih(g.tarih) || yilAl(g.tarih) !== y.yil) {
          throw new Error(`${yer}: "${g.tarih}" geçerli bir ${y.yil} tarihi olmalı`);
        }
        if (g.gun !== '1' && g.gun !== '0.5') {
          throw new Error(`${yer}: "${g.tarih}" gün katsayısı "1" veya "0.5" olmalı`);
        }
        if (typeof g.ad !== 'string' || !g.ad.trim()) throw new Error(`${yer}: "${g.tarih}" tatil adı boş`);
        if (g.tur !== 'sabit' && g.tur !== 'dini') throw new Error(`${yer}: "${g.tarih}" tür "sabit" veya "dini" olmalı`);
      }
    }
  }

  yil(yil: number, kayit?: KaynakKaydi): UbgtTakvimYili {
    const y = this.yillar.find((t) => t.yil === yil);
    if (!y) throw new Error(`${yil} yılı UBGT takvimi tabloda yok (data/ubgt-takvimi.json)`);
    const sabitGun = topla(y.gunler.filter((g) => g.tur === 'sabit').map((g) => d(g.gun)));
    const diniGun = topla(y.gunler.filter((g) => g.tur === 'dini').map((g) => d(g.gun)));
    kayit?.ekle({
      tablo: this.ad,
      tabloAciklamasi: this.aciklama,
      sira: String(yil),
      aralik: String(yil),
      deger: `sabit tatiller ${sayi(sabitGun)} gün, dini bayramlar ${sayi(diniGun)} gün`,
      kaynak: y.kaynak,
    });
    return y;
  }

  /** Verilen dönemlerdeki UBGT günlerini türetir; aynı miladi günde sabit + dini tatil çakışırsa yüksek katsayıyı alır. */
  turet(
    secenek: {
      donemler: { baslangic: string; bitis: string }[];
      diniBayramlarDahil?: boolean;
      haricTarihler?: string[];
    },
    kayit?: KaynakKaydi,
  ): { gunler: { tarih: string; gun: Decimal; aciklama: string }[]; notlar: string[] } {
    const diniDahil = secenek.diniBayramlarDahil ?? true;
    const haric = new Set(secenek.haricTarihler ?? []);
    const gruplar = new Map<string, UbgtTakvimGunu[]>();
    const notlar: string[] = [];
    let temmuz2016Notu = false;

    for (const donem of secenek.donemler) {
      const basYil = yilAl(donem.baslangic);
      const bitYil = yilAl(donem.bitis);
      for (let y = basYil; y <= bitYil; y++) {
        const yilVerisi = this.yil(y, kayit);
        if (
          y === 2016 &&
          !temmuz2016Notu &&
          karsilastir(donem.baslangic, '2016-07-15') <= 0 &&
          karsilastir('2016-07-15', donem.bitis) <= 0
        ) {
          notlar.push(
            '15.07.2016 tarihi, 6752 s.K. (RG 29.10.2016/29872) yayımı tarihinde yürürlüğe girdiğinden 2016 yılında genel tatil değildir; 15 Temmuz 2017 yılından itibaren genel tatil olarak hesaba katılır.',
          );
          temmuz2016Notu = true;
        }
        for (const g of yilVerisi.gunler) {
          if (karsilastir(g.tarih, donem.baslangic) < 0 || karsilastir(g.tarih, donem.bitis) > 0) continue;
          if (!diniDahil && g.tur === 'dini') continue;
          if (haric.has(g.tarih)) continue;
          const liste = gruplar.get(g.tarih) ?? [];
          if (!liste.some((x) => x.ad === g.ad && x.tur === g.tur)) {
            liste.push(g);
            gruplar.set(g.tarih, liste);
          }
        }
      }
    }

    const gunler: { tarih: string; gun: Decimal; aciklama: string }[] = [];
    for (const [tarih, grup] of [...gruplar.entries()].sort((a, b) => karsilastir(a[0], b[0]))) {
      if (grup.length === 1) {
        const tek = grup[0]!;
        gunler.push({ tarih, gun: d(tek.gun), aciklama: tek.ad });
      } else {
        const yuksek = Decimal.max(...grup.map((x) => d(x.gun)));
        const aciklama = grup.map((x) => x.ad).join(' / ');
        notlar.push(
          `${trTarih(tarih)} tarihinde ${grup.map((x) => `${x.ad} (${sayi(d(x.gun))} gün)`).join(' ile ')} çakıştığından çift sayım yapılmadı; Yargıtay uygulaması uyarınca tek tatil günü olarak yüksek katsayı (${sayi(yuksek)} gün) alındı (Yargıtay 9. HD 2015/30408 E., 2016/4301 K.).`,
        );
        gunler.push({ tarih, gun: yuksek, aciklama });
      }
    }

    return { gunler, notlar };
  }
}

export const AAUT_MAKTU_ANAHTARLARI = [
  'sulhHukuk',
  'sulhCezaInfaz',
  'asliye',
  'tuketici',
  'fikriSinai',
  'agirCeza',
  'cocuk',
  'cocukAgirCeza',
  'idareVergiDurusmasiz',
  'idareVergiDurusmali',
  'icraDairesi',
  'icraMahkemesiIs',
  'icraMahkemesiDava',
  'icraTahliye',
  'icraMahkemesiCeza',
  'bamBimIlkDerece',
  'bamBimIstinafTekDurusma',
  'bamBimIstinafCokluDurusma',
  'yargitayIlkDerece',
  'danistayIlkDereceDurusmasiz',
  'danistayIlkDereceDurusmali',
  'temyizDurusmasi',
] as const;

export type AautMaktuAnahtari = (typeof AAUT_MAKTU_ANAHTARLARI)[number];
export type AautMaktuUcretler = Record<AautMaktuAnahtari, string>;

export const AAUT_MAKTU_ETIKETLERI: Record<AautMaktuAnahtari, string> = {
  sulhHukuk: 'Sulh hukuk mahkemeleri',
  sulhCezaInfaz: 'Sulh ceza ve infaz hakimlikleri',
  asliye: 'Asliye mahkemeleri (hukuk, ticaret, iş, aile, asliye ceza)',
  tuketici: 'Tüketici mahkemeleri',
  fikriSinai: 'Fikri ve sınai haklar mahkemeleri',
  agirCeza: 'Ağır ceza mahkemeleri',
  cocuk: 'Çocuk mahkemeleri',
  cocukAgirCeza: 'Çocuk ağır ceza mahkemeleri',
  idareVergiDurusmasiz: 'İdare ve vergi mahkemeleri (duruşmasız)',
  idareVergiDurusmali: 'İdare ve vergi mahkemeleri (duruşmalı)',
  icraDairesi: 'İcra daireleri',
  icraMahkemesiIs: 'İcra mahkemeleri (iş)',
  icraMahkemesiDava: 'İcra mahkemeleri (dava ve duruşmalı iş)',
  icraTahliye: 'İcra daireleri (tahliye takibi)',
  icraMahkemesiCeza: 'İcra mahkemeleri (ceza işi)',
  bamBimIlkDerece: 'BAM / BİM (ilk derece)',
  bamBimIstinafTekDurusma: 'BAM / BİM (istinaf - tek duruşmalı)',
  bamBimIstinafCokluDurusma: 'BAM / BİM (istinaf - çoklu duruşma / keşifli)',
  yargitayIlkDerece: 'Yargıtay (ilk derece)',
  danistayIlkDereceDurusmasiz: 'Danıştay (ilk derece - duruşmasız)',
  danistayIlkDereceDurusmali: 'Danıştay (ilk derece - duruşmalı)',
  temyizDurusmasi: 'Yargıtay / Danıştay / Sayıştay temyiz duruşması',
};

export interface AautDilimi {
  dilimTutari: string | null;
  ustSinir: string | null;
  oran: string;
}

export interface AautSatiri extends DonemSatiri {
  donem: string;
  maktu: AautMaktuUcretler;
  dilimler: AautDilimi[];
}

export class AautTarifesi {
  readonly kod: string;
  readonly ad: string;
  readonly aciklama?: string;
  readonly dogrulamaTarihi: string;
  readonly satirlar: AautSatiri[];
  readonly ozet: string;

  constructor(dosya: TabloDosyasi<AautSatiri>, ozet = '') {
    this.kod = dosya.tablo;
    this.ad = dosya.ad;
    this.aciklama = dosya.aciklama;
    this.dogrulamaTarihi = dosya.dogrulamaTarihi;
    this.satirlar = dosya.satirlar;
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
      if (typeof s.donem !== 'string' || !s.donem.trim()) throw new Error(`${sy}: donem boş`);
      if (!s.maktu || typeof s.maktu !== 'object') throw new Error(`${sy}: maktu nesnesi yok`);
      for (const anahtar of AAUT_MAKTU_ANAHTARLARI) {
        const v = s.maktu[anahtar];
        if (typeof v !== 'string' || !SAYI.test(v)) throw new Error(`${sy}: maktu.${anahtar} sayı metni olmalı`);
      }
      if (!Array.isArray(s.dilimler) || s.dilimler.length === 0) throw new Error(`${sy}: dilimler boş`);
      let kumulatif = d(0);
      s.dilimler.forEach((dl, j) => {
        const son = j === s.dilimler.length - 1;
        if (typeof dl.oran !== 'string' || !SAYI.test(dl.oran)) throw new Error(`${sy}, dilim ${j + 1}: oran sayı metni olmalı`);
        if (son !== (dl.ustSinir === null) || son !== (dl.dilimTutari === null)) {
          throw new Error(`${sy}, dilim ${j + 1}: yalnız son dilimin dilimTutari ve ustSinir alanı boş olur`);
        }
        if (!son) {
          if (typeof dl.dilimTutari !== 'string' || !SAYI.test(dl.dilimTutari)) {
            throw new Error(`${sy}, dilim ${j + 1}: dilimTutari sayı metni olmalı`);
          }
          if (typeof dl.ustSinir !== 'string' || !SAYI.test(dl.ustSinir)) {
            throw new Error(`${sy}, dilim ${j + 1}: ustSinir sayı metni olmalı`);
          }
          kumulatif = kumulatif.plus(dl.dilimTutari);
          if (!kumulatif.eq(dl.ustSinir)) {
            throw new Error(`${sy}, dilim ${j + 1}: kümülatif dilim toplamı (${kumulatif.toString()}) ustSinir (${dl.ustSinir}) ile eşleşmiyor`);
          }
        }
      });
      kaynakDenetle(s.kaynak, sy);
      const sonraki = this.satirlar[i + 1];
      if (sonraki && (s.bitis === null || gunEkle(s.bitis, 1) !== sonraki.baslangic)) {
        throw new Error(`${sy}: sonraki satır ${s.bitis ? trTarih(gunEkle(s.bitis, 1)) : '?'} tarihinde başlamalı (boşluk ya da çakışma var)`);
      }
    });
  }

  bul(tarih: string, kayit?: KaynakKaydi, maktuEtiket?: string): AautSatiri {
    const ilk = this.satirlar[0]!;
    if (karsilastir(tarih, ilk.baslangic) < 0) {
      throw new Error(`${this.ad} tablosu ${trTarih(ilk.baslangic)} tarihinden başlıyor; ${trTarih(tarih)} için satır yok`);
    }
    const son = this.satirlar[this.satirlar.length - 1]!;
    if (son.bitis !== null && karsilastir(tarih, son.bitis) > 0) {
      throw new Error(`${this.ad} tablosu ${trTarih(son.bitis)} tarihinde bitiyor; ${trTarih(tarih)} için değer yok`);
    }
    if (son.bitis === null && karsilastir(tarih, this.dogrulamaTarihi) > 0) {
      kayit?.uyarilar.add(
        `${this.ad} tablosu ${trTarih(this.dogrulamaTarihi)} tarihinde doğrulandı; son satır (${son.donem}) ${trTarih(tarih)} için de kullanıldı. ` +
          `Bu tarihe kadar yeni tarife yayımlanmışsa data/${this.kod}.json güncellenmeli.`,
      );
    }
    const satir = this.satirlar.find(
      (s) => karsilastir(s.baslangic, tarih) <= 0 && (s.bitis === null || karsilastir(tarih, s.bitis) <= 0),
    );
    if (!satir) throw new Error(`${this.ad} tablosunda ${trTarih(tarih)} tarihini kapsayan satır yok`);

    const aralik = `${trTarih(satir.baslangic)} - ${satir.bitis ? trTarih(satir.bitis) : 'devam'}`;
    const dilimOzeti = satir.dilimler
      .map((dl, idx) =>
        dl.dilimTutari === null
          ? `${tl(d(satir.dilimler[idx - 1]!.ustSinir!), 0)} TL üzeri ${yuzde(d(dl.oran))}`
          : `${idx === 0 ? 'İlk' : 'Sonra gelen'} ${tl(d(dl.dilimTutari), 0)} TL ${yuzde(d(dl.oran))}`,
      )
      .join('; ');
    const degerMetni = maktuEtiket ? `${satir.donem} (${maktuEtiket}; ${dilimOzeti})` : `${satir.donem} (${dilimOzeti})`;
    kayit?.ekle({
      tablo: this.ad,
      tabloAciklamasi: this.aciklama,
      sira: satir.baslangic,
      aralik,
      deger: degerMetni,
      kaynak: satir.kaynak,
    });
    return satir;
  }
}

export interface Tablolar {
  asgariUcret: DonemselTablo<AsgariUcretSatiri>;
  kidemTavani: DonemselTablo<KidemTavaniSatiri>;
  sgk: DonemselTablo<SgkSatiri>;
  damga: DonemselTablo<OranSatiri>;
  yasalFaiz: DonemselTablo<OranSatiri>;
  mevduatFaizi: DonemselTablo<OranSatiri>;
  gelirVergisi: GelirVergisiTarifesi;
  ubgtTakvimi: UbgtTakvimi;
  avansReeskontFaizi?: DonemselTablo<AvansReeskontSatiri>;
  ttk1530Faizi?: DonemselTablo<Ttk1530FaizSatiri>;
  icraHarclari?: DonemselTablo<IcraHarclariSatiri>;
  aaut?: AautTarifesi;
}

/** data/ altındaki tablo dosyalarının adları; Node katmanı ve tarayıcı paketi aynı adları kullanır. */
export const TABLO_DOSYALARI = {
  asgariUcret: 'asgari-ucret.json',
  kidemTavani: 'kidem-tavani.json',
  sgk: 'sgk-isci-payi.json',
  damga: 'damga-vergisi.json',
  yasalFaiz: 'yasal-faiz.json',
  mevduatFaizi: 'mevduat-faizi.json',
  mevduatFaiziKamu: 'mevduat-faizi-kamu.json',
  gelirVergisi: 'gelir-vergisi.json',
  ubgtTakvimi: 'ubgt-takvimi.json',
  avansReeskontFaizi: 'avans-reeskont-faizi.json',
  ttk1530Faizi: 'ttk-1530-faizi.json',
  icraHarclari: 'icra-harclari.json',
  aaut: 'aaut.json',
} as const;

/** Ayrıştırılmış bir tablo dosyası ve (varsa) ham metninin SHA-256 özeti. */
export interface HamTablo {
  dosya: unknown;
  ozet?: string;
}

export interface HamTablolar {
  asgariUcret: HamTablo;
  kidemTavani: HamTablo;
  sgk: HamTablo;
  damga: HamTablo;
  yasalFaiz: HamTablo;
  mevduatFaizi: HamTablo;
  gelirVergisi: HamTablo;
  ubgtTakvimi?: HamTablo;
  avansReeskontFaizi?: HamTablo;
  ttk1530Faizi?: HamTablo;
  icraHarclari?: HamTablo;
  aaut?: HamTablo;
}

/** Ayrıştırılmış JSON tablolarından denetlenmiş tablo nesnelerini kurar (dosya erişimi yok). */
export function tablolariKur(h: HamTablolar): Tablolar {
  const kur = <S extends DonemSatiri>(t: HamTablo, alanlar: (keyof S & string)[]) =>
    new DonemselTablo<S>(t.dosya as TabloDosyasi<S>, alanlar, t.ozet ?? '');
  return {
    asgariUcret: kur<AsgariUcretSatiri>(h.asgariUcret, ['brutAylik', 'brutGunluk']),
    kidemTavani: kur<KidemTavaniSatiri>(h.kidemTavani, ['tutar']),
    sgk: kur<SgkSatiri>(h.sgk, ['sgkIsci', 'issizlikIsci', 'ustSinirKati']),
    damga: kur<OranSatiri>(h.damga, ['oran']),
    yasalFaiz: kur<OranSatiri>(h.yasalFaiz, ['oran']),
    mevduatFaizi: kur<OranSatiri>(h.mevduatFaizi, ['oran']),
    gelirVergisi: new GelirVergisiTarifesi(h.gelirVergisi.dosya as TabloDosyasi<GelirVergisiYili>, h.gelirVergisi.ozet ?? ''),
    ubgtTakvimi: h.ubgtTakvimi
      ? new UbgtTakvimi(h.ubgtTakvimi.dosya as TabloDosyasi<UbgtTakvimYili>, h.ubgtTakvimi.ozet ?? '')
      : new UbgtTakvimi({ tablo: 'ubgt-takvimi', ad: 'Ulusal bayram ve genel tatil takvimi (2429 s.K.)', dogrulamaTarihi: '2026-11-11', satirlar: [] }, ''),
    ...(h.avansReeskontFaizi
      ? { avansReeskontFaizi: kur<AvansReeskontSatiri>(h.avansReeskontFaizi, ['reeskontOrani', 'avansOrani']) }
      : {}),
    ...(h.ttk1530Faizi
      ? { ttk1530Faizi: kur<Ttk1530FaizSatiri>(h.ttk1530Faizi, ['oran', 'asgariGiderimTutari']) }
      : {}),
    ...(h.icraHarclari
      ? {
          icraHarclari: kur<IcraHarclariSatiri>(h.icraHarclari, [
            'basvurmaHarci',
            'pesinHarcOrani',
            'tahsilTebligdenOnce',
            'tahsilHacizdenOnce',
            'tahsilSatistanOnce',
            'tahsilSatistanSonra',
            'tahsilMaasHaczi',
            'feragatCarpani',
            'cezaeviHarciOrani',
          ]),
        }
      : {}),
    ...(h.aaut ? { aaut: new AautTarifesi(h.aaut.dosya as TabloDosyasi<AautSatiri>, h.aaut.ozet ?? '') } : {}),
  };
}
