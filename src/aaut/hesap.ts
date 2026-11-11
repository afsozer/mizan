// AAÜT vekalet ücreti hesaplama motoru: Üçüncü Kısım kademeli dilimler, İkinci Kısım maktu taban,
// müddeabih / takipte kesinleşen miktar tavanı (m.13/2, m.11/1), kısmi kabul/ret karşı vekalet,
// manevi/maddi tazminat ve nafaka özel kuralları (m.9/1-2, m.10, m.13/3-4), ön inceleme öncesi 1/2 (m.6, m.15)
// ve icra 3/4 (m.11/4) oranları.
import { d, Decimal, kurus, tl, yuzde } from '../para.ts';
import type { Parametre } from '../parametreler.ts';
import { KaynakKaydi, type AautDilimi, type AautSatiri, type Tablolar } from '../tablolar.ts';
import { karsilastir, trTarih } from '../tarih.ts';
import {
  AAUT_ASAMA_ADLARI,
  AAUT_MERCI_ADLARI,
  AAUT_MERCI_MAKTU_ANAHTARI,
  AAUT_NITELIK_ADLARI,
  type AautGirdisi,
  type AautMerci,
} from './girdi.ts';

export interface AautDilimHesabi {
  sira: number;
  aciklama: string;
  oran: Decimal;
  matrah: Decimal;
  tutar: Decimal;
}

export interface AautTarafHesabi {
  taraf: 'davaci' | 'davali';
  baslik: string;
  esasTutar: Decimal;
  hamNispiUcret: Decimal;
  maktuUcret: Decimal;
  asamaCarpani: Decimal;
  maktuTabanUygulandiMi: boolean;
  muddeabihTavaniUygulandiMi: boolean;
  maktuTavanUygulandiMi: boolean;
  davaciUcretiTavaniUygulandiMi: boolean;
  tamRetMaktuUygulandiMi: boolean;
  nafakaRetIstisnasiMi: boolean;
  hukmedilenUcret: Decimal;
  dilimler: AautDilimHesabi[];
  dayanak: string[];
  formul: string[];
  notlar: string[];
}

export interface AautHesapSonucu {
  girdi: AautGirdisi;
  tarifeDonemi: string;
  merciAdi: string;
  maktuUcret: Decimal;
  asamaCarpani: Decimal;
  davaci: AautTarafHesabi;
  davali: AautTarafHesabi;
  parametreler: Parametre[];
  notlar: string[];
  kaynaklar: ReturnType<KaynakKaydi['liste']>;
  uyarilar: string[];
  tabloOzetleri: { ad: string; dogrulamaTarihi: string; ozet: string }[];
}

function idariYargiMi(merci: AautMerci): boolean {
  return (
    merci === 'idare-vergi-durusmasiz' ||
    merci === 'idare-vergi-durusmali' ||
    merci === 'danistay-ilk-derece-durusmasiz' ||
    merci === 'danistay-ilk-derece-durusmali'
  );
}

function icraMahkemesiTavanliMi(merci: AautMerci): boolean {
  return merci === 'icra-mahkemesi-is' || merci === 'icra-mahkemesi-dava';
}

export function kademeliNispiHesapla(
  matrah: Decimal,
  dilimler: AautDilimi[],
): { toplam: Decimal; dilimler: AautDilimHesabi[] } {
  if (matrah.lte(0)) return { toplam: d(0), dilimler: [] };

  let kalan = matrah;
  let toplam = d(0);
  const sonucDilimler: AautDilimHesabi[] = [];

  for (let i = 0; i < dilimler.length; i++) {
    if (kalan.lte(0)) break;
    const dl = dilimler[i]!;
    const oran = d(dl.oran);
    const dilimSiniri = dl.dilimTutari === null ? null : d(dl.dilimTutari);
    const dilimMatrahi = dilimSiniri === null ? kalan : Decimal.min(kalan, dilimSiniri);
    const dilimTutari = kurus(dilimMatrahi.times(oran));

    const aciklama =
      dl.dilimTutari === null
        ? `${tl(d(dilimler[i - 1]!.ustSinir!), 0)} TL'den yukarısı için ${yuzde(oran)}`
        : `${i === 0 ? 'İlk' : 'Sonra gelen'} ${tl(dilimSiniri!, 0)} TL için ${yuzde(oran)}`;

    sonucDilimler.push({
      sira: i + 1,
      aciklama,
      oran,
      matrah: kurus(dilimMatrahi),
      tutar: dilimTutari,
    });

    toplam = toplam.plus(dilimTutari);
    kalan = kalan.minus(dilimMatrahi);
  }

  return { toplam: kurus(toplam), dilimler: sonucDilimler };
}

