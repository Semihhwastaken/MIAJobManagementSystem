import http from 'k6/http';
import { check, sleep } from 'k6';


export const options = {
    stages: [
        { duration: '30s', target: 1000 },  // 1 dakika içinde 1000 kullanıcıya ulaş
        
        { duration: '15s', target: 0 },     // 5 dakika içinde kullanıcı sayısını sıfıra indir
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'], // 95. yüzdelik dilimdeki isteklerin süresi 2 saniyeden az olmalı
        http_req_failed: ['rate<0.01'],    // Başarısız istek oranı %1'den az olmalı
    },
};

const BASE_URL = 'https://miajobmanagementsystem-1-15so.onrender.com/api/Notifications';
const TEST_USER_ID = '67b8581d5a3836f249962d88';

const notificationPayload = {
    UserId: TEST_USER_ID,
    Title: 'Test Notification',
    Message: 'This is a test notification for load testing purposes.',
    Type: 4,
};

export default function () {
    const headers = { 'Content-Type': 'application/json' };
    const res = http.post(BASE_URL, JSON.stringify(notificationPayload), { headers });
    console.log("res.body: ", res.body);
    

    check(res, {
        'is status 200': (r) => r.status === 200,
    });

    sleep(1); // Her istekten sonra 1 saniye bekle
}