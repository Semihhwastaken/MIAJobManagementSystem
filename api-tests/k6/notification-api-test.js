import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Hata oranı metriği tanımlama
export const errorRate = new Rate('errors');

// Test konfigürasyonu
export const options = {
  stages: [
    { duration: '20s', target: 10 }, // 20 saniyede kademeli olarak 10 sanal kullanıcıya çıkar
    { duration: '30s', target: 10 }, // 30 saniye boyunca 10 kullanıcıda kal
    { duration: '20s', target: 0 },  // 20 saniyede kademeli olarak trafiği durdur
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // %95 isteklerin 3000ms'den daha hızlı olmasını bekle
    'errors': ['rate<0.1'],            // %10'dan az hata oranı bekle
  },
};

// MongoDB ObjectID oluşturma (basitleştirilmiş)
function generateObjectId() {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16).padStart(8, '0');
  const machineId = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  const processId = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
  const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  return timestamp + machineId + processId + counter;
}

// JSON yanıtını güvenli bir şekilde ayrıştıran yardımcı fonksiyon
function safeParseJson(response) {
  try {
    // Yanıt boş mu kontrol et
    if (!response.body || response.body.trim() === '') {
      return null;
    }
    // JSON yanıtı ayrıştır
    return JSON.parse(response.body);
  } catch (e) {
    console.log(`JSON ayrıştırma hatası: ${e.message}, yanıt: ${response.body}`);
    return null;
  }
}

// Bildirim tipi için yardımcı fonksiyon
function getRandomNotificationType() {
  const types = [
    0, // Comment
    1, // Mention
    2, // TaskAssigned
    3, // TaskUpdated
    4, // TaskCompleted
    5, // TaskDeleted
    6, // TaskOverdue
    7, // Reminder
    8, // Message
    9, // CalendarEventCreated
    10, // CalendarEventUpdated
    11, // CalendarEventDeleted
    12, // TeamStatusCreated
    13  // TeamStatusUpdated
  ];
  return types[Math.floor(Math.random() * types.length)];
}

// Test senaryosu
export default function() {
  // API'nın çalıştığı URL'i tanımla
  const baseUrl = 'https://miajobmanagementsystem-1.onrender.com'; // NotificationAPI'nin çalıştığı port
  const jobTrackingUrl = 'http://localhost:5193'; // JobTrackingAPI için URL
  
  // Önce oturum açıp token almamız gerekiyor
  const loginPayload = JSON.stringify({
    username: 'TestNajung',
    password: 'asker123'
  });
  
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Login endpoint'ine POST isteği
  const loginRes = http.post(`${jobTrackingUrl}/api/Auth/login`, loginPayload, loginParams);
  
  // Login'in başarılı olup olmadığını kontrol et
  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'has access token': (r) => {
      const data = safeParseJson(r);
      return data && data.token !== undefined;
    },
  });

  if (!loginSuccess) {
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Token'ı al (güvenli JSON ayrıştırmasını kullanarak)
  const loginData = safeParseJson(loginRes);
  const token = loginData ? loginData.token : '';
  const userId = loginData && loginData.user ? loginData.user.id : '';
  
  // Token kontrolü
  if (!token || !userId) {
    console.log('Token veya UserId alınamadı!');
    console.log('Login yanıtı:', JSON.stringify(loginData));
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Token ile API istekleri yapmak için header'ları ayarla
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // 1. Kullanıcının bildirimlerini listele - GET /api/Notifications/user/{userId}
  const notificationsRes = http.get(`${baseUrl}/api/Notifications/user/${userId}`, { headers });
  
  // İsteğin başarılı olup olmadığını kontrol et
  check(notificationsRes, {
    'GET /api/Notifications/user/{userId} status is 200': (r) => r.status === 200,
    'notifications data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // 2. Kullanıcının okunmamış bildirimlerini listele - GET /api/Notifications/user/{userId}/unread
  const unreadNotificationsRes = http.get(`${baseUrl}/api/Notifications/user/${userId}/unread`, { headers });
  
  check(unreadNotificationsRes, {
    'GET /api/Notifications/user/{userId}/unread status is 200': (r) => r.status === 200,
    'unread notifications data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // 3. Test bildirimi gönder - POST /api/Notifications/test?userId={userId}
  const testNotificationRes = http.post(`${baseUrl}/api/Notifications/test?userId=${userId}`, null, { headers });
  
  check(testNotificationRes, {
    'POST /api/Notifications/test status is 200': (r) => r.status === 200,
    'test notification response has notification object': (r) => {
      const data = safeParseJson(r);
      return data && data.notification && data.notification.id;
    },
  }) || errorRate.add(1);
  
  // Test bildiriminin ID'sini al
  const testNotificationData = safeParseJson(testNotificationRes);
  let notificationId = testNotificationData && testNotificationData.notification ? 
    testNotificationData.notification.id : null;
  
  // Eğer test bildirimi ID'si alınamadıysa, yeni bir bildirim oluştur
  if (!notificationId) {
    // 4. Yeni bildirim oluştur - POST /api/Notifications
    const newNotificationPayload = JSON.stringify({
      userId: userId,
      title: 'K6 Test Bildirimi ' + new Date().toISOString(),
      message: 'Bu bir k6 performans testi için oluşturulmuş test bildirimidir',
      type: getRandomNotificationType(),
      relatedJobId: generateObjectId()
    });
    
    const createNotificationRes = http.post(`${baseUrl}/api/Notifications`, newNotificationPayload, { headers });
    
    check(createNotificationRes, {
      'POST /api/Notifications status is 201': (r) => r.status === 201,
      'created notification has id': (r) => {
        const data = safeParseJson(r);
        return data && data.id;
      },
    }) || errorRate.add(1);
    
    // Oluşturulan bildirimin ID'sini al
    const notificationData = safeParseJson(createNotificationRes);
    notificationId = notificationData ? notificationData.id : null;
  }
  
  // Bildirim ID'si kontrolü
  if (notificationId) {
    // 5. Bildirimi okundu olarak işaretle - PUT /api/Notifications/{id}/read
    const markAsReadRes = http.put(`${baseUrl}/api/Notifications/${notificationId}/read`, null, { headers });
    
    check(markAsReadRes, {
      'PUT /api/Notifications/{id}/read status is 204': (r) => r.status === 204 || r.status === 200,
    }) || errorRate.add(1);
    
    // 6. Bildirimi sil - DELETE /api/Notifications/{id}
    const deleteNotificationRes = http.del(`${baseUrl}/api/Notifications/${notificationId}`, null, { headers });
    
    check(deleteNotificationRes, {
      'DELETE /api/Notifications/{id} status is 204': (r) => r.status === 204 || r.status === 200,
    }) || errorRate.add(1);
  }
  
  // 7. Tüm bildirimleri okundu olarak işaretle - PUT /api/Notifications/user/{userId}/read-all
  const markAllAsReadRes = http.put(`${baseUrl}/api/Notifications/user/${userId}/read-all`, null, { headers });
  
  check(markAllAsReadRes, {
    'PUT /api/Notifications/user/{userId}/read-all status is 204': (r) => r.status === 204 || r.status === 200,
  }) || errorRate.add(1);
  
  // İsteğe bir bekleme süresi ekle (milisaniye cinsinden)
  sleep(1);
}