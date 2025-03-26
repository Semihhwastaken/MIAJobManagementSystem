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

// Rastgele değerlendirme puanı oluşturma (1-5 arası)
function getRandomRating() {
  return Math.floor(Math.random() * 5) + 1;
}

// Rastgele geri bildirim durumu oluşturma
function getRandomFeedbackStatus() {
  const statuses = [
    0, // New
    1, // Read
    2, // Responded
    3  // Archived
  ];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

// Test senaryosu
export default function() {
  // API'nın çalıştığı URL'i tanımla
  const baseUrl = 'http://localhost:5193'; // JobTrackingAPI için URL
  
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
  const loginRes = http.post(`${baseUrl}/api/Auth/login`, loginPayload, loginParams);
  
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
  const userName = loginData && loginData.user ? (loginData.user.fullName || loginData.user.username) : 'Test User';
  const userRole = loginData && loginData.user ? (loginData.user.role || 'User') : 'User';
  
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
  
  // 1. Herkese açık geri bildirimleri listele - GET /api/Feedback/public
  const publicFeedbacksRes = http.get(`${baseUrl}/api/Feedback/public`, { headers });
  
  // İsteğin başarılı olup olmadığını kontrol et
  check(publicFeedbacksRes, {
    'GET /api/Feedback/public status is 200': (r) => r.status === 200,
    'public feedbacks data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // 2. Yeni geri bildirim oluştur - POST /api/Feedback
  const feedbackPayload = JSON.stringify({
    userId: userId,
    userName: userName,
    userRole: userRole,
    content: 'Bu bir k6 performans testi için oluşturulmuş test geri bildirimidir - ' + new Date().toISOString(),
    rating: getRandomRating(),
    isPublic: Math.random() > 0.5, // Rastgele public/private
    userAvatar: null
  });
  
  const createFeedbackRes = http.post(`${baseUrl}/api/Feedback`, feedbackPayload, { headers });
  
  check(createFeedbackRes, {
    'POST /api/Feedback status is 201': (r) => r.status === 201,
    'created feedback has id': (r) => {
      const data = safeParseJson(r);
      return data && data.id;
    },
  }) || errorRate.add(1);
  
  // Oluşturulan geri bildirimin ID'sini al
  const feedbackData = safeParseJson(createFeedbackRes);
  const feedbackId = feedbackData ? feedbackData.id : null;
  
  // Admin işlemleri için admin hesabına geçiş yap
  const adminLoginPayload = JSON.stringify({
    username: 'semihg18',
    password: 'Semih123.'
  });
  
  const adminLoginRes = http.post(`${baseUrl}/api/Auth/login`, adminLoginPayload, loginParams);
  
  // Admin login'in başarılı olup olmadığını kontrol et
  const adminLoginSuccess = check(adminLoginRes, {
    'admin login status is 200': (r) => r.status === 200,
    'admin has access token': (r) => {
      const data = safeParseJson(r);
      return data && data.token !== undefined;
    },
  });

  if (!adminLoginSuccess) {
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Admin token'ını al
  const adminLoginData = safeParseJson(adminLoginRes);
  const adminToken = adminLoginData ? adminLoginData.token : '';
  
  // Admin token kontrolü
  if (!adminToken) {
    console.log('Admin token alınamadı!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Admin token ile API istekleri yapmak için header'ları ayarla
  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };
  
  // 3. Admin olarak tüm geri bildirimleri listele - GET /api/Feedback
  const allFeedbacksRes = http.get(`${baseUrl}/api/Feedback`, { headers: adminHeaders });
  
  check(allFeedbacksRes, {
    'GET /api/Feedback status is 200': (r) => r.status === 200,
    'all feedbacks data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // 4. Admin olarak geri bildirim istatistiklerini al - GET /api/Feedback/stats
  const feedbackStatsRes = http.get(`${baseUrl}/api/Feedback/stats`, { headers: adminHeaders });
  
  check(feedbackStatsRes, {
    'GET /api/Feedback/stats status is 200': (r) => r.status === 200,
    'feedback stats has total count': (r) => {
      const data = safeParseJson(r);
      return data && data.total !== undefined;
    },
  }) || errorRate.add(1);
  
  // Geri bildirim ID'si kontrolü
  if (feedbackId) {
    // 5. Geri bildirimi okundu olarak işaretle - PUT /api/Feedback/{id}/status
    const markAsReadPayload = JSON.stringify({
      status: 1, // Read
      response: null
    });
    
    const markAsReadRes = http.put(`${baseUrl}/api/Feedback/${feedbackId}/status`, markAsReadPayload, { headers: adminHeaders });
    
    check(markAsReadRes, {
      'PUT /api/Feedback/{id}/status (Read) status is 204': (r) => r.status === 204 || r.status === 200,
    }) || errorRate.add(1);
    
    // 6. Geri bildirime yanıt ver - PUT /api/Feedback/{id}/status
    const respondPayload = JSON.stringify({
      status: 2, // Responded
      response: 'Bu bir test yanıtıdır - ' + new Date().toISOString()
    });
    
    const respondRes = http.put(`${baseUrl}/api/Feedback/${feedbackId}/status`, respondPayload, { headers: adminHeaders });
    
    check(respondRes, {
      'PUT /api/Feedback/{id}/status (Respond) status is 204': (r) => r.status === 204 || r.status === 200,
    }) || errorRate.add(1);
    
    // 7. Geri bildirimi arşivle - PUT /api/Feedback/{id}/status
    const archivePayload = JSON.stringify({
      status: 3, // Archived
      response: null
    });
    
    const archiveRes = http.put(`${baseUrl}/api/Feedback/${feedbackId}/status`, archivePayload, { headers: adminHeaders });
    
    check(archiveRes, {
      'PUT /api/Feedback/{id}/status (Archive) status is 204': (r) => r.status === 204 || r.status === 200,
    }) || errorRate.add(1);
    
    // 8. Geri bildirimi sil - DELETE /api/Feedback/{id}
    const deleteFeedbackRes = http.del(`${baseUrl}/api/Feedback/${feedbackId}`, null, { headers: adminHeaders });
    
    check(deleteFeedbackRes, {
      'DELETE /api/Feedback/{id} status is 204': (r) => r.status === 204 || r.status === 200,
    }) || errorRate.add(1);
  }
  
  // 9. Belirli bir duruma göre geri bildirimleri filtrele - GET /api/Feedback?status={status}
  const randomStatus = getRandomFeedbackStatus();
  const filteredFeedbacksRes = http.get(`${baseUrl}/api/Feedback?status=${randomStatus}`, { headers: adminHeaders });
  
  check(filteredFeedbacksRes, {
    'GET /api/Feedback?status={status} status is 200': (r) => r.status === 200,
    'filtered feedbacks data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // İsteğe bir bekleme süresi ekle (milisaniye cinsinden)
  sleep(1);
}