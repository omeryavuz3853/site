# Ömer Yavuz iletişim formu

Durum: Ön yüz ve gönderim servisi hazır. Canlı SMTP ve servis adresi henüz tanımlı değil. Bu dalı yapılandırma tamamlanmadan main ile birleştirmeyin.

GitHub Pages statik dosyaları sunmaya devam eder. Bu dizindeki Node servisini HTTPS destekli bir sunucuda **tek süreç ve tek instance** olarak çalıştırın. `Dockerfile` hazırdır. CAPTCHA ve hız sınırları bellektedir: serverless/çoklu instance kullanmayın. Yeniden başlatma mevcut kodları geçersiz kılar ve hız sınırlarını sıfırlar. Paylaşımlı IP kullanan ziyaretçiler hız sınırını paylaşır. Çoklu instance gerekirse ortak TTL deposu kullanılmalıdır.

## Kurulum

1. Node 22+ üzerinde bu dizinde `npm ci` çalıştırın. Ya da bu dizini Docker build context olarak kullanın.
2. `.env.example` içindeki değerleri sunucunun gizli ortam değişkeni panelinde tanımlayın. Zoho hesabında gösterilen SMTP sunucusunu ve yetkili adresi kullanın. SMTP erişimi olan hesap ve uygulamaya özel şifre gerekir. Şifreyi GitHub'a, ön yüz dosyalarına veya sohbete koymayın. Yerel deneme için `node --env-file=.env server.js` kullanılabilir.
3. `npm start` ile başlatın. SMTP kimlik doğrulaması başarısızsa servis başlamaz. Yalnız HTTPS üzerinden erişime açın. `/health` süreç kontrolüdür; gerçek teslimat testi değildir.
4. Proxy arkasındaysa `TRUST_PROXY_HOPS` değerini gerçek, sabit proxy zincirine göre ayarlayın ve sunucuya doğrudan erişimi engelleyin. Kontrol edilmeden bu değeri artırmayın; aksi halde IP sınırı aşılabilir.
5. Kök dizindeki `contact-config.js` dosyasında `CONTACT_API_BASE` değerini servisin HTTPS adresi yapın (sonunda / olmadan).
6. Önizlemede boş alanları, hatalı maili, yanlış/süresi dolmuş kodu, başarılı gönderimi ve Zoho'da Yanıtla alıcısını kontrol edin. Gerçek teslimat doğrulandıktan sonra main'e birleştirin.

Alıcı sabit `bilgi@omeryavuz.net`. Konu ve düz metin gövde kullanıcı talebindeki biçimdedir. Gönderen sunucuda yetkilendirilmiş Zoho adresi, Reply-To ziyaretçinin adresidir. CAPTCHA cevabı tarayıcıya metin olarak verilmez; görselde SVG yolları bulunur. Kod 5 dakika geçerli, tek kullanımlı ve IP'ye bağlıdır. Kod isteği 10 dakikada 20, gönderim denemesi 15 dakikada 5 ile sınırlıdır. Bu sınırlar spamı azaltır, tamamen ortadan kaldırmaz.

Mesajlar diske/veritabanına yazılmaz. Servis günlüklerinde içerik, ziyaretçi adresi ve SMTP hata ayrıntıları tutulmaz. Sunucu sağlayıcısının erişim günlüğü ayarlarını ayrıca kontrol edin. Görsel kodu okuyamayan ziyaretçiler için e-posta alternatifi bulunur.

## Kontroller

`npm test` sahte posta taşıyıcısıyla sunucu doğrulaması ve e-posta biçimini denetler. Gerçek Zoho hesabına e-posta göndermez.

Kaynaklar:
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- https://www.zoho.com/mail/help/zoho-smtp.html
