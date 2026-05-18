// Projenin aradığı ana büyük harfli yapılandırma değişkeni
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyCx6Xqxe6qVugVJkjkDiw9QgVln_B-adbU",
  authDomain: "hesaptakip-b9159.firebaseapp.com",
  projectId: "hesaptakip-b9159",
  storageBucket: "hesaptakip-b9159.appspot.com",
  messagingSenderId: "312655912552",
  appId: "1:312655912552:web:d033021544e2e410f3e5dd",
  measurementId: "G-KTWLB9JZ0"
};

// Ne olur ne olmaz, küçük harfli halini de arkada tanımlı bırakalım
var firebaseConfig = FIREBASE_CONFIG;

// Diğer kilitlenmeyi çözen fonksiyonumuz
function isFirebaseConfigured() {
  return FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "";
}

// Tüm değişkenleri tarayıcının hafızasına (global window nesnesine) kesin olarak kaydediyoruz
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.firebaseConfig = firebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;