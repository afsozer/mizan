import { d, Decimal, kurus, tl, topla, yuzde } from '../para.ts';
import { faizHesapla } from '../faiz.ts';
import { gunFarki, trTarih } from '../tarih.ts';
import { donemYaz, KALEM_ADLARI, sureAciklamasi, toplamHizmet, type Baglam, type KalemHesabi } from './ortak.ts';

export function kidemHesapla(b: Baglam): KalemHesabi {
  const g = b.girdi;
  const k = g.kalemler.kidem!;
  const hizmet = toplamHizmet(g);
  const notlar: string[] = [];
  const bilgiler: [string, string][] = [
    ['Hak durumu', `${k.hakVar ? 'Var' : 'Yok'} (girdi: ${k.gerekce})`],
    ['Fesih', `${trTarih(g.hizmet.fesihTarihi)}, ${g.hizmet.fesihSekli}`],
    ...g.hizmet.donemler.map((p, i) => [`Hizmet dönemi ${i + 1}`, donemYaz(g, p)] as [string, string]),
    ['Toplam hizmet', sureAciklamasi(g)],
  ];
  const sonuc: KalemHesabi = {
    kod: 'kidem',
    ad: KALEM_ADLARI.kidem,
    dayanak: [
      '1475 s.K. m.14/1: her tam yıl için 30 günlük ücret, yıldan artan süre için aynı oran',
      '1475 s.K. m.14: esas ücrete para ve para ile ölçülebilen menfaatler eklenir (giydirilmiş ücret)',
      '1475 s.K. m.14: yıllık tutar, en yüksek devlet memuruna bir hizmet yılı için ödenecek azami emeklilik ikramiyesini geçemez (tavan)',
    ],
    formul: [
      'Esas ücret = min(giydirilmiş brüt aylık ücret, fesih tarihindeki kıdem tavanı)',
      'Kıdem = esas × yıl + esas / 12 × ay + esas / 365 × gün',
    ],
    bilgiler,
    hamBrut: d(0),
    kesintiTuru: 'kidem',
    notlar,
  };

  if (!k.hakVar) {
    notlar.push('Girdide kıdem tazminatı hakkı olmadığı belirtildi; tutar hesaplanmadı.');
    return sonuc;
  }
  if (hizmet.yil < 1) {
    notlar.push('Toplam hizmet bir yıldan az; 1475 s.K. m.14 uyarınca kıdem tazminatı doğmaz.');
    return sonuc;
  }

  const giydirilmis = b.ucret.giydirilmis();
  const tavanSatiri = b.tablolar.kidemTavani.bul(g.hizmet.fesihTarihi, b.kayit);
  const tavan = d(tavanSatiri.tutar);
  const esas = Decimal.min(giydirilmis, tavan);
  bilgiler.push(['Son çıplak brüt ücret', `${tl(b.ucret.sonCiplak)} TL`]);
  for (const y of g.ucret.yanHaklar) bilgiler.push([`+ ${y.ad}`, `${tl(y.tutar)} TL`]);
  bilgiler.push(['Giydirilmiş brüt ücret', `${tl(giydirilmis)} TL`]);
  bilgiler.push(['Kıdem tavanı', `${tl(tavan)} TL (${trTarih(tavanSatiri.baslangic)} dönemi)`]);
  bilgiler.push(['Esas ücret', `${tl(esas)} TL${giydirilmis.gt(tavan) ? ' (tavan uygulandı)' : ''}`]);

  const yilT = kurus(esas.times(hizmet.yil));
  const ayT = kurus(esas.div(12).times(hizmet.ay));
  const gunT = kurus(esas.div(365).times(hizmet.gun));
  sonuc.detay = {
    basliklar: ['Süre', 'Hesap', 'Tutar (TL)'],
    satirlar: [
      [`${hizmet.yil} yıl`, `${tl(esas)} × ${hizmet.yil}`, tl(yilT)],
      [`${hizmet.ay} ay`, `${tl(esas)} / 12 × ${hizmet.ay}`, tl(ayT)],
      [`${hizmet.gun} gün`, `${tl(esas)} / 365 × ${hizmet.gun}`, tl(gunT)],
    ],
  };
  sonuc.hamBrut = yilT.plus(ayT).plus(gunT);
  sonuc.detay.toplam = ['Toplam', '', tl(sonuc.hamBrut)];
  if (g.hizmet.donemler.length > 1 && g.parametreler.sureHesabi !== 'gun') {
    notlar.push('Birden fazla hizmet dönemi toplandı (1475 s.K. m.14/2); 30 gün 1 ay, 12 ay 1 yıl sayıldı.');
  }
  if (k.oncekiOdemeler) oncekiOdemeleriMahsupEt(b, sonuc);
  return sonuc;
}

/**
 * Daha önce ödenen kıdem tazminatı brüte çevrilir ve ödeme gününden faiz bitişine (varsayılan
 * fesih tarihi) kadar yasal faiziyle birlikte mahsup edilir. Net ödeme, kıdem tavan içinde gelir
 * vergisinden istisna olduğundan yalnız damga vergisi kesildiği kabulüyle brüte çevrilir.
 */
function oncekiOdemeleriMahsupEt(b: Baglam, sonuc: KalemHesabi): void {
  const g = b.girdi;
  const op = g.kalemler.kidem!.oncekiOdemeler!;
  const faizBitis = op.faizBitis ?? g.hizmet.fesihTarihi;
  const satirlar: string[][] = [];
  const mahsuplar: Decimal[] = [];
  const brutler: Decimal[] = [];
  const faizler: Decimal[] = [];
  for (const o of op.liste) {
    const damga = d(b.tablolar.damga.bul(o.tarih, b.kayit).oran);
    const brut = o.brutTutar ?? kurus(o.netTutar!.div(d(1).minus(damga)));
    const faiz =
      op.faiz === 'yasal'
        ? faizHesapla(b.tablolar.yasalFaiz, 'yasal', brut, o.tarih, faizBitis, b.esaslar.faizGunEsasi, 'önceki ödeme', b.kayit)
        : undefined;
    const faizTutar = faiz?.toplam ?? d(0);
    brutler.push(brut);
    faizler.push(faizTutar);
    mahsuplar.push(brut.plus(faizTutar));
    satirlar.push([
      trTarih(o.tarih) + (o.aciklama ? ` (${o.aciklama})` : ''),
      o.netTutar ? tl(o.netTutar) : '-',
      tl(brut),
      faiz ? String(Math.max(0, gunFarki(o.tarih, faizBitis))) : '-',
      faiz ? [...new Set(faiz.kesitler.map((x) => yuzde(x.oran)))].join(', ') || '-' : '-',
      tl(faizTutar),
      tl(brut.plus(faizTutar)),
    ]);
  }
  const toplam = topla(mahsuplar);
  sonuc.hesaplananMahsup = {
    tutar: toplam,
    aciklama: `önceki ${op.liste.length} kıdem ödemesi${op.faiz === 'yasal' ? `, ${trTarih(faizBitis)} tarihine kadar yasal faiziyle` : ''}`,
  };
  sonuc.ekDetaylar = [
    {
      baslik: `Önceki kıdem ödemelerinin mahsubu (girdi: ${op.gerekce})`,
      tablo: {
        basliklar: ['Ödeme tarihi', 'Net (TL)', 'Brüt (TL)', 'Faiz günü', 'Yasal faiz oranı', 'Faiz (TL)', 'Mahsup (TL)'],
        satirlar,
        toplam: ['Toplam', '', tl(topla(brutler)), '', '', tl(topla(faizler)), tl(toplam)],
      },
    },
  ];
  sonuc.dayanak.push(
    'Daha önce ödenen kıdem tazminatı yasal faiziyle birlikte mahsup edilir (Yargıtay 9. HD 21.12.2020, 2016/32987 E., 2020/19369 K.); ' +
      'faiz ödeme tarihinden fesih tarihine kadar işletilir (22. HD 17.02.2014, 2014/1552 E., 2014/2597 K.)',
  );
  if (op.liste.some((o) => o.netTutar)) {
    sonuc.notlar.push('Net ödemeler, kıdem tavan içinde gelir vergisinden istisna olduğundan yalnız damga vergisi kesildiği kabulüyle brüte çevrildi: brüt = net / (1 - damga oranı).');
  }
}
