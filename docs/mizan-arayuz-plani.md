# mizan arayüz planı

23 Ekim 2026'da plana eklendi; Faz 1b arayüzü Preact ve Vite ile `web/` dizininde uygulandı (`npm run arayuz`). Hesap yöntemi: [[mizan-hesap-yontemi]].

## Amaç

Hesap yalnız YAML dosyası yazılıp komut satırından çalıştırılmak yerine aynı hesabı formdan
kurmayı, sonucu anında görmeyi ve PDF raporu tek tıkla almayı sağlar; kurulum gerektirmediği için
başka avukatlar da kullanabilir.

## Mimari ve yapı

- **Tarayıcıda çalışan, sunucusuz uygulama.** Hesap motoru çekirdek TypeScript kodunun aynısıdır ve
  tarayıcıda çalışır; girilen dosya bilgileri cihazdan çıkmaz. Müvekkil verisi içeren hesaplarda bu,
  sunuculu bir çözüme göre en temiz yoldur. Açık kaynakla birlikte GitHub Pages'te yayımlanabilir;
  gerekirse sonra masaüstü kabuğuna (Tauri) sarılır.
- **Motorun ayrılması.** Dosya okuma, SHA-256 ve git bilgisi Node katmanına (`src/node/`) ayrıldı;
  tablolar JSON modülü olarak paketlenir, girdi denetimi (`girdiCoz`) ve hesap (`hesapla`) olduğu
  gibi kullanılır. pdfmake tarayıcıda da çalıştığı için PDF, komut satırıyla aynı raporu üretir.
  Sürüm ve commit bilgisi derleme sırasında gömülür.
- **Teknoloji:** Vite, TypeScript ve Preact (`web/`). Küçük paket boyutu ve uzun ömür ölçütüyle
  ek çalışma zamanı bağımlılığı eklemeden kuruldu.

## Ekranlar ve işlevler

1. **Adım adım hesap kurma:** dosya bilgisi, hizmet dönemleri, ücret ve yan haklar, kalemler. Her
   hukuki tercih (hak varlığı, takdiri indirim, ihbarda dönem esası, süre hesabı, vergi yöntemi, faiz
   başlangıcı) açık bir seçim olarak sorulur ve gerekçe alanı ister. Varsayılanı olan esaslar
   dayanaklarıyla görünür; şemadaki zorunluluklar arayüzde de zorunludur.
2. **Canlı sonuç paneli:** kalem kalem brüt, kesinti, net ve faiz. Her tutara tıklanınca formülü,
   dayanak maddesi ve kullanılan tablo satırının kaynağı açılır.
3. **İhtimal karşılaştırması:** bilirkişi raporlarındaki gibi birden fazla ihtimal (ör. ihbarda son
   dönem ve birleşik dönem, fazla çalışmada iki tanık anlatımı) yan yana hesaplanır.
4. **Rapor ve kayıt:** PDF indirme, kayıt defteri satırını kopyalama, girdinin YAML olarak dışa ve içe
   aktarılması (hesabın sonradan aynen yeniden üretilebilmesi için).
5. **Tablolar:** asgari ücret, kıdem tavanı, vergi, faiz tablolarının satır satır kaynağı ve doğrulama
   tarihi; açık uçlu satır uyarıları.

## Tasarım ilkeleri

- Belge ve rakam odaklı, sade bir görünüm: sağa hizalı, eşit genişlikli rakamlar; bilirkişi raporunun
  düzenini çağrıştıran tablolar; Türkçe arayüz; aydınlık ve karanlık tema; telefonda da kullanılabilir.
- Okuyucuya dönük her metin ve ekran, teslimden önce `tasarim-denetimi` skill'iyle denetlenir.
- Hukuki tercihler hiçbir zaman gizli bir varsayılanla geçilmez; seçilmemiş tercih hesabı durdurur.

## Durum ve yol haritası

Faz 1b işçilik alacakları arayüzü Kasım 2026 itibarıyla tamamlandı ve canlı tarayıcı denetiminden
geçirildi; Faz 2 kalemleri (icra, AAÜT, aile) aynı arayüze eklenir.
