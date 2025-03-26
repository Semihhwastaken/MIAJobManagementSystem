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

// Rastgele mesaj içeriği oluşturma
function getRandomMessageContent() {
  const messages = [
    'Merhaba, nasılsın?',
    'Proje ile ilgili güncellemeler var mı?',
    'Toplantı saati değişti mi?',
    'Dosyayı inceleyebildin mi?',
    'Bugün öğle yemeğinde buluşalım mı?',
    'Raporun son halini gönderebilir misin?',
    'Yeni görev atandı, kontrol eder misin?',
    'Bu konuyu biraz daha açıklayabilir misin?',
    'İyi çalışmalar dilerim!',
    'Teşekkür ederim, iyi günler!'
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// Rastgele konu başlığı oluşturma
function getRandomSubject() {
  const subjects = [
    'Proje Güncelleme',
    'Toplantı Hatırlatması',
    'Görev Bildirimi',
    'Dosya Paylaşımı',
    'Soru',
    'Bilgilendirme',
    'Acil Durum',
    'Haftalık Rapor',
    'İş Talebi',
    'Genel Bilgi'
  ];
  return subjects[Math.floor(Math.random() * subjects.length)];
}

// Test senaryosu
export default function() {
  // API'nın çalıştığı URL'i tanımla
  const baseUrl = 'http://localhost:5193'; // JobTrackingAPI için URL
  
  // Önce normal kullanıcı olarak oturum açıp token almamız gerekiyor
  const loginPayload = JSON.stringify({
    username: 'semihg18',
    password: 'Semih123.'
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
  
  // Admin hesabına geçiş yap (mesaj göndermek için ikinci bir kullanıcı)
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
  const adminUserId = adminLoginData && adminLoginData.user ? adminLoginData.user.id : '';
  
  // Admin token kontrolü
  if (!adminToken || !adminUserId) {
    console.log('Admin token veya UserId alınamadı!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Admin token ile API istekleri yapmak için header'ları ayarla
  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json',
  };
  
  // 1. Kullanıcının konuşmalarını listele - GET /api/Messages/conversations/{userId}
  const conversationsRes = http.get(`${baseUrl}/api/Messages/conversations/${userId}`, { headers });
  
  check(conversationsRes, {
    'GET /api/Messages/conversations/{userId} status is 200': (r) => r.status === 200,
    'conversations data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // 2. Kullanıcının okunmamış mesaj sayısını kontrol et - GET /api/Messages/unread/{userId}
  const unreadCountRes = http.get(`${baseUrl}/api/Messages/unread/${userId}`, { headers });
  
  check(unreadCountRes, {
    'GET /api/Messages/unread/{userId} status is 200': (r) => r.status === 200,
    'unread count data exists': (r) => {
      const data = safeParseJson(r);
      return data && data.unreadCount !== undefined;
    },
  }) || errorRate.add(1);
  
  // 3. Normal kullanıcıdan admin kullanıcıya mesaj gönder - POST /api/Messages/send/{senderId}
  const messagePayload = JSON.stringify({
    receiverId: adminUserId,
    content: getRandomMessageContent(),
    subject: getRandomSubject()
  });
  
  const sendMessageRes = http.post(`${baseUrl}/api/Messages/send/${userId}`, messagePayload, { headers });
  
  check(sendMessageRes, {
    'POST /api/Messages/send/{senderId} status is 200': (r) => r.status === 200,
    'sent message has id': (r) => {
      const data = safeParseJson(r);
      return data && data.id;
    },
  }) || errorRate.add(1);
  
  // Gönderilen mesajın ID'sini al
  const messageData = safeParseJson(sendMessageRes);
  const messageId = messageData ? messageData.id : null;
  
  // 4. İki kullanıcı arasındaki konuşmayı getir - GET /api/Messages/conversation/{userId}/{otherUserId}
  const conversationRes = http.get(`${baseUrl}/api/Messages/conversation/${userId}/${adminUserId}`, { headers });
  
  check(conversationRes, {
    'GET /api/Messages/conversation/{userId}/{otherUserId} status is 200': (r) => r.status === 200,
    'conversation data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // 5. Admin kullanıcıdan normal kullanıcıya mesaj gönder - POST /api/Messages/send/{senderId}
  const adminMessagePayload = JSON.stringify({
    receiverId: userId,
    content: getRandomMessageContent(),
    subject: getRandomSubject()
  });
  
  const adminSendMessageRes = http.post(`${baseUrl}/api/Messages/send/${adminUserId}`, adminMessagePayload, { headers: adminHeaders });
  
  check(adminSendMessageRes, {
    'Admin POST /api/Messages/send/{senderId} status is 200': (r) => r.status === 200,
    'admin sent message has id': (r) => {
      const data = safeParseJson(r);
      return data && data.id;
    },
  }) || errorRate.add(1);
  
  // Admin'in gönderdiği mesajın ID'sini al
  const adminMessageData = safeParseJson(adminSendMessageRes);
  const adminMessageId = adminMessageData ? adminMessageData.id : null;
  
  // Mesaj ID'si kontrolü
  if (messageId) {
    // 6. Mesajı okundu olarak işaretle - PUT /api/Messages/read/{messageId}
    const markAsReadRes = http.put(`${baseUrl}/api/Messages/read/${messageId}`, null, { headers: adminHeaders });
    
    check(markAsReadRes, {
      'PUT /api/Messages/read/{messageId} status is 200': (r) => r.status === 200 || r.status === 204,
    }) || errorRate.add(1);
  }
  
  if (adminMessageId) {
    // 7. Admin'in gönderdiği mesajı okundu olarak işaretle - PUT /api/Messages/read/{messageId}
    const markAdminMessageAsReadRes = http.put(`${baseUrl}/api/Messages/read/${adminMessageId}`, null, { headers });
    
    check(markAdminMessageAsReadRes, {
      'PUT /api/Messages/read/{adminMessageId} status is 200': (r) => r.status === 200 || r.status === 204,
    }) || errorRate.add(1);
  }
  
  // 8. Kullanıcının mesajlarını getir - GET /api/Messages/user/{userId}
  const userMessagesRes = http.get(`${baseUrl}/api/Messages/user/${userId}`, { headers });
  
  check(userMessagesRes, {
    'GET /api/Messages/user/{userId} status is 200': (r) => r.status === 200,
    'user messages data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // 9. Çevrimiçi kullanıcıları getir - GET /api/Messages/online-users
  const onlineUsersRes = http.get(`${baseUrl}/api/Messages/online-users`, { headers });
  
  check(onlineUsersRes, {
    'GET /api/Messages/online-users status is 200': (r) => r.status === 200,
    'online users data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // 10. Yazma bildirimi gönder - POST /api/Messages/typing/{userId}/{receiverId}
  const typingRes = http.post(`${baseUrl}/api/Messages/typing/${userId}/${adminUserId}`, null, { headers });
  
  check(typingRes, {
    'POST /api/Messages/typing/{userId}/{receiverId} status is 200': (r) => r.status === 200 || r.status === 204,
  }) || errorRate.add(1);
  
  // Mesaj ID'si kontrolü
  if (messageId) {
    // 11. Mesajı sil - DELETE /api/Messages/{messageId}
    const deleteMessageRes = http.del(`${baseUrl}/api/Messages/${messageId}?userId=${userId}`, null, { headers });
    
    check(deleteMessageRes, {
      'DELETE /api/Messages/{messageId} status is 200': (r) => r.status === 200 || r.status === 204,
    }) || errorRate.add(1);
  }
  
  // İsteğe bir bekleme süresi ekle (milisaniye cinsinden)
  sleep(1);
}