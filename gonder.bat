@echo off
chcp 65001 >nul
cd /d "%~dp0"

where git >nul 2>&1
if errorlevel 1 (
    echo Git kurulu degil.
    echo https://git-scm.com/download/win adresinden kurun.
    echo Veya GitHub Desktop kullanin: https://desktop.github.com
    pause
    exit /b 1
)

echo Degisiklikler GitHub'a gonderiliyor...
git add .
git commit -m "guncelleme %date% %time%" 2>nul
if errorlevel 1 (
    echo Commit atlandi veya hata - devam ediliyor...
)
git push origin main
if errorlevel 1 (
    echo.
    echo Push basarisiz. Ilk kurulum yapilmadiysa GITHUB-OTOMATIK.txt dosyasina bakin.
    pause
    exit /b 1
)

echo.
echo Tamam! 1-2 dakika sonra site guncellenir:
echo https://takipyusuf.github.io/hesap/
pause
