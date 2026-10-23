import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Surum } from '../surum.ts';

const KOK = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

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
