import type { Deger, Nesne } from './form-model.ts';

export interface Secenek { deger: string | boolean; ad: string }
export interface Alan {
  key: string;
  ad: string;
  tur?: 'date' | 'number' | 'textarea' | 'select';
  secenekler?: Secenek[];
  istegeBagli?: boolean;
  ipucu?: string;
  varsayilan?: string;
  dayanak?: string;
  alanlar?: Alan[];
  liste?: boolean;
  yeni?: Nesne;
  gorunur?: (grup: Nesne, kok: Nesne) => boolean;
}
const sec = (key: string, ad: string, pairs: [string | boolean, string][], ek: Partial<Alan> = {}): Alan =>
  ({ key, ad, tur: 'select', secenekler: pairs.map(([deger, ad]) => ({ deger, ad })), ...ek });
const metin = (key: string, ad: string, ek: Partial<Alan> = {}): Alan => ({ key, ad, ...ek });
const sayi = (key: string, ad: string, ek: Partial<Alan> = {}): Alan => ({ key, ad, tur: 'number', ...ek });
const tarih = (key: string, ad: string, ek: Partial<Alan> = {}): Alan => ({ key, ad, tur: 'date', ...ek });
const ops = { istegeBagli: true };
const gerekce = metin('gerekce', 'Gerekçe', { tur: 'textarea' });
const basBit = [tarih('baslangic', 'Başlangıç'), tarih('bitis', 'Bitiş')];
const hak = [sec('hakVar', 'Hak varlığı', [[true, 'Hak var'], [false, 'Hak yok']]), gerekce];
const indirim: Alan = { key: 'takdiriIndirim', ad: 'Takdiri indirim', alanlar: [sayi('oran', 'İndirim oranı', { ipucu: '0 ile 1 arasında yazın. İndirim yoksa 0 girin; %30 için 0.30 yazın.' }), gerekce], yeni: { oran: '', gerekce: '' } };
const faiz: Alan = {
  key: 'faiz', ad: 'Faiz satırları', liste: true, yeni: { tur: '', baslangic: '', gerekce: '' },
  ipucu: 'Faiz eklenmezse hesaplanmaz. Dava ve ıslah için ayrı satır ekleyin. Tutarı boş son satır kalan matrahı alır.',
  alanlar: [sec('tur', 'Faiz türü', [['mevduat', 'En yüksek mevduat faizi'], ['yasal', 'Yasal faiz']]), tarih('baslangic', 'Faiz başlangıcı'), gerekce, sayi('tutar', 'Faize esas tutar (TL)', { ...ops, ipucu: 'Boşsa kalan matrah; tutarı boş en fazla bir satır olabilir.' })],
};
const mahsup: Alan = { key: 'mahsup', ad: 'Mahsup', ...ops, yeni: { tutar: '', aciklama: '' }, alanlar: [sayi('tutar', 'Mahsup tutarı (brüt TL)'), metin('aciklama', 'Mahsup açıklaması')] };
function ortak(zorunluIndirim = false): Alan[] {
  return [{ ...indirim, istegeBagli: !zorunluIndirim }, mahsup, faiz];
}
function donemler(alan: string, ad: string): Alan {
  return { key: 'donemler', ad: 'Çalışma dönemleri', liste: true, yeni: { baslangic: '', bitis: '', [alan]: '' }, alanlar: [...basBit, sayi(alan, ad),
    sayi('haftaSayisi', 'Kabul edilen net hafta sayısı', { ...ops, ipucu: 'Verilirse gün / 7 yerine kullanılır; dışlanan gün alanını temizleyin.' }),
    sayi('dislanacakGun', 'Dışlanan gün', { ...ops, varsayilan: '0', dayanak: 'Hesap esası; dönemden dışlanan gün yok.' }),
  ] };
}

