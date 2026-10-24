@echo off
chcp 65001 >nul
title EarnPulse 1-Click Auto Push to GitHub
color 0A
echo ================================================================
echo           🚀 [EarnPulse] ১-ক্লিক অটো পুশ (GitHub)
echo ================================================================
echo.
echo [১/৩] নতুন পরিবর্তনসমূহ সিঙ্ক করা হচ্ছে...

cd /d "k:\whatshap"
powershell -Command "Copy-Item -Path 'frontend\src\*' -Destination 'GITHUB_UPLOAD\frontend\src\' -Recurse -Force; Copy-Item -Path 'frontend\public\*' -Destination 'GITHUB_UPLOAD\frontend\public\' -Recurse -Force; Copy-Item -Path 'backend\server.js' -Destination 'GITHUB_UPLOAD\backend\server.js' -Force; Copy-Item -Path 'admin\index.html' -Destination 'GITHUB_UPLOAD\admin\index.html' -Force; Copy-Item -Path 'vercel.json' -Destination 'GITHUB_UPLOAD\vercel.json' -Force"

echo [২/৩] গিটহাবে ফাইলগুলো স্টেজ ও কম্যিট করা হচ্ছে...
cd /d "k:\whatshap\GITHUB_UPLOAD"
"..\tools\git\cmd\git.exe" add .
"..\tools\git\cmd\git.exe" commit -m "Auto Update: %date% %time%"

echo [৩/৩] সরাসরি গিটহাবে পুশ করা হচ্ছে...
"..\tools\git\cmd\git.exe" push origin main --force

echo.
echo ================================================================
echo   🎉 আলহামদুলিল্লাহ! কোড সফলভাবে গিটহাবে আপলোড সম্পন্ন হয়েছে!
echo   ⚡ Vercel স্বয়ংক্রিয়ভাবে লাইভ সাইট আপডেট করে নিচ্ছে...
echo ================================================================
echo.
pause
