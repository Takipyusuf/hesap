@echo off
chcp 65001 >nul
title Hesap Takip - Telegram Bot Entegrasyonu
cd /d "%~dp0"

echo ==================================================
echo   🚀 HESAP TAKİP TELEGRAM BOTU BAŞLATILIYOR...
echo ==================================================
echo.
echo Bu pencere açık kaldığı sürece botunuz aktif olacaktır.
echo Telegram'dan gönderdiğiniz komutlar burada işlenecektir.
echo.
echo Kapatmak için bu pencereyi kapatabilir veya Ctrl+C yapabilirsiniz.
echo.
echo --------------------------------------------------
echo.

node telegram-bot.js

if errorlevel 1 (
    echo.
    echo ❌ Bot beklenmedik şekilde durdu veya başlatılamadı.
    echo Lütfen yukarıdaki hata mesajını inceleyin.
    echo Node.js sürümünüzün yüklü olduğundan emin olun.
    echo.
    pause
)
