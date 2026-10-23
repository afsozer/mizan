# mizan web arayüzü

Preact ve Vite ile tarayıcıda çalışan faz 1b arayüzü. Hesap, girdi denetimi, kaynak tablolarının
kurulması ve rapor tanımı yalnız `../src/index.ts` üzerinden kullanılır. Çekirdek dosyalarında
arayüz için hesap mantığı eklenmez.

## Çalıştırma

Depo kökünde:

```sh
npm run web:dev
npm run web:build
npm run web:preview
npx tsc --noEmit -p web
npx tsc --noEmit -p .
npm test
node --test web/tests/*.test.ts
```

Vite kökü `web/`, dağıtım çıktısı `web/dist/` olur; çıktı git dışında tutulur. Varsayılan geliştirme
sunucusu yalnız `127.0.0.1` adresini dinler. SHA-256 için localhost veya HTTPS gerekir. Alt dizine
kurulum için kaynak adresleri göreli üretilir. PDF motoru ve Roboto vfs yalnız rapor istendiğinde,
uygulamanın kendi dağıtım dosyalarından yüklenir. Yeni paket eklenmedi.

## Dosyalar

- `index.html`: Türkçe giriş belgesi ve dış bağlantı isteklerini kısıtlayan CSP.
- `vite.config.ts`: Preact, kök dizin, göreli dağıtım ve derleme anındaki sürüm/commit bilgisi.
- `tsconfig.json`, `.gitignore`: bağımsız strict tip denetimi ve derleme çıktısı kuralı.
- `src/main.tsx`, `src/App.tsx`: uygulama girişi, gezinme ve bellekteki ihtimaller.
- `src/form-model.ts`: saf form nesnesi kurma, alan düzenleme ve YAML dönüşümü.
- `src/schema.ts`: alan etiketleri, seçimler, görünür varsayılanlar ve tekrar eden satırların yapısı.
- `src/Form.tsx`: etiketli alanlar, listeler, isteğe bağlı gruplar ve alana bağlı hata gösterimi.
- `src/Results.tsx`: brüt/net/faiz, hesap ayrıntıları, kesintiler, tercihler, kaynaklar ve uyarılar.
- `src/tables.ts`: gömülü JSON metinleri, SHA-256 ve çekirdek üzerinden tablo kurma.
- `src/TablesView.tsx`: tablo satırları, doğrulama kayıtları ve kullanıcı banka tablosu aktarımı.
- `src/exports.ts`: PDF, YAML, indirme ve raporda kullanılan sürüm bilgisi.
- `src/env.d.ts`, `src/pdfmake.d.ts`: derleme sabiti ve kurulu pdfmake tarayıcı paketinin tipleri.
- `src/style.css`: kağıt/mürekkep/bakır renkleri, sistem serif başlıklar, tablo rakamları ve iki tema.
- `tests/form-model.test.ts`: örnek girdinin kayıpsız aktarımı, boş hukuki tercihler, sıfır/false,
  bağımsız ihtimaller, dönem satırları ve hata yolları.

Kök `package.json` dosyasına yalnız `web:dev`, `web:build`, `web:preview` komutları eklendi.
Başlangıçta worktree içinde bulunan çekirdek, test ve bağımlılık değişikliklerine dokunulmadı.

## Kullanım

1. Boş hesapla başlayın veya **Örnek hesap yükle** ile kurgusal hesabı açın. Dosya, hizmet, ücret,
   esaslar ve kalemler adımlarını doldurun. Zorunlu hukuki tercihler boş başlar. İndirim yoksa
   oranı açıkça `0` girip gerekçesini yazın. Varsayılan esaslar değiştirilmedikçe YAML'a eklenmez;
   raporda çekirdeğin `varsayılan` kaydı korunur.
2. Geçerli girdide hesap özeti anında yenilenir. Hatalı girdide önceki toplam gösterilmez.
   **İlgili alana git** ilgili adımı açar ve alanı odaklar. Çekirdek tek hata döndürdüğü için
   eksikler sırayla gösterilir. Kalemlerin tercih grupları ve sonuç ayrıntıları ayrı açılıp kapanır.
3. **İhtimali kopyala** seçili formun bağımsız kopyasını açar. **İhtimaller** ekranında ad verin,
   kopyayı düzenleyin ve brüt/net/faiz toplamlarını yan yana inceleyin.
