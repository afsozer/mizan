// Hesabın tamamı: kalemler → takdiri indirim ve mahsup → brüt-net → faiz.
import { d, Decimal, kurus, tl, topla, yuzde } from './para.ts';
import type { FaizGirdisi, Girdi, KalemKodu, Mahsup, TakdiriIndirim } from './girdi.ts';
import { esaslariBelirle, type Esaslar, type Parametre } from './parametreler.ts';
import { KaynakKaydi, tablolariYukle, type Tablolar } from './tablolar.ts';
import { Ucret } from './ucret.ts';
import { faizHesapla, mevduatFaiziHesapla, type FaizSonucu } from './faiz.ts';
import { asgariUcretIstisnasi, istisnaUygula, kesintiHesapla, VergiBirikimi, type Kesinti } from './kesinti.ts';
import type { Baglam, KalemHesabi } from './kalemler/ortak.ts';
import { kidemHesapla } from './kalemler/kidem.ts';
import { ihbarHesapla } from './kalemler/ihbar.ts';
import { yillikIzinHesapla } from './kalemler/yillik-izin.ts';
import { fazlaCalismaHesapla, haftaTatiliHesapla, ubgtHesapla } from './kalemler/donemsel.ts';

export interface KalemSonucu extends KalemHesabi {
  indirim?: { oran: Decimal; tutar: Decimal; gerekce: string };
  mahsup?: Mahsup;
  brut: Decimal;
  kesintiler: Kesinti[];
  net: Decimal;
  faizler: FaizSonucu[];
}

export interface HesapSonucu {
  girdi: Girdi;
  esaslar: Esaslar;
  parametreler: Parametre[];
  ucret: { sonCiplak: Decimal; sonUcretTarihi: string; giydirilmis: Decimal; yontem: string };
  kalemler: KalemSonucu[];
  toplam: { brut: Decimal; net: Decimal; faiz: Decimal };
  kaynaklar: ReturnType<KaynakKaydi['liste']>;
  uyarilar: string[];
  tabloOzetleri: { ad: string; dogrulamaTarihi: string; ozet: string }[];
}

const SIRA: [KalemKodu, (b: Baglam) => KalemHesabi][] = [
  ['kidem', kidemHesapla],
  ['ihbar', ihbarHesapla],
  ['yillikIzin', yillikIzinHesapla],
  ['fazlaCalisma', fazlaCalismaHesapla],
  ['haftaTatili', haftaTatiliHesapla],
  ['ubgt', ubgtHesapla],
];

function indirimVeMahsup(k: KalemHesabi, indirim: TakdiriIndirim | undefined, mahsup: Mahsup | undefined, es: Esaslar) {
  if (indirim && !indirim.oran.isZero() && mahsup && !es.indirimMahsupSirasi) {
    throw new Error(
      `${k.ad}: hem takdiri indirim hem mahsup var; sıra hukuki tercih olduğu için parametreler.indirimMahsupSirasi yazılmalı ` +
        '(once-indirim | once-mahsup)',
    );
  }
  let tutar = k.hamBrut;
  let indirimSonucu: KalemSonucu['indirim'];
  const indir = () => {
    if (!indirim) return;
    const dusulen = kurus(tutar.times(indirim.oran));
    indirimSonucu = { oran: indirim.oran, tutar: dusulen, gerekce: indirim.gerekce };
    tutar = tutar.minus(dusulen);
  };
  const mahsupEt = () => {
    if (mahsup) tutar = tutar.minus(mahsup.tutar);
  };
  if (es.indirimMahsupSirasi === 'once-mahsup') {
    mahsupEt();
    indir();
  } else {
    indir();
    mahsupEt();
  }
  if (tutar.isNegative()) {
    k.notlar.push('Mahsup sonrası tutar eksiye düştü; 0 alındı.');
    tutar = d(0);
  }
  return { brut: tutar, indirim: indirimSonucu };
}

function faizleriHesapla(
  k: KalemHesabi,
  girdiler: FaizGirdisi[] | undefined,
  matrah: Decimal,
  es: Esaslar,
  tablolar: Tablolar,
  kayit: KaynakKaydi,
): FaizSonucu[] {
  if (!girdiler?.length) return [];
  const belirli = topla(girdiler.filter((f) => f.tutar).map((f) => f.tutar!));
  if (belirli.gt(matrah)) {
    throw new Error(`${k.ad}: faiz satırlarındaki tutarların toplamı (${tl(belirli)}) faiz matrahını (${tl(matrah)}) aşıyor`);
  }
  if (girdiler.every((f) => f.tutar) && belirli.lt(matrah)) {
    k.notlar.push(`Faiz satırlarında toplam ${tl(belirli)} TL için faiz istendi; kalan ${tl(matrah.minus(belirli))} TL faize konu edilmedi.`);
  }
  return girdiler.map((f) => {
    const tutar = f.tutar ?? matrah.minus(belirli);
    if (f.tur === 'mevduat') {
      return mevduatFaiziHesapla(tablolar.mevduatFaizi, tutar, f.baslangic, es.faizBitis, es.faizGunEsasi, f.gerekce, kayit);
    }
    return faizHesapla(tablolar.yasalFaiz, f.tur, tutar, f.baslangic, es.faizBitis, es.faizGunEsasi, f.gerekce, kayit);
  });
}

export function hesapla(girdi: Girdi, tablolar?: Tablolar): HesapSonucu {
  const t = tablolar ?? tablolariYukle({ mevduatFaizi: girdi.tablolar?.mevduatFaizi });
  const kayit = new KaynakKaydi();
  const esaslar = esaslariBelirle(girdi);
  const ucret = new Ucret(girdi, t, kayit);
  const b: Baglam = { girdi, tablolar: t, kayit, esaslar, ucret };
  const birikim = new VergiBirikimi(girdi.parametreler.vergi.oncekiKumulatifMatrah);

  const kalemler: KalemSonucu[] = [];
  for (const [kod, hesap] of SIRA) {
    const kg = girdi.kalemler[kod];
    if (!kg) continue;
    const k = hesap(b);
    const mahsup = k.hesaplananMahsup ?? kg.mahsup;
    const { brut, indirim } = indirimVeMahsup(k, kg.takdiriIndirim, mahsup, esaslar);
    const kalemBirikimi =
      girdi.parametreler.vergi.birikim === 'kalem-bazinda' ? new VergiBirikimi(girdi.parametreler.vergi.oncekiKumulatifMatrah) : birikim;
    const kes = kesintiHesapla(brut, k.kesintiTuru, girdi.hesapTarihi, esaslar.vergiYili, girdi.parametreler.vergi, kalemBirikimi, t, kayit);
    if (indirim) {
      k.bilgiler.push(['Takdiri indirim', `${yuzde(indirim.oran)} (girdi: ${indirim.gerekce})`]);
    }
    kalemler.push({ ...k, indirim, mahsup, brut, kesintiler: kes.kesintiler, net: kes.net, faizler: [] });
  }

  if (esaslar.asgariUcretIstisnasi) {
    if (esaslar.vergiYili < 2022) throw new Error('Asgari ücret istisnası 01.01.2022\'den itibaren yapılan ödemelere uygulanır (7349 s.K.)');
    istisnaUygula(kalemler, asgariUcretIstisnasi(girdi.hesapTarihi, esaslar.vergiYili, t, kayit));
  }

  // Net matrahlı faiz istisnadan sonraki nete işler; bu yüzden faiz en son hesaplanır.
  for (const k of kalemler) {
    const kg = girdi.kalemler[k.kod]!;
    k.faizler = faizleriHesapla(k, kg.faiz, esaslar.faizMatrahi === 'brut' ? k.brut : k.net, esaslar, t, kayit);
    if (k.faizler.some((f) => f.tur === 'mevduat') && t.mevduatFaizi.kod.startsWith('mevduat-faizi')) {
      k.notlar.push(
        'Mevduat faizi oranları TCMB serisinden alındı (vekil seri: değer ayın en yüksek oranı, vade dilimi 1 yıla kadar). ' +
          'Yargıtay oranın bankalara müzekkere yazılarak tespitini istiyor (9. HD 2025/6610 E.); banka yazısı varsa oranları ' +
          'girdide tablolar.mevduatFaizi ile ayrı tablo olarak verin.',
      );
    }
  }

  const tabloOzetleri = [t.asgariUcret, t.kidemTavani, t.sgk, t.damga, t.yasalFaiz, t.mevduatFaizi].map((x) => ({
    ad: x.ad,
    dogrulamaTarihi: x.dogrulamaTarihi,
    ozet: x.ozet,
  }));
  tabloOzetleri.push({ ad: t.gelirVergisi.ad, dogrulamaTarihi: t.gelirVergisi.dogrulamaTarihi, ozet: t.gelirVergisi.ozet });

  return {
    girdi,
    esaslar,
    parametreler: esaslar.liste,
    ucret: {
      sonCiplak: ucret.sonCiplak,
      sonUcretTarihi: ucret.sonUcretTarihi,
      giydirilmis: ucret.giydirilmis(),
      yontem: ucret.yontemAciklamasi(),
    },
    kalemler,
    toplam: {
      brut: topla(kalemler.map((k) => k.brut)),
      net: topla(kalemler.map((k) => k.net)),
      faiz: topla(kalemler.flatMap((k) => k.faizler.map((f) => f.toplam))),
    },
    kaynaklar: kayit.liste(),
    uyarilar: [...kayit.uyarilar],
    tabloOzetleri,
  };
}
