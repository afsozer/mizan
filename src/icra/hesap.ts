// İcra kapak hesabı, takip sonrası faiz, 492 s.K. harçları, 2548 s.K. cezaevi harcı
// ve 6098 s.K. TBK m.100 kısmi ödeme mahsubu motoru (Faz 2).
import { d, Decimal, kurus, tl, topla, yuzde } from '../para.ts';
import { KaynakKaydi, type KaynakSatiri, type Tablolar } from '../tablolar.ts';
import { enBuyuk, dahilGun, gunEkle, gunFarki, karsilastir, trTarih } from '../tarih.ts';
import type {
  IcraAlacakKalemi,
  IcraFaizGirdisi,
  IcraFaizTuru,
  IcraGirdisi,
  IcraMasrafi,
  IcraTakipTuru,
  KalemMahsupSirasi,
  TahsilHarciAsamasi,
  TahsilYeri,
  TakipOncesiKalem,
} from './girdi.ts';

export interface IcraFaizKesiti {
  baslangic: string;
  bitis: string;
  gun: number;
  oran: Decimal;
  tutar: Decimal;
}

export interface IcraFaizDonemi {
  aciklama: string;
  tur: IcraFaizTuru;
  tabloAdi: string;
  matrah: Decimal;
  baslangic: string;
  bitis: string;
  gerekce: string;
  kesitler: IcraFaizKesiti[];
  toplam: Decimal;
}

export interface IcraHarclariSonucu {
  harcMatrahi: Decimal;
  basvurmaHarci: Decimal;
  pesinHarcOrani: Decimal;
  pesinHarc: Decimal;
  tahsilHarciAsamasi: TahsilHarciAsamasi;
  bazTahsilOrani: Decimal;
  feragatVarMi: boolean;
  feragatIndirimiUygulandiMi: boolean;
  uygulananTahsilOrani: Decimal;
  hesaplananTahsilHarci: Decimal;
  mahsupEdilenPesinHarc: Decimal;
  odemelerdenKesilenTahsilHarci: Decimal;
  bakiyeTahsilHarci: Decimal;
  cezaeviHarciOrani: Decimal;
  hesaplananCezaeviHarci: Decimal;
  odemelerdenKesilenCezaeviHarci: Decimal;
  cezaeviHarci: Decimal;
}

export interface KismiOdemeAdimi {
  sira: number;
  tarih: string;
  aciklama: string;
  tahsilYeri: TahsilYeri;
  odemeTutari: Decimal;
  kesilenTahsilHarci: Decimal;
  alacakliyaMahsupEdilen: Decimal;
  oncekiAsilAlacak: Decimal;
  donemFaizi: IcraFaizDonemi;
  donemFaizleri: IcraFaizDonemi[];
  donemMasrafi: Decimal;
  mahsupOncesiFaizVeGider: Decimal;
  faizVeGiderdenMahsup: Decimal;
  asilAlacaktanMahsup: Decimal;
  kalanFaizVeGider: Decimal;
  kalanAsilAlacak: Decimal;
}

export interface IcraAlacakKalemiSonucu {
  sira: number;
  ad: string;
  aciklama?: string;
  tutar: Decimal;
  faizBaslangicTarihi: string;
  pesinHarcaTabiMi: boolean;
  faiz: IcraFaizGirdisi;
  islenenFaiz: Decimal;
  mahsupEdilenAnapara: Decimal;
  kalanAnapara: Decimal;
}

export interface IcraHesapSonucu {
  alan: 'icra';
  girdi: IcraGirdisi;
  takipTuru: IcraTakipTuru;
  asilAlacak: Decimal;
  alacakKalemleri: IcraAlacakKalemiSonucu[];
  kalemMahsupSirasi: KalemMahsupSirasi;
  takipOncesiKalemler: TakipOncesiKalem[];
  takipOncesiToplam: Decimal;
  takipCikisToplami: Decimal;
  harclar: IcraHarclariSonucu;
  vekaletUcreti: Decimal;
  masraflar: IcraMasrafi[];
  toplamMasraf: Decimal;
  faizDonemleri: IcraFaizDonemi[];
  toplamTakipSonrasiFaiz: Decimal;
  kismiOdemeAdimlari: KismiOdemeAdimi[];
  toplamKismiOdeme: Decimal;
  kalanAsilAlacak: Decimal;
  kalanFaizVeGider: Decimal;
  alacakliBrutAlacagi: Decimal;
  borclununOdeyecegiKapakTutari: Decimal;
  alacakliyaNetOdenecekTutar: Decimal;
  dayanaklar: string[];
  uyarilar: string[];
  kaynaklar: KaynakSatiri[];
  tabloOzetleri: { ad: string; dogrulamaTarihi: string; ozet: string }[];
}

export const TAHSIL_ASAMA_ADLARI: Record<TahsilHarciAsamasi, string> = {
  'tebligden-once': 'Ödeme/icra emri tebliğinden önce',
  'hacizden-once': 'Ödeme/icra emri tebliğinden sonra, hacizden önce (B/I-3-a)',
  'satistan-once': 'Hacizden sonra, satıştan önce (B/I-3-b)',
  'satistan-sonra': 'Haczedilen malın satışından sonra (B/I-3-c)',
  'maas-haczi': 'Maaş veya ücret haczi (B/I-3-d)',
};

