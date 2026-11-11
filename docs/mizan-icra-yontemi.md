# Mizan İcra Kapak Hesabı Yöntemi (Faz 2)

Bu belge, `mizan` aracının `src/icra/` modülünde uygulanan icra kapak hesabı, takip sonrası faiz, 492 sayılı Harçlar Kanunu harçları, 2548 sayılı Kanun cezaevleri yapı harcı ve 6098 sayılı Türk Borçlar Kanunu (TBK) m.100 kısmi ödeme mahsubu kurallarını ve birincil mevzuat dayanaklarını açıklar.

---

## 1. Kapsam ve Temel İlkeler

1. **YAML Alan Ayrımı:** İcra kapak hesabı girdi dosyalarında üst düzeyde `alan: icra` alanı zorunludur. `alan` alanı verilmeyen veya `alan: iscilik` olan dosyalar işçilik alacakları motoru (`src/hesap.ts`) tarafından işlenir.
2. **Kişisel Veri Yasağı:** Girdi şeması (`src/icra/girdi.ts`) sıkı denetim uygular; şemada yer almayan hiçbir alanı (alacaklı/borçlu adı, T.C. kimlik numarası, IBAN vb.) kabul etmez.
3. **40 Haneli Duyarlılık ve Yuvarlama:** Tüm ara hesaplar `decimal.js` ile 40 anlamlı basamak (`precision: 40`) üzerinden yürütülür; para tutarları her faiz kesitinde ve her harç kaleminde `ROUND_HALF_UP` ile kuruşa (2 ondalık basamak) yuvarlanır.
4. **Çekirdek Bağımsızlığı:** `src/icra/` altındaki hiçbir dosya Node.js yerleşik modüllerini (`node:fs`, `node:path` vb.) veya `pdfmake` paketini doğrudan çağırmaz; hem komut satırında hem tarayıcıda birebir aynı hesabı üretir.

---

## 2. Takip Çıkışı ve Bileşik Faiz Yasağı

Takip çıkışı toplamı, takip talebindeki asıl alacak ile takip öncesi birikmiş faiz ve fer'i alacakların toplamıdır:

$$\text{Takip Çıkışı Toplamı} = \text{Asıl Alacak} + \sum \text{Takip Öncesi Kalemler}$$

* **6098 s.K. TBK m.121/3 ve 3095 s.K. m.3:** Temerrüt faizine ayrıca temerrüt faizi yürütülemez. Takip sonrasında işleyecek faiz yalnız **kalan asıl alacak (anapara)** üzerinden hesaplanır; takip öncesi birikmiş faiz, ihtarname gideri ve benzeri fer'i kalemler faiz matrahına dahil edilmez.

---

## 3. Takip Sonrası Faiz Türleri ve Oran Değişim Kesitleri (3095 s.K. m.1 ve m.2)

Takip tarihinden kapak (hesap) tarihine veya kısmi ödeme tarihlerine kadar geçen sürede faiz, girdi dosyasındaki `takip.faiz.tur` seçimine göre hesaplanır:

1. **`yasal` (3095 s.K. m.1):** Kanuni faiz oranları `data/yasal-faiz.json` tablosundan okunur (01.06.2024 tarihinden itibaren yıllık `%24` - 8485 sayılı Cumhurbaşkanı Kararı, RG 21.05.2024/32552).
2. **`avans` (3095 s.K. m.2/2):** Ticari işlerde temerrüt faizi olarak Türkiye Cumhuriyet Merkez Bankası (TCMB) tarafından Resmi Gazete tebliğleriyle ilan edilen kısa vadeli avans işlemlerinde uygulanan faiz oranı (`data/avans-reeskont-faizi.json`, `avansOrani`) uygulanır.
3. **`reeskont` (3095 s.K. m.2/1):** TCMB tarafından Resmi Gazete tebliğleriyle ilan edilen reeskont işlemlerinde uygulanan iskonto oranı (`data/avans-reeskont-faizi.json`, `reeskontOrani`) uygulanır.
4. **`sozlesme`:** Taraflar arasındaki sözleşmede veya ilamda kararlaştırılan sabit yıllık faiz oranı (`sozlesmeOrani`) uygulanır.

### Gün Sayımı ve Kesit Bölünmesi

* Başlangıç günü (takip tarihi veya önceki kısmi ödeme günü) faize girmez, bitiş günü faize girer ($\text{Gün} = t_{\text{bitiş}} - t_{\text{başlangıç}}$).
* Faiz dönemi içinde `data/yasal-faiz.json` veya `data/avans-reeskont-faizi.json` tablosunda yürürlük tarihi değiştiğinde dönem otomatik olarak kesitlere bölünür:

$$\text{Kesit Faizi} = \text{kurus}\left(\text{Kalan Asıl Alacak} \times \text{Yıllık Oran} \times \frac{\text{Kesit Gün Sayısı}}{\text{Faiz Gün Esası}}\right)$$

Varsayılan `faizGunEsasi` 365 gündür (`parametreler.faizGunEsasi: 360` seçimi desteklenir).

---

## 4. İcra Harçları (492 s.K. Harçlar Kanunu)

Harç oranları ve maktu tutarlar `data/icra-harclari.json` tablosundan okunur. 2026 yılı değerleri **Harçlar Kanunu Genel Tebliği (Seri No: 98)** (RG 31.12.2025 / 33124, 5. Mükerrer) ile doğrulanmıştır.

### 4.1 Harç Matrahı (492 s.K. m.20)

492 sayılı Harçlar Kanunu m.20 uyarınca değeri belli olan icra takiplerinde harç matrahı takip çıkışı toplamıdır; **takip sonrası işleyen faizler harç matrahına girmez**:

$$\text{Harç Matrahı} = \text{Takip Çıkışı Toplamı}$$

### 4.2 Başvurma Harcı ve Peşin Harç (492 s.K. m.28, m.29, (1) Sayılı Tarife B/I-1 ve B/I-3)

* **Başvurma Harcı:** Takip tarihindeki yürürlükte olan maktu icra başvurma harcıdır (2026 yılı için `732,00 TL`).
* **Peşin Harç:** 492 s.K. m.29 uyarınca ilama dayanmayan (`ilamsiz` ve `kambiyo`) takiplerde takip çıkışı üzerinden **binde 5** (`%0,5`) oranında peşin harç alınır. İlamlı (`ilamli`) takiplerde peşin harç alınmaz.
* **Peşin Harcın Mahsubu (492 s.K. m.29/2):** Takip açılışında alacaklıdan tahsil edilen peşin harç, takip sonunda hesaplanan tahsil harcından mahsup edilir:

$$\text{Mahsup Edilen Peşin Harç} = \min(\text{Hesaplanan Tahsil Harcı}, \text{Peşin Harç})$$

$$\text{Bakiye Tahsil Harcı} = \text{Hesaplanan Tahsil Harcı} - \text{Mahsup Edilen Peşin Harç}$$

### 4.3 İcra Tahsil Harcı Oranları (492 s.K. (1) Sayılı Tarife B/I-3)

| Aşama Kodu (`tahsilHarciAsamasi`) | Kanuni Tanım (492 s.K. (1) Sayılı Tarife B/I-3) | Normal Oran | Feragat Oranı (m.23) |
| --- | --- | --- | --- |
| `tebligden-once` | Ödeme veya icra emrinin tebliğinden önce ödeme | `%0` | `%0` |
| `hacizden-once` | Ödeme/icra emri tebliğinden sonra, hacizden önce (B/I-3-a) | `%4,55` | `%2,275` |
| `satistan-once` | Hacizden sonra, satıştan önce (B/I-3-b) | `%9,10` | `%4,55` |
| `satistan-sonra` | Haczedilen malın satışından sonra (B/I-3-c) | `%11,38` | `%11,38` (tam) |
| `maas-haczi` | Maaş veya ücret haczi suretiyle tahsil (B/I-3-d) | `%4,55` | `%2,275` |

* **Feragat (Vazgeçme) İndirimi (492 s.K. m.23):** İcra takibinden vazgeçilmesi (`feragatVarMi: true`) halinde tahsil harcı yarı oranında (`1/2`) alınır. Ancak **492 s.K. m.23 c.2** uyarınca haczedilen mal satılıp paraya çevrildikten sonra (`satistan-sonra`) vazgeçilirse indirim uygulanmaz ve tahsil harcı tam (`%11,38`) olarak alınır.

---

## 5. Cezaevleri Yapı Harcı (2548 s.K. m.1)

2548 sayılı *Ceza Evleriyle Mahkeme Binaları İnşası Karşılığı Olarak Alınacak Harçlar ve Mahkumlara Ödettirilecek Yiyecek Bedelleri Hakkında Kanun* m.1 uyarınca:

* İcra dairelerince miktar ve kıymeti muayyen olan ilamlı ve ilamsız alacaklardan **%2** oranında cezaevleri yapı harcı alınır.
* Kanunun açık hükmü gereğince bu harç **alacaklıdan tahsil olunur; borçluya yükletilemez**.
* Bu nedenle `mizan` raporunda iki ayrı sonuç satırı üretilir:
  1. **Borçlunun ödeyeceği kapak tutarı:** Kalan asıl alacak + kalan faiz ve giderler + bakiye tahsil harcı (cezaevi harcı dahil değildir).
  2. **Alacaklıya net ödenecek tutar:** Borçlunun ödediği kapak tutarından bakiye tahsil harcı ve %2 cezaevleri yapı harcı düşüldükten sonra alacaklıya yapılacak net reddiyat tutarıdır.

---

## 6. Kısmi Ödemelerin Mahsubu (6098 s.K. TBK m.100)

6098 sayılı TBK m.100/1 (*"Borçlu, faiz veya giderleri ödemede gecikmiş değilse, kısmen yaptığı ödemeyi ana borçtan düşme hakkına sahiptir"*) ve m.121/3 uyarınca dosyaya yapılan her kısmi ödemede şu adımlar sırasıyla uygulanır:

1. Önceki işlem tarihinden (takip tarihi veya bir önceki kısmi ödeme tarihi) kısmi ödeme tarihine kadar **kalan asıl alacak** üzerinden işlemiş dönem faizi (`donemFaizi`) hesaplanır.
2. Bu döneme kadar yapılmış takip giderleri (`donemMasrafi`) ve dönem faizi, faiz üretmeyen alacak havuzuna (`mahsupOncesiFaizVeGider`) eklenir. Başlangıçta bu havuzda takip öncesi fer'iler, başvurma harcı, alacaklıca yatırılan peşin harç ve icra vekalet ücreti yer alır.
3. Yapılan kısmi ödeme öncelikle bu faiz ve gider havuzundan mahsup edilir:
   $$\text{Faiz ve Giderden Mahsup} = \min(\text{Ödeme Tutarı}, \text{Mahsup Öncesi Faiz ve Gider})$$
4. Ödeme tutarının faiz ve giderleri aşan kısmı varsa, kalan asıl alacaktan düşülür:
   $$\text{Asıl Alacaktan Mahsup} = \min(\text{Ödeme Tutarı} - \text{Faiz ve Giderden Mahsup}, \text{Kalan Asıl Alacak})$$
5. Ödeme tarihinden sonraki dönemde faiz, yalnızca indirgenmiş yeni `kalanAsilAlacak` üzerinden işlemeye devam eder; `kalanFaizVeGider` havuzuna hiçbir surette faiz yürütülmez.
