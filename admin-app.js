// ==========================================
// ADMIN YAPILANDIRMASI & SABİTLER
// ==========================================
// NOT: Eğer window.FIREBASE_CONFIG içinde adminEmail tanımladıysanız oradan alır, 
// yoksa aşağıdaki tırnak içine kendi belirleyeceğiniz admin e-postasını yazın!
const ADMIN_EMAIL = window.ADMIN_EMAIL || (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.adminEmail) || "admin@email.com";

let adminUser = null;
let allUsers = [];
let selectedUserId = null;

function showAdminAuth() {
    // DOM güvenliği için element kontrolü
    const authEl = document.getElementById('admin-auth');
    const appEl = document.getElementById('admin-app');
    if (authEl) authEl.style.display = 'flex';
    if (appEl) appEl.classList.remove('visible');
}

function showAdminApp() {
    const authEl = document.getElementById('admin-auth');
    const appEl = document.getElementById('admin-app');
    const emailDisp = document.getElementById('admin-email-display');

    if (authEl) authEl.style.display = 'none';
    if (appEl) appEl.classList.add('visible');
    if (emailDisp && adminUser) emailDisp.textContent = adminUser.email;
    
    loadAdminDashboard();
}

async function adminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errEl = document.getElementById('admin-error');
    if (!errEl) return;
    
    errEl.style.display = 'none';

    // 1. Aşama: Kod seviyesinde e-posta kontrolü
    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        errEl.textContent = 'Bu panel sadece yönetici e-postası ile açılır.';
        errEl.style.display = 'block';
        return;
    }

    try {
        // Firebase ile giriş denemesi
        const cred = await auth.signInWithEmailAndPassword(email, password);
        
        // 2. Aşama: Giren kullanıcının gerçekten admin olup olmadığının kontrolü
        if (cred.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            await auth.signOut();
            errEl.textContent = 'Yetkisiz hesap.';
            errEl.style.display = 'block';
            return;
        }
        
        adminUser = cred.user;
        showAdminApp();
    } catch (err) {
        console.error("Yönetici Giriş Hatası:", err);
        errEl.textContent = err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' 
            ? 'Yönetici e-postası veya şifre hatalı. (Lütfen Firebase Console üzerinden bu e-posta ile kullanıcı oluşturduğunuzdan emin olun).' 
            : err.message;
        errEl.style.display = 'block';
    }
}

async function adminLogout() {
    if (auth) await auth.signOut();
    adminUser = null;
    selectedUserId = null;
    showAdminAuth();
}

async function loadAdminDashboard() {
    const loadingEl = document.getElementById('admin-loading');
    if (loadingEl) loadingEl.style.style.display = 'block';

    try {
        // Tüm koleksiyonları eşzamanlı olarak çekiyoruz
        const [usersSnap, debtsSnap, activitySnap] = await Promise.all([
            db.collection('users').get(),
            db.collection('debts').get(),
            db.collection('activity').orderBy('createdAt', 'desc').limit(80).get()
        ]);

        allUsers = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        const allDebts = debtsSnap.docs.map(d => d.data());
        const activities = activitySnap.docs.map(d => ({ id: d.id, ...d.data() }));

        let totalRemaining = 0;
        allDebts.forEach(d => { totalRemaining += d.remainingAmount || 0; });

        // Arayüz sayaçlarını güncelle
        const totalUsersEl = document.getElementById('admin-total-users');
        const totalDebtEl = document.getElementById('admin-total-debt');
        const totalAccountsEl = document.getElementById('admin-total-accounts');

        if (totalUsersEl) totalUsersEl.textContent = allUsers.length;
        if (totalDebtEl) totalDebtEl.textContent = formatMoney(totalRemaining);
        if (totalAccountsEl) totalAccountsEl.textContent = allDebts.length;

        renderUserList(allUsers, allDebts);
        renderActivityFeed(activities);

        if (allUsers.length > 0 && !selectedUserId) {
            selectUser(allUsers[0].uid);
        }
    } catch (error) {
        console.error("Dashboard yüklenirken hata oluştu:", error);
    } finally {
        if (loadingEl) loadingEl.style.display = 'none';
    }
}

function renderUserList(users, allDebts) {
    const list = document.getElementById('user-list');
    if (!list) return;
    list.innerHTML = '';

    users.forEach(u => {
        const userDebts = allDebts.filter(d => d.userId === u.uid);
        const remaining = userDebts.reduce((s, d) => s + (d.remainingAmount || 0), 0);
        const div = document.createElement('div');
        div.className = 'user-item' + (selectedUserId === u.uid ? ' active' : '');
        div.dataset.uid = u.uid;
        div.innerHTML = `
            <strong>${escapeHtml(u.displayName || 'İsimsiz')}</strong>
            <div class="email">${escapeHtml(u.email || '')}</div>
            <div style="font-size:0.8rem;color:var(--danger);margin-top:4px;">Kalan: ${formatMoney(remaining)}</div>`;
        div.addEventListener('click', () => selectUser(u.uid));
        list.appendChild(div);
    });
}

async function selectUser(uid) {
    selectedUserId = uid;
    document.querySelectorAll('.user-item').forEach(el => {
        el.classList.toggle('active', el.dataset.uid === uid);
    });

    const user = allUsers.find(u => u.uid === uid);
    if (!user) return;

    const detailTitle = document.getElementById('detail-title');
    const detailEmail = document.getElementById('detail-email');
    if (detailTitle) detailTitle.textContent = user.displayName || 'Kullanıcı';
    if (detailEmail) detailEmail.textContent = user.email || '';

    try {
        const [debtsSnap, paymentsSnap, activitySnap] = await Promise.all([
            db.collection('debts').where('userId', '==', uid).get(),
            db.collection('payments').where('userId', '==', uid).get(),
            db.collection('activity').where('userId', '==', uid).get()
        ]);

        const debts = debtsSnap.docs.map(d => d.data());
        const payments = paymentsSnap.docs.map(d => d.data()).sort((a, b) => b.date.localeCompare(a.date));
        const activities = activitySnap.docs.map(d => d.data())
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
            .slice(0, 30);

        const tbody = document.getElementById('detail-debts');
        if (tbody) {
            tbody.innerHTML = '';
            debts.forEach(d => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(d.bankName)} <span class="badge ${d.type === 'kredi' ? 'badge-credit' : 'badge-other'}">${d.type}</span></td>
                    <td>${formatMoney(d.totalAmount)}</td>
                    <td>% ${(d.interestRate || 0).toFixed(2)}</td>
                    <td>${formatMoney(d.installmentAmount)}</td>
                    <td class="amount-remaining">${formatMoney(d.remainingAmount)}</td>`;
                tbody.appendChild(tr);
            });
        }

        const ptbody = document.getElementById('detail-payments');
        if (ptbody) {
            ptbody.innerHTML = '';
            payments.slice(0, 20).forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(p.bankName)}</td>
                    <td>${new Date(p.date).toLocaleDateString('tr-TR')}</td>
                    <td style="color:var(--success)">${formatMoney(p.amount)}</td>`;
                ptbody.appendChild(tr);
            });
        }

        const actList = document.getElementById('detail-activity');
        if (actList) {
            actList.innerHTML = '';
            activities.forEach(a => {
                const div = document.createElement('div');
                div.className = 'activity-row';
                div.innerHTML = `
                    <div class="action">${actionLabel(a.action)}</div>
                    <div>${escapeHtml(a.detail || '')}</div>
                    <div class="time">${formatDateTime(a.createdAt)}</div>`;
                actList.appendChild(div);
            });
        }
    } catch (error) {
        console.error("Kullanıcı detayları yüklenirken hata:", error);
    }
}

function renderActivityFeed(activities) {
    const feed = document.getElementById('global-activity');
    if (!feed) return;
    feed.innerHTML = '';

    if (activities.length === 0) {
        feed.innerHTML = '<p style="color:var(--text-muted);padding:12px;">Henüz aktivite yok.</p>';
        return;
    }

    activities.forEach(a => {
        const div = document.createElement('div');
        div.className = 'activity-row';
        div.innerHTML = `
            <div><strong>${escapeHtml(a.userName || 'Kullanıcı')}</strong> — <span class="action">${actionLabel(a.action)}</span></div>
            <div>${escapeHtml(a.detail || '')}</div>
            <div class="time">${formatDateTime(a.createdAt)}</div>`;
        feed.appendChild(div);
    });
}

function initAdminApp() {
    const loginForm = document.getElementById('admin-login-form');
    const logoutBtn = document.getElementById('admin-logout-btn');
    const refreshBtn = document.getElementById('refresh-btn');

    if (loginForm) loginForm.addEventListener('submit', adminLogin);
    if (logoutBtn) logoutBtn.addEventListener('click', adminLogout);
    if (refreshBtn) refreshBtn.addEventListener('click', loadAdminDashboard);

    if (auth) {
        auth.onAuthStateChanged(async user => {
            if (user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
                adminUser = user;
                showAdminApp();
            } else {
                if (user) await auth.signOut();
                showAdminAuth();
            }
        });
    }
}

// Firebase hazır olduğunda tetiklenmesi için global kaydetme
window.initAdminApp = initAdminApp;
