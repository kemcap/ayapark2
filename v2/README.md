# Ayapark 2 – Version 2.0

## Durum
Bu dal (**ayapark-v2**) yeni sürümün çalışma alanıdır. Mevcut `main` sürümü korunur.

`v2/index.html` dosyası; bağımsız, mobil uyumlu, Türkçe bir **tasarım prototipidir**. Yalnızca örnek veriler kullanır; Supabase'e bağlanmaz ve banka bilgisi göndermez.

## Site kapsamı
- Ayapark 2: A Blok (10 daire), B Blok (10 daire), toplam 20 daire.
- Ortak havuz, asansör, temizlik, peyzaj, elektrik ve genel giderler.
- Aidat tahakkuku, geçmiş borçlar, banka hareketleri ve raporlar.

## Üç kullanıcı rolü

| Yetki | Süper Admin | Yönetim | Site Sakini |
| --- | --- | --- | --- |
| Tüm kayıtları görme | Evet | Yetkiye bağlı | Hayır |
| Kendi dairesinin borcunu görme | Evet | Evet | Evet |
| Ortak, anonim finans raporlarını görme | Evet | Evet | Evet |
| Excel / CSV içe aktarma | Evet | İzin verilirse | Hayır |
| İşlem düzenleme / onaylama | Evet | İzin verilirse | Hayır |
| Duyuru oluşturma | Evet | İzin verilirse | Hayır |
| Kullanıcı ve yetki yönetimi | Evet | Hayır | Hayır |

Yönetim rolüne verilen ek izinler Süper Admin tarafından ayrı ayrı yönetilir.
Gerçek yetki denetimi ileride sunucuda / Supabase RLS ile uygulanacaktır; arayüzde rol değiştirmek güvenlik mekanizması değildir.

## Planlanan modüller
1. Genel Bakış – bakiye, aidat alacağı, gelir/gider, son hareketler
2. Daireler – A/B Blok, her dairenin cari hesabı
3. Aidat & Borç – genel, havuz, asansör, demirbaş; tahakkuk ve ödeme mahsupları
4. Banka Hareketleri – CSV/Excel toplu aktarım, manuel düzeltme, mükerrer kontrol
5. Raporlar – ortak, kişisel bilgi içermeyen finansal raporlar
6. Ayarlar – izinler, kategoriler ve yönetim tercihleri
7. Daha sonra: PDF/dekont yapay zeka okuma, belgeler, hizmet takvimi ve duyurular

## Veri modeli ilkeleri
- Banka işlemleri (gerçekleşen para hareketleri) ile aidat borçları (tahakkuklar) birbirinden ayrı tutulur.
- Bir banka ödemesi bir veya birden fazla borç kalemine eşleştirilebilir; kısmi ödeme desteklenir.
- İçe aktarmada banka işlem referansı ve kontrollü tekilleştirme kullanılır.
- Orijinal PDF veya görsel saklama isteğe bağlıdır; standart iş akışında yapılandırılmış veri yeterlidir.
- Her düzenleme denetim kaydına bağlanır. Geriye dönük düzeltme kayıtları silmeden yapılır.
- Sakinler yalnızca kendi hesap hareketlerini ve anonimleştirilmiş toplu raporları görebilir.
- Kimlik, IBAN gibi hassas veriler herkese açık raporlara/dekontlara dahil edilmez.
- Supabase Auth, Postgres, RLS ve gerektiğinde özel Storage kullanılır.
- Canlı kullanımdan önce yedekleme, yetkilendirme ve toplu aktarım testleri yapılır.

## Sıradaki teknik adım
Mevcut Supabase `site_*` tabloları önce denetlenir. Uygun yapılar korunur; yeni banka işlemi / tahakkuk / ödeme mahsup tabloları ayrı bir geçiş planıyla oluşturulur. `main` sürümü ve canlı veriler onaylanmadan değiştirilmez.
