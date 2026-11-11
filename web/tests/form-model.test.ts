import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GirdiHatasi, girdiCoz, girdiMetindenCoz, hesapla, TABLO_DOSYALARI, tablolariKur } from '../../src/index.ts';
import { alanDegistir, bosForm, degerOku, formdanGirdiKur, formYamli, formuDogrula, hataAciklamasi, hataYolu, yamlForma } from '../src/form-model.ts';
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
    if (['kidem', 'ihbar', 'kotuniyet', 'bostaGecenSure', 'iseBaslatmama'].includes(k.key)) assert.equal(degerOku(form, ['kalemler', k.key, 'hakVar']), '');
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

test('formuDogrula ve hesapla GirdiHatasi alanYolu değerini doğrudan döndürür', () => {
  const yakala = (fn: () => unknown): GirdiHatasi => {
    try {
      fn();
      assert.fail('GirdiHatasi bekleniyordu');
    } catch (e) {
      assert.ok(e instanceof GirdiHatasi);
      return e;
    }
  };

  const hataliCikis = alanDegistir(yamlForma(ornek), ['hizmet', 'donemler', 0, 'cikis'], '2026-13-40');
  const eCikis = yakala(() => formuDogrula(hataliCikis));
  assert.equal(eCikis.alanYolu, 'girdi.hizmet.donemler[0].cikis');
  assert.equal(hataYolu(eCikis), 'girdi.hizmet.donemler[0].cikis');
  assert.equal(alanAdi(eCikis.alanYolu), 'İşten çıkış');

  const hataliOran = alanDegistir(yamlForma(ornek), ['kalemler', 'fazlaCalisma', 'takdiriIndirim', 'oran'], '30');
  const eOran = yakala(() => formuDogrula(hataliOran));
  assert.equal(eOran.alanYolu, 'girdi.kalemler.fazlaCalisma.takdiriIndirim.oran');
  assert.equal(hataYolu(eOran), 'girdi.kalemler.fazlaCalisma.takdiriIndirim.oran');
  assert.equal(alanAdi(eOran.alanYolu), 'İndirim oranı');

  const f = TABLO_DOSYALARI;
  const ham = (ad: string) => ({ dosya: JSON.parse(readFileSync(new URL(`../../data/${ad}`, import.meta.url), 'utf8')) });
  const tablolar = tablolariKur({
    asgariUcret: ham(f.asgariUcret),
    kidemTavani: ham(f.kidemTavani),
    sgk: ham(f.sgk),
    damga: ham(f.damga),
    yasalFaiz: ham(f.yasalFaiz),
    mevduatFaizi: ham(f.mevduatFaizi),
    gelirVergisi: ham(f.gelirVergisi),
  });

  const mahsuplu = alanDegistir(yamlForma(ornek), ['kalemler', 'fazlaCalisma', 'mahsup'], { tutar: '500', aciklama: 'bordro' });
  const eSira = yakala(() => hesapla(formuDogrula(mahsuplu), tablolar));
  assert.equal(eSira.alanYolu, 'girdi.parametreler.indirimMahsupSirasi');
  assert.equal(hataYolu(eSira), 'girdi.parametreler.indirimMahsupSirasi');
  assert.equal(alanAdi(eSira.alanYolu), 'İndirim ve mahsup sırası');

  const eskiVergiYili = alanDegistir(
    alanDegistir(yamlForma(ornek), ['parametreler', 'vergi', 'yil'], '2021'),
    ['parametreler', 'vergi', 'asgariUcretIstisnasi'],
    true,
  );
  const eIstisna = yakala(() => hesapla(formuDogrula(eskiVergiYili), tablolar));
  assert.equal(eIstisna.alanYolu, 'girdi.parametreler.vergi.asgariUcretIstisnasi');
  assert.equal(hataYolu(eIstisna), 'girdi.parametreler.vergi.asgariUcretIstisnasi');
  assert.equal(alanAdi(eIstisna.alanYolu), 'Asgari ücret vergi istisnası');

  const asiriFaiz = alanDegistir(yamlForma(ornek), ['kalemler', 'kidem', 'faiz', 0, 'tutar'], '999999');
  const eFaiz = yakala(() => hesapla(formuDogrula(asiriFaiz), tablolar));
  assert.equal(eFaiz.alanYolu, 'girdi.kalemler.kidem.faiz');
  assert.equal(hataYolu(eFaiz), 'girdi.kalemler.kidem.faiz');
  assert.equal(alanAdi(eFaiz.alanYolu), 'Faiz satırları');

  assert.equal(hataYolu(new Error('girdi.tablolar.mevduatFaizi: tablo yüklü değil')), 'girdi.tablolar.mevduatFaizi');
  assert.equal(hataYolu(new Error('Beklenmeyen hata')), 'girdi');

  const rakamliMesaj = 'girdi.kalemler.yillikIzin.eskiKanun4857Oncesi: true/false bekleniyor';
  assert.equal(hataYolu(new GirdiHatasi('girdi.kalemler.yillikIzin.eskiKanun4857Oncesi', rakamliMesaj)), 'girdi.kalemler.yillikIzin.eskiKanun4857Oncesi');
  assert.equal(hataYolu(rakamliMesaj), 'girdi.kalemler.yillikIzin.eskiKanun4857Oncesi');
  assert.equal(hataAciklamasi(rakamliMesaj), 'true/false bekleniyor');
});
