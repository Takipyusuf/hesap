let adminUser = null;
let allUsers = [];
let selectedUserId = null;

function showAdminAuth() {
    document.getElementById('admin-auth').style.display = 'flex';
    document.getElementById('admin-app').classList.remove('visible');
}

function showAdminApp() {
    document.getElementById('admin-auth').style.display = 'none';
    document.getElementById('admin-app').classList.add('visible');
    document.getElementById('admin-email-display').textContent = adminUser.email;
    loadAdminDashboard();
}

async function adminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errEl = document.getElementById('admin-error');
    errEl.style.display = 'none';

    if (email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
        errEl.textContent = 'Bu panel sadece yönetici e-postası ile açılır.';
        errEl.style.display = 'block';
        return;
    }

    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        if (cred.user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
            await auth.signOut();
            errEl.textContent = 'Yetkisiz hesap.';
            errEl.style.display = 'block';
            return;
        }
        adminUser = cred.user;
        showAdminApp();
    } catch (err) {
        errEl.textContent = err.code === 'auth/invalid-credential' ? 'E-posta veya şifre hatalı.' : err.message;
        errEl.style.display = 'block';
    }
}

async function adminLogout() {
    await auth.signOut();
    adminUser = null;
    selectedUserId = null;
    showAdminAuth();
}

async function loadAdminDashboard() {
    document.getElementById('admin-loading').style.display = 'block';

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

    document.getElementById('admin-total-users').textContent = allUsers.length;
    document.getElementById('admin-total-debt').textContent = formatMoney(totalRemaining);
    document.getElementById('admin-total-accounts').textContent = allDebts.length;

    renderUserList(allUsers, allDebts);
    renderActivityFeed(activities);
    document.getElementById('admin-loading').style.display = 'none';

    if (allUsers.length > 0 && !selectedUserId) {
        selectUser(allUsers[0].uid);
    }
}

function renderUserList(users, allDebts) {
    const list = document.getElementById('user-list');
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

    document.getElementById('detail-title').textContent = user.displayName || 'Kullanıcı';
    document.getElementById('detail-email').textContent = user.email || '';

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

    const ptbody = document.getElementById('detail-payments');
    ptbody.innerHTML = '';
    payments.slice(0, 20).forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(p.bankName)}</td>
            <td>${new Date(p.date).toLocaleDateString('tr-TR')}</td>
            <td style="color:var(--success)">${formatMoney(p.amount)}</td>`;
        ptbody.appendChild(tr);
    });

    const actList = document.getElementById('detail-activity');
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

function renderActivityFeed(activities) {
    const feed = document.getElementById('global-activity');
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
    document.getElementById('admin-login-form').addEventListener('submit', adminLogin);
    document.getElementById('admin-logout-btn').addEventListener('click', adminLogout);
    document.getElementById('refresh-btn').addEventListener('click', loadAdminDashboard);

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
