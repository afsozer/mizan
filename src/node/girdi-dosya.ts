import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { girdiMetindenCoz, type Girdi } from '../girdi.ts';
import { icraGirdiMetindenCoz, metindenAlanOku, type IcraGirdisi } from '../icra/girdi.ts';

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

export type OkunanGirdi =
  | { alan: 'iscilik'; girdi: Girdi; metin: string; ozet: string }
  | { alan: 'icra'; girdi: IcraGirdisi; metin: string; ozet: string };

/** Üst düzey `alan` değerine göre (`icra` veya varsayılan `iscilik`) girdi dosyasını otomatik algılar. */
export function herhangiGirdiOku(yol: string): OkunanGirdi {
  const metin = readFileSync(yol, 'utf8');
  const alan = metindenAlanOku(metin);
  if (alan === 'icra') {
    return { alan: 'icra', ...icraGirdiOku(yol) };
  }
  return { alan: 'iscilik', ...girdiOku(yol) };
}
