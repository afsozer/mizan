// Brüt-net dönüşümü. Kesinti türü kaleme göre değişir:
//   kıdem: yalnız damga vergisi (tavan içinde GVK m.25/1-7-a istisnası, 5510 m.80/1-b prim dışı)
//   ihbar: gelir vergisi + damga vergisi (5510 m.80/1-b prime esas kazanca girmez)
//   ücret niteliğindekiler: SGK işçi payı + işsizlik sigortası işçi payı + gelir vergisi + damga vergisi
import { d, Decimal, kurus, tl, yuzde, topla } from './para.ts';
import type { KesintiTuru } from './kalemler/ortak.ts';
import type { VergiParametresi } from './girdi.ts';
import type { KaynakKaydi, Tablolar } from './tablolar.ts';

export interface Kesinti {
  ad: string;
  matrah: Decimal;
  oran: string;
  tutar: Decimal;
  dayanak: string;
}

export interface KesintiSonucu {
  kesintiler: Kesinti[];
  net: Decimal;
  gelirVergisiMatrahi: Decimal;
}

/** Aynı hesap içindeki kalemlerin gelir vergisi matrahları sırayla birikir (dilim yönteminde). */
export class VergiBirikimi {
  kumulatif: Decimal;

  constructor(baslangic: Decimal) {
    this.kumulatif = baslangic;
  }
}

export function kesintiHesapla(
  brut: Decimal,
  tur: KesintiTuru,
  tarih: string,
  vergiYili: number,
  vergi: VergiParametresi,
  birikim: VergiBirikimi,
  tablolar: Tablolar,
  kayit: KaynakKaydi,
): KesintiSonucu {
  const kesintiler: Kesinti[] = [];
  let gvMatrah = brut;

  if (tur === 'ucret') {
    const sgk = tablolar.sgk.bul(tarih, kayit);
    const sgkTutar = kurus(brut.times(sgk.sgkIsci));
    const issizlik = kurus(brut.times(sgk.issizlikIsci));
    kesintiler.push(
      { ad: 'SGK işçi payı', matrah: brut, oran: yuzde(d(sgk.sgkIsci)), tutar: sgkTutar, dayanak: '5510 s.K. m.81/1-a, f' },
      { ad: 'İşsizlik sigortası işçi payı', matrah: brut, oran: yuzde(d(sgk.issizlikIsci)), tutar: issizlik, dayanak: '4447 s.K. m.49/1' },
    );
    gvMatrah = brut.minus(sgkTutar).minus(issizlik);
  }

  if (tur === 'ucret' || tur === 'ihbar') {
    let gv: Decimal;
    let oranMetni: string;
    if (vergi.yontem === 'sabit') {
      gv = kurus(gvMatrah.times(vergi.sabitOran!));
      oranMetni = yuzde(vergi.sabitOran!);
    } else {
      gv = kurus(tablolar.gelirVergisi.vergi(vergiYili, gvMatrah, birikim.kumulatif, kayit));
      oranMetni = `${vergiYili} tarifesi, kümülatif`;
    }
    birikim.kumulatif = birikim.kumulatif.plus(gvMatrah);
    kesintiler.push({ ad: 'Gelir vergisi', matrah: gvMatrah, oran: oranMetni, tutar: gv, dayanak: 'GVK m.61, m.94, m.103' });
  }

  const damga = tablolar.damga.bul(tarih, kayit);
  kesintiler.push({
    ad: 'Damga vergisi',
    matrah: brut,
    oran: yuzde(d(damga.oran)),
    tutar: kurus(brut.times(damga.oran)),
    dayanak: '488 s.K. (1) sayılı tablo IV-1-b',
  });

  return { kesintiler, net: brut.minus(topla(kesintiler.map((k) => k.tutar))), gelirVergisiMatrahi: gvMatrah };
}

export interface AsgariUcretIstisnasi {
  gelirVergisi: Decimal;
  damgaVergisi: Decimal;
  aciklama: string;
}

/**
 * Ödeme ayındaki asgari ücret istisnası (GVGT Seri 319): asgari ücretin o ayki gelir vergisi
 * (yıl başından kümülatif matrahla) ve aylık brüt asgari ücretin damga vergisi. Ödeme ayında
 * başka ücret ödenmediği, istisnanın tamamen kullanılabildiği varsayılır.
 */
export function asgariUcretIstisnasi(
  tarih: string,
  vergiYili: number,
  tablolar: Tablolar,
  kayit: KaynakKaydi,
): AsgariUcretIstisnasi {
  const ay = Number(tarih.slice(5, 7));
  let onceki = d(0);
  let matrah = d(0);
  let brut = d(0);
  for (let i = 1; i <= ay; i++) {
    const gun = `${vergiYili}-${String(i).padStart(2, '0')}-01`;
    const asgari = d(tablolar.asgariUcret.bul(gun, kayit).brutAylik);
    const sgk = tablolar.sgk.bul(gun, kayit);
    const m = asgari.minus(kurus(asgari.times(sgk.sgkIsci))).minus(kurus(asgari.times(sgk.issizlikIsci)));
    if (i < ay) onceki = onceki.plus(m);
    else {
      matrah = m;
      brut = asgari;
    }
  }
  const gelirVergisi = kurus(tablolar.gelirVergisi.vergi(vergiYili, matrah, onceki, kayit));
  const damgaVergisi = kurus(brut.times(tablolar.damga.bul(tarih, kayit).oran));
  return {
    gelirVergisi,
    damgaVergisi,
    aciklama:
      `${vergiYili}/${String(ay).padStart(2, '0')} ayı: asgari ücret matrahı ${tl(matrah)} TL (önceki aylar kümülatif ${tl(onceki)} TL), ` +
      `istisna GV ${tl(gelirVergisi)} TL, DV ${tl(damgaVergisi)} TL`,
  };
}

/**
 * İstisnayı önce ücret niteliğindeki kalemlerin, kalanını ihbar ve kıdemin vergisine mahsup eder
 * (GİB özelgesi 13.12.2023: ücrete uygulandıktan sonra kalan istisna ihbar ve kıdeme).
 */
export function istisnaUygula(
  kalemler: { kesintiTuru: KesintiTuru; kesintiler: Kesinti[]; net: Decimal; brut: Decimal }[],
  istisna: AsgariUcretIstisnasi,
): void {
  const sirali = [...kalemler.filter((k) => k.kesintiTuru === 'ucret'), ...kalemler.filter((k) => k.kesintiTuru !== 'ucret')];
  const dagit = (vergiAdi: string, toplam: Decimal, ad: string) => {
    let kalan = toplam;
    for (const k of sirali) {
      if (kalan.isZero()) break;
      const vergi = k.kesintiler.find((x) => x.ad === vergiAdi);
      if (!vergi || vergi.tutar.isZero()) continue;
      const dusen = Decimal.min(kalan, vergi.tutar);
      kalan = kalan.minus(dusen);
      k.kesintiler.push({ ad, matrah: vergi.tutar, oran: '-', tutar: dusen.negated(), dayanak: istisna.aciklama });
    }
  };
  dagit('Gelir vergisi', istisna.gelirVergisi, 'Asgari ücret GV istisnası');
  dagit('Damga vergisi', istisna.damgaVergisi, 'Asgari ücret DV istisnası');
  for (const k of kalemler) k.net = k.brut.minus(topla(k.kesintiler.map((x) => x.tutar)));
}
