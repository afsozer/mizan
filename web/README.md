# mizan web arayüzü

Preact ve Vite ile tarayıcıda çalışan yerel hesap arayüzü. İşçilik alacakları (`iscilik`), icra
takibi ve harç (`icra`), AAÜT vekalet ücreti (`aaut`) ve aile hukuku mal rejimi tasfiyesi (`aile`)
hesap alanlarını tek çalışma şeridindeki **Hesap alanı** seçicisi altında birleştirir; dışarıdan
yüklenen YAML dosyalarında `alan` anahtarını algılayarak ilgili görünüme kendiliğinden geçer. Hesap,
girdi denetimi, kaynak tablolarının kurulması ve rapor tanımı yalnız `../src/index.ts` üzerinden
kullanılır. Çekirdek dosyalarında arayüz için hesap mantığı eklenmez.

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

### GitHub Actions ve GitHub Pages dağıtımı

- `.github/workflows/ci.yml` iş akışı her `push` ve `pull_request` tetiklemesinde Node 24 ile
  `npm ci`, `npm run typecheck`, `npx tsc --noEmit -p web`, `npm test`, `npm run web:build`,
  `node bin/mizan.ts tablolar` ve yazım kuralı denetimini çalıştırır.
- `.github/workflows/pages.yml` iş akışı `main` dalına `push` edildiğinde veya `workflow_dispatch`
  ile elle tetiklendiğinde tam git geçmişiyle (`fetch-depth: 0`, rapora gerçek commit özetinin
  gömülmesi için) `web/dist` paketini derler ve `actions/deploy-pages@v4` ile yayınlar.
- GitHub üzerinde canlı yayın (`https://afsozer.github.io/mizan/`) için depo ayarlarında
  **Settings > Pages > Source: GitHub Actions** seçilmesi yeterlidir. `vite.config.ts` içindeki
  `base: './'` ayarı sayesinde tüm betik, stil ve dinamik PDF/font parçaları alt dizinde göreli
  yüklenir; `/__mizan/durum` kontrolü statik yayında sessizce `false` döndüğünden yerel sunucu
  kapatma düğmesi görünmez.

## Dosyalar

- `index.html`: Türkçe giriş belgesi ve dış bağlantı isteklerini kısıtlayan CSP.
- `vite.config.ts`: Preact, kök dizin, göreli dağıtım ve derleme anındaki sürüm/commit bilgisi.
- `tsconfig.json`, `.gitignore`: bağımsız strict tip denetimi ve derleme çıktısı kuralı.
- `src/main.tsx`, `src/App.tsx`: uygulama girişi, 4 hesap alanı gezinmesi (`iscilik`, `icra`, `aaut`, `aile`) ve bellekteki ihtimaller.
- `src/IcraPanel.tsx`: icra takibi kapak hesabı, harç ve TBK m.100 kısmi ödeme çalışma alanı.
- `src/form-model.ts`: saf form nesnesi kurma, alan düzenleme ve YAML dönüşümü.
- `src/schema.ts`: alan etiketleri, seçimler, görünür varsayılanlar ve tekrar eden satırların yapısı.
- `src/Form.tsx`: etiketli alanlar, listeler, isteğe bağlı gruplar ve alana bağlı hata gösterimi.
- `src/Results.tsx`: brüt/net/faiz, hesap ayrıntıları, kesintiler, tercihler, kaynaklar ve uyarılar.
- `src/tables.ts`: gömülü JSON metinleri, SHA-256 ve çekirdek üzerinden tablo kurma.
- `src/TablesView.tsx`: tablo satırları, doğrulama kayıtları ve kullanıcı banka tablosu aktarımı.
- `src/exports.ts`: PDF, UYAP UDF, YAML, indirme ve raporda kullanılan sürüm bilgisi.
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
4. **Rapor ve kayıt** bölümünden PDF, UYAP UDF (`.udf`) ve YAML indirin veya defter satırını
   kopyalayın. Panoya erişilemiyorsa satır seçilebilir metin olarak açılır. PDF, UDF ve defter adı
   çekirdek API'den gelir. PDF ve UDF'nin girdi SHA-256 değeri, arayüzden indirilen YAML'ın tam
   metnidir; özgün yüklenen dosyanın yorum ve boşlukları korunmaz. Üretim zamanı ve dosya tarihi
   İstanbul saatine göredir. **Uyarı:** İndirilen `.udf` belgesi resmi kullanımdan önce UYAP
   Doküman Editör'de açılarak elle doğrulanmalıdır.
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

