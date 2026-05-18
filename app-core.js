let db, auth, firebaseReady = false;

function initFirebase() {
    if (!isFirebaseConfigured()) return false;
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
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
