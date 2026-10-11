# Ayapark 2 · Canlı Borç Takibi (Supabase hazırlığı)

Bu proje, mevcut `https://kemcap.github.io/ayapark2/` sitesini aynı görünümle **merkezi veritabanına** taşıma hazırlığıdır. Henüz mevcut canlı site değiştirilmemiştir.

## Veri ayrımı

- `public.ayapark_claims` — herkesin görebildiği **bakiye, kişi türü (M/K), takip türü, ödendi ve mesaj gönderildi durumları**. Kişi adı ve daire numarası **içermez**.
- `public.ayapark_private` — ad, daire, not, kimlik/ilişki teyidi: sadece `public.ayapark_admins` tablosunda yetkili Supabase Auth kullanıcısına görünür (RLS).
- Yönetici dışında kimse satır değiştiremez. Girişte önceki PIN değil, **Supabase Authentication** e-posta/şifre sistemi kullanılır.

## Kurulum sırası

1. [Supabase](https://supabase.com/dashboard) hesabınızda yeni bir proje oluşturun. Proje bölgesini uygun seçin.
2. **SQL Editor** bölümünde sırayla `01_schema.sql` ve `02_public_seed.sql` dosyalarını çalıştırın.
3. `ayapark2_private_seed.sql` **ayrı, özel** dosyasını yalnızca Supabase SQL Editor'de çalıştırın. Bu dosyayı GitHub'a **yüklemeyin**.
4. **Authentication → Users** bölümünde yönetici kullanıcısını oluşturun. Güçlü bir şifre kullanın. `03_admin_setup.sql` dosyasındaki `ADMIN_EMAIL_HERE` yazısını gerçek yönetici e-postasıyla değiştirip SQL Editor'de çalıştırın; `administrator_count` 1 olmalıdır.
5. **Project Settings → API** ekranından `Project URL` ve `publishable key` (veya legacy `anon` key) değerlerini öğrenin. **`service_role` / `secret` anahtarını ASLA HTML içine koymayın**.
6. `index.html` içinde `CONFIG.url` ve `CONFIG.anonKey` değerlerini doldurun; TLS altında çalıştırın. GitHub Pages HTTPS sağlar.
7. Önce herkese açık görünümü, ardından yönetici girişi ve ödeme/not güncellemesini ayrı tarayıcılarla test edin. Ondan sonra `main` dalındaki `index.html` dosyasını güncelleyin.

## Güncelleme davranışı

Yönetici `Ödendi` veya `Mesaj gönderildi` işaretini değiştirdiğinde sunucuya `PATCH` işlemi yapılır. Yazılan not, alanın dışına tıklanınca kaydedilir. Sayfa her **20 saniyede** veritabanından verileri yeniler. Diğer ziyaretçiler sayfayı güncellemeden yeni durumu görür (en fazla ~20 saniye gecikme).

## Önemli kısıtlar

- GitHub Pages statik sunucudur. Veriyi Supabase saklar.
- Önceki HTML'nin `localStorage` alanındaki haneler otomatik taşınmaz. Hazırlanan başlangıç kayıtlarında tüm `Ödendi` ve `Mesaj gönderildi` işaretleri **false**'dur; çünkü bu haneler gönderilen dosyada mevcut değildir. Gerekirse eski listeden CSV ile son durum ayrıca aktarılmalıdır.
- Bakiyeler 09.10.2026 tarihli eski listeye dayanır. Vadesi ve icra durumu güncel muhasebeyle kontrol edilmelidir.
- Yalnızca anonim tutarlar gösterilse bile, tutarların ve takip sınıfının birleşimiyle bazı kişiler **dolaylı tahmin edilebilir**.
- Supabase projesi oluşturulmadan ve anahtarlar girilmeden bu taslak canlı verileri göstermez. Var olan GitHub Pages sitesi bozulmaması için korunmalıdır.

## Dosyalar

- `index.html` — yeni ön yüz, kişisel veri/gizli anahtar içermez.
- `01_schema.sql` — veritabanı tabloları, erişim politikaları (Row Level Security).
- `02_public_seed.sql` — 14 anonim kaydın başlangıç bakiyeleri.
- `03_admin_setup.sql` — yönetici oluşturma yönergesi ve boş şablon.
- `ayapark2_private_seed.sql` — **ayrı teslim edilir, GitHub'a yüklenmez**.
