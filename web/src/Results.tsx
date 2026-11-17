import {
  ICRA_FAIZ_TURU_ADLARI,
  ICRA_KISMI_ODEME_BASLIKLARI,
  ICRA_TAKIP_TURU_ADLARI,
  icraHarcSatirlari,
  icraKismiOdemeSatirlari,
  icraOzetSatirlari,
  karsiTaraf,
  tarafAdi,
  tl,
  trTarih,
  yuzde,
} from '../../src/index.ts';
import type {
  AautHesapSonucu,
  AautTarafHesabi,
  AileHesapSonucu,
  HesapSonucu,
  IcraHesapSonucu,
  KalemSonucu,
  Kaynak,
} from '../../src/index.ts';

export function VeriTablosu({ basliklar, satirlar, toplam, aciklama }: { basliklar: string[]; satirlar: string[][]; toplam?: string[]; aciklama?: string }) {
  return <div class="tablo-kaydir" tabIndex={0} role="region" aria-label={aciklama ?? basliklar.join(', ')}><table>
    <thead><tr>{basliklar.map((b, i) => <th key={i} scope="col">{b}</th>)}</tr></thead>
    <tbody>{satirlar.map((s, i) => <tr key={i}>{s.map((h, j) => j === 0 ? <th scope="row" key={j}>{h}</th> : <td key={j}>{h}</td>)}</tr>)}</tbody>
    {toplam && <tfoot><tr>{toplam.map((t, i) => <td key={i}>{t}</td>)}</tr></tfoot>}
  </table></div>;
}
export function KaynakBilgisi({ kaynak: k }: { kaynak: Kaynak }) {
  return <div class="kaynak-bilgisi">
    {k.url ? <a href={k.url} target="_blank" rel="noreferrer">{k.ad} ↗</a> : <strong>{k.ad}</strong>}
    {k.belge && <p>{k.belge}</p>}
    {k.resmiGazete && <p>Resmi Gazete: {trTarih(k.resmiGazete.tarih)} / {k.resmiGazete.sayi}{k.resmiGazete.url && <> · <a href={k.resmiGazete.url} target="_blank" rel="noreferrer">Gazete bağlantısı ↗</a></>}</p>}
    <p>{k.dogrulama}</p>{k.not && <p>{k.not}</p>}
  </div>;
}
function KalemDetayi({ k }: { k: KalemSonucu }) {
  return <div class="kalem-detayi">
    <h4>Dayanak ve formül</h4><ul>{k.dayanak.map((d, i) => <li key={i}>{d}</li>)}</ul>
    {k.formul.map((f, i) => <p class="formul" key={i}>{f}</p>)}
    <dl class="bilgi-listesi">{k.bilgiler.map(([ad, deger], i) => <div key={i}><dt>{ad}</dt><dd>{deger}</dd></div>)}</dl>
    {k.detay && <VeriTablosu {...k.detay} aciklama={`${k.ad} hesap ayrıntısı`} />}
    {k.ekDetaylar?.map((e, i) => <div key={i}><h4>{e.baslik}</h4><VeriTablosu {...e.tablo} aciklama={e.baslik} /></div>)}
    <h4>Brütten nete</h4><VeriTablosu basliklar={['İşlem', 'Matrah / oran', 'Tutar (TL)']} satirlar={[
      ['İndirim ve mahsup öncesi brüt', '', tl(k.hamBrut)],
      ...(k.indirim ? [[`İndirim: ${k.indirim.gerekce}`, yuzde(k.indirim.oran), `-${tl(k.indirim.tutar)}`]] : []),
      ...(k.mahsup ? [[`Mahsup: ${k.mahsup.aciklama}`, '', `-${tl(k.mahsup.tutar)}`]] : []),
      ['Brüt alacak', '', tl(k.brut)],
      ...k.kesintiler.map(s => [`${s.ad} (${s.dayanak})`, `${tl(s.matrah)} / ${s.oran}`, tl(s.tutar)]),
    ]} toplam={['Net alacak', '', tl(k.net)]} />
    {k.faizler.map((f, i) => <section key={i}><h4>{f.tur === 'mevduat' ? 'Mevduat faizi' : 'Yasal faiz'}: {tl(f.toplam)} TL</h4>
      <p>{trTarih(f.baslangic)} - {trTarih(f.bitis)}, matrah {tl(f.matrah)} TL. Gerekçe: {f.gerekce}</p>
      <p class="soluk">{f.tabloAdi}</p>
      <VeriTablosu basliklar={['Dönem', 'Gün', 'Oran tarihi', 'Yıllık oran', 'Faiz (TL)']} satirlar={f.kesitler.map(x => [`${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`, String(x.gun), x.oranTarihi ? trTarih(x.oranTarihi) : '', yuzde(x.oran), tl(x.tutar)])} toplam={['Toplam', '', '', '', tl(f.toplam)]} />
      {!f.kesitler.length && <p>Bu satırda faiz işlememiştir.</p>}
    </section>)}
    {k.notlar.length > 0 && <div class="not"><h4>Notlar</h4><ul>{k.notlar.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
  </div>;
}

export function Sonuclar({ sonuc: s, tam = false }: { sonuc: HesapSonucu; tam?: boolean }) {
  return <>
    <div class="toplamlar"><div><span>Brüt alacak</span><strong>{tl(s.toplam.brut)} <small>TL</small></strong></div>
      <div class="ana-toplam"><span>Net alacak</span><strong>{tl(s.toplam.net)} <small>TL</small></strong></div>
      <div><span>İşlemiş faiz</span><strong>{tl(s.toplam.faiz)} <small>TL</small></strong></div></div>
    <div class="kalem-listesi">{s.kalemler.map(k => <details key={k.kod} class="sonuc-kalemi" open={tam || undefined}>
      <summary><span class="kalem-adi">{k.ad}</span><span class="kalem-net">{tl(k.net)} <small>TL net</small></span><span class="ac-isareti" aria-hidden="true">+</span>
        <span class="kalem-ozeti"><span>Brüt <b>{tl(k.brut)}</b></span>
          {k.kesintiler.map((s, i) => <span key={`kesinti-${i}`}>{s.ad} <b>{tl(s.tutar)}</b></span>)}
          {!k.kesintiler.length && <span>Kesinti yok</span>}
          {k.faizler.map((f, i) => <span key={`faiz-${i}`}>{f.tur === 'mevduat' ? 'Mevduat faizi' : 'Yasal faiz'}{k.faizler.length > 1 ? ` (${i + 1}. satır)` : ''} <b>{tl(f.toplam)}</b></span>)}
          {!k.faizler.length && <span>Faiz yok</span>}
        </span>
      </summary>
      <KalemDetayi k={k} />
    </details>)}</div>
    <details class="rapor-bolumu" open={tam || undefined}><summary>Hukuki tercihler <span>{s.parametreler.length} esas</span></summary>
      <VeriTablosu basliklar={['Tercih', 'Değer', 'Kaynak', 'Dayanak']} satirlar={s.parametreler.map(p => [p.ad, p.deger, p.kaynak, p.dayanak])} />
    </details>
    <details class="rapor-bolumu"><summary>Kullanılan kaynaklar <span>{s.kaynaklar.length} satır</span></summary>{s.kaynaklar.map((k, i) => <section class="kaynak-satiri" key={i}><h4>{k.tablo} · {k.aralik}</h4><p>{k.deger}</p><KaynakBilgisi kaynak={k.kaynak} /></section>)}</details>
    <details class="rapor-bolumu" open={s.uyarilar.length > 0}><summary>Uyarılar <span>{s.uyarilar.length}</span></summary>{s.uyarilar.length ? <ul>{s.uyarilar.map((u, i) => <li key={i}>{u}</li>)}</ul> : <p>Bu hesap için tablo uyarısı yok.</p>}</details>
  </>;
}

function AautTarafDetayi({ t }: { t: AautTarafHesabi }) {
  return <div class="kalem-detayi">
    <h4>Dayanak ve formül</h4>
    <ul>{t.dayanak.map((d, i) => <li key={i}>{d}</li>)}</ul>
    {t.formul.map((f, i) => <p class="formul" key={i}>{f}</p>)}
    <dl class="bilgi-listesi">
      <div><dt>Esas tutar</dt><dd>{tl(t.esasTutar)} TL</dd></div>
      <div><dt>Merci maktu ücreti</dt><dd>{tl(t.maktuUcret)} TL</dd></div>
      {!t.hamNispiUcret.isZero() && <div><dt>Kademeli nispi toplam</dt><dd>{tl(t.hamNispiUcret)} TL</dd></div>}
      {!t.asamaCarpani.eq(1) && <div><dt>Aşama çarpanı</dt><dd>{yuzde(t.asamaCarpani)}</dd></div>}
      <div><dt>Hükmedilecek ücret</dt><dd>{tl(t.hukmedilenUcret)} TL</dd></div>
    </dl>
    {t.dilimler.length > 0 && <>
      <h4>Üçüncü Kısım kademeli dilim tablosu</h4>
      <VeriTablosu
        basliklar={['Dilim', 'Tarife kademesi', 'Oran', 'Dilim matrahı (TL)', 'Dilim ücreti (TL)']}
        satirlar={t.dilimler.map(dl => [String(dl.sira), dl.aciklama, yuzde(dl.oran), tl(dl.matrah), tl(dl.tutar)])}
        toplam={['Toplam', '', '', tl(t.esasTutar), tl(t.hamNispiUcret)]}
        aciklama={`${t.baslik} dilim hesabı`}
      />
    </>}
    {t.notlar.length > 0 && <div class="not"><h4>Notlar</h4><ul>{t.notlar.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
  </div>;
}

export function AautSonuclar({ sonuc: s, tam = false }: { sonuc: AautHesapSonucu; tam?: boolean }) {
  const u = s.girdi.uyusmazlik;
  const taraflar: AautTarafHesabi[] = [];
  if (!s.davaci.hukmedilenUcret.isZero() || u.kabulTutari.gt(0) || (u.tur === 'maktu' && u.maktuSonuc === 'kabul')) {
    taraflar.push(s.davaci);
  }
  if (!s.davali.hukmedilenUcret.isZero() || u.retTutari.gt(0) || (u.tur === 'maktu' && u.maktuSonuc === 'ret')) {
    taraflar.push(s.davali);
  }

  return <>
    <div class="toplamlar">
      <div class="ana-toplam"><span>Davacı / alacaklı lehine</span><strong>{tl(s.davaci.hukmedilenUcret)} <small>TL</small></strong></div>
      <div><span>Davalı karşı vekalet</span><strong>{tl(s.davali.hukmedilenUcret)} <small>TL</small></strong></div>
      <div><span>Merci maktu alt sınırı</span><strong>{tl(s.maktuUcret)} <small>TL</small></strong></div>
    </div>
    <p class="soluk sonuc-aciklama">{s.tarifeDonemi} AAÜT · {s.merciAdi} (maktu alt sınır {tl(s.maktuUcret)} TL).</p>
    <div class="kalem-listesi">
      {taraflar.map(t => <details key={t.taraf} class="sonuc-kalemi" open={tam || true}>
        <summary>
          <span class="kalem-adi">{t.baslik}</span>
          <span class="kalem-net">{tl(t.hukmedilenUcret)} <small>TL</small></span>
          <span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti">
            <span>Esas tutar <b>{tl(t.esasTutar)}</b></span>
            {!t.hamNispiUcret.isZero() && <span>Kademeli nispi <b>{tl(t.hamNispiUcret)}</b></span>}
            <span>Maktu <b>{tl(t.maktuUcret)}</b></span>
          </span>
        </summary>
        <AautTarafDetayi t={t} />
      </details>)}
    </div>
    <details class="rapor-bolumu" open={tam || undefined}><summary>Tarife esasları <span>{s.parametreler.length} esas</span></summary>
      <VeriTablosu basliklar={['Esas', 'Değer', 'Kaynak', 'Dayanak']} satirlar={s.parametreler.map(p => [p.ad, p.deger, p.kaynak, p.dayanak])} />
    </details>
    <details class="rapor-bolumu"><summary>Kullanılan kaynaklar <span>{s.kaynaklar.length} satır</span></summary>{s.kaynaklar.map((k, i) => <section class="kaynak-satiri" key={i}><h4>{k.tablo} · {k.aralik}</h4><p>{k.deger}</p><KaynakBilgisi kaynak={k.kaynak} /></section>)}</details>
    <details class="rapor-bolumu" open={s.uyarilar.length > 0}><summary>Uyarılar <span>{s.uyarilar.length}</span></summary>{s.uyarilar.length ? <ul>{s.uyarilar.map((u, i) => <li key={i}>{u}</li>)}</ul> : <p>Bu hesap için tablo uyarısı yok.</p>}</details>
  </>;
}

export function AileSonuclar({ sonuc: s, tam = false }: { sonuc: AileHesapSonucu; tam?: boolean }) {
  const davaciA = s.artikDeger.davaci;
  const davaliA = s.artikDeger.davali;
  const karsilikliFaizVar = s.toplamFaiz.davaci.gt(0) && s.toplamFaiz.davali.gt(0);
  const netFaiz = s.takas.netAlacakli === 'davali' ? s.toplamFaiz.davali : s.toplamFaiz.davaci;
  const faizGosterimi = karsilikliFaizVar ? `${tl(s.toplamFaiz.davaci)} / ${tl(s.toplamFaiz.davali)}` : tl(netFaiz);
  return <>
    <div class="toplamlar">
      <div><span>Davacı toplam alacağı</span><strong>{tl(s.takas.davaciToplamAlacak)} <small>TL</small></strong></div>
      <div class="ana-toplam"><span>{s.takas.netAlacakli !== 'denk' ? `${tarafAdi(s.takas.netAlacakli)} net bakiye` : 'Takas sonrası net bakiye'}</span><strong>{tl(s.takas.netBakiye)} <small>TL</small></strong></div>
      <div><span>{karsilikliFaizVar ? 'Davacı / Davalı faizi' : 'İşlemiş yasal faiz'}</span><strong>{faizGosterimi} <small>TL</small></strong></div>
    </div>
    <p class="soluk sonuc-aciklama">Taraflar yalnız davacı ve davalı olarak adlandırılır (TMK m.202-241).</p>
    <div class="kalem-listesi">
      <details class="sonuc-kalemi" open={tam || undefined}>
        <summary><span class="kalem-adi">Mal mal oranlama ve değer artış payı</span><span class="kalem-net">{s.mallar.length} <small>mal</small></span><span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti">
            <span>Davacı DAP <b>{tl(s.takas.davaciDegerArtisPayi)}</b></span>
            <span>Davalı DAP <b>{tl(s.takas.davaliDegerArtisPayi)}</b></span>
          </span>
        </summary>
        <div class="kalem-detayi">
          {s.mallar.map((m, i) => <section key={i}>
            <h4>{i + 1}. {m.ad} ({tarafAdi(m.malik)}, {m.nitelik === 'edinilmis' ? 'Edinilmiş mal' : 'Kişisel mal'})</h4>
            <dl class="bilgi-listesi">
              <div><dt>Edinme değeri</dt><dd>{tl(m.edinmeDegeri)} TL</dd></div>
              <div><dt>Tasfiye (sürüm) değeri</dt><dd>{tl(m.tasfiyeDegeri)} TL</dd></div>
              <div><dt>Diğer eşin ({tarafAdi(karsiTaraf(m.malik))}) DAP alacağı</dt><dd>{tl(m.toplamDigerEsDap)} TL</dd></div>
              <div><dt>Mala ilişkin borç ve kişisel kayma</dt><dd>{tl(m.toplamMalaIliskinBorcVeKisiselKayma)} TL</dd></div>
              <div><dt>Artık değere geçen net edinilmiş değer</dt><dd>{tl(m.edinilmisNetDeger)} TL</dd></div>
            </dl>
            {m.digerEsKatkilari.length > 0 && <VeriTablosu
              basliklar={['Diğer eş katkısı (TMK m.227)', 'Katkı tutarı (TL)', 'Katkı oranı', 'Sürüm karşılığı (TL)', 'Taban kuralı', 'DAP alacağı (TL)']}
              satirlar={m.digerEsKatkilari.map(k => [
                k.aciklama,
                tl(k.katkiTutari),
                yuzde(k.katkiOrani),
                tl(k.surumKarsiligi),
                k.degerKaybiUygulandi ? 'Başlangıç değeri (TMK m.227/1 c.son)' : 'Sürüm oranı (TMK m.227/1)',
                tl(k.alacak),
              ])}
              toplam={['Toplam değer artış payı', '', '', '', '', tl(m.toplamDigerEsDap)]}
            />}
            {m.notlar.length > 0 && <div class="not"><ul>{m.notlar.map((n, j) => <li key={j}>{n}</li>)}</ul></div>}
          </section>)}
        </div>
      </details>

      {(s.eklenecekDegerler.length > 0 || s.denklestirmeler.length > 0) && <details class="sonuc-kalemi" open={tam || undefined}>
        <summary><span class="kalem-adi">Eklenecek değerler ve denkleştirme</span><span class="kalem-net">{s.eklenecekDegerler.length + s.denklestirmeler.length} <small>kalem</small></span><span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti"><span>TMK m.229 ve m.230</span></span>
        </summary>
        <div class="kalem-detayi">
          {s.eklenecekDegerler.length > 0 && <>
            <h4>Eklenecek değerler (TMK m.229)</h4>
            <VeriTablosu
              basliklar={['İşlemi yapan eş', 'Tür', 'Açıklama', 'Devir tarihi', 'Eklenecek değer (TL)']}
              satirlar={s.eklenecekDegerler.map(e => [
                tarafAdi(e.es),
                e.tur === 'son-bir-yil-bagis' ? 'Son 1 yılda rızasız kazandırma (m.229/1-1)' : 'Katılma alacağını azaltma kastı (m.229/1-2)',
                e.aciklama,
                e.devirTarihi ? trTarih(e.devirTarihi) : '-',
                tl(e.tutar),
              ])}
            />
          </>}
          {s.denklestirmeler.length > 0 && <>
            <h4>Denkleştirme kalemleri (TMK m.230)</h4>
            <VeriTablosu
              basliklar={['İlgili eş', 'Yön', 'Açıklama', 'Yöntem', 'Tutar (TL)']}
              satirlar={s.denklestirmeler.map(dk => [
                tarafAdi(dk.es),
                dk.yon === 'edinilmisten-kisisele' ? 'Edinilmişten kişisel mala (+)' : 'Kişiselden edinilmiş mala (-)',
                dk.aciklama,
                dk.yontem === 'sabit' ? 'Sabit borç ödemesi (m.230/1)' : `Oranlı katkı (${yuzde(dk.katkiOrani!)}, m.230/3)`,
                tl(dk.tutar),
              ])}
            />
          </>}
        </div>
      </details>}

      <details class="sonuc-kalemi" open={tam || undefined}>
        <summary><span class="kalem-adi">Artık değer tablosu (TMK m.231)</span><span class="kalem-net">{tl(davaciA.artikDeger.plus(davaliA.artikDeger))} <small>TL toplam</small></span><span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti">
            <span>Davacı artık değer <b>{tl(davaciA.artikDeger)}</b></span>
            <span>Davalı artık değer <b>{tl(davaliA.artikDeger)}</b></span>
          </span>
        </summary>
        <div class="kalem-detayi">
          <VeriTablosu
            basliklar={['Artık değer bileşeni', 'Davacı eş (TL)', 'Davalı eş (TL)', 'Yasal dayanak']}
            satirlar={[
              ['(+) Edinilmiş malların tasfiye değeri', tl(davaciA.edinilmisMallarDegeri), tl(davaliA.edinilmisMallarDegeri), 'TMK m.219, m.228, m.235/1'],
              ['(+) Eklenecek değerler', tl(davaciA.eklenecekDegerler), tl(davaliA.eklenecekDegerler), 'TMK m.229, m.235/2'],
              ['(+) Denkleştirme alacağı (edinilmişten kişisele)', tl(davaciA.denklestirmeAlacagi), tl(davaliA.denklestirmeAlacagi), 'TMK m.230/1, m.230/3'],
              ['(-) Edinilmiş mallara ilişkin borçlar ve kişisel kayma', `-${tl(davaciA.edinilmisMalBorclari)}`, `-${tl(davaliA.edinilmisMalBorclari)}`, 'TMK m.230/2, m.231/1'],
              ['(-) Edinilmiş mallardan diğer eşe DAP borcu', `-${tl(davaciA.digerEsDegerArtisPayi)}`, `-${tl(davaliA.digerEsDegerArtisPayi)}`, 'TMK m.227, m.231/1'],
              ['(=) Ham bakiye', tl(davaciA.hamArtikDeger), tl(davaliA.hamArtikDeger), 'TMK m.231/1'],
            ]}
            toplam={['Artık değer (TMK m.231/2 eksi bakiye = 0)', tl(davaciA.artikDeger), tl(davaliA.artikDeger), 'TMK m.231/2']}
          />
        </div>
      </details>

      <details class="sonuc-kalemi" open={tam || undefined}>
        <summary><span class="kalem-adi">Katılma alacağı ve takas (TMK m.236)</span><span class="kalem-net">{tl(s.takas.netBakiye)} <small>TL net</small></span><span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti">
            <span>Davacı KA <b>{tl(s.katilma.davaci.netKatilmaAlacagi)}</b></span>
            <span>Davalı KA <b>{tl(s.katilma.davali.netKatilmaAlacagi)}</b></span>
          </span>
        </summary>
        <div class="kalem-detayi">
          <VeriTablosu
            basliklar={['Alacaklı eş', 'Karşı eşin artık değeri (TL)', 'Baz oran', 'Ham katılma alacağı (TL)', 'Hakkaniyet indirimi (TMK m.236/2)', 'Net katılma alacağı (TL)']}
            satirlar={(['davaci', 'davali'] as const).map(t => {
              const ka = s.katilma[t];
              return [
                tarafAdi(t),
                tl(ka.karsiArtikDeger),
                yuzde(ka.bazPayOrani),
                tl(ka.hamKatilmaAlacagi),
                ka.hakkaniyetIndirimi ? `-${tl(ka.hakkaniyetIndirimi.indirimTutari)} (${ka.hakkaniyetIndirimi.neden === 'zina' ? 'Zina' : 'Hayata kast'})` : 'Yok',
                tl(ka.netKatilmaAlacagi),
              ];
            })}
          />
          <h4>Takas ve net bakiye (TMK m.236/1 c.2)</h4>
          <VeriTablosu
            basliklar={['Kalem', 'Davacı alacağı (TL)', 'Davalı alacağı (TL)', 'Takas sonrası net sonuç']}
            satirlar={[
              ['Değer artış payı alacağı (TMK m.227)', tl(s.takas.davaciDegerArtisPayi), tl(s.takas.davaliDegerArtisPayi), ''],
              ['Katılma alacağı (TMK m.236)', tl(s.takas.davaciKatilma), tl(s.takas.davaliKatilma), `Takas sonrası KA: Davacı ${tl(s.takas.davaciNetKatilma)} TL / Davalı ${tl(s.takas.davaliNetKatilma)} TL`],
            ]}
            toplam={[
              'Toplam / takas sonrası net bakiye',
              tl(s.takas.davaciToplamAlacak),
              tl(s.takas.davaliToplamAlacak),
              s.takas.netAlacakli !== 'denk' ? `${tarafAdi(s.takas.netAlacakli)} lehine ${tl(s.takas.netBakiye)} TL` : '0,00 TL (denk)',
            ]}
          />
        </div>
      </details>

      {s.alacakKalemleri.some(k => k.faiz) && <details class="sonuc-kalemi" open={tam || undefined}>
        <summary><span class="kalem-adi">Yasal faiz hesabı (TMK m.239/3)</span><span class="kalem-net">{faizGosterimi} <small>TL faiz</small></span><span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti">{s.alacakKalemleri.filter(k => k.faiz).map((f, i) => <span key={i}>{f.ad} <b>{tl(f.faiz!.toplam)}</b></span>)}</span>
        </summary>
        <div class="kalem-detayi">
          {s.alacakKalemleri.filter(k => k.faiz).map((f, i) => <section key={i}>
            <h4>{f.ad} ({tarafAdi(f.alacakli)} lehine): {tl(f.faiz!.toplam)} TL</h4>
            <p>{trTarih(f.faiz!.baslangic)} - {trTarih(f.faiz!.bitis)}, matrah {tl(f.faiz!.matrah)} TL. Gerekçe: {f.faiz!.gerekce}</p>
            <p class="soluk">{f.faiz!.tabloAdi}</p>
            {f.faiz!.kesitler.length > 0 ? <VeriTablosu
              basliklar={['Dönem', 'Gün', 'Oran tarihi', 'Yıllık oran', 'Faiz (TL)']}
              satirlar={f.faiz!.kesitler.map(x => [`${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`, String(x.gun), x.oranTarihi ? trTarih(x.oranTarihi) : '', yuzde(x.oran), tl(x.tutar)])}
              toplam={['Toplam', '', '', '', tl(f.faiz!.toplam)]}
            /> : <p>Tasfiye tarihi ile faiz bitiş tarihi aynı olduğundan işlemiş faiz 0,00 TL'dir.</p>}
          </section>)}
        </div>
      </details>}
    </div>
    {s.notlar.length > 0 && <details class="rapor-bolumu" open><summary>Hesap notları <span>{s.notlar.length}</span></summary><ul>{s.notlar.map((n, i) => <li key={i}>{n}</li>)}</ul></details>}
    <details class="rapor-bolumu" open={tam || undefined}><summary>Hukuki tercihler <span>{s.parametreler.length} esas</span></summary>
      <VeriTablosu basliklar={['Tercih', 'Değer', 'Kaynak', 'Dayanak']} satirlar={s.parametreler.map(p => [p.ad, p.deger, p.kaynak, p.dayanak])} />
    </details>
    <details class="rapor-bolumu"><summary>Kullanılan kaynaklar <span>{s.kaynaklar.length} satır</span></summary>{s.kaynaklar.map((k, i) => <section class="kaynak-satiri" key={i}><h4>{k.tablo} · {k.aralik}</h4><p>{k.deger}</p><KaynakBilgisi kaynak={k.kaynak} /></section>)}</details>
    <details class="rapor-bolumu" open={s.uyarilar.length > 0}><summary>Uyarılar <span>{s.uyarilar.length}</span></summary>{s.uyarilar.length ? <ul>{s.uyarilar.map((u, i) => <li key={i}>{u}</li>)}</ul> : <p>Bu hesap için tablo uyarısı yok.</p>}</details>
  </>;
}

export function IcraSonuclar({ sonuc: s, tam = false }: { sonuc: IcraHesapSonucu; tam?: boolean }) {
  const h = s.harclar;
  const ozetSatirlari = icraOzetSatirlari(s);
  const harcSatirlari = icraHarcSatirlari(s);
  const kismiOdemeSatirlari = icraKismiOdemeSatirlari(s);

  return <>
    <div class="toplamlar">
      <div><span>Takip çıkışı toplamı</span><strong>{tl(s.takipCikisToplami)} <small>TL</small></strong></div>
      <div class="ana-toplam"><span>Borçlunun ödeyeceği kapak tutarı</span><strong>{tl(s.borclununOdeyecegiKapakTutari)} <small>TL</small></strong></div>
      <div><span>Alacaklıya net ödenecek tutar</span><strong>{tl(s.alacakliyaNetOdenecekTutar)} <small>TL</small></strong></div>
    </div>
    <p class="soluk sonuc-aciklama">
      {ICRA_TAKIP_TURU_ADLARI[s.takipTuru]} · Takip sonrası faiz {tl(s.toplamTakipSonrasiFaiz)} TL. 2548 s.K. m.1 gereği %2 cezaevi yapı harcı borçluya yüklenmez.
    </p>
    <div class="kalem-listesi">
      <details class="sonuc-kalemi" open={tam || true}>
        <summary>
          <span class="kalem-adi">Kapak hesabı ve harçlar özeti</span>
          <span class="kalem-net">{tl(s.borclununOdeyecegiKapakTutari)} <small>TL kapak</small></span>
          <span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti">
            <span>Asıl <b>{tl(s.asilAlacak)}</b></span>
            <span>Bakiye tahsil harcı <b>{tl(h.bakiyeTahsilHarci)}</b></span>
            <span>Faiz <b>{tl(s.toplamTakipSonrasiFaiz)}</b></span>
            {!s.toplamKismiOdeme.isZero() && <span>Kısmi ödeme <b>-{tl(s.toplamKismiOdeme)}</b></span>}
          </span>
        </summary>
        <div class="kalem-detayi">
          <VeriTablosu
            basliklar={['Kalem', 'Dayanak / Açıklama', 'Tutar (TL)']}
            satirlar={ozetSatirlari}
            aciklama="İcra kapak hesabı özeti"
          />
        </div>
      </details>

      <details class="sonuc-kalemi" open={tam || undefined}>
        <summary>
          <span class="kalem-adi">Harç hesabı (492 s.K. ve 2548 s.K.)</span>
          <span class="kalem-net">{tl(h.bakiyeTahsilHarci)} <small>TL bakiye tahsil</small></span>
          <span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti">
            <span>Hesaplanan tahsil <b>{tl(h.hesaplananTahsilHarci)}</b></span>
            {h.odemelerdenKesilenTahsilHarci.gt(0) && <span>Kesilen tahsil <b>{tl(h.odemelerdenKesilenTahsilHarci)}</b></span>}
            <span>Bakiye cezaevi <b>{tl(h.cezaeviHarci)}</b></span>
            {h.odemelerdenKesilenCezaeviHarci.gt(0) && <span>Kesilen cezaevi <b>{tl(h.odemelerdenKesilenCezaeviHarci)}</b></span>}
          </span>
        </summary>
        <div class="kalem-detayi">
          <VeriTablosu
            basliklar={['Harç kalemi', 'Hukuki dayanak ve açıklama', 'Oran', 'Tutar (TL)']}
            satirlar={harcSatirlari}
            aciklama="Harç hesabı ve ödeme kesintileri"
          />
        </div>
      </details>

      {s.takipOncesiKalemler.length > 0 && <details class="sonuc-kalemi" open={tam || undefined}>
        <summary>
          <span class="kalem-adi">Takip öncesi kalemler (TBK m.121/3)</span>
          <span class="kalem-net">{tl(s.takipOncesiToplam)} <small>TL</small></span>
          <span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti"><span>{s.takipOncesiKalemler.length} kalem</span></span>
        </summary>
        <div class="kalem-detayi">
          <VeriTablosu
            basliklar={['Kalem', 'Açıklama', 'Tutar (TL)']}
            satirlar={s.takipOncesiKalemler.map(k => [k.ad, k.aciklama ?? '-', tl(k.tutar)])}
            toplam={['Toplam', '', tl(s.takipOncesiToplam)]}
            aciklama="Takip öncesi kalemler"
          />
        </div>
      </details>}

      {s.masraflar.length > 0 && <details class="sonuc-kalemi" open={tam || undefined}>
        <summary>
          <span class="kalem-adi">Takip masrafları (İİK m.59)</span>
          <span class="kalem-net">{tl(s.toplamMasraf)} <small>TL</small></span>
          <span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti"><span>{s.masraflar.length} masraf</span></span>
        </summary>
        <div class="kalem-detayi">
          <VeriTablosu
            basliklar={['Tarih', 'Açıklama', 'Tutar (TL)']}
            satirlar={s.masraflar.map(m => [trTarih(m.tarih), m.aciklama, tl(m.tutar)])}
            toplam={['Toplam', '', tl(s.toplamMasraf)]}
            aciklama="Takip masrafları"
          />
        </div>
      </details>}

      {s.kismiOdemeAdimlari.length > 0 && <details class="sonuc-kalemi" open={tam || undefined}>
        <summary>
          <span class="kalem-adi">TBK m.100 kısmi ödeme mahsubu ({s.kismiOdemeAdimlari.length} ödeme)</span>
          <span class="kalem-net">-{tl(s.toplamKismiOdeme)} <small>TL</small></span>
          <span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti">
            {h.odemelerdenKesilenTahsilHarci.gt(0) && <span>Harç kesintisi <b>{tl(h.odemelerdenKesilenTahsilHarci)}</b></span>}
            <span>Kalan asıl alacak <b>{tl(s.kalanAsilAlacak)}</b></span>
            <span>Kalan faiz/gider <b>{tl(s.kalanFaizVeGider)}</b></span>
          </span>
        </summary>
        <div class="kalem-detayi">
          <VeriTablosu
            basliklar={ICRA_KISMI_ODEME_BASLIKLARI}
            satirlar={kismiOdemeSatirlari}
            aciklama="TBK m.100 kısmi ödeme mahsup adımları"
          />
        </div>
      </details>}

      <details class="sonuc-kalemi" open={tam || undefined}>
        <summary>
          <span class="kalem-adi">Takip sonrası faiz kesitleri</span>
          <span class="kalem-net">{tl(s.toplamTakipSonrasiFaiz)} <small>TL</small></span>
          <span class="ac-isareti" aria-hidden="true">+</span>
          <span class="kalem-ozeti">
            <span>{ICRA_FAIZ_TURU_ADLARI[s.girdi.takip.faiz.tur]}</span>
            <span>{s.faizDonemleri.length} dönem</span>
          </span>
        </summary>
        <div class="kalem-detayi">
          {s.faizDonemleri.map((fd, i) => <section key={i}>
            <h4>{fd.aciklama} · Matrah {tl(fd.matrah)} TL</h4>
            <p class="soluk">{fd.tabloAdi} · {fd.gerekce}</p>
            {fd.kesitler.length > 0 ? <VeriTablosu
              basliklar={['Dönem', 'Gün', 'Yıllık oran', 'Faiz (TL)']}
              satirlar={fd.kesitler.map(x => [`${trTarih(x.baslangic)} - ${trTarih(x.bitis)}`, String(x.gun), yuzde(x.oran), tl(x.tutar)])}
              toplam={['Dönem toplamı', '', '', tl(fd.toplam)]}
              aciklama={fd.aciklama}
            /> : <p>Bu dönemde faiz işlememiştir.</p>}
          </section>)}
        </div>
      </details>
    </div>
    <details class="rapor-bolumu" open={tam || undefined}><summary>Hukuki dayanaklar <span>{s.dayanaklar.length} esas</span></summary>
      <ul>{s.dayanaklar.map((d, i) => <li key={i}>{d}</li>)}</ul>
    </details>
    <details class="rapor-bolumu"><summary>Kullanılan kaynaklar <span>{s.kaynaklar.length} satır</span></summary>{s.kaynaklar.map((k, i) => <section class="kaynak-satiri" key={i}><h4>{k.tablo} · {k.aralik}</h4><p>{k.deger}</p><KaynakBilgisi kaynak={k.kaynak} /></section>)}</details>
    <details class="rapor-bolumu" open={s.uyarilar.length > 0}><summary>Uyarılar <span>{s.uyarilar.length}</span></summary>{s.uyarilar.length ? <ul>{s.uyarilar.map((u, i) => <li key={i}>{u}</li>)}</ul> : <p>Bu hesap için tablo uyarısı yok.</p>}</details>
  </>;
}
