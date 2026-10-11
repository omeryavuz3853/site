# Turnstile geçişi (henüz yayında değil)

Bu dal, çalışan Web3Forms/hCaptcha formunun yerini ancak hesap kurulumu tamamlandıktan sonra alır. Görünüm, alanlar ve iki düğmeli başarı ekranı korunur. Turnstile açık tema, Türkçe ve esnek genişlikte görünür. Cloudflare panelinde Managed modu seçilmelidir.

## Hesap kurulumu

1. Cloudflare > Turnstile > Add widget: ad `Ömer Yavuz İletişim`; hostname `omeryavuz.net` ve `www.omeryavuz.net`; mode `Managed`; pre-clearance kapalı. Alan adını/hosting hizmetini Cloudflare'a taşıma gereği yok.
2. Formspree'de alıcı `bilgi@omeryavuz.net` olan bir form oluştur ve alıcı e-postasını doğrula. Ücretsiz plan ayda 50 gönderimle sınırlı. Hesap panelinde Turnstile seçeneğinin kullanılabildiğini doğrula; herhangi bir ücretli planı otomatik satın alma.
3. Formspree > form settings > CAPTCHA: etkinleştir, sağlayıcı Cloudflare Turnstile, Secret Key alanına Cloudflare'ın gizli anahtarını gir, kaydet. Alan adı kısıtını omeryavuz.net için aç.
4. `contact-config.js` dosyasına Formspree endpoint (`https://formspree.io/f/...`) ve Cloudflare'ın herkese açık Site Key değerlerini ekle. Secret Key/hesap şifreleri GitHub'a veya sohbete eklenmez.

## Yayın öncesi doğrulama

- Geçersiz veya eksik Turnstile token'ının Formspree tarafından reddedildiğini kontrol et. Ön yüzde kutucuğun görünmesi tek başına yeterli değil.
- Gerçek doğrulamayla bir deneme gönder; e-postanın bilgi@omeryavuz.net'e geldiğini, Reply-To'nun ziyaretçi olduğunu, konunun `İletişim Formundan Mesajınız Var` olduğunu kontrol et.
- Başarı mesajı ve iki buton; hata durumunda yazıların korunması; dar mobil ekranda taşma olmaması kontrol edilmeli.
- Formspree'nin ücretsiz e-posta şablonu kullanılır: alanlar Türkçe adlarla iletilir, ayrıca Reply-To için `email` alanı bulunur. Şablonun birebir düzeni sağlayıcıya bağlıdır.
- Bu sürüm ek özel IP hız sınırı veya tuzak alanı uygulamaz; sağlayıcının koruması ve zorunlu Turnstile doğrulamasını kullanır.
- Kurulum ve gerçek teslimat doğrulanınca main'e birleştir. Mevcut çalışan Web3Forms formunu erken kapatma.

Kaynaklar:
https://help.formspree.io/articles/form-and-project-settings/protecting-your-forms-with-cloudflare-turnstile
https://formspree.io/plans
https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/