4. **Rapor ve kayıt** bölümünden PDF ve YAML indirin veya defter satırını kopyalayın. Panoya
   erişilemiyorsa satır seçilebilir metin olarak açılır. PDF ve defter adı çekirdek API'den gelir.
   PDF'nin girdi SHA-256 değeri, arayüzden indirilen YAML'ın tam metnidir; özgün yüklenen dosyanın
   yorum ve boşlukları korunmaz. Üretim zamanı ve dosya tarihi İstanbul saatine göredir.
5. **Tablolar** bölümünde sekiz paket tablosunu ve kaynaklarını inceleyin. Mevduat satırı olan
   hesapta tüm bankalar/kamu bankaları seçilebilir. Kendi banka yazısı JSON dosyanızı yükleyebilir,
   bu tabloyu ayrıca seçebilirsiniz. JSON çekirdeğin `tablolariKur` denetiminden geçirilir; dosyanın
   tam metni hash'lenir. YAML'daki banka yolu, yüklenen JSON'ın dosya adıyla eşleştirilir.

Veriler, ihtimaller ve banka yazıları yalnız bellekte tutulur; localStorage, IndexedDB veya sunucuya
kayıt yoktur. Her ihtimali ayrı YAML olarak indirin. Kendi banka tablosunu kullandıysanız JSON'ı da
saklayın ve sonraki oturumda yeniden yükleyin. Kaynak bağlantıları yalnız kullanıcı tıklayınca
harici sayfa açar; uygulamada CDN, analitik, uzaktan font veya veri API'si bulunmaz. Sekme kapanışı
öncesinde doldurulmuş hesap için tarayıcının standart ayrılma uyarısı istenir.

## Doğrulama ve kalan kontrol

- Üretim derlemesi, web ve kök tip denetimi, mevcut 42 çekirdek testi ve 5 web testi geçti.
- Örnek hesabın form/YAML dönüşümü çekirdeğin doğrudan YAML çözümlemesiyle eşit.
- pdfmake'in **tarayıcı paketi** ve yerel Roboto vfs ile örnek rapor üretildi: 97.747 bayt,
  `application/pdf`, `%PDF-1.3` başlığı. Örnek brüt 552.872,22 TL, net 472.071,94 TL,
  faiz 47.905,57 TL. Bu kontrol tarayıcı indirme etkileşimini kapsamaz.
- `tasarim-denetimi` metin betiği hata vermedi. Renk tanımları üzerinden hesaplanan en düşük
  metin kontrastı 4,95:1, giriş sınırı kontrastı 3,57:1. Devre dışı öğeler bu ölçüme dahil değil.
- Bu oturumda sunucu dinleme `EPERM` ile engellendi; Chrome denetim aracı izin politikası nedeniyle
  kullanılamadı. Yerel `file://` önizlemesini de tarayıcı güvenlik politikası engelledi. Bu yüzden
  ekran görüntüsüyle tasarım kapısı, gerçek 375 px taşma ölçümü, klavye gezintisi, dosya seçici,
  pano ve PDF indirme etkileşimleri doğrulanamadı. Responsive CSS bu durumlar için yazıldı;
  görsel denetim tamamlanmış sayılmıyor.
- Vite, pdfmake ve Roboto parçalarının 500 kB üstünde olması için boyut uyarısı veriyor. Bu parçalar
  yalnız PDF istendiğinde yüklenir; derlemeyi engellemez. Kurulu bağımlılıklar yeterli.

Yerel incelemede: örneği yükleyin, bir hizmet dönemi ekleyip ihbar dönem esasını seçmeden sonucu
engellediğini görün; kopyada bu tercihi değiştirin; YAML indirip yeniden yükleyin; kamu mevduatını
ve bir banka JSON'ını seçin; PDF indirin ve defter satırını kopyalayın. 375 px ve geniş ekranda,
aydınlık/karanlık temalarda, klavyeyle ve açık uzun tablolarla kontrol edin.

## Çekirdek API notları

Hesap ve rapor için gerekli dışa aktarımlar yeterliydi; çekirdeğe ekleme yapılmadı. Alan tabanlı
arayüz için iki geliştirme yararlı olur: `girdiCoz` hatalarının serbest metin yerine yapılandırılmış
alan yolu ve hata listesi döndürmesi; alanların zorunluluk, seçenek ve varsayılan açıklamalarının
arayüzce okunabilir şema metadatası olarak sunulması. Şu an alan yolu mevcut hata metninden
çıkarılıyor; yol taşımayan hesap hataları sonuç panelinde gösteriliyor. UI şeması çekirdekteki
alanlarla birlikte güncel tutulmalı.