- Üretim derlemesi (`npm run web:build`), kök ve web tip denetimi, çekirdek testleri ve 6 web birim
  testi sıfır hatayla geçti; örnek hesabın form/YAML dönüşümü çekirdeğin doğrudan YAML çözümlemesiyle
  eşittir.
- Gerçek Brave tarayıcısında (`http://127.0.0.1:5179/`) tüm kullanıcı akışları
  canlı doğrulandı:
  - **Örnek hesap yükle** ile brüt `552.872,22 TL`, net `472.071,94 TL` ve işlemiş faiz `47.905,57 TL`
    toplamlarının anında hesaplandığı doğrulandı.
  - İkinci bir hizmet dönemi (`01.01.2020 - 30.06.2020` ve `01.03.2021 - 30.06.2026`) eklendiğinde
    ihbar `donemEsasi` seçilmeden hesabın engellendiği ve **İlgili alana git** düğmesinin doğrudan
    Kalemler adımındaki `#alan-girdi-kalemler-ihbar-donemEsasi` alanını açıp odakladığı doğrulandı.
  - **İhtimali kopyala** ile oluşturulan kopyada **İhtimaller** ekranında yan yana karşılaştırma,
    **Tablolar** ekranında kamu bankaları mevduat faizi (`kamu`) seçimiyle işlemiş faizin bağımsız
    güncellenmesi (`51.014,80 TL` yerine `50.654,06 TL`), **Defter satırını kopyala** ile panoya
    kopyalama ve **PDF raporunu indir** ile tarayıcıda yerel `pdfmake` ve `Roboto` vfs üzerinden
    `%PDF-1.3` başlıklı `application/pdf` (`99.030 bayt`) üretimi doğrulandı.
  - Tarayıcı konsolunda çalışma zamanı hatası veya uyarı oluşmadığı teyit edildi.
- `tasarim-denetimi` sadelik ilkesi ve 13 soruluk teslim kapısı uygulandı:
  - Başlıktaki tagline, bölüm ve sayfa alt açıklamaları, alandaki gereksiz örnek/ipucu satırları,
    `İsteğe bağlı` ikincil etiketleri ve sonuç panelindeki tekrarlı dipnotlar kaldırıldı; üst düzey
    adım gruplarında (`Dosya`, `Hizmet`, `Ücret`, `Esaslar`) adım başlığını tekrarlayan ikinci
    `<legend>` temizlendi.
  - Canlı DOM üzerinden yapılan WCAG AA kontrast ölçümünde tüm etkin metin çiftlerinin 4,5:1 sınırını
    geçtiği (en düşük metin kontrastı aydınlık temada `5,28:1`, karanlık temada `6,63:1`), tüm form
    alanı kenarlıklarının (`#aktif-ihtimal` seçicisi dahil) 3:1 sınırını geçtiği (aydınlık temada
    `3,52:1`, karanlık temada `3,56:1`) doğrulandı.
  - Klavye `Tab` gezintisinde `:focus-visible` odak halkalarının (`2px solid var(--vurgu)`, `3px`
    offset) tüm etkileşimli öğelerde göründüğü ve `375 px` genişlikte tüm ekranlarda yatay taşma
    olmadığı (`scrollWidth === clientWidth`, geniş veri tabloları yalnız `.tablo-kaydir` bölgesi
    içinde kaydırılabilir) ekran görüntüleriyle doğrulandı.
- Vite, pdfmake ve Roboto parçalarının 500 kB üstünde olması nedeniyle boyut uyarısı verir. Bu
  parçalar yalnız PDF istendiğinde yüklenir ve derlemeyi engellemez.

## Çekirdek API notları

Çekirdek (`src/index.ts`), şema ve alan bağlantılı hesap doğrulama hatalarını (`indirimMahsupSirasi`,
`asgariUcretIstisnasi`, kalem `faiz` tutar aşımı vb.) `alanYolu` alanı taşıyan `GirdiHatasi` sınıfıyla
fırlatır; arayüz `GirdiHatasi` yakaladığında alan yolunu doğrudan `e.alanYolu` üzerinden okur,
`hataYolu` yardımcısını yalnız beklenmeyen hatalar için yedek olarak tutar. Alan tabanlı arayüz için
gelecekte iki ek geliştirme yararlı olur: tek hata yerine çoklu hata listesi döndürülmesi ve alanların
zorunluluk, seçenek ve varsayılan açıklamalarının arayüzce okunabilir şema metadatası olarak
sunulması. UI şeması çekirdekteki alanlarla birlikte güncel tutulmalı.
