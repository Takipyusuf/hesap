let currentUser = null;
let userProfile = null;
let debts = [];
let payments = [];
let paymentTargetId = null;

function showAuth() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').classList.remove('visible');
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    document.getElementById('user-display-name').textContent = userProfile?.displayName || currentUser.email;
    loadUserData();
}

async function loadUserData() {
    if (!currentUser) return;
    const uid = currentUser.uid;

    const [debtsSnap, paymentsSnap] = await Promise.all([
        db.collection('debts').where('userId', '==', uid).get(),
        db.collection('payments').where('userId', '==', uid).get()
    ]);

    debts = debtsSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
    payments = paymentsSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
    debts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    payments.sort((a, b) => b.date.localeCompare(a.date));

    renderAll();
}

async function registerUser(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-password2').value;
    const errEl = document.getElementById('auth-error');

    errEl.style.display = 'none';
    if (password.length < 6) {
        errEl.textContent = 'Şifre en az 6 karakter olmalı.';
        errEl.style.display = 'block';
        return;
    }
    if (password !== confirm) {
        errEl.textContent = 'Şifreler eşleşmiyor.';
        errEl.style.display = 'block';
        return;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName: name });
        await db.collection('users').doc(cred.user.uid).set({
            displayName: name,
            email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await logActivity(cred.user.uid, name, 'register', email + ' ile kayıt');
        currentUser = cred.user;
        userProfile = { displayName: name, email };
        showApp();
    } catch (err) {
        errEl.textContent = firebaseAuthError(err);
        errEl.style.display = 'block';
    }
}

async function loginUser(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('auth-error');
    errEl.style.display = 'none';

    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        const doc = await db.collection('users').doc(cred.user.uid).get();
        userProfile = doc.exists ? doc.data() : { displayName: cred.user.displayName || email.split('@')[0], email };
        currentUser = cred.user;
        await logActivity(cred.user.uid, userProfile.displayName, 'login', 'Giriş');
        showApp();
    } catch (err) {
        errEl.textContent = firebaseAuthError(err);
        errEl.style.display = 'block';
    }
}

async function logoutUser() {
    if (currentUser) {
        await logActivity(currentUser.uid, userProfile?.displayName, 'logout', 'Çıkış');
    }
    await auth.signOut();
    currentUser = null;
    userProfile = null;
    debts = [];
    payments = [];
    showAuth();
}

function firebaseAuthError(err) {
    const map = {
        'auth/email-already-in-use': 'Bu e-posta zaten kayıtlı.',
        'auth/invalid-email': 'Geçersiz e-posta.',
        'auth/weak-password': 'Şifre çok zayıf.',
        'auth/user-not-found': 'Kullanıcı bulunamadı.',
        'auth/wrong-password': 'Hatalı şifre.',
        'auth/invalid-credential': 'E-posta veya şifre hatalı.'
    };
    return map[err.code] || err.message;
}