export const ICRA_TAKIP_TURU_ADLARI: Record<IcraTakipTuru, string> = {
  ilamsiz: 'İlamsız icra takibi',
  ilamli: 'İlamlı icra takibi',
  kambiyo: 'Kambiyo senetlerine mahsus haciz yoluyla takip',
};

export const ICRA_FAIZ_TURU_ADLARI: Record<IcraFaizTuru, string> = {
  yasal: 'Yasal faiz (3095 s.K. m.1)',
  avans: 'Ticari temerrüt / avans faizi (3095 s.K. m.2/2)',
  reeskont: 'Reeskont iskonto faizi (3095 s.K. m.2/1)',
  ttk1530: 'Ticari temerrüt faizi (TTK m.1530/7)',
  sozlesme: 'Sözleşme / ilam faizi',
};

export const KALEM_MAHSUP_SIRA_ADLARI: Record<KalemMahsupSirasi, string> = {
  sira: 'Kalem sırasına göre (TBK m.102/1)',
  orantili: 'Kalan anaparalarla orantılı (TBK m.102/2)',
  'yuksek-faiz': 'Yüksek faiz oranlı kalemden başlayarak',
};

export function icraFaizOzetiMetni(sonuc: Pick<IcraHesapSonucu, 'alacakKalemleri'>): string {
  const tek = sonuc.alacakKalemleri[0];
  if (!tek) return '-';
  if (sonuc.alacakKalemleri.length === 1) {
    const baz = ICRA_FAIZ_TURU_ADLARI[tek.faiz.tur];
    return tek.faiz.sozlesmeOrani ? `${baz} (${yuzde(tek.faiz.sozlesmeOrani)})` : baz;
  }
  const turler = [...new Set(sonuc.alacakKalemleri.map((k) => ICRA_FAIZ_TURU_ADLARI[k.faiz.tur]))];
  return `${sonuc.alacakKalemleri.length} kalem (${turler.join(' · ')})`;
}

/**
 * Belirli bir (baslangic, bitis] aralığında anapara üzerinden basit faiz hesaplar.
 * Başlangıç günü faize girmez, bitiş günü girer; oran değişim günlerinde kesitlere bölünür.
 */
export function icraDonemFaiziHesapla(
  t: Tablolar,
  tur: IcraFaizTuru,
  sozlesmeOrani: Decimal | undefined,
  matrah: Decimal,
  baslangic: string,
  bitis: string,
  gunEsasi: Decimal,
  gerekce: string,
  aciklama: string,
  kayit?: KaynakKaydi,
): IcraFaizDonemi {
  let tabloAdi = 'Sözleşme / ilam sabit oranı';
  if (tur === 'yasal') tabloAdi = t.yasalFaiz.ad;
  else if (tur === 'avans' || tur === 'reeskont') {
    if (!t.avansReeskontFaizi) {
      throw new Error('Avans veya reeskont faizi hesabı için avans-reeskont-faizi.json tablosu gereklidir');
    }
    tabloAdi = t.avansReeskontFaizi.ad;
  } else if (tur === 'ttk1530') {
    if (!t.ttk1530Faizi) {
      throw new Error('TTK m.1530 temerrüt faizi hesabı için ttk-1530-faizi.json tablosu gereklidir');
    }
    tabloAdi = t.ttk1530Faizi.ad;
  }

  const sonuc: IcraFaizDonemi = {
    aciklama,
    tur,
    tabloAdi,
    matrah,
    baslangic,
    bitis,
    gerekce,
    kesitler: [],
    toplam: d(0),
  };

  if (karsilastir(baslangic, bitis) >= 0 || matrah.lte(0)) return sonuc;

  if (tur === 'sozlesme') {
    const oran = sozlesmeOrani ?? d(0);
    const gun = gunFarki(baslangic, bitis);
    const tutar = kurus(matrah.times(oran).times(gun).div(gunEsasi));
    sonuc.kesitler.push({
      baslangic: gunEkle(baslangic, 1),
      bitis,
      gun,
      oran,
      tutar,
    });
    sonuc.toplam = tutar;
    return sonuc;
  }

  if (tur === 'yasal') {
    for (const k of t.yasalFaiz.kesitler(gunEkle(baslangic, 1), bitis, kayit)) {
      const gun = dahilGun(k.baslangic, k.bitis);
      const oran = d(k.satir.oran);
      const tutar = kurus(matrah.times(oran).times(gun).div(gunEsasi));
      sonuc.kesitler.push({ baslangic: k.baslangic, bitis: k.bitis, gun, oran, tutar });
    }
  } else if (tur === 'ttk1530') {
    const tablo = t.ttk1530Faizi!;
    for (const k of tablo.kesitler(gunEkle(baslangic, 1), bitis, kayit)) {
      const gun = dahilGun(k.baslangic, k.bitis);
      const oran = d(k.satir.oran);
      const tutar = kurus(matrah.times(oran).times(gun).div(gunEsasi));
      sonuc.kesitler.push({ baslangic: k.baslangic, bitis: k.bitis, gun, oran, tutar });
    }
  } else {
    const tablo = t.avansReeskontFaizi!;
    for (const k of tablo.kesitler(gunEkle(baslangic, 1), bitis, kayit)) {
      const gun = dahilGun(k.baslangic, k.bitis);
      const oran = d(tur === 'avans' ? k.satir.avansOrani : k.satir.reeskontOrani);
      const tutar = kurus(matrah.times(oran).times(gun).div(gunEsasi));
      sonuc.kesitler.push({ baslangic: k.baslangic, bitis: k.bitis, gun, oran, tutar });
    }
  }

  sonuc.toplam = topla(sonuc.kesitler.map((k) => k.tutar));
  return sonuc;
}

