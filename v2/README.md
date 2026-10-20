# Ayapark 2 – Version 2.0

Bu çalışma yalnızca `ayapark-v2` dalındaki `v2/` dizinini geliştirir. `main`, eski sayfalar, canlı veriler, Auth ayarları ve Supabase şeması değiştirilmez. V2 bu aşamada canlıya yayımlanmaz.

## Kullanım

`v2/index.html`, `styles.css`, `app.mjs`, `core.mjs` ve `api.mjs` birlikte statik bir HTTP sunucusunda açılır. ES modülleri nedeniyle HTML dosyasını doğrudan `file://` ile açmayın.

Örneğin yerel bilgisayarda depo kökünden:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Tarayıcıda `http://127.0.0.1:8080/v2/` adresini açın. Bu komut yayınlama yapmaz. GitHub Pages'in canlı kaynak dalını değiştirmeyin.

## İki ayrı veri görünümü

**Örnek veriler:** Sayfa varsayılan olarak tamamen örnek kayıtlarla açılır. Süper Admin, Yönetim ve Site Sakini görünümleri üstten denenebilir. Raporlar aynı örnek defterden hesaplanır; resmî belge değildir.

**Mevcut hesap:** “Hesabımla giriş” mevcut Supabase Auth hesabını kullanır. Doğrulanmış oturumla `site_sites`, `site_blocks`, `site_units`, `site_staff_memberships` ve `site_resident_units` okunur. RLS mevcut veritabanında uygulanır. Hesap yalnızca erişebildiği daireleri görür. Kişi iletişim bilgileri, kimlik notları ve eski `ayapark_claims` kayıtları sorgulanmaz.

Gerçek bağlantıda mali tutarlar gösterilmez: banka, tahakkuk ve ödeme mahsup tabloları henüz yoktur. `—`, sıfır borç değildir. “Yenile” daire kayıtlarını tekrar okur; son okuma saati üstte görünür.

Bu V2 adaptöründe iş verileri için INSERT, UPDATE, DELETE veya RPC işlemi yoktur. Auth oturumu açma/yenileme/kapatma çağrıları yapılır. Oturum yalnızca sekme belleğinde tutulur; eski uygulamanın oturum depoları kullanılmaz. Sekme yenilenince tekrar giriş gerekir.

## Üç görünüm

| Görünüm | Şimdiki erişim | Mevcut sunucu modeli |
| --- | --- | --- |
| Süper Admin | Tüm yetkili daireleri okuma, örnek modda CSV önizleme | `manager` |
| Yönetim | Yetkili daireleri okuma | `deputy` / `auditor` |
| Site Sakini | Aktif bağlantıyla yalnızca kendi dairesini okuma | `site_resident_units` |

Bu eşleme yeni sunucu izinleri oluşturmaz. Mevcut `deputy` ve `auditor` izinleri farklıdır; bu aşamada V2 hiçbirine yazma işlemi sunmaz. Yönetim için kişiye özel ek izinler, davetler ve mali işlem yetkileri sonraki şema çalışmasıdır. Arayüzde rol gizlemek bir güvenlik mekanizması değildir.

## Ekranlar

- Genel bakış: öncelikli özet, sonraki adımlar, daire haritası ve son örnek hareketler.
- Daireler: arama, blok/durum filtreleri ve her yerden açılan daire detayı.
- Aidat & borçlar: daire bazlı örnek bakiye veya henüz bağlı olmayan mali durum.
- Banka hareketleri: örnek hareket arama ve gelir/gider filtresi.
- Mali raporlar: aynı örnek defterden üretilen toplamlar, gider dağılımı ve yazdırma.
- Erişim & ayarlar: gerçek erişim modelinin mevcut sınırları.

## CSV önizlemesi

Yalnızca örnek Süper Admin görünümünde, yerel tarayıcı içinde çalışır. Dosya sunucuya gönderilmez veya kaydedilmez. En fazla 2 MB / 2.000 satır.

```csv
tarih;aciklama;tutar
2026-10-20;Ekim aidatı;3.600,00
2026-10-20;Havuz bakımı;-2.500,00
```

Tarih ISO biçiminde, tutar Türkçe sayı biçimindedir. Tırnaklı alanlar ve alan içi satır sonları desteklenir. Dosya içindeki olası tekrarlar işaretlenir. Banka kayıtlarıyla mükerrer kontrol ve gerçek aktarım henüz yoktur. XLSX/PDF henüz desteklenmez.

## Kaynak ve kontrol

- `app.mjs`: ekranlar ve etkileşimler.
- `core.mjs`: kuruş cinsinden hesaplama, görünüm filtreleri ve CSV doğrulaması.
- `api.mjs`: dar kapsamlı, salt okunur Supabase veri adaptörü.
- `tests/`: Node'un yerleşik test aracı; ek paket gerekmez.
- `AUDIT.md`: Almanca ayrıntılı bulgular, doğrulama sınırları ve sonraki adımlar.

```bash
node --test v2/tests/*.test.mjs
node --check v2/app.mjs
node --check v2/core.mjs
node --check v2/api.mjs
```

Otomatik mantık testleri geçmiştir. Görsel tarayıcı ve gerçek kullanıcılarla uçtan uca test bu ortamda yapılmamıştır. Canlı sürüme geçişten önce farklı rollerle RLS, mobil görünüm, klavye kullanımı ve baskı ayrıca doğrulanmalıdır.
