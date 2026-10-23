import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { girdiCoz, girdiMetindenCoz } from '../../src/index.ts';
import { alanDegistir, bosForm, degerOku, formdanGirdiKur, formYamli, formuDogrula, hataYolu, yamlForma } from '../src/form-model.ts';
import type { Nesne } from '../src/form-model.ts';
import { alanAdi, KALEMLER, kalemYeni } from '../src/schema.ts';
const ornek = readFileSync(new URL('../../ornekler/ornek-iscilik.yaml', import.meta.url), 'utf8');

test('örnek YAML formdan kayıpsız geçer ve çekirdekte aynı girdiyi üretir', () => {
  const form = yamlForma(ornek);
  assert.deepEqual(formuDogrula(form), girdiMetindenCoz(ornek));
  assert.deepEqual(girdiMetindenCoz(formYamli(form)), girdiMetindenCoz(ornek));
  assert.equal((form.parametreler as Nesne).gunlukBolen, undefined);
});
test('boş form ve yeni kalemler zorunlu hukuki tercihlere değer atamaz', () => {
  const bos = bosForm();
  assert.equal(degerOku(bos, ['parametreler', 'vergi', 'yontem']), '');
  for (const k of KALEMLER) {
    const form = alanDegistir(yamlForma(ornek), ['kalemler'], { [k.key]: kalemYeni(k.key) });
    assert.throws(() => formuDogrula(form));
    if (['kidem', 'ihbar'].includes(k.key)) assert.equal(degerOku(form, ['kalemler', k.key, 'hakVar']), '');
    if (['fazlaCalisma', 'haftaTatili', 'ubgt'].includes(k.key)) assert.equal(degerOku(form, ['kalemler', k.key, 'takdiriIndirim', 'oran']), '');
  }
});
test('sıfır ve false korunur, isteğe bağlı alan silinir ve kopyalar bağımsızdır', () => {
  const kaynak = yamlForma(ornek);
  const kopya = alanDegistir(kaynak, ['kalemler', 'kidem', 'hakVar'], false);
  const yeni = alanDegistir(kopya, ['kalemler', 'fazlaCalisma', 'takdiriIndirim', 'oran'], '0');
  assert.equal(degerOku(yeni, ['kalemler', 'kidem', 'hakVar']), false);
  assert.equal(degerOku(kaynak, ['kalemler', 'kidem', 'hakVar']), true);
  assert.equal(formuDogrula(yeni).kalemler.fazlaCalisma!.takdiriIndirim.oran.toString(), '0');
  assert.equal(degerOku(alanDegistir(yeni, ['dosya', 'kisaAd'], undefined), ['dosya', 'kisaAd']), undefined);
  assert.equal(degerOku(kaynak, ['dosya', 'kisaAd']), 'ornek-is');
  assert.deepEqual(formdanGirdiKur({ a: undefined, b: false, c: 0 }), { b: false, c: 0 });
});
test('dönem ve satır düzenleme kaynak girdiyi değiştirmez', () => {
  const kaynak = yamlForma(ornek);
  const yeni = alanDegistir(kaynak, ['hizmet', 'donemler', 0, 'giris'], '2022-01-01');
  assert.equal(degerOku(yeni, ['hizmet', 'donemler', 0, 'giris']), '2022-01-01');
  assert.equal(degerOku(kaynak, ['hizmet', 'donemler', 0, 'giris']), '2021-03-01');
  assert.deepEqual(degerOku(alanDegistir(yeni, ['hizmet', 'donemler', 0], undefined), ['hizmet', 'donemler']), []);
});
test('çoklu hizmette ihbar dönem esası ve mahsup sırası çekirdeğe bırakılır', () => {
  const form = alanDegistir(yamlForma(ornek), ['hizmet', 'donemler'], [{ giris: '2021-03-01', cikis: '2022-12-31' }, { giris: '2023-02-01', cikis: '2026-06-30' }]);
  assert.throws(() => girdiCoz(form), /donemEsasi/);
  assert.equal(hataYolu('İhbar: parametreler.indirimMahsupSirasi yazılmalı'), 'girdi.parametreler.indirimMahsupSirasi');
  assert.equal(hataYolu('girdi.kalemler.ubgt.gunler[2].tarih: tarih bekleniyor'), 'girdi.kalemler.ubgt.gunler[2].tarih');
});

test('hata yolundan formdaki alan adı bulunur', () => {
  assert.equal(alanAdi('girdi.dosya.mahkeme'), 'Mahkeme');
  assert.equal(alanAdi('girdi.kalemler.ihbar.faiz[0].baslangic'), 'Faiz başlangıcı');
  assert.equal(alanAdi('girdi.kalemler.fazlaCalisma.takdiriIndirim'), 'Takdiri indirim');
  assert.equal(alanAdi('girdi.hizmet.donemler[1].cikis'), 'İşten çıkış');
});
