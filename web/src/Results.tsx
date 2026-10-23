import { tl, yuzde, trTarih } from '../../src/index.ts';
import type { HesapSonucu, KalemSonucu, Kaynak } from '../../src/index.ts';

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
    <p class="soluk sonuc-aciklama">Faiz ayrı gösterilir; matrahı hukuki tercihler tablosunda yer alır. Ayrıntı için kalemi açın.</p>
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
