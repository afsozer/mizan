import { useEffect, useMemo, useState } from 'preact/hooks';
import { hesapla, defterSatiri, kanitDosyaAdi, tl, TABLO_DOSYALARI } from '../../src/index.ts';
import type { HesapSonucu } from '../../src/index.ts';
import ornekYaml from '../../ornekler/ornek-iscilik.yaml?raw';
import { Alanlar, alanId } from './Form.tsx';
import { Sonuclar } from './Results.tsx';
import { alanAdi, BOLUMLER, KALEMLER, kalemYeni } from './schema.ts';
import { alanDegistir, bosForm, degerOku, formYamli, formuDogrula, formdanGirdiKur, hataAciklamasi, hataYolu, yamlForma } from './form-model.ts';
import type { Nesne } from './form-model.ts';
import { hesapTablolari, paketTablolari, tabloHazirla } from './tables.ts';
import type { TabloBelgesi } from './tables.ts';
import { indir, pdfIndir, surum, uretimTarihi } from './exports.ts';
import { TablolarEkrani } from './TablesView.tsx';

interface Ihtimal { id: number; ad: string; form: Nesne; dokunuldu?: boolean }
interface Degerlendirme { sonuc: HesapSonucu | null; hata: { yol: string; mesaj: string } | null }
const HATA = (e: unknown) => e instanceof Error ? e.message : String(e);
function degerlendir(form: Nesne, belgeler: TabloBelgesi[]): Degerlendirme {
  try {
    const girdi = formuDogrula(form);
    if (!belgeler.length) return { sonuc: null, hata: null };
    return { sonuc: hesapla(girdi, hesapTablolari(belgeler, girdi.tablolar?.mevduatFaizi)), hata: null };
  } catch (e) {
    const mesaj = HATA(e);
    return { sonuc: null, hata: { yol: hataYolu(mesaj), mesaj } };
  }
}

export function App() {
  const [ihtimaller, ihtimalleriYaz] = useState<Ihtimal[]>([{ id: 1, ad: 'İlk ihtimal', form: bosForm() }]);
  const [aktifId, aktifiYaz] = useState(1);
  const [sayfa, sayfaYaz] = useState('hesap');
  const [adim, adimYaz] = useState(0);
  const [belgeler, belgeleriYaz] = useState<TabloBelgesi[]>([]);
  const [bildirim, bildir] = useState('');
  const [baslangicHatasi, baslangicHatasiYaz] = useState('');
  const [mesgul, mesgulYaz] = useState(false);
  const [yerelSunucu, yerelSunucuYaz] = useState(false);
  const [kapandi, kapandiYaz] = useState(false);
  const aktif = ihtimaller.find(i => i.id === aktifId)!;
  const form = aktif.form;
  const degerlendirmeler = useMemo(() => ihtimaller.map(i => degerlendir(i.form, belgeler)), [ihtimaller, belgeler]);
  const { sonuc, hata: hamHata } = degerlendirmeler[ihtimaller.indexOf(aktif)]!;
  // Boş formda kullanıcı daha bir şey yazmadan alanları hatalı göstermemek için
  const hata = aktif.dokunuldu ? hamHata : null;
  const formYaz = (yeni: Nesne) => { ihtimalleriYaz(ihtimaller.map(i => i.id === aktifId ? { ...i, form: yeni, dokunuldu: true } : i)); bildir(''); defterYaz(''); };
  useEffect(() => {
    paketTablolari().then(yeni => {
      hesapTablolari(yeni, 'tum');
      hesapTablolari(yeni, 'kamu');
      belgeleriYaz(yeni);
    }).catch(e => baslangicHatasiYaz(HATA(e)));
  }, []);
  useEffect(() => {
    // Yalnız npm run arayuz ile açılan yerel sunucuda kapatma ucu vardır; statik yayında düğme gizli kalır.
    fetch('/__mizan/durum').then(r => r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null)
      .then(d => yerelSunucuYaz(Boolean(d?.yerel))).catch(() => yerelSunucuYaz(false));
  }, []);
  useEffect(() => {
    const ayrilirken = (e: BeforeUnloadEvent) => { if (!kapandi && ihtimaller.some(i => i.form.hesapTarihi || (i.form.dosya as Nesne).mahkeme)) e.preventDefault(); };
    window.addEventListener('beforeunload', ayrilirken);
    return () => window.removeEventListener('beforeunload', ayrilirken);
  }, [ihtimaller, kapandi]);

  const sunucuyuKapat = async () => {
    const veriVar = ihtimaller.some(i => i.dokunuldu);
    if (veriVar && !window.confirm('Sunucu kapanınca formdaki girdiler silinir. Saklamak istediğiniz hesabı YAML olarak indirdiyseniz devam edin.')) return;
    try {
      const yanit = await fetch('/__mizan/kapat', { method: 'POST' });
      if (!yanit.ok) throw new Error(`sunucu ${yanit.status} döndü`);
      kapandiYaz(true);
      window.close();
    } catch (e) { bildir(`Sunucu kapatılamadı: ${HATA(e)}`); }
  };
  const hatayaGit = () => {
    const yol = hata?.yol ?? 'girdi';
    adimYaz(yol.startsWith('girdi.hizmet') ? 1 : yol.startsWith('girdi.ucret') ? 2 : yol.startsWith('girdi.parametreler') ? 3 : yol.startsWith('girdi.kalemler') || yol.startsWith('girdi.tablolar') ? 4 : 0);
    sayfaYaz('hesap');
    requestAnimationFrame(() => {
      let hedefYol = yol;
      let hedef = document.getElementById(alanId(hedefYol));
      while (!hedef && hedefYol.includes('.')) { hedefYol = hedefYol.replace(/(?:\.[^.\[]+|\[\d+\])$/, ''); hedef = document.getElementById(alanId(hedefYol)); }
      if (hedef) {
        let ebeveyn = hedef.parentElement;
        while (ebeveyn) { if (ebeveyn instanceof HTMLDetailsElement) ebeveyn.open = true; ebeveyn = ebeveyn.parentElement; }
        hedef.scrollIntoView({ block: 'center' }); hedef.focus();
      }
    });
  };
  const kopyala = () => {
    const id = Math.max(...ihtimaller.map(i => i.id)) + 1;
    ihtimalleriYaz([...ihtimaller, { id, ad: `${aktif.ad} kopyası`, form: formdanGirdiKur(form), dokunuldu: aktif.dokunuldu }]);
    aktifiYaz(id);
    defterYaz('');
    bildir('İhtimal kopyalandı. Kopyada değiştirdiğiniz tercihler diğer ihtimalleri etkilemez.');
  };
  const yamlYukle = async (f: File) => {
    try { formYaz(yamlForma(await f.text())); adimYaz(0); sayfaYaz('hesap'); bildir(`${f.name} forma yüklendi.`); }
    catch (e) { bildir(`YAML yüklenemedi: ${HATA(e)}`); }
  };
  const tabloYukle = async (f: File) => {
    mesgulYaz(true);
    try {
      if ((Object.values(TABLO_DOSYALARI) as string[]).includes(f.name) || ['tum', 'kamu'].includes(f.name)) throw new Error('Paket tablolarıyla aynı adı kullanmayın; banka-yazisi.json gibi ayrı bir dosya adı seçin.');
      if (belgeler.some(b => b.dosyaAdi === f.name)) throw new Error('Bu adda bir tablo zaten yüklü. Ayrı bir ad kullanın.');
      const belge = await tabloHazirla(f.name, await f.text());
      const yeniler = [...belgeler, belge];
      hesapTablolari(yeniler, f.name);
      belgeleriYaz(yeniler);
      bildir(`${f.name} doğrulandı ve belleğe yüklendi. Mevduat faizi kullanan hesabınızda bu tabloyu seçebilirsiniz.`);
    } catch (e) { bildir(`Tablo yüklenemedi: ${HATA(e)}`); }
    finally { mesgulYaz(false); }
  };
  const pdfOlustur = async () => {
    if (!sonuc) return;
    mesgulYaz(true);
    try { await pdfIndir(sonuc, formYamli(form)); bildir('PDF raporu hazırlandı ve indirme başlatıldı.'); }
    catch (e) { bildir(`PDF oluşturulamadı: ${HATA(e)}`); }
    finally { mesgulYaz(false); }
  };
  const [defterMetni, defterYaz] = useState('');
  const defterKopyala = async () => {
    if (!sonuc) return;
    const metin = defterSatiri(sonuc, uretimTarihi(), surum());
    try { await navigator.clipboard.writeText(metin); bildir('Kayıt defteri satırı panoya kopyalandı.'); }
    catch { defterYaz(metin); bildir('Panoya erişilemedi. Aşağıdaki kayıt defteri satırını seçip kopyalayın.'); }
  };
  const mevduatVar = Object.values((form.kalemler ?? {}) as Nesne).some(k => k && typeof k === 'object' && !Array.isArray(k) && Array.isArray(k.faiz) && k.faiz.some(f => f && typeof f === 'object' && !Array.isArray(f) && f.tur === 'mevduat'));
  const mevduatSecimi = String(degerOku(form, ['tablolar', 'mevduatFaizi']) ?? '');
  const ozelTabloSecimi = mevduatSecimi && !['tum', 'kamu', ...belgeler.map(b => b.dosyaAdi)].includes(mevduatSecimi);
  const secimYuklu = belgeler.some(b => !(Object.values(TABLO_DOSYALARI) as string[]).includes(b.dosyaAdi) && b.dosyaAdi === mevduatSecimi.split(/[\\/]/).at(-1));
  const tabloSecimi = <div class="alan genis" id={alanId('girdi.tablolar.mevduatFaizi')} tabIndex={-1}>
    <label for="mevduat-secimi">Mevduat faizi tablosu</label>
    <select id="mevduat-secimi" value={mevduatSecimi} disabled={!mevduatVar} onChange={e => formYaz(alanDegistir(form, ['tablolar'], e.currentTarget.value ? { mevduatFaizi: e.currentTarget.value } : undefined))}>
      <option value="">Varsayılan: tüm bankalar (TCMB)</option><option value="tum">Tüm bankalar (TCMB)</option><option value="kamu">Kamu bankaları (TCMB)</option>
      {belgeler.filter(b => !(Object.values(TABLO_DOSYALARI) as string[]).includes(b.dosyaAdi)).map(b => <option value={b.dosyaAdi} key={b.dosyaAdi}>{b.dosyaAdi}</option>)}
      {ozelTabloSecimi && <option value={mevduatSecimi}>{mevduatSecimi} {secimYuklu ? '(yüklü)' : '(JSON yükleyin)'}</option>}
    </select>
    <p class="ipucu">1475 s.K. m.14; TCMB serisi vekil seridir. Kamu bankaları talebi varsa ilgili tabloyu seçin. Banka yazısını Tablolar bölümünden yükleyebilirsiniz.</p>
    {!mevduatVar && <p class="ipucu">Seçim için bir kaleme mevduat faizi satırı ekleyin.{degerOku(form, ['tablolar', 'mevduatFaizi']) !== undefined && <button class="metin-buton" onClick={() => formYaz(alanDegistir(form, ['tablolar'], undefined))}>Kullanılmayan tablo seçimini temizle</button>}</p>}
    {hata?.yol === 'girdi.tablolar.mevduatFaizi' && <p class="alan-hatasi">{hataAciklamasi(hata.mesaj)}</p>}
  </div>;

  if (kapandi) return <main class="kapandi" id="ana-icerik"><span class="marka-adi">mizan<span class="marka-nokta">.</span></span>
    <h1>Sunucu kapatıldı</h1><p>Bu sekmeyi kapatabilirsiniz. Arayüzü yeniden açmak için depo klasöründe <code>npm run arayuz</code> komutunu çalıştırın.</p></main>;

  return <>
    <a class="atla" href="#ana-icerik">İçeriğe geç</a>
    <header class="ust-serit"><div class="marka"><span class="marka-adi">mizan<span class="marka-nokta">.</span></span><span class="marka-tanim">İşçilik alacakları<br />hesap çalışma alanı</span></div>
      <div class="ust-sag"><div class="gizlilik"><span class="durum-noktasi" /> Veriler bu tarayıcıda kalır</div>
        {yerelSunucu && <button class="kapat-dugmesi" onClick={() => void sunucuyuKapat()} title="Yerel sunucuyu kapatır">Kapat</button>}</div></header>
    <nav class="ana-sekmeler" aria-label="Ana gezinme">{[['hesap', 'Hesap kurma'], ['ihtimaller', 'İhtimaller'], ['rapor', 'Rapor ve kayıt'], ['tablolar', 'Tablolar']].map(([kod, ad]) => <button key={kod} aria-current={sayfa === kod ? 'page' : undefined} onClick={() => sayfaYaz(kod!)}>{ad}</button>)}</nav>
    <main id="ana-icerik">
      <div role="status" aria-live="polite" class={`bildirim ${bildirim ? '' : 'bos'}`}>{bildirim}</div>
      {baslangicHatasi && <p role="alert" class="hata-kutusu">Tablolar hazırlanamadı: {baslangicHatasi}</p>}
      {!belgeler.length && !baslangicHatasi && <p role="status">Kaynak tabloları hazırlanıyor...</p>}
      {sayfa !== 'tablolar' && <div class="calisma-seridi"><div class="ihtimal-secimi"><label for="aktif-ihtimal">Çalışılan ihtimal</label><select id="aktif-ihtimal" value={aktifId} onChange={e => { aktifiYaz(Number(e.currentTarget.value)); bildir(''); defterYaz(''); }}>{ihtimaller.map(i => <option key={i.id} value={i.id}>{i.ad}</option>)}</select></div>
        <div class="araclar"><button onClick={kopyala}>İhtimali kopyala</button><button onClick={() => { formYaz(yamlForma(ornekYaml)); adimYaz(0); sayfaYaz('hesap'); bildir('Kurgusal örnek hesap yüklendi.'); }}>Örnek hesap yükle</button><label class="buton dosya-buton">YAML yükle<input type="file" accept=".yaml,.yml,application/yaml,text/yaml" onChange={e => { const f = e.currentTarget.files?.[0]; if (f) void yamlYukle(f); e.currentTarget.value = ''; }} /></label></div></div>}
      {sayfa === 'hesap' && <div class="hesap-duzeni">
        <section class="form-paneli" aria-label="Hesap girdileri"><div class="bolum-basligi"><span class="bolum-no">{String(adim + 1).padStart(2, '0')} / 05</span><div><h1>{BOLUMLER[adim]!.ad}</h1><p>{BOLUMLER[adim]!.aciklama}</p></div></div>
          <nav class="adimlar" aria-label="Hesap adımları">{BOLUMLER.map((b, i) => <button key={b.ad} aria-current={adim === i ? 'step' : undefined} onClick={() => adimYaz(i)}>{b.ad}</button>)}</nav>
          <form onSubmit={e => e.preventDefault()} noValidate>
            {adim < 4 ? <Alanlar alanlar={BOLUMLER[adim]!.alanlar} form={form} degistir={formYaz} hata={hata} /> : <div id={alanId('girdi.kalemler')} tabIndex={-1}>
              {KALEMLER.map(k => { const acik = degerOku(form, ['kalemler', k.key]) !== undefined; return <section class={`kalem-formu ${acik ? 'secili' : ''}`} key={k.key} id={alanId(`girdi.kalemler.${k.key}`)} tabIndex={-1}>
                <label class="kalem-secim"><input type="checkbox" checked={acik} onChange={() => formYaz(alanDegistir(form, ['kalemler', k.key], acik ? undefined : kalemYeni(k.key)))} /><span>{k.ad}<small>{k.dayanak}</small></span></label>
                {hata?.yol === `girdi.kalemler.${k.key}` && <p class="alan-hatasi">{hataAciklamasi(hata.mesaj)}</p>}
                {acik && <details class="kalem-alanlari" open={hata?.yol.startsWith(`girdi.kalemler.${k.key}`) || undefined}><summary>Tercihler, dönemler ve faiz</summary><Alanlar alanlar={k.alanlar} yol={['kalemler', k.key]} form={form} degistir={formYaz} hata={hata} /></details>}
              </section>; })}
              {hata?.yol === 'girdi.kalemler' && <p class="alan-hatasi">{hataAciklamasi(hata.mesaj)}</p>}{tabloSecimi}
            </div>}
          </form>
          <div class="adim-alt"><button disabled={adim === 0} onClick={() => adimYaz(adim - 1)}>Önceki adım</button><span>* Zorunlu alan</span>{adim < 4 ? <button class="birincil" onClick={() => adimYaz(adim + 1)}>Sonraki adım →</button> : <button class="birincil" disabled={!sonuc} onClick={() => sayfaYaz('rapor')}>Raporu hazırla →</button>}</div>
        </section>
        <aside class="sonuc-paneli" id="sonuc-paneli" aria-label="Canlı hesap sonucu"><div class="sonuc-basligi"><h2>Hesap özeti</h2><span class={`durum ${sonuc ? 'gecerli' : ''}`}>{sonuc ? 'Güncel' : 'Eksik girdi'}</span></div>
          {sonuc ? <Sonuclar sonuc={sonuc} /> : <div class="bos-sonuc"><h3>Hesap için girdileri tamamlayın</h3><p>Tercihler ve gerekçeler tamamlandığında sonuçlar her değişiklikte burada yenilenir.</p>{hata && <div class="hata-kutusu"><p>{alanAdi(hata.yol) ? `${alanAdi(hata.yol)}: ` : ''}{hataAciklamasi(hata.mesaj)}</p><button class="metin-buton" onClick={hatayaGit}>İlgili alana git →</button></div>}</div>}
          <p class="panel-dipnot">Hesap çekirdeğiyle aynı formül, kaynak tablosu ve rapor. Zamanaşımı girdide gözetilir.</p>
        </aside>
        <a class="mobil-ozet" href="#sonuc-paneli">{sonuc ? <>Net <b>{tl(sonuc.toplam.net)} TL</b><span>Sonuca git</span></> : <>Hesap eksik<span>Durumu gör</span></>}</a>
      </div>}
      {sayfa === 'ihtimaller' && <section class="ihtimaller-ekrani"><div class="sayfa-basligi"><div><h1>İhtimalleri karşılaştırın</h1><p>Mevcut hesabı kopyalayın, kopyada bir tercihi değiştirin ve toplamları yan yana inceleyin.</p></div><button class="birincil" onClick={kopyala}>İhtimali kopyala</button></div>
        <div class="ihtimal-listesi">{ihtimaller.map((i, n) => { const d = degerlendirmeler[n]!; return <article class={`ihtimal ${i.id === aktifId ? 'aktif' : ''}`} key={i.id}>
          <label for={`ihtimal-ad-${i.id}`}>İhtimal adı</label><input id={`ihtimal-ad-${i.id}`} value={i.ad} onInput={e => ihtimalleriYaz(ihtimaller.map(o => o.id === i.id ? { ...o, ad: e.currentTarget.value } : o))} />
          <p class="soluk">{String((i.form.dosya as Nesne).mahkeme || 'Mahkeme girilmedi')} · {String((i.form.dosya as Nesne).esasNo || 'Esas numarası girilmedi')}</p>
          {d.sonuc ? <><dl class="ihtimal-toplamlari">{[['Brüt alacak', d.sonuc.toplam.brut], ['Net alacak', d.sonuc.toplam.net], ['İşlemiş faiz', d.sonuc.toplam.faiz]].map(([ad, v]) => <div key={String(ad)}><dt>{String(ad)}</dt><dd>{tl(v as HesapSonucu['toplam']['brut'])} TL</dd></div>)}</dl>
            <details><summary>Tercihleri incele</summary><dl class="bilgi-listesi">{d.sonuc.parametreler.map(p => <div key={p.ad}><dt>{p.ad}</dt><dd>{p.deger} ({p.kaynak})</dd></div>)}</dl></details></> : <p class="hata-kutusu">{d.hata ? hataAciklamasi(d.hata.mesaj) : 'Tablolar hazırlanıyor.'}</p>}
          <div class="ihtimal-araclari"><button onClick={() => { aktifiYaz(i.id); sayfaYaz('hesap'); bildir(''); }}>Bu ihtimali düzenle</button><button class="metin-buton" disabled={ihtimaller.length === 1} onClick={() => { ihtimalleriYaz(ihtimaller.filter(o => o.id !== i.id)); if (aktifId === i.id) aktifiYaz(ihtimaller.find(o => o.id !== i.id)!.id); }}>Kaldır</button></div>
        </article>; })}</div>
      </section>}
      {sayfa === 'rapor' && <section class="rapor-ekrani"><div class="sayfa-basligi"><div><h1>Rapor ve kayıt</h1><p>Seçili ihtimal: {aktif.ad}. Rapor, girdi ve tablo özetleriyle yeniden üretilebilir.</p></div></div>
        <div class="rapor-araclari"><button class="birincil" disabled={!sonuc || mesgul} onClick={() => void pdfOlustur()}>{mesgul ? 'PDF hazırlanıyor...' : 'PDF raporunu indir'}</button><button disabled={!sonuc} onClick={() => { if (sonuc) { indir(formYamli(form), kanitDosyaAdi(sonuc, uretimTarihi()).replace(/\.pdf$/, '.yaml'), 'application/yaml'); bildir('YAML indirmesi başlatıldı. Girdinin kalıcı kopyasını bu dosyada saklayın.'); } }}>Girdiyi YAML indir</button><button disabled={!sonuc} onClick={() => void defterKopyala()}>Defter satırını kopyala</button></div>
        <p class="not">Dosya bilgileri kalıcı olarak kaydedilmez. Sayfayı kapatmadan YAML dosyasını indirin; birden fazla ihtimal varsa her birini ayrıca kaydedin. PDF içindeki girdi özeti, indirilen YAML metninin SHA-256 değeridir.</p>
        {defterMetni && <label class="defter-yedek">Kayıt defteri satırı<textarea readOnly value={defterMetni} rows={6} onFocus={e => e.currentTarget.select()} /></label>}
        {sonuc ? <div class="rapor-onizleme"><Sonuclar sonuc={sonuc} tam /></div> : <div class="hata-kutusu"><p>{hata ? hataAciklamasi(hata.mesaj) : 'Girdiler henüz tamamlanmadı.'}</p><button onClick={hatayaGit}>Girdileri tamamla</button></div>}
      </section>}
      {sayfa === 'tablolar' && <><TablolarEkrani belgeler={belgeler} yukle={f => void tabloYukle(f)} mesgul={mesgul || !belgeler.length} /><section class="mevduat-paneli"><h2>Seçili ihtimalin mevduat tablosu</h2><p>{aktif.ad}</p>{tabloSecimi}</section></>}
    </main>
    <footer><span>{surum()}</span><span>YAML ile saklayın, aynı girdiden yeniden üretin.</span></footer>
  </>;
}
