import { useEffect, useMemo, useState } from 'preact/hooks';
import {
  aautDefterSatiri,
  aautHesapla,
  aautKanitDosyaAdi,
  aileDefterSatiri,
  aileHesapla,
  aileKanitDosyaAdi,
  defterSatiri,
  hesapla,
  ICRA_TAKIP_TURU_ADLARI,
  icraDefterSatiri,
  icraFaizOzetiMetni,
  icraHesapla,
  icraKanitDosyaAdi,
  KALEM_MAHSUP_SIRA_ADLARI,
  kanitDosyaAdi,
  TABLO_DOSYALARI,
  TAHSIL_ASAMA_ADLARI,
  tl,
  yuzde,
} from '../../src/index.ts';
import type { AautHesapSonucu, AileHesapSonucu, HesapAlani, HesapSonucu, IcraHesapSonucu } from '../../src/index.ts';
import ornekYaml from '../../ornekler/ornek-iscilik.yaml?raw';
import ornekIcraYaml from '../../ornekler/ornek-icra.yaml?raw';
import ornekAautYaml from '../../ornekler/ornek-aaut.yaml?raw';
import ornekAileYaml from '../../ornekler/ornek-aile.yaml?raw';
import { Alanlar, alanId } from './Form.tsx';
import { AautSonuclar, AileSonuclar, IcraSonuclar, Sonuclar } from './Results.tsx';
import { AAUT_BOLUMLER, AILE_BOLUMLER, alanAdi, BOLUMLER, ICRA_BOLUMLER, KALEMLER, kalemYeni } from './schema.ts';
import {
  aautFormuDogrula,
  aileFormuDogrula,
  alanDegistir,
  bosAautFormu,
  bosAileFormu,
  bosForm,
  bosIcraFormu,
  degerOku,
  formAlanTuru,
  formdanGirdiKur,
  formuDogrula,
  formYamli,
  hataAciklamasi,
  hataYolu,
  icraFormuDogrula,
  yamlForma,
} from './form-model.ts';
import type { Nesne } from './form-model.ts';
import { hesapTablolari, paketTablolari, tabloHazirla } from './tables.ts';
import type { TabloBelgesi } from './tables.ts';
import {
  aautPdfIndir,
  aautUdfIndir,
  ailePdfIndir,
  aileUdfIndir,
  icraPdfIndir,
  icraUdfIndir,
  indir,
  pdfIndir,
  surum,
  udfIndir,
  uretimTarihi,
} from './exports.ts';
import { TablolarEkrani } from './TablesView.tsx';

interface Ihtimal { id: number; ad: string; form: Nesne; dokunuldu?: boolean }
interface Degerlendirme {
  alan: HesapAlani;
  sonuc: HesapSonucu | null;
  icraSonuc: IcraHesapSonucu | null;
  aautSonuc: AautHesapSonucu | null;
  aileSonuc: AileHesapSonucu | null;
  hata: { yol: string; mesaj: string } | null;
}

const HATA = (e: unknown) => e instanceof Error ? e.message : String(e);
function degerlendir(form: Nesne, belgeler: TabloBelgesi[]): Degerlendirme {
  const alan = formAlanTuru(form);
  try {
    if (alan === 'icra') {
      const girdi = icraFormuDogrula(form);
      if (!belgeler.length) return { alan, sonuc: null, icraSonuc: null, aautSonuc: null, aileSonuc: null, hata: null };
      return { alan, sonuc: null, icraSonuc: icraHesapla(girdi, hesapTablolari(belgeler, undefined)), aautSonuc: null, aileSonuc: null, hata: null };
    }
    if (alan === 'aaut') {
      const girdi = aautFormuDogrula(form);
      if (!belgeler.length) return { alan, sonuc: null, icraSonuc: null, aautSonuc: null, aileSonuc: null, hata: null };
      return { alan, sonuc: null, icraSonuc: null, aautSonuc: aautHesapla(girdi, hesapTablolari(belgeler, undefined)), aileSonuc: null, hata: null };
    }
    if (alan === 'aile') {
      const girdi = aileFormuDogrula(form);
      if (!belgeler.length) return { alan, sonuc: null, icraSonuc: null, aautSonuc: null, aileSonuc: null, hata: null };
      return { alan, sonuc: null, icraSonuc: null, aautSonuc: null, aileSonuc: aileHesapla(girdi, { yasalFaiz: hesapTablolari(belgeler, undefined).yasalFaiz }), hata: null };
    }
    const girdi = formuDogrula(form);
    if (!belgeler.length) return { alan, sonuc: null, icraSonuc: null, aautSonuc: null, aileSonuc: null, hata: null };
    return { alan, sonuc: hesapla(girdi, hesapTablolari(belgeler, girdi.tablolar?.mevduatFaizi)), icraSonuc: null, aautSonuc: null, aileSonuc: null, hata: null };
  } catch (e) {
    return { alan, sonuc: null, icraSonuc: null, aautSonuc: null, aileSonuc: null, hata: { yol: hataYolu(e), mesaj: HATA(e) } };
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
  const formAlani = formAlanTuru(form);
  const aktifBolumler = formAlani === 'icra' ? ICRA_BOLUMLER : formAlani === 'aaut' ? AAUT_BOLUMLER : formAlani === 'aile' ? AILE_BOLUMLER : BOLUMLER;
  const degerlendirmeler = useMemo(() => ihtimaller.map(i => degerlendir(i.form, belgeler)), [ihtimaller, belgeler]);
  const { sonuc, icraSonuc, aautSonuc, aileSonuc, hata: hamHata } = degerlendirmeler[ihtimaller.indexOf(aktif)]!;
  const gecerliSonucVar = Boolean(sonuc || icraSonuc || aautSonuc || aileSonuc);
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
    if (formAlani === 'icra') {
      adimYaz(
        yol.startsWith('girdi.takip.kismiOdemeler')
          ? 3
          : yol.startsWith('girdi.takip.pesinHarcAlindiMi') ||
            yol.startsWith('girdi.takip.tahsilHarciAsamasi') ||
            yol.startsWith('girdi.takip.feragatVarMi') ||
            yol.startsWith('girdi.takip.vekaletUcreti') ||
            yol.startsWith('girdi.takip.masraflar')
            ? 2
            : yol.startsWith('girdi.takip') || yol.startsWith('girdi.parametreler')
              ? 1
              : 0,
      );
    } else if (formAlani === 'aaut') {
      adimYaz(yol.startsWith('girdi.uyusmazlik') ? 1 : 0);
    } else if (formAlani === 'aile') {
      adimYaz(yol.startsWith('girdi.evlilik') ? 1 : yol.startsWith('girdi.mallar') ? 2 : yol.startsWith('girdi.eklenecekDegerler') || yol.startsWith('girdi.denklestirmeler') ? 3 : yol.startsWith('girdi.parametreler') ? 4 : 0);
    } else {
      adimYaz(yol.startsWith('girdi.hizmet') ? 1 : yol.startsWith('girdi.ucret') ? 2 : yol.startsWith('girdi.parametreler') ? 3 : yol.startsWith('girdi.kalemler') || yol.startsWith('girdi.tablolar') ? 4 : 0);
    }
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
  const alanSec = (yeniAlan: HesapAlani) => {
    if (yeniAlan === formAlani) return;
    const yeniForm = yeniAlan === 'icra'
      ? bosIcraFormu()
      : yeniAlan === 'aaut'
        ? bosAautFormu()
        : yeniAlan === 'aile'
          ? bosAileFormu()
          : bosForm();
    ihtimalleriYaz(ihtimaller.map(i => i.id === aktifId ? { ...i, form: yeniForm, dokunuldu: false } : i));
    adimYaz(0);
    bildir('');
    defterYaz('');
  };
  const kopyala = () => {
    const id = Math.max(...ihtimaller.map(i => i.id)) + 1;
    ihtimalleriYaz([...ihtimaller, { id, ad: `${aktif.ad} kopyası`, form: formdanGirdiKur(form), dokunuldu: aktif.dokunuldu }]);
    aktifiYaz(id);
    defterYaz('');
    bildir('İhtimal kopyalandı. Kopyada değiştirdiğiniz tercihler diğer ihtimalleri etkilemez.');
  };
  const yamlYukle = async (f: File) => {
    try {
      const metin = await f.text();
      formYaz(yamlForma(metin));
      adimYaz(0);
      sayfaYaz('hesap');
      bildir(`${f.name} forma yüklendi.`);
    } catch (e) { bildir(`YAML yüklenemedi: ${HATA(e)}`); }
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
    if (!gecerliSonucVar) return;
    mesgulYaz(true);
    try {
      if (icraSonuc) await icraPdfIndir(icraSonuc, formYamli(form));
      else if (aautSonuc) await aautPdfIndir(aautSonuc, formYamli(form));
      else if (aileSonuc) await ailePdfIndir(aileSonuc, formYamli(form));
      else if (sonuc) await pdfIndir(sonuc, formYamli(form));
      bildir('PDF raporu hazırlandı ve indirme başlatıldı.');
    }
    catch (e) { bildir(`PDF oluşturulamadı: ${HATA(e)}`); }
    finally { mesgulYaz(false); }
  };
  const udfOlusturIndir = async () => {
    if (!gecerliSonucVar) return;
    mesgulYaz(true);
    try {
      if (icraSonuc) await icraUdfIndir(icraSonuc, formYamli(form));
      else if (aautSonuc) await aautUdfIndir(aautSonuc, formYamli(form));
      else if (aileSonuc) await aileUdfIndir(aileSonuc, formYamli(form));
      else if (sonuc) await udfIndir(sonuc, formYamli(form));
      bildir("UDF raporu hazırlandı ve indirme başlatıldı. Resmi gönderim öncesinde UYAP Doküman Editör'de açıp kontrol edin.");
    }
    catch (e) { bildir(`UDF oluşturulamadı: ${HATA(e)}`); }
    finally { mesgulYaz(false); }
  };
  const [defterMetni, defterYaz] = useState('');
  const defterKopyala = async () => {
    if (!gecerliSonucVar) return;
    const metin = icraSonuc
      ? icraDefterSatiri(icraSonuc, uretimTarihi(), surum())
      : aautSonuc
        ? aautDefterSatiri(aautSonuc, uretimTarihi(), surum())
        : aileSonuc
          ? aileDefterSatiri(aileSonuc, uretimTarihi(), surum())
          : defterSatiri(sonuc!, uretimTarihi(), surum());
    try { await navigator.clipboard.writeText(metin); bildir('Kayıt defteri satırı panoya kopyalandı.'); }
    catch { defterYaz(metin); bildir('Panoya erişilemedi. Aşağıdaki kayıt defteri satırını seçip kopyalayın.'); }
  };
  const mevduatVar = Object.values((form.kalemler ?? {}) as Nesne).some(k => k && typeof k === 'object' && !Array.isArray(k) && Array.isArray(k.faiz) && k.faiz.some(f => f && typeof f === 'object' && !Array.isArray(f) && f.tur === 'mevduat'));
  const mevduatSecimi = String(degerOku(form, ['tablolar', 'mevduatFaizi']) ?? '');
  const ozelTabloSecimi = mevduatSecimi && !['tum', 'kamu', ...belgeler.map(b => b.dosyaAdi)].includes(mevduatSecimi);
  const secimYuklu = belgeler.some(b => !(Object.values(TABLO_DOSYALARI) as string[]).includes(b.dosyaAdi) && b.dosyaAdi === mevduatSecimi.split(/[\\/]/).at(-1));
  const tabloSecimi = <div class="alan genis" id={alanId('girdi.tablolar.mevduatFaizi')} tabIndex={-1}>
    <label for="mevduat-secimi">Mevduat faizi tablosu (1475 s.K. m.14)</label>
    <select id="mevduat-secimi" value={mevduatSecimi} disabled={!mevduatVar} onChange={e => formYaz(alanDegistir(form, ['tablolar'], e.currentTarget.value ? { mevduatFaizi: e.currentTarget.value } : undefined))}>
      <option value="">Varsayılan: tüm bankalar (TCMB)</option><option value="tum">Tüm bankalar (TCMB)</option><option value="kamu">Kamu bankaları (TCMB)</option>
      {belgeler.filter(b => !(Object.values(TABLO_DOSYALARI) as string[]).includes(b.dosyaAdi)).map(b => <option value={b.dosyaAdi} key={b.dosyaAdi}>{b.dosyaAdi}</option>)}
      {ozelTabloSecimi && <option value={mevduatSecimi}>{mevduatSecimi} {secimYuklu ? '(yüklü)' : '(JSON yükleyin)'}</option>}
    </select>
    {!mevduatVar && degerOku(form, ['tablolar', 'mevduatFaizi']) !== undefined && <button class="metin-buton" onClick={() => formYaz(alanDegistir(form, ['tablolar'], undefined))}>Kullanılmayan tablo seçimini temizle</button>}
    {hata?.yol === 'girdi.tablolar.mevduatFaizi' && <p class="alan-hatasi">{hataAciklamasi(hata.mesaj)}</p>}
  </div>;

  const guvenliAdim = Math.min(adim, aktifBolumler.length - 1);

  if (kapandi) return <main class="kapandi" id="ana-icerik"><span class="marka-adi">mizan<span class="marka-nokta">.</span></span>
    <h1>Sunucu kapatıldı</h1><p>Bu sekmeyi kapatabilirsiniz. Arayüzü yeniden açmak için depo klasöründe <code>npm run arayuz</code> komutunu çalıştırın.</p></main>;

  const alanSecici = <div class="ihtimal-secimi"><label for="aktif-alan">Hesap alanı</label><select id="aktif-alan" value={formAlani} onChange={e => alanSec(e.currentTarget.value as HesapAlani)}><option value="iscilik">İşçilik alacakları</option><option value="icra">İcra takibi ve harç</option><option value="aaut">AAÜT vekalet ücreti</option><option value="aile">Mal rejimi tasfiyesi</option></select></div>;

  return <>
    <a class="atla" href="#ana-icerik">İçeriğe geç</a>
    <header class="ust-serit"><div class="marka"><span class="marka-adi">mizan<span class="marka-nokta">.</span></span></div>
      {yerelSunucu && <div class="ust-sag"><button class="kapat-dugmesi" onClick={() => void sunucuyuKapat()} title="Yerel sunucuyu kapatır">Kapat</button></div>}</header>
    <nav class="ana-sekmeler" aria-label="Ana gezinme">{[['hesap', 'Hesap kurma'], ['ihtimaller', 'İhtimaller'], ['rapor', 'Rapor ve kayıt'], ['tablolar', 'Tablolar']].map(([kod, ad]) => <button key={kod} aria-current={sayfa === kod ? 'page' : undefined} onClick={() => sayfaYaz(kod!)}>{ad}</button>)}</nav>
    <main id="ana-icerik">
      <div role="status" aria-live="polite" class={`bildirim ${bildirim ? '' : 'bos'}`}>{bildirim}</div>
      {baslangicHatasi && <p role="alert" class="hata-kutusu">Tablolar hazırlanamadı: {baslangicHatasi}</p>}
      {!belgeler.length && !baslangicHatasi && <p role="status">Kaynak tabloları hazırlanıyor...</p>}
      {sayfa !== 'tablolar' && <div class="calisma-seridi"><div class="calisma-secimler">{alanSecici}<div class="ihtimal-secimi"><label for="aktif-ihtimal">Çalışılan ihtimal</label><select id="aktif-ihtimal" value={aktifId} onChange={e => { aktifiYaz(Number(e.currentTarget.value)); adimYaz(0); bildir(''); defterYaz(''); }}>{ihtimaller.map(i => <option key={i.id} value={i.id}>{i.ad}</option>)}</select></div></div>
        <div class="araclar"><button onClick={kopyala}>İhtimali kopyala</button><button onClick={() => { formYaz(yamlForma(formAlani === 'icra' ? ornekIcraYaml : formAlani === 'aaut' ? ornekAautYaml : formAlani === 'aile' ? ornekAileYaml : ornekYaml)); adimYaz(0); sayfaYaz('hesap'); bildir('Kurgusal örnek hesap yüklendi.'); }}>Örnek hesap yükle</button><label class="buton dosya-buton">YAML yükle<input type="file" accept=".yaml,.yml,application/yaml,text/yaml" onChange={e => { const f = e.currentTarget.files?.[0]; if (f) void yamlYukle(f); e.currentTarget.value = ''; }} /></label></div></div>}
      {sayfa === 'hesap' && <div class="hesap-duzeni">
        <section class="form-paneli" aria-label="Hesap girdileri"><div class="bolum-basligi"><span class="bolum-no">{String(guvenliAdim + 1).padStart(2, '0')} / {String(aktifBolumler.length).padStart(2, '0')}</span><h1>{aktifBolumler[guvenliAdim]!.ad}</h1></div>
          <nav class="adimlar" aria-label="Hesap adımları">{aktifBolumler.map((b, i) => <button key={b.ad} aria-current={guvenliAdim === i ? 'step' : undefined} onClick={() => adimYaz(i)}>{b.ad}</button>)}</nav>
          <form onSubmit={e => e.preventDefault()} noValidate>
            {formAlani !== 'iscilik' || guvenliAdim < 4 ? <Alanlar alanlar={aktifBolumler[guvenliAdim]!.alanlar} form={form} degistir={formYaz} hata={hata} /> : <div id={alanId('girdi.kalemler')} tabIndex={-1}>
              {KALEMLER.map(k => { const acik = degerOku(form, ['kalemler', k.key]) !== undefined; return <section class={`kalem-formu ${acik ? 'secili' : ''}`} key={k.key} id={alanId(`girdi.kalemler.${k.key}`)} tabIndex={-1}>
                <label class="kalem-secim"><input type="checkbox" checked={acik} onChange={() => formYaz(alanDegistir(form, ['kalemler', k.key], acik ? undefined : kalemYeni(k.key)))} /><span>{k.ad}<small>{k.dayanak}</small></span></label>
                {hata?.yol === `girdi.kalemler.${k.key}` && <p class="alan-hatasi">{hataAciklamasi(hata.mesaj)}</p>}
                {acik && <details class="kalem-alanlari" open={hata?.yol.startsWith(`girdi.kalemler.${k.key}`) || undefined}><summary>Tercihler, dönemler ve faiz</summary><Alanlar alanlar={k.alanlar} yol={['kalemler', k.key]} form={form} degistir={formYaz} hata={hata} /></details>}
              </section>; })}
              {hata?.yol === 'girdi.kalemler' && <p class="alan-hatasi">{hataAciklamasi(hata.mesaj)}</p>}{tabloSecimi}
            </div>}
          </form>
          <div class="adim-alt"><button disabled={guvenliAdim === 0} onClick={() => adimYaz(guvenliAdim - 1)}>Önceki adım</button><span>* Zorunlu alan</span>{guvenliAdim < aktifBolumler.length - 1 ? <button class="birincil" onClick={() => adimYaz(guvenliAdim + 1)}>Sonraki adım →</button> : <button class="birincil" disabled={!gecerliSonucVar} onClick={() => sayfaYaz('rapor')}>Raporu hazırla →</button>}</div>
        </section>
        <aside class="sonuc-paneli" id="sonuc-paneli" aria-label="Canlı hesap sonucu"><div class="sonuc-basligi"><h2>Hesap özeti</h2><span class={`durum ${gecerliSonucVar ? 'gecerli' : ''}`}>{gecerliSonucVar ? 'Güncel' : 'Eksik girdi'}</span></div>
          {icraSonuc ? <IcraSonuclar sonuc={icraSonuc} /> : aautSonuc ? <AautSonuclar sonuc={aautSonuc} /> : aileSonuc ? <AileSonuclar sonuc={aileSonuc} /> : sonuc ? <Sonuclar sonuc={sonuc} /> : <div class="bos-sonuc"><h3>Hesap için girdileri tamamlayın</h3>{hata && <div class="hata-kutusu"><p>{alanAdi(hata.yol, formAlani) ? `${alanAdi(hata.yol, formAlani)}: ` : ''}{hataAciklamasi(hata.mesaj)}</p><button class="metin-buton" onClick={hatayaGit}>İlgili alana git →</button></div>}</div>}
        </aside>
        <a class="mobil-ozet" href="#sonuc-paneli">{icraSonuc ? <>Kapak <b>{tl(icraSonuc.borclununOdeyecegiKapakTutari)} TL</b><span>Sonuca git</span></> : aautSonuc ? <>Davacı <b>{tl(aautSonuc.davaci.hukmedilenUcret)} TL</b><span>Sonuca git</span></> : aileSonuc ? <>Net <b>{tl(aileSonuc.takas.netBakiye)} TL</b><span>Sonuca git</span></> : sonuc ? <>Net <b>{tl(sonuc.toplam.net)} TL</b><span>Sonuca git</span></> : <>Hesap eksik<span>Durumu gör</span></>}</a>
      </div>}
      {sayfa === 'ihtimaller' && <section class="ihtimaller-ekrani"><div class="sayfa-basligi"><h1>İhtimalleri karşılaştırın</h1><button class="birincil" onClick={kopyala}>İhtimali kopyala</button></div>
        <div class="ihtimal-listesi">{ihtimaller.map((i, n) => { const d = degerlendirmeler[n]!; return <article class={`ihtimal ${i.id === aktifId ? 'aktif' : ''}`} key={i.id}>
          <label for={`ihtimal-ad-${i.id}`}>İhtimal adı</label><input id={`ihtimal-ad-${i.id}`} value={i.ad} onInput={e => ihtimalleriYaz(ihtimaller.map(o => o.id === i.id ? { ...o, ad: e.currentTarget.value } : o))} />
          <p class="soluk">{String((i.form.dosya as Nesne).mahkeme || 'Mahkeme girilmedi')} · {String((i.form.dosya as Nesne).esasNo || 'Esas numarası girilmedi')}</p>
          {d.icraSonuc ? <><dl class="ihtimal-toplamlari">{[['Takip çıkışı', d.icraSonuc.takipCikisToplami], ['Borçlunun ödeyeceği kapak tutarı', d.icraSonuc.borclununOdeyecegiKapakTutari], ['Alacaklıya net ödenecek tutar', d.icraSonuc.alacakliyaNetOdenecekTutar]].map(([ad, v]) => <div key={String(ad)}><dt>{String(ad)}</dt><dd>{tl(v as IcraHesapSonucu['takipCikisToplami'])} TL</dd></div>)}</dl>
            <details><summary>Tercihleri incele</summary><dl class="bilgi-listesi">
              <div><dt>Takip türü</dt><dd>{ICRA_TAKIP_TURU_ADLARI[d.icraSonuc.takipTuru]}</dd></div>
              <div><dt>Takip sonrası faiz</dt><dd>{icraFaizOzetiMetni(d.icraSonuc)}</dd></div>
              {d.icraSonuc.alacakKalemleri.length > 1 && <div><dt>Çoklu kalem mahsubu</dt><dd>{KALEM_MAHSUP_SIRA_ADLARI[d.icraSonuc.kalemMahsupSirasi]}</dd></div>}
              <div><dt>Tahsil harcı aşaması</dt><dd>{TAHSIL_ASAMA_ADLARI[d.icraSonuc.harclar.tahsilHarciAsamasi]} ({yuzde(d.icraSonuc.harclar.uygulananTahsilOrani)})</dd></div>
              <div><dt>Peşin harç</dt><dd>{d.icraSonuc.girdi.takip.pesinHarcAlindiMi ? `${tl(d.icraSonuc.harclar.pesinHarc)} TL alındı` : 'Alınmadı / muaf'}</dd></div>
              <div><dt>Feragat indirimi</dt><dd>{d.icraSonuc.harclar.feragatIndirimiUygulandiMi ? '492 s.K. m.23 (1/2)' : d.icraSonuc.harclar.feragatVarMi ? 'Satış sonrası feragat (tam)' : 'Yok'}</dd></div>
              <div><dt>Faiz gün esası</dt><dd>{(d.icraSonuc.girdi.parametreler?.faizGunEsasi ?? 365).toString()} gün</dd></div>
            </dl></details></> : d.aautSonuc ? <><dl class="ihtimal-toplamlari">{[['Davacı / alacaklı vekalet', d.aautSonuc.davaci.hukmedilenUcret], ['Davalı karşı vekalet', d.aautSonuc.davali.hukmedilenUcret], ['Merci maktu alt sınırı', d.aautSonuc.maktuUcret]].map(([ad, v]) => <div key={String(ad)}><dt>{String(ad)}</dt><dd>{tl(v as AautHesapSonucu['maktuUcret'])} TL</dd></div>)}</dl>
            <details><summary>Tercihleri incele</summary><dl class="bilgi-listesi">{d.aautSonuc.parametreler.map(p => <div key={p.ad}><dt>{p.ad}</dt><dd>{p.deger} ({p.kaynak})</dd></div>)}</dl></details></> : d.aileSonuc ? <><dl class="ihtimal-toplamlari">{[['Davacı alacağı', `${tl(d.aileSonuc.takas.davaciToplamAlacak)} TL`], ['Net bakiye', `${tl(d.aileSonuc.takas.netBakiye)} TL`], ['İşlemiş faiz', d.aileSonuc.toplamFaiz.davaci.gt(0) && d.aileSonuc.toplamFaiz.davali.gt(0) ? `${tl(d.aileSonuc.toplamFaiz.davaci)} / ${tl(d.aileSonuc.toplamFaiz.davali)} TL` : `${tl(d.aileSonuc.takas.netAlacakli === 'davali' ? d.aileSonuc.toplamFaiz.davali : d.aileSonuc.toplamFaiz.davaci)} TL`]].map(([ad, v]) => <div key={String(ad)}><dt>{String(ad)}</dt><dd>{String(v)}</dd></div>)}</dl>
            <details><summary>Tercihleri incele</summary><dl class="bilgi-listesi">{d.aileSonuc.parametreler.map(p => <div key={p.ad}><dt>{p.ad}</dt><dd>{p.deger} ({p.kaynak})</dd></div>)}</dl></details></> : d.sonuc ? <><dl class="ihtimal-toplamlari">{[['Brüt alacak', d.sonuc.toplam.brut], ['Net alacak', d.sonuc.toplam.net], ['İşlemiş faiz', d.sonuc.toplam.faiz]].map(([ad, v]) => <div key={String(ad)}><dt>{String(ad)}</dt><dd>{tl(v as HesapSonucu['toplam']['brut'])} TL</dd></div>)}</dl>
            <details><summary>Tercihleri incele</summary><dl class="bilgi-listesi">{d.sonuc.parametreler.map(p => <div key={p.ad}><dt>{p.ad}</dt><dd>{p.deger} ({p.kaynak})</dd></div>)}</dl></details></> : <p class="hata-kutusu">{d.hata ? hataAciklamasi(d.hata.mesaj) : 'Tablolar hazırlanıyor.'}</p>}
          <div class="ihtimal-araclari"><button onClick={() => { aktifiYaz(i.id); adimYaz(0); sayfaYaz('hesap'); bildir(''); }}>Bu ihtimali düzenle</button><button class="metin-buton" disabled={ihtimaller.length === 1} onClick={() => { const kalanlar = ihtimaller.filter(o => o.id !== i.id); ihtimalleriYaz(kalanlar); if (aktifId === i.id) aktifiYaz(kalanlar[0]!.id); }}>Kaldır</button></div>
        </article>; })}</div>
      </section>}
      {sayfa === 'rapor' && <section class="rapor-ekrani"><div class="sayfa-basligi"><h1>Rapor ve kayıt</h1></div>
        <div class="rapor-araclari"><button class="birincil" disabled={!gecerliSonucVar || mesgul} onClick={() => void pdfOlustur()}>{mesgul ? 'PDF hazırlanıyor...' : 'PDF raporunu indir'}</button><button disabled={!gecerliSonucVar || mesgul} onClick={() => void udfOlusturIndir()}>UDF indir</button><button disabled={!gecerliSonucVar} onClick={() => { const dosyaAdi = icraSonuc ? icraKanitDosyaAdi(icraSonuc, uretimTarihi()) : aautSonuc ? aautKanitDosyaAdi(aautSonuc, uretimTarihi()) : aileSonuc ? aileKanitDosyaAdi(aileSonuc, uretimTarihi()) : sonuc ? kanitDosyaAdi(sonuc, uretimTarihi()) : ''; if (dosyaAdi) { indir(formYamli(form), dosyaAdi.replace(/\.pdf$/, '.yaml'), 'application/yaml'); bildir('YAML indirmesi başlatıldı. Girdinin kalıcı kopyasını bu dosyada saklayın.'); } }}>Girdiyi YAML indir</button><button disabled={!gecerliSonucVar} onClick={() => void defterKopyala()}>Defter satırını kopyala</button></div>
        <p class="not">İndirilen .udf belgeleri resmi gönderim öncesinde UYAP Doküman Editör'de açılarak elle kontrol edilmelidir.</p>
        {defterMetni && <label class="defter-yedek">Kayıt defteri satırı<textarea readOnly value={defterMetni} rows={6} onFocus={e => e.currentTarget.select()} /></label>}
        {icraSonuc ? <div class="rapor-onizleme"><IcraSonuclar sonuc={icraSonuc} tam /></div> : aautSonuc ? <div class="rapor-onizleme"><AautSonuclar sonuc={aautSonuc} tam /></div> : aileSonuc ? <div class="rapor-onizleme"><AileSonuclar sonuc={aileSonuc} tam /></div> : sonuc ? <div class="rapor-onizleme"><Sonuclar sonuc={sonuc} tam /></div> : <div class="hata-kutusu"><p>{hata ? hataAciklamasi(hata.mesaj) : 'Girdiler henüz tamamlanmadı.'}</p><button onClick={hatayaGit}>Girdileri tamamla</button></div>}
      </section>}
      {sayfa === 'tablolar' && <><TablolarEkrani belgeler={belgeler} yukle={f => void tabloYukle(f)} mesgul={mesgul || !belgeler.length} />{formAlani === 'iscilik' && <section class="mevduat-paneli">{tabloSecimi}</section>}</>}
    </main>
    <footer><span>{surum()}</span></footer>
  </>;
}
