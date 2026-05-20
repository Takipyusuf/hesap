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
const BOT_TOKEN = process.env.BOT_TOKEN || '8883186345:AAEZAsVJ0Bk_0JKnCR9SL82s_nJynN-Ru6U';
const ALLOWED_CHAT_ID = process.env.ALLOWED_CHAT_ID || '8995151756';

// 2. GitHub Ayarları (Canlı deponuzu uzaktan düzenlemek için)
// ⚠️ GÜVENLİK: GitHub'ın tokeni iptal etmemesi için tokeni Render'ın "Environment Variables" kısmına kaydedeceğiz.
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'BURAYA_KENDI_TOKENINIZI_YAZABILIRSINIZ';
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

// firebase-config.js içeriğinden veya Environment'tan Gemini API anahtarını alan fonksiyon
function getGeminiApiKey() {
    // ⚠️ GÜVENLİK: Eğer Render Environment Variable üzerinde GEMINI_API_KEY tanımlıysa doğrudan onu kullan!
    if (process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }
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
    return 'AIzaSyBB1RovbpN4eO3Ml8XMGsR1u564gHJ8o50';
}

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
            const allFiles = ['index.html', 'admin.html', 'styles.css', 'app-core.js', 'user-app.js', 'admin-app.js', 'firebase-config.js'];
            let filesToLoad = allFiles.filter(f => text.toLowerCase().includes(f.toLowerCase()));

            // Eğer dosya belirtilmemişse akıllı tahmin yap
            if (filesToLoad.length === 0) {
                const lowerText = text.toLowerCase();

                // CSS ve Stil ile ilgili geniş anahtar kelimeler (Türkçe yumuşama desteği ile: renk -> renge, rengi)
                if (lowerText.includes('tasarım') || lowerText.includes('renk') || lowerText.includes('reng') ||
                    lowerText.includes('css') || lowerText.includes('stil') || lowerText.includes('tema') ||
                    lowerText.includes('koyu') || lowerText.includes('açık') || lowerText.includes('görünüm') ||
                    lowerText.includes('arka plan') || lowerText.includes('arkaplan') || lowerText.includes('font') ||
                    lowerText.includes('buton') || lowerText.includes('düğme') || lowerText.includes('hizala') ||
                    lowerText.includes('şık') || lowerText.includes('modern') || lowerText.includes('visual')) {
                    filesToLoad.push('styles.css');
                }

                // Kullanıcı Uygulaması ve Borç İşlemleri ile ilgili geniş anahtar kelimeler
                if (lowerText.includes('arayüz') || lowerText.includes('ekran') || lowerText.includes('kullanıcı') ||
                    lowerText.includes('borç') || lowerText.includes('faiz') || lowerText.includes('taksit') ||
                    lowerText.includes('ödeme') || lowerText.includes('hesap') || lowerText.includes('ana sayfa') ||
                    lowerText.includes('giriş') || lowerText.includes('kayıt') || lowerText.includes('müşteri') ||
                    lowerText.includes('ekle') || lowerText.includes('sil') || lowerText.includes('güncelle')) {
                    filesToLoad.push('index.html');
                    filesToLoad.push('user-app.js');
                }

                // Yönetici Paneli ile ilgili geniş anahtar kelimeler
                if (lowerText.includes('yönetici') || lowerText.includes('admin') || lowerText.includes('panel') ||
                    lowerText.includes('dashboard') || lowerText.includes('tüm') || lowerText.includes('aktivite') ||
                    lowerText.includes('log')) {
                    filesToLoad.push('admin.html');
                    filesToLoad.push('admin-app.js');
                }
            }

            // 🌟 AKILLI VARSAYILAN DESTEĞİ: Eğer hiçbir dosya eşleşmediyse, hata vermek yerine 
            // en kritik ana dosyaları (index, styles, user-app) varsayılan olarak yükle ki yapay zeka karar verebilsin!
            if (filesToLoad.length === 0) {
                filesToLoad = ['index.html', 'styles.css', 'user-app.js'];
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

                // Tüm eşleşmeleri dosyalara göre gruplayalım
                const pendingEdits = {}; // fileName -> [{ searchContent, replaceContent }]
                while ((match = editRegex.exec(aiResponse)) !== null) {
                    const fileName = match[1].trim();
                    const searchContent = match[2];
                    const replaceContent = match[3];

                    if (!pendingEdits[fileName]) {
                        pendingEdits[fileName] = [];
                    }
                    pendingEdits[fileName].push({ searchContent, replaceContent });
                }

                // Gruplanmış değişiklikleri sırayla uygulayıp tek seferde pushlayalım
                for (const fileName of Object.keys(pendingEdits)) {
                    const meta = loadedFilesMeta[fileName];
                    if (!meta) continue;

                    let fileContent = meta.content;
                    let fileSuccess = true;

                    for (const edit of pendingEdits[fileName]) {
                        if (!fileContent.includes(edit.searchContent)) {
                            await sendMessage(chatId, `❌ *Hata:* ${fileName} dosyasındaki kod bloğu tam eşleşmediği için güncelleme uygulanamadı.`);
                            fileSuccess = false;
                            break;
                        }
                        fileContent = fileContent.replace(edit.searchContent, edit.replaceContent);
                    }

                    if (!fileSuccess) continue;

                    const commitMsg = `Hermes AI: ${text.slice(0, 50)}...`;

                    await sendMessage(chatId, `📤 *${fileName}* doğrudan GitHub'a pushlanıyor...`);
                    await commitFileToGithub(fileName, fileContent, meta.sha, commitMsg);
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
        console.error("🔄 Polling Hatası:", err.message || err);
        await new Promise(r => setTimeout(r, 5000));
    }
    setTimeout(pollUpdates, 1000);
}

// ==========================================
// 🚀 BOT BAŞLANGICI
// ==========================================
console.log("==========================================");
console.log("🚀 HERMES BULUT GITHUB AI AJANI BOTU AKTİF");
console.log("==========================================");
console.log("🤖 Telegram Bot Polling Başladı...");
console.log(`🔒 Güvenlik Koruması: Sadece Chat ID '${ALLOWED_CHAT_ID}' kabul ediliyor.`);

// 📡 Render.com Port Tarama Uyum Kodu (Dummy HTTP Server)
// Render Web Servisleri bir port dinlenmesini zorunlu kılar.
const PORT = process.env.PORT || 10000;
require('http').createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Hermes Bot Aktif ve Çalışıyor!\n');
}).listen(PORT, () => {
    console.log(`📡 Render için Port Dinleniyor: ${PORT}`);
});

pollUpdates();