export const KALEMLER = [
  { key: 'kidem', ad: 'Kıdem tazminatı', dayanak: '1475 s.K. m.14', yeni: { hakVar: '', gerekce: '' }, alanlar: [...hak,
    { key: 'oncekiOdemeler', ad: 'Önceki kıdem ödemeleri', ...ops, yeni: { faiz: '', gerekce: '', liste: [] }, ipucu: 'Genel mahsupla birlikte kullanılamaz. Her ödemede net veya brüt tutardan yalnız birini girin.', alanlar: [sec('faiz', 'Önceki ödeme faizi', [['yasal', 'Yasal faiz'], ['yok', 'Faiz yok']]), tarih('faizBitis', 'Ödeme faizi bitişi', { ...ops, varsayilan: 'Fesih tarihi', dayanak: 'Önceki ödemenin fesih tarihine taşınması.' }), gerekce,
      { key: 'liste', ad: 'Ödemeler', liste: true, yeni: { tarih: '' }, alanlar: [tarih('tarih', 'Ödeme tarihi'), sayi('netTutar', 'Net tutar (TL)', ops), sayi('brutTutar', 'Brüt tutar (TL)', ops), metin('aciklama', 'Açıklama', ops)] },
    ] }, ...ortak()] },
  { key: 'ihbar', ad: 'İhbar tazminatı', dayanak: '4857 s.K. m.17', yeni: { hakVar: '', gerekce: '' }, alanlar: [...hak,
    sec('donemEsasi', 'İhbar dönem esası', [['son', 'Son hizmet dönemi'], ['tumu', 'Tüm hizmet dönemleri']], { ...ops, ipucu: 'Birden fazla hizmet döneminde seçilmesi zorunludur.' }),
    sayi('haftaSayisi', 'Bildirim süresi (hafta)', { ...ops, varsayilan: 'Hizmet süresine göre', dayanak: '4857 s.K. m.17, 2 / 4 / 6 / 8 hafta; sınır kabulleri raporda gösterilir.' }),
    sayi('kullandirilanGun', 'Kullandırılan bildirim günü', { ...ops, varsayilan: '0', dayanak: 'Kullandırılan bildirim süresi düşülür.' }), ...ortak()] },
  { key: 'yillikIzin', ad: 'Yıllık izin ücreti', dayanak: '4857 s.K. m.53, m.59', yeni: { kullanilanGun: '', ucretTuru: '' }, alanlar: [sayi('kullanilanGun', 'Kullanılan izin günü'), sayi('hakEdilenGun', 'Hak edilen izin günü', { ...ops, varsayilan: 'Hizmet süresi ve yaşa göre', dayanak: '4857 s.K. m.53; elle verilen gün bu hesabın yerine geçer.' }), sec('ucretTuru', 'İzin ücretine esas ücret', [['ciplak', 'Son çıplak brüt'], ['giydirilmis', 'Son giydirilmiş brüt']]), ...ortak()] },
  { key: 'fazlaCalisma', ad: 'Fazla çalışma', dayanak: '4857 s.K. m.41', yeni: { donemler: [], takdiriIndirim: { oran: '', gerekce: '' } }, alanlar: [donemler('haftalikFazlaSaat', 'Haftalık fazla çalışma saati'), sayi('carpan', 'Fazla çalışma çarpanı', { ...ops, varsayilan: '1.5', dayanak: '4857 s.K. m.41/2.' }), ...ortak(true)] },
  { key: 'haftaTatili', ad: 'Hafta tatili', dayanak: '4857 s.K. m.46', yeni: { donemler: [], takdiriIndirim: { oran: '', gerekce: '' } }, alanlar: [donemler('haftalikGun', 'Haftalık çalışılan tatil günü'), sayi('carpan', 'Hafta tatili çarpanı', { ...ops, varsayilan: '1.5', dayanak: 'Yargıtay uygulaması; 4857 s.K. m.46.' }), ...ortak(true)] },
  { key: 'ubgt', ad: 'Ulusal bayram ve genel tatil', dayanak: '4857 s.K. m.47', yeni: { gunler: [], takdiriIndirim: { oran: '', gerekce: '' } }, alanlar: [
    { key: 'gunler', ad: 'Çalışılan tatil günleri', liste: true, yeni: { tarih: '', gun: '' }, ipucu: 'Günler takvimden türetilmez. Yarım gün için 0.5 yazın.', alanlar: [tarih('tarih', 'Tatil tarihi'), sayi('gun', 'Çalışılan gün'), metin('aciklama', 'Tatil açıklaması', ops)] },
    sayi('carpan', 'UBGT çarpanı', { ...ops, varsayilan: '1', dayanak: '4857 s.K. m.47/1.' }), ...ortak(true)] },
] satisfies Alan[];

