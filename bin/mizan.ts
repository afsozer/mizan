#!/usr/bin/env node
// mizan komut satırı: hesapla (PDF rapor + defter satırı) ve tablolar (denetim).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { herhangiGirdiOku } from '../src/node/girdi-dosya.ts';
import { hesapla } from '../src/hesap.ts';
import {
  icraDefterSatiri,
  icraHesapla,
  icraKanitDosyaAdi,
  icraRaporTanimi,
  icraUdfDosyaAdi,
  icraUdfOlustur,
} from '../src/icra/index.ts';
import {
  aautDefterSatiri,
  aautHesapla,
  aautKanitDosyaAdi,
  aautRaporTanimi,
  aautUdfDosyaAdi,
  aautUdfOlustur,
} from '../src/aaut/index.ts';
import {
  aileDefterSatiri,
  aileHesapla,
  aileKanitDosyaAdi,
  aileRaporTanimi,
  aileUdfDosyaAdi,
  aileUdfOlustur,
  tarafAdi,
} from '../src/aile/index.ts';
import { tl } from '../src/para.ts';
import { raporTanimi, type RaporBilgisi } from '../src/rapor/pdf.ts';
import { udfOlustur, udfDosyaAdi } from '../src/rapor/udf.ts';
import { pdfYaz } from '../src/node/pdf-yaz.ts';
import { defterSatiri, kanitDosyaAdi } from '../src/rapor/defter.ts';
import { surumYaz } from '../src/surum.ts';
import { surumBilgisi } from '../src/node/surum.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';
import { bugun, trTarih } from '../src/tarih.ts';

const YARDIM = `mizan: işçilik alacakları, icra kapak hesabı, AAÜT vekalet ücreti ve mal rejimi tasfiyesi aracı

Kullanım:
  mizan hesapla <girdi.yaml> [--cikti <dizin>]   PDF rapor, UYAP UDF rapor ve kayıt defteri satırı üretir
  mizan tablolar                                 Tabloları denetler, doğrulama tarihlerini yazar
  mizan --surum

Girdi örnekleri: ornekler/ornek-iscilik.yaml, ornekler/ornek-icra.yaml, ornekler/ornek-aaut.yaml, ornekler/ornek-aile.yaml`;

function secenek(arg: string[], ad: string): string | undefined {
  const i = arg.indexOf(ad);
  return i >= 0 ? arg[i + 1] : undefined;
}

function uretimZamani(): string {
  const s = new Date();
  const ss = String(s.getHours()).padStart(2, '0');
  const dk = String(s.getMinutes()).padStart(2, '0');
  return `${trTarih(bugun())} ${ss}:${dk}`;
}

async function ciktilariYaz(
  dizin: string,
  pdfAdi: string,
  pdfTanim: Record<string, unknown>,
  udfAdi: string,
  udfBayt: Uint8Array,
  satir: string,
): Promise<{ pdfYolu: string; udfYolu: string; defterYolu: string }> {
  const pdfYolu = join(dizin, pdfAdi);
  await pdfYaz(pdfTanim, pdfYolu);
  const udfYolu = join(dizin, udfAdi);
  writeFileSync(udfYolu, udfBayt);
  const defterYolu = pdfYolu.replace(/\.pdf$/, '.defter.md');
  writeFileSync(defterYolu, satir + '\n');
  return { pdfYolu, udfYolu, defterYolu };
}

function raporYollariniYaz(
  cikti: { pdfYolu: string; udfYolu: string; defterYolu: string },
  satir: string,
  udfBosluk = ' ',
): void {
  console.log(`\nRapor: ${cikti.pdfYolu}`);
  console.log(`UDF:${udfBosluk}${cikti.udfYolu} (resmi kullanımdan önce UYAP Doküman Editör'de elle doğrulayın)`);
  console.log(`Defter satırı (${cikti.defterYolu}):\n${satir}`);
}

async function hesaplaKomutu(arg: string[]): Promise<void> {
  const yol = arg[0];
  if (!yol) throw new Error('Girdi dosyası verilmedi.\n\n' + YARDIM);
  const okunan = herhangiGirdiOku(resolve(yol));
  const surum = surumYaz(surumBilgisi());
  const tarih = bugun();
  const dizin = resolve(secenek(arg, '--cikti') ?? '.');
  mkdirSync(dizin, { recursive: true });
  const raporBilgi: RaporBilgisi = { uretimZamani: uretimZamani(), surum, girdiOzeti: okunan.ozet };

  if (okunan.alan === 'icra') {
    const { girdi } = okunan;
    const sonuc = icraHesapla(girdi, tablolariYukle());
    const satir = icraDefterSatiri(sonuc, tarih, surum);
    const cikti = await ciktilariYaz(
      dizin,
      icraKanitDosyaAdi(sonuc, tarih),
      icraRaporTanimi(sonuc, raporBilgi),
      icraUdfDosyaAdi(sonuc, tarih),
      icraUdfOlustur(sonuc, raporBilgi),
      satir,
    );

    console.log(`${'Takip çıkışı toplamı'.padEnd(38)} ${tl(sonuc.takipCikisToplami).padStart(16)} TL`);
    console.log(`${'Takip sonrası faiz toplamı'.padEnd(38)} ${tl(sonuc.toplamTakipSonrasiFaiz).padStart(16)} TL`);
    console.log(`${'Bakiye tahsil harcı'.padEnd(38)} ${tl(sonuc.harclar.bakiyeTahsilHarci).padStart(16)} TL`);
    console.log(`${'Borçlunun ödeyeceği kapak tutarı'.padEnd(38)} ${tl(sonuc.borclununOdeyecegiKapakTutari).padStart(16)} TL`);
    console.log(`${'Cezaevleri yapı harcı (%2)'.padEnd(38)} ${tl(sonuc.harclar.cezaeviHarci).padStart(16)} TL`);
    console.log(`${'Alacaklıya net ödenecek tutar'.padEnd(38)} ${tl(sonuc.alacakliyaNetOdenecekTutar).padStart(16)} TL`);
    for (const u of sonuc.uyarilar) console.error(`Uyarı: ${u}`);
    raporYollariniYaz(cikti, satir);
    return;
  }

  if (okunan.alan === 'aaut') {
    const { girdi } = okunan;
    const sonuc = aautHesapla(girdi, tablolariYukle());
    const satir = aautDefterSatiri(sonuc, tarih, surum);
    const cikti = await ciktilariYaz(
      dizin,
      aautKanitDosyaAdi(sonuc, tarih),
      aautRaporTanimi(sonuc, raporBilgi),
      aautUdfDosyaAdi(sonuc, tarih),
      aautUdfOlustur(sonuc, raporBilgi),
      satir,
    );

    console.log(`${'Tarife dönemi'.padEnd(38)} ${sonuc.tarifeDonemi} (${sonuc.merciAdi})`);
    if (!sonuc.davaci.hukmedilenUcret.isZero() || girdi.uyusmazlik.kabulTutari.gt(0)) {
      console.log(`${sonuc.davaci.baslik.padEnd(38)} ${tl(sonuc.davaci.hukmedilenUcret).padStart(14)} TL`);
    }
    if (!sonuc.davali.hukmedilenUcret.isZero() || girdi.uyusmazlik.retTutari.gt(0)) {
      console.log(`${sonuc.davali.baslik.padEnd(38)} ${tl(sonuc.davali.hukmedilenUcret).padStart(14)} TL`);
    }
    for (const u of sonuc.uyarilar) console.error(`Uyarı: ${u}`);
    raporYollariniYaz(cikti, satir);
    return;
  }

  if (okunan.alan === 'aile') {
    const { girdi } = okunan;
    const sonuc = aileHesapla(girdi, tablolariYukle());
    const satir = aileDefterSatiri(sonuc, tarih, surum);
    const cikti = await ciktilariYaz(
      dizin,
      aileKanitDosyaAdi(sonuc, tarih),
      aileRaporTanimi(sonuc, raporBilgi),
      aileUdfDosyaAdi(sonuc, tarih),
      aileUdfOlustur(sonuc, raporBilgi),
      satir,
    );

    console.log(`${'Davacı değer artış payı'.padEnd(38)} ${tl(sonuc.takas.davaciDegerArtisPayi).padStart(14)} TL`);
    console.log(`${'Davalı değer artış payı'.padEnd(38)} ${tl(sonuc.takas.davaliDegerArtisPayi).padStart(14)} TL`);
    console.log(`${'Davacı artık değeri'.padEnd(38)} ${tl(sonuc.artikDeger.davaci.artikDeger).padStart(14)} TL`);
    console.log(`${'Davalı artık değeri'.padEnd(38)} ${tl(sonuc.artikDeger.davali.artikDeger).padStart(14)} TL`);
    console.log(`${'Davacı net katılma alacağı'.padEnd(38)} ${tl(sonuc.takas.davaciNetKatilma).padStart(14)} TL`);
    console.log(`${'Davalı net katılma alacağı'.padEnd(38)} ${tl(sonuc.takas.davaliNetKatilma).padStart(14)} TL`);
    const netEtiket = sonuc.takas.netAlacakli === 'denk' ? 'Net bakiye (denk)' : `Net bakiye (${tarafAdi(sonuc.takas.netAlacakli)} lehine)`;
    const faizOzeti =
      sonuc.toplamFaiz.davaci.gt(0) && sonuc.toplamFaiz.davali.gt(0)
        ? `davacı faizi ${tl(sonuc.toplamFaiz.davaci)} / davalı faizi ${tl(sonuc.toplamFaiz.davali)}`
        : `faiz ${tl(sonuc.takas.netAlacakli === 'davali' ? sonuc.toplamFaiz.davali : sonuc.toplamFaiz.davaci)}`;
    console.log(`${netEtiket.padEnd(38)} ${tl(sonuc.takas.netBakiye).padStart(14)} TL  ${faizOzeti}`);
    for (const u of sonuc.uyarilar) console.error(`Uyarı: ${u}`);
    raporYollariniYaz(cikti, satir);
    return;
  }

  const { girdi } = okunan;
  const sonuc = hesapla(girdi, tablolariYukle({ mevduatFaizi: girdi.tablolar?.mevduatFaizi }));
  const satir = defterSatiri(sonuc, tarih, surum);
  const cikti = await ciktilariYaz(
    dizin,
    kanitDosyaAdi(sonuc, tarih),
    raporTanimi(sonuc, raporBilgi),
    udfDosyaAdi(sonuc, tarih),
    udfOlustur(sonuc, raporBilgi),
    satir,
  );

  for (const k of sonuc.kalemler) {
    console.log(`${k.ad.padEnd(38)} brüt ${tl(k.brut).padStart(14)}  net ${tl(k.net).padStart(14)}`);
  }
  console.log(`${'Toplam'.padEnd(38)} brüt ${tl(sonuc.toplam.brut).padStart(14)}  net ${tl(sonuc.toplam.net).padStart(14)}  faiz ${tl(sonuc.toplam.faiz)}`);
  for (const u of sonuc.uyarilar) console.error(`Uyarı: ${u}`);
  raporYollariniYaz(cikti, satir, '   ');
}

