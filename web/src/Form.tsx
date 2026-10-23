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
    degistir(sonuc);
  };
  const aciklama = <>{alan.ipucu && <span class="ipucu">{alan.ipucu}</span>}
    {alan.varsayilan && <span class="ipucu"><span class="kaynak-etiket">{deger === undefined ? 'Varsayılan' : 'Girdi'}</span> {deger === undefined ? alan.varsayilan : `Boş bırakılırsa ${alan.varsayilan}`} · {alan.dayanak}</span>}
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
    return <fieldset class={`alan-grubu ${hataVar ? 'hatali' : ''}`} id={id} tabIndex={-1}>
      <legend>{alan.istegeBagli ? <label class="secim"><input type="checkbox" checked={aktif} onChange={() => guncelle(aktif ? undefined : formdanGirdiKur(alan.yeni ?? {}))} />{alan.ad}</label> : alan.ad}</legend>
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
    <span id={`${id}-bilgi`}>{aciklama}{alan.istegeBagli && !alan.varsayilan && <span class="istege-bagli">İsteğe bağlı</span>}</span>
    {hataMetni}
  </div>;
}
