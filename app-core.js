let db, auth, firebaseReady = false;

function initFirebase() {
    var config = window.FIREBASE_CONFIG || (typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null) || window.firebaseConfig;
    if (!config || !config.apiKey) return false;
    
    if (!firebase.apps.length) {
        firebase.initializeApp(config);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    firebaseReady = true;
    return true;
}

function formatMoney(n) {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + ' ₺';
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

function formatDateTime(ts) {
    if (!ts) return '-';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('tr-TR');
}

async function logActivity(userId, userName, action, detail) {
    if (!db || !userId) return;
    await db.collection('activity').add({
        userId,
        userName: userName || 'Kullanıcı',
        action,
        detail: detail || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
}

const ACTION_LABELS = {
    register: 'Kayıt oldu',
    login: 'Giriş yaptı',
    logout: 'Çıkış yaptı',
    debt_add: 'Borç ekledi',
    debt_delete: 'Borç sildi',
    payment: 'Ödeme yaptı',
    password_change: 'Şifre değiştirdi'
};

function actionLabel(action) {
    return ACTION_LABELS[action] || action;
}

// ==========================================
// ANTIGRAVITY AI - GEMINI ENTEGRASYONU
// ==========================================

/**
 * Antigravity Yapay Zeka modeline soru gönderir ve yanıtı döndürür.
 * @param {string} promptText - Kullanıcının yapay zekaya sorduğu soru
 * @returns {Promise<string>} Yapay zekanın verdiği cevap
 */
async function askAntigravityAI(promptText) {
    // Hafızadaki API anahtarını kontrol et
    var config = window.ANTIGRAVITY_CONFIG || window.antigravityConfig;
    
    if (!config || !config.apiKey || config.apiKey === "") {
        console.error("Antigravity AI Hatası: API Anahtarı bulunamadı! Lütfen firebase-config.js dosyasını kontrol edin.");
        return "Sistem hatası: Yapay zeka yapılandırması eksik.";
    }

    // Google Gemini API endpoint (Hızlı ve optimize 2.5-flash modeli kullanılıyor)
    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + config.apiKey;

    // API'ye gönderilecek veri paketi
    var requestBody = {
        contents: [{
            parts: [{ text: promptText }]
        }]
    };

    try {
        var response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error("API yanıt vermedi, durum kodu: " + response.status);
        }

        var data = await response.json();
        
        // Gelen veriden yapay zekanın metin cevabını ayıkla
        if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text;
        } else {
            return "Yapay zekadan boş veya geçersiz bir yanıt döndü.";
        }

    } catch (error) {
        console.error("Antigravity AI Bağlantı Hatası:", error);
        return "Şu anda yapay zeka sunucularına bağlanamıyorum, lütfen internetinizi veya API anahtarınızı kontrol edin.";
    }
}

// Diğer JS dosyalarından ve HTML içinden doğrudan çağrılabilmesi için global nesneye kaydediyoruz
window.askAntigravityAI = askAntigravityAI;
