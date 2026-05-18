# Borç ve Kredi Takip Sistemi

Çok kullanıcılı borç takip uygulaması. Kullanıcılar kayıt olup kendi borçlarını yönetir; yönetici tüm işlemleri izler.

## Sayfalar

| Dosya | Açıklama |
|-------|----------|
| [index.html](index.html) | Kullanıcı girişi / kayıt / borç paneli |
| [admin.html](admin.html) | Yönetici paneli (tüm kullanıcılar ve aktiviteler) |

## Hızlı başlangıç

1. [Firebase](https://console.firebase.google.com) projesi oluştur (Auth + Firestore)
2. `firebase-config.js` dosyasını doldur
3. `firestore.rules` içindeki e-postayı `ADMIN_EMAIL` ile aynı yap → Firebase'e yapıştır
4. `index.html` ile yönetici e-postasından kayıt ol
5. GitHub Pages ile yayınla (aşağıya bakın)

Detaylı kurulum: [KURULUM.txt](KURULUM.txt) · GitHub: [GITHUB-KURULUM.txt](GITHUB-KURULUM.txt)

## GitHub Pages (ücretsiz, kalıcı link)

Depoyu GitHub'a yükledikten sonra:

1. Repo → **Settings** → **Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main` · **Folder:** `/ (root)`
4. **Save** — birkaç dakika sonra site hazır:
   `https://KULLANICI_ADIN.github.io/REPO_ADI/`

Firebase Console → Authentication → **Authorized domains** listesine şunu ekle:
`KULLANICI_ADIN.github.io`

## Dosya yapısı

```
index.html, admin.html
styles.css
firebase-config.js
app-core.js, user-app.js, admin-app.js
firestore.rules
```

## Lisans

Kişisel kullanım.
