import { AAUT_MAKTU_ZORUNLU_MERCILER, type AautMerci } from '../../src/index.ts';
import type { Alan } from './schema.ts';
import { alanDegistir, degerOku, formdanGirdiKur, hataAciklamasi, yolYaz } from './form-model.ts';
import type { Deger, Nesne, Yol } from './form-model.ts';

export interface FormProps { form: Nesne; degistir: (form: Nesne) => void; hata: { yol: string; mesaj: string } | null }
export function alanId(yol: string): string { return `alan-${yol.replace(/[^a-zA-Z0-9]/g, '-')}`; }

export function Alanlar({ alanlar, yol = [], ...props }: FormProps & { alanlar: Alan[]; yol?: Yol }) {
  const grup = degerOku(props.form, yol) as Nesne | undefined;
  return <div class="alanlar">{alanlar.filter(a => !a.gorunur || a.gorunur(grup ?? {}, props.form)).map(alan =>
    <FormAlani key={alan.key} {...props} alan={alan} yol={[...yol, alan.key]} />,
  )}</div>;
}

function FormAlani({ alan, yol, form, degistir, hata }: FormProps & { alan: Alan; yol: Yol }) {
  const deger = degerOku(form, yol);
  const adres = yolYaz(yol);
  const id = alanId(adres);
  const hataVar = hata?.yol === adres;
  const guncelle = (v: Deger | undefined) => {
    let sonuc = alanDegistir(form, yol, v);
    if (adres === 'girdi.ucret.yontem' && v !== 'donemsel') sonuc = alanDegistir(sonuc, ['ucret', 'donemsel'], undefined);
    if (adres === 'girdi.parametreler.vergi.yontem') {
      sonuc = alanDegistir(sonuc, ['parametreler', 'vergi', v === 'sabit' ? 'birikim' : 'sabitOran'], undefined);
    }
    if (adres === 'girdi.uyusmazlik.merci') {
      const m = String(v ?? '') as AautMerci;
      const icraTakibiMi = m === 'icra-dairesi' || m === 'icra-tahliye';
      const mevcutAsama = degerOku(sonuc, ['uyusmazlik', 'asama']);
      if (AAUT_MAKTU_ZORUNLU_MERCILER.includes(m)) {
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'tur'], 'maktu');
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'davaDegeri'], undefined);
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'kabulTutari'], undefined);
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'retTutari'], undefined);
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'nitelik'], undefined);
      } else if (m === 'icra-dairesi') {
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'kabulTutari'], undefined);
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'retTutari'], undefined);
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'nitelik'], undefined);
      }
      if ((icraTakibiMi && mevcutAsama === 'on-inceleme-oncesi') || (!icraTakibiMi && mevcutAsama === 'odeme-suresi-icinde')) {
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'asama'], undefined);
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'asamaGerekcesi'], undefined);
      }
    }
    if (adres === 'girdi.uyusmazlik.tur') {
      if (v === 'maktu') {
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'davaDegeri'], undefined);
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'kabulTutari'], undefined);
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'retTutari'], undefined);
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'nitelik'], undefined);
      } else {
        sonuc = alanDegistir(sonuc, ['uyusmazlik', 'maktuSonuc'], undefined);
      }
    }
    if (adres === 'girdi.uyusmazlik.asama' && (!v || v === 'karar')) {
      sonuc = alanDegistir(sonuc, ['uyusmazlik', 'asamaGerekcesi'], undefined);
    }
    if (adres === 'girdi.takip.takipTuru' && v === 'ilamli') {
      sonuc = alanDegistir(sonuc, ['takip', 'pesinHarcAlindiMi'], undefined);
      const mevcutKalemler = degerOku(sonuc, ['takip', 'alacakKalemleri']);
      if (Array.isArray(mevcutKalemler)) {
        sonuc = alanDegistir(
          sonuc,
          ['takip', 'alacakKalemleri'],
          mevcutKalemler.map(k => (k && typeof k === 'object' && !Array.isArray(k) ? { ...(k as Nesne), pesinHarcaTabiMi: undefined } : k)),
        );
      }
    }
    if (adres === 'girdi.takip.faiz.tur' && v !== 'sozlesme') {
      sonuc = alanDegistir(sonuc, ['takip', 'faiz', 'sozlesmeOrani'], undefined);
    }
    if (/^girdi\.takip\.alacakKalemleri\[\d+\]\.faiz\.tur$/.test(adres) && v !== 'sozlesme') {
      const satirYol = yol.slice(0, -1);
      sonuc = alanDegistir(sonuc, [...satirYol, 'sozlesmeOrani'], undefined);
    }
    if (adres === 'girdi.takip.alacakKalemleri' && Array.isArray(v)) {
      if (v.length > 0) {
        const oncekiAsil = degerOku(form, ['takip', 'asilAlacak']);
        const oncekiFaiz = degerOku(form, ['takip', 'faiz']) as Nesne | undefined;
        const tekBosSatir = v.length === 1 && !(v[0] as Nesne | undefined)?.ad && !(v[0] as Nesne | undefined)?.tutar;
        if (tekBosSatir && (oncekiAsil || oncekiFaiz?.tur)) {
          const tasinanFaiz: Nesne = {
            tur: oncekiFaiz?.tur ?? '',
            ...(oncekiFaiz?.sozlesmeOrani !== undefined ? { sozlesmeOrani: oncekiFaiz.sozlesmeOrani } : {}),
            gerekce: oncekiFaiz?.gerekce ?? '',
          };
          const birinciSatir: Nesne = {
            ad: 'Asıl alacak',
            tutar: oncekiAsil ?? '',
            ...(oncekiFaiz?.baslangicTarihi ? { faizBaslangicTarihi: oncekiFaiz.baslangicTarihi } : {}),
            faiz: tasinanFaiz,
          };
          sonuc = alanDegistir(sonuc, yol, [birinciSatir, formdanGirdiKur(alan.yeni ?? {})]);
        }
        sonuc = alanDegistir(sonuc, ['takip', 'asilAlacak'], undefined);
        sonuc = alanDegistir(sonuc, ['takip', 'faiz'], undefined);
      } else {
        sonuc = alanDegistir(sonuc, ['takip', 'alacakKalemleri'], undefined);
        if (degerOku(sonuc, ['takip', 'asilAlacak']) === undefined) {
          sonuc = alanDegistir(sonuc, ['takip', 'asilAlacak'], '');
        }
        if (degerOku(sonuc, ['takip', 'faiz']) === undefined) {
          sonuc = alanDegistir(sonuc, ['takip', 'faiz'], { tur: '', gerekce: '' });
        }
      }
    }
    if (/^girdi\.takip\.kismiOdemeler\[\d+\]\.tahsilYeri$/.test(adres) && v === 'haricen') {
      const satirYol = yol.slice(0, -1);
      sonuc = alanDegistir(sonuc, [...satirYol, 'tahsilHarciOrani'], undefined);
      sonuc = alanDegistir(sonuc, [...satirYol, 'kesilenTahsilHarci'], undefined);
    }
    degistir(sonuc);
  };
  const aciklama = <>{alan.ipucu && <span class="ipucu">{alan.ipucu}</span>}
    {alan.varsayilan && <span class="ipucu"><span class="kaynak-etiket">{deger === undefined ? 'Varsayılan' : 'Girdi'}</span> {alan.varsayilan}{alan.dayanak ? ` · ${alan.dayanak}` : ''}</span>}
  </>;
  const hataMetni = hataVar ? <p class="alan-hatasi" id={`${id}-hata`}>{hataAciklamasi(hata.mesaj)}</p> : null;
  if (alan.alanlar) {
    if (alan.liste) {
      const liste = Array.isArray(deger) ? deger : [];
      return <fieldset class={`liste-grubu ${hataVar ? 'hatali' : ''}`} id={id} tabIndex={-1}>
        <legend>{alan.ad}</legend>{aciklama}{hataMetni}
        {!liste.length && <p class="bos-liste">Henüz satır eklenmedi.</p>}
        {liste.map((_, i) => <div class="liste-satiri" key={i} id={alanId(yolYaz([...yol, i]))} tabIndex={-1}>
          <div class="satir-basligi"><span>{i + 1}. satır</span><button type="button" class="metin-buton" aria-label={`${alan.ad}, ${i + 1}. satırı kaldır`} onClick={() => guncelle(liste.filter((__, j) => i !== j))}>Kaldır</button></div>
          {hata?.yol === yolYaz([...yol, i]) && <p class="alan-hatasi">{hataAciklamasi(hata.mesaj)}</p>}
          <Alanlar form={form} degistir={degistir} hata={hata} alanlar={alan.alanlar!} yol={[...yol, i]} />
        </div>)}
        <button type="button" class="ekle" onClick={() => guncelle([...liste, formdanGirdiKur(alan.yeni ?? {})])}>+ {alan.ad} için satır ekle</button>
      </fieldset>;
    }
    const aktif = deger !== undefined;
    const baslikGoster = Boolean(alan.istegeBagli || yol.length > 1);
    return <fieldset class={`alan-grubu ${hataVar ? 'hatali' : ''}`} id={id} tabIndex={-1} aria-label={!baslikGoster ? alan.ad : undefined}>
      {baslikGoster && <legend>{alan.istegeBagli ? <label class="secim"><input type="checkbox" checked={aktif} onChange={() => guncelle(aktif ? undefined : formdanGirdiKur(alan.yeni ?? {}))} />{alan.ad}</label> : alan.ad}</legend>}
      {aciklama}{hataMetni}
      {(aktif || !alan.istegeBagli) && <Alanlar form={form} degistir={degistir} hata={hata} alanlar={alan.alanlar} yol={yol} />}
    </fieldset>;
  }
  const degerDegisti = (s: string) => {
    const secenek = alan.secenekler?.find(o => String(o.deger) === s);
    guncelle(s === '' && alan.istegeBagli ? undefined : secenek?.deger ?? s);
  };
  const ortak = { id, name: adres, required: !alan.istegeBagli, value: deger === undefined || deger === null ? '' : String(deger), 'aria-invalid': hataVar || undefined, 'aria-describedby': `${id}-bilgi${hataVar ? ` ${id}-hata` : ''}` };
  return <div class={`alan ${alan.tur === 'textarea' ? 'genis' : ''} ${hataVar ? 'hatali' : ''}`}>
    <label for={id}>{alan.ad}{!alan.istegeBagli && <span class="zorunlu" title="Zorunlu alan"> *</span>}</label>
    {alan.secenekler ? <select {...ortak} onChange={e => degerDegisti(e.currentTarget.value)}>
      <option value="">{alan.varsayilan ? `Varsayılan: ${alan.varsayilan}` : alan.istegeBagli ? 'Seçilmedi' : 'Seçin'}</option>
      {alan.secenekler.map(s => <option key={String(s.deger)} value={String(s.deger)}>{s.ad}</option>)}
    </select> : alan.tur === 'textarea' ? <textarea {...ortak} rows={3} onInput={e => degerDegisti(e.currentTarget.value)} /> :
      <input {...ortak} type={alan.tur === 'date' ? 'date' : 'text'} inputMode={alan.tur === 'number' ? 'decimal' : undefined} placeholder={alan.varsayilan} autoComplete="off" onInput={e => degerDegisti(e.currentTarget.value)} />}
    <span id={`${id}-bilgi`}>{aciklama}</span>
    {hataMetni}
  </div>;
}
