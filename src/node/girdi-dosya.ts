import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { girdiMetindenCoz, type Girdi } from '../girdi.ts';
import { icraGirdiMetindenCoz, metindenAlanOku, type HesapAlani, type IcraGirdisi } from '../icra/girdi.ts';
import { aautGirdiMetindenCoz, type AautGirdisi } from '../aaut/girdi.ts';
import { aileGirdiMetindenCoz, type AileGirdi } from '../aile/index.ts';

/** Girdi dosyasının hangi hesap alanına ait olduğunu belirler. */
export function girdiAlaniniAlgila(yol: string): HesapAlani {
  return metindenAlanOku(readFileSync(yol, 'utf8'));
}

/** Girdi dosyasını okur; banka yazısı tablosu gibi göreli yolları dosyanın dizinine göre çözer. */
export function girdiOku(yol: string): { girdi: Girdi; metin: string; ozet: string } {
  const metin = readFileSync(yol, 'utf8');
  const girdi = girdiMetindenCoz(metin);
  const mevduat = girdi.tablolar?.mevduatFaizi;
  if (mevduat && mevduat !== 'kamu') girdi.tablolar!.mevduatFaizi = resolve(dirname(yol), mevduat);
  return { girdi, metin, ozet: createHash('sha256').update(metin).digest('hex') };
}

/** İcra kapak hesabı girdi dosyasını okur. */
export function icraGirdiOku(yol: string): { girdi: IcraGirdisi; metin: string; ozet: string } {
  const metin = readFileSync(yol, 'utf8');
  const girdi = icraGirdiMetindenCoz(metin);
  return { girdi, metin, ozet: createHash('sha256').update(metin).digest('hex') };
}

/** AAÜT vekalet ücreti girdi dosyasını okur ve doğrular. */
export function aautGirdiOku(yol: string): { girdi: AautGirdisi; metin: string; ozet: string } {
  const metin = readFileSync(yol, 'utf8');
  const girdi = aautGirdiMetindenCoz(metin);
  return { girdi, metin, ozet: createHash('sha256').update(metin).digest('hex') };
}

/** Mal rejimi tasfiyesi girdi dosyasını okur ve doğrular. */
export function aileGirdiOku(yol: string): { girdi: AileGirdi; metin: string; ozet: string } {
  const metin = readFileSync(yol, 'utf8');
  const girdi = aileGirdiMetindenCoz(metin);
  return { girdi, metin, ozet: createHash('sha256').update(metin).digest('hex') };
}

export type OkunanGirdi =
  | { alan: 'iscilik'; girdi: Girdi; metin: string; ozet: string }
  | { alan: 'icra'; girdi: IcraGirdisi; metin: string; ozet: string }
  | { alan: 'aaut'; girdi: AautGirdisi; metin: string; ozet: string }
  | { alan: 'aile'; girdi: AileGirdi; metin: string; ozet: string };

/** Üst düzey `alan` değerine göre girdi dosyasını otomatik algılar. */
export function herhangiGirdiOku(yol: string): OkunanGirdi {
  const metin = readFileSync(yol, 'utf8');
  const alan = metindenAlanOku(metin);
  if (alan === 'icra') {
    return { alan: 'icra', ...icraGirdiOku(yol) };
  }
  if (alan === 'aaut') {
    return { alan: 'aaut', ...aautGirdiOku(yol) };
  }
  if (alan === 'aile') {
    return { alan: 'aile', ...aileGirdiOku(yol) };
  }
  return { alan: 'iscilik', ...girdiOku(yol) };
}
