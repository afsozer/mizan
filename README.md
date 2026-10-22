# mizan

İşçilik alacaklarını bilirkişi raporu düzeyinde hesaplayan komut satırı aracı. Her hesap için
girdileri, formülü, dayanak maddeyi ve kullanılan resmi tablo satırının kaynağını gösteren tarihli
bir PDF rapor üretir; yanına bilirkişilik hesap kayıt defterine yapıştırılacak satır önerisini
yazar.

Faz 1 kapsamı: kıdem tazminatı (dönemsel tavanla), ihbar tazminatı, yıllık izin ücreti, fazla
çalışma, hafta tatili ve ulusal bayram-genel tatil (UBGT) ücretleri; brütten nete dönüşüm (SGK ve
işsizlik sigortası işçi payı, gelir vergisi, damga vergisi); faiz (kıdemde mevduata uygulanan en
yüksek faiz, diğer kalemlerde yasal faiz).

## Kurulum

Node.js 23.6 ya da üstü gerekir (TypeScript dosyaları derlenmeden, Node'un yerleşik tip
ayıklamasıyla çalışır).

```bash
git clone <depo> mizan && cd mizan
npm install
npm test
```

## Kullanım

```bash
node bin/mizan.ts hesapla ornekler/ornek-iscilik.yaml --cikti ornekler/cikti
```

Örnek çıktı bu depoda üretilir ama `ornekler/cikti/` git dışında tutulur. Çıktı dizinine iki dosya
yazılır:

- `2026-10-22_ornek-is-2026-1_60.02.pdf`: hesap raporu. Ad, defterdeki
  `YYYY-AA-GG_mahkeme-esas_altalan.pdf` kuralına uyar; tarih raporun üretildiği gündür.
- `2026-10-22_ornek-is-2026-1_60.02.defter.md`: kayıt defteri satırı önerisi
  (tarih, kaynak, mahkeme ve esas no, alt alan, kalemler ve toplamlar, kanıt dosyası). Teyit sütunu boş
  bırakılır.

Diğer komutlar:

```bash
node bin/mizan.ts tablolar     # tabloları denetler, satır sayısı ve doğrulama tarihini yazar
node bin/mizan.ts --surum      # sürüm ve git commit
```

## Girdi dosyası

YAML. Tam örnek: [`ornekler/ornek-iscilik.yaml`](ornekler/ornek-iscilik.yaml). Şema sıkıdır:
tanınmayan alan hata verir. Bu, rapora müvekkil adı ya da kimlik numarası taşıyacak bir alan
açılmasını da engeller.

| Bölüm | İçerik |
|---|---|
| `dosya` | mahkeme, esas no, defterdeki kaynak sütunu ("kendi dosyam" ya da meslektaşın adı ve barosu), bilirkişilik alt alanı (60.02), isteğe bağlı kısa ad ve hazırlayan |
| `hesapTarihi`, `faizBitis` | raporun hesap tarihi; faiz bitişi verilmezse hesap tarihi |
| `hizmet` | hizmet dönemleri (birden fazla olabilir), fesih tarihi ve şekli, isteğe bağlı doğum tarihi (yalnız yıllık izin yaş kuralı) |
| `ucret` | son çıplak brüt ücret (ya da `asgari`), ücret yöntemi, yan haklar |
| `parametreler` | vergi yöntemi (zorunlu) ve hesap esasları |
| `kalemler` | hesaplanacak kalemler ve her birinin hukuki tercihleri, mahsup, faiz satırları |

### Ücret yöntemi

Fazla çalışma, hafta tatili ve UBGT dönem dönem, o dönemin ücretiyle hesaplanır. Dönem ücretinin
nasıl bulunacağı bir hukuki tercihtir ve rapora yazılır:

- `asgari`: her dönemde o dönemin brüt asgari ücreti.
- `asgari-orani`: son ücretin son ücret tarihindeki asgari ücrete oranı, her dönemin asgari ücretine
  uygulanır.
- `sabit`: her dönemde son ücret.
- `donemsel`: girdide dönem dönem verilen ücretler.

Kıdem ve ihbar son giydirilmiş ücretten (son çıplak ücret + yan haklar), yıllık izin seçime göre son
çıplak ya da giydirilmiş ücretten hesaplanır.

