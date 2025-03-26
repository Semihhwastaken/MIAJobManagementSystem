import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Hata oranı metriği tanımlama
export const errorRate = new Rate('errors');

// Test konfigürasyonu
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // 30 saniyede kademeli olarak 20 sanal kullanıcıya çıkar
    { duration: '1m', target: 20 },  // 1 dakika boyunca 20 kullanıcıda kal
    { duration: '30s', target: 0 },  // 30 saniyede kademeli olarak trafiği durdur
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // %95 isteklerin 500ms'den daha hızlı olmasını bekle
    'errors': ['rate<0.1'],            // %10'dan az hata oranı bekle
  },
};

// Test senaryosu
export default function() {
  // API'nın çalıştığı URL'i tanımla
  const baseUrl = 'http://localhost:5193';
  
  // Login isteği için örnek veri (username ve password alanlarını kullan, email değil)
  const payload = JSON.stringify({
    username: 'TestNajung',
    password: 'asker123'
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Login endpoint'ine POST isteği - büyük/küçük harf duyarlılığına dikkat edin (Auth/login)
  const loginRes = http.post(`${baseUrl}/api/Auth/login`, payload, params);
  
  // İsteğin başarılı olup olmadığını kontrol et
  check(loginRes, {
    'status is 200': (r) => r.status === 200,
    'has access token': (r) => r.json('token') !== undefined,
  }) || errorRate.add(1);
  
  // Başarılı login sonrası token alınabildi mi?
  if (loginRes.status === 200) {
    const token = loginRes.json('token');
    
    // Token geçerli mi kontrol et
    const validateParams = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    
    // Kullanıcı profili endpoint'i ile token'ı doğrula
    const profileRes = http.get(`${baseUrl}/api/Users/profile`, validateParams);
    
    check(profileRes, {
      'profile status is 200': (r) => r.status === 200,
      'profile contains user data': (r) => r.json('id') !== undefined,
    }) || errorRate.add(1);
  }

  // İsteğe bir bekleme süresi ekle (milisaniye cinsinden)
  sleep(1);
}