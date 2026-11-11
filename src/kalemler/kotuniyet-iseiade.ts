import { d, kurus, sayi, tl } from '../para.ts';
import { ihbarHaftasi } from './ihbar.ts';
import { hizmetSuresi, KALEM_ADLARI, sureAciklamasi, type Baglam, type KalemHesabi } from './ortak.ts';

export function kotuniyetHesapla(b: Baglam): KalemHesabi {
  const g = b.girdi;
  const k = g.kalemler.kotuniyet!;
  const son = k.donemEsasi === 'son';
  const donemler = son ? g.hizmet.donemler.slice(-1) : g.hizmet.donemler;
  const hizmet = hizmetSuresi(g, donemler, !son);
  const notlar: string[] = [];
  const sonuc: KalemHesabi = {
    kod: 'kotuniyet',
    ad: KALEM_ADLARI.kotuniyet,
    dayanak: [
      '4857 s.K. m.17/2: hizmet süresine göre 2, 4, 6, 8 haftalık bildirim süresi',
      '4857 s.K. m.17/6: iş güvencesi (m.18-21) kapsamı dışındaki işçilerin iş sözleşmesinin fesih hakkının kötüye kullanılarak sona erdirildiği durumlarda bildirim süresinin üç katı tutarında tazminat ödenir',
      '4857 s.K. m.17/son: hesapta ücrete ek para ve para ile ölçülmesi mümkün menfaatler de göz önünde tutulur (giydirilmiş ücret; Yargıtay 9. HD 30.03.2016, 2014/36354 E., 2016/7815 K.)',
    ],
    formul: [
      'Günlük giydirilmiş ücret = giydirilmiş brüt aylık / günlük bölen',
      'Kötüniyet tazminatı = günlük giydirilmiş ücret × (bildirim haftası × 3) × 7',
    ],
    bilgiler: [
      ['Hak durumu', `${k.hakVar ? 'Var' : 'Yok'} (girdi: ${k.gerekce})`],
      [son ? 'Son dönem hizmeti' : 'Toplam hizmet', sureAciklamasi(g, donemler, !son)],
      ...(k.donemEsasi
        ? [['Süre esası', son ? 'yalnız son hizmet dönemi (girdi)' : 'tüm hizmet dönemleri birleştirilerek (girdi)'] as [string, string]]
        : []),
    ],
    hamBrut: d(0),
    kesintiTuru: 'ihbar',
    notlar,
  };
  if (son) {
    sonuc.dayanak.push(
      'Kıdemdeki 1475 m.14/2 birleştirmesine paralel bir hüküm olmadığından bildirim süresinde fasılalı dönemler birleştirilmez (Yargıtay 9. HD 03.06.2021, 2021/5562 E., 2021/9893 K.)',
    );
  }
  if (!k.hakVar) {
    notlar.push('Girdide kötüniyet tazminatı hakkı olmadığı belirtildi; tutar hesaplanmadı.');
    return sonuc;
  }

  const hesaplanan = ihbarHaftasi(hizmet);
  const hafta = k.haftaSayisi ?? d(hesaplanan.hafta * 3);
  if (hesaplanan.sinirda) {
    notlar.push(
      k.haftaSayisi
        ? `Hizmet süresi tam 1,5 yıl (4857 s.K. m.17/2 (b) ve (c) bentlerinin sınırı); hafta sayısı girdi ile ${sayi(k.haftaSayisi)} seçildi.`
        : 'Hizmet süresi tam 1,5 yıl (4857 s.K. m.17/2 (b) ve (c) bentlerinin sınırı); alt bentte bırakıldı (4 × 3 = 12 hafta). ' +
            'Diğer yorum için girdide haftaSayisi: 18 verilebilir.',
    );
  }
  const giydirilmis = b.ucret.giydirilmis();
  const gunluk = giydirilmis.div(b.esaslar.gunlukBolen);
  const gun = hafta.times(7);
  sonuc.bilgiler.push(
    [
      'Kötüniyet süresi (3× bildirim)',
      k.haftaSayisi
        ? `${sayi(hafta)} hafta (girdi ile verildi) = ${sayi(gun)} gün`
        : `${hesaplanan.hafta} × 3 = ${sayi(hafta)} hafta = ${sayi(gun)} gün`,
    ],
    ['Giydirilmiş brüt ücret', `${tl(giydirilmis)} TL`],
    ['Günlük giydirilmiş ücret', `${tl(gunluk, 4)} TL`],
  );
  sonuc.hamBrut = kurus(gunluk.times(gun));
  sonuc.detay = {
    basliklar: ['Gün', 'Günlük ücret (TL)', 'Tutar (TL)'],
    satirlar: [[sayi(gun), tl(gunluk, 4), tl(sonuc.hamBrut)]],
  };
  return sonuc;
}

