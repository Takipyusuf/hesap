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

    // Google Gemini API endpoint (Hızlı ve optimize 3-flash / 2.5-flash modelleriyle uyumlu)
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

// ==========================================
// ANTIGRAVITY AI - UI / ARAYÜZ YÖNETİMİ
// ==========================================

function toggleAIChat() {
    const chatWindow = document.getElementById('ai-chat-window');
    const chatButton = document.getElementById('ai-chat-button');
    
    if (!chatWindow) return;

    if (chatWindow.style.display === 'none' || chatWindow.style.display === '') {
        chatWindow.style.display = 'flex';
        chatButton.style.display = 'none';
        
        // Pencere açıldığında input alanına odaklan
        setTimeout(() => {
            const input = document.getElementById('ai-chat-input');
            if (input) input.focus();
        }, 100);
    } else {
        chatWindow.style.display = 'none';
        chatButton.style.display = 'block';
    }
}
window.toggleAIChat = toggleAIChat;

async function handleAISend() {
    const inputEl = document.getElementById('ai-chat-input');
    const bodyEl = document.getElementById('ai-chat-body');
    const sendBtn = document.getElementById('ai-chat-send');
    
    if (!inputEl || !bodyEl) return;
    
    const text = inputEl.value.trim();
    if (!text) return;
    
    // Kullanıcı mesajını ekrana yaz
    appendAIMessage('user', text);
    inputEl.value = '';
    
    // Yükleniyor durumunu göster
    sendBtn.disabled = true;
    inputEl.disabled = true;
    const loadingId = appendAIMessage('bot', '🧠 Düşünüyorum...');
    
    // API çağrısını yap
    const aiResponse = await askAntigravityAI(text);
    
    // Yükleniyor mesajını kaldır ve gerçek cevabı yaz
    const loadingEl = document.getElementById(loadingId);
    if (loadingEl) loadingEl.remove();
    
    appendAIMessage('bot', aiResponse);
    
    sendBtn.disabled = false;
    inputEl.disabled = false;
    inputEl.focus();
}

function appendAIMessage(sender, text) {
    const bodyEl = document.getElementById('ai-chat-body');
    if (!bodyEl) return null;
    
    const msgId = 'ai-msg-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.id = msgId;
    msgDiv.className = `ai-msg ${sender}`;
    
    // Satır satır boşlukları korumak ve temel Markdown yapılarını desteklemek için düzenleme
    msgDiv.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
    
    bodyEl.appendChild(msgDiv);
    bodyEl.scrollTop = bodyEl.scrollHeight; // Sayfayı en aşağı kaydır
    
    return msgId;
}

// Sayfa yüklendiğinde buton tetikleyicilerini tanımla
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('ai-chat-send');
    const inputEl = document.getElementById('ai-chat-input');
    
    if (sendBtn) {
        sendBtn.addEventListener('click', handleAISend);
    }
    
    if (inputEl) {
        inputEl.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAISend();
            }
        });
    }
});