### Hukuki tercihler parametredir

Araç hukuki değerlendirme yapmaz; sonucu değiştiren her tercih girdide yazılır ve raporun 3.
bölümünde "girdi" ya da "varsayılan" diye, dayanağıyla görünür.

- Kıdem ve ihbarda hak varlığı (`hakVar`) ve gerekçesi.
- Takdiri indirim: fazla çalışma, hafta tatili ve UBGT'de **zorunlu** alan. İndirim yapılmayacaksa
  `oran: 0` ve gerekçe yazılır.
- Mahsup; indirimle birlikteyse sırası (`parametreler.indirimMahsupSirasi`) da zorunlu.
- Yıllık izin ücretine esas ücret (`ciplak` / `giydirilmis`).
- Faiz türü, başlangıcı ve gerekçesi; dava ve ıslah için ayrı satırlar (`tutar` verilen satırlar
  önce, tutarsız son satır kalanı alır).
- Gelir vergisi yöntemi: `sabit` (girilen oran) ya da `dilim` (yılın ücret tarifesi, kümülatif matrah;
  kalemler kıdem, ihbar, izin, fazla çalışma, hafta tatili, UBGT sırasıyla birikir).

- Asgari ücret gelir ve damga vergisi istisnası (`parametreler.vergi.asgariUcretIstisnasi`): verilirse
  hesap tarihinin ayında bir kez, o ay başka ücret ödenmediği varsayımıyla uygulanır; önce ücret
  niteliğindeki kalemlerin, kalanı ihbar ve kıdemin vergisine mahsup edilir (GVK m.23/1-18, GVGT Seri
  319, GİB özelgesi 13.12.2023). Yalnız 2022 ve sonrası vergi yılında. Verilmezse uygulanmaz.

Varsayılanı olan esaslar: günlük ücret = aylık / 30; saat ücreti = aylık / 225 (haftalık 45 saat);
fazla çalışma çarpanı 1,5 (4857 m.41/2); hafta tatili çarpanı 1,5 (Yargıtay uygulaması); UBGT çarpanı
1 (4857 m.47); hafta = gün / 7 kesirli; faiz basit, yıllık oran / 365 × gün, brüt alacak üzerinden.
Hepsi girdiyle değiştirilebilir.

### Faiz

- **Yasal faiz** (ihbar, izin, fazla çalışma, hafta tatili, UBGT): oran tablosunun değiştiği günlerde
  bölünür. 01.06.2024'ten %24 (CBK 8485), 31.07.2026'dan 7589 s.K. ile değişen 3095 m.1 formülüyle
  %31 (31.12.2025 reeskont oranı %38,75 × 0,80).
- **Mevduat faizi** (kıdem, 1475 m.14): Yargıtay yöntemiyle başlangıç tarihindeki oran ilk yıl, her
  yıldönümündeki oran o yıl boyunca sabit uygulanır; yıl içi değişiklikler dikkate alınmaz (9. HD
  06.11.2025, 2025/6610 E., 2025/8609 K.). Varsayılan tablo TCMB'nin "Bankalarca Mevduatlara Fiilen
  Uygulanan Azami Faiz Oranları" serisidir (`TP.TRY.MT04.S`, 1 yıla kadar vadeli). Bu bir **vekil
  seridir**: değer ayın en yüksek oranıdır ve Yargıtay oranın bankalara müzekkere yazılarak tespitini
  ister. Rapor bunu kalem notunda yazar.
  - "Kamu bankalarınca" talep edildiyse: `tablolar: { mevduatFaizi: kamu }` (`TP.TRY.MT04.K`).
  - Banka yazısı varsa oranlar `data/README.md`'deki biçimde ayrı bir JSON tabloya yazılır ve
    `tablolar.mevduatFaizi` ile verilir; her satırın `kaynak.belge` alanına yazının tarihi ve UYAP evrak
    bilgisi girilir.
- Dava ve ıslah ayrımı: bir kalemde birden fazla faiz satırı verilir; `tutar` yazılan satırlar önce,
  tutarsız son satır kalanı alır.

## Tablolar

