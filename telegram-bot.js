/**
 * 🚀 HESAP TAKİP - TELEGRAM YÖNETİCİ BOTU (SIFIR BAĞIMLILIK)
 * -------------------------------------------------------------
 * Bu script, hiçbir harici paket (npm install) gerektirmeden
 * doğrudan Node.js ile çalışır. Telegram üzerinden Git işlemlerini
 * ve proje yönetimini uzaktan yürütmenizi sağlar.
 */

const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==========================================
// ⚙️ YAPILANDIRMA AYARLARI
// ==========================================
// 1. Bot Tokeninizi BotFather'dan alıp buraya yazın:
const BOT_TOKEN = '8883186345:AAEZAsVJ0Bk_0JKnCR9SL82s_nJynN-Ru6U'; // Örnek Token, kendi tokeninizi yazın.

// 2. Güvenlik için sadece kendi Telegram Chat ID'nizi buraya yazın.
// Boş bırakırsanız, botu başlattıktan sonra kendinize mesaj attığınızda
// konsolda ve Telegram'da kendi Chat ID'nizi görebilir ve buraya yazabilirsiniz.
let ALLOWED_CHAT_ID = '8995151756'; 

// ==========================================
// 🛠️ YARDIMCI FONKSİYONLAR
// ==========================================

let lastUpdateId = 0;

// Telegram API'sine istek gönderen fonksiyon
function telegramRequest(method, data = {}) {
    return new Promise((resolve, reject) => {
        if (!BOT_TOKEN || BOT_TOKEN === 'BURAYA_BOT_TOKEN_YAZIN') {
            console.error("❌ Hata: BOT_TOKEN yapılandırılmamış!");
            return reject(new Error("BOT_TOKEN_MISSING"));
        }

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
                    if (parsed.ok) {
                        resolve(parsed.result);
                    } else {
                        reject(parsed);
                    }
                } catch (e) {
                    reject(e);
                }
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
        if (replyMarkup) {
            payload.reply_markup = replyMarkup;
        }
        await telegramRequest('sendMessage', payload);
    } catch (err) {
        console.error(" Mesaj gönderilemedi:", err.message || err);
    }
}

// Komut satırı (CMD / PowerShell) komutlarını çalıştıran fonksiyon
function runCommand(command) {
    return new Promise((resolve) => {
        // chcp 65001 Türkçe karakter desteği sağlar
        exec(`chcp 65001 >nul && ${command}`, { cwd: __dirname }, (error, stdout, stderr) => {
            resolve({
                success: !error,
                output: (stdout || '').trim() || (stderr || '').trim() || 'Çıktı yok.'
            });
        });
    });
}

// ==========================================
// 💬 TELEGRAM MESAJ İŞLEMCİSİ
// ==========================================

