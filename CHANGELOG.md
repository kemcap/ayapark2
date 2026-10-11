# Aya Park 2 — Sürüm Geçmişi

Uygulama henüz pilot aşamasındadır. Kaynak kodunun her değişikliği GitHub commit geçmişinde tutulur.
Önemli sürümlerde, ilgili commit ayrıca `releases/vX.Y.Z` dalıyla sabitlenir.

## [0.2.1] — 2026-10-11
**Yönetim paneli üst bölüm sadeleştirildi (pilot)**

- Büyük tanıtım / slogan / logo / özellik etiketleri bölümü tamamen kaldırıldı.
- Sürüm bilgisi üst navigasyonun sağ köşesine küçük `v0.2.1` etiketi olarak taşındı.
- Mevcut yönetim, arşiv ve veri işlemleri değiştirilmedi.

## [0.2.0] — 2026-10-11
**Premium arayüz ve yeni işlem protokolü (pilot)**

- Yönetim ekranı: gece mavisi / şampanya altını görünüm, büyük başlık, cam benzeri yüzeyler,
  daha modern daire kartları, yeni arama / filtre alanları ve mobil düzen.
- Hareketli özet sayacı, kart geçişleri, klavye arama kısayolu (`/`) ve işlem bildirimleri.
- İşlem geçmişi kişi bazında, kronolojik zaman çizelgesi görünümünde.
- Yeni olaylarda kişi adı, daire, işlemi yapan hesap, tarih, gerekçe ve değişen alanları gösterme.
- Aktif ve arşivdeki kişiler ayrılmıştır. Kalıcı silme yalnızca arşiv üzerinden yapılır.
- Denetim günlüğünün eski test dönemi yönetim panelinde kapatıldı; yasal saklama gerektiren kayıtlar
  fiziksel olarak silinmedi. Başlangıç eşiği `site_audit_view_settings.hidden_through_id` tablosunda tutulur.
- KVKK imhasında daha önce denetim günlüğüne alınmış kişi adı ve serbest açıklamalar silinerek
  tarih, olay türü ve denetim bilgileri korunur.

## [0.1.0] — 2026-10-11
**İlk yönetim paneli (pilot)**

- A / B blokları, 20 daire, rol bazlı yönetim ve sakin erişimi.
- Kişi kaydı, daire ilişkileri, e-posta daveti, arşiv, geri yükleme, gerekçeli silme.
- Supabase üzerinden yönetim kaydı ve işlem protokolünün ilk sürümü.

## Sürümleme kararı

- **`0.MINOR.PATCH`**: Pilot aşaması. Büyük tasarım / yeni özellikler MINOR, düzeltmeler PATCH.
- **`1.0.0`**: Testler, güvenlik, hukuk / KVKK süreçleri ve gerçek kullanım şartları karşılandığında kararlı sürüm.
- **Eski kod**: GitHub commit geçmişi ve önemli sürümler için `releases/` dalları.
- **Veritabanı**: GitHub kod geçmişi, Supabase verilerinin sürümlenmiş geri yükleme yedeği değildir.
  Şema değişiklikleri migration olarak uygulanır; veri yedekleme ayrıca yönetilmelidir.

## Güvenlik / saklama notu

Bu sürüm kişisel verilerle çalışır. Arşiv süresi, KVKK silme-imha yükümlülükleri ve sınır ötesi
veri aktarımı hukuki değerlendirme gerektirir. Denetim kayıtlarının uygulama ekranında
sıfırlanması, yasal saklama gerektiren kayıtların fiziksel silinmesi anlamına gelmez.
