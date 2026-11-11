// Aile hukuku mal rejimi tasfiyesi (edinilmis mallara katilma rejimi, 4721 s.K. TMK m.202-241)
// hesap cekirdegi: deger artis payi (TMK m.227), konut/tasit kredisi oranlamasi, eklenecek degerler
// (TMK m.229), denklestirme (TMK m.230), artik deger (TMK m.231), katilma alacagi ve takas (TMK m.236),
// zina/hayata kast hakkaniyet indirimi (TMK m.236/2) ve yasal faiz (TMK m.239/3).
import { d, Decimal, kurus, sayi, tl, topla, yuzde } from '../para.ts';
import type { Parametre } from '../parametreler.ts';
import { KaynakKaydi, type DonemselTablo, type OranSatiri } from '../tablolar.ts';
import { faizHesapla, type FaizSonucu } from '../faiz.ts';
import { karsilastir, trTarih } from '../tarih.ts';
import type {
  AileGirdi,
  DegerKaybiTabani,
  DenklestirmeYonu,
  EklenecekDegerGirdisi,
  MalGirdisi,
  MalNiteligi,
  TarafKodu,
} from './girdi.ts';

export interface AileTabloGirdisi {
  yasalFaiz?: DonemselTablo<OranSatiri>;
}

export interface DegerArtisPayiKalemi {
  malAdi: string;
  malik: TarafKodu;
  alacakli: TarafKodu;
  malNiteligi: MalNiteligi;
  aciklama: string;
  katkiTutari: Decimal;
  esasMalDegeri: Decimal;
  tasfiyeDegeri: Decimal;
  katkiOrani: Decimal;
  surumKarsiligi: Decimal;
  degerKaybiVar: boolean;
  degerKaybiTabani: DegerKaybiTabani;
  degerKaybiUygulandi: boolean;
  alacak: Decimal;
}

export interface KrediHesapDetayi {
  digerEsKisiselPesinat: Decimal;
  malikKisiselPesinat: Decimal;
  edinilmisPesinat: Decimal;
  toplamPesinat: Decimal;
  cekilenKredi: Decimal;
  krediAlimOrani: Decimal;
  evlilikIciOdenen: Decimal;
  evlilikSonrasiOdenen: Decimal;
  digerEsKisiselKrediOdemesi: Decimal;
  toplamKrediOdemesi: Decimal;
  digerEsKatkiOrani: Decimal;
  malikKisiselOrani: Decimal;
  evlilikSonrasiKrediOrani: Decimal;
  edinilmisPayOrani: Decimal;
  malikKisiselTasfiyeKarsiligi: Decimal;
  evlilikSonrasiKrediTasfiyeBorcu: Decimal;
  edinilmisTasfiyePayi: Decimal;
}

export interface MalHesapSonucu {
  ad: string;
  malik: TarafKodu;
  digerEs: TarafKodu;
  nitelik: MalNiteligi;
  edinmeTarihi?: string;
  edinmeDegeri: Decimal;
  tasfiyeDegeri: Decimal;
  digerEsKatkilari: DegerArtisPayiKalemi[];
  krediDetayi?: KrediHesapDetayi;
  malikKisiselKatkiDetayi?: {
    aciklama: string;
    katkiTutari: Decimal;
    oran: Decimal;
    tasfiyeKarsiligi: Decimal;
  };
  dogrudanBorc: Decimal;
  toplamMalaIliskinBorcVeKisiselKayma: Decimal;
  toplamDigerEsDap: Decimal;
  edinilmisNetDeger: Decimal;
  notlar: string[];
}

export interface DenklestirmeKalemi {
  es: TarafKodu;
  yon: DenklestirmeYonu;
  aciklama: string;
  yontem: 'sabit' | 'oranli';
  katkiTutari?: Decimal;
  edinmeDegeri?: Decimal;
  tasfiyeDegeri?: Decimal;
  katkiOrani?: Decimal;
  tutar: Decimal;
}

export interface TarafArtikDegerSonucu {
  taraf: TarafKodu;
  edinilmisMallarDegeri: Decimal;
  eklenecekDegerler: Decimal;
  denklestirmeAlacagi: Decimal;
  edinilmisMalBorclari: Decimal;
  digerEsDegerArtisPayi: Decimal;
  aktifToplam: Decimal;
  pasifToplam: Decimal;
  hamArtikDeger: Decimal;
  artikDeger: Decimal;
  eksiBakiyeSifirlandi: boolean;
}

export interface TarafKatilmaSonucu {
  alacakli: TarafKodu;
  borclu: TarafKodu;
  karsiArtikDeger: Decimal;
  bazPayOrani: Decimal;
  hamKatilmaAlacagi: Decimal;
  hakkaniyetIndirimi?: {
    neden: 'zina' | 'hayata-kast';
    uygulananPayOrani: Decimal;
    indirimOrani: Decimal;
    indirimTutari: Decimal;
    gerekce: string;
  };
  netKatilmaAlacagi: Decimal;
}

export interface AileAlacakKalemi {
  kod: string;
  ad: string;
  alacakli: TarafKodu;
  borclu: TarafKodu;
  tur: 'deger-artis-payi' | 'katilma-alacagi';
  dayanak: string;
  tutar: Decimal;
  faiz?: FaizSonucu;
}

export interface AileTakasSonucu {
  davaciKatilma: Decimal;
  davaliKatilma: Decimal;
  katilmaTakasTutari: Decimal;
  davaciNetKatilma: Decimal;
  davaliNetKatilma: Decimal;
  davaciDegerArtisPayi: Decimal;
  davaliDegerArtisPayi: Decimal;
  davaciToplamAlacak: Decimal;
  davaliToplamAlacak: Decimal;
  genelTakasTutari: Decimal;
  netAlacakli: TarafKodu | 'denk';
  netBakiye: Decimal;
}

export interface AileHesapSonucu {
  girdi: AileGirdi;
  tasfiyeTarihi: string;
  faizBitis: string;
  faizGunEsasi: Decimal;
  parametreler: Parametre[];
  mallar: MalHesapSonucu[];
  degerArtisPaylari: DegerArtisPayiKalemi[];
  eklenecekDegerler: EklenecekDegerGirdisi[];
  denklestirmeler: DenklestirmeKalemi[];
  artikDeger: { davaci: TarafArtikDegerSonucu; davali: TarafArtikDegerSonucu };
  katilma: { davaci: TarafKatilmaSonucu; davali: TarafKatilmaSonucu };
  takas: AileTakasSonucu;
  alacakKalemleri: AileAlacakKalemi[];
  toplamFaiz: { davaci: Decimal; davali: Decimal };
  kaynaklar: ReturnType<KaynakKaydi['liste']>;
  uyarilar: string[];
  notlar: string[];
  tabloOzetleri: { ad: string; dogrulamaTarihi: string; ozet: string }[];
}

export function tarafAdi(t: TarafKodu): string {
  return t === 'davaci' ? 'Davacı' : 'Davalı';
}

export function karsiTaraf(t: TarafKodu): TarafKodu {
  return t === 'davaci' ? 'davali' : 'davaci';
}

function dapHesapla(
  malAdi: string,
  malik: TarafKodu,
  malNiteligi: MalNiteligi,
  aciklama: string,
  katkiTutari: Decimal,
  esasMalDegeri: Decimal,
  tasfiyeDegeri: Decimal,
  degerKaybiTabani: DegerKaybiTabani,
): DegerArtisPayiKalemi {
  const alacakli = karsiTaraf(malik);
  const katkiOrani = katkiTutari.div(esasMalDegeri);
  const surumKarsiligi = kurus(katkiOrani.times(tasfiyeDegeri));
  const degerKaybiVar = tasfiyeDegeri.lt(esasMalDegeri);
  const degerKaybiUygulandi = degerKaybiVar && degerKaybiTabani === 'baslangic-degeri';
  const alacak = degerKaybiUygulandi ? kurus(Decimal.max(katkiTutari, surumKarsiligi)) : surumKarsiligi;
  return {
    malAdi,
    malik,
    alacakli,
    malNiteligi,
    aciklama,
    katkiTutari,
    esasMalDegeri,
    tasfiyeDegeri,
    katkiOrani,
    surumKarsiligi,
    degerKaybiVar,
    degerKaybiTabani,
    degerKaybiUygulandi,
    alacak,
  };
}

