import { TABLO_DOSYALARI, trTarih, tl, yuzde, Decimal } from '../../src/index.ts';
import type { Kaynak } from '../../src/index.ts';
import { KaynakBilgisi, VeriTablosu } from './Results.tsx';
import { indir } from './exports.ts';
import type { TabloBelgesi } from './tables.ts';

interface GorunenTablo { ad: string; aciklama?: string; dogrulamaTarihi: string; satirlar: Record<string, unknown>[] }
const ALANLAR: Record<string, string> = { baslangic: 'Başlangıç', bitis: 'Bitiş', yil: 'Yıl', tutar: 'Tutar (TL)', brutAylik: 'Aylık brüt (TL)', brutGunluk: 'Günlük brüt (TL)', oran: 'Oran', sgkIsci: 'SGK işçi payı', issizlikIsci: 'İşsizlik işçi payı', dilimler: 'Vergi dilimleri' };
function degerYaz(key: string, deger: unknown): string {
  if (deger === null) return 'Devam ediyor';
  if ((key === 'baslangic' || key === 'bitis') && typeof deger === 'string') return trTarih(deger);
  if (typeof deger === 'string' && /^(oran|sgkIsci|issizlikIsci)$/.test(key)) return yuzde(new Decimal(deger));
  if (typeof deger === 'string' && /^(tutar|brutAylik|brutGunluk)$/.test(key)) return tl(new Decimal(deger));
  if (key === 'dilimler' && Array.isArray(deger)) return deger.map((d: { ustSinir: string | null; oran: string }) => `${d.ustSinir === null ? 'Üst sınır yok' : `${tl(new Decimal(d.ustSinir))} TL üst sınıra kadar`}: ${yuzde(new Decimal(d.oran))}`).join('; ');
  return typeof deger === 'object' ? JSON.stringify(deger) : String(deger);
}
export function TablolarEkrani({ belgeler, yukle, mesgul }: { belgeler: TabloBelgesi[]; yukle: (file: File) => void; mesgul: boolean }) {
  const paketAdlari: string[] = Object.values(TABLO_DOSYALARI);
  return <div class="tablolar-ekrani">
    <div class="sayfa-basligi"><div><h1>Hesabın kaynak tabloları</h1><p>Pakete gömülü veriler ve doğrulama kayıtları. Kaynak bağlantıları yalnız siz açtığınızda ziyaret edilir.</p></div>
      <label class={`buton dosya-buton ${mesgul ? 'devre-disi' : ''}`}>Banka yazısı JSON yükle<input type="file" accept=".json,application/json" disabled={mesgul} onChange={e => { const f = e.currentTarget.files?.[0]; if (f) yukle(f); e.currentTarget.value = ''; }} /></label></div>
    <p class="not">Kendi banka yazınızı yüklediğinizde mevduat tablosunu hesapta ayrıca seçin. Bu tablo da bellekte tutulur; hesabı yeniden açarken JSON dosyasını tekrar yükleyin. Aynı dosyayı saklamak için tablo başlığındaki JSON indir düğmesini kullanabilirsiniz.</p>
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