function bosTarafHesabi(
  taraf: 'davaci' | 'davali',
  baslik: string,
  maktuUcret: Decimal,
  asamaCarpani: Decimal,
): AautTarafHesabi {
  return {
    taraf,
    baslik,
    esasTutar: d(0),
    hamNispiUcret: d(0),
    maktuUcret,
    asamaCarpani,
    maktuTabanUygulandiMi: false,
    muddeabihTavaniUygulandiMi: false,
    maktuTavanUygulandiMi: false,
    davaciUcretiTavaniUygulandiMi: false,
    tamRetMaktuUygulandiMi: false,
    nafakaRetIstisnasiMi: false,
    hukmedilenUcret: d(0),
    dilimler: [],
    dayanak: [],
    formul: [],
    notlar: [],
  };
}

export function aautHesapla(girdi: AautGirdisi, tablolar: Tablolar): AautHesapSonucu {
  if (!tablolar.aaut) {
    throw new Error('AAÜT tablosu (data/aaut.json) yüklü değil');
  }

  const kayit = new KaynakKaydi();
  const u = girdi.uyusmazlik;
  const merciAdi = AAUT_MERCI_ADLARI[u.merci];
  const maktuAnahtari = AAUT_MERCI_MAKTU_ANAHTARI[u.merci];

  const satir: AautSatiri = tablolar.aaut.bul(girdi.hesapTarihi, kayit);
  const maktuUcret = d(satir.maktu[maktuAnahtari]);

  // Kaynak satırında ilgili merci maktu ücretini de göster
  kayit.kayitlar.clear();
  tablolar.aaut.bul(girdi.hesapTarihi, kayit, `${merciAdi} maktu ${tl(maktuUcret)} TL`);

  const asamaCarpani =
    u.asama === 'on-inceleme-oncesi'
      ? d('0.5')
      : u.asama === 'odeme-suresi-icinde'
        ? d('0.75')
        : d(1);

  const icraMi = u.merci === 'icra-dairesi' || u.merci === 'icra-tahliye';
  const aymManeviKismiRetYururlukteMi = karsilastir(girdi.hesapTarihi, '2025-12-14') >= 0;
  const davaciBaslik = icraMi ? 'Alacaklı vekili lehine vekalet ücreti' : 'Davacı vekili lehine karşı vekalet ücreti';
  const davaliBaslik = 'Davalı vekili lehine karşı vekalet ücreti';

  const davaci = bosTarafHesabi('davaci', davaciBaslik, maktuUcret, asamaCarpani);
  const davali = bosTarafHesabi('davali', davaliBaslik, maktuUcret, asamaCarpani);
  const genelNotlar: string[] = [];

  const rgAciklama = satir.kaynak.resmiGazete
    ? `${trTarih(satir.kaynak.resmiGazete.tarih)} tarihli ve ${satir.kaynak.resmiGazete.sayi} sayılı Resmi Gazete`
    : satir.kaynak.ad;

  const parametreler: Parametre[] = [
    {
      ad: 'Uygulanan AAÜT dönemi',
      deger: `${satir.donem} (${trTarih(satir.baslangic)} - ${satir.bitis ? trTarih(satir.bitis) : 'devam'})`,
      kaynak: 'varsayılan',
      dayanak: `AAÜT m.21 (hüküm/hesap tarihi ${trTarih(girdi.hesapTarihi)}); ${rgAciklama}`,
    },
    {
      ad: 'Merci ve maktu ücret',
      deger: `${merciAdi}: ${tl(maktuUcret)} TL`,
      kaynak: 'girdi',
      dayanak: 'AAÜT İkinci Kısım İkinci Bölüm',
    },
    {
      ad: 'Hesap türü ve uyuşmazlık niteliği',
      deger: `${u.tur === 'nispi' ? 'Nispi (Üçüncü Kısım)' : 'Maktu (İkinci Kısım)'} · ${AAUT_NITELIK_ADLARI[u.nitelik]}`,
      kaynak: 'girdi',
      dayanak:
        u.nitelik === 'manevi-tazminat'
          ? aymManeviKismiRetYururlukteMi
            ? 'AAÜT m.10; AYM E.2024/29, K.2024/226 (RG 08.01.2026/33131 ile m.10/2 mülga)'
            : 'AAÜT m.10'
          : u.nitelik === 'maddi-tazminat'
            ? 'AAÜT m.13/3-4'
            : u.nitelik === 'nafaka'
              ? 'AAÜT m.9/1-2 (1 yıllık nafaka bedeli üzerinden nispi ücret; reddedilen kısım için ücrete hükmedilmez)'
              : u.merci === 'icra-mahkemesi-istihkak'
                ? 'İİK m.97, AAÜT m.11/3 c.3'
                : icraMi
                  ? 'İİK m.138, AAÜT m.11'
                  : 'HMK m.326, AAÜT m.13',
    },
    {
      ad: 'Aşama ve oran çarpanı',
      deger: `${AAUT_ASAMA_ADLARI[u.asama]}${u.asamaGerekcesi ? ` (${u.asamaGerekcesi})` : ''}`,
      kaynak: u.asama === 'karar' ? 'varsayılan' : 'girdi',
      dayanak:
        u.asama === 'on-inceleme-oncesi'
          ? idariYargiMi(u.merci)
            ? 'AAÜT m.15/1 (birinci savunma dilekçesi süresinin bitimine kadar 1/2 oran)'
            : 'AAÜT m.6/1 (ön inceleme tutanağı imzalanıncaya kadar 1/2 oran)'
          : u.asama === 'odeme-suresi-icinde'
            ? 'AAÜT m.11/4-5 (ödeme süresi içinde borcun ödenmesinde 3/4 oran)'
            : 'AAÜT m.5/1 (tam ücret)',
    },
  ];

  // 1) Maktu Hesap
  if (u.tur === 'maktu') {
    const hedef = u.maktuSonuc === 'ret' ? davali : davaci;
    const hükmedilen = kurus(maktuUcret.times(asamaCarpani));
    hedef.hukmedilenUcret = hükmedilen;
    hedef.dayanak.push(
      '1136 s.K. m.164, m.168',
      `${satir.donem} AAÜT İkinci Kısım İkinci Bölüm (${merciAdi} maktu ücreti: ${tl(maktuUcret)} TL)`,
    );
    if (u.asama === 'on-inceleme-oncesi') {
      hedef.dayanak.push(idariYargiMi(u.merci) ? 'AAÜT m.15/1 (1/2 oran)' : 'AAÜT m.6/1 (1/2 oran)');
      hedef.formul.push(`Maktu ücret × 1/2 = ${tl(maktuUcret)} × 0,50 = ${tl(hükmedilen)} TL`);
    } else if (u.asama === 'odeme-suresi-icinde') {
      hedef.dayanak.push('AAÜT m.11/4-5 (ödeme süresi içinde ödemede 3/4 oran)');
      hedef.formul.push(`Maktu ücret × 3/4 = ${tl(maktuUcret)} × 0,75 = ${tl(hükmedilen)} TL`);
    } else {
      hedef.formul.push(`Maktu ücret = ${tl(maktuUcret)} TL`);
    }

    genelNotlar.push(
      `Konusu para olmayan veya maktu ücrete tabi uyuşmazlıkta ${merciAdi} için öngörülen maktu ücret (${tl(maktuUcret)} TL) esas alınmıştır.`,
    );
  } else {
    // 2) Nispi Hesap (Konusu para olan veya para ile değerlendirilebilen işler)
    const tamRetMi = u.kabulTutari.isZero() && u.retTutari.gt(0);
    const kismiKabulKismiRetMi = u.kabulTutari.gt(0) && u.retTutari.gt(0);
    const icraTavanTerimi = satir.donem === '2026-2027' ? 'takipte kesinleşen miktar' : 'asıl alacak';

    if (u.nitelik === 'nafaka') {
      genelNotlar.push(
        'AAÜT m.9/1 uyarınca nafaka davalarında vekalet ücreti bir yıllık (12 aylık) nafaka tutarı üzerinden Üçüncü Kısım gereğince hesaplanır.',
      );
    }

    // --- A) Davacı / Alacaklı Vekili Lehine Hesap (kabulTutari > 0 ise) ---
    if (u.kabulTutari.gt(0)) {
      davaci.esasTutar = u.kabulTutari;
      const kademeli = kademeliNispiHesapla(u.kabulTutari, satir.dilimler);
      davaci.hamNispiUcret = kademeli.toplam;
      davaci.dilimler = kademeli.dilimler;

      davaci.dayanak.push(
        '1136 s.K. m.164, m.168',
        icraMi ? '2004 s.K. İİK m.138, AAÜT m.11/1' : '6100 s.K. HMK m.326, AAÜT m.13/1-2',
        `${satir.donem} AAÜT Üçüncü Kısım (kademeli nispi tarife)`,
      );
      if (u.merci === 'icra-mahkemesi-istihkak') {
        davaci.dayanak.push('AAÜT m.11/3 c.3 (İcra mahkemelerinde açılan istihkak davalarında Üçüncü Kısım gereğince nispi avukatlık ücretine hükmolunur)');
      }
      if (u.nitelik === 'nafaka') {
        davaci.dayanak.push('AAÜT m.9/1 (Bir yıllık nafaka bedeli üzerinden Üçüncü Kısım nispi ücret)');
      }

      davaci.formul.push(
        `${icraMi ? `Takip tutarı (${tl(u.kabulTutari)} TL)` : `Kabul edilen tutar (${tl(u.kabulTutari)} TL)`} üzerinden Üçüncü Kısım kademeli toplam = ${tl(kademeli.toplam)} TL`,
      );

      let tarifeUcreti = kademeli.toplam;
      if (tarifeUcreti.lt(maktuUcret)) {
        tarifeUcreti = maktuUcret;
        davaci.maktuTabanUygulandiMi = true;
        davaci.formul.push(
          `Maktu alt sınır kontrolü (${icraMi ? 'AAÜT m.11/1' : 'AAÜT m.13/1'}): ${tl(kademeli.toplam)} TL < ${tl(maktuUcret)} TL olduğundan maktu taban ${tl(maktuUcret)} TL alındı`,
        );
        davaci.notlar.push(
          `Hesaplanan nispi ücret (${tl(kademeli.toplam)} TL), ${merciAdi} maktu ücretinin (${tl(maktuUcret)} TL) altında kaldığından maktu ücret esas alınmıştır (${icraMi ? 'AAÜT m.11/1' : 'AAÜT m.13/1'}).`,
        );
      }

      if (icraMahkemesiTavanliMi(u.merci) && tarifeUcreti.gt(maktuUcret)) {
        tarifeUcreti = maktuUcret;
        davaci.maktuTavanUygulandiMi = true;
        davaci.dayanak.push('AAÜT m.11/3 (İcra mahkemelerinde nispi ücret maktu miktarı geçemez)');
        davaci.formul.push(
          `İcra mahkemesi üst sınırı (AAÜT m.11/3): ${tl(kademeli.toplam)} TL > ${tl(maktuUcret)} TL olduğundan ${tl(maktuUcret)} TL ile sınırlandı`,
        );
      }

      let asamaSonrasi = kurus(tarifeUcreti.times(asamaCarpani));
      if (!asamaCarpani.eq(1)) {
        const oranYaz = u.asama === 'on-inceleme-oncesi' ? '1/2 (%50)' : '3/4 (%75)';
        davaci.dayanak.push(
          u.asama === 'on-inceleme-oncesi'
            ? idariYargiMi(u.merci)
              ? 'AAÜT m.15/1 (1/2 oran)'
              : 'AAÜT m.6/1 (1/2 oran)'
            : 'AAÜT m.11/4 (3/4 oran)',
        );
        davaci.formul.push(
          `Aşama çarpanı (${oranYaz}): ${tl(tarifeUcreti)} × ${yuzde(asamaCarpani)} = ${tl(asamaSonrasi)} TL`,
        );
      }

      if (asamaSonrasi.gt(u.kabulTutari)) {
        asamaSonrasi = u.kabulTutari;
        davaci.muddeabihTavaniUygulandiMi = true;
        davaci.formul.push(
          `${icraMi ? `İcra ${icraTavanTerimi} üst sınırı (AAÜT m.11/1)` : 'Müddeabih üst sınırı (AAÜT m.13/2)'}: hükmedilen ücret ${icraMi ? icraTavanTerimi : 'kabul edilen'} tutarı (${tl(u.kabulTutari)} TL) geçemeyeceğinden ${tl(u.kabulTutari)} TL olarak belirlendi`,
        );
        davaci.notlar.push(
          `Hükmedilen vekalet ücreti ${icraMi ? icraTavanTerimi : 'kabul edilen müddeabih'} tutarını (${tl(u.kabulTutari)} TL) geçemeyeceğinden üst sınır uygulanmıştır (${icraMi ? 'AAÜT m.11/1' : 'AAÜT m.13/2'}).`,
        );
      }

      davaci.hukmedilenUcret = kurus(asamaSonrasi);
    }

    // --- B) Davalı Vekili Lehine Karşı Vekalet Ücreti (retTutari > 0 ve icra dairesi değilse) ---
    if (u.retTutari.gt(0) && !icraMi) {
      davali.esasTutar = u.retTutari;

      // Özel Kural 1: Nafaka davalarında reddedilen kısım için vekalet ücretine hükmedilemez (AAÜT m.9/2)
      if (u.nitelik === 'nafaka') {
        davali.nafakaRetIstisnasiMi = true;
        davali.hukmedilenUcret = d(0);
        davali.dayanak.push('AAÜT m.9/2 (Nafaka davalarında reddedilen kısım için avukatlık ücretine hükmedilemez)');
        davali.formul.push('Reddedilen nafaka tutarı için davalı lehine vekalet ücreti = 0,00 TL (AAÜT m.9/2)');
        davali.notlar.push(
          'AAÜT m.9/2 uyarınca nafaka davalarında reddedilen kısım için davalı vekili lehine avukatlık ücretine hükmedilemez.',
        );
        genelNotlar.push(
          'Nafaka davası niteliği seçildiğinden reddedilen kısım için davalı lehine vekalet ücreti hesaplanmamıştır (AAÜT m.9/2).',
        );
      } else if (
        kismiKabulKismiRetMi &&
        u.nitelik === 'manevi-tazminat' &&
        aymManeviKismiRetYururlukteMi
      ) {
        // Özel Kural 2a: AYM E.2024/29, K.2024/226 (yürürlük 14.12.2025) ve RG 08.01.2026/33131 ile
        // AAÜT m.10/2 yürürlükten kaldırıldığından manevi tazminatın kısmen reddinde davalı lehine karşı vekalet ücretine hükmedilemez!
        davali.hukmedilenUcret = d(0);
        davali.dayanak.push(
          'AYM 25.12.2024, E.2024/29, K.2024/226 (RG 14.03.2025/32841, yürürlük 14.12.2025)',
          'RG 08.01.2026/33131 ile AAÜT m.10/2 mülga (2026-2027 AAÜT m.10)',
        );
        davali.formul.push(
          'Manevi tazminat davasının kısmen reddinde davalı lehine karşı vekalet ücreti = 0,00 TL (AYM E.2024/29, K.2024/226; AAÜT m.10/2 mülga)',
        );
        davali.notlar.push(
          'Anayasa Mahkemesi E.2024/29, K.2024/226 kararı (yürürlük 14.12.2025) ve RG 08.01.2026/33131 değişikliğiyle AAÜT m.10/2 yürürlükten kaldırıldığından, manevi tazminat davasının kısmen reddinde davalı vekili lehine karşı vekalet ücretine hükmedilemez.',
        );
        genelNotlar.push(
          'Manevi tazminat davasının kısmen reddinde 14.12.2025 tarihinden itibaren davalı lehine karşı vekalet ücretine hükmedilmemektedir (AYM E.2024/29, K.2024/226; RG 08.01.2026/33131 ile AAÜT m.10/2 mülga).',
        );
      } else if (
        tamRetMi &&
        (u.nitelik === 'manevi-tazminat' || u.nitelik === 'maddi-tazminat')
      ) {
        // Özel Kural 2b: Manevi tazminat (AAÜT m.10) ve Maddi tazminat (AAÜT m.13/4) davalarının tamamının reddinde maktu ücret
        davali.tamRetMaktuUygulandiMi = true;
        const maddeAtfi = u.nitelik === 'manevi-tazminat' ? 'AAÜT m.10' : 'AAÜT m.13/4';
        davali.dayanak.push(
          '6100 s.K. HMK m.326',
          `${maddeAtfi} (${u.nitelik === 'manevi-tazminat' ? 'Manevi' : 'Maddi'} tazminat davalarının tamamının reddinde İkinci Kısım İkinci Bölüme göre maktu ücrete hükmolunur)`,
        );

        let asamaSonrasi = kurus(maktuUcret.times(asamaCarpani));
        davali.formul.push(
          `Tam ret nedeniyle maktu ücret (${maddeAtfi}) = ${tl(maktuUcret)} TL` +
            (!asamaCarpani.eq(1) ? ` × ${yuzde(asamaCarpani)} = ${tl(asamaSonrasi)} TL` : ''),
        );

        if (asamaSonrasi.gt(u.retTutari)) {
          asamaSonrasi = u.retTutari;
          davali.muddeabihTavaniUygulandiMi = true;
          davali.formul.push(
            `Reddedilen tutar üst sınırı (AAÜT m.13/2): ${tl(u.retTutari)} TL ile sınırlandı`,
          );
        }

        davali.hukmedilenUcret = kurus(asamaSonrasi);
        davali.notlar.push(
          `${u.nitelik === 'manevi-tazminat' ? 'Manevi' : 'Maddi'} tazminat davasının tamamı reddedildiğinden davalı vekili lehine maktu vekalet ücretine hükmedilmiştir (${maddeAtfi}).`,
        );
      } else {
        // Kısmi ret (veya genel alacak davasında tam/kısmi ret) -> Reddedilen tutar üzerinden nispi hesap
        const kademeliRet = kademeliNispiHesapla(u.retTutari, satir.dilimler);
        davali.hamNispiUcret = kademeliRet.toplam;
        davali.dilimler = kademeliRet.dilimler;

        davali.dayanak.push(
          '1136 s.K. m.164, m.168',
          '6100 s.K. HMK m.326, AAÜT m.13/1-2',
          `${satir.donem} AAÜT Üçüncü Kısım (reddedilen kısım üzerinden kademeli nispi tarife)`,
        );
        if (u.merci === 'icra-mahkemesi-istihkak') {
          davali.dayanak.push('AAÜT m.11/3 c.3 (İcra mahkemelerinde açılan istihkak davalarında Üçüncü Kısım gereğince nispi avukatlık ücretine hükmolunur)');
        }
        davali.formul.push(
          `Reddedilen tutar (${tl(u.retTutari)} TL) üzerinden Üçüncü Kısım kademeli toplam = ${tl(kademeliRet.toplam)} TL`,
        );

        let tarifeRetUcreti = kademeliRet.toplam;
        if (tarifeRetUcreti.lt(maktuUcret)) {
          tarifeRetUcreti = maktuUcret;
          davali.maktuTabanUygulandiMi = true;
          davali.formul.push(
            `Maktu alt sınır kontrolü (AAÜT m.13/1): ${tl(kademeliRet.toplam)} TL < ${tl(maktuUcret)} TL olduğundan maktu taban ${tl(maktuUcret)} TL alındı`,
          );
          davali.notlar.push(
            `Reddedilen kısım üzerinden hesaplanan nispi ücret (${tl(kademeliRet.toplam)} TL), ${merciAdi} maktu ücretinin (${tl(maktuUcret)} TL) altında kaldığından maktu taban uygulanmıştır (AAÜT m.13/1).`,
          );
        }

        if (icraMahkemesiTavanliMi(u.merci) && tarifeRetUcreti.gt(maktuUcret)) {
          tarifeRetUcreti = maktuUcret;
          davali.maktuTavanUygulandiMi = true;
          davali.dayanak.push('AAÜT m.11/3 (İcra mahkemelerinde nispi ücret maktu miktarı geçemez)');
        }

        let asamaSonrasi = kurus(tarifeRetUcreti.times(asamaCarpani));
        if (!asamaCarpani.eq(1)) {
          davali.dayanak.push(
            idariYargiMi(u.merci) ? 'AAÜT m.15/1 (1/2 oran)' : 'AAÜT m.6/1 (1/2 oran)',
          );
          davali.formul.push(
            `Aşama çarpanı (1/2): ${tl(tarifeRetUcreti)} × %50 = ${tl(asamaSonrasi)} TL`,
          );
        }

        // Özel Kural 3: Maddi tazminat (AAÜT m.13/3) ve 14.12.2025 öncesi Manevi tazminat (mülga AAÜT m.10/2) kısmi ret üst sınırı:
        // Davalı vekili yararına hükmedilecek ücret, davacı vekili lehine belirlenen ücreti geçemez!
        if (
          kismiKabulKismiRetMi &&
          (u.nitelik === 'maddi-tazminat' || (u.nitelik === 'manevi-tazminat' && !aymManeviKismiRetYururlukteMi))
        ) {
          const maddeAtfi = u.nitelik === 'manevi-tazminat' ? 'AAÜT m.10/2' : 'AAÜT m.13/3';
          davali.dayanak.push(
            `${maddeAtfi} (Kısmen ret durumunda davalı vekili lehine hükmedilecek ücret davacı vekili lehine belirlenen ücreti geçemez)`,
          );
          if (asamaSonrasi.gt(davaci.hukmedilenUcret)) {
            asamaSonrasi = davaci.hukmedilenUcret;
            davali.davaciUcretiTavaniUygulandiMi = true;
            davali.formul.push(
              `Davacı ücreti üst sınırı (${maddeAtfi}): davalı ücreti davacı vekili lehine belirlenen ücreti (${tl(davaci.hukmedilenUcret)} TL) geçemeyeceğinden ${tl(davaci.hukmedilenUcret)} TL'ye indirildi`,
            );
            davali.notlar.push(
              `${u.nitelik === 'manevi-tazminat' ? 'Manevi' : 'Maddi'} tazminat davasının kısmen reddinde davalı vekili lehine hükmedilecek ücret, davacı vekili lehine belirlenen ücreti (${tl(davaci.hukmedilenUcret)} TL) geçemez (${maddeAtfi}).`,
            );
          }
        }

        // Reddedilen miktarı geçemez (AAÜT m.13/2)
        if (asamaSonrasi.gt(u.retTutari)) {
          asamaSonrasi = u.retTutari;
          davali.muddeabihTavaniUygulandiMi = true;
          davali.formul.push(
            `Reddedilen müddeabih üst sınırı (AAÜT m.13/2): hükmedilen ücret reddedilen tutarı (${tl(u.retTutari)} TL) geçemeyeceğinden ${tl(u.retTutari)} TL olarak belirlendi`,
          );
          davali.notlar.push(
            `Davalı lehine hükmedilen vekalet ücreti reddedilen miktarı (${tl(u.retTutari)} TL) geçemeyeceğinden sınırlandırılmıştır (AAÜT m.13/2).`,
          );
        }

        davali.hukmedilenUcret = kurus(asamaSonrasi);
      }
    }

    if (kismiKabulKismiRetMi && !(u.nitelik === 'manevi-tazminat' && aymManeviKismiRetYururlukteMi) && u.nitelik !== 'nafaka') {
      genelNotlar.push(
        `Dava kısmen kabul (${tl(u.kabulTutari)} TL) ve kısmen ret (${tl(u.retTutari)} TL) ile sonuçlandığından HMK m.326 ve AAÜT m.13 uyarınca taraflar lehine ayrı ayrı karşı vekalet ücreti hesaplanmıştır.`,
      );
    }
  }

  const tabloOzetleri = [
    {
      ad: tablolar.aaut.ad,
      dogrulamaTarihi: tablolar.aaut.dogrulamaTarihi,
      ozet: tablolar.aaut.ozet,
    },
  ];

  return {
    girdi,
    tarifeDonemi: satir.donem,
    merciAdi,
    maktuUcret,
    asamaCarpani,
    davaci,
    davali,
    parametreler,
    notlar: genelNotlar,
    kaynaklar: kayit.liste(),
    uyarilar: [...kayit.uyarilar],
    tabloOzetleri,
  };
}
