// Raporun hangi kod ve tabloyla üretildiğini sonradan ispatlamak için sürüm bilgisi.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..');

export interface Surum {
  surum: string;
  commit: string | null;
  degisiklikVar: boolean;
}

function git(...arg: string[]): string | null {
  try {
    return execFileSync('git', ['-C', KOK, ...arg], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

export function surumBilgisi(): Surum {
  const paket = JSON.parse(readFileSync(join(KOK, 'package.json'), 'utf8')) as { version: string };
  const commit = git('rev-parse', '--short=12', 'HEAD');
  const durum = git('status', '--porcelain', '--', 'src', 'data', 'bin', 'package.json');
  return { surum: paket.version, commit, degisiklikVar: durum === null || durum.length > 0 };
}

export function surumYaz(s: Surum): string {
  const commit = s.commit ? `commit ${s.commit}` : 'commit yok';
  return `mizan ${s.surum} (${commit}${s.degisiklikVar ? ', commit edilmemiş değişiklik var' : ''})`;
}