function tablolarKomutu(): void {
  const t = tablolariYukle();
  const donemseller = [
    t.asgariUcret,
    t.kidemTavani,
    t.sgk,
    t.damga,
    t.yasalFaiz,
    t.mevduatFaizi,
    ...(t.avansReeskontFaizi ? [t.avansReeskontFaizi] : []),
    ...(t.icraHarclari ? [t.icraHarclari] : []),
  ];
  for (const x of donemseller) {
    const ilk = x.satirlar[0]!;
    console.log(`${x.ad}\n  ${x.satirlar.length} satır, başlangıç ${trTarih(ilk.baslangic)}, doğrulama ${trTarih(x.dogrulamaTarihi)}`);
  }
  console.log(`${t.gelirVergisi.ad}\n  yıllar: ${t.gelirVergisi.yillar.map((y) => y.yil).join(', ')}`);
  console.log(
    `${t.ubgtTakvimi.ad}\n  yıllar: ${t.ubgtTakvimi.yillar.map((y) => y.yil).join(', ')}, doğrulama ${trTarih(t.ubgtTakvimi.dogrulamaTarihi)}`,
  );
  if (t.aaut) {
    const ilk = t.aaut.satirlar[0]!;
    console.log(
      `${t.aaut.ad}\n  ${t.aaut.satirlar.length} dönem (${t.aaut.satirlar.map((s) => s.donem).join(', ')}), başlangıç ${trTarih(ilk.baslangic)}, doğrulama ${trTarih(t.aaut.dogrulamaTarihi)}`,
    );
  }
}

async function main(): Promise<void> {
  const [komut, ...arg] = process.argv.slice(2);
  switch (komut) {
    case 'hesapla':
      return hesaplaKomutu(arg);
    case 'tablolar':
      return tablolarKomutu();
    case '--surum':
      console.log(surumYaz(surumBilgisi()));
      return;
    default:
      console.log(YARDIM);
  }
}

main().catch((e: unknown) => {
  console.error(`Hata: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
