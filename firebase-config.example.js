/**
 * Bu dosyayı kopyalayıp firebase-config.js yapın veya
 * firebase-config.js içindeki değerleri doldurun.
 */
const FIREBASE_CONFIG = {
    apiKey: "BURAYA_API_KEY",
    authDomain: "BURAYA_PROJECT.firebaseapp.com",
    projectId: "BURAYA_PROJECT_ID",
    storageBucket: "BURAYA_PROJECT.appspot.com",
    messagingSenderId: "BURAYA_SENDER_ID",
    appId: "BURAYA_APP_ID"
};

const ADMIN_EMAIL = "yonetici@email.com";

function isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes("BURAYA");
}
