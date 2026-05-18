const firebaseConfig = {
  apiKey: "AIzaSyCx6Xqxe6qVugVJkjkDiw9QgVln_B-adbU",
  authDomain: "hesaptakip-b9159.firebaseapp.com",
  projectId: "hesaptakip-b9159",
  storageBucket: "hesaptakip-b9159.appspot.com",
  messagingSenderId: "312655912552",
  appId: "1:312655912552:web:d033021544e2e410f3e5dd",
  measurementId: "G-KTWLB9JZ0"
};

// Sitenin kilitlenmesini engelleyen ve üstteki sarı şeridi kapatan fonksiyon
function isFirebaseConfigured() {
  return firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "";
}

// Firebase bileşenlerini pencere (global) seviyesine taşıyalım ki diğer dosyalar rahatça okusun
window.firebaseConfig = firebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;