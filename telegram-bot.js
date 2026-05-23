/**
 * 🚀 HESAP TAKİP - BULUT UYUMLU DOĞRUDAN GITHUB KOD AJANI (HERMES)
 * -------------------------------------------------------------
 * Bu script, bilgisayarınızı açmanıza veya yerel Git kullanmanıza
 * gerek kalmadan, Telegram'dan doğrudan GitHub deponuzdaki dosyaları
 * günceller ve commit atar. Canlı siteniz otomatik olarak güncellenir!
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ==========================================
// ⚙️ YAPILANDIRMA AYARLARI
// ==========================================
// 1. Telegram Ayarları
const BOT_TOKEN = '';
const ALLOWED_CHAT_ID = '';

// 2. GitHub Ayarları (Canlı deponuzu uzaktan düzenlemek için)
// ⚠️ ÖNEMLİ: Aşağıdaki GITHUB_TOKEN alanına GitHub'dan aldığınız erişim anahtarını (PAT) yazmalısınız.
const GITHUB_TOKEN = '';
const GITHUB_OWNER = 'Takipyusuf';
const GITHUB_REPO = 'hesap';
const GITHUB_BRANCH = 'main';

// ==========================================
// 🧠 GEMINI YAPAY ZEKA SİSTEM PROMPTU
// ==========================================
const SYSTEM_PROMPT = `Sen Yusuf'un borç takip projesinde çalışan bulut tabanlı bir yapay zeka yazılım geliştirme asistanısın (Hermes).
Kullanıcı seninle Telegram üzerinden sohbet eder ve deponun güncel halindeki dosyaları düzenlemeni ister.

DEPO İÇİNDEKİ DOSYALAR VE GÖREVLERİ:
- index.html (Kullanıcı giriş ekranı, borç taksit ödeme modalı, maaş & bütçe planlayıcı ve AI sohbet arayüzü)
- admin.html (Yönetici arayüzü, kullanıcı listesi, kullanıcı detay penceresi, canlı aktivite akışı)
- styles.css (Tüm uygulamanın modern, premium, responsive ve koyu renk şemalı CSS tasarımları)
- app-core.js (Firebase veritabanı başlatma, para formatlama, AI entegrasyonu ortak fonksiyonları)
- user-app.js (Kullanıcı arayüzü mantığı, borç ekleme/taksit ödeme Firestore entegrasyonu)
- admin-app.js (Yönetici arayüzü mantığı, tüm kullanıcı verilerini ve aktiviteleri çekme)
- firebase-config.js (Firebase ve Gemini API anahtarları)

DOSYA DÜZENLEME KURALLARI:
Eğer bir dosyada değişiklik yapman veya yeni kod eklemen gerekirse, cevabının içinde MUTLAKA şu etiket formatını kullanmalısın:

<<<EDIT_FILE: dosya_adi.js>>>
<<<SEARCH>>>
(Değiştirmek istediğin tam kod bloğu - mevcut dosyada birebir aynı satır boşluklarıyla olmalıdır)
<<<REPLACE>>>
(Yeni kod bloğu)
<<<END>>>

ÖNEMLİ KURALLAR:
1. Arama yapacağın <<<SEARCH>>> bloğunun dosyadaki orijinal kodla karakteri karakterine, boşlukları boşluğuna tam uyuşması şarttır. Yoksa düzenleme motoru kodu bulamaz.
2. Birden fazla dosya veya aynı dosyada birden fazla yerde değişiklik yapacaksan, birden fazla EDIT_FILE bloğu açabilirsin.
3. Değişiklik yaptığında neyi neden yaptığını Türkçe olarak açıklayan samimi ve profesyonel bir mesaj yaz.`;

// ==========================================
// 🛠️ YARDIMCI FONKSİYONLAR
// ==========================================

let lastUpdateId = 0;

// firebase-config.js içeriğinden Gemini API anahtarını yerel veya GitHub'dan çeken fonksiyon
function getGeminiApiKey() {
    try {
        const configPath = path.join(__dirname, 'firebase-config.js');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const match = content.match(/ANTIGRAVITY_CONFIG\s*=\s*\{[\s\S]*?apiKey:\s*["'](AIzaSy[A-Za-z0-9_-]+)["']/);
            if (match) return match[1];
        }
    } catch (e) {
        console.error("Yerel API Key okuma hatası (Bulut modunda GitHub'dan çekilecek):", e.message);
    }
    // Varsayılan anahtarı döndür veya GitHub içeriğinden dinamik çekecek şekilde yedekle
return '';}

// Telegram API'sine istek gönderen ortak fonksiyon
function telegramRequest(method, data = {}) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(data);
        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${BOT_TOKEN}/${method}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.ok) resolve(parsed.result);
                    else reject(parsed);
                } catch (e) { reject(e); }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

// Telegram'a mesaj gönderme fonksiyonu
async function sendMessage(chatId, text, replyMarkup = null) {
    try {
        const payload = {
            chat_id: chatId,
            text: text,
            parse_mode: 'Markdown'
        };
        if (replyMarkup) payload.reply_markup = replyMarkup;
        await telegramRequest('sendMessage', payload);
    } catch (err) {
        console.error("✉️ Mesaj gönderilemedi:", err.message || err);
    }
}

// ==========================================
// 🐙 GITHUB REST API MOTORU
// ==========================================

function githubRequest(method, endpoint, data = null) {
    return new Promise((resolve, reject) => {
        if (!GITHUB_TOKEN || GITHUB_TOKEN.includes('BURAYA_GITHUB')) {
            return reject(new Error("GITHUB_TOKEN_MISSING"));
        }

        const options = {
            hostname: 'api.github.com',
            port: 443,
            path: endpoint,
            method: method,
            headers: {
                'User-Agent': 'Hermes-AI-Agent-Bot',
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        };

        const payload = data ? JSON.stringify(data) : null;
        if (payload) {
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(parsed);
                    }
                } catch (e) { reject(e); }
            });
        });

        req.on('error', (e) => reject(e));
        if (payload) req.write(payload);
        req.end();
    });
}

// GitHub'dan dosya içeriğini ve SHA değerini alan fonksiyon
async function fetchFileFromGithub(fileName) {
    try {
        const endpoint = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${fileName}?ref=${GITHUB_BRANCH}`;
        const res = await githubRequest('GET', endpoint);
        const content = Buffer.from(res.content, 'base64').toString('utf8');
        return {
            content,
            sha: res.sha
        };
    } catch (err) {
        console.error(`GitHub'dan ${fileName} alınamadı:`, err);
        throw err;
    }
}

// Düzenlenen dosyayı doğrudan GitHub'a pushlayan fonksiyon
async function commitFileToGithub(fileName, newContent, sha, commitMessage) {
    try {
        const endpoint = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${fileName}`;
        const base64Content = Buffer.from(newContent, 'utf8').toString('base64');
        const payload = {
            message: commitMessage,
            content: base64Content,
            sha: sha,
            branch: GITHUB_BRANCH
        };
        await githubRequest('PUT', endpoint, payload);
        return true;
    } catch (err) {
        console.error(`GitHub'a ${fileName} yüklenemedi:`, err);
        throw err;
    }
}

// ==========================================
// 🧠 GEMINI AI BAĞLANTI MOTORU
// ==========================================

function normalizeLineEndings(text) {
    return String(text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceEditBlock(fileContent, searchContent, replaceContent) {
    if (fileContent.includes(searchContent)) {
        return {
            ok: true,
            content: fileContent.replace(searchContent, replaceContent),
            strategy: 'exact'
        };
    }

    const normalizedFile = normalizeLineEndings(fileContent);
    const normalizedSearch = normalizeLineEndings(searchContent);
    const normalizedReplace = normalizeLineEndings(replaceContent);

    if (normalizedFile.includes(normalizedSearch)) {
        return {
            ok: true,
            content: normalizedFile.replace(normalizedSearch, normalizedReplace),
            strategy: 'line-ending'
        };
    }

    const trimmedSearch = normalizedSearch.trim();
    const trimmedReplace = normalizedReplace.trim();

    if (trimmedSearch && normalizedFile.includes(trimmedSearch)) {
        return {
            ok: true,
            content: normalizedFile.replace(trimmedSearch, trimmedReplace),
            strategy: 'trimmed'
        };
    }

    if (trimmedSearch) {
        const flexiblePattern = escapeRegExp(trimmedSearch).replace(/\s+/g, '\\s+');
        const flexibleRegex = new RegExp(flexiblePattern);
        if (flexibleRegex.test(normalizedFile)) {
            return {
                ok: true,
                content: normalizedFile.replace(flexibleRegex, trimmedReplace),
                strategy: 'flexible-space'
            };
        }
    }

    return {
        ok: false,
        content: fileContent,
        strategy: 'not-found'
    };
}

function inferFilesFromMessage(text) {
    const lowerText = text.toLowerCase();
    const allFiles = ['index.html', 'admin.html', 'styles.css', 'app-core.js', 'user-app.js', 'admin-app.js', 'firebase-config.js'];
    const files = new Set(allFiles.filter(fileName => lowerText.includes(fileName.toLowerCase())));

    const addUserApp = () => {
        files.add('index.html');
        files.add('user-app.js');
    };

    const addAdminApp = () => {
        files.add('admin.html');
        files.add('admin-app.js');
    };

    if (/(tasar|renk|css|stil|buton|görün|gorun|tema|mobil|responsive|font|kart|arka plan|ekran)/i.test(lowerText)) {
        files.add('styles.css');
    }

    if (/(giriş|giris|kayıt|kayit|şifre|sifre|borç|borc|ödeme|odeme|taksit|maaş|maas|bütçe|butce|kredi|banka|hesabım|hesabim|kullanıcı|kullanici)/i.test(lowerText)) {
        addUserApp();
    }

    if (/(yönetici|yonetici|admin|kullanıcı listesi|kullanici listesi|aktivite|panel)/i.test(lowerText)) {
        addAdminApp();
    }

    if (/(firebase|api|gemini|antigravity|yapay zeka|ai|config|ayar|anahtar)/i.test(lowerText)) {
        files.add('app-core.js');
        files.add('firebase-config.js');
    }

    if (/(telegram|bot|github|commit|push|depo)/i.test(lowerText)) {
        files.add('telegram-bot.js');
    }

    if (files.size === 0) {
        ['index.html', 'styles.css', 'app-core.js', 'user-app.js', 'admin.html', 'admin-app.js'].forEach(fileName => files.add(fileName));
    }

    return Array.from(files);
}

function askGemini(promptText, systemInstruction = SYSTEM_PROMPT) {
    return new Promise((resolve, reject) => {
        const apiKey = getGeminiApiKey();
        const payload = JSON.stringify({
            contents: [{
                role: 'user',
                parts: [{ text: promptText }]
            }],
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            }
        });

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            port: 443,
            path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
                        resolve(data.candidates[0].content.parts[0].text);
                    } else {
                        reject(new Error("Yapay zekadan geçersiz yanıt geldi."));
                    }
                } catch (e) { reject(e); }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(payload);
        req.end();
    });
}

// ==========================================
// 💬 TELEGRAM MESAJ İŞLEMCİSİ
// ==========================================

async function handleMessage(message) {
    const chatId = message.chat.id;
    const text = (message.text || '').trim();

    // 🔒 GÜVENLİK FİLTRESİ
    if (String(chatId) !== String(ALLOWED_CHAT_ID)) {
        await sendMessage(chatId, `❌ *Yetkisiz Erişim!* \nBu bot sadece Yusuf Eryiğit'e özeldir.`);
        return;
    }

    if (!GITHUB_TOKEN || GITHUB_TOKEN.includes('BURAYA_GITHUB')) {
        await sendMessage(chatId, `⚠️ *GitHub Bağlantısı Eksik!*\n\nBotun doğrudan GitHub deponuzu düzenleyebilmesi için bir erişim anahtarı (GitHub Token) gereklidir.\n\n👉 Lütfen \`telegram-bot.js\` dosyasını açıp en üstteki \`GITHUB_TOKEN\` alanına kendi GitHub Token değerinizi yazın.`);
        return;
    }

    const commandParts = text.split(' ');
    const mainCommand = commandParts[0].toLowerCase();
    const args = commandParts.slice(1).join(' ');

    switch (mainCommand) {
        case '/start':
        case '/yardim':
            const welcomeText = `🚀 *Hermes Bulut AI Yazılım Ajanı* 🐙\n\n` +
                `Benimle doğrudan Türkçe sohbet ederek GitHub deponuzdaki dosyaları doğrudan uzaktan güncelletebilirsiniz!\n\n` +
                `*Örnek Talimatlar:*\n` +
                `• _"user-app.js dosyasında borç eklerken varsayılan faizi 0 yap."_\n` +
                `• _"styles.css dosyasında arka planı koyu lacivert tonu yap."_\n\n` +
                `ℹ️ *Bilgisayarınızı açmanıza gerek yoktur.* Tüm değişiklikler doğrudan GitHub API üzerinden deponuza yazılır ve canlı siteniz 1 dakika içinde güncellenir!`;
            
            await sendMessage(chatId, welcomeText);
            break;

        default:
            if (text.startsWith('/')) {
                await sendMessage(chatId, `⚠️ Bilinmeyen komut. Doğrudan yapmak istediğiniz güncellemeyi yazabilirsiniz.`);
                return;
            }

            await sendMessage(chatId, `🧠 *Hermes doğrudan GitHub deponuzu inceliyor...*`);

            // Hangi dosyaların isminin geçtiğini kontrol et
            const filesToLoad = inferFilesFromMessage(text);
            await sendMessage(chatId, `🔎 *İlgili dosyaları ben seçtim:* ${filesToLoad.map(fileName => `\`${fileName}\``).join(', ')}`);
            
            // Eğer dosya belirtilmemişse akıllı tahmin yap
            if (filesToLoad.length === 0) {
                if (text.toLowerCase().includes('tasarım') || text.toLowerCase().includes('renk') || text.toLowerCase().includes('css') || text.toLowerCase().includes('stil')) {
                    filesToLoad.push('styles.css');
                }
                if (text.toLowerCase().includes('arayüz') || text.toLowerCase().includes('ekran') || text.toLowerCase().includes('kullanıcı')) {
                    filesToLoad.push('index.html');
                    filesToLoad.push('user-app.js');
                }
                if (text.toLowerCase().includes('yönetici') || text.toLowerCase().includes('admin')) {
                    filesToLoad.push('admin.html');
                    filesToLoad.push('admin-app.js');
                }
            }

            if (filesToLoad.length === 0) {
                await sendMessage(chatId, `🤔 *Hangi dosyada değişiklik yapmak istediğinizi anlayamadım.*\n\nLütfen mesajınızda dosya adını belirtin (Örn: \`user-app.js\`, \`styles.css\` veya \`index.html\`).`);
                return;
            }

            let context = '';
            const loadedFilesMeta = {};

            // GitHub'dan dosyaların en güncel halini API üzerinden çekelim
            for (const file of filesToLoad) {
                try {
                    await sendMessage(chatId, `📥 *${file}* dosyası GitHub'dan indiriliyor...`);
                    const fileData = await fetchFileFromGithub(file);
                    loadedFilesMeta[file] = fileData; // sha ve content sakla
                    context += `\n\n--- DOSYA İÇERİĞİ: ${file} ---\n${fileData.content}\n------------------------`;
                } catch (e) {
                    await sendMessage(chatId, `❌ *${file}* dosyası GitHub'dan çekilirken hata oluştu. Lütfen dosya adının depoda var olduğundan emin olun.`);
                    return;
                }
            }

            const fullPrompt = `${text}\n\n${context ? `Aşağıda istenen değişiklik için GitHub deponuzdaki ilgili dosyaların güncel içerikleri verilmiştir:${context}` : ''}`;

            try {
                await sendMessage(chatId, `⚙️ *Yapay zeka değişiklik kodlarını üretiyor...*`);
                const aiResponse = await askGemini(fullPrompt);

                // Kod düzenleme Regex'i
                const editRegex = /<<<EDIT_FILE:\s*([a-zA-Z0-9_\-\.]+)\s*>>>[\s\S]*?<<<SEARCH>>>([\s\S]*?)<<<REPLACE>>>([\s\S]*?)<<<END>>>/g;
                let match;
                let appliedCount = 0;
                let cleanResponse = aiResponse.replace(/<<<EDIT_FILE:[\s\S]*?<<<END>>>/g, '').trim();

                // Tüm eşleşmeleri dönelim ve doğrudan GitHub'a pushlayalım
                while ((match = editRegex.exec(aiResponse)) !== null) {
                    const fileName = match[1].trim();
                    const searchContent = match[2];
                    const replaceContent = match[3];

                    const meta = loadedFilesMeta[fileName];
                    if (!meta) continue;

                    const editResult = replaceEditBlock(meta.content, searchContent, replaceContent);
                    if (!editResult.ok) {
                        await sendMessage(chatId, `❌ *Hata:* ${fileName} dosyasındaki kod bloğu tam eşleşmediği için güncelleme uygulanamadı.`);
                        continue;
                    }

                    const newContent = editResult.content;
                    const commitMsg = `Hermes AI: ${text.slice(0, 50)}...`;

                    await sendMessage(chatId, `📤 *${fileName}* doğrudan GitHub'a pushlanıyor...`);
                    await commitFileToGithub(fileName, newContent, meta.sha, commitMsg);
                    appliedCount++;
                }

                if (appliedCount > 0) {
                    await sendMessage(chatId, `${cleanResponse}\n\n🎉 *BAŞARILI!* Değişiklikler doğrudan GitHub deponuza yüklendi.\n\nSiteniz 1-2 dakika içinde güncellenmiş olacaktır:\nhttps://takipyusuf.github.io/hesap/`);
                } else {
                    await sendMessage(chatId, aiResponse);
                }

            } catch (err) {
                console.error("Bulut AI Hatası:", err);
                await sendMessage(chatId, `❌ *İşlem Başarısız Oldu!*\nHata Detayı: \`${err.message || err}\``);
            }
            break;
    }
}

// ==========================================
// 🔄 POLLING MOTORU (GÜNCELLEMELERİ ÇEKME)
// ==========================================

async function pollUpdates() {
    try {
        const updates = await telegramRequest('getUpdates', {
            offset: lastUpdateId + 1,
            timeout: 30
        });

        for (const update of updates) {
            lastUpdateId = update.update_id;
            if (update.message) {
                await handleMessage(update.message);
            }
        }
    } catch (err) {
        const errorDesc = err.description || err.message || (typeof err === 'object' ? JSON.stringify(err) : err);
        console.error("🔄 Polling Hatası:", errorDesc);
        
        // Eğer token yetkisiz (401) ise döngüyü tamamen durdurarak spamı önle
        if (err.error_code === 401) {
            console.error("❌ HATA: Telegram Bot Token (BOT_TOKEN) geçersiz! Polling durduruldu. Lütfen telegram-bot.js dosyasındaki tokenı kontrol edin.");
            return;
        }
        
        // Geçici hatalarda (örn. internet kesintisi) 10 saniye bekleyip tekrar dene
        await new Promise(r => setTimeout(r, 10000));
    }
    setTimeout(pollUpdates, 1000);
}

// ==========================================
// 🚀 BOT BAŞLANGICI
// ==========================================
console.log("==========================================");
console.log("HERMES BULUT GITHUB AI AJANI");
console.log("==========================================");

if (!BOT_TOKEN || !ALLOWED_CHAT_ID || !GITHUB_TOKEN) {
    console.error("Bot başlatılmadı: BOT_TOKEN, ALLOWED_CHAT_ID veya GITHUB_TOKEN boş.");
    console.error("Güvenlik için gizli anahtarları doğrudan dosyaya yazmayın.");
} else {
    console.log("Telegram Bot Polling başladı.");
    console.log(`Güvenlik koruması: Sadece Chat ID '${ALLOWED_CHAT_ID}' kabul ediliyor.`);
    pollUpdates();
}
