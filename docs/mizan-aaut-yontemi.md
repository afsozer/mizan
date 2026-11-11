# mizan AAÜT Vekalet Ücreti Hesap Yöntemi

Bu belge, `mizan` aracının **Avukatlık Asgari Ücret Tarifesi (AAÜT)** kapsamında karşı yan (yasal)
vekalet ücretini hangi kanuni dayanaklarla, hangi tarife tablolarıyla ve hangi matematiksel kurallarla
hesapladığını açıklar.

## 1. Hukuki Dayanak ve Zaman Bakımından Uygulama (AAÜT m.21)

- **1136 sayılı Avukatlık Kanunu m.164 ve m.168**: Mahkemelerce, icra ve iflas dairelerince veya diğer
  resmi mercilerce karşı tarafa yükletilecek avukatlık ücreti, Türkiye Barolar Birliği tarafından
  hazırlanıp Resmi Gazete'de yayımlanan Avukatlık Asgari Ücret Tarifesine göre takdir olunur.
- **6100 sayılı Hukuk Muhakemeleri Kanunu (HMK) m.326**: Yargılama gideri olan karşı vekalet ücreti,
  aleyhine hüküm verilen (haksız çıkan) tarafa yükletilir; davada iki taraf da kısmen haklı çıkarsa
  haklılık oranına göre taraflar lehine ayrı ayrı hesaplanır.
- **AAÜT m.21**: Avukatlık ücretinin takdirinde, hukuki yardımın tamamlandığı veya davada hükmün
  verildiği tarihte yürürlükte olan tarife esas alınır. `mizan`, girdideki `hesapTarihi` alanını bu
  hüküm uyarınca kullanarak yürürlükteki tarife dönemini (`data/aaut.json`) otomatik seçer.

## 2. Doğrulanmış Resmi Gazete Tarifeleri (`data/aaut.json`)

| Tarife Dönemi | Yürürlük Aralığı | Resmi Gazete Tarih / Sayı |
|---|---|---|
| 2024-2025 AAÜT | `2024-10-03` .. `2025-11-03` | 03.10.2024 / 32681 |
| 2025-2026 AAÜT | `2025-11-04` .. `2026-11-02` | 04.11.2025 / 33067 (RG 08.01.2026 / 33131 değişikliği dahil) |
| 2026-2027 AAÜT | `2026-11-03` .. açık uçlu | 03.11.2026 / 33419 |

### 2.1. Üçüncü Kısım Kademeli Nispi Dilimler

Konusu para olan veya para ile değerlendirilebilen işlerde avukatlık ücreti, matrahın dilimlere
bölünmesiyle kademeli olarak hesaplanır:

| Kademe | 2024-2025 Dilim (Oran) | 2025-2026 Dilim (Oran) | 2026-2027 Dilim (Oran) |
|---|---|---|---|
| 1. dilim | İlk 400.000 TL (%16) | İlk 600.000 TL (%16) | İlk 800.000 TL (%16) |
| 2. dilim | Sonra gelen 400.000 TL (%15) | Sonra gelen 600.000 TL (%15) | Sonra gelen 800.000 TL (%15) |
| 3. dilim | Sonra gelen 800.000 TL (%14) | Sonra gelen 1.200.000 TL (%14) | Sonra gelen 1.600.000 TL (%14) |
| 4. dilim | Sonra gelen 1.200.000 TL (%11) | Sonra gelen 1.200.000 TL (%13) | Sonra gelen 1.600.000 TL (%13) |
| 5. dilim | Sonra gelen 1.600.000 TL (%8) | Sonra gelen 1.800.000 TL (%11) | Sonra gelen 2.400.000 TL (%11) |
| 6. dilim | Sonra gelen 2.000.000 TL (%5) | Sonra gelen 2.400.000 TL (%8) | Sonra gelen 3.200.000 TL (%8) |
| 7. dilim | Sonra gelen 2.400.000 TL (%3) | Sonra gelen 3.000.000 TL (%5) | Sonra gelen 4.000.000 TL (%5) |
| 8. dilim | Sonra gelen 2.800.000 TL (%2) | Sonra gelen 3.600.000 TL (%3) | Sonra gelen 4.800.000 TL (%3) |
| 9. dilim | 11.600.000 TL'den yukarısı (%1) | Sonra gelen 4.200.000 TL (%2) | Sonra gelen 5.600.000 TL (%2) |
| 10. dilim | - | 18.600.000 TL'den yukarısı (%1) | 24.800.000 TL'den yukarısı (%1) |

### 2.2. İkinci Kısım İkinci Bölüm Başlıca Maktu Ücretler (TL)

| Yargı / Takip Mercii (`merci`) | 2024-2025 | 2025-2026 | 2026-2027 |
|---|---|---|---|
| İcra Dairesi (`icra-dairesi`) | 6.000 | 9.000 | 12.500 |
| İcra Mahkemesi İş (`icra-mahkemesi-is`) | 7.000 | 11.000 | 15.000 |
| İcra Mahkemesi Dava / Duruşmalı (`icra-mahkemesi-dava`, `icra-mahkemesi-istihkak`) | 12.000 | 18.000 | 23.000 |
| Sulh Hukuk Mahkemesi (`sulh-hukuk`) | 18.000 | 30.000 | 40.000 |
| Tüketici Mahkemesi (`tuketici`) | 15.000 | 22.500 | 30.000 |
| Asliye / İş / Aile / Ticaret Mahkemeleri (`asliye-hukuk`, `is`, `aile`, `asliye-ticaret`) | 30.000 | 45.000 | 62.000 |
| Fikri ve Sınai Haklar Mahkemesi (`fikri-sinai`) | 40.000 | 55.000 | 70.000 |
| İdare ve Vergi Mahkemeleri - Duruşmasız (`idare-vergi-durusmasiz`) | 18.000 | 30.000 | 40.000 |
| İdare ve Vergi Mahkemeleri - Duruşmalı (`idare-vergi-durusmali`) | 36.000 | 40.000 | 52.000 |
| Ağır Ceza Mahkemesi (`agir-ceza`) | 48.000 | 65.000 | 86.000 |

