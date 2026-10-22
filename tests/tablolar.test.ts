import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DonemselTablo, KaynakKaydi, type OranSatiri, type TabloDosyasi } from '../src/tablolar.ts';
import { d } from '../src/para.ts';
import { testTablolari } from './yardimci.ts';

const kaynak = { ad: 'test', url: 'https://example.invalid', dogrulama: 'test' };

function oranTablosu(satirlar: Partial<OranSatiri>[], dogrulamaTarihi = '2030-12-31') {
  const dosya = { tablo: 't', ad: 'T', dogrulamaTarihi, satirlar } as TabloDosyasi<OranSatiri>;
  return new DonemselTablo<OranSatiri>(dosya, ['oran']);
}

test('kaynaksız satır reddedilir', () => {
  assert.throws(() => oranTablosu([{ baslangic: '2020-01-01', bitis: null, oran: '0.1' }]), /kaynak/);
  assert.throws(
    () => oranTablosu([{ baslangic: '2020-01-01', bitis: null, oran: '0.1', kaynak: { ad: 'x', dogrulama: 'y' } }]),
    /url ya da kaynak.belge/,
  );
});

test('boşluklu ya da çakışan satırlar reddedilir', () => {
  assert.throws(
    () =>
      oranTablosu([
        { baslangic: '2020-01-01', bitis: '2020-06-30', oran: '0.1', kaynak },
        { baslangic: '2020-07-02', bitis: null, oran: '0.2', kaynak },
      ]),
    /boşluk ya da çakışma/,
  );
});

test('açık uçlu satır doğrulama tarihinden sonra uyarıyla, bitişli satırdan sonrası hiç kullanılmaz', () => {
  const t = oranTablosu([{ baslangic: '2020-01-01', bitis: null, oran: '0.1', kaynak }], '2021-12-31');
  const kayit = new KaynakKaydi();
  assert.equal(t.bul('2021-12-31', kayit).oran, '0.1');
  assert.equal(kayit.uyarilar.size, 0);
  assert.equal(t.bul('2022-01-01', kayit).oran, '0.1');
  assert.match([...kayit.uyarilar][0]!, /doğrulandı/);
  assert.throws(() => t.bul('2019-12-31'), /başlıyor/);

  const bitisli = oranTablosu([{ baslangic: '2020-01-01', bitis: '2020-12-31', oran: '0.1', kaynak }]);
  assert.throws(() => bitisli.bul('2021-01-01'), /bitiyor/);
});

test('kesitler tablo sınırlarında bölünür ve kaynak kaydına girer', () => {
  const t = testTablolari();
  const kayit = new KaynakKaydi();
  const k = t.mevduatFaizi.kesitler('2021-03-16', '2021-12-31', kayit);
  assert.deepEqual(
    k.map((x) => [x.baslangic, x.bitis, x.satir.oran]),
    [
      ['2021-03-16', '2021-03-31', '0.20'],
      ['2021-04-01', '2021-12-31', '0.30'],
    ],
  );
  assert.equal(kayit.liste().length, 2);
});

test('gelir vergisi kümülatif matrahla dilimlere bölünür', () => {
  const gv = testTablolari().gelirVergisi;
  // V(20000) - V(5000) = (10000×0,15 + 10000×0,20) - 750
  assert.equal(gv.vergi(2021, d(15000), d(5000)).toString(), '2750');
  assert.equal(gv.vergi(2021, d(60000), d(0)).toString(), '12200');
  assert.throws(() => gv.vergi(2019, d(1), d(0)), /2019/);
});
