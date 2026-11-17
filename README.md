# mizan

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23603691.svg)](https://doi.org/10.5281/zenodo.23603691)

İşçilik alacaklarını ve Faz 2 özel hukuk hesaplarını bilirkişi raporu düzeyinde hesaplayan komut
satırı aracı ve yerel web arayüzü. Her hesap için girdileri, formülü, dayanak maddeyi ve kullanılan
resmi tablo satırının kaynağını gösteren tarihli bir PDF rapor ile UYAP Doküman Formatı (`.udf`)
raporu üretir; yanına bilirkişilik hesap kayıt defterine yapıştırılacak satır önerisini yazar.

Faz 1 kapsamı (`alan: iscilik` veya alan belirtilmemiş girdi): kıdem tazminatı (dönemsel tavanla),
ihbar tazminatı, kötüniyet tazminatı, boşta geçen süre ücreti, işe başlatmama tazminatı, yıllık izin
ücreti, ödenmeyen ücret alacağı (bakiye maaş), ikramiye ve ilave tediye / prim alacağı, fazla çalışma,
hafta tatili ve ulusal bayram-genel tatil (UBGT) ücretleri; brütten nete dönüşüm (SGK ve işsizlik
sigortası işçi payı, gelir vergisi, damga vergisi); faiz (kıdemde 1475 s.K. m.14 ve gününde ödenmeyen
ücret/ikramiye/boşta geçen süre alacaklarında 4857 s.K. m.34 uyarınca mevduata uygulanan en yüksek
faiz, diğer kalemlerde yasal faiz). Yöntem belgesi: [`docs/mizan-hesap-yontemi.md`](docs/mizan-hesap-yontemi.md).

Faz 2 kapsamı:
- **İcra hukuku (`alan: icra`):** takip kapak hesabı, 3095 s.K. yasal / avans / reeskont / akdi faiz,
  492 s.K. m.28 başvurma, peşin, tahsil (%4,55 / %9,10 / %11,38 ve hacizden sonra ödenmeyen kısımda
  yarı tahsil harcı m.23) ve cezaevi yapı pulu (2548 s.K. m.1, %2) harçları, TBK m.100 kısmi ödeme
  mahsubu ve İİK m.138 tarifeli icra vekalet ücreti. Örnek: [`ornekler/ornek-icra.yaml`](ornekler/ornek-icra.yaml),
  yöntem: [`docs/mizan-icra-yontemi.md`](docs/mizan-icra-yontemi.md).
- **Avukatlık Asgari Ücret Tarifesi (`alan: aaut`):** hüküm / hesap tarihindeki yürürlükteki AAÜT
  üzerinden maktu ve Üçüncü Kısım kademeli nispi vekalet ücreti, m.13 maktu alt sınır / müddeabih üst
  sınır denetimi, m.9 nafaka / kira, m.10 manevi tazminat, m.6-m.11/4-m.15 indirimli aşama kuralları
  ve kısmi kabulde davacı / davalı karşı vekalet ücreti. Örnek: [`ornekler/ornek-aaut.yaml`](ornekler/ornek-aaut.yaml),
  yöntem: [`docs/mizan-aaut-yontemi.md`](docs/mizan-aaut-yontemi.md).
- **Aile hukuku mal rejimi tasfiyesi (`alan: aile`):** TMK m.202-241 edinilmiş mallara katılma rejimi
  tasfiyesi; mal mal değer artış payı (m.227), konut/taşıt kredisi oranlaması, eklenecek değerler
  (m.229), denkleştirme (m.230), artık değer (m.231, eksi bakiye sıfırlanır), katılma alacağı ve
  hakkaniyet indirimi (m.236), takas ve m.239/3 yasal faiz. Örnek: [`ornekler/ornek-aile.yaml`](ornekler/ornek-aile.yaml),
  yöntem: [`docs/mizan-aile-yontemi.md`](docs/mizan-aile-yontemi.md).

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
node bin/mizan.ts hesapla ornekler/ornek-icra.yaml --cikti ornekler/cikti
node bin/mizan.ts hesapla ornekler/ornek-aaut.yaml --cikti ornekler/cikti
node bin/mizan.ts hesapla ornekler/ornek-aile.yaml --cikti ornekler/cikti
```

Örnek çıktı bu depoda üretilir ama `ornekler/cikti/` git dışında tutulur. Her dört alan (`iscilik`,
`icra`, `aaut`, `aile`) için çıktı dizinine üç dosya yazılır:

- `2026-10-22_ornek-is-2026-1_60.02.pdf` (ve diğer alanlar için `YYYY-AA-GG_mahkeme-esas_altalan.pdf`):
  hesap raporu. Ad, defterdeki `YYYY-AA-GG_mahkeme-esas_altalan.pdf` kuralına uyar; tarih raporun
  üretildiği gündür.
- `2026-10-22_ornek-is-2026-1_60.02.udf` (ve diğer alanlar için `YYYY-AA-GG_mahkeme-esas_altalan.udf`):
  UYAP Doküman Formatı (`format_id="1.8"`) rapor çıktısı. Tüm dört alanda (`iscilik`, `icra`,
  `aaut`, `aile`) PDF raporundaki tüm bölümlerle eşdeğer içeriği (başlık, dosya ve hesap özeti,
  girdiler, hukuki tercihler, hesap veya kalem detayları, resmi tablo kaynakları ve sınırlar/uyarılar)
  içerir. **Uyarı:** Üretilen her `.udf` dosyası resmi kullanımdan önce UYAP Doküman Editör'de
  açılarak elle doğrulanmalıdır.
- `2026-10-22_ornek-is-2026-1_60.02.defter.md` (ve diğer alanlar için `.defter.md`): kayıt defteri satırı önerisi
  (tarih, kaynak, mahkeme ve esas no, alt alan, kalemler ve toplamlar, kanıt dosyası). Teyit sütunu boş
  bırakılır.

Diğer komutlar:

```bash
node bin/mizan.ts tablolar     # tabloları denetler, satır sayısı ve doğrulama tarihini yazar
node bin/mizan.ts --surum      # sürüm ve git commit
```

## Web arayüzü

Aynı hesap tarayıcıda da yapılabilir. Arayüz sunucusuzdur, dosya bilgisi cihazdan çıkmaz; hesap,
rapor ve tablolar komut satırıyla aynı çekirdekten gelir (`src/index.ts`). Ayrıntı:
[`web/README.md`](web/README.md).

```bash
npm run arayuz        # sunucuyu başlatır, arayüzü tarayıcıda açar; arayüzdeki Kapat düğmesi sunucuyu kapatır
npm run web:dev       # aynı geliştirme sunucusu (127.0.0.1)
npm run web:build     # web/dist/ altına derler
npm run web:preview   # derlenmiş sürümü sunar, tarayıcıda açar
```

### Sürekli tümleştirme ve GitHub Pages

- `.github/workflows/ci.yml`: her dal itmesinde ve çekme isteğinde Node.js 24 üzerinde kök ve web
  tip denetimini, birim testlerini, üretim derlemesini, `node bin/mizan.ts tablolar` denetimini ve
  yazım kuralı kontrolünü çalıştırır.
- `.github/workflows/pages.yml`: `main` dalına yapılan güncellemelerde testleri çalıştırdıktan sonra
  `web/dist/` çıktısını GitHub Pages üzerine dağıtır (`https://afsozer.github.io/mizan/`). Depo
  ayarlarında **Settings > Pages > Build and deployment > Source: GitHub Actions** seçilmelidir.
  Derleme göreli yollarla (`base: './'`) üretildiği için alt dizinde ek yapılandırma gerekmez;
  yerel sunucu kapatma düğmesi statik yayında kendiliğinden gizlenir.

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

Ücret alacağı, ikramiye ve ilave tediye / prim, fazla çalışma, hafta tatili ve UBGT dönem dönem, o
dönemin ücretiyle hesaplanır. Dönem ücretinin nasıl bulunacağı bir hukuki tercihtir ve rapora yazılır:

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

- Kıdem, ihbar, kötüniyet, boşta geçen süre ücreti ve işe başlatmama tazminatında hak varlığı (`hakVar`) ve gerekçesi.
- İşe başlatmama tazminatında mahkemece belirlenen ay sayısı (`aySayisi`, 4 ile 8 ay arası zorunlu) ve isteğe bağlı `esasBrutAylik` (çıplak brüt ücret); boşta geçen süre ücretinde `aySayisi` (varsayılan 4, en çok 4 ay) ve isteğe bağlı döneme özgü `brutAylik` / `ekYanHaklar`.
- Takdiri indirim: fazla çalışma, hafta tatili ve UBGT'de **zorunlu** alan. İndirim yapılmayacaksa
  `oran: 0` ve gerekçe yazılır.
- Mahsup; indirimle birlikteyse sırası (`parametreler.indirimMahsupSirasi`) da zorunlu.
- Yıllık izin ücretine esas ücret (`ciplak` / `giydirilmis`) ve 10.06.2003 öncesinde dolan hizmet
  yıllarında mülga 1475 s.K. m.49 izin basamaklarının (12 / 18 / 24 gün ve <=18 yaş 18 gün) uygulanıp
  uygulanmayacağı (`eskiKanun4857Oncesi: true` ya da `donemKanunu: 1475-4857`).
- UBGT günlerinin `gunler` listesiyle tek tek verilmesi ya da `takvim` seçeneğiyle (`donemler`,
  `diniBayramlarDahil`, `haricTarihler`) `ubgt-takvimi.json` tablosundan türetilmesi.
- Faiz türü, başlangıcı ve gerekçesi; dava ve ıslah için ayrı satırlar (`tutar` verilen satırlar
  önce, tutarsız son satır kalanı alır).
- Gelir vergisi yöntemi: `sabit` (girilen oran) ya da `dilim` (yılın ücret tarifesi). Dilimde
  `birikim: kalemler-arasi` (varsayılan) matrahları kıdem, ihbar, izin, fazla çalışma, hafta tatili,
  UBGT sırasıyla biriktirir; `kalem-bazinda` her kalemi önceki matrahtan ayrı başlatır.
- Kıdemde daha önce yapılan ödemeler (`kalemler.kidem.oncekiOdemeler`): net ya da brüt tutar ve tarih
  listesi. Net tutar yalnız damga vergisi kesildiği kabulüyle brüte çevrilir; `faiz: yasal` ise ödeme
  gününden fesih tarihine kadar yasal faiziyle mahsup edilir (Yargıtay 9. HD 2016/32987 E.,
  2020/19369 K.; 22. HD 2014/1552 E., 2014/2597 K.).
- İhbarda birden fazla hizmet dönemi varsa `donemEsasi: son | tumu` zorunlu (9. HD 2021/5562 E.,
  2021/9893 K.: ihbarda fasılalı dönemler birleştirilmez); `kullandirilanGun` ile bildirim süresinin
  kullandırılan kısmı düşülür.
- Süre hesabı (`parametreler.sureHesabi`): `takvim` (varsayılan) ya da `gun` (1 yıl 365, 1 ay 30 gün).
  `gun` esasında `hizmet.dislanacakGun` ve gerekçesiyle hizmetten gün düşülebilir (ör. ücretsiz izin).
- Fazla çalışma ve hafta tatili dönemlerinde `haftaSayisi`: puantajda ya da raporda kabul edilen hafta
  sayısı elle verilir, gün / 7 hesabının yerine geçer.
- Ücret alacağında (`kalemler.ucretAlacagi`): dönem bazlı ödenmeyen maaş ve bakiye ücret hesabı (4857
  s.K. m.32). Satırda `gunSayisi` elle verilebilir ya da `gunKurali: takvim | tam-ay` ile dönem günü /
  30 gün kuralı seçilir; `brutAylik` verilmezse dönem ücreti değişim günlerinde bölünerek alınır; kısmi
  ödemeler `odenenBrut` ile satırdan düşülür.
- İkramiye ve ilave tediye / prim alacağında (`kalemler.ikramiye`): satır bazında `hesapSekli: tutar |
  gunluk | aylik-oran`, `deger` ve dönem tamamlanmadan sona eren sözleşmelerde TBK m.405/2 kıstelyevm
  oranı (`calisilanOran`).

- Asgari ücret gelir ve damga vergisi istisnası (`parametreler.vergi.asgariUcretIstisnasi`): verilirse
  hesap tarihinin ayında bir kez, o ay başka ücret ödenmediği varsayımıyla uygulanır; önce ücret
  niteliğindeki kalemlerin, kalanı ihbar ve kıdemin vergisine mahsup edilir (GVK m.23/1-18, GVGT Seri
  319, GİB özelgesi 13.12.2023). Yalnız 2022 ve sonrası vergi yılında. Verilmezse uygulanmaz.
- SGK prime esas kazanç üst sınırı (`parametreler.sgkUstSiniri`): `true` seçildiğinde ücret niteliğindeki
  kalemlerde SGK ve işsizlik sigortası işçi payı matrahı ödeme tarihindeki aylık asgari ücret ×
  `ustSinirKati` ile sınırlanır (çok aylı boşta geçen süre ve ücret alacaklarında ay sayısıyla çarpılır;
  5510 s.K. m.80/1-d, m.82/1-2: 2016'da 6,5 kat, 6761 s.K. m.8 ile 01.01.2017'den 7,5 kat, 7566 s.K. m.24
  ve m.38/1-b ile 01.01.2026'dan 9 kat). Varsayılan `false` (tek seferde ödeme matrahı).
- Zamanaşımı kırpması (`parametreler.zamanasimi: { sinirTarihi, gerekce }`): zamanaşımı def'i ileri
  sürüldüğünde (6098 s.K. TBK m.147/1-1, 4857 s.K. m.32/8, Ek m.3, Geçici m.8) kabul edilen sınır
  tarihinden önce kalan ücret alacağı, fazla çalışma ve hafta tatili dönemleri kırpılır (kısmen kırpılan
  dönemde `gunSayisi`, `odenenBrut`, `dislanacakGun` ve `haftaSayisi` orantılanır, tamamen sınır
  öncesinde kalan dönem atlanır), ikramiye satırlarında ve UBGT günlerinde sınır öncesi tarihler dışlanır
  ve kalem notlarına yazılır.

Varsayılanı olan esaslar: günlük ücret = aylık / 30; saat ücreti = aylık / 225 (haftalık 45 saat);
fazla çalışma çarpanı 1,5 (4857 m.41/2); hafta tatili çarpanı 1,5 (Yargıtay uygulaması); UBGT çarpanı
1 (4857 m.47); hafta = gün / 7 kesirli; faiz basit, yıllık oran / 365 × gün, brüt alacak üzerinden;
hepsi girdiyle değiştirilebilir.

### Faiz

- **Yasal faiz** (ihbar, izin, fazla çalışma, hafta tatili, UBGT): oran tablosunun değiştiği günlerde
  bölünür. 01.06.2024'ten %24 (CBK 8485), 31.07.2026'dan 7589 s.K. ile değişen 3095 m.1 formülüyle
  %31 (31.12.2025 reeskont oranı %38,75 × 0,80).
- **Mevduat faizi** (kıdemde 1475 s.K. m.14; gününde ödenmeyen ücret ve ikramiye alacaklarında 4857
  s.K. m.34): Yargıtay yöntemiyle başlangıç tarihindeki oran ilk yıl, her
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
| `ubgt-takvimi.json` | 2429 s.K. m.1-2 ulusal bayram ve genel tatil günleri takvimi (2016-2027) |
| `avans-reeskont-faizi.json` | 3095 s.K. m.2 TCMB reeskont iskonto ve avans faiz oranları |
| `icra-harclari.json` | 492 s.K. (1) sayılı tarife icra harçları ve 2548 s.K. m.1 cezaevi yapı pulu harcı |
| `aaut.json` | TBB Avukatlık Asgari Ücret Tarifesi maktu ücretler ve Üçüncü Kısım kademeli dilimler |

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
- Zamanaşımı kendiliğinden uygulanmaz; dönemler girdide zamanaşımı gözetilerek verilebilir ya da
  `parametreler.zamanasimi` ile sınır tarihi ve gerekçesi tanımlanarak fazla çalışma, hafta tatili ve
  UBGT günleri otomatik kırpılabilir.
- SGK prime esas kazanç üst sınırı varsayılan olarak uygulanmaz; `parametreler.sgkUstSiniri: true`
  seçilirse ödeme tarihindeki aylık üst sınır (5510 s.K. m.82) uygulanır. Kesintiler tek seferde ödeme
  varsayımıyla, hesap tarihindeki oranlarla hesaplanır; geçmiş aylara dağıtılmaz.
- Kıdem tazminatı tavanı aşan kısım için ücret gibi vergilendirme (GVK m.25/7) uygulanmaz; araç kıdemi
  zaten tavanla sınırlar.
- 2022 öncesi asgari geçim indirimi uygulanmaz.
- Mevduat faizi tablosu vekil seridir (yukarıda "Faiz").
- Yıllık izin süreleri varsayılan olarak 4857 s.K. m.53'e göredir; `eskiKanun4857Oncesi: true`
  (veya `donemKanunu: 1475-4857`) seçilirse 10.06.2003 öncesinde dolan hizmet yıllarında mülga 1475 s.K.
  m.49 basamakları (12 / 18 / 24 gün, <=18 yaş 18 gün) uygulanır, seçilmezse uyarı verilir. Yer altı
  işlerindeki ek dört gün uygulanmaz.
- İhbar süresi tam 1,5 yılda (4857 m.17/2 (b) ve (c) bentlerinin ortak sınırı) alt bentte, 4 haftada
  bırakılır ve not düşülür; diğer yorum için `haftaSayisi` verilir. Tam 6 ay 4 hafta, tam 3 yıl 6 hafta
  sayılır.
- Fazla çalışma ve hafta tatili dönemleri tek bir hizmet döneminin içinde olmalı, birbiriyle
  çakışmamalı; UBGT günleri ve takvim dönemleri hizmet dönemlerinin içinde olmalı. Aksi halde hesap durur.
- UBGT günleri `gunler` ile tek tek yazılabilir ya da `takvim` seçeneğiyle 2016-2027 yılları için
  `ubgt-takvimi.json` tablosundan türetilebilir; aynı miladi güne sabit ve dini tatil çakıştığında
  mükerrer sayım yapılmaz.
- Hafta tatili çalışması ayrıca fazla çalışma hesabına katılırsa çift sayım olur; dönem girdileri buna
  göre kurulmalıdır.
- Rapor bir hesap çıktısıdır, hukuki görüş ya da karar değildir.

## Lisans

AGPL-3.0. Ayrıntı: [`LICENSE`](LICENSE).
