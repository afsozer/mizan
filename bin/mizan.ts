#!/usr/bin/env node
// mizan komut satırı: hesapla (PDF rapor + defter satırı) ve tablolar (denetim).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { herhangiGirdiOku } from '../src/node/girdi-dosya.ts';
import { hesapla } from '../src/hesap.ts';
import { icraDefterSatiri, icraHesapla, icraKanitDosyaAdi, icraRaporTanimi } from '../src/icra/index.ts';
import { aautDefterSatiri, aautHesapla, aautKanitDosyaAdi, aautRaporTanimi } from '../src/aaut/index.ts';
import { tl } from '../src/para.ts';
import { raporTanimi } from '../src/rapor/pdf.ts';
import { udfOlustur, udfDosyaAdi } from '../src/rapor/udf.ts';
import { pdfYaz } from '../src/node/pdf-yaz.ts';
import { defterSatiri, kanitDosyaAdi } from '../src/rapor/defter.ts';
import { surumYaz } from '../src/surum.ts';
import { surumBilgisi } from '../src/node/surum.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';
import { bugun, trTarih } from '../src/tarih.ts';

const YARDIM = `mizan: işçilik alacakları, icra kapak hesabı ve AAÜT vekalet ücreti aracı

Kullanım:
  mizan hesapla <girdi.yaml> [--cikti <dizin>]   PDF rapor, UYAP UDF rapor ve kayıt defteri satırı üretir
  mizan tablolar                                 Tabloları denetler, doğrulama tarihlerini yazar
  mizan --surum

Girdi örnekleri: ornekler/ornek-iscilik.yaml, ornekler/ornek-icra.yaml, ornekler/ornek-aaut.yaml`;

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

async function hesaplaKomutu(arg: string[]): Promise<void> {
  const yol = arg[0];
  if (!yol) throw new Error('Girdi dosyası verilmedi.\n\n' + YARDIM);
  const okunan = herhangiGirdiOku(resolve(yol));
  const surum = surumYaz(surumBilgisi());
  const tarih = bugun();
  const dizin = resolve(secenek(arg, '--cikti') ?? '.');
  mkdirSync(dizin, { recursive: true });

  if (okunan.alan === 'icra') {
    const { girdi, ozet } = okunan;
    const sonuc = icraHesapla(girdi, tablolariYukle());
    const pdfAdi = icraKanitDosyaAdi(sonuc, tarih);
    const pdfYolu = join(dizin, pdfAdi);
    await pdfYaz(icraRaporTanimi(sonuc, { uretimZamani: uretimZamani(), surum, girdiOzeti: ozet }), pdfYolu);
    const satir = icraDefterSatiri(sonuc, tarih, surum);
    const defterYolu = pdfYolu.replace(/\.pdf$/, '.defter.md');
    writeFileSync(defterYolu, satir + '\n');

    console.log(`${'Takip çıkışı toplamı'.padEnd(38)} ${tl(sonuc.takipCikisToplami).padStart(16)} TL`);
    console.log(`${'Takip sonrası faiz toplamı'.padEnd(38)} ${tl(sonuc.toplamTakipSonrasiFaiz).padStart(16)} TL`);
    console.log(`${'Bakiye tahsil harcı'.padEnd(38)} ${tl(sonuc.harclar.bakiyeTahsilHarci).padStart(16)} TL`);
    console.log(`${'Borçlunun ödeyeceği kapak tutarı'.padEnd(38)} ${tl(sonuc.borclununOdeyecegiKapakTutari).padStart(16)} TL`);
    console.log(`${'Cezaevleri yapı harcı (%2)'.padEnd(38)} ${tl(sonuc.harclar.cezaeviHarci).padStart(16)} TL`);
    console.log(`${'Alacaklıya net ödenecek tutar'.padEnd(38)} ${tl(sonuc.alacakliyaNetOdenecekTutar).padStart(16)} TL`);
    for (const u of sonuc.uyarilar) console.error(`Uyarı: ${u}`);
    console.log(`\nRapor: ${pdfYolu}`);
    console.log(`Defter satırı (${defterYolu}):\n${satir}`);
    return;
  }

  if (okunan.alan === 'aaut') {
    const { girdi, ozet } = okunan;
    const sonuc = aautHesapla(girdi, tablolariYukle());
    const pdfAdi = aautKanitDosyaAdi(sonuc, tarih);
    const pdfYolu = join(dizin, pdfAdi);
    await pdfYaz(aautRaporTanimi(sonuc, { uretimZamani: uretimZamani(), surum, girdiOzeti: ozet }), pdfYolu);
    const satir = aautDefterSatiri(sonuc, tarih, surum);
    const defterYolu = pdfYolu.replace(/\.pdf$/, '.defter.md');
    writeFileSync(defterYolu, satir + '\n');

    console.log(`${'Tarife dönemi'.padEnd(38)} ${sonuc.tarifeDonemi} (${sonuc.merciAdi})`);
    if (!sonuc.davaci.hukmedilenUcret.isZero() || girdi.uyusmazlik.kabulTutari.gt(0)) {
      console.log(`${sonuc.davaci.baslik.padEnd(38)} ${tl(sonuc.davaci.hukmedilenUcret).padStart(14)} TL`);
    }
    if (!sonuc.davali.hukmedilenUcret.isZero() || girdi.uyusmazlik.retTutari.gt(0)) {
      console.log(`${sonuc.davali.baslik.padEnd(38)} ${tl(sonuc.davali.hukmedilenUcret).padStart(14)} TL`);
    }
    for (const u of sonuc.uyarilar) console.error(`Uyarı: ${u}`);
    console.log(`\nRapor: ${pdfYolu}`);
    console.log(`Defter satırı (${defterYolu}):\n${satir}`);
    return;
  }

  const { girdi, ozet } = okunan;
  const sonuc = hesapla(girdi, tablolariYukle({ mevduatFaizi: girdi.tablolar?.mevduatFaizi }));
  const pdfAdi = kanitDosyaAdi(sonuc, tarih);
  const pdfYolu = join(dizin, pdfAdi);
  const raporBilgi = { uretimZamani: uretimZamani(), surum, girdiOzeti: ozet };
  await pdfYaz(raporTanimi(sonuc, raporBilgi), pdfYolu);
  const udfYolu = join(dizin, udfDosyaAdi(sonuc, tarih));
  writeFileSync(udfYolu, udfOlustur(sonuc, raporBilgi));
  const satir = defterSatiri(sonuc, tarih, surum);
  const defterYolu = pdfYolu.replace(/\.pdf$/, '.defter.md');
  writeFileSync(defterYolu, satir + '\n');

  for (const k of sonuc.kalemler) {
    console.log(`${k.ad.padEnd(38)} brüt ${tl(k.brut).padStart(14)}  net ${tl(k.net).padStart(14)}`);
  }
  console.log(`${'Toplam'.padEnd(38)} brüt ${tl(sonuc.toplam.brut).padStart(14)}  net ${tl(sonuc.toplam.net).padStart(14)}  faiz ${tl(sonuc.toplam.faiz)}`);
  for (const u of sonuc.uyarilar) console.error(`Uyarı: ${u}`);
  console.log(`\nRapor: ${pdfYolu}`);
  console.log(`UDF:   ${udfYolu} (resmi kullanımdan önce UYAP Doküman Editör'de elle doğrulayın)`);
  console.log(`Defter satırı (${defterYolu}):\n${satir}`);
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
