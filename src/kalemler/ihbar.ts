import { d, kurus, sayi, tl } from '../para.ts';
import type { YilAyGun } from '../tarih.ts';
import { hizmetSuresi, KALEM_ADLARI, sureAciklamasi, type Baglam, type KalemHesabi } from './ortak.ts';

/**
 * 4857 m.17/2: (a) altı aydan az 2, (b) altı aydan bir buçuk yıla kadar 4, (c) bir buçuk yıldan üç
 * yıla kadar 6, (d) üç yıldan fazla 8 hafta. Tam 6 ay (a) "aydan az" dediği için (b)'ye, tam 3 yıl
 * (d) "yıldan fazla" dediği için (c)'ye girer. Tam 1,5 yıl hem (b) "kadar" hem (c) "-dan" ifadesine
 * girer; burada alt bentte (4 hafta) bırakılır ve not düşülür.
 */
export function ihbarHaftasi(s: YilAyGun): { hafta: number; sinirda: boolean } {
  const ay = s.yil * 12 + s.ay;
  const tam = (n: number) => ay === n && s.gun === 0;
  if (ay < 6) return { hafta: 2, sinirda: false };
  if (ay < 18 || tam(18)) return { hafta: 4, sinirda: tam(18) };
  if (ay < 36 || tam(36)) return { hafta: 6, sinirda: false };
  return { hafta: 8, sinirda: false };
}

export function ihbarHesapla(b: Baglam): KalemHesabi {
  const g = b.girdi;
  const k = g.kalemler.ihbar!;
  // Son dönem esasında yalnız son hizmet dönemi sayılır; düşülecek günler (ücretsiz izin) yalnız
  // tüm dönemler esasında uygulanır, çünkü girdide hangi döneme ait oldukları belirtilmez.
  const son = k.donemEsasi === 'son';
  const donemler = son ? g.hizmet.donemler.slice(-1) : g.hizmet.donemler;
  const hizmet = hizmetSuresi(g, donemler, !son);
  const notlar: string[] = [];
  const sonuc: KalemHesabi = {
    kod: 'ihbar',
    ad: KALEM_ADLARI.ihbar,
    dayanak: [
      '4857 s.K. m.17/2: hizmet süresine göre 2, 4, 6, 8 haftalık bildirim süresi',
      '4857 s.K. m.17/4: bildirim şartına uymayan taraf bildirim süresine ilişkin ücret tutarında tazminat öder',
      '4857 s.K. m.17/son: hesapta ücrete ek menfaatler de göz önünde tutulur (giydirilmiş ücret)',
    ],
    formul: [
      'Günlük giydirilmiş ücret = giydirilmiş brüt aylık / günlük bölen',
      k.kullandirilanGun ? 'İhbar = günlük giydirilmiş ücret × (hafta × 7 - kullandırılan gün)' : 'İhbar = günlük giydirilmiş ücret × hafta × 7',
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
      'Kıdemdeki 1475 m.14/2 birleştirmesine paralel bir hüküm olmadığından ihbarda fasılalı dönemler birleştirilmez (Yargıtay 9. HD 03.06.2021, 2021/5562 E., 2021/9893 K.)',
    );
  }
  if (!k.hakVar) {
    notlar.push('Girdide ihbar tazminatı hakkı olmadığı belirtildi; tutar hesaplanmadı.');
    return sonuc;
  }

  const hesaplanan = ihbarHaftasi(hizmet);
  const hafta = k.haftaSayisi ?? d(hesaplanan.hafta);
  if (hesaplanan.sinirda) {
    notlar.push(
      k.haftaSayisi
        ? `Hizmet süresi tam 1,5 yıl (4857 s.K. m.17/2 (b) ve (c) bentlerinin sınırı); hafta sayısı girdi ile ${sayi(k.haftaSayisi)} seçildi.`
        : 'Hizmet süresi tam 1,5 yıl (4857 s.K. m.17/2 (b) ve (c) bentlerinin sınırı); alt bentte bırakıldı (4 hafta). ' +
            'Diğer yorum için girdide haftaSayisi: 6 verilebilir.',
    );
  }
  const giydirilmis = b.ucret.giydirilmis();
  const gunluk = giydirilmis.div(b.esaslar.gunlukBolen);
  const tumGun = hafta.times(7);
  const kullandirilan = k.kullandirilanGun ?? d(0);
  if (kullandirilan.gt(tumGun)) throw new Error('İhbar: kullandırılan gün bildirim süresinden uzun olamaz');
  const gun = tumGun.minus(kullandirilan);
  sonuc.bilgiler.push(
    ['Bildirim süresi', `${sayi(hafta)} hafta${k.haftaSayisi ? ' (girdi ile verildi)' : ''} = ${sayi(tumGun)} gün`],
    ...(k.kullandirilanGun
      ? [['Kullandırılan bildirim süresi', `${sayi(kullandirilan)} gün (girdi); kalan ${sayi(gun)} gün`] as [string, string]]
      : []),
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
