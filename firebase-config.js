// Projenin aradığı ana büyük harfli yapılandırma değişkeni
var FIREBASE_CONFIG = {
  apiKey: "AIzaSyCx6XqxE6qVugVJkjkDiw9QgVln_B-adbU",
  authDomain: "hesaptakip-b9159.firebaseapp.com",
  projectId: "hesaptakip-b9159",
  storageBucket: "hesaptakip-b9159.firebasestorage.app",
  messagingSenderId: "312655912552",
  appId: "1:312655912552:web:d033021544e2e410f3e5dd",
  measurementId: "G-KTWLKB9JZ0",
  adminEmail: "adminyusuf@gmail.com"
};

// Antigravity AI (Google Gemini) Yapılandırma Değişkeni
var ANTIGRAVITY_CONFIG = {
  apiKey: ""
};

// Ne olur ne olmaz, küçük harfli halini de arkada tanımlı bırakalım
var firebaseConfig = FIREBASE_CONFIG;
var antigravityConfig = ANTIGRAVITY_CONFIG;

function isFirebaseConfigured() {
  var config = window.FIREBASE_CONFIG || (typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null) || window.firebaseConfig;
  return config && config.apiKey && config.apiKey !== "";
}

function isAntigravityConfigured() {
  var config = window.ANTIGRAVITY_CONFIG || (typeof ANTIGRAVITY_CONFIG !== 'undefined' ? ANTIGRAVITY_CONFIG : null) || window.antigravityConfig;
  return config && config.apiKey && config.apiKey !== "";
}

// Tüm değişkenleri tarayıcının hafızasına (global window nesnesine) kesin olarak kaydediyoruz
window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.firebaseConfig = firebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;

// Antigravity AI değişkenlerini de global window nesnesine kaydediyoruz
window.ANTIGRAVITY_CONFIG = ANTIGRAVITY_CONFIG;
window.antigravityConfig = antigravityConfig;
window.isAntigravityConfigured = isAntigravityConfigured;
