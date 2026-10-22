# Tablolar

Her dosya aynı yapıdadır:

```json
{
  "tablo": "asgari-ucret",
  "ad": "Asgari ücret",
  "aciklama": "...",
  "dogrulamaTarihi": "2026-10-22",
  "satirlar": [
    {
      "baslangic": "2026-01-01",
      "bitis": null,
      "brutAylik": "...",
      "brutGunluk": "...",
      "kaynak": {
        "ad": "Asgari Ücret Tespit Komisyonu Kararı",
        "url": "https://www.resmigazete.gov.tr/...",
        "resmiGazete": { "tarih": "YYYY-AA-GG", "sayi": "..." },
        "dogrulama": "Değerin kaynağın neresinden okunduğu"
      }
    }
  ]
}
```

- Tutarlar ve oranlar metin olarak, nokta ondalık ayırıcıyla yazılır (`"0.15"`, `"20002.50"`).
  Hesap decimal.js ile yapılır; kayan nokta hatası olmaz.
- Satırlar tarih sırasında, boşluksuz ve çakışmasız olmalı: bir satırın `bitis`inin ertesi günü
  sonraki satırın `baslangic`ıdır. Yalnız son satırın `bitis`i `null` olabilir.
- `kaynak.url` ya da `kaynak.belge` (ör. "Ziraat Bankası yazısı, UYAP evrak tarihi 12.03.2026")
  zorunludur. `kaynak.dogrulama` değerin kaynakta nerede görüldüğünü yazar.
- Dönemi belli bir araçtan gelen son satırın `bitis`i o dönemin sonudur (ör. 2026 asgari ücret kararı
  için 2026-12-31); sonrası sorulursa hesap durur ve tablonun güncellenmesini ister. Yalnız kanunla
  belirlenen, bitişi olmayan oranlarda (SGK, damga) son satır açık uçlu (`null`) bırakılır.
- `dogrulamaTarihi`: tablonun resmi kaynaktan en son kontrol edildiği gün. Açık uçlu son satır bu
  günden sonrası için de kullanılır ama rapora uyarı düşer.

## Güncelleme

1. Yeni dönemi resmi kaynaktan oku (Resmi Gazete, ilgili bakanlık ya da kurum sayfası).
2. Son satırın `bitis`ini yeni dönemin bir gün öncesine çek, yeni satırı kaynağıyla ekle.
3. Değişiklik yoksa bile kontrol ettiğin günü `dogrulamaTarihi`ne yaz.
4. `node bin/mizan.ts tablolar` ile denetle, `npm test` çalıştır.

## Tabloya özgü notlar

- `asgari-ucret.json`: kararlar günlük brüt tutarı belirler, aylık brüt ÇSGB belgesinden alınır.
  Yeni yıl kararı çıkınca önceki satırın `bitis`i 31 Aralık yapılır.
- `kidem-tavani.json`: Hazine ve Maliye Bakanlığının Ocak ve Temmuz "Mali ve Sosyal Haklara İlişkin
  Genelge"si (hmb.gov.tr duyuruları). Resmi Gazete'de yayımlanmaz. Yıl içinde genelge yenilenirse
  (2022 ve 2023 Ocak'ta olduğu gibi) yürürlükteki son genelge esas alınır.
- `gelir-vergisi.json`: her yılın Gelir Vergisi Genel Tebliğindeki **ücret** tarifesi.
- `yasal-faiz.json`: 31.07.2026'dan itibaren oran kanundaki formülden bulunur (önceki yılın 31 Aralık
  reeskont oranının %80'i; 30 Haziran oranı 5 puan ya da daha fazla farklıysa ikinci yarıda onun %80'i).
  2027 satırı, TCMB'nin 31.12.2026 reeskont oranı belli olunca eklenir.
- `mevduat-faizi*.json`: `node scripts/mevduat-guncelle.ts` ile çekilir. EVDS değeri ayın tamamında
  görülen en yüksek orandır ve ertesi ayın sonlarına doğru yayımlanır; son ay tablonun son satırıdır.

## Banka yazısından mevduat faizi tablosu

Yargıtay'ın tarif ettiği yol bankalara müzekkere yazılmasıdır. Gelen oranlar aynı biçimde ayrı bir
dosyaya yazılır ve girdide `tablolar: { mevduatFaizi: ./banka-yazisi.json }` ile verilir. Yol, girdi
dosyasının bulunduğu dizine göredir. Araç yıldönümü yönteminde yalnız fesih tarihindeki ve her
yıldönümündeki oranı okur. Satırlar yine boşluksuz olmalı; en kolayı her satırı bir faiz yılı yapmaktır
(fesih tarihinden ilk yıldönümünün bir gün öncesine, sonra yıldönümünden yıldönümüne).

```json
{
  "tablo": "mevduat-faizi-banka",
  "ad": "Bir yıllık mevduata uygulanan en yüksek faiz (banka yazısı)",
  "dogrulamaTarihi": "YYYY-AA-GG",
  "satirlar": [
    {
      "baslangic": "YYYY-AA-GG",
      "bitis": "YYYY-AA-GG",
      "oran": "...",
      "kaynak": {
        "ad": "... Bankası yazısı",
        "belge": "UYAP evrak tarihi GG.AA.YYYY, ... sayılı",
        "dogrulama": "Yazının ... sayfasındaki tablodan okundu"
      }
    }
  ]
}
```