async function addDebt(type, form) {
    const fd = new FormData(form);
    const total = parseFloat(fd.get('totalAmount'));
    const remaining = parseFloat(fd.get('remainingAmount'));
    const bankName = fd.get('bankName').trim();

    const data = {
        id: Date.now(),
        userId: currentUser.uid,
        userName: userProfile.displayName,
        type,
        bankName,
        totalAmount: total,
        remainingAmount: remaining,
        installmentAmount: parseFloat(fd.get('installmentAmount')),
        interestRate: parseFloat(fd.get('interestRate')) || 0,
        totalInstallments: fd.get('totalInstallments') ? parseInt(fd.get('totalInstallments'), 10) : null,
        paidSoFar: type === 'diger' ? (parseFloat(fd.get('paidSoFar')) || (total - remaining)) : (total - remaining),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const ref = await db.collection('debts').add(data);
    await logActivity(currentUser.uid, userProfile.displayName, 'debt_add',
        `${bankName} (${type}) — ${formatMoney(total)}`);

    form.reset();
    await loadUserData();
}

function openPaymentModal(id) {
    const debt = debts.find(d => d.id === id);
    if (!debt || debt.remainingAmount <= 0) return;
    paymentTargetId = id;
    document.getElementById('payment-modal-bank').textContent = debt.bankName + ' — Kalan: ' + formatMoney(debt.remainingAmount);
    document.getElementById('payment-amount').value = Math.min(debt.installmentAmount, debt.remainingAmount).toFixed(2);
    document.getElementById('payment-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('payment-modal').classList.add('open');
}

function closePaymentModal() {
    paymentTargetId = null;
    document.getElementById('payment-modal').classList.remove('open');
}

async function confirmPayment() {
    const debt = debts.find(d => d.id === paymentTargetId);
    if (!debt) return;

    const amount = parseFloat(document.getElementById('payment-amount').value);
    const dateStr = document.getElementById('payment-date').value;
    if (!amount || amount <= 0) return alert('Geçerli bir tutar girin.');

    const payAmount = Math.min(amount, debt.remainingAmount);
    const newRemaining = Math.max(0, debt.remainingAmount - payAmount);
    const newPaidSoFar = (debt.paidSoFar || 0) + payAmount;

    const debtRef = db.collection('debts').doc(debt.firestoreId);
    await debtRef.update({
        remainingAmount: newRemaining,
        paidSoFar: newPaidSoFar
    });

    await db.collection('payments').add({
        userId: currentUser.uid,
        userName: userProfile.displayName,
        debtId: debt.id,
        bankName: debt.bankName,
        type: debt.type,
        amount: payAmount,
        date: dateStr,
        monthKey: dateStr.slice(0, 7),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await logActivity(currentUser.uid, userProfile.displayName, 'payment',
        `${debt.bankName} — ${formatMoney(payAmount)} (${dateStr})`);

    closePaymentModal();
    await loadUserData();
}

async function deleteDebt(id) {
    if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    await db.collection('debts').doc(debt.firestoreId).delete();
    await logActivity(currentUser.uid, userProfile.displayName, 'debt_delete', debt.bankName);
    await loadUserData();
}

function renderProgress(debt) {
    const paid = debt.totalAmount - debt.remainingAmount;
    const pct = debt.totalAmount > 0 ? Math.min(100, (paid / debt.totalAmount) * 100) : 0;
    return `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
            <span style="font-size:0.75rem;color:var(--text-muted);">${pct.toFixed(0)}%</span>`;
}

function renderTable(type, tbodyId, emptyId, showPaid) {
    const list = debts.filter(d => d.type === type);
    const tbody = document.getElementById(tbodyId);
    const empty = document.getElementById(emptyId);
    tbody.innerHTML = '';

    if (list.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    list.forEach(debt => {
        const done = debt.remainingAmount <= 0;
        const paid = debt.paidSoFar ?? (debt.totalAmount - debt.remainingAmount);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${escapeHtml(debt.bankName)}</strong></td>
            <td>${formatMoney(debt.totalAmount)}</td>
            ${showPaid ? `<td>${formatMoney(paid)}</td>` : ''}
            <td>% ${(debt.interestRate || 0).toFixed(2)}</td>
            <td>${formatMoney(debt.installmentAmount)}</td>
            <td class="${done ? 'amount-done' : 'amount-remaining'}">${formatMoney(debt.remainingAmount)}</td>
            ${type === 'kredi' ? `<td>${renderProgress(debt)}</td>` : ''}
            <td class="row-actions">
                <button class="btn btn-accent btn-sm pay-btn" data-id="${debt.id}" ${done ? 'disabled' : ''}><i class="fa-solid fa-check"></i> Öde</button>
                <button class="btn btn-danger btn-sm del-btn" data-id="${debt.id}"><i class="fa-solid fa-trash"></i></button>
            </td>`;
        tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.pay-btn').forEach(btn => btn.addEventListener('click', () => openPaymentModal(Number(btn.dataset.id))));
    tbody.querySelectorAll('.del-btn').forEach(btn => btn.addEventListener('click', () => deleteDebt(Number(btn.dataset.id))));
}

function renderSummary() {
    let totalRemaining = 0, totalPaid = 0, monthlyPlan = 0, kredi = 0, diger = 0;
    const currentMonth = new Date().toISOString().slice(0, 7);

    debts.forEach(d => {
        totalRemaining += d.remainingAmount;
        totalPaid += d.paidSoFar ?? (d.totalAmount - d.remainingAmount);
        if (d.remainingAmount > 0) monthlyPlan += d.installmentAmount;
        if (d.type === 'kredi') kredi++; else diger++;
    });

    const monthPaid = payments.filter(p => p.monthKey === currentMonth).reduce((s, p) => s + p.amount, 0);

    document.getElementById('total-remaining').textContent = formatMoney(totalRemaining);
    document.getElementById('total-paid-sub').textContent = 'Toplam ödenen: ' + formatMoney(totalPaid);
    document.getElementById('month-paid').textContent = formatMoney(monthPaid);
    document.getElementById('month-label').textContent = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    document.getElementById('monthly-plan').textContent = formatMoney(monthlyPlan);
    document.getElementById('account-count').textContent = debts.length;
    document.getElementById('credit-other-split').textContent = `${kredi} kredi · ${diger} diğer`;
}

function renderHistory() {
    const monthInput = document.getElementById('history-month');
    if (!monthInput.value) monthInput.value = new Date().toISOString().slice(0, 7);
    const selected = monthInput.value;
    const filtered = payments.filter(p => p.monthKey === selected);

    document.getElementById('selected-month-total').textContent = formatMoney(filtered.reduce((s, p) => s + p.amount, 0));

    const list = document.getElementById('history-list');
    const empty = document.getElementById('empty-history');
    list.innerHTML = '';

    if (filtered.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `<span><strong>${escapeHtml(p.bankName)}</strong></span>
            <span>${new Date(p.date).toLocaleDateString('tr-TR')} — <strong style="color:var(--success)">${formatMoney(p.amount)}</strong></span>`;
        list.appendChild(div);
    });

    const summaryBody = document.getElementById('monthly-summary-table');
    summaryBody.innerHTML = '';
    const d = new Date();
    for (let i = 0; i < 6; i++) {
        const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
        const mk = m.toISOString().slice(0, 7);
        const pays = payments.filter(p => p.monthKey === mk);
        const total = pays.reduce((s, p) => s + p.amount, 0);
        const label = m.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${label}</td><td><strong>${formatMoney(total)}</strong></td><td>${pays.length}</td>`;
        summaryBody.appendChild(tr);
    }
}

function renderAll() {
    renderTable('kredi', 'table-kredi', 'empty-kredi', false);
    renderTable('diger', 'table-diger', 'empty-diger', true);
    renderSummary();
    renderHistory();
}

async function changePassword() {
    const oldPw = document.getElementById('old-password').value;
    const newPw = document.getElementById('new-password').value.trim();
    const confirm = document.getElementById('new-password-confirm').value.trim();
    const msg = document.getElementById('password-msg');

    msg.style.display = 'none';
    if (newPw.length < 6) {
        msg.style.color = 'var(--danger)';
        msg.textContent = 'Yeni şifre en az 6 karakter.';
        msg.style.display = 'block';
        return;
    }
    if (newPw !== confirm) {
        msg.style.color = 'var(--danger)';
        msg.textContent = 'Şifreler eşleşmiyor.';
        msg.style.display = 'block';
        return;
    }

    try {
        const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, oldPw);
        await currentUser.reauthenticateWithCredential(cred);
        await currentUser.updatePassword(newPw);
        await logActivity(currentUser.uid, userProfile.displayName, 'password_change', 'Şifre güncellendi');
        msg.style.color = 'var(--success)';
        msg.textContent = 'Şifre güncellendi.';
        msg.style.display = 'block';
        document.getElementById('old-password').value = '';
        document.getElementById('new-password').value = '';
        document.getElementById('new-password-confirm').value = '';
    } catch (err) {
        msg.style.color = 'var(--danger)';
        msg.textContent = err.code === 'auth/wrong-password' ? 'Mevcut şifre yanlış.' : err.message;
        msg.style.display = 'block';
    }
}

function initUserApp() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.form).classList.add('active');
            document.getElementById('auth-error').style.display = 'none';
        });
    });

    document.getElementById('form-register').addEventListener('submit', registerUser);
    document.getElementById('form-login').addEventListener('submit', loginUser);
    document.getElementById('logout-btn').addEventListener('click', logoutUser);
    document.getElementById('form-kredi').addEventListener('submit', e => { e.preventDefault(); addDebt('kredi', e.target); });
    document.getElementById('form-diger').addEventListener('submit', e => { e.preventDefault(); addDebt('diger', e.target); });
    document.getElementById('payment-cancel').addEventListener('click', closePaymentModal);
    document.getElementById('payment-confirm').addEventListener('click', confirmPayment);
    document.getElementById('history-month').addEventListener('change', renderHistory);
    document.getElementById('change-password-btn').addEventListener('click', changePassword);

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
        });
    });

    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUser = user;
            const doc = await db.collection('users').doc(user.uid).get();
            userProfile = doc.exists ? doc.data() : { displayName: user.displayName || user.email, email: user.email };
            showApp();
        } else {
            showAuth();
        }
    });
}