## 3. Hesaplama Kuralları

1. **Kademeli Nispi Hesap (Üçüncü Kısım)**:
   Kabul edilen (`kabulTutari`) veya reddedilen (`retTutari`) tutar sırasıyla dilimlere dağıtılır;
   her dilimin ücreti kuruş hassasiyetinde hesaplanarak toplanır.
2. **Maktu Alt Sınır ve İcra Mahkemesi İstihkak İstisnası (AAÜT m.13/1, m.11/1, m.11/3)**:
   - Üçüncü kısma göre hesaplanan nispi ücret, İkinci Kısım İkinci Bölümde ilgili mahkeme veya icra
     dairesi için öngörülen maktu ücretten az olamaz.
   - İcra mahkemelerinde (`icra-mahkemesi-is` ve `icra-mahkemesi-dava`) nispi ücret maktu miktarı
     geçemez (`AAÜT m.11/3 c.2`); ancak icra mahkemelerinde açılan **istihkak davalarında**
     (`icra-mahkemesi-istihkak`) Üçüncü Kısım gereğince tam nispi avukatlık ücretine hükmolunur
     (`AAÜT m.11/3 c.3`).
3. **Müddeabih / Takipte Kesinleşen Miktar (Asıl Alacak) Üst Sınırı (AAÜT m.13/2 ve m.11/1)**:
   Hükmedilen vekalet ücreti, davada kabul veya reddedilen müddeabih tutarını, icra takiplerinde ise
   takipte kesinleşen miktarı (2026-2027 öncesi tarifelerde asıl alacağı) geçemez.
4. **Kısmi Kabul / Kısmi Ret (HMK m.326, AAÜT m.13)**:
   Davanın kısmen kabulü ve kısmen reddi halinde:
   - Davacı vekili lehine `kabulTutari` üzerinden,
   - Davalı vekili lehine `retTutari` üzerinden
   ayrı ayrı karşı vekalet ücreti hesaplanır (icra dairesi takiplerinde kısmi ret ve borçlu lehine
   karşı vekalet ücreti uygulanmaz).
5. **Manevi ve Maddi Tazminat Özel Kuralları (AAÜT m.10 ve m.13/3-4)**:
   - **Manevi tazminat (`nitelik: manevi-tazminat`)**:
     - Anayasa Mahkemesi'nin **25.12.2024 tarihli ve E.2024/29, K.2024/226** sayılı kararıyla
       (RG 14.03.2025 / 32841, yürürlük tarihi **14.12.2025**) HMK m.326/2 manevi tazminat davaları
       yönünden iptal edilmiş ve **08.01.2026 tarihli, 33131 sayılı RG** ile `AAÜT m.10/2`
       yürürlükten kaldırılmıştır (2026-2027 AAÜT m.10'da da yer almamaktadır). Bu nedenle
       `hesapTarihi >= 2025-12-14` olan manevi tazminat davalarının **kısmen reddinde** davalı vekili
       lehine karşı vekalet ücretine **hükmedilemez (`0,00 TL`)**; `hesapTarihi < 2025-12-14` olan
       kararlarda ise mülga `AAÜT m.10/2` uyarınca davalı vekalet ücreti davacı vekili lehine
       belirlenen ücreti geçemez.
     - Manevi tazminat davasının **tamamen reddinde** (`kabulTutari = 0`) davalı vekili yararına
       İkinci Kısım İkinci Bölüme göre **maktu** ücrete hükmolunur (`AAÜT m.10`).
   - **Maddi tazminat (`nitelik: maddi-tazminat`)**:
     - **Kısmen ret** halinde davalı vekili yararına hükmedilecek ücret, davacı vekili lehine
       belirlenen ücreti geçemez (`AAÜT m.13/3`).
     - **Tamamen ret** (`kabulTutari = 0`) halinde davalı vekili yararına İkinci Kısım İkinci Bölüme
       göre **maktu** ücrete hükmolunur (`AAÜT m.13/4`).
6. **Nafaka Davaları Özel Kuralı (AAÜT m.9/1-2)**:
   `nitelik: nafaka` seçildiğinde, esas tutar olarak **bir yıllık (12 aylık) nafaka bedeli** üzerinden
   Üçüncü Kısım gereğince nispi ücret hesaplanır (`AAÜT m.9/1`); reddedilen kısım için davalı lehine
   vekalet ücretine hükmedilemez (`0,00 TL`, `AAÜT m.9/2`).
7. **İndirimli Aşamalar (AAÜT m.6, m.15 ve m.11/4)**:
   - `asama: on-inceleme-oncesi`: Ön inceleme tutanağı imzalanıncaya kadar (idari yargıda birinci
     savunma dilekçesi süresinin bitimine kadar) feragat, kabul, sulh veya konusuz kalma nedeniyle
     anlaşmazlık giderilirse tarife hükümleriyle belirlenen ücretin **yarısına (1/2)** hükmolunur.
   - `asama: odeme-suresi-icinde`: İcra dairelerinde borçlu ödeme süresi içinde borcunu öderse
     tarifeye göre belirlenecek ücretin **dörtte üçü (3/4)** takdir olunur (ancak takipte kesinleşen
     miktarı / asıl alacağı geçemez).