async function handleMessage(message) {
    const chatId = message.chat.id;
    const text = (message.text || '').trim();
    const username = message.from.username || message.from.first_name || 'Kullanıcı';

    // 🔒 GÜVENLİK FİLTRESİ
    if (ALLOWED_CHAT_ID && String(chatId) !== String(ALLOWED_CHAT_ID)) {
        console.log(`⚠️ Yetkisiz Erişim Girişimi! Chat ID: ${chatId}, Kullanıcı: ${username}`);
        await sendMessage(chatId, `❌ *Yetkisiz Erişim!* \nBu bot kişisel otomasyon için kilitlenmiştir. \nSizin Chat ID değeriniz: \`${chatId}\``);
        return;
    }

    // Chat ID henüz ayarlanmamışsa kullanıcıyı uyar ve ID'sini göster
    if (!ALLOWED_CHAT_ID) {
        console.log(`✨ [YENİ BAĞLANTI] Sohbet Başladı!`);
        console.log(`🔑 Sizin Chat ID değeriniz: ${chatId}`);
        console.log(`👉 Lütfen telegram-bot.js dosyasını açıp 'ALLOWED_CHAT_ID' değişkenini '${chatId}' olarak güncelleyin ve botu yeniden başlatın!`);
        
        ALLOWED_CHAT_ID = String(chatId); // Geçici olarak bu oturum için izin ver
        
        await sendMessage(chatId, `👋 Merhaba *${username}*!\n\n🤖 Bot başarıyla bilgisayarınızla bağlantı kurdu.\n\n🔑 *Sizin Telegram Chat ID'niz:* \`${chatId}\`\n\n⚠️ *GÜVENLİK ADIMI:* Lütfen \`telegram-bot.js\` dosyasını açıp en üstteki \`ALLOWED_CHAT_ID\` değerini \`"${chatId}"\` olarak güncelleyin. Böylece sizden başka kimse botu yönetemez.`);
    }

    const commandParts = text.split(' ');
    const mainCommand = commandParts[0].toLowerCase();
    const args = commandParts.slice(1).join(' ');

    switch (mainCommand) {
        case '/start':
        case '/yardim':
        case '/help':
            const welcomeText = `💻 *Borç Takip Kontrol Merkezi Botu* 🚀\n\n` +
                `Aşağıdaki komutları kullanarak projenizi Telegram üzerinden yönetebilirsiniz:\n\n` +
                `🔍 *PROJE DURUMU*:\n` +
                `• /durum - Git durumunu (git status) kontrol eder.\n` +
                `• /log - Son 5 commit geçmişini getirir.\n` +
                `• /dosyalar - Proje klasöründeki dosyaları listeler.\n\n` +
                `🚀 *GİT & YAYINLAMA İŞLEMLERİ*:\n` +
                `• /gonder [mesaj] - Tüm değişiklikleri commitler ve GitHub'a yükler.\n` +
                `• /bat - Bilgisayardaki \`gonder.bat\` dosyasını çalıştırır.\n\n` +
                `📂 *DOSYA YÖNETİMİ*:\n` +
                `• /oku [dosya] - Belirtilen dosya içeriğini okur (Örn: \`/oku firebase-config.js\`).\n\n` +
                `ℹ️ Şu anki yetkili Chat ID: \`${ALLOWED_CHAT_ID}\``;
            
            await sendMessage(chatId, welcomeText);
            break;

        case '/durum':
            await sendMessage(chatId, `🔍 Git durumu sorgulanıyor, lütfen bekleyin...`);
            const gitStatus = await runCommand('git status');
            await sendMessage(chatId, `📦 *Git Durumu Çıktısı:*\n\`\`\`\n${gitStatus.output}\n\`\`\``);
            break;

        case '/log':
            await sendMessage(chatId, `📜 Git geçmişi sorgulanıyor...`);
            const gitLog = await runCommand('git log -n 5 --oneline');
            await sendMessage(chatId, `📜 *Son 5 Commit:*\n\`\`\`\n${gitLog.output}\n\`\`\``);
            break;

        case '/dosyalar':
            fs.readdir(__dirname, async (err, files) => {
                if (err) {
                    await sendMessage(chatId, `❌ Klasör listelenirken hata oluştu: ${err.message}`);
                    return;
                }
                const fileList = files
                    .filter(f => !f.startsWith('.') && f !== 'node_modules')
                    .map(f => {
                        const isDir = fs.statSync(path.join(__dirname, f)).isDirectory();
                        return isDir ? `📂 ${f}/` : `📄 ${f}`;
                    })
                    .join('\n');
                await sendMessage(chatId, `📂 *Proje Dosya Listesi:*\n\n${fileList}`);
            });
            break;

        case '/oku':
            if (!args) {
                await sendMessage(chatId, `⚠️ Lütfen okumak istediğiniz dosya adını yazın.\nÖrnek: \`/oku firebase-config.js\``);
                return;
            }
            const filePath = path.join(__dirname, args);
            // Güvenlik: Sadece proje dizini altındaki dosyaların okunmasına izin ver
            if (!filePath.startsWith(__dirname) || args.includes('..')) {
                await sendMessage(chatId, `⚠️ Güvenlik gerekçesiyle üst dizinlerdeki dosyaları okuyamazsınız.`);
                return;
            }

            if (!fs.existsSync(filePath)) {
                await sendMessage(chatId, `❌ Dosya bulunamadı: \`${args}\``);
                return;
            }

            fs.readFile(filePath, 'utf8', async (err, data) => {
                if (err) {
                    await sendMessage(chatId, `❌ Dosya okunurken hata oluştu: ${err.message}`);
                    return;
                }
                
                // Mesaj limiti kontrolü (4096 karakter)
                let content = data.length > 3000 ? data.slice(0, 3000) + '\n\n... (Dosya çok büyük olduğu için kesildi)' : data;
                await sendMessage(chatId, `📄 *Dosya İçeriği (${args}):*\n\`\`\`javascript\n${content}\n\`\`\``);
            });
            break;

        case '/gonder':
            const commitMessage = args || `Telegram guncellemesi - ${new Date().toLocaleString('tr-TR')}`;
            await sendMessage(chatId, `⚙️ *Değişiklikler GitHub'a gönderiliyor...*\nCommit mesajı: "${commitMessage}"`);

            // Aşama aşama git komutlarını çalıştır
            const addRes = await runCommand('git add .');
            if (!addRes.success) {
                await sendMessage(chatId, `❌ git add başarısız oldu:\n\`${addRes.output}\``);
                return;
            }

            const commitRes = await runCommand(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`);
            await sendMessage(chatId, `📝 *Commit sonucu:*\n\`\`\`\n${commitRes.output}\n\`\`\``);

            await sendMessage(chatId, `📤 GitHub'a yükleniyor (git push)...`);
            const pushRes = await runCommand('git push origin main');
            if (pushRes.success) {
                await sendMessage(chatId, `✅ *Harika! Değişiklikler başarıyla GitHub'a yüklendi.* \n\n1-2 dakika içinde siteniz güncellenecektir:\nhttps://takipyusuf.github.io/hesap/`);
            } else {
                await sendMessage(chatId, `❌ *Push başarısız oldu!*\nLütfen Git yapılandırmanızı ve internet bağlantınızı kontrol edin:\n\`\`\`\n${pushRes.output}\n\`\`\``);
            }
            break;

        case '/bat':
            await sendMessage(chatId, `⚙️ \`gonder.bat\` dosyası çalıştırılıyor, lütfen bekleyin...`);
            const batRes = await runCommand('gonder.bat');
            await sendMessage(chatId, `🖥️ *Bat Dosyası Çıktısı:*\n\`\`\`\n${batRes.output}\n\`\`\``);
            break;

        default:
            if (text.startsWith('/')) {
                await sendMessage(chatId, `⚠️ Bilinmeyen komut. Yardım için /yardim yazabilirsiniz.`);
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
        if (err.code === 'BOT_TOKEN_MISSING') {
            process.exit(1);
        }
        console.error("🔄 Polling Hatası (Yeniden deneniyor...):", err.message || err);
        // Hata durumunda 5 saniye bekle ve devam et
        await new Promise(r => setTimeout(r, 5000));
    }

    // Anında yeni istek gönder (Long Polling)
    setTimeout(pollUpdates, 1000);
}

// ==========================================
// 🚀 BOT BAŞLANGICI
// ==========================================

console.log("==========================================");
console.log("🚀 HESAP TAKİP TELEGRAM BOTU BAŞLATILIYOR");
console.log("==========================================");

if (!BOT_TOKEN || BOT_TOKEN === 'BURAYA_BOT_TOKEN_YAZIN') {
    console.log("❌ HATA: Bot Token bulunamadı!");
    console.log("👉 Lütfen BotFather'dan aldığınız tokeni telegram-bot.js dosyasındaki BOT_TOKEN kısmına yazın.");
    process.exit(1);
}

console.log("🤖 Telegram Bot Polling Başladı...");
console.log("💡 İpucu: Botunuza Telegram'dan /start yazarak testi başlatın.");
if (!ALLOWED_CHAT_ID) {
    console.log("🔑 Güvenlik Koruması: KAPALI (İlk bağlantıda Chat ID'niz otomatik tespit edilecek).");
} else {
    console.log(`🔒 Güvenlik Koruması: AKTİF (Sadece Chat ID '${ALLOWED_CHAT_ID}' komut çalıştırabilir).`);
}

pollUpdates();
