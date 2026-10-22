import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dahilGun, gunFarki, sure, sureTopla, yilEkle, ayEkle } from '../src/tarih.ts';
import { d, tl, yuzde } from '../src/para.ts';

test('takvim süresi iki uç dahil', () => {
  assert.deepEqual(sure('2019-03-01', '2026-06-30'), { yil: 7, ay: 4, gun: 0 });
  assert.deepEqual(sure('2020-01-01', '2020-12-31'), { yil: 1, ay: 0, gun: 0 });
  assert.deepEqual(sure('2020-01-01', '2021-09-15'), { yil: 1, ay: 8, gun: 15 });
  assert.deepEqual(sure('2021-01-15', '2021-01-15'), { yil: 0, ay: 0, gun: 1 });
  assert.deepEqual(sure('2020-01-31', '2020-02-29'), { yil: 0, ay: 1, gun: 1 });
  assert.throws(() => sure('2021-01-02', '2021-01-01'));
});

test('süre toplamında 30 gün 1 ay, 12 ay 1 yıl', () => {
  assert.deepEqual(
    sureTopla([
      { yil: 1, ay: 11, gun: 20 },
      { yil: 0, ay: 2, gun: 15 },
    ]),
    { yil: 2, ay: 2, gun: 5 },
  );
});

test('gün sayıları ve ay/yıl ekleme', () => {
  assert.equal(gunFarki('2021-03-15', '2021-12-31'), 291);
  assert.equal(dahilGun('2020-12-01', '2020-12-31'), 31);
  assert.equal(yilEkle('2020-02-29', 1), '2021-02-28');
  assert.equal(ayEkle('2020-01-31', 1), '2020-02-29');
  assert.equal(ayEkle('2020-11-30', 3), '2021-02-28');
});

test('Türkçe para ve yüzde biçimi', () => {
  assert.equal(tl(d('1234567.891')), '1.234.567,89');
  assert.equal(tl(d('-5.5')), '-5,50');
  assert.equal(tl(d(0)), '0,00');
  assert.equal(yuzde(d('0.00759')), '%0,759');
  assert.equal(yuzde(d('0.15')), '%15');
});
