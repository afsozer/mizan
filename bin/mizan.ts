#!/usr/bin/env node
// mizan komut satırı: hesapla (PDF rapor + defter satırı) ve tablolar (denetim).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { girdiOku } from '../src/node/girdi-dosya.ts';
import { hesapla } from '../src/hesap.ts';
import { tl } from '../src/para.ts';
import { raporTanimi } from '../src/rapor/pdf.ts';
import { pdfYaz } from '../src/node/pdf-yaz.ts';
import { defterSatiri, kanitDosyaAdi } from '../src/rapor/defter.ts';
import { surumYaz } from '../src/surum.ts';
import { surumBilgisi } from '../src/node/surum.ts';
import { tablolariYukle } from '../src/node/tablolar-dosya.ts';
import { bugun, trTarih } from '../src/tarih.ts';

const YARDIM = `mizan: işçilik alacakları hesap aracı

Kullanım:
  mizan hesapla <girdi.yaml> [--cikti <dizin>]   PDF rapor ve kayıt defteri satırı üretir
  mizan tablolar                                 Tabloları denetler, doğrulama tarihlerini yazar
  mizan --surum

Girdi örneği: ornekler/ornek-iscilik.yaml`;

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
  const { girdi, ozet } = girdiOku(resolve(yol));
  const sonuc = hesapla(girdi, tablolariYukle({ mevduatFaizi: girdi.tablolar?.mevduatFaizi }));
  const surum = surumYaz(surumBilgisi());
  const tarih = bugun();
  const dizin = resolve(secenek(arg, '--cikti') ?? '.');
  mkdirSync(dizin, { recursive: true });
  const pdfAdi = kanitDosyaAdi(sonuc, tarih);
  const pdfYolu = join(dizin, pdfAdi);
  await pdfYaz(raporTanimi(sonuc, { uretimZamani: uretimZamani(), surum, girdiOzeti: ozet }), pdfYolu);
  const satir = defterSatiri(sonuc, tarih, surum);
  const defterYolu = pdfYolu.replace(/\.pdf$/, '.defter.md');
  writeFileSync(defterYolu, satir + '\n');

  for (const k of sonuc.kalemler) {
    console.log(`${k.ad.padEnd(38)} brüt ${tl(k.brut).padStart(14)}  net ${tl(k.net).padStart(14)}`);
  }
  console.log(`${'Toplam'.padEnd(38)} brüt ${tl(sonuc.toplam.brut).padStart(14)}  net ${tl(sonuc.toplam.net).padStart(14)}  faiz ${tl(sonuc.toplam.faiz)}`);
  for (const u of sonuc.uyarilar) console.error(`Uyarı: ${u}`);
  console.log(`\nRapor: ${pdfYolu}`);
  console.log(`Defter satırı (${defterYolu}):\n${satir}`);
}

function tablolarKomutu(): void {
  const t = tablolariYukle();
  for (const x of [t.asgariUcret, t.kidemTavani, t.sgk, t.damga, t.yasalFaiz, t.mevduatFaizi]) {
    const ilk = x.satirlar[0]!;
    console.log(`${x.ad}\n  ${x.satirlar.length} satır, başlangıç ${trTarih(ilk.baslangic)}, doğrulama ${trTarih(x.dogrulamaTarihi)}`);
  }
  console.log(`${t.gelirVergisi.ad}\n  yıllar: ${t.gelirVergisi.yillar.map((y) => y.yil).join(', ')}`);
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
