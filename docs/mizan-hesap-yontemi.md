# mizan hesap yöntemi

Aracın kalem kalem uyguladığı formüller ve dayanakları.
Kanun maddeleri 22 Ekim 2026'da mevzuat.gov.tr metninden (dayanak korpusu) kontrol edildi.

## Süre

- Takvim esaslı, giriş ve çıkış günleri dahil: 01.03.2019 - 30.06.2026 = 7 yıl 4 ay 0 gün.
  Ay eklerken ay sonuna kırpılır (31.01 + 1 ay = 29.02).
- Tek dönemde takvim süresi olduğu gibi kullanılır (11 ay 30 gün bir yıla yuvarlanmaz). Birden fazla
  hizmet dönemi toplanır (1475 m.14/2); toplamda 30 gün 1 ay, 12 ay 1 yıl sayılır.
- Seçimli gün esası (`sureHesabi: gun`): dönemlerin gün sayıları (giriş ve çıkış günü dahil) toplanır,
  düşülecek günler çıkarılır, 1 yıl 365, 1 ay 30 gün sayılır. 01.01.2021 - 31.12.2021 = 365 gün (1 yıl);
  bitiş günü hariç sayım (364) bir gün eksik verir.

## Kıdem tazminatı

- Dayanak: 1475 s.K. m.14. Her tam yıl için 30 günlük ücret, yıldan artan süre için aynı oran.
  Esas ücrete para ve para ile ölçülebilen menfaatler eklenir. Yıllık tutar, en yüksek devlet
  memuruna 5434 s.K.'ya göre bir hizmet yılı için ödenecek azami emeklilik ikramiyesini geçemez.
- Esas = min(giydirilmiş brüt, fesih tarihindeki tavan).
- Kıdem = esas × yıl + esas / 12 × ay + esas / 365 × gün.
- Toplam hizmet 1 yıldan azsa ya da girdide `hakVar: false` ise hesaplanmaz.
- Önceki ödemeler: brüt = net / (1 - damga oranı) (kıdem tavan içinde gelir vergisinden istisna);
  mahsup = brüt + brüt × yasal faiz × (fesih tarihi - ödeme tarihi) / 365. Dayanak 9. HD 21.12.2020,
  2016/32987 E., 2020/19369 K.; 22. HD 17.02.2014, 2014/1552 E., 2014/2597 K.
- Kesinti: yalnız damga vergisi.
- Faiz: 1475 m.14, "mevduata uygulanan en yüksek faiz" (aşağıda "Faiz").

## İhbar tazminatı

- Dayanak: 4857 m.17. Altı aydan az 2, altı aydan bir buçuk yıla kadar 4, bir buçuk yıldan üç yıla
  kadar 6, üç yıldan fazla 8 hafta. Hesapta ücrete ek menfaatler de göz önünde tutulur.
- İhbar = giydirilmiş brüt / 30 × hafta × 7.
- Sınırlar: tam 6 ay (a) "altı aydan az" olmadığı için 4 hafta; tam 3 yıl (d) "üç yıldan fazla"
  olmadığı için 6 hafta. Tam 1,5 yıl hem (b) hem (c) bendine girer: alt bentte (4 hafta) bırakılır,
  not düşülür, `haftaSayisi` ile değiştirilebilir.
- Kesinti: gelir vergisi ve damga vergisi.
- Birden fazla dönemde son dönem mi tüm dönemler mi esas alınacağı girdide seçilir (9. HD 03.06.2021,
  2021/5562 E., 2021/9893 K.: ihbarda birleştirme yok). Kullandırılan bildirim süresi günden düşülür.

## Kötüniyet tazminatı

- Dayanak: 4857 m.17/6 (iş güvencesi kapsamı dışındaki işçilerin iş sözleşmesinin fesih hakkının kötüye
  kullanılarak sona erdirilmesi), m.17/2 (bildirim süreleri), m.17/son (giydirilmiş ücret; 9. HD
  30.03.2016, 2014/36354 E., 2016/7815 K.).
- Kötüniyet = giydirilmiş brüt / 30 × (bildirim haftası × 3) × 7 (6, 12, 18 veya 24 hafta × 7 gün).
  Tam 1,5 yıl sınırında `haftaSayisi` ile değiştirilebilir; birden fazla hizmet döneminde `donemEsasi`
  (`son` | `tumu`) zorunludur.
- Kesinti: gelir vergisi ve damga vergisi (5510 m.80/1-b prim dışı).
- Faiz: yasal faiz.

## Boşta geçen süre ücreti

- Dayanak: 4857 m.21/3-4. Kararın kesinleşmesine kadar çalıştırılmadığı süre için en çok 4 aya kadar
  doğmuş bulunan ücret ve diğer haklar; giydirilmiş brüt ücret üzerinden hesaplanır (9. HD 25.11.2019,
  2016/9242 E., 2019/20742 K.; 9. HD 22.06.2017, 2017/21858 E., 2017/11169 K.).
- Boşta geçen süre ücreti = esas giydirilmiş brüt aylık × ay sayısı (varsayılan 4, en çok 4 ay).
  Döneme özgü `brutAylik` ve `ekYanHaklar` verilmezse son giydirilmiş brüt aylık esas alınır ve raporda
  belirtilir.
- Kesinti: SGK işçi payı, işsizlik sigortası işçi payı, gelir vergisi ve damga vergisi (5510 m.80/1-a-3).
- Faiz: mevduata uygulanan en yüksek faiz (4857 m.34) veya yasal faiz.

## İşe başlatmama tazminatı

- Dayanak: 4857 m.21/1-2 ve m.21/4. İşçinin başvurusu üzerine işveren bir ay içinde işe başlatmaz ise
  mahkemece veya özel hakemce belirlenen en az 4, en çok 8 aylık ücreti tutarında tazminat; çıplak brüt
  ücret üzerinden hesaplanır (9. HD 25.11.2019, 2016/9242 E., 2019/20742 K.; 9. HD 22.06.2017,
  2017/21858 E., 2017/11169 K.).
- İşe başlatmama tazminatı = esas çıplak brüt aylık × ay sayısı (`aySayisi`: 4 ile 8 ay arası zorunlu
  yargısal parametre; `esasBrutAylik` verilmezse son çıplak brüt ücret alınır).
- Kesinti: yalnız damga vergisi (193 s.K. GVK m.25/1-1 gelir vergisi istisnası, 5510 s.K. m.80/1-b prim
  istisnası).
- Faiz: yasal faiz.

## Yıllık izin ücreti

- Dayanak: 4857 m.53 (süreler), m.59 (sona ermede son ücret üzerinden ödeme).
- Hizmet yılı dolumları ilk girişten itibaren yıl yıl; dönemler arası boşluk dolumu ileri kaydırır.
  n. yıl: n ≤ 5 ise 14, 5 < n < 15 ise 20, n ≥ 15 ise 26 gün. Dolum gününde yaş 18 ve altı ya da
  50 ve üstüyse en az 20 gün.
- Ücret = (hak edilen - kullanılan) × son çıplak (ya da girdiye göre giydirilmiş) brüt / 30.
- Kesinti: SGK, işsizlik, gelir vergisi, damga vergisi.

## Ücret alacağı

- Dayanak: 4857 s.K. m.32 (ücretin tanımı ve en geç ayda bir ödenmesi), m.34/1 (gününde ödenmeyen
  ücretler için mevduata uygulanan en yüksek faiz).
- Her dönem satırında `baslangic` ve `bitis` tek bir hizmet döneminin içinde olmalı, dönemler
  çakışmamalı. Satırda `brutAylik` verilmezse `Ucret` motorundan o dönemin çıplak brüt ücreti
  alınır ve dönem ücret değişim günlerinde kesitlere bölünür.
- Gün sayısı: satırda `gunSayisi` verilirse o sayı (ücret kesitlerine gün sayısıyla orantılı
  dağıtılarak); verilmezse varsayılan olarak dönem takvim günü (iki uç dahil), `gunKurali: tam-ay`
  ya da satırda `tamAy: true` seçilirse 1 ay 30 gün esası.
- Tutar = kuruş(kesit günü × çıplak brüt aylık / günlük bölen) - satırda ödenen brüt (`odenenBrut`).
- Kesinti: SGK, işsizlik, gelir vergisi, damga vergisi.
- Faiz: 4857 s.K. m.34/1 uyarınca `mevduat` (en yüksek mevduat faizi) ya da talebe göre `yasal`.

## İkramiye ve ilave tediye / prim alacağı

- Dayanak: 4857 s.K. m.32/2 (ücret, prim, ikramiye ve bu nitelikteki her çeşit istihkak), 6098 s.K.
  TBK m.405/1 (anlaşma, çalışma şartı veya işverenin tek taraflı taahhüdü), TBK m.405/2 (sözleşme
  ikramiye döneminden önce sona ermişse çalışılan süreye yansıyan bölümün ödenmesi, kıstelyevm).
- Satır bazlı hesap (`hesapSekli`):
  - `tutar`: kuruş(sabit brüt tutar × `calisilanOran`).
  - `gunluk`: kuruş((çıplak brüt aylık / günlük bölen) × gün sayısı × `calisilanOran`).
  - `aylik-oran`: kuruş(çıplak brüt aylık × oran × `calisilanOran`).
- `calisilanOran` verilmezse 1 (tam dönem) alınır. Satıra özel `brutAylik` verilmezse satırın
  `tarih` (veya `donem` bitiş) günündeki çıplak brüt ücret kullanılır.
- Kesinti: SGK, işsizlik, gelir vergisi, damga vergisi.
- Faiz: 4857 s.K. m.34/1 uyarınca `mevduat` ya da `yasal`.

## Fazla çalışma

- Dayanak: 4857 m.41. Haftalık 45 saati aşan çalışma; saat ücretinin yüzde elli fazlası.
- Dönem haftası = (dönem günü - düşülen gün) / 7; "tam" seçilirse aşağı yuvarlanır. Dönem, ücretin
  değiştiği günlerde kesitlere bölünür; dönem haftası ve düşülen gün kesitlere gün sayısıyla orantılı
  dağıtılır (sonuç kesit sayısına bağlı olmaz).
- Tutar = kesit haftası × haftalık fazla saat × aylık / 225 × 1,5.
- Takdiri indirim zorunlu alan.

## Hafta tatili

- Dayanak: 4857 m.46 (yedi günde kesintisiz 24 saat dinlenme). Ücret oranı kanunda yazmaz; %50 zamlı
  ödeme Yargıtay uygulaması, çarpan parametredir.
- Tutar = hafta × haftada çalışılan tatil günü × aylık / 30 × 1,5.

## UBGT

- Dayanak: 2429 s.K. (günler), 4857 m.47 (çalışılan her gün için ayrıca bir günlük ücret).
- Tutar = Σ gün × o tarihteki aylık / 30 × 1.

## Zamanaşımı kırpması (`parametreler.zamanasimi`)

- Dayanak: 6098 s.K. TBK m.147/1-1 ve 4857 s.K. m.32/8 (ücret, ikramiye, fazla çalışma, hafta tatili ve
  UBGT gibi dönemsel ücret alacaklarında 5 yıllık zamanaşımı); tazminatlar ve yıllık izin ücreti için 4857
  s.K. Ek m.3 ve Geçici m.8 (7036 s.K. m.15-16, 25.10.2017).
- Zamanaşımı hak düşürücü süre değil def'idir; yalnız ileri sürülüp mahkemece/bilirkişi görevlendirmesinde
  esas alındığında `parametreler.zamanasimi: { sinirTarihi, gerekce }` ile uygulanır.
- Ücret alacağı, fazla çalışma ve hafta tatili dönemlerinde `sinirTarihi` öncesinde kalan dönemler tamamen
  atlanır ve kalem notuna yazılır; kısmen `sinirTarihi` öncesinde kalan dönemlerde başlangıç `sinirTarihi`ne
  çekilir, `gunSayisi`, `odenenBrut`, `dislanacakGun` ve `haftaSayisi` kalan gün / ilk dönem günü oranıyla
  korunur ve kalem notuna yazılır.
- İkramiye satırlarında ve UBGT günlerinde `sinirTarihi` öncesindeki satır ve günler elenir ve kalem notuna
  yazılır.

## Takdiri indirim ve mahsup

- İndirim = kuruş(ham brüt × oran). Mahsup girdi tutarıdır. İkisi birlikteyse sıra girdide seçilir.

## Brütten nete

- SGK işçi payı ve işsizlik sigortası işçi payı brüt üzerinden (`parametreler.sgkUstSiniri: true`
  seçilmişse 5510 s.K. m.82/1-2 uyarınca ödeme tarihindeki aylık asgari ücret × `ustSinirKati` tavanıyla
  sınırlı matrah üzerinden: 2016'da 6,5 kat, 6761 s.K. m.8 ile 01.01.2017'den 7,5 kat, 7566 s.K. m.24 ve
  m.38/1-b ile 01.01.2026'dan 9 kat); gelir vergisi matrahı = brüt - ikisi; damga vergisi brüt üzerinden.
  Oranlar hesap tarihindeki tablo satırından.
- Gelir vergisi: `sabit` ya da `dilim`. Dilimde vergi = V(önceki + matrah) - V(önceki); kalemlerin
  matrahları sırayla birikir. Tarife yılın **ücret** tarifesidir (2016'dan beri ücret ve ücret dışı
  tarifeler %27 diliminin üst sınırında ayrışır).
- Kıdem: tavan içinde gelir vergisinden istisna (GVK m.25/1-7-a), prim dışı (5510 m.80/1-b), damga
  vergisine tabi. İşe başlatmama tazminatı: gelir vergisinden istisna (GVK m.25/1-1), prim dışı (5510
  m.80/1-b), yalnız damga vergisine tabi. İhbar ve kötüniyet: prim dışı, gelir ve damga vergisine tabi.
- Asgari ücret istisnası (seçimli, 2022'den): ödeme ayının asgari ücret matrahı (brüt - SGK - işsizlik)
  yıl başından kümülatif matrahla vergilendirilir, bulunan vergi GV istisnasıdır; aylık brüt asgari ücret
  × binde 7,59 DV istisnasıdır. İkisi ödeme ayında bir kez, önce ücret niteliğindeki kalemlere, kalanı
  ihbar ve kıdeme mahsup edilir. Yalnız 2022 ve sonrası vergi yıllarında. Dayanak:
  7349 s.K. (GVK m.23/1-18, 488 (2) sayılı tablo IV-34), GVGT Seri 319 m.4/5, GİB özelgesi 13.12.2023
  (ihbar ve kıdeme kalan istisnanın uygulanması). İzin ücretine istisna uygulanmasını açıkça ele alan
  özelge bulunamadı; Seri 319 ayın tüm ücret ödemelerine bir kez uygulanmasını söylüyor.

## Faiz

- Basit faiz. Başlangıç günü faize girmez, bitiş günü girer. Kesit faizi = matrah × yıllık oran × gün /
  365 (360 gün esası Yargıtay'ca hatalı sayılıyor: 8. HD 2014/9167 E., 12. HD 2010/10090 E.).
- Yasal faiz: oran tablosunun değiştiği günlerde bölünür. Temerrüt yoksa dava dilekçesindeki kısım için
  dava tarihi, ıslahla artan kısım için ıslah tarihi (7. HD 2014/70 E., 2014/9237 K.).
- Mevduat faizi (kıdemde 1475 m.14, gününde ödenmeyen ücret ve ikramiye alacaklarında 4857 m.34/1):
  başlangıç tarihindeki oran ilk yıl, her yıldönümündeki oran o yıl için sabit
  (9. HD 06.11.2025, 2025/6610 E., 2025/8609 K.; 9. HD 2021/4782 E., 2021/9481 K.). Ölçüt bir yıllık
  mevduata fiilen uygulanan en yüksek oran, özel-kamu ayrımı yok; "kamu bankalarınca" istendiyse
  taleple bağlılık (22. HD 2016/16498 E.). Kıdemde başlangıç fesih tarihi, ücret ve ikramiyede
  temerrüt ya da dava/ıslah tarihidir.
- Mevduat tablosu TCMB EVDS `TP.TRY.MT04.S` (vekil seri). Neden bu seri: "fiilen uygulanan", "en
  yüksek" ve vade kırılımı olan tek kamuya açık resmi seri. Elenenler: ağırlıklı ortalama serileri
  (ortalama), "uygulanacağı bildirilen" azami oranlar (bildirilen, fiilen uygulanan değil; 2023'te
  bitiyor), bankaların ilan tabloları (arşiv yok). Sınırı: aylık en yüksek değer, vade dilimi 1 yıla
  kadar; 9. HD 2025/6610'da bu veriyle aylık değişen oranla yapılan hesap bozulup müzekkere istendi.
- Matrah varsayılan olarak brüt alacak.

## Tablo kaynakları (22 Ekim 2026)

- Asgari ücret: 13 dönem, Asgari Ücret Tespit Komisyonu kararları (RG) ve ÇSGB belgeleri; 2024-2026
  yıl ortası artış yok (RG fihristleri taranarak).
- Kıdem tavanı: 22 dönem, Hazine ve Maliye Bakanlığı Mali ve Sosyal Haklar genelgeleri (2026 Temmuz:
  73.729,87 TL, genelge 03.07.2026).
- Gelir vergisi: GVGT Seri 290, 296, 302, 305, 310, 313, 317, 323, 324, 329, 332 (ücret tarifesi).
- Damga vergisi binde 7,59; SGK işçi %14 (MYÖ %9 + GSS %5), işsizlik %1 (2016-2026 oranı değişmedi);
  prime esas kazanç üst sınır katı (`ustSinirKati`, 5510 s.K. m.82/1): 2016'da 6,5 kat, 01.01.2017'den
  7,5 kat (6761 s.K. m.8, RG 24.11.2016/29898), 01.01.2026'dan 9 kat (7566 s.K. m.24 ve m.38/1-b, RG
  19.12.2025/33112).
- Yasal faiz: %9 (BKK 2005/9831), 01.06.2024 %24 (CBK 8485), 31.07.2026 %31 (7589 s.K. m.10 formülü).
  AYM E.2024/24, K.2025/164 iptali madde 31.07.2026'da değiştiği için işçilik alacaklarını etkilemiyor.

## Yuvarlama

- Ara değerler 40 hane duyarlıkla yürür. Rapordaki her tutar satırı (kesit, kıdem yıl/ay/gün parçası,
  faiz kesiti), indirim ve her kesinti kuruşa yarım yukarı yuvarlanır; kalem toplamı görünen satırların
  toplamıdır. Saat ve günlük ücret gibi ara değerler yuvarlanmaz, raporda dört haneyle gösterilir.
- Girdideki TL tutarları en fazla iki ondalık olabilir.
