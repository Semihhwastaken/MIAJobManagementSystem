@echo off
echo ========================================
echo API Performans Testleri Başlatılıyor
echo ========================================

echo.
echo Auth API testleri çalıştırılıyor...
k6 run --out json=results/auth-api-results.json auth-api-test.js

echo.
echo Users API testleri çalıştırılıyor...
k6 run --out json=results/users-api-results.json users-api-test.js

echo.
echo Tasks API testleri çalıştırılıyor...
k6 run --out json=results/tasks-api-results.json tasks-api-test.js

echo.
echo Calendar API testleri çalıştırılıyor...
k6 run --out json=results/calendar-api-results.json calendar-api-test.js

echo.
echo Notification API testleri çalıştırılıyor...
k6 run --out json=results/notification-api-results.json notification-api-test.js

echo.
echo Team API testleri çalıştırılıyor...
k6 run --out json=results/team-api-results.json team-api-test.js

echo.
echo Message API testleri çalıştırılıyor...
k6 run --out json=results/message-api-results.json message-api-test.js

echo.
echo Feedback API testleri çalıştırılıyor...
k6 run --out json=results/feedback-api-results.json feedback-api-test.js

echo.
echo Comment API testleri çalıştırılıyor...
k6 run --out json=results/comment-api-results.json comment-api-test.js

echo.
echo ========================================
echo Testler tamamlandı, rapor oluşturuluyor...
echo ========================================

node generate-report.js

echo.
echo ========================================
echo İşlem tamamlandı! Raporlar klasöründe PDF rapor oluşturuldu.
echo ========================================
pause