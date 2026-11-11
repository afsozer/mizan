# mizan aile hukuku mal rejimi tasfiyesi yöntemi

Aracın edinilmiş mallara katılma rejimi tasfiyesinde (`alan: aile`) uyguladığı formüller, hukuki
tercihler ve dayanakları. Kanun maddeleri (4721 s.K. Türk Medeni Kanunu m.202-241, 4722 s.K. m.10,
3095 s.K. m.1) ve Yargıtay 2. HD / 8. HD içtihatları dayanak korpusundan doğrulanmıştır.

## Kişisel veri ve taraf adlandırma kuralı

- Eşler için kişi adı alanı açılmaz; şema kişi adı içeren alanları reddeder.
- Taraflar girdi, hesap çekirdeği, PDF raporu ve kayıt defteri satırında yalnız `davaci` ("Davacı Eş")
  ve `davali` ("Davalı Eş") olarak adlandırılır.

## Yasal mal rejimi ve tasfiye kesiti

- Dayanak: 4721 s.K. TMK m.202/1 (edinilmiş mallara katılma rejiminin yasal mal rejimi olması),
  4722 s.K. m.10/1 (01.01.2002 yürürlük sınırı), TMK m.218-222 (mal grupları ve ispat karineleri).
- Mal rejiminin sona erme anı (TMK m.225): boşanma, evliliğin iptali ya da mal ayrılığına geçiş
  davalarında **dava tarihi** (TMK m.225/2).
- Tasfiyede esas alınan malvarlığı ve değerleme anı (TMK m.228/1, m.235/1): mal rejiminin sona erdiği
  anda mevcut olan edinilmiş mallar, tasfiye (**karar**) anındaki sürüm (rayiç) değerleriyle hesaba
  katılır (Yargıtay 2. HD 12.09.2024, 2023/5107 E., 2024/5735 K.).
- 01.01.2002 tarihinden önce kurulan evliliklerde veya bu tarihten önce edinilen mallarda 4722 s.K.
  m.10/1 uyarınca rapor uyarı üretir; sözleşmeyle geçmişe etkili kabul yoksa 01.01.2002 öncesi dönem
  743 s.K. mal ayrılığı rejimine tabidir.

## Değer artış payı alacağı (TMK m.227)

- Dayanak: 4721 s.K. TMK m.227/1-3. Eşlerden biri diğerine ait bir malın edinilmesine,
  iyileştirilmesine veya korunmasına hiç ya da uygun bir karşılık almaksızın katkıda bulunmuşsa,
  tasfiye sırasında bu malda ortaya çıkan değer artışı için katkısı oranında alacak hakkına sahip olur.
- Katkı oranı ve sürüm karşılığı:
  - `katkiOrani = katkiTutari / katkiTarihiMalDegeri` (iyileştirme/koruma katkısında ayrı değer
    verilmemişse `edinmeDegeri` esas alınır).
  - `oransalDeger = katkiOrani × tasfiyeDegeri`.
- Değer kaybı tabanı (TMK m.227/1 c.son ve m.227/3):
  - Malın tasfiye anındaki sürüm değeri edinme/katkı tarihindeki değerinden düşükse (`oransalDeger < katkiTutari`),
    varsayılan kural (`degerKaybiTabani: baslangic-degeri`) gereği **katkının başlangıçtaki değeri**
    (`katkiTutari`) esas alınır (TMK m.227/1 c.son).
  - Eşler yazılı anlaşmayla değer kaybına katılmayı kararlaştırmışsa (TMK m.227/3), açık hukuki tercih
    parametresi (`degerKaybiTabani: surum-orani`) ve zorunlu `degerKaybiGerekcesi` ile `oransalDeger`
    uygulanır.
- Edinilmiş mala yapılan diğer eş katkısından doğan değer artış payı alacağı, malik eşin artık değer
  hesabında pasif (borç) olarak düşülür (TMK m.231/1); kişisel mala yapılan katkıdan doğan değer artış
  payı alacağı ise doğrudan alacaklı eşin alacağına eklenir, artık değerden mükerrer düşülmez.

## Krediyle alınan mallarda oranlama (TMK m.219, m.227, m.230, m.231)

- Dayanak: 4721 s.K. TMK m.219, m.227, m.230, m.231; Yargıtay 8. HD 19.11.2018, 2016/18180 E.,
  2018/18803 K.; Yargıtay 2. HD yerleşik kredi oranlama ilkeleri.
- Edinme değeri (`edinmeDegeri`) içinde peşinatlar ve çekilen kredi ayrıştırılır:
  - `cekilenKredi = edinmeDegeri - (digerEsKisiselPesinat + malikKisiselPesinat + edinilmisPesinat)`
    (veya girdide açıkça verilen `cekilenKredi`).
  - `krediPayOrani = cekilenKredi / edinmeDegeri`.
- Kredi ödemelerinin evlilik içi ve evlilik sonrası (mal rejiminin sona ermesinden sonraki) dağılımı:
  - `toplamKrediOdemesi = evlilikIciOdenen + evlilikSonrasiOdenen + digerEsKisiselKrediOdemesi`.
  - Evlilik içinde edinilmiş mallardan ödenen kredi kesiminin maldaki oranı:
    `krediEdinilmisOrani = krediPayOrani × (evlilikIciOdenen / toplamKrediOdemesi)`.
  - Mal rejimi sona erdikten sonra ödenen veya kalan kredi borcunun maldaki oranı (TMK m.230/2, m.231):
    `krediEvlilikSonrasiOrani = krediPayOrani × (evlilikSonrasiOdenen / toplamKrediOdemesi)`.
  - Diğer eşin kişisel malından ödenen peşinat ve kredi taksitlerinin maldaki oranı (TMK m.227):
    `digerEsKisiselOrani = (digerEsKisiselPesinat / edinmeDegeri) + krediPayOrani × (digerEsKisiselKrediOdemesi / toplamKrediOdemesi)`.
  - Malik eşin kişisel peşinatının maldaki oranı (TMK m.230):
    `malikKisiselOrani = malikKisiselPesinat / edinmeDegeri`.
- Tasfiye değerine (`tasfiyeDegeri`) uygulanması:
  - Diğer eşin değer artış payı alacağı = `kuruş(digerEsKisiselOrani × tasfiyeDegeri)` (değer kaybı
    halinde TMK m.227/1 c.son taban kontrolüyle).
  - Malik kişisel kesim değeri = `kuruş(malikKisiselOrani × tasfiyeDegeri)`.
  - Evlilik sonrası kredi borcu / kişisel kesim = `kuruş(krediEvlilikSonrasiOrani × tasfiyeDegeri)`.
  - Artık değere geçen net edinilmiş mal değeri = `max(0, tasfiyeDegeri - malikKisiselKesim - evlilikSonrasiKrediKesimi - malaIliskinBorc)`.
    (Diğer eşin değer artış payı alacağı TMK m.231/1 uyarınca artık değer tablosunda ayrıca borç olarak
    düşüldüğünden malın net edinilmiş değerinden ikinci kez düşülmez.)

## Eklenecek değerler (TMK m.229) ve denkleştirme (TMK m.230)

- Eklenecek değerler (TMK m.229, m.235/2):
  1. Eşlerden birinin mal rejiminin sona ermesinden önceki bir yıl içinde diğer eşin rızası olmadan,
     olağan hediyeler dışında yaptığı karşılıksız kazandırmalar (`son-bir-yil-bagis`, TMK m.229/1-1).
  2. Bir eşin mal rejiminin devamı süresince diğer eşin katılma alacağını azaltmak kastıyla yaptığı
     devirler (`katilma-alacagini-azaltma-kasti`, TMK m.229/1-2).
  - Devredilen malın **tasfiye (karar) tarihindeki** değeri (devir tarihindeki durumu gözetilerek,
    TMK m.235/2) ilgili eşin artık değer hesabına aktif olarak eklenir.
- Denkleştirme (TMK m.230):
  - Bir eşin kişisel mallara ilişkin borçları edinilmiş mallardan ödenmişse (`edinilmisten-kisisele`),
    edinilmiş mallar lehine denkleştirme alacağı doğar ve artık değere eklenir (`+`).
  - Edinilmiş mallara ilişkin borçlar kişisel mallardan ödenmişse (`kisiselden-edinilmise`),
    edinilmiş mallar aleyhine denkleştirme borcu doğar ve artık değerden düşülür (`-`).
  - Doğrudan borç ödemelerinde sabit `tutar` (TMK m.230/1); diğer mal kesiminin edinilmesine,
    iyileştirilmesine veya korunmasına katkıda bulunulmuşsa değer artışı veya azalması oranında
    `kuruş((katkiTutari / edinmeDegeri) × tasfiyeDegeri)` (TMK m.230/3) uygulanır.

## Artık değer ve eksi bakiye kuralı (TMK m.231)

- Dayanak: 4721 s.K. TMK m.231/1-2; Yargıtay 8. HD 30.04.2019, 2018/12806 E., 2019/4484 K.
- Her eş için ayrı ayrı:
  - `hamArtikDeger = (edinilmisMallarToplami + eklenecekDegerlerToplami + denklestirmeEklenen) - (denklestirmeDusulen + digerEsDegerArtisPayiBorcu)`.
  - `artikDeger = max(0, hamArtikDeger)`.
- **TMK m.231/2 kuralı:** Artık değer eksi (`hamArtikDeger < 0`) çıkarsa bu eksi bakiye dikkate alınmaz,
  artık değer `0,00 TL` kabul edilir ve diğer eşe borç olarak yüklenemez.

## Katılma alacağı, hakkaniyet indirimi ve takas (TMK m.236, m.237, m.239)

- Yasal ve sözleşmesel katılma payı (TMK m.236/1, m.237):
  - Her eş, diğer eşe ait artık değerin yarısı (`0.50`) üzerinde hak sahibi olur (`hamKatilmaAlacagi = kuruş(karsiEsArtikDegeri × 0.50)`).
  - Mal rejimi sözleşmesiyle başka bir esas kabul edilmişse (TMK m.237/1), `parametreler.katilmaOrani`
    ve zorunlu `gerekce` ile sözleşmesel oran uygulanır.
- Zina veya hayata kast nedeniyle hakkaniyet indirimi / kaldırılması (TMK m.236/2):
  - Zina (TMK m.161) veya hayata kast (TMK m.162) nedeniyle boşanma halinde hakim, kusurlu eşin
    artık değerdeki pay oranının hakkaniyete uygun olarak azaltılmasına veya kaldırılmasına karar
    verebilir (`parametreler.hakkaniyetIndirimi`).
  - **Kapsam sınırı:** Yargıtay 8. HD yerleşik içtihadı (30.11.2015, 2014/12512 E., 2015/21469 K.;
    13.02.2019, 2017/4334 E., 2019/1407 K.) uyarınca TMK m.236/2 yalnız **artık değere katılma
    alacağına (TMK m.236)** uygulanır; kusurlu eşin **değer artış payı alacağını (TMK m.227)**
    etkilemez.
- Takas (TMK m.236/1 c.2, TBK m.139):
  - Alacaklar takas edilir. Varsayılan `takasKapsami: tum-alacaklar` tercihinde eşlerin karşılıklı
    katılma alacakları ile değer artış payı alacakları birlikte netleştirilir; `yalniz-katilma`
    tercihinde yalnız karşılıklı katılma alacakları takas edilir.

## Yasal faiz (TMK m.239/3, 3095 s.K. m.1)

- Dayanak: 4721 s.K. TMK m.239/3; 3095 s.K. m.1; Yargıtay 8. HD 30.05.2018, 2016/1104 E., 2018/13401 K.
- Aksine anlaşma yoksa tasfiyenin sona ermesinden (**tasfiye/karar tarihinden**) başlayarak katılma
  alacağına ve değer artış payına yasal faiz yürütülür (`data/yasal-faiz.json` dönemleriyle).
- Değer artış payı alacağında mahkeme veya talep tercihine göre dava tarihinden (`baslangicEsasi: dava-tarihi`)
  veya özel temerrüt/bozma öncesi karar tarihinden (`baslangicEsasi: ozel-tarih`) faiz yürütülmesi
  açık hukuki tercih parametresi ve zorunlu gerekçeyle desteklenir.
- Tasfiye (karar) tarihi ile faiz bitiş tarihi aynı günse işlemiş gün `0` olduğundan faiz `0,00 TL`
  hesaplanır; karar sonrası hesap tarihine kadar geçen sürede 3095 s.K. m.1 dönem oranlarıyla
  (`matrah × yıllık oran × gün / 365`) basit faiz hesaplanır.

## Yuvarlama

- Ara değerler ve katkı oranları (`katkiTutari / edinmeDegeri`) 40 hane `Decimal` duyarlığıyla yürür;
  ara oran yuvarlanmaz.
- Her malın değer artış payı alacağı, kişisel kesimi, net edinilmiş değeri, artık değer bileşenleri,
  katılma alacağı ve faiz kesitleri kuruşa yarım yukarı (`ROUND_HALF_UP`) yuvarlanır.
