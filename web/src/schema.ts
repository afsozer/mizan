import {
  AAUT_ASAMALARI,
  AAUT_ASAMA_ADLARI,
  AAUT_MERCILERI,
  AAUT_MERCI_ADLARI,
  AAUT_NITELIKLERI,
  AAUT_NITELIK_ADLARI,
} from '../../src/index.ts';
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
const indirim: Alan = { key: 'takdiriIndirim', ad: 'Takdiri indirim', alanlar: [sayi('oran', 'İndirim oranı (0 - 1)'), gerekce], yeni: { oran: '', gerekce: '' } };
const faiz: Alan = {
  key: 'faiz', ad: 'Faiz satırları', liste: true, yeni: { tur: '', baslangic: '', gerekce: '' },
  alanlar: [sec('tur', 'Faiz türü', [['mevduat', 'En yüksek mevduat faizi'], ['yasal', 'Yasal faiz']]), tarih('baslangic', 'Faiz başlangıcı'), gerekce, sayi('tutar', 'Faize esas tutar (TL)', { ...ops, varsayilan: 'Kalan matrah', dayanak: 'Hesap esası' })],
};
const mahsup: Alan = { key: 'mahsup', ad: 'Mahsup', ...ops, yeni: { tutar: '', aciklama: '' }, alanlar: [sayi('tutar', 'Mahsup tutarı (brüt TL)'), metin('aciklama', 'Mahsup açıklaması')] };
function ortak(zorunluIndirim = false): Alan[] {
  return [{ ...indirim, istegeBagli: !zorunluIndirim }, mahsup, faiz];
}
function donemler(alan: string, ad: string): Alan {
  return { key: 'donemler', ad: 'Çalışma dönemleri', liste: true, yeni: { baslangic: '', bitis: '', [alan]: '' }, alanlar: [...basBit, sayi(alan, ad),
    sayi('haftaSayisi', 'Kabul edilen net hafta sayısı', { ...ops, varsayilan: 'Gün / 7', dayanak: 'Hesap esası' }),
    sayi('dislanacakGun', 'Dışlanan gün', { ...ops, varsayilan: '0', dayanak: 'Hesap esası' }),
  ] };
}

export const KALEMLER = [
  { key: 'kidem', ad: 'Kıdem tazminatı', dayanak: '1475 s.K. m.14', yeni: { hakVar: '', gerekce: '' }, alanlar: [...hak,
    { key: 'oncekiOdemeler', ad: 'Önceki kıdem ödemeleri', ...ops, yeni: { faiz: '', gerekce: '', liste: [] }, alanlar: [sec('faiz', 'Önceki ödeme faizi', [['yasal', 'Yasal faiz'], ['yok', 'Faiz yok']]), tarih('faizBitis', 'Ödeme faizi bitişi', { ...ops, varsayilan: 'Fesih tarihi', dayanak: '1475 s.K. m.14' }), gerekce,
      { key: 'liste', ad: 'Ödemeler', liste: true, yeni: { tarih: '' }, alanlar: [tarih('tarih', 'Ödeme tarihi'), sayi('netTutar', 'Net tutar (TL)', ops), sayi('brutTutar', 'Brüt tutar (TL)', ops), metin('aciklama', 'Açıklama', ops)] },
    ] }, ...ortak()] },
  { key: 'ihbar', ad: 'İhbar tazminatı', dayanak: '4857 s.K. m.17', yeni: { hakVar: '', gerekce: '' }, alanlar: [...hak,
    sec('donemEsasi', 'İhbar dönem esası', [['son', 'Son hizmet dönemi'], ['tumu', 'Tüm hizmet dönemleri']], ops),
    sayi('haftaSayisi', 'Bildirim süresi (hafta)', { ...ops, varsayilan: 'Hizmet süresine göre', dayanak: '4857 s.K. m.17 (2 / 4 / 6 / 8 hafta)' }),
    sayi('kullandirilanGun', 'Kullandırılan bildirim günü', { ...ops, varsayilan: '0', dayanak: '4857 s.K. m.17' }), ...ortak()] },
  { key: 'kotuniyet', ad: 'Kötüniyet tazminatı', dayanak: '4857 s.K. m.17/6', yeni: { hakVar: '', gerekce: '' }, alanlar: [...hak,
    sec('donemEsasi', 'Bildirim süresi dönem esası', [['son', 'Son hizmet dönemi'], ['tumu', 'Tüm hizmet dönemleri']], ops),
    sayi('haftaSayisi', 'Kötüniyet süresi (hafta)', { ...ops, varsayilan: 'Bildirim süresinin 3 katı', dayanak: '4857 s.K. m.17/2, m.17/6 (6 / 12 / 18 / 24 hafta)' }), ...ortak()] },
  { key: 'bostaGecenSure', ad: 'Boşta geçen süre ücreti', dayanak: '4857 s.K. m.21/3', yeni: { hakVar: '', gerekce: '' }, alanlar: [...hak,
    sayi('aySayisi', 'Boşta geçen süre (ay)', { ...ops, varsayilan: '4', dayanak: '4857 s.K. m.21/3 (en çok 4 ay)' }),
    sayi('brutAylik', 'Döneme özgü çıplak brüt aylık (TL)', { ...ops, varsayilan: 'Son çıplak brüt ücret', dayanak: '4857 s.K. m.21/4' }),
    sayi('ekYanHaklar', 'Döneme özgü aylık yan haklar (TL)', { ...ops, varsayilan: 'Son yan haklar toplamı', dayanak: '4857 s.K. m.21/3' }), ...ortak()] },
  { key: 'iseBaslatmama', ad: 'İşe başlatmama tazminatı', dayanak: '4857 s.K. m.21/1', yeni: { hakVar: '', gerekce: '', aySayisi: '' }, alanlar: [...hak,
    sayi('aySayisi', 'Tazminat süresi (ay)', { ipucu: '4857 s.K. m.21/1 uyarınca 4 - 8 ay arası değer' }),
    sayi('esasBrutAylik', 'Esas çıplak brüt aylık (TL)', { ...ops, varsayilan: 'Son çıplak brüt ücret', dayanak: '4857 s.K. m.21/4, Yargıtay 9. HD içtihadı' }), ...ortak()] },
  { key: 'yillikIzin', ad: 'Yıllık izin ücreti', dayanak: '4857 s.K. m.53, m.59', yeni: { kullanilanGun: '', ucretTuru: '' }, alanlar: [sayi('kullanilanGun', 'Kullanılan izin günü'), sayi('hakEdilenGun', 'Hak edilen izin günü', { ...ops, varsayilan: 'Hizmet süresi ve yaşa göre', dayanak: '4857 s.K. m.53' }), sec('ucretTuru', 'İzin ücretine esas ücret', [['ciplak', 'Son çıplak brüt'], ['giydirilmis', 'Son giydirilmiş brüt']]), sec('eskiKanun4857Oncesi', '10.06.2003 öncesi izin kanunu', [[true, 'Mülga 1475 s.K. m.49 (12 / 18 / 24 gün)'], [false, 'Tüm yıllarda 4857 s.K. m.53 (14 / 20 / 26 gün)']], { ...ops, varsayilan: '4857 s.K. m.53 (uyarıyla)', dayanak: 'Mülga 1475 s.K. m.49' }), ...ortak()] },
  { key: 'ucretAlacagi', ad: 'Ücret alacağı', dayanak: '4857 s.K. m.32, m.34', yeni: { donemler: [] }, alanlar: [
    { key: 'donemler', ad: 'Ödenmeyen ücret dönemleri', liste: true, yeni: { baslangic: '', bitis: '' }, alanlar: [...basBit,
      sayi('gunSayisi', 'Ödenmeyen gün sayısı', { ...ops, varsayilan: 'Dönem günü', dayanak: '4857 s.K. m.32' }),
      sec('tamAy', 'Satırda tam ay kuralı', [[true, 'Tam ay (1 ay = 30 gün)'], [false, 'Takvim günü']], ops),
      sayi('brutAylik', 'Satıra özel aylık brüt ücret (TL)', { ...ops, varsayilan: 'Ücret motorundan', dayanak: '4857 s.K. m.32' }),
      sayi('odenenBrut', 'Ödenen brüt tutar (TL)', { ...ops, varsayilan: '0', dayanak: 'Hesap esası' }),
      metin('aciklama', 'Açıklama', ops),
    ] },
    sec('gunKurali', 'Gün hesabı kuralı', [['takvim', 'Dönem takvim günü (iki uç dahil)'], ['tam-ay', 'Tam ay esası (1 ay = 30 gün)']], { ...ops, varsayilan: 'Takvim günü', dayanak: 'Hesap esası' }),
    ...ortak()] },
  { key: 'ikramiye', ad: 'İkramiye ve ilave tediye / prim alacağı', dayanak: '4857 s.K. m.32, TBK m.405', yeni: { satirlar: [] }, alanlar: [
    { key: 'satirlar', ad: 'İkramiye, ilave tediye ve prim satırları', liste: true, yeni: { ad: '', hesapSekli: '', deger: '' }, alanlar: [
      metin('ad', 'Alacak adı'),
      metin('donem', 'Dönem', ops),
      tarih('tarih', 'Hak ediş tarihi', ops),
      sec('hesapSekli', 'Hesap şekli', [['tutar', 'Sabit brüt tutar (TL)'], ['gunluk', 'Günlük ücret × gün sayısı'], ['aylik-oran', 'Aylık ücret × oran']]),
      sayi('deger', 'Değer (tutar, gün veya aylık oranı)'),
      sayi('calisilanOran', 'Kıstelyevm (çalışılan süre oranı)', { ...ops, varsayilan: '1', dayanak: 'TBK m.405/2 (0 - 1)' }),
      sayi('brutAylik', 'Satıra özel aylık brüt ücret (TL)', { ...ops, varsayilan: 'Ücret motorundan', dayanak: '4857 s.K. m.32' }),
      sayi('odenenBrut', 'Ödenen brüt tutar (TL)', { ...ops, varsayilan: '0', dayanak: 'Hesap esası' }),
      metin('aciklama', 'Açıklama', ops),
    ] },
    ...ortak()] },
  { key: 'fazlaCalisma', ad: 'Fazla çalışma', dayanak: '4857 s.K. m.41', yeni: { donemler: [], takdiriIndirim: { oran: '', gerekce: '' } }, alanlar: [donemler('haftalikFazlaSaat', 'Haftalık fazla çalışma saati'), sayi('carpan', 'Fazla çalışma çarpanı', { ...ops, varsayilan: '1.5', dayanak: '4857 s.K. m.41/2' }), ...ortak(true)] },
  { key: 'haftaTatili', ad: 'Hafta tatili', dayanak: '4857 s.K. m.46', yeni: { donemler: [], takdiriIndirim: { oran: '', gerekce: '' } }, alanlar: [donemler('haftalikGun', 'Haftalık çalışılan tatil günü'), sayi('carpan', 'Hafta tatili çarpanı', { ...ops, varsayilan: '1.5', dayanak: 'Yargıtay uygulaması, 4857 s.K. m.46' }), ...ortak(true)] },
  { key: 'ubgt', ad: 'Ulusal bayram ve genel tatil', dayanak: '4857 s.K. m.47', yeni: { gunler: [], takdiriIndirim: { oran: '', gerekce: '' } }, alanlar: [
    { key: 'gunler', ad: 'Çalışılan tatil günleri', liste: true, ...ops, yeni: { tarih: '', gun: '' }, alanlar: [tarih('tarih', 'Tatil tarihi'), sayi('gun', 'Çalışılan gün (0.5 / 1)'), metin('aciklama', 'Tatil açıklaması', ops)] },
    { key: 'takvim', ad: 'Takvimden otomatik türetme', ...ops, yeni: { diniBayramlarDahil: true, donemler: [], haricTarihler: [] }, alanlar: [
      sec('diniBayramlarDahil', 'Dini bayramlar', [[true, 'Dini bayramlar ve arife günleri dahil'], [false, 'Yalnız ulusal ve resmi tatiller']], { ...ops, varsayilan: 'Dahil', dayanak: '2429 s.K. m.1-2' }),
      { key: 'donemler', ad: 'UBGT çalışma dönemleri', liste: true, ...ops, yeni: { baslangic: '', bitis: '' }, alanlar: [...basBit] },
      { key: 'haricTarihler', ad: 'Hariç tutulacak tarihler', liste: true, ...ops, yeni: { tarih: '' }, alanlar: [tarih('tarih', 'Hariç tutulacak tarih')] },
    ] },
    sayi('carpan', 'UBGT çarpanı', { ...ops, varsayilan: '1', dayanak: '4857 s.K. m.47/1' }), ...ortak(true)] },
] satisfies Alan[];

export const BOLUMLER: { ad: string; alanlar: Alan[] }[] = [
  { ad: 'Dosya', alanlar: [
    { key: 'dosya', ad: 'Dosya bilgisi', alanlar: [metin('mahkeme', 'Mahkeme'), metin('esasNo', 'Esas numarası'), metin('kaynak', 'Defterdeki kaynak'), metin('altAlan', 'Bilirkişilik alt alanı'), metin('kisaAd', 'Dosya kısa adı', ops), metin('hazirlayan', 'Hazırlayan', ops)] },
    tarih('hesapTarihi', 'Hesap tarihi'), tarih('faizBitis', 'Faiz bitiş tarihi', { ...ops, varsayilan: 'Hesap tarihi', dayanak: 'Hesap esası' }),
  ] },
  { ad: 'Hizmet', alanlar: [
    { key: 'hizmet', ad: 'Hizmet ve fesih', alanlar: [
      { key: 'donemler', ad: 'Hizmet dönemleri', liste: true, yeni: { giris: '', cikis: '' }, alanlar: [tarih('giris', 'İşe giriş'), tarih('cikis', 'İşten çıkış')] },
      tarih('fesihTarihi', 'Fesih tarihi'), metin('fesihSekli', 'Fesih şekli ve olgu kabulü', { tur: 'textarea' }), tarih('dogumTarihi', 'Doğum tarihi', ops),
      sayi('dislanacakGun', 'Hizmetten dışlanan gün', ops), metin('dislanacakGerekce', 'Dışlanan gün gerekçesi', { ...ops, tur: 'textarea' }),
    ] },
  ] },
  { ad: 'Ücret', alanlar: [
    { key: 'ucret', ad: 'Ücret bilgisi', alanlar: [metin('sonBrutAylik', 'Son çıplak brüt aylık ücret (TL veya asgari)'), tarih('sonUcretTarihi', 'Son ücret tarihi', { ...ops, varsayilan: 'Fesih tarihi', dayanak: 'Hesap esası' }),
      sec('yontem', 'Dönem ücretinin yöntemi', [['asgari', 'Dönemin asgari ücreti'], ['asgari-orani', 'Son ücretin asgari ücrete oranı'], ['sabit', 'Son ücret bütün dönemlerde sabit'], ['donemsel', 'Elle girilen dönem ücretleri']]),
      { key: 'yanHaklar', ad: 'Aylık brüt yan haklar', liste: true, yeni: { ad: '', tutar: '' }, alanlar: [metin('ad', 'Yan hakkın adı'), sayi('tutar', 'Aylık brüt tutar (TL)')] },
      { key: 'donemsel', ad: 'Dönem ücretleri', liste: true, yeni: { baslangic: '', bitis: '', brutAylik: '' }, gorunur: g => g.yontem === 'donemsel', alanlar: [...basBit, sayi('brutAylik', 'Aylık brüt ücret (TL)')] },
    ] },
  ] },
  { ad: 'Esaslar', alanlar: [
    { key: 'parametreler', ad: 'Hesap esasları', alanlar: [
      { key: 'vergi', ad: 'Vergi', alanlar: [sec('yontem', 'Gelir vergisi yöntemi', [['dilim', 'GVK m.103 ücret tarifesi'], ['sabit', 'Sabit oran']]),
        sayi('sabitOran', 'Sabit gelir vergisi oranı (0 - 1)', { gorunur: g => g.yontem === 'sabit' }),
        sayi('yil', 'Vergi yılı', { ...ops, varsayilan: 'Hesap tarihinin yılı', dayanak: 'GVK m.103' }),
        sayi('oncekiKumulatifMatrah', 'Önceki kümülatif matrah (TL)', { ...ops, varsayilan: '0', dayanak: 'GVK m.103' }),
        sec('birikim', 'Matrah birikimi', [['kalemler-arasi', 'Kalemlerin matrahları sırayla birikir'], ['kalem-bazinda', 'Her kalem önceki matrahtan ayrı başlar']], { ...ops, gorunur: g => g.yontem === 'dilim', varsayilan: 'Kalemler arası', dayanak: 'GVK m.103' }),
        sec('asgariUcretIstisnasi', 'Asgari ücret vergi istisnası', [[true, 'Ödeme ayında bir kez uygula'], [false, 'Uygulama']], { ...ops, varsayilan: 'Uygulanmaz', dayanak: 'GVK m.23/1-18, DVK (2) sayılı tablo IV-34' }),
      ] },
      sayi('gunlukBolen', 'Günlük ücret böleni', { ...ops, varsayilan: '30', dayanak: 'Aylık ücret / 30, Yargıtay uygulaması' }),
      sayi('aylikCalismaSaati', 'Aylık çalışma saati', { ...ops, varsayilan: '225', dayanak: '4857 s.K. m.63, haftalık 45 saat' }),
      sec('haftaHesabi', 'Hafta hesabı', [['ondalik', 'Kesirli hafta'], ['tam', 'Tam haftaya aşağı yuvarla']], { ...ops, varsayilan: 'Kesirli hafta', dayanak: '(Dönem günü - dışlanan gün) / 7' }),
      sec('sureHesabi', 'Hizmet süresi hesabı', [['takvim', 'Takvim esaslı'], ['gun', 'Gün sayısı esaslı']], { ...ops, varsayilan: 'Takvim', dayanak: 'Giriş ve çıkış dahil (gün esasında 365 / 30)' }),
      sayi('faizGunEsasi', 'Faiz gün esası', { ...ops, varsayilan: '365', dayanak: 'Basit faiz, yıllık oran / 365 × gün' }),
      sec('faizMatrahi', 'Faiz matrahı', [['brut', 'Brüt alacak'], ['net', 'Net alacak']], { ...ops, varsayilan: 'Brüt alacak', dayanak: 'Hesap esası' }),
      sec('indirimMahsupSirasi', 'İndirim ve mahsup sırası', [['once-indirim', 'Önce indirim, sonra mahsup'], ['once-mahsup', 'Önce mahsup, sonra indirim']], ops),
      sec('sgkUstSiniri', 'SGK prime esas kazanç üst sınırı', [[true, 'Üst sınırı uygula'], [false, 'Uygulama']], { ...ops, varsayilan: 'Uygulanmaz', dayanak: '5510 s.K. m.82/1-2 (2016: 6,5 kat, 2017-2025: 7,5 kat, 2026: 9 kat)' }),
      { key: 'zamanasimi', ad: 'Zamanaşımı def\'i kırpması', ...ops, yeni: { sinirTarihi: '', gerekce: '' }, alanlar: [tarih('sinirTarihi', 'Zamanaşımı sınır tarihi'), gerekce] },
    ] },
  ] },
  { ad: 'Kalemler', alanlar: [] },
];

export const AAUT_BOLUMLER: { ad: string; alanlar: Alan[] }[] = [
  {
    ad: 'Dosya',
    alanlar: [
      {
        key: 'dosya',
        ad: 'Dosya bilgisi',
        alanlar: [
          metin('mahkeme', 'Mahkeme / icra dairesi'),
          metin('esasNo', 'Esas / takip numarası'),
          metin('kaynak', 'Defterdeki kaynak'),
          metin('altAlan', 'Bilirkişilik alt alanı'),
          metin('kisaAd', 'Dosya kısa adı', ops),
          metin('hazirlayan', 'Hazırlayan', ops),
        ],
      },
      tarih('hesapTarihi', 'Hüküm / hesap tarihi (AAÜT m.21)'),
    ],
  },
  {
    ad: 'Uyuşmazlık',
    alanlar: [
      {
        key: 'uyusmazlik',
        ad: 'Uyuşmazlık ve vekalet ücreti esasları',
        alanlar: [
          sec(
            'merci',
            'Yargı mercii / takip mercii',
            AAUT_MERCILERI.map(m => [m, AAUT_MERCI_ADLARI[m]] as [string, string]),
          ),
          sec('tur', 'Vekalet ücreti türü', [
            ['nispi', 'Nispi (Üçüncü Kısım kademeli tarife)'],
            ['maktu', 'Maktu (İkinci Kısım maktu ücret)'],
          ]),
          sec(
            'nitelik',
            'Uyuşmazlık niteliği',
            AAUT_NITELIKLERI.map(n => [n, AAUT_NITELIK_ADLARI[n]] as [string, string]),
            {
              ...ops,
              gorunur: g => g.tur !== 'maktu' && g.merci !== 'icra-dairesi',
              varsayilan: 'Genel alacak / dava / takip (AAÜT m.13)',
              dayanak: 'AAÜT m.9, m.10, m.13/3-4',
            },
          ),
          sayi('davaDegeri', 'Dava / takip değeri (müddeabih, TL)', {
            gorunur: g => g.tur !== 'maktu',
            ipucu: 'Nafaka davalarında (AAÜT m.9/1) esas tutar olarak 1 yıllık (12 aylık) nafaka tutarını girin.',
          }),
          sayi('kabulTutari', 'Kabul edilen tutar (TL)', {
            ...ops,
            gorunur: g => g.tur !== 'maktu' && g.merci !== 'icra-dairesi',
          }),
          sayi('retTutari', 'Reddedilen tutar (TL)', {
            ...ops,
            gorunur: g => g.tur !== 'maktu' && g.merci !== 'icra-dairesi',
          }),
          sec(
            'maktuSonuc',
            'Maktu iş sonucu',
            [
              ['kabul', 'Kabul (davacı / alacaklı lehine)'],
              ['ret', 'Ret (davalı lehine)'],
            ],
            {
              ...ops,
              gorunur: g => g.tur === 'maktu',
              varsayilan: 'Kabul',
              dayanak: 'HMK m.326',
            },
          ),
          sec(
            'asama',
            'Yargılama / takip aşaması',
            AAUT_ASAMALARI.map(a => [a, AAUT_ASAMA_ADLARI[a]] as [string, string]),
            {
              ...ops,
              varsayilan: 'Esastan karar (%100)',
              dayanak: 'AAÜT m.6, m.11/4, m.15',
            },
          ),
          metin('asamaGerekcesi', 'İndirimli aşama gerekçesi', {
            ...ops,
            tur: 'textarea',
            gorunur: g => Boolean(g.asama && g.asama !== 'karar'),
          }),
        ],
      },
    ],
  },
];

export function kalemYeni(key: string): Deger {
  return structuredClone(KALEMLER.find(k => k.key === key)?.yeni ?? {});
}

/** "girdi.kalemler.ihbar.faiz[0].baslangic" gibi bir yolun formdaki alan adı (bulunamazsa boş). */
export function alanAdi(yol: string): string {
  const parcalar = yol.replace(/^girdi\.?/, '').replace(/\[\d+\]/g, '').split('.').filter(Boolean);
  let alanlar: Alan[] = [...BOLUMLER, ...AAUT_BOLUMLER].flatMap(b => b.alanlar);
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