function malHesapla(m: MalGirdisi, varsayilanDegerKaybiTabani: DegerKaybiTabani): MalHesapSonucu {
  const digerEs = karsiTaraf(m.malik);
  const notlar: string[] = [];
  const digerEsKatkilari: DegerArtisPayiKalemi[] = [];

  for (const k of m.digerEsKatkilari) {
    const esasDeger = k.katkiTarihiMalDegeri ?? m.edinmeDegeri;
    const taban = k.degerKaybiTabani ?? varsayilanDegerKaybiTabani;
    const kalem = dapHesapla(m.ad, m.malik, m.nitelik, k.aciklama, k.katkiTutari, esasDeger, m.tasfiyeDegeri, taban);
    if (kalem.degerKaybiVar) {
      if (kalem.degerKaybiUygulandi) {
        notlar.push(
          `${m.ad}: tasfiye değeri (${tl(m.tasfiyeDegeri)} TL) katkı/edinme değerinin (${tl(esasDeger)} TL) altında kaldığından ` +
            `TMK m.227/1 c.son uyarınca katkının başlangıçtaki değeri (${tl(k.katkiTutari)} TL) esas alındı.`,
        );
      } else {
        notlar.push(
          `${m.ad}: değer kaybı olmasına karşın yazılı anlaşma (TMK m.227/3, girdi: ${k.degerKaybiGerekcesi ?? 'parametre'}) ` +
            `uyarınca sürüm değeri oranı (${tl(kalem.surumKarsiligi)} TL) esas alındı.`,
        );
      }
    }
    digerEsKatkilari.push(kalem);
  }

  let krediDetayi: KrediHesapDetayi | undefined;
  if (m.kredi) {
    const kr = m.kredi;
    const digerEsKisiselPesinat = kr.digerEsKisiselPesinat ?? d(0);
    const malikKisiselPesinat = kr.malikKisiselPesinat ?? d(0);
    const edinilmisPesinat = kr.edinilmisPesinat ?? d(0);
    const toplamPesinat = digerEsKisiselPesinat.plus(malikKisiselPesinat).plus(edinilmisPesinat);
    const cekilenKredi = kr.cekilenKredi ?? m.edinmeDegeri.minus(toplamPesinat);
    const krediAlimOrani = cekilenKredi.div(m.edinmeDegeri);

    const evlilikIciOdenen = kr.evlilikIciOdenen;
    const evlilikSonrasiOdenen = kr.evlilikSonrasiOdenen ?? d(0);
    const digerEsKisiselKrediOdemesi = kr.digerEsKisiselKrediOdemesi ?? d(0);
    const toplamKrediOdemesi = evlilikIciOdenen.plus(evlilikSonrasiOdenen).plus(digerEsKisiselKrediOdemesi);

    const digerEsPesinatOrani = digerEsKisiselPesinat.div(m.edinmeDegeri);
    const digerEsKrediOrani = toplamKrediOdemesi.isZero()
      ? d(0)
      : krediAlimOrani.times(digerEsKisiselKrediOdemesi.div(toplamKrediOdemesi));
    const digerEsKatkiOrani = digerEsPesinatOrani.plus(digerEsKrediOrani);

    const malikKisiselOrani = malikKisiselPesinat.div(m.edinmeDegeri);
    const evlilikSonrasiKrediOrani = toplamKrediOdemesi.isZero()
      ? d(0)
      : krediAlimOrani.times(evlilikSonrasiOdenen.div(toplamKrediOdemesi));
    const edinilmisPesinatOrani = edinilmisPesinat.div(m.edinmeDegeri);
    const evlilikIciKrediOrani = toplamKrediOdemesi.isZero()
      ? d(0)
      : krediAlimOrani.times(evlilikIciOdenen.div(toplamKrediOdemesi));
    const edinilmisPayOrani = edinilmisPesinatOrani.plus(evlilikIciKrediOrani);

    const malikKisiselTasfiyeKarsiligi = kurus(malikKisiselOrani.times(m.tasfiyeDegeri));
    const evlilikSonrasiKrediTasfiyeBorcu = kurus(evlilikSonrasiKrediOrani.times(m.tasfiyeDegeri));
    const edinilmisTasfiyePayi = kurus(edinilmisPayOrani.times(m.tasfiyeDegeri));

    krediDetayi = {
      digerEsKisiselPesinat,
      malikKisiselPesinat,
      edinilmisPesinat,
      toplamPesinat,
      cekilenKredi,
      krediAlimOrani,
      evlilikIciOdenen,
      evlilikSonrasiOdenen,
      digerEsKisiselKrediOdemesi,
      toplamKrediOdemesi,
      digerEsKatkiOrani,
      malikKisiselOrani,
      evlilikSonrasiKrediOrani,
      edinilmisPayOrani,
      malikKisiselTasfiyeKarsiligi,
      evlilikSonrasiKrediTasfiyeBorcu,
      edinilmisTasfiyePayi,
    };

    if (digerEsKatkiOrani.gt(0)) {
      const baslangicKarsiligi = digerEsKatkiOrani.times(m.edinmeDegeri);
      const taban = kr.degerKaybiTabani ?? varsayilanDegerKaybiTabani;
      const krediDap = dapHesapla(
        m.ad,
        m.malik,
        m.nitelik,
        'Krediyle edinimde diğer eşin kişisel peşinat/kredi ödemesi katkısı',
        kurus(baslangicKarsiligi),
        m.edinmeDegeri,
        m.tasfiyeDegeri,
        taban,
      );
      // Tam duyarlikli kredi katki oranini koru
      const surumKarsiligi = kurus(digerEsKatkiOrani.times(m.tasfiyeDegeri));
      const degerKaybiVar = m.tasfiyeDegeri.lt(m.edinmeDegeri);
      const degerKaybiUygulandi = degerKaybiVar && taban === 'baslangic-degeri';
      const alacak = degerKaybiUygulandi ? kurus(Decimal.max(baslangicKarsiligi, surumKarsiligi)) : surumKarsiligi;
      digerEsKatkilari.push({
        ...krediDap,
        katkiOrani: digerEsKatkiOrani,
        surumKarsiligi,
        degerKaybiVar,
        degerKaybiUygulandi,
        alacak,
      });
    }
  }

  let malikKisiselKatkiDetayi: MalHesapSonucu['malikKisiselKatkiDetayi'];
  if (m.malikKisiselKatkisi) {
    const oran = m.malikKisiselKatkisi.katkiTutari.div(m.edinmeDegeri);
    const tasfiyeKarsiligi = kurus(oran.times(m.tasfiyeDegeri));
    malikKisiselKatkiDetayi = {
      aciklama: m.malikKisiselKatkisi.aciklama,
      katkiTutari: m.malikKisiselKatkisi.katkiTutari,
      oran,
      tasfiyeKarsiligi,
    };
  }

  const dogrudanBorc = m.malaIliskinBorc ?? d(0);
  const toplamMalaIliskinBorcVeKisiselKayma =
    m.nitelik === 'edinilmis'
      ? dogrudanBorc
          .plus(krediDetayi?.evlilikSonrasiKrediTasfiyeBorcu ?? d(0))
          .plus(krediDetayi?.malikKisiselTasfiyeKarsiligi ?? d(0))
          .plus(malikKisiselKatkiDetayi?.tasfiyeKarsiligi ?? d(0))
      : dogrudanBorc;

  const toplamDigerEsDap = topla(digerEsKatkilari.map((x) => x.alacak));
  const edinilmisNetDeger =
    m.nitelik === 'edinilmis'
      ? Decimal.max(d(0), m.tasfiyeDegeri.minus(toplamMalaIliskinBorcVeKisiselKayma).minus(toplamDigerEsDap))
      : d(0);

  return {
    ad: m.ad,
    malik: m.malik,
    digerEs,
    nitelik: m.nitelik,
    edinmeTarihi: m.edinmeTarihi,
    edinmeDegeri: m.edinmeDegeri,
    tasfiyeDegeri: m.tasfiyeDegeri,
    digerEsKatkilari,
    krediDetayi,
    malikKisiselKatkiDetayi,
    dogrudanBorc,
    toplamMalaIliskinBorcVeKisiselKayma,
    toplamDigerEsDap,
    edinilmisNetDeger,
    notlar,
  };
}

export function aileHesapla(girdi: AileGirdi, tablolar: AileTabloGirdisi = {}): AileHesapSonucu {
  const kayit = new KaynakKaydi();
  const parametreler: Parametre[] = [];
  const notlar: string[] = [];
  const p = girdi.parametreler;

  const tasfiyeTarihi = girdi.evlilik.tasfiyeTarihi ?? girdi.hesapTarihi;
  parametreler.push({
    ad: 'Tasfiye (değerlendirme) tarihi',
    deger: trTarih(tasfiyeTarihi),
    kaynak: girdi.evlilik.tasfiyeTarihi ? 'girdi' : 'varsayılan',
    dayanak: 'TMK m.227/1, m.228/1, m.232, m.235/1; Yargıtay 2. HD 12.09.2024, 2023/5107 E., 2024/5735 K. (karar tarihi)',
  });

  const faizBitis = girdi.faizBitis ?? girdi.hesapTarihi;
  parametreler.push({
    ad: 'Faiz bitiş tarihi',
    deger: trTarih(faizBitis),
    kaynak: girdi.faizBitis ? 'girdi' : 'varsayılan',
    dayanak: 'Hesap tarihi',
  });

  const faizGunEsasi = p.faizGunEsasi ?? d(365);
  parametreler.push({
    ad: 'Faiz gün esası',
    deger: `yıllık oran / ${sayi(faizGunEsasi)} × gün`,
    kaynak: p.faizGunEsasi ? 'girdi' : 'varsayılan',
    dayanak: 'Basit faiz (Yargıtay 8. HD 2014/9167 E.)',
  });

  const varsayilanDegerKaybiTabani: DegerKaybiTabani = p.degerKaybiTabani ?? 'baslangic-degeri';
  parametreler.push({
    ad: 'Değer kaybında değer artış payı tabanı',
    deger:
      varsayilanDegerKaybiTabani === 'baslangic-degeri'
        ? 'katkının başlangıçtaki değeri (TMK m.227/1 c.son)'
        : `sürüm değeri oranı (yazılı anlaşma: ${p.degerKaybiGerekcesi})`,
    kaynak: p.degerKaybiTabani ? 'girdi' : 'varsayılan',
    dayanak: 'TMK m.227/1 c.son ve m.227/3',
  });

  parametreler.push({
    ad: 'Artık değerde eksi bakiye',
    deger: '0,00 TL alınır (değer eksilmesi göz önüne alınmaz)',
    kaynak: 'varsayılan',
    dayanak: 'TMK m.231/2',
  });

  const bazPayDavaci = p.katilmaOrani ? p.katilmaOrani.davaci : d('0.5');
  const bazPayDavali = p.katilmaOrani ? p.katilmaOrani.davali : d('0.5');
  parametreler.push({
    ad: 'Artık değere katılma payı oranı',
    deger: p.katilmaOrani
      ? `Davacı ${yuzde(bazPayDavaci)}, Davalı ${yuzde(bazPayDavali)} (${p.katilmaOrani.gerekce})`
      : 'her eş için diğer eşin artık değerinin 1/2\'si (%50)',
    kaynak: p.katilmaOrani ? 'girdi' : 'varsayılan',
    dayanak: p.katilmaOrani ? 'TMK m.237, m.238 (mal rejimi sözleşmesi)' : 'TMK m.236/1 c.1',
  });

  if (p.hakkaniyetIndirimi) {
    const hi = p.hakkaniyetIndirimi;
    const nedenMetni = hi.neden === 'zina' ? 'zina (TMK m.161)' : 'hayata kast (TMK m.162)';
    const degerMetni =
      hi.yeniPayOrani !== undefined
        ? `${tarafAdi(hi.kusurluEs)} için katılma payı oranı ${yuzde(hi.yeniPayOrani)} olarak uygulandı (${nedenMetni}; ${hi.gerekce})`
        : `${tarafAdi(hi.kusurluEs)} katılma alacağına ${yuzde(hi.indirimOrani!)} indirim uygulandı (${nedenMetni}; ${hi.gerekce})`;
    parametreler.push({
      ad: 'Zina / hayata kast hakkaniyet indirimi',
      deger: degerMetni,
      kaynak: 'girdi',
      dayanak:
        'TMK m.236/2; yalnız katılma alacağına uygulanır, değer artış payı alacağına (TMK m.227) uygulanmaz (Yargıtay 8. HD 30.11.2015, 2014/12512 E., 2015/21469 K.)',
    });
  }

  const takasKapsami = p.takasKapsami ?? 'tum-alacaklar';
  parametreler.push({
    ad: 'Alacakların takası',
    deger:
      takasKapsami === 'tum-alacaklar'
        ? 'karşılıklı katılma alacakları (TMK m.236/1 c.2) ve değer artış payı alacakları mahsup edilerek net bakiye bulunur'
        : 'yalnız karşılıklı katılma alacakları takas edilir (TMK m.236/1 c.2); değer artış payı ayrıca gösterilir',
    kaynak: p.takasKapsami ? 'girdi' : 'varsayılan',
    dayanak: 'TMK m.236/1 c.2, TBK m.139',
  });

  if (karsilastir(girdi.evlilik.evlenmeTarihi, '2002-01-01') < 0) {
    notlar.push(
      `Evlenme tarihi (${trTarih(girdi.evlilik.evlenmeTarihi)}) 01.01.2002 öncesindedir. 4722 s.K. m.10 uyarınca sözleşmeyle başka rejim seçilmemişse ` +
        '01.01.2002 tarihine kadar mal ayrılığı (743 s. TKM m.170), 01.01.2002 tarihinden itibaren edinilmiş mallara katılma rejimi (4721 s. TMK m.202) geçerlidir.',
    );
  }

  const mallar = girdi.mallar.map((m) => malHesapla(m, varsayilanDegerKaybiTabani));
  for (const m of mallar) notlar.push(...m.notlar);

  const degerArtisPaylari = mallar.flatMap((m) => m.digerEsKatkilari);

  const denklestirmeler: DenklestirmeKalemi[] = girdi.denklestirmeler.map((dk) => {
    if (dk.tutar !== undefined) {
      return {
        es: dk.es,
        yon: dk.yon,
        aciklama: dk.aciklama,
        yontem: 'sabit',
        tutar: dk.tutar,
      };
    }
    const katkiOrani = dk.katkiTutari!.div(dk.edinmeDegeri!);
    const tutar = kurus(katkiOrani.times(dk.tasfiyeDegeri!));
    return {
      es: dk.es,
      yon: dk.yon,
      aciklama: dk.aciklama,
      yontem: 'oranli',
      katkiTutari: dk.katkiTutari,
      edinmeDegeri: dk.edinmeDegeri,
      tasfiyeDegeri: dk.tasfiyeDegeri,
      katkiOrani,
      tutar,
    };
  });

  const artikDegerHesapla = (taraf: TarafKodu): TarafArtikDegerSonucu => {
    const tarafEdinilmisMallar = mallar.filter((m) => m.malik === taraf && m.nitelik === 'edinilmis');
    const edinilmisMallarDegeri = topla(tarafEdinilmisMallar.map((m) => m.tasfiyeDegeri));
    const eklenecekDegerler = topla(girdi.eklenecekDegerler.filter((e) => e.es === taraf).map((e) => e.tutar));
    const denklestirmeAlacagi = topla(
      denklestirmeler.filter((dk) => dk.es === taraf && dk.yon === 'edinilmisten-kisisele').map((dk) => dk.tutar),
    );
    const malBorclari = topla(tarafEdinilmisMallar.map((m) => m.toplamMalaIliskinBorcVeKisiselKayma));
    const denklestirmeBorclari = topla(
      denklestirmeler.filter((dk) => dk.es === taraf && dk.yon === 'kisiselden-edinilmise').map((dk) => dk.tutar),
    );
    const edinilmisMalBorclari = malBorclari.plus(denklestirmeBorclari);
    const digerEsDegerArtisPayi = topla(tarafEdinilmisMallar.map((m) => m.toplamDigerEsDap));

    const aktifToplam = edinilmisMallarDegeri.plus(eklenecekDegerler).plus(denklestirmeAlacagi);
    const pasifToplam = edinilmisMalBorclari.plus(digerEsDegerArtisPayi);
    const hamArtikDeger = aktifToplam.minus(pasifToplam);
    const eksiBakiyeSifirlandi = hamArtikDeger.isNegative();
    const artikDeger = eksiBakiyeSifirlandi ? d(0) : hamArtikDeger;
    if (eksiBakiyeSifirlandi) {
      notlar.push(
        `${tarafAdi(taraf)} için edinilmiş mal pasifi aktifini aştığından (${tl(hamArtikDeger)} TL), TMK m.231/2 uyarınca değer eksilmesi göz önüne alınmayarak artık değer 0,00 TL kabul edildi.`,
      );
    }
    return {
      taraf,
      edinilmisMallarDegeri,
      eklenecekDegerler,
      denklestirmeAlacagi,
      edinilmisMalBorclari,
      digerEsDegerArtisPayi,
      aktifToplam,
      pasifToplam,
      hamArtikDeger,
      artikDeger,
      eksiBakiyeSifirlandi,
    };
  };

  const artikDeger = {
    davaci: artikDegerHesapla('davaci'),
    davali: artikDegerHesapla('davali'),
  };

  const katilmaHesapla = (alacakli: TarafKodu): TarafKatilmaSonucu => {
    const borclu = karsiTaraf(alacakli);
    const karsiArtikDeger = artikDeger[borclu].artikDeger;
    const bazPayOrani = alacakli === 'davaci' ? bazPayDavaci : bazPayDavali;
    const hamKatilmaAlacagi = kurus(karsiArtikDeger.times(bazPayOrani));
    const hi = p.hakkaniyetIndirimi;
    if (hi && hi.kusurluEs === alacakli) {
      let uygulananPayOrani: Decimal;
      let indirimOrani: Decimal;
      let indirimTutari: Decimal;
      let netKatilmaAlacagi: Decimal;
      if (hi.yeniPayOrani !== undefined) {
        uygulananPayOrani = hi.yeniPayOrani;
        netKatilmaAlacagi = kurus(karsiArtikDeger.times(uygulananPayOrani));
        indirimTutari = hamKatilmaAlacagi.minus(netKatilmaAlacagi);
        indirimOrani = bazPayOrani.isZero() ? d(0) : bazPayOrani.minus(uygulananPayOrani).div(bazPayOrani);
      } else {
        indirimOrani = hi.indirimOrani!;
        indirimTutari = kurus(hamKatilmaAlacagi.times(indirimOrani));
        netKatilmaAlacagi = hamKatilmaAlacagi.minus(indirimTutari);
        uygulananPayOrani = bazPayOrani.times(d(1).minus(indirimOrani));
      }
      return {
        alacakli,
        borclu,
        karsiArtikDeger,
        bazPayOrani,
        hamKatilmaAlacagi,
        hakkaniyetIndirimi: {
          neden: hi.neden,
          uygulananPayOrani,
          indirimOrani,
          indirimTutari,
          gerekce: hi.gerekce,
        },
        netKatilmaAlacagi,
      };
    }
    return {
      alacakli,
      borclu,
      karsiArtikDeger,
      bazPayOrani,
      hamKatilmaAlacagi,
      netKatilmaAlacagi: hamKatilmaAlacagi,
    };
  };

  const katilma = {
    davaci: katilmaHesapla('davaci'),
    davali: katilmaHesapla('davali'),
  };

  const davaciKatilma = katilma.davaci.netKatilmaAlacagi;
  const davaliKatilma = katilma.davali.netKatilmaAlacagi;
  const katilmaTakasTutari = Decimal.min(davaciKatilma, davaliKatilma);
  const davaciNetKatilma = davaciKatilma.minus(katilmaTakasTutari);
  const davaliNetKatilma = davaliKatilma.minus(katilmaTakasTutari);

  const davaciDegerArtisPayi = topla(degerArtisPaylari.filter((x) => x.alacakli === 'davaci').map((x) => x.alacak));
  const davaliDegerArtisPayi = topla(degerArtisPaylari.filter((x) => x.alacakli === 'davali').map((x) => x.alacak));

  const davaciToplamAlacak = davaciDegerArtisPayi.plus(davaciNetKatilma);
  const davaliToplamAlacak = davaliDegerArtisPayi.plus(davaliNetKatilma);
  const genelTakasTutari =
    takasKapsami === 'tum-alacaklar' ? Decimal.min(davaciToplamAlacak, davaliToplamAlacak) : d(0);
  const netAlacakli: TarafKodu | 'denk' = davaciToplamAlacak.gt(davaliToplamAlacak)
    ? 'davaci'
    : davaliToplamAlacak.gt(davaciToplamAlacak)
      ? 'davali'
      : 'denk';
  const netBakiye = davaciToplamAlacak.minus(davaliToplamAlacak).abs();

  const takas: AileTakasSonucu = {
    davaciKatilma,
    davaliKatilma,
    katilmaTakasTutari,
    davaciNetKatilma,
    davaliNetKatilma,
    davaciDegerArtisPayi,
    davaliDegerArtisPayi,
    davaciToplamAlacak,
    davaliToplamAlacak,
    genelTakasTutari,
    netAlacakli,
    netBakiye,
  };

  // Faiz tercihleri (TMK m.239/3)
  const dapFaizTercihi = p.degerArtisPayiFaizi ?? {
    baslangicEsasi: 'tasfiye-tarihi' as const,
    gerekce: 'TMK m.239/3; Yargıtay 2. HD 2023/5107 E., 2024/5735 K. (tasfiye/karar tarihi)',
  };
  const dapFaizBaslangici =
    dapFaizTercihi.baslangicEsasi === 'tasfiye-tarihi'
      ? tasfiyeTarihi
      : dapFaizTercihi.baslangicEsasi === 'dava-tarihi'
        ? (dapFaizTercihi.baslangicTarihi ?? girdi.evlilik.davaTarihi!)
        : dapFaizTercihi.baslangicTarihi;

  parametreler.push({
    ad: 'Değer artış payı faiz başlangıcı',
    deger:
      dapFaizTercihi.baslangicEsasi === 'yok'
        ? `faiz istenmedi (${dapFaizTercihi.gerekce})`
        : `${trTarih(dapFaizBaslangici!)} (${dapFaizTercihi.baslangicEsasi === 'tasfiye-tarihi' ? 'tasfiye/karar tarihi' : dapFaizTercihi.baslangicEsasi === 'dava-tarihi' ? 'dava tarihi' : 'özel tarih'}; ${dapFaizTercihi.gerekce})`,
    kaynak: p.degerArtisPayiFaizi ? 'girdi' : 'varsayılan',
    dayanak: 'TMK m.239/3; Yargıtay 2. HD 2023/5107 E., 2024/5735 K.',
  });

  const katilmaFaizTercihi = p.katilmaAlacagiFaizi ?? {
    baslangicEsasi: 'tasfiye-tarihi' as const,
    gerekce: 'TMK m.239/3; Yargıtay 8. HD 2016/1104 E., 2018/13401 K. (tasfiye/karar tarihi)',
  };
  const katilmaFaizBaslangici =
    katilmaFaizTercihi.baslangicEsasi === 'tasfiye-tarihi' ? tasfiyeTarihi : katilmaFaizTercihi.baslangicTarihi;

  parametreler.push({
    ad: 'Katılma alacağı faiz başlangıcı',
    deger:
      katilmaFaizTercihi.baslangicEsasi === 'yok'
        ? `faiz istenmedi (${katilmaFaizTercihi.gerekce})`
        : `${trTarih(katilmaFaizBaslangici!)} (${katilmaFaizTercihi.baslangicEsasi === 'tasfiye-tarihi' ? 'tasfiye/karar tarihi' : 'özel tarih'}; ${katilmaFaizTercihi.gerekce})`,
    kaynak: p.katilmaAlacagiFaizi ? 'girdi' : 'varsayılan',
    dayanak: 'TMK m.239/3; Yargıtay 8. HD 30.05.2018, 2016/1104 E., 2018/13401 K.',
  });

  const alacakKalemleri: AileAlacakKalemi[] = [];

  const faizOlustur = (matrah: Decimal, baslangic: string | undefined, bitis: string, gerekce: string): FaizSonucu | undefined => {
    if (!baslangic || !tablolar.yasalFaiz || matrah.lte(0)) return undefined;
    return faizHesapla(tablolar.yasalFaiz, 'yasal', matrah, baslangic, bitis, faizGunEsasi, gerekce, kayit);
  };

  const dapTakasTutari =
    takasKapsami === 'tum-alacaklar' ? Decimal.min(davaciDegerArtisPayi, davaliDegerArtisPayi) : d(0);
  const kalanDap = {
    davaci: davaciDegerArtisPayi.minus(dapTakasTutari),
    davali: davaliDegerArtisPayi.minus(dapTakasTutari),
  };
  const sonDap = {
    davaci:
      takasKapsami === 'tum-alacaklar'
        ? Decimal.max(d(0), kalanDap.davaci.minus(davaliNetKatilma))
        : davaciDegerArtisPayi,
    davali:
      takasKapsami === 'tum-alacaklar'
        ? Decimal.max(d(0), kalanDap.davali.minus(davaciNetKatilma))
        : davaliDegerArtisPayi,
  };
  const sonKatilma = {
    davaci:
      takasKapsami === 'tum-alacaklar'
        ? Decimal.max(d(0), davaciNetKatilma.minus(kalanDap.davali))
        : davaciNetKatilma,
    davali:
      takasKapsami === 'tum-alacaklar'
        ? Decimal.max(d(0), davaliNetKatilma.minus(kalanDap.davaci))
        : davaliNetKatilma,
  };

  for (const taraf of ['davaci', 'davali'] as const) {
    const erkenDap = kalanDap[taraf];
    const bakiyeDap = sonDap[taraf];
    const erkenDonemVar =
      dapFaizTercihi.baslangicEsasi !== 'yok' &&
      dapFaizBaslangici !== undefined &&
      karsilastir(dapFaizBaslangici, tasfiyeTarihi) < 0 &&
      erkenDap.gt(bakiyeDap);

    if (bakiyeDap.gt(0) || erkenDonemVar) {
      let faiz: FaizSonucu | undefined;
      if (dapFaizTercihi.baslangicEsasi !== 'yok' && dapFaizBaslangici && tablolar.yasalFaiz) {
        if (erkenDonemVar) {
          const araBitis = karsilastir(tasfiyeTarihi, faizBitis) < 0 ? tasfiyeTarihi : faizBitis;
          const f1 = faizOlustur(erkenDap, dapFaizBaslangici, araBitis, dapFaizTercihi.gerekce);
          const f2 =
            bakiyeDap.gt(0) && karsilastir(tasfiyeTarihi, faizBitis) < 0
              ? faizOlustur(bakiyeDap, tasfiyeTarihi, faizBitis, dapFaizTercihi.gerekce)
              : undefined;
          if (f1) {
            faiz = {
              ...f1,
              bitis: faizBitis,
              kesitler: [...f1.kesitler, ...(f2?.kesitler ?? [])],
              toplam: f1.toplam.plus(f2?.toplam ?? d(0)),
            };
          }
        } else {
          faiz = faizOlustur(bakiyeDap, dapFaizBaslangici, faizBitis, dapFaizTercihi.gerekce);
        }
      }
      alacakKalemleri.push({
        kod: `${taraf}-dap`,
        ad:
          takasKapsami === 'tum-alacaklar'
            ? `${tarafAdi(taraf)} değer artış payı alacağı (takas sonrası)`
            : `${tarafAdi(taraf)} değer artış payı alacağı`,
        alacakli: taraf,
        borclu: karsiTaraf(taraf),
        tur: 'deger-artis-payi',
        dayanak: '4721 s.K. TMK m.227, m.239/3; 6098 s.K. TBK m.139, m.143/1',
        tutar: bakiyeDap,
        faiz,
      });
    }
  }

  for (const taraf of ['davaci', 'davali'] as const) {
    const katTutar = sonKatilma[taraf];
    if (katTutar.gt(0)) {
      alacakKalemleri.push({
        kod: `${taraf}-katilma`,
        ad: `${tarafAdi(taraf)} katılma alacağı (takas sonrası)`,
        alacakli: taraf,
        borclu: karsiTaraf(taraf),
        tur: 'katilma-alacagi',
        dayanak: '4721 s.K. TMK m.231, m.236, m.239/3',
        tutar: katTutar,
        faiz:
          katilmaFaizTercihi.baslangicEsasi === 'yok'
            ? undefined
            : faizOlustur(katTutar, katilmaFaizBaslangici, faizBitis, katilmaFaizTercihi.gerekce),
      });
    }
  }

  const toplamFaiz = {
    davaci: topla(alacakKalemleri.filter((k) => k.alacakli === 'davaci' && k.faiz).map((k) => k.faiz!.toplam)),
    davali: topla(alacakKalemleri.filter((k) => k.alacakli === 'davali' && k.faiz).map((k) => k.faiz!.toplam)),
  };

  const tabloOzetleri = tablolar.yasalFaiz
    ? [{ ad: tablolar.yasalFaiz.ad, dogrulamaTarihi: tablolar.yasalFaiz.dogrulamaTarihi, ozet: tablolar.yasalFaiz.ozet }]
    : [];

  return {
    girdi,
    tasfiyeTarihi,
    faizBitis,
    faizGunEsasi,
    parametreler,
    mallar,
    degerArtisPaylari,
    eklenecekDegerler: girdi.eklenecekDegerler,
    denklestirmeler,
    artikDeger,
    katilma,
    takas,
    alacakKalemleri,
    toplamFaiz,
    kaynaklar: kayit.liste(),
    uyarilar: [...kayit.uyarilar],
    notlar,
    tabloOzetleri,
  };
}
