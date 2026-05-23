// ==========================================
// KULLANICI YAPILANDIRMASI & SABİTLER
// ==========================================
let currentUser = null;
let userProfile = null;
let debts = [];
let payments = [];
let paymentTargetId = null;

// Admin e-postasını çakışmaları engellemek için burada da tanımlıyoruz
const SYSTEM_ADMIN_EMAIL = "adminyusuf@gmail.com";

function showAuth() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app');
    if (authScreen) authScreen.style.display = 'flex';
    if (appScreen) appScreen.classList.remove('visible');
}

function showApp() {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app');
    const displayEl = document.getElementById('user-display-name');

    if (authScreen) authScreen.style.display = 'none';
    if (appScreen) appScreen.classList.add('visible');
    if (displayEl) displayEl.textContent = userProfile?.displayName || currentUser.email;
    
    const salaryInput = document.getElementById('salary-input');
    if (salaryInput) salaryInput.value = userProfile?.salary || '';
    
    loadUserData();
}

async function loadUserData() {
    if (!currentUser) return;
    const uid = currentUser.uid;

    try {
        const [debtsSnap, paymentsSnap] = await Promise.all([
            db.collection('debts').where('userId', '==', uid).get(),
            db.collection('payments').where('userId', '==', uid).get()
        ]);

        debts = debtsSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
        payments = paymentsSnap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
        
        debts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        payments.sort((a, b) => b.date.localeCompare(a.date));

        renderAll();
    } catch (error) {
        console.error("Kullanıcı verileri yüklenirken hata:", error);
    }
}

async function registerUser(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-password2').value;
    const errEl = document.getElementById('auth-error');

    if (!errEl) return;
    errEl.style.display = 'none';
    errEl.textContent = ''; // Önceki hataları temizle

    if (!name) {
        errEl.textContent = 'Lütfen adınızı girin.';
        errEl.style.display = 'block';
        return;
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
        errEl.textContent = 'Lütfen geçerli bir e-posta adresi girin.';
        errEl.style.display = 'block';
        return;
    }

    // Güvenlik: Admin e-postası ile normal kullanıcı kaydı yapılamaz
    if (email.toLowerCase() === SYSTEM_ADMIN_EMAIL.toLowerCase()) {
        errEl.textContent = 'Bu e-posta adresi yöneticiye aittir, kullanıcı olarak kaydedilemez.';
        errEl.style.display = 'block';
        return;
    }

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
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        if (typeof logActivity === 'function') {
            await logActivity(cred.user.uid, name, 'register', email + ' ile kayıt');
        }
        
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
    
    if (!errEl) return;
    errEl.style.display = 'none';
    errEl.textContent = ''; // Önceki hataları temizle

    if (!email || !password) {
        errEl.textContent = 'Lütfen e-posta ve şifrenizi girin.';
        errEl.style.display = 'block';
        return;
    }

    // Güvenlik: Admin bu ekrandan giriş yapmaya zorlanırsa engelle veya uyar
    if (email.toLowerCase() === SYSTEM_ADMIN_EMAIL.toLowerCase()) {
        errEl.textContent = 'Yönetici hesabı buradan giriş yapamaz. Lütfen Yönetici Paneli ekranını kullanın.';
        errEl.style.display = 'block';
        return;
    }

    try {
        const cred = await auth.signInWithEmailAndPassword(email, password);
        const doc = await db.collection('users').doc(cred.user.uid).get();
        
        userProfile = doc.exists ? doc.data() : { displayName: cred.user.displayName || email.split('@')[0], email };
        currentUser = cred.user;
        
        if (typeof logActivity === 'function') {
            await logActivity(cred.user.uid, userProfile.displayName, 'login', 'Giriş');
        }
        showApp();
    } catch (err) {
        errEl.textContent = firebaseAuthError(err);
        errEl.style.display = 'block';
    }
}

