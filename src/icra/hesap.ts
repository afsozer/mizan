// İcra kapak hesabı, takip sonrası faiz, 492 s.K. harçları, 2548 s.K. cezaevi harcı
// ve 6098 s.K. TBK m.100 kısmi ödeme mahsubu motoru (Faz 2).
import { d, Decimal, kurus, tl, topla } from '../para.ts';
import { KaynakKaydi, type KaynakSatiri, type Tablolar } from '../tablolar.ts';
import { dahilGun, gunEkle, gunFarki, karsilastir, trTarih } from '../tarih.ts';
import type {
  IcraFaizTuru,
  IcraGirdisi,
  IcraMasrafi,
  IcraTakipTuru,
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
  donemMasrafi: Decimal;
  mahsupOncesiFaizVeGider: Decimal;
  faizVeGiderdenMahsup: Decimal;
  asilAlacaktanMahsup: Decimal;
  kalanFaizVeGider: Decimal;
  kalanAsilAlacak: Decimal;
}

export interface IcraHesapSonucu {
  alan: 'icra';
  girdi: IcraGirdisi;
  takipTuru: IcraTakipTuru;
  asilAlacak: Decimal;
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
  sozlesme: 'Sözleşme / ilam faizi',
};

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

export function icraHesapla(g: IcraGirdisi, t: Tablolar): IcraHesapSonucu {
  if (!t.icraHarclari) {
    throw new Error('İcra kapak hesabı için icra-harclari.json tablosu gereklidir');
  }
  const kaynaklar = new KaynakKaydi();
  const gunEsasi = g.parametreler?.faizGunEsasi ?? d(365);
  const { takip } = g;

  const asilAlacak = takip.asilAlacak;
  const takipOncesiToplam = topla(takip.takipOncesiKalemler.map((k) => k.tutar));
  const takipCikisToplami = asilAlacak.plus(takipOncesiToplam);

  // 492 s.K. m.20: Takip sonrası işleyen faizler harç hesabında nazara alınmaz.
  const harcMatrahi = takipCikisToplami;

  const takipTarihiHarcSatiri = t.icraHarclari.bul(takip.takipTarihi, kaynaklar);
  const hesapTarihiHarcSatiri = t.icraHarclari.bul(g.hesapTarihi, kaynaklar);

  const basvurmaHarci = kurus(d(takipTarihiHarcSatiri.basvurmaHarci));
  const pesinHarcOrani = takip.pesinHarcAlindiMi ? d(takipTarihiHarcSatiri.pesinHarcOrani) : d(0);
  const pesinHarc = takip.pesinHarcAlindiMi ? kurus(harcMatrahi.times(pesinHarcOrani)) : d(0);

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

  let oncekiTarih = takip.takipTarihi;
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
    const donemFaizi = icraDonemFaiziHesapla(
      t,
      takip.faiz.tur,
      takip.faiz.sozlesmeOrani,
      kalanAsilAlacak,
      oncekiTarih,
      odeme.tarih,
      gunEsasi,
      takip.faiz.gerekce,
      `${sira}. kısmi ödeme öncesi dönem (${oncekiTarih} - ${odeme.tarih})`,
      kaynaklar,
    );
    if (donemFaizi.kesitler.length > 0) {
      faizDonemleri.push(donemFaizi);
    }

    const donemMasrafi = masraflariTopla(odeme.tarih);
    const mahsupOncesiFaizVeGider = devredenFaizVeGider.plus(donemFaizi.toplam).plus(donemMasrafi);

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
    const asilAlacaktanMahsup = Decimal.min(artanOdeme, kalanAsilAlacak);
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

    kalanAsilAlacak = kalanAsilAlacak.minus(asilAlacaktanMahsup);
    devredenFaizVeGider = kalanFaizVeGider;
    oncekiTarih = odeme.tarih;

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
      donemMasrafi,
      mahsupOncesiFaizVeGider,
      faizVeGiderdenMahsup,
      asilAlacaktanMahsup,
      kalanFaizVeGider,
      kalanAsilAlacak,
    });
  });

  const sonDonemEtiketi =
    siraliOdemeler.length > 0
      ? `Son kısmi ödemeden hesap tarihine (${oncekiTarih} - ${g.hesapTarihi})`
      : `Takip tarihinden hesap tarihine (${oncekiTarih} - ${g.hesapTarihi})`;

  const sonDonemFaizi = icraDonemFaiziHesapla(
    t,
    takip.faiz.tur,
    takip.faiz.sozlesmeOrani,
    kalanAsilAlacak,
    oncekiTarih,
    g.hesapTarihi,
    gunEsasi,
    takip.faiz.gerekce,
    sonDonemEtiketi,
    kaynaklar,
  );
  if (sonDonemFaizi.kesitler.length > 0 || faizDonemleri.length === 0) {
    faizDonemleri.push(sonDonemFaizi);
  }

  const kalanMasraf = masraflariTopla(g.hesapTarihi);
  const kalanFaizVeGider = devredenFaizVeGider.plus(sonDonemFaizi.toplam).plus(kalanMasraf);
  const toplamTakipSonrasiFaiz = topla(faizDonemleri.map((fd) => fd.toplam));

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
  if (takip.faiz.tur === 'yasal') {
    tabloOzetleri.push({
      ad: t.yasalFaiz.ad,
      dogrulamaTarihi: t.yasalFaiz.dogrulamaTarihi,
      ozet: t.yasalFaiz.ozet || '-',
    });
  } else if ((takip.faiz.tur === 'avans' || takip.faiz.tur === 'reeskont') && t.avansReeskontFaizi) {
    tabloOzetleri.push({
      ad: t.avansReeskontFaizi.ad,
      dogrulamaTarihi: t.avansReeskontFaizi.dogrulamaTarihi,
      ozet: t.avansReeskontFaizi.ozet || '-',
    });
  }

  return {
    alan: 'icra',
    girdi: g,
    takipTuru: takip.takipTuru,
    asilAlacak,
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
