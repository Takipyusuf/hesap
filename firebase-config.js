/**
 * Firebase — Hesaptakip projesi
 * ADMIN_EMAIL: yönetici paneli (admin.html) bu e-posta ile açılır
 */

const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCx6XqxE6qVugVJkjkDiw9QgVln_B-adbU",
    authDomain: "hesaptakip-b9159.firebaseapp.com",
    projectId: "hesaptakip-b9159",
    storageBucket: "hesaptakip-b9159.firebasestorage.app",
    messagingSenderId: "312655912552",
    appId: "1:312655912552:web:d033021544e2e410f3e5dd"
};

/** Yönetici paneline sadece bu e-posta ile giriş yapılır — kendi e-postanı yaz */
const ADMIN_EMAIL = "yusuf@email.com";

function isFirebaseConfigured() {
    return FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.includes("BURAYA");
}