function kalemYillikOrani(t: Tablolar, faiz: IcraFaizGirdisi, tarih: string): Decimal {
  switch (faiz.tur) {
    case 'sozlesme':
      return faiz.sozlesmeOrani ?? d(0);
    case 'yasal':
      return d(t.yasalFaiz.bul(tarih).oran);
    case 'avans':
      if (!t.avansReeskontFaizi) throw new Error('Avans faizi için avans-reeskont-faizi.json gereklidir');
      return d(t.avansReeskontFaizi.bul(tarih).avansOrani);
    case 'reeskont':
      if (!t.avansReeskontFaizi) throw new Error('Reeskont faizi için avans-reeskont-faizi.json gereklidir');
      return d(t.avansReeskontFaizi.bul(tarih).reeskontOrani);
    case 'ttk1530':
      if (!t.ttk1530Faizi) throw new Error('TTK m.1530 faizi için ttk-1530-faizi.json gereklidir');
      return d(t.ttk1530Faizi.bul(tarih).oran);
  }
}

function anaparaKalemlerindenMahsupEt(
  t: Tablolar,
  kalemler: IcraAlacakKalemi[],
  kalanKalemAnapara: Decimal[],
  kalemMahsupAnapara: Decimal[],
  odemeTarihi: string,
  artanOdeme: Decimal,
  siraYontemi: KalemMahsupSirasi,
): Decimal {
  if (artanOdeme.lte(0)) return d(0);
  let kalanArtan = artanOdeme;
  let toplamMahsup = d(0);

  const gruplar = [
    kalemler.map((_, idx) => idx).filter((i) => karsilastir(kalemler[i]!.faizBaslangicTarihi, odemeTarihi) <= 0),
    kalemler.map((_, idx) => idx).filter((i) => karsilastir(kalemler[i]!.faizBaslangicTarihi, odemeTarihi) > 0),
  ];

  for (const grup of gruplar) {
    if (kalanArtan.lte(0)) break;
    const aktifler = grup.filter((i) => kalanKalemAnapara[i]!.gt(0));
    if (aktifler.length === 0) continue;

    if (siraYontemi === 'orantili') {
      const grupToplam = topla(aktifler.map((i) => kalanKalemAnapara[i]!));
      const hedef = Decimal.min(kalanArtan, grupToplam);
      if (hedef.eq(grupToplam)) {
        for (const i of aktifler) {
          const dusulen = kalanKalemAnapara[i]!;
          kalemMahsupAnapara[i] = kalemMahsupAnapara[i]!.plus(dusulen);
          kalanKalemAnapara[i] = d(0);
          kalanArtan = kalanArtan.minus(dusulen);
          toplamMahsup = toplamMahsup.plus(dusulen);
        }
        continue;
      }
      let dagitilan = d(0);
      for (const [poz, i] of aktifler.entries()) {
        const kalanKalem = kalanKalemAnapara[i]!;
        const hamPay =
          poz === aktifler.length - 1
            ? hedef.minus(dagitilan)
            : kurus(hedef.times(kalanKalem).div(grupToplam));
        const dusulen = Decimal.min(kalanKalem, hedef.minus(dagitilan), hamPay);
        kalemMahsupAnapara[i] = kalemMahsupAnapara[i]!.plus(dusulen);
        kalanKalemAnapara[i] = kalanKalem.minus(dusulen);
        dagitilan = dagitilan.plus(dusulen);
      }
      if (dagitilan.lt(hedef)) {
        for (const i of aktifler) {
          const fark = hedef.minus(dagitilan);
          if (fark.lte(0)) break;
          const ek = Decimal.min(kalanKalemAnapara[i]!, fark);
          if (ek.gt(0)) {
            kalemMahsupAnapara[i] = kalemMahsupAnapara[i]!.plus(ek);
            kalanKalemAnapara[i] = kalanKalemAnapara[i]!.minus(ek);
            dagitilan = dagitilan.plus(ek);
          }
        }
      }
      kalanArtan = kalanArtan.minus(dagitilan);
      toplamMahsup = toplamMahsup.plus(dagitilan);
      continue;
    }

    const sirali =
      siraYontemi === 'yuksek-faiz'
        ? [...aktifler].sort((a, b) => {
            const fark = kalemYillikOrani(t, kalemler[b]!.faiz, odemeTarihi).cmp(
              kalemYillikOrani(t, kalemler[a]!.faiz, odemeTarihi),
            );
            return fark !== 0 ? fark : a - b;
          })
        : aktifler;

    for (const i of sirali) {
      if (kalanArtan.lte(0)) break;
      const dusulen = Decimal.min(kalanArtan, kalanKalemAnapara[i]!);
      if (dusulen.gt(0)) {
        kalemMahsupAnapara[i] = kalemMahsupAnapara[i]!.plus(dusulen);
        kalanKalemAnapara[i] = kalanKalemAnapara[i]!.minus(dusulen);
        kalanArtan = kalanArtan.minus(dusulen);
        toplamMahsup = toplamMahsup.plus(dusulen);
      }
    }
  }

  return toplamMahsup;
}

export function icraHesapla(g: IcraGirdisi, t: Tablolar): IcraHesapSonucu {
  if (!t.icraHarclari) {
    throw new Error('İcra kapak hesabı için icra-harclari.json tablosu gereklidir');
  }
  const kaynaklar = new KaynakKaydi();
  const gunEsasi = g.parametreler?.faizGunEsasi ?? d(365);
  const { takip } = g;
  const kalemler = takip.alacakKalemleri;
  const kalemMahsupSirasi: KalemMahsupSirasi = g.parametreler?.kalemMahsupSirasi ?? 'sira';

  const asilAlacak = topla(kalemler.map((k) => k.tutar));
  const takipOncesiToplam = topla(takip.takipOncesiKalemler.map((k) => k.tutar));
  const takipCikisToplami = asilAlacak.plus(takipOncesiToplam);

  // 492 s.K. m.20: Takip sonrası işleyen faizler harç hesabında nazara alınmaz.
  const harcMatrahi = takipCikisToplami;

  const takipTarihiHarcSatiri = t.icraHarclari.bul(takip.takipTarihi, kaynaklar);
  const hesapTarihiHarcSatiri = t.icraHarclari.bul(g.hesapTarihi, kaynaklar);

  const basvurmaHarci = kurus(d(takipTarihiHarcSatiri.basvurmaHarci));
  const pesinHarcMatrahi = topla(kalemler.filter((k) => k.pesinHarcaTabiMi).map((k) => k.tutar)).plus(
    takip.pesinHarcAlindiMi ? takipOncesiToplam : d(0),
  );
  const pesinHarcOrani = pesinHarcMatrahi.gt(0) ? d(takipTarihiHarcSatiri.pesinHarcOrani) : d(0);
  const pesinHarc = pesinHarcMatrahi.gt(0) ? kurus(pesinHarcMatrahi.times(pesinHarcOrani)) : d(0);

  let bazTahsilOrani: Decimal;
  switch (takip.tahsilHarciAsamasi) {
    case 'tebligden-once':
      bazTahsilOrani = d(hesapTarihiHarcSatiri.tahsilTebligdenOnce);
      break;
    case 'hacizden-once':
      bazTahsilOrani = d(hesapTarihiHarcSatiri.tahsilHacizdenOnce);
      break;
    case 'satistan-once':
      bazTahsilOrani = d(hesapTarihiHarcSatiri.tahsilSatistanOnce);
      break;
    case 'satistan-sonra':
      bazTahsilOrani = d(hesapTarihiHarcSatiri.tahsilSatistanSonra);
      break;
    case 'maas-haczi':
      bazTahsilOrani = d(hesapTarihiHarcSatiri.tahsilMaasHaczi);
      break;
  }

  // 492 s.K. m.23: Takipten vazgeçme (feragat) halinde tahsil harcı yarı oranında alınır;
  // ancak haczedilen mal satılıp paraya çevrildikten sonra vazgeçilirse tam alınır.
  const feragatCarpani = d(hesapTarihiHarcSatiri.feragatCarpani);
  const feragatIndirimiUygulandiMi =
    takip.feragatVarMi &&
    takip.tahsilHarciAsamasi !== 'satistan-sonra' &&
    takip.tahsilHarciAsamasi !== 'tebligden-once';

  const uygulananTahsilOrani = feragatIndirimiUygulandiMi
    ? bazTahsilOrani.times(feragatCarpani)
    : bazTahsilOrani;

  const hesaplananTahsilHarci = kurus(harcMatrahi.times(uygulananTahsilOrani));
  // 492 s.K. m.29/2: Peşin alınan harçlar takip sonunda alınacak asıl harca mahsup olunur.
  const mahsupEdilenPesinHarc = Decimal.min(hesaplananTahsilHarci, pesinHarc);
  const toplamBakiyeTahsilHarci = Decimal.max(d(0), hesaplananTahsilHarci.minus(mahsupEdilenPesinHarc));

  // 2548 s.K. m.1: Cezaevleri yapı harcı (%2) alacaklıya ödenecek paradan kesilir, borçluya yüklenmez.
  // Ödeme/icra emri tebliğinden önce ödemede veya satış öncesi takipten feragatte icra veznesince
  // tahsil olunan para bulunmadığından cezaevi yapı harcı doğmaz (0,00 TL).
  const cezaeviHarciDogduMu =
    takip.tahsilHarciAsamasi !== 'tebligden-once' &&
    !(takip.feragatVarMi && takip.tahsilHarciAsamasi !== 'satistan-sonra');
  const cezaeviHarciOrani = cezaeviHarciDogduMu ? d(hesapTarihiHarcSatiri.cezaeviHarciOrani) : d(0);
  const hesaplananCezaeviHarci = cezaeviHarciDogduMu ? kurus(harcMatrahi.times(cezaeviHarciOrani)) : d(0);

  const siraliMasraflar = [...takip.masraflar].sort((a, b) => karsilastir(a.tarih, b.tarih));
  const siraliOdemeler = [...takip.kismiOdemeler].sort((a, b) => karsilastir(a.tarih, b.tarih));
  const toplamMasraf = topla(siraliMasraflar.map((m) => m.tutar));
  const toplamKismiOdeme = topla(siraliOdemeler.map((o) => o.tutar));

  // TBK m.100 ve m.121/3: Takip sonrası faiz yalnız kalan asıl alacak üzerinden yürütülür.
  // Faiz üretmeyen alacak havuzu: takip öncesi fer'iler + başvurma harcı + mahsup edilen peşin harç + vekalet ücreti + masraflar + işlemiş faiz.
  // (492 s.K. m.29 ve m.31 gereği tahsil harcından mahsup edilemeyen peşin harç Hazinece alacaklıya iadeye tabidir, borçluya yüklenmez.)
  const kalanKalemAnapara = kalemler.map((k) => k.tutar);
  const kalemOncekiTarih = kalemler.map((k) => k.faizBaslangicTarihi);
  const kalemIslenenFaiz = kalemler.map(() => d(0));
  const kalemMahsupAnapara = kalemler.map(() => d(0));

  let kalanAsilAlacak = asilAlacak;
  let devredenFaizVeGider = takipOncesiToplam
    .plus(basvurmaHarci)
    .plus(mahsupEdilenPesinHarc)
    .plus(takip.vekaletUcreti);

  // 492 s.K. m.28/1-b ve Yargıtay 12. HD 2022/10807 E., 2023/3309 K.: Vezne tahsilatlarından
  // doğan tahsil harcı ödemeden ayrıştırılır; 2548 s.K. m.1 cezaevi harcı ise brüt reddiyattan kesilir.
  let kalanBakiyeTahsilHarci = toplamBakiyeTahsilHarci;
  let kesilenTahsilHarciToplami = d(0);
  let kesilenCezaeviHarciToplami = d(0);

  let masrafIndeksi = 0;

  const masraflariTopla = (ustTarih: string): Decimal => {
    let toplam = d(0);
    while (
      masrafIndeksi < siraliMasraflar.length &&
      karsilastir(siraliMasraflar[masrafIndeksi]!.tarih, ustTarih) <= 0
    ) {
      toplam = toplam.plus(siraliMasraflar[masrafIndeksi]!.tutar);
      masrafIndeksi++;
    }
    return toplam;
  };

  const faizDonemleri: IcraFaizDonemi[] = [];
  const kismiOdemeAdimlari: KismiOdemeAdimi[] = [];
  const tahsilHarciUyarilari: string[] = [];
  const fazlaOdemeUyarilari: string[] = [];

  siraliOdemeler.forEach((odeme, idx) => {
    const sira = idx + 1;
    const oncekiAsilAlacak = kalanAsilAlacak;
    const adimDonemFaizleri: IcraFaizDonemi[] = [];

    for (let i = 0; i < kalemler.length; i++) {
      const kalem = kalemler[i]!;
      const kalemBas = kalemOncekiTarih[i]!;
      if (kalanKalemAnapara[i]!.gt(0) && karsilastir(kalemBas, odeme.tarih) < 0) {
        const temelAciklama = `${sira}. kısmi ödeme öncesi dönem (${kalemBas} - ${odeme.tarih})`;
        const kalemDonemFaizi = icraDonemFaiziHesapla(
          t,
          kalem.faiz.tur,
          kalem.faiz.sozlesmeOrani,
          kalanKalemAnapara[i]!,
          kalemBas,
          odeme.tarih,
          gunEsasi,
          kalem.faiz.gerekce,
          kalemler.length > 1 ? `${kalem.ad} · ${temelAciklama}` : temelAciklama,
          kaynaklar,
        );
        if (kalemDonemFaizi.kesitler.length > 0) {
          faizDonemleri.push(kalemDonemFaizi);
          adimDonemFaizleri.push(kalemDonemFaizi);
          kalemIslenenFaiz[i] = kalemIslenenFaiz[i]!.plus(kalemDonemFaizi.toplam);
        }
      }
      kalemOncekiTarih[i] = enBuyuk(kalemBas, odeme.tarih);
    }

    const donemFaizToplami = topla(adimDonemFaizleri.map((fd) => fd.toplam));
    const donemFaizi: IcraFaizDonemi =
      adimDonemFaizleri.length === 1
        ? adimDonemFaizleri[0]!
        : adimDonemFaizleri.length === 0
          ? {
              aciklama: `${sira}. kısmi ödeme öncesi dönem (${kalemOncekiTarih[0]!} - ${odeme.tarih})`,
              tur: kalemler[0]!.faiz.tur,
              tabloAdi: '-',
              matrah: oncekiAsilAlacak,
              baslangic: kalemOncekiTarih[0]!,
              bitis: odeme.tarih,
              gerekce: kalemler[0]!.faiz.gerekce,
              kesitler: [],
              toplam: d(0),
            }
          : {
              aciklama: `${sira}. kısmi ödeme öncesi toplam faiz`,
              tur: kalemler[0]!.faiz.tur,
              tabloAdi: [...new Set(adimDonemFaizleri.map((x) => x.tabloAdi))].join(' · '),
              matrah: oncekiAsilAlacak,
              baslangic: adimDonemFaizleri[0]!.baslangic,
              bitis: odeme.tarih,
              gerekce: [...new Set(adimDonemFaizleri.map((x) => x.gerekce))].join(' · '),
              kesitler: adimDonemFaizleri.flatMap((x) => x.kesitler),
              toplam: donemFaizToplami,
            };

    const donemMasrafi = masraflariTopla(odeme.tarih);
    const mahsupOncesiFaizVeGider = devredenFaizVeGider.plus(donemFaizToplami).plus(donemMasrafi);

    const yer: TahsilYeri = odeme.tahsilYeri ?? 'vezne';
    let odemedenKesilenTahsilHarci = d(0);
    if (yer === 'vezne') {
      if (odeme.kesilenTahsilHarci !== undefined) {
        odemedenKesilenTahsilHarci = kurus(odeme.kesilenTahsilHarci);
        if (odemedenKesilenTahsilHarci.gt(kalanBakiyeTahsilHarci)) {
          tahsilHarciUyarilari.push(
            `${sira}. kısmi ödemede (${trTarih(odeme.tarih)}) kesilen ${tl(odemedenKesilenTahsilHarci)} TL tahsil harcı kalan bakiye tahsil harcını (${tl(kalanBakiyeTahsilHarci)} TL) aşmaktadır (İİK m.15; Yargıtay 12. HD 11.05.2023, 2022/10807 E., 2023/3309 K.); gerçek kesinti tutarı ödemeden düşülüp kalan borç açık bırakılmıştır.`,
          );
        }
      } else {
        const oran = odeme.tahsilHarciOrani ?? uygulananTahsilOrani;
        const asamaBakiyeTavani = Decimal.max(
          d(0),
          kurus(harcMatrahi.times(oran)).minus(mahsupEdilenPesinHarc).minus(kesilenTahsilHarciToplami),
        );
        const ustSinir = Decimal.min(kalanBakiyeTahsilHarci, asamaBakiyeTavani);
        odemedenKesilenTahsilHarci = Decimal.min(ustSinir, kurus(odeme.tutar.times(oran)));
      }
    }

    kesilenTahsilHarciToplami = kesilenTahsilHarciToplami.plus(odemedenKesilenTahsilHarci);
    kalanBakiyeTahsilHarci = Decimal.max(d(0), kalanBakiyeTahsilHarci.minus(odemedenKesilenTahsilHarci));
    const alacakliyaMahsupEdilen = odeme.tutar.minus(odemedenKesilenTahsilHarci);

    const faizVeGiderdenMahsup = Decimal.min(alacakliyaMahsupEdilen, mahsupOncesiFaizVeGider);
    const kalanFaizVeGider = mahsupOncesiFaizVeGider.minus(faizVeGiderdenMahsup);

    const artanOdeme = alacakliyaMahsupEdilen.minus(faizVeGiderdenMahsup);
    const asilAlacaktanMahsup = anaparaKalemlerindenMahsupEt(
      t,
      kalemler,
      kalanKalemAnapara,
      kalemMahsupAnapara,
      odeme.tarih,
      artanOdeme,
      kalemMahsupSirasi,
    );
    const fazlaOdeme = artanOdeme.minus(asilAlacaktanMahsup);
    if (fazlaOdeme.gt(0)) {
      fazlaOdemeUyarilari.push(
        `${sira}. kısmi ödemede (${trTarih(odeme.tarih)}) dosya borcunu aşan ${tl(fazlaOdeme)} TL fazla ödeme oluştu.`,
      );
    }

    if (yer === 'vezne' && cezaeviHarciDogduMu) {
      const reddiyatBrut = alacakliyaMahsupEdilen.minus(fazlaOdeme);
      const kalanCezaeviTavani = Decimal.max(d(0), hesaplananCezaeviHarci.minus(kesilenCezaeviHarciToplami));
      const kesilenCezaeviHarci = Decimal.min(kalanCezaeviTavani, kurus(reddiyatBrut.times(cezaeviHarciOrani)));
      kesilenCezaeviHarciToplami = kesilenCezaeviHarciToplami.plus(kesilenCezaeviHarci);
    }

    kalanAsilAlacak = topla(kalanKalemAnapara);
    devredenFaizVeGider = kalanFaizVeGider;

    kismiOdemeAdimlari.push({
      sira,
      tarih: odeme.tarih,
      aciklama: odeme.aciklama,
      tahsilYeri: yer,
      odemeTutari: odeme.tutar,
      kesilenTahsilHarci: odemedenKesilenTahsilHarci,
      alacakliyaMahsupEdilen,
      oncekiAsilAlacak,
      donemFaizi,
      donemFaizleri: adimDonemFaizleri,
      donemMasrafi,
      mahsupOncesiFaizVeGider,
      faizVeGiderdenMahsup,
      asilAlacaktanMahsup,
      kalanFaizVeGider,
      kalanAsilAlacak,
    });
  });

  const sonOdemeTarihi = siraliOdemeler.length > 0 ? siraliOdemeler[siraliOdemeler.length - 1]!.tarih : undefined;
  const sonDonemFaizleri: IcraFaizDonemi[] = [];
  for (let i = 0; i < kalemler.length; i++) {
    const kalem = kalemler[i]!;
    const bas = kalemOncekiTarih[i]!;
    const temelEtiket =
      sonOdemeTarihi && karsilastir(kalem.faizBaslangicTarihi, sonOdemeTarihi) <= 0
        ? `Son kısmi ödemeden hesap tarihine (${bas} - ${g.hesapTarihi})`
        : kalemler.length > 1 && kalem.faizBaslangicTarihi !== takip.takipTarihi
          ? `Faiz başlangıcından hesap tarihine (${bas} - ${g.hesapTarihi})`
          : `Takip tarihinden hesap tarihine (${bas} - ${g.hesapTarihi})`;
    const sonDonemEtiketi = kalemler.length > 1 ? `${kalem.ad} · ${temelEtiket}` : temelEtiket;

    const kalemSonFaizi = icraDonemFaiziHesapla(
      t,
      kalem.faiz.tur,
      kalem.faiz.sozlesmeOrani,
      kalanKalemAnapara[i]!,
      bas,
      g.hesapTarihi,
      gunEsasi,
      kalem.faiz.gerekce,
      sonDonemEtiketi,
      kaynaklar,
    );
    sonDonemFaizleri.push(kalemSonFaizi);
    kalemIslenenFaiz[i] = kalemIslenenFaiz[i]!.plus(kalemSonFaizi.toplam);
    if (kalemSonFaizi.kesitler.length > 0) {
      faizDonemleri.push(kalemSonFaizi);
    }
  }
  if (faizDonemleri.length === 0 && sonDonemFaizleri.length > 0) {
    faizDonemleri.push(sonDonemFaizleri[0]!);
  }

  const sonDonemFaizToplami = topla(sonDonemFaizleri.map((fd) => fd.toplam));
  const kalanMasraf = masraflariTopla(g.hesapTarihi);
  const kalanFaizVeGider = devredenFaizVeGider.plus(sonDonemFaizToplami).plus(kalanMasraf);
  const toplamTakipSonrasiFaiz = topla(faizDonemleri.map((fd) => fd.toplam));

  const alacakKalemleri: IcraAlacakKalemiSonucu[] = kalemler.map((kalem, i) => ({
    sira: i + 1,
    ad: kalem.ad,
    ...(kalem.aciklama !== undefined ? { aciklama: kalem.aciklama } : {}),
    tutar: kalem.tutar,
    faizBaslangicTarihi: kalem.faizBaslangicTarihi,
    pesinHarcaTabiMi: kalem.pesinHarcaTabiMi,
    faiz: kalem.faiz,
    islenenFaiz: kalemIslenenFaiz[i]!,
    mahsupEdilenAnapara: kalemMahsupAnapara[i]!,
    kalanAnapara: kalanKalemAnapara[i]!,
  }));

  const harclar: IcraHarclariSonucu = {
    harcMatrahi,
    basvurmaHarci,
    pesinHarcOrani,
    pesinHarc,
    tahsilHarciAsamasi: takip.tahsilHarciAsamasi,
    bazTahsilOrani,
    feragatVarMi: takip.feragatVarMi,
    feragatIndirimiUygulandiMi,
    uygulananTahsilOrani,
    hesaplananTahsilHarci,
    mahsupEdilenPesinHarc,
    odemelerdenKesilenTahsilHarci: kesilenTahsilHarciToplami,
    bakiyeTahsilHarci: kalanBakiyeTahsilHarci,
    cezaeviHarciOrani,
    hesaplananCezaeviHarci,
    odemelerdenKesilenCezaeviHarci: kesilenCezaeviHarciToplami,
    cezaeviHarci: Decimal.max(d(0), hesaplananCezaeviHarci.minus(kesilenCezaeviHarciToplami)),
  };

  const alacakliBrutAlacagi = kalanAsilAlacak.plus(kalanFaizVeGider);
  const borclununOdeyecegiKapakTutari = alacakliBrutAlacagi.plus(kalanBakiyeTahsilHarci);
  const alacakliyaNetOdenecekTutar = Decimal.max(d(0), alacakliBrutAlacagi.minus(harclar.cezaeviHarci));

  const dayanaklar: string[] = [
    '492 s.K. Harçlar Kanunu m.20, m.28/1-b, m.29/2 ve (1) sayılı tarife B/I-1, B/I-3 (başvurma harcı, peşin harç, icra tahsil harcı ve peşin harcın tahsil harcından mahsubu)',
    '2548 s.K. Ceza Evleriyle Mahkeme Binaları İnşası Karşılığı Olarak Alınacak Harçlar ve Mahkumlara Ödettirilecek Yiyecek Bedelleri Hakkında Kanun m.1 (%2 cezaevi yapı harcı; alacaklıya ödenecek paradan kesilir, borçluya yüklenmez)',
    '6098 s.K. Türk Borçlar Kanunu m.100 (kısmi ödemelerin öncelikle işlemiş faiz ve giderlerden, artanının asıl alacaktan mahsubu) ve m.121/3 (işlemiş faize faiz yürütülememesi / bileşik faiz yasağı)',
    '3095 s.K. Kanuni Faiz ve Temerrüt Faizine İlişkin Kanun m.1, m.2 ve m.3 (yasal faiz, reeskont ve ticari temerrüt/avans faizi oranları)',
  ];
  const faizTurleri = new Set(kalemler.map((k) => k.faiz.tur));
  if (faizTurleri.has('ttk1530')) {
    dayanaklar.push(
      '6102 s.K. Türk Ticaret Kanunu m.1530/7 (mal ve hizmet tedarikinde geç ödemelerde TCMB temerrüt faizi oranı ve asgari giderim tutarı)',
    );
  }
  if (kalemler.length > 1 && siraliOdemeler.length > 0) {
    dayanaklar.push(
      `6098 s.K. TBK m.101-102 ve Yargıtay 6. HD 28.03.2022, 2021/2673 E., 2022/1670 K. (birden çok borç kaleminde anapara mahsup sırası: ${KALEM_MAHSUP_SIRA_ADLARI[kalemMahsupSirasi]})`,
    );
  }
  if (siraliOdemeler.length > 0) {
    dayanaklar.push(
      'İİK m.15 ve Yargıtay 12. HD 11.05.2023, 2022/10807 E., 2023/3309 K. (vezne tahsilatlarında tahsil harcının ödenen paradan ayrıştırılması, kalan tutarın alacaklı alacağına mahsubu)',
    );
  }
  if (takip.feragatVarMi) {
    dayanaklar.push(
      '492 s.K. Harçlar Kanunu m.23 (icra takibinden vazgeçme/feragat halinde tahsil harcının yarı oranında alınması; satıştan sonra vazgeçmede tam harç)',
    );
  }

  const uyarilar = [...kaynaklar.uyarilar, ...tahsilHarciUyarilari, ...fazlaOdemeUyarilari];
  if (pesinHarc.gt(mahsupEdilenPesinHarc)) {
    uyarilar.push(
      `492 s.K. m.29 ve m.31 gereği tahsil harcından mahsup edilemeyen ${tl(pesinHarc.minus(mahsupEdilenPesinHarc))} TL peşin harç borçluya yüklenmemiş olup alacaklıya iadeye tabidir.`,
    );
  }
  if (takip.feragatVarMi && takip.tahsilHarciAsamasi === 'satistan-sonra') {
    uyarilar.push(
      '492 s.K. m.23 c.2 gereği haczedilen mal satılıp paraya çevrildikten sonra takipten vazgeçildiğinden 1/2 feragat indirimi uygulanmamış, tahsil harcı tam (%11,38) hesaplanmıştır.',
    );
  }

  const tabloOzetleri: { ad: string; dogrulamaTarihi: string; ozet: string }[] = [
    {
      ad: t.icraHarclari.ad,
      dogrulamaTarihi: t.icraHarclari.dogrulamaTarihi,
      ozet: t.icraHarclari.ozet || '-',
    },
  ];
  if (faizTurleri.has('yasal')) {
    tabloOzetleri.push({
      ad: t.yasalFaiz.ad,
      dogrulamaTarihi: t.yasalFaiz.dogrulamaTarihi,
      ozet: t.yasalFaiz.ozet || '-',
    });
  }
  if ((faizTurleri.has('avans') || faizTurleri.has('reeskont')) && t.avansReeskontFaizi) {
    tabloOzetleri.push({
      ad: t.avansReeskontFaizi.ad,
      dogrulamaTarihi: t.avansReeskontFaizi.dogrulamaTarihi,
      ozet: t.avansReeskontFaizi.ozet || '-',
    });
  }
  if (faizTurleri.has('ttk1530') && t.ttk1530Faizi) {
    tabloOzetleri.push({
      ad: t.ttk1530Faizi.ad,
      dogrulamaTarihi: t.ttk1530Faizi.dogrulamaTarihi,
      ozet: t.ttk1530Faizi.ozet || '-',
    });
  }

  return {
    alan: 'icra',
    girdi: g,
    takipTuru: takip.takipTuru,
    asilAlacak,
    alacakKalemleri,
    kalemMahsupSirasi,
    takipOncesiKalemler: takip.takipOncesiKalemler,
    takipOncesiToplam,
    takipCikisToplami,
    harclar,
    vekaletUcreti: takip.vekaletUcreti,
    masraflar: siraliMasraflar,
    toplamMasraf,
    faizDonemleri,
    toplamTakipSonrasiFaiz,
    kismiOdemeAdimlari,
    toplamKismiOdeme,
    kalanAsilAlacak,
    kalanFaizVeGider,
    alacakliBrutAlacagi,
    borclununOdeyecegiKapakTutari,
    alacakliyaNetOdenecekTutar,
    dayanaklar,
    uyarilar,
    kaynaklar: kaynaklar.liste(),
    tabloOzetleri,
  };
}
