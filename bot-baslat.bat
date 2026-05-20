@echo off
title Telegram Bot Launcher
cd /d "%~dp0"
echo ==================================================
echo   🚀 TELEGRAM BOTU BASLATILIYOR / STARTING BOT...
echo ==================================================
echo.
node telegram-bot.js
if errorlevel 1 (
    echo.
    echo [HATA] Bot baslatilamadi. Lutfen hata mesajini kontrol edin.
    echo.
    pause
)