async function logoutUser() {
    if (currentUser && typeof logActivity === 'function') {
        await logActivity(currentUser.uid, userProfile?.displayName, 'logout', 'Çıkış');
    }
    if (auth) await auth.signOut();
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
    const bankName = fd.get('bankName')?.trim();
    const paymentDay = fd.get('paymentDay') ? parseInt(fd.get('paymentDay'), 10) : null;
    const installmentAmount = parseFloat(fd.get('installmentAmount'));
    const interestRate = parseFloat(fd.get('interestRate')) || 0;

    if (!bankName) {
        alert('Banka/Kurum adı boş bırakılamaz.');
        return;
    }
    if (isNaN(installmentAmount) || installmentAmount <= 0) {
        alert('Taksit Tutarı pozitif bir sayı olmalı.');
        return;
    }
    if (isNaN(interestRate) || interestRate < 0) {
        alert('Faiz Oranı negatif olamaz.');
        return;
    }
    
    let totalAmount = 0;
    let remainingAmount = 0;
    let totalInstallments = null;
    let paidSoFar = 0;

    if (type === 'kredi') {
        totalInstallments = parseInt(fd.get('totalInstallments'), 10);
        const paidInstallments = parseInt(fd.get('paidInstallments') || 0, 10);

        if (isNaN(totalInstallments) || totalInstallments <= 0) {
            alert('Toplam Taksit Sayısı pozitif bir sayı olmalı.');
            return;
        }
        if (isNaN(paidInstallments) || paidInstallments < 0 || paidInstallments > totalInstallments) {
            alert('Ödenen Taksit Sayısı geçerli bir sayı olmalı (0 ile Toplam Taksit arasında).');
            return;
        }
        
        totalAmount = installmentAmount * totalInstallments;
        remainingAmount = installmentAmount * Math.max(0, totalInstallments - paidInstallments);
        paidSoFar = installmentAmount * paidInstallments;
    } else { // diger
        totalAmount = parseFloat(fd.get('totalAmount'));
        remainingAmount = parseFloat(fd.get('remainingAmount'));
        
        if (isNaN(totalAmount) || totalAmount <= 0) {
            alert('Toplam Borç Miktarı pozitif bir sayı olmalı.');
            return;
        }
        if (isNaN(remainingAmount) || remainingAmount < 0 || remainingAmount > totalAmount) {
            alert('Kalan Tutar geçerli bir sayı olmalı (0 ile Toplam Borç arasında).');
            return;
        }
        paidSoFar = totalAmount - remainingAmount;
    }

    const data = {
        id: Date.now(),
        userId: currentUser.uid,
        userName: userProfile.displayName,
        type,
        bankName,
        paymentDay,
        totalAmount,
        remainingAmount,
        installmentAmount,
        interestRate,
        totalInstallments,
        paidSoFar,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('debts').add(data);
    
    if (typeof logActivity === 'function') {
        await logActivity(currentUser.uid, userProfile.displayName, 'debt_add', `${bankName} (${type}) — ${formatMoney(totalAmount)}`);
    }

    form.reset();
    await loadUserData();
}

function openPaymentModal(id) {
    const debt = debts.find(d => d.id === id);
    if (!debt || debt.remainingAmount <= 0) return;
    paymentTargetId = id;
    
    const modalBank = document.getElementById('payment-modal-bank');
    const modalAmount = document.getElementById('payment-amount');
    const modalDate = document.getElementById('payment-date');
    const modalContainer = document.getElementById('payment-modal');

    if (modalBank) modalBank.textContent = debt.bankName + ' — Kalan: ' + formatMoney(debt.remainingAmount);
    if (modalAmount) modalAmount.value = Math.min(debt.installmentAmount, debt.remainingAmount).toFixed(2);
    if (modalDate) modalDate.value = new Date().toISOString().slice(0, 10);
    if (modalContainer) modalContainer.classList.add('open');
}

function closePaymentModal() {
    paymentTargetId = null;
    const modalContainer = document.getElementById('payment-modal');
    if (modalContainer) modalContainer.classList.remove('open');
}

async function confirmPayment() {
    const debt = debts.find(d => d.id === paymentTargetId);
    if (!debt) return;

    const amount = parseFloat(document.getElementById('payment-amount').value);
    const dateStr = document.getElementById('payment-date').value;

    if (!amount || isNaN(amount) || amount <= 0) {
        alert('Geçerli bir ödeme tutarı girin.');
        return;
    }
    if (amount > debt.remainingAmount + 0.01) { // Küçük bir esneklik ile kalan borçtan fazla ödeme kontrolü
        alert('Ödenecek tutar kalan borçtan fazla olamaz.');
        return;
    }

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

    if (typeof logActivity === 'function') {
        await logActivity(currentUser.uid, userProfile.displayName, 'payment', `${debt.bankName} — ${formatMoney(payAmount)} (${dateStr})`);
    }

    closePaymentModal();
    await loadUserData();
}

async function deleteDebt(id) {
    if (!confirm('Bu hesabı silmek istediğinize emin misiniz?')) return;
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    await db.collection('debts').doc(debt.firestoreId).delete();
    
    if (typeof logActivity === 'function') {
        await logActivity(currentUser.uid, userProfile.displayName, 'debt_delete', debt.bankName);
    }
    await loadUserData();
}

function escapeCsv(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    // Virgül, çift tırnak veya yeni satır içeriyorsa çift tırnak içine al ve mevcut çift tırnakları kaçır
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
}

async function downloadCSV() {
    if (!currentUser || !userProfile || (debts.length === 0 && payments.length === 0)) {
        alert('İndirilecek veri bulunamadı veya kullanıcı oturum açmamış.');
        return;
    }

    let csvContent = '';

    // Borçlar (Debts)
    if (debts.length > 0) {
        csvContent += 'BORÇLAR\n';
        csvContent += ['Banka/Kurum', 'Tip', 'Ödeme Günü', 'Toplam Tutar', 'Kalan Tutar', 'Ödenen Tutar', 'Taksit Tutarı', 'Faiz Oranı', 'Toplam Taksit', 'Oluşturulma Tarihi'].map(escapeCsv).join(',') + '\n';
        debts.forEach(d => {
            const row = [
                d.bankName,
                d.type,
                d.paymentDay,
                d.totalAmount,
                d.remainingAmount,
                d.paidSoFar,
                d.installmentAmount,
                d.interestRate,
                d.totalInstallments,
                d.createdAt ? new Date(d.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : ''
            ];
            csvContent += row.map(escapeCsv).join(',') + '\n';
        });
        csvContent += '\n'; // ayırıcı
    }

    // Ödemeler (Payments)
    if (payments.length > 0) {
        csvContent += 'ÖDEMELER\n';
        csvContent += ['Banka/Kurum', 'Tip', 'Miktar', 'Tarih', 'Oluşturulma Tarihi'].map(escapeCsv).join(',') + '\n';
        payments.forEach(p => {
            const row = [
                p.bankName,
                p.type,
                p.amount,
                p.date,
                p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('tr-TR') : ''
            ];
            csvContent += row.map(escapeCsv).join(',') + '\n';
        });
    }

    const filename = `borc_takip_verileri_${userProfile.displayName || currentUser.email.split('@')[0]}_${new Date().toISOString().slice(0, 10)}.csv`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // özellik algılama
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else {
        alert('CSV indirme tarayıcınız tarafından desteklenmiyor. Lütfen farklı bir tarayıcı deneyin.');
    }

    if (typeof logActivity === 'function') {
        await logActivity(currentUser.uid, userProfile.displayName, 'data_export', 'CSV indirme');
    }
}

function renderProgress(debt) {
    const paid = debt.totalAmount - debt.remainingAmount;
    const pct = debt.totalAmount > 0 ? Math.min(100, (paid / debt.totalAmount) * 100) : 0;
    return `<div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>\n            <span style="font-size:0.75rem;color:var(--text-muted);">` + pct.toFixed(0) + `%</span>`;
}

function findClosestDebtId() {
    let closestDebtId = null;
    let minDiff = Infinity;
    const now = new Date();
    const currentDay = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    debts.forEach(d => {
        if (d.remainingAmount <= 0 || !d.paymentDay) return;
        let diff = d.paymentDay - currentDay;
        if (diff < 0) {
            diff = (daysInMonth - currentDay) + d.paymentDay;
        }
        if (diff < minDiff) {
            minDiff = diff;
            closestDebtId = d.id;
        }
    });
    return { closestDebtId, minDiff };
}

function renderTable(type, tbodyId, emptyId, showPaid) {
    const list = debts.filter(d => d.type === type);
    const tbody = document.getElementById(tbodyId);
    const empty = document.getElementById(emptyId);
    if (!tbody || !empty) return;
    tbody.innerHTML = '';

    if (list.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    const { closestDebtId } = findClosestDebtId();

    list.forEach(debt => {
        const done = debt.remainingAmount <= 0;
        const paid = debt.paidSoFar ?? (debt.totalAmount - debt.remainingAmount);
        
        const isClosest = debt.id === closestDebtId && !done;
        const tr = document.createElement('tr');
        if (isClosest) {
            tr.className = 'highlight-payment';
        }
        
        tr.innerHTML = `
            <td><strong>${escapeHtml(debt.bankName)}</strong></td>
            <td>Her ayın <strong>${debt.paymentDay || '-'}</strong>'i</td>
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

    const elRemaining = document.getElementById('total-remaining');
    const elPaidSub = document.getElementById('total-paid-sub');
    const elMonthPaid = document.getElementById('month-paid');
    const elMonthLabel = document.getElementById('month-label');
    const elMonthlyPlan = document.getElementById('monthly-plan');
    const elAccountCount = document.getElementById('account-count');
    const elSplit = document.getElementById('credit-other-split');

    if (elRemaining) elRemaining.textContent = formatMoney(totalRemaining);
    if (elPaidSub) elPaidSub.textContent = 'Toplam ödenen: ' + formatMoney(totalPaid);
    if (elMonthPaid) elMonthPaid.textContent = formatMoney(monthPaid);
    if (elMonthLabel) elMonthLabel.textContent = new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    if (elMonthlyPlan) elMonthlyPlan.textContent = formatMoney(monthlyPlan);
    if (elAccountCount) elAccountCount.textContent = debts.length;
    if (elSplit) elSplit.textContent = `${kredi} kredi · ${diger} diğer`;

    // Aylık Bütçe Planlama Hesaplamaları
    const salary = parseFloat(userProfile?.salary) || 0;
    const remainingBudget = salary - monthlyPlan;
    
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const remainingDays = daysInMonth - now.getDate() + 1;
    
    const dailyLimit = remainingDays > 0 ? (remainingBudget > 0 ? (remainingBudget / remainingDays) : 0) : 0;
    
    const elNetVal = document.getElementById('net-budget-val');
    const elDailyVal = document.getElementById('daily-limit-val');
    const elTipMsg = document.getElementById('budget-tip-msg');
    
    if (elNetVal) {
        elNetVal.textContent = formatMoney(remainingBudget);
        if (remainingBudget < 0) {
            elNetVal.className = 'value budget-negative';
        } else {
            elNetVal.className = 'value';
        }
    }
    
    if (elDailyVal) {
        elDailyVal.textContent = formatMoney(dailyLimit);
    }
    
    if (elTipMsg) {
        if (salary <= 0) {
            elTipMsg.innerHTML = `💡 Maaşınızı sol taraftan girerek bütçe planınızı görebilirsiniz.`;
        } else if (remainingBudget < 0) {
            elTipMsg.innerHTML = `⚠️ **Dikkat!** Aylık taksit ödemeleriniz maaşınızı aşıyor! Harcamalarınıza dikkat etmelisiniz.`;
        } else {
            elTipMsg.innerHTML = `💡 **Bütçe İpucu:** Borçlarınızı ödedikten sonra günde en fazla **${formatMoney(dailyLimit)}** harcayarak ay sonunu rahatça getirebilirsiniz! (Kalan gün: ${remainingDays})`;
        }
    }
    
    // En yakın yaklaşan ödeme göstergesi
    const { closestDebtId, minDiff } = findClosestDebtId();
    const closestDebt = debts.find(d => d.id === closestDebtId);
    const elNextPaymentVal = document.getElementById('next-payment-val');
    
    if (elNextPaymentVal) {
        if (closestDebt) {
            elNextPaymentVal.textContent = `${closestDebt.bankName} (Ayın ${closestDebt.paymentDay}'i — ${minDiff} gün kaldı)`;
        } else {
            elNextPaymentVal.textContent = 'Aktif ödemeniz yok';
        }
    }
}

function renderHistory() {
    const monthInput = document.getElementById('history-month');
    if (!monthInput) return;
    if (!monthInput.value) monthInput.value = new Date().toISOString().slice(0, 7);
    const selected = monthInput.value;
    const filtered = payments.filter(p => p.monthKey === selected);

    const elSelectedTotal = document.getElementById('selected-month-total');
    if (elSelectedTotal) elSelectedTotal.textContent = formatMoney(filtered.reduce((s, p) => s + p.amount, 0));

    const list = document.getElementById('history-list');
    const empty = document.getElementById('empty-history');
    if (!list || !empty) return;
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
    if (summaryBody) {
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

    if (!msg) return;
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
        
        if (typeof logActivity === 'function') {
            await logActivity(currentUser.uid, userProfile.displayName, 'password_change', 'Şifre güncellendi');
        }
        
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
    // Sekme geçiş dinleyicileri
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
            tab.classList.add('active');
            const targetForm = document.getElementById(tab.dataset.form);
            if (targetForm) targetForm.classList.add('active');
            const errEl = document.getElementById('auth-error');
            if (errEl) errEl.style.display = 'none';
        });
    });

    const formRegister = document.getElementById('form-register');
    const formLogin = document.getElementById('form-login');
    const logoutBtn = document.getElementById('logout-btn');
    const formKredi = document.getElementById('form-kredi');
    const formDiger = document.getElementById('form-diger');
    const payCancel = document.getElementById('payment-cancel');
    const payConfirm = document.getElementById('payment-confirm');
    const histMonth = document.getElementById('history-month');
    const chgPwBtn = document.getElementById('change-password-btn');

    if (formRegister) formRegister.addEventListener('submit', registerUser);
    if (formLogin) formLogin.addEventListener('submit', loginUser);
    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);
    if (formKredi) formKredi.addEventListener('submit', e => { e.preventDefault(); addDebt('kredi', e.target); });
    if (formDiger) formDiger.addEventListener('submit', e => { e.preventDefault(); addDebt('diger', e.target); });
    if (payCancel) payCancel.addEventListener('click', closePaymentModal);
    if (payConfirm) payConfirm.addEventListener('click', confirmPayment);
    if (histMonth) histMonth.addEventListener('change', renderHistory);
    if (chgPwBtn) chgPwBtn.addEventListener('click', changePassword);

    const saveSalaryBtn = document.getElementById('save-salary-btn');
    if (saveSalaryBtn) {
        saveSalaryBtn.addEventListener('click', async () => {
            const salaryInput = document.getElementById('salary-input');
            if (!salaryInput) return;
            const val = parseFloat(salaryInput.value) || 0;
            if (val < 0) return alert('Geçerli bir maaş girin.');
            
            try {
                await db.collection('users').doc(currentUser.uid).update({ salary: val });
                userProfile.salary = val;
                renderSummary();
                alert('Maaşınız başarıyla kaydedildi!');
            } catch (error) {
                console.error("Maaş güncellenirken hata:", error);
                alert('Maaş kaydedilemedi. Lütfen tekrar deneyin.');
            }
        });
    }

    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const targetPanel = document.getElementById('panel-' + tab.dataset.tab);
            if (targetPanel) targetPanel.classList.add('active');
        });
    });

    // Oturum durum dinleyicisi (Admin ile çakışmayı önleyen filtreli yapı)
    if (auth) {
        auth.onAuthStateChanged(async user => {
            if (user) {
                // Eğer giriş yapan hesap admin e-postası ise kullanıcı panelini yükleme
                if (user.email.toLowerCase() === SYSTEM_ADMIN_EMAIL.toLowerCase()) {
                    return; 
                }
                currentUser = user;
                const doc = await db.collection('users').doc(user.uid).get();
                userProfile = doc.exists ? doc.data() : { displayName: user.displayName || user.email, email: user.email };
                showApp();
            } else {
                // Sadece kullanıcı ekranındaysak auth ekranını göster
                const authScreen = document.getElementById('auth-screen');
                if (authScreen) showAuth();
            }
        });
    }
}

window.initUserApp = initUserApp;
