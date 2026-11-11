import { AAUT_MAKTU_ETIKETLERI, TABLO_DOSYALARI, trTarih, tl, yuzde, sayi, Decimal } from '../../src/index.ts';
import type { AautMaktuAnahtari, Kaynak } from '../../src/index.ts';
import { KaynakBilgisi, VeriTablosu } from './Results.tsx';
import { indir } from './exports.ts';
import type { TabloBelgesi } from './tables.ts';

interface GorunenTablo { ad: string; aciklama?: string; dogrulamaTarihi: string; satirlar: Record<string, unknown>[] }
const ALANLAR: Record<string, string> = {
  baslangic: 'Başlangıç',
  bitis: 'Bitiş',
  yil: 'Yıl',
  donem: 'Tarife dönemi',
  tutar: 'Tutar (TL)',
  brutAylik: 'Aylık brüt (TL)',
  brutGunluk: 'Günlük brüt (TL)',
  oran: 'Oran',
  sgkIsci: 'SGK işçi payı',
  issizlikIsci: 'İşsizlik işçi payı',
  ustSinirKati: 'Üst sınır katı',
  maktu: 'Maktu ücretler (TL)',
  dilimler: 'Dilimler',
  gunler: 'Tatil günleri',
  reeskontOrani: 'Reeskont iskonto oranı',
  avansOrani: 'Ticari temerrüt (avans) faiz oranı',
  basvurmaHarci: 'Başvurma harcı (TL)',
  pesinHarcOrani: 'Peşin harç oranı',
  tahsilTebligdenOnce: 'Tahsil harcı (tebliğden önce)',
  tahsilHacizdenOnce: 'Tahsil harcı (tebliğden sonra, hacizden önce)',
  tahsilSatistanOnce: 'Tahsil harcı (hacizden sonra, satıştan önce)',
  tahsilSatistanSonra: 'Tahsil harcı (satıştan sonra)',
  tahsilMaasHaczi: 'Tahsil harcı (maaş/ücret haczi)',
  feragatCarpani: 'Feragat (vazgeçme) çarpanı',
  cezaeviHarciOrani: 'Cezaevleri yapı harcı oranı',
};
function degerYaz(key: string, deger: unknown): string {
  if (deger === null) return 'Devam ediyor';
  if ((key === 'baslangic' || key === 'bitis') && typeof deger === 'string') return trTarih(deger);
  if (
    typeof deger === 'string' &&
    /^(oran|sgkIsci|issizlikIsci|reeskontOrani|avansOrani|pesinHarcOrani|tahsilTebligdenOnce|tahsilHacizdenOnce|tahsilSatistanOnce|tahsilSatistanSonra|tahsilMaasHaczi|feragatCarpani|cezaeviHarciOrani)$/.test(key)
  ) {
    return yuzde(new Decimal(deger));
  }
  if (typeof deger === 'string' && /^(tutar|brutAylik|brutGunluk|basvurmaHarci)$/.test(key)) return tl(new Decimal(deger));
  if (key === 'ustSinirKati' && typeof deger === 'string') return `${sayi(new Decimal(deger))} kat`;
  if (key === 'maktu' && deger && typeof deger === 'object' && !Array.isArray(deger)) {
    return Object.entries(deger as Record<string, string>)
      .map(([k, v]) => `${AAUT_MAKTU_ETIKETLERI[k as AautMaktuAnahtari] ?? k}: ${tl(new Decimal(v))} TL`)
      .join('; ');
  }
  if (key === 'dilimler' && Array.isArray(deger)) {
    return deger
      .map((d: { dilimTutari?: string | null; ustSinir: string | null; oran: string }) => {
        if (d.dilimTutari !== undefined) {
          return `${d.dilimTutari === null ? 'Yukarısı' : `${tl(new Decimal(d.dilimTutari))} TL dilim (kümülatif ${tl(new Decimal(d.ustSinir!))} TL)`}: ${yuzde(new Decimal(d.oran))}`;
        }
        return `${d.ustSinir === null ? 'Üst sınır yok' : `${tl(new Decimal(d.ustSinir))} TL üst sınıra kadar`}: ${yuzde(new Decimal(d.oran))}`;
      })
      .join('; ');
  }
  if (key === 'gunler' && Array.isArray(deger)) return deger.map((g: { tarih: string; gun: string; ad: string }) => `${trTarih(g.tarih)} ${g.ad} (${sayi(new Decimal(g.gun))} gün)`).join('; ');
  return typeof deger === 'object' ? JSON.stringify(deger) : String(deger);
}
export function TablolarEkrani({ belgeler, yukle, mesgul }: { belgeler: TabloBelgesi[]; yukle: (file: File) => void; mesgul: boolean }) {
  const paketAdlari: string[] = Object.values(TABLO_DOSYALARI);
  return <div class="tablolar-ekrani">
    <div class="sayfa-basligi"><h1>Hesabın kaynak tabloları</h1>
      <label class={`buton dosya-buton ${mesgul ? 'devre-disi' : ''}`}>Banka yazısı JSON yükle<input type="file" accept=".json,application/json" disabled={mesgul} onChange={e => { const f = e.currentTarget.files?.[0]; if (f) yukle(f); e.currentTarget.value = ''; }} /></label></div>
    {belgeler.map(b => {
      const t = b.ham.dosya as GorunenTablo;
      return <details class="tablo-belgesi" key={b.dosyaAdi}><summary><span>{t.ad}<small>{b.dosyaAdi}{!paketAdlari.includes(b.dosyaAdi) ? ' · Kullanıcı tablosu' : ''}</small></span><span class="tablo-tarih">{t.satirlar.length} satır<br />{trTarih(t.dogrulamaTarihi)}</span></summary>
        <div class="tablo-icerigi"><p>{t.aciklama}</p><p>Doğrulama tarihi: <strong>{trTarih(t.dogrulamaTarihi)}</strong></p><p class="ozet">SHA-256: {b.ham.ozet}</p><button class="metin-buton" onClick={() => indir(b.metin, b.dosyaAdi, 'application/json')}>JSON indir</button>
          {t.satirlar.map((satir, i) => <section class="tablo-kaynak-satiri" key={i}>
            <VeriTablosu basliklar={['Alan', 'Değer']} satirlar={Object.entries(satir).filter(([k]) => k !== 'kaynak').map(([k, v]) => [ALANLAR[k] ?? k, degerYaz(k, v)])} aciklama={`${t.ad}, ${i + 1}. satır`} />
            <KaynakBilgisi kaynak={satir.kaynak as Kaynak} />
          </section>)}
        </div>
      </details>;
    })}
  </div>;
}
