import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { girdiMetindenCoz, type Girdi } from '../girdi.ts';

/** Girdi dosyasını okur; banka yazısı tablosu gibi göreli yolları dosyanın dizinine göre çözer. */
export function girdiOku(yol: string): { girdi: Girdi; metin: string; ozet: string } {
  const metin = readFileSync(yol, 'utf8');
  const girdi = girdiMetindenCoz(metin);
  const mevduat = girdi.tablolar?.mevduatFaizi;
  if (mevduat && mevduat !== 'kamu') girdi.tablolar!.mevduatFaizi = resolve(dirname(yol), mevduat);
  return { girdi, metin, ozet: createHash('sha256').update(metin).digest('hex') };
}