`data/` altındaki her tablo satırı yürürlük aralığı ve resmi kaynağıyla tutulur:

| Dosya | İçerik |
|---|---|
| `asgari-ucret.json` | brüt aylık ve günlük asgari ücret |
| `kidem-tavani.json` | kıdem tazminatı tavanı |
| `gelir-vergisi.json` | GVK m.103 ücret tarifesi, yıl yıl |
| `sgk-isci-payi.json` | SGK ve işsizlik sigortası işçi payı |
| `damga-vergisi.json` | ücret ödemelerinde damga vergisi oranı |
| `yasal-faiz.json` | 3095 s.K. m.1 yasal faiz |
| `mevduat-faizi.json` | kıdem faizi: bankalarca fiilen uygulanan azami faiz (TCMB, aylık) |
| `mevduat-faizi-kamu.json` | aynı seri, kamu bankaları |

Mevduat tabloları `node scripts/mevduat-guncelle.ts` ile TCMB EVDS'den yeniden çekilir. Diğer tablolar
elle, resmi kaynaktan güncellenir.

Kurallar: kaynaksız satır, boşluk ya da çakışma varsa yükleme durur. Dönemi belli satırlar (asgari
ücret, kıdem tavanı, vergi tarifesi, faiz) dönem sonunda kapanır; tablo güncellenmeden sonrası için
hesap yapılmaz. Kanunla belirlenen açık uçlu satırlar (SGK, damga) tablonun `dogrulamaTarihi`nden
sonra da kullanılır ama rapora uyarı düşer. Güncelleme adımları: [`data/README.md`](data/README.md).

## Kanıt değeri

Rapor şunları yazar: araç sürümü ve git commit'i (commit edilmemiş değişiklik varsa belirtilir),
girdi dosyasının SHA-256 özeti, her tablonun doğrulama tarihi ve SHA-256 özeti, kullanılan her tablo
satırının kaynak bağlantısı. Aynı girdi ve aynı commit ile hesap yeniden üretilebilir.

## Sınırlar

- Olgu kabulleri (hizmet süresi, ücret, fazla çalışma saatleri, çalışılan tatil günleri) girdiden gelir;
  ispat ve değerlendirme mahkemeye aittir.
- Zamanaşımı uygulanmaz; dönemler girdide zamanaşımı gözetilerek verilir.
- SGK prime esas kazanç üst sınırı uygulanmaz. Kesintiler tek seferde ödeme varsayımıyla, hesap
  tarihindeki oranlarla hesaplanır; geçmiş aylara dağıtılmaz.
- Kıdem tazminatı tavanı aşan kısım için ücret gibi vergilendirme (GVK m.25/7) uygulanmaz; araç kıdemi
  zaten tavanla sınırlar.
- 2022 öncesi asgari geçim indirimi uygulanmaz.
- Mevduat faizi tablosu vekil seridir (yukarıda "Faiz").
- Yıllık izin süreleri 4857 s.K. m.53'e göredir; 10.06.2003 öncesinde dolan hizmet yılları için uyarı
  verilir, 1475 s.K. dönemi süreleri ayrıca değerlendirilmelidir. Yer altı işlerindeki ek dört gün
  uygulanmaz.
- İhbar süresi tam 1,5 yılda (4857 m.17/2 (b) ve (c) bentlerinin ortak sınırı) alt bentte, 4 haftada
  bırakılır ve not düşülür; diğer yorum için `haftaSayisi` verilir. Tam 6 ay 4 hafta, tam 3 yıl 6 hafta
  sayılır.
- Fazla çalışma ve hafta tatili dönemleri tek bir hizmet döneminin içinde olmalı, birbiriyle
  çakışmamalı; UBGT günleri hizmet dönemlerinin içinde olmalı. Aksi halde hesap durur.
- UBGT günleri takvimden türetilmez, girdide tek tek yazılır.
- Hafta tatili çalışması ayrıca fazla çalışma hesabına katılırsa çift sayım olur; dönem girdileri buna
  göre kurulmalıdır.
- Rapor bir hesap çıktısıdır, hukuki görüş ya da karar değildir.

## Lisans

AGPL-3.0. Ayrıntı: [`LICENSE`](LICENSE).