export const BOLUMLER: { ad: string; aciklama: string; alanlar: Alan[] }[] = [
  { ad: 'Dosya', aciklama: 'Raporun dosya bilgileri ve hesap tarihi.', alanlar: [
    { key: 'dosya', ad: 'Dosya bilgisi', alanlar: [metin('mahkeme', 'Mahkeme'), metin('esasNo', 'Esas numarası'), metin('kaynak', 'Defterdeki kaynak', { ipucu: 'Örneğin kendi dosyam veya örnek hesap.' }), metin('altAlan', 'Bilirkişilik alt alanı', { ipucu: 'Örneğin 60.02.' }), metin('kisaAd', 'Dosya kısa adı', { ...ops, ipucu: 'Kanıt dosyası adında kullanılır.' }), metin('hazirlayan', 'Hazırlayan', ops)] },
    tarih('hesapTarihi', 'Hesap tarihi'), tarih('faizBitis', 'Faiz bitiş tarihi', { ...ops, varsayilan: 'Hesap tarihi', dayanak: 'Hesap esası.' }),
  ] },
  { ad: 'Hizmet', aciklama: 'Hizmet dönemlerini tarih sırasıyla girin; dönemler çakışmamalıdır.', alanlar: [
    { key: 'hizmet', ad: 'Hizmet ve fesih', alanlar: [
      { key: 'donemler', ad: 'Hizmet dönemleri', liste: true, yeni: { giris: '', cikis: '' }, alanlar: [tarih('giris', 'İşe giriş'), tarih('cikis', 'İşten çıkış')] },
      tarih('fesihTarihi', 'Fesih tarihi'), metin('fesihSekli', 'Fesih şekli ve olgu kabulü', { tur: 'textarea' }), tarih('dogumTarihi', 'Doğum tarihi', { ...ops, ipucu: 'Yalnız yıllık izin yaş kuralı için.' }),
      sayi('dislanacakGun', 'Hizmetten dışlanan gün', { ...ops, ipucu: 'Yalnız gün esaslı süre hesabında kullanılır.' }), metin('dislanacakGerekce', 'Dışlanan gün gerekçesi', { ...ops, tur: 'textarea' }),
    ] },
  ] },
  { ad: 'Ücret', aciklama: 'Tutarları aylık brüt TL olarak, ondalık ayırıcı noktayla girin.', alanlar: [
    { key: 'ucret', ad: 'Ücret bilgisi', alanlar: [metin('sonBrutAylik', 'Son çıplak brüt aylık ücret (TL)', { ipucu: 'Tutar veya asgari yazın.' }), tarih('sonUcretTarihi', 'Son ücret tarihi', { ...ops, varsayilan: 'Fesih tarihi', dayanak: 'Ücretin ve asgari ücret oranının alındığı tarih.' }),
      sec('yontem', 'Dönem ücretinin yöntemi', [['asgari', 'Dönemin asgari ücreti'], ['asgari-orani', 'Son ücretin asgari ücrete oranı'], ['sabit', 'Son ücret bütün dönemlerde sabit'], ['donemsel', 'Elle girilen dönem ücretleri']]),
      { key: 'yanHaklar', ad: 'Aylık brüt yan haklar', liste: true, yeni: { ad: '', tutar: '' }, alanlar: [metin('ad', 'Yan hakkın adı'), sayi('tutar', 'Aylık brüt tutar (TL)')] },
      { key: 'donemsel', ad: 'Dönem ücretleri', liste: true, yeni: { baslangic: '', bitis: '', brutAylik: '' }, gorunur: g => g.yontem === 'donemsel', alanlar: [...basBit, sayi('brutAylik', 'Aylık brüt ücret (TL)')] },
    ] },
  ] },
  { ad: 'Esaslar', aciklama: 'Hukuki tercihleri seçin. Boş bırakılan isteğe bağlı esaslar, dayanağıyla birlikte varsayılan olarak rapora geçer.', alanlar: [
    { key: 'parametreler', ad: 'Hesap esasları', alanlar: [
      { key: 'vergi', ad: 'Vergi', alanlar: [sec('yontem', 'Gelir vergisi yöntemi', [['dilim', 'GVK m.103 ücret tarifesi'], ['sabit', 'Sabit oran']]),
        sayi('sabitOran', 'Sabit gelir vergisi oranı', { gorunur: g => g.yontem === 'sabit', ipucu: '0 ile 1 arasında; %15 için 0.15 yazın.' }),
        sayi('yil', 'Vergi yılı', { ...ops, varsayilan: 'Hesap tarihinin yılı', dayanak: 'Kesintiler tek seferde ödeme kabulüyle hesaplanır.' }),
        sayi('oncekiKumulatifMatrah', 'Önceki kümülatif matrah (TL)', { ...ops, varsayilan: '0', dayanak: 'GVK m.103.' }),
        sec('birikim', 'Matrah birikimi', [['kalemler-arasi', 'Kalemlerin matrahları sırayla birikir'], ['kalem-bazinda', 'Her kalem önceki matrahtan ayrı başlar']], { ...ops, gorunur: g => g.yontem === 'dilim', varsayilan: 'Kalemler arası', dayanak: 'GVK m.103, kümülatif tarife.' }),
        sec('asgariUcretIstisnasi', 'Asgari ücret vergi istisnası', [[true, 'Ödeme ayında bir kez uygula'], [false, 'Uygulama']], { ...ops, varsayilan: 'Uygulanmaz', dayanak: 'GVK m.23/1-18, DVK (2) sayılı tablo IV-34; 2022 ve sonrası.' }),
      ] },
      sayi('gunlukBolen', 'Günlük ücret böleni', { ...ops, varsayilan: '30', dayanak: 'Aylık ücret / 30, Yargıtay uygulaması.' }),
      sayi('aylikCalismaSaati', 'Aylık çalışma saati', { ...ops, varsayilan: '225', dayanak: '4857 s.K. m.63, haftalık 45 saat.' }),
      sec('haftaHesabi', 'Hafta hesabı', [['ondalik', 'Kesirli hafta'], ['tam', 'Tam haftaya aşağı yuvarla']], { ...ops, varsayilan: 'Kesirli hafta', dayanak: '(Dönem günü - dışlanan gün) / 7.' }),
      sec('sureHesabi', 'Hizmet süresi hesabı', [['takvim', 'Takvim esaslı'], ['gun', 'Gün sayısı esaslı']], { ...ops, varsayilan: 'Takvim', dayanak: 'Giriş ve çıkış dahil; gün esasında 1 yıl 365, 1 ay 30 gün.' }),
      sayi('faizGunEsasi', 'Faiz gün esası', { ...ops, varsayilan: '365', dayanak: 'Basit faiz, yıllık oran / 365 × gün.' }),
      sec('faizMatrahi', 'Faiz matrahı', [['brut', 'Brüt alacak'], ['net', 'Net alacak']], { ...ops, varsayilan: 'Brüt alacak', dayanak: 'Hesap esası.' }),
      sec('indirimMahsupSirasi', 'İndirim ve mahsup sırası', [['once-indirim', 'Önce indirim, sonra mahsup'], ['once-mahsup', 'Önce mahsup, sonra indirim']], { ...ops, ipucu: 'İndirim ve mahsup birlikteyse seçilmesi zorunludur; varsayılanı yoktur.' }),
    ] },
  ] },
  { ad: 'Kalemler', aciklama: 'Hesaba katılacak kalemleri açın; her kalemin tercih ve gerekçelerini doldurun.', alanlar: [] },
];

export function kalemYeni(key: string): Deger {
  return structuredClone(KALEMLER.find(k => k.key === key)?.yeni ?? {});
}

/** "girdi.kalemler.ihbar.faiz[0].baslangic" gibi bir yolun formdaki alan adı (bulunamazsa boş). */
export function alanAdi(yol: string): string {
  const parcalar = yol.replace(/^girdi\.?/, '').replace(/\[\d+\]/g, '').split('.').filter(Boolean);
  let alanlar: Alan[] = BOLUMLER.flatMap(b => b.alanlar);
  let ad = '';
  for (const [i, parca] of parcalar.entries()) {
    if (i === 1 && parcalar[0] === 'kalemler') {
      const kalem = KALEMLER.find(k => k.key === parca);
      if (!kalem) return ad;
      ad = kalem.ad;
      alanlar = kalem.alanlar;
      continue;
    }
    if (parca === 'kalemler') continue;
    const alan = alanlar.find(a => a.key === parca);
    if (!alan) return ad;
    ad = alan.ad;
    alanlar = alan.alanlar ?? [];
  }
  return ad;
}