export function bostaGecenSureHesapla(b: Baglam): KalemHesabi {
  const g = b.girdi;
  const k = g.kalemler.bostaGecenSure!;
  const aySayisi = k.aySayisi ?? d(4);
  const notlar: string[] = [];
  const sonuc: KalemHesabi = {
    kod: 'bostaGecenSure',
    ad: KALEM_ADLARI.bostaGecenSure,
    dayanak: [
      '4857 s.K. m.21/3: kararın kesinleşmesine kadar çalıştırılmadığı süre için işçiye en çok dört aya kadar doğmuş bulunan ücret ve diğer hakları ödenir',
      '4857 s.K. m.21/4: mahkeme veya özel hakem, üçüncü fıkrada düzenlenen ücret ve diğer hakları dava tarihindeki ücreti esas alarak parasal olarak belirler',
      'Yargıtay 9. HD 25.11.2019, 2016/9242 E., 2019/20742 K.; 9. HD 22.06.2017, 2017/21858 E., 2017/11169 K.: boşta geçen süre ücreti ve diğer haklar giydirilmiş brüt ücret üzerinden hesaplanır',
    ],
    formul: [
      'Esas giydirilmiş aylık = çıplak brüt aylık + aylık yan haklar',
      'Boşta geçen süre ücreti = esas giydirilmiş aylık × ay sayısı',
    ],
    bilgiler: [['Hak durumu', `${k.hakVar ? 'Var' : 'Yok'} (girdi: ${k.gerekce})`]],
    hamBrut: d(0),
    kesintiTuru: 'ucret',
    notlar,
  };
  if (k.faiz?.some((f) => f.tur === 'mevduat')) {
    sonuc.dayanak.push('4857 s.K. m.34/1: gününde ödenmeyen ücretler için mevduata uygulanan en yüksek faiz oranı uygulanır');
  }
  if (!k.hakVar) {
    notlar.push('Girdide boşta geçen süre ücreti hakkı olmadığı belirtildi; tutar hesaplanmadı.');
    return sonuc;
  }

  const ciplak = k.brutAylik ?? b.ucret.sonCiplak;
  const yanHaklar = k.ekYanHaklar ?? b.ucret.yanHaklarToplami();
  const esasAylik = ciplak.plus(yanHaklar);
  if (k.brutAylik === undefined && k.ekYanHaklar === undefined) {
    notlar.push('Boşta geçen süreye özgü brüt aylık ve yan hak tutarı ayrıca girilmediğinden son giydirilmiş brüt aylık ücret esas alındı.');
  } else if (k.brutAylik === undefined) {
    notlar.push('Boşta geçen süreye özgü çıplak brüt aylık ayrıca girilmediğinden son çıplak brüt ücret esas alındı.');
  } else if (k.ekYanHaklar === undefined && !yanHaklar.isZero()) {
    notlar.push('Boşta geçen süreye özgü yan hak tutarı ayrıca girilmediğinden ücret bölümündeki yan haklar toplamı esas alındı.');
  }

  sonuc.bilgiler.push(
    ['Boşta geçen süre', `${sayi(aySayisi)} ay (${k.aySayisi ? 'girdi' : 'varsayılan: 4857 s.K. m.21/3 azami 4 ay'})`],
    ['Esas çıplak brüt aylık', `${tl(ciplak)} TL (${k.brutAylik ? 'girdi: döneme özgü' : 'son çıplak brüt ücret'})`],
    ['Esas aylık yan haklar', `${tl(yanHaklar)} TL (${k.ekYanHaklar !== undefined ? 'girdi: döneme özgü' : 'son yan haklar toplamı'})`],
    ['Esas giydirilmiş brüt aylık', `${tl(esasAylik)} TL`],
  );
  sonuc.hamBrut = kurus(esasAylik.times(aySayisi));
  sonuc.detay = {
    basliklar: ['Ay sayısı', 'Giydirilmiş aylık (TL)', 'Tutar (TL)'],
    satirlar: [[sayi(aySayisi), tl(esasAylik), tl(sonuc.hamBrut)]],
  };
  return sonuc;
}

export function iseBaslatmamaHesapla(b: Baglam): KalemHesabi {
  const g = b.girdi;
  const k = g.kalemler.iseBaslatmama!;
  const notlar: string[] = [];
  const sonuc: KalemHesabi = {
    kod: 'iseBaslatmama',
    ad: KALEM_ADLARI.iseBaslatmama,
    dayanak: [
      '4857 s.K. m.21/1-2: işveren işçiyi başvurusu üzerine bir ay içinde işe başlatmaz ise mahkemece belirlenen en az 4, en çok 8 aylık ücreti tutarında tazminat öder',
      '4857 s.K. m.21/4: mahkeme veya özel hakem, ikinci fıkrada düzenlenen tazminatı dava tarihindeki ücreti esas alarak parasal olarak belirler',
      'Yargıtay 9. HD 25.11.2019, 2016/9242 E., 2019/20742 K.; 9. HD 22.06.2017, 2017/21858 E., 2017/11169 K.: işe başlatmama tazminatı çıplak brüt ücret üzerinden hesaplanır',
      '193 s.K. GVK m.25/1-1: 4857 s.K. uyarınca ödenen işe başlatmama tazminatı gelir vergisinden müstesnadır',
      '5510 s.K. m.80/1-b: tazminat niteliğinde olduğundan prime esas kazanca tabi tutulmaz',
    ],
    formul: ['İşe başlatmama tazminatı = esas çıplak brüt aylık ücret × mahkemece belirlenen ay sayısı (4-8 ay)'],
    bilgiler: [
      ['Hak durumu', `${k.hakVar ? 'Var' : 'Yok'} (girdi: ${k.gerekce})`],
      ['Tazminat süresi', `${sayi(k.aySayisi)} ay (girdi: mahkemece belirlenen)`],
    ],
    hamBrut: d(0),
    kesintiTuru: 'iseBaslatmama',
    notlar,
  };
  if (!k.hakVar) {
    notlar.push('Girdide işe başlatmama tazminatı hakkı olmadığı belirtildi; tutar hesaplanmadı.');
    return sonuc;
  }

  const esasAylik = k.esasBrutAylik ?? b.ucret.sonCiplak;
  if (!k.esasBrutAylik) {
    notlar.push('İşe başlatmama tazminatına esas çıplak brüt aylık ayrıca girilmediğinden son çıplak brüt ücret esas alındı.');
  }
  sonuc.bilgiler.push([
    'Esas çıplak brüt aylık',
    `${tl(esasAylik)} TL (${k.esasBrutAylik ? 'girdi: döneme özgü çıplak brüt' : 'varsayılan: son çıplak brüt ücret'})`,
  ]);
  sonuc.hamBrut = kurus(esasAylik.times(k.aySayisi));
  sonuc.detay = {
    basliklar: ['Ay sayısı', 'Çıplak aylık (TL)', 'Tutar (TL)'],
    satirlar: [[sayi(k.aySayisi), tl(esasAylik), tl(sonuc.hamBrut)]],
  };
  return sonuc;
}
