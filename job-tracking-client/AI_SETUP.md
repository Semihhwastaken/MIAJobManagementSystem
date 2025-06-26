# AI Analizi Özelliği Kurulum Rehberi

Bu rehber, MIA Job Management System'de AI analizi özelliğini kullanmak için OpenRouter API anahtarının nasıl yapılandırılacağını açıklar.

## OpenRouter API Anahtarı Alma

### 1. OpenRouter Hesabı Oluşturma
1. [openrouter.ai](https://openrouter.ai) sitesine gidin
2. "Sign Up" butonuna tıklayarak hesap oluşturun
3. E-posta adresinizi doğrulayın

### 2. API Anahtarı Oluşturma
1. [OpenRouter API Keys](https://openrouter.ai/keys) sayfasına gidin
2. "Create Key" butonuna tıklayın
3. Anahtarınıza bir isim verin (örn: "MIA Job Management")
4. Oluşturulan API anahtarını kopyalayın

### 3. API Anahtarını Uygulamaya Ekleme

#### Yöntem 1: Dashboard Üzerinden (Önerilen)
1. Dashboard sayfasına gidin
2. Sağ üst köşedeki "AI Analizi" toggle'ının yanındaki ayar simgesine tıklayın
3. OpenRouter API anahtarınızı yapıştırın
4. "Kaydet" butonuna tıklayın

#### Yöntem 2: Environment Variable Olarak
1. Proje kök dizininde `.env` dosyası oluşturun:
```bash
VITE_OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```
2. Uygulamayı yeniden başlatın

## Kullanılan AI Modeli

**Model:** `google/gemini-2.0-flash-exp:free`
- **Ücretsiz:** Bu model OpenRouter'da ücretsiz olarak kullanılabilir
- **Dil Desteği:** Türkçe dahil birçok dili destekler
- **Performans:** Yüksek kaliteli iş analizi raporları üretir

## AI Analizi Özellikleri

AI analizi aşağıdaki bilgileri sağlar:
- Ekip performansı değerlendirmesi
- Güçlü yanlar ve gelişim alanları
- Görev tamamlama oranları analizi
- Ekip içi iş dağılımı incelemesi
- Gelecek dönem için öneriler

## Sorun Giderme

### 401 Unauthorized Hatası
- API anahtarınızın doğru olduğundan emin olun
- API anahtarının `sk-or-v1-` ile başladığını kontrol edin
- OpenRouter hesabınızda kredi bulunduğundan emin olun

### "No auth credentials found" Hatası
- Dashboard'da API anahtarını kaydettiğinizden emin olun
- Tarayıcınızın localStorage'ını temizleyip tekrar deneyin
- API anahtarını yeniden girin

### Bağlantı Sorunları
- İnternet bağlantınızı kontrol edin
- Firewall ayarlarınızı kontrol edin
- VPN kullanıyorsanız devre dışı bırakıp deneyin

## Güvenlik Notları

- API anahtarınızı kimseyle paylaşmayın
- API anahtarınızı güvenli bir yerde saklayın
- Kullanım limitlerinizi düzenli olarak kontrol edin
- Şüpheli aktivite durumunda API anahtarınızı yeniden oluşturun

## Destek

Sorunlarınız devam ederse:
1. OpenRouter [dokümantasyonunu](https://openrouter.ai/docs) inceleyin
2. API anahtarınızın aktif olduğunu kontrol edin
3. Proje geliştiricileri ile iletişime geçin 