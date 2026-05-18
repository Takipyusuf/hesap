/**
 * FIREBASE KURULUM (bir kez yapılır):
 * 1. https://console.firebase.google.com → Yeni proje
 * 2. Authentication → Sign-in → E-posta/Parola → Etkinleştir
 * 3. Firestore Database → Oluştur (test modunda başlayabilir)
 * 4. Proje ayarları → Web uygulaması ekle → config'i aşağıya yapıştır
 * 5. ADMIN_EMAIL'e kendi e-postanıı yaz (yönetici paneli bu mail ile açılır)
 * 6. firestore.rules dosyasını Firebase Console → Firestore → Kurallar'a yapıştır
 * 7. Tüm dosyaları Netlify Drop'a yükle
 */

const FIREBASE_CONFIG = {
    apiKey: "BURAYA_API_KEY",
    authDomain: "BURAYA_PROJECT.firebaseapp.com",
    projectId: "BURAYA_PROJECT_ID",
    storageBucket: "BURAYA_PROJECT.appspot.com",
    messagingSenderId: "BURAYA_SENDER_ID",
    appId: "BURAYA_APP_ID"
};

/** Yönetici paneline sadece bu e-posta ile giriş yapılır */
const ADMIN_EMAIL = "yonetici@email.com";

function isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes("BURAYA");
}
