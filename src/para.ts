// Para ve oran işlemleri. Ara hesaplar tam duyarlıkla yürür; yuvarlama yalnız
// kalem sonucunda ve kesintilerde, kuruşa (2 hane, yarım yukarı) yapılır.
import { Decimal } from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };

export function d(deger: Decimal.Value): Decimal {
  return new Decimal(deger);
}

export function kurus(tutar: Decimal): Decimal {
  return tutar.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

export function topla(liste: Decimal[]): Decimal {
  return liste.reduce((a, b) => a.plus(b), d(0));
}

/** 1234567.891 → "1.234.567,89" */
export function tl(tutar: Decimal, hane = 2): string {
  const sabit = tutar.toFixed(hane, Decimal.ROUND_HALF_UP);
  const [tam, kesir] = sabit.split('.');
  const isaret = tam!.startsWith('-') ? '-' : '';
  const rakam = tam!.replace('-', '');
  const gruplu = rakam.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return isaret + gruplu + (kesir ? ',' + kesir : '');
}

/** 0.15 → "%15", 0.00759 → "%0,759" */
export function yuzde(oran: Decimal): string {
  const y = oran.times(100);
  const metin = y.toDecimalPlaces(4).toString().replace('.', ',');
  return '%' + metin;
}

/** Gösterim için en fazla `hane` ondalık, Türkçe ayraçla. */
export function sayi(deger: Decimal, hane = 4): string {
  const k = deger.toDecimalPlaces(hane);
  return tl(k, Math.max(0, k.decimalPlaces()));
}
