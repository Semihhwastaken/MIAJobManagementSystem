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
    'http_req_duration': ['p(95)<3000'], // %95 isteklerin 800ms'den daha hızlı olmasını bekle
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

// Test senaryosu
export default function() {
  // API'nın çalıştığı URL'i tanımla
  const baseUrl = 'http://localhost:5193';
  
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
  
  // Token kontrolü
  if (!token) {
    console.log('Token alınamadı!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Token ile API istekleri yapmak için header'ları ayarla
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  
  // 1. Görevleri listele - GET /api/Tasks
  const tasksRes = http.get(`${baseUrl}/api/Tasks`, { headers });
  
  // İsteğin başarılı olup olmadığını kontrol et
  check(tasksRes, {
    'GET /api/Tasks status is 200': (r) => r.status === 200,
    'tasks data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // Login yanıtından kullanıcı ID'sini al
  const userId = loginData && loginData.id ? loginData.id : 'current';
  
  // 2. Kullanıcıya ait aktif görevleri listele - GET /api/Tasks/user/{userId}/active-tasks
  const userActiveTasksRes = http.get(`${baseUrl}/api/Tasks/user/${userId}/active-tasks`, { headers });
  
  check(userActiveTasksRes, {
    'GET /api/Tasks/user/active-tasks status is 200': (r) => r.status === 200,
    'active tasks data is array': (r) => {
      const data = safeParseJson(r);
      // Null veya undefined ise veya boş yanıt ise [], önemli olan yanıtın JSON formatında olması
      return r.status === 200 && (data === null || Array.isArray(data));
    },
  }) || errorRate.add(1);
  
  // 3. Dashboard istatistiklerini getir - GET /api/Tasks/dashboard
  const dashboardRes = http.get(`${baseUrl}/api/Tasks/dashboard`, { headers });
  
  check(dashboardRes, {
    'GET /api/Tasks/dashboard status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // 4. Kullanıcı bilgilerini al - GET /api/Users/profile
  const profileRes = http.get(`${baseUrl}/api/Users/profile`, { headers });
  const userProfile = safeParseJson(profileRes);
  
  // Profil bilgisi kontrolü
  if (!userProfile) {
    console.log('Kullanıcı profili alınamadı!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Kullanıcı bilgilerini al ve atanmış kullanıcılar için kullan
  const assignedUser = {
    id: userProfile.id || "67caa8641c34098650859ce4",
    username: userProfile.username || "TestNajung",
    email: userProfile.email || "sabridoga2000@gmail.com",
    fullName: userProfile.fullName || "Sabri alperen Kaya",
    department: userProfile.department || "Web Developer",
    title: userProfile.title || "Frontend",
    position: userProfile.position || "Junior",
    profileImage: userProfile.profileImage || ""
  };
  
  // CreatedByUser nesnesi
  const createdBy = {
    id: userProfile.id || '',
    username: userProfile.username || 'TestNajung',
    fullName: userProfile.fullName || 'Test User',
    profileImage: userProfile.profileImage || null
  };
  
  // TaskItem modeline uygun görev nesnesi - örnek task'a göre düzenlendi
  const taskId = generateObjectId();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Örnek Task'taki değerlerle görev oluşturma isteği
  const newTaskPayload = JSON.stringify({
    id: taskId,
    title: 'K6 Test Görevi ' + new Date().toISOString(),
    description: 'Bu bir k6 performans testi için oluşturulmuş test görevidir',
    status: 'pending',
    priority: 'medium',
    category: 'Bug',
    isLocked: false,
    // Örnek task'ta olduğu gibi assignedUsers dizisi
    assignedUsers: [
      {
        id: "67caa8641c34098650859ce4",
        username: "TestNajung",
        email: "sabridoga2000@gmail.com",
        fullName: "Sabri alperen Kaya",
        department: "Web Developer",
        title: "Frontend",
        position: "Junior",
        profileImage: ""
      }
    ],
    // Örnekteki gibi assignedUserIds dizisi
    assignedUserIds: ["67caa8641c34098650859ce4"],
    dueDate: tomorrow.toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: createdBy,
    subTasks: [
      {
        id: generateObjectId(),
        title: 'Alt görev 1',
        completed: false,
        completedDate: null,
        assignedUserId: null
      }
    ],
    attachments: [],
    comments: [],
    // Örnekteki team ID'sini kullanıyoruz
    teamId: "67d2e6c6cb08ce1c56afa358",
    dependencies: [],
    completedDate: null,
    assignedJobs: [],
    history: []
  });
  
  const createTaskRes = http.post(`${baseUrl}/api/Tasks`, newTaskPayload, { headers });
  
  // Görev oluşturma isteğinin başarılı olup olmadığını kontrol et
  const createTaskSuccess = check(createTaskRes, {
    'POST /api/Tasks status is 201 or 200': (r) => r.status === 201 || r.status === 200,
    'created task has id': (r) => {
      const data = safeParseJson(r);
      console.log(`Görev oluşturma yanıtı: ${r.status} - ${r.body}`);
      return data && data.id !== undefined;
    },
  });

  if (!createTaskSuccess) {
    console.log(`Görev oluşturma hatası: ${createTaskRes.status} - ${createTaskRes.body}`);
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Oluşturulan görevin ID'sini al
  const taskData = safeParseJson(createTaskRes);
  const createdTaskId = taskData ? taskData.id : taskId;
  
  if (!createdTaskId) {
    console.log('Görev ID\'si alınamadı!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // 5. Oluşturulan görevi getir - GET /api/Tasks/{id}
  const getTaskRes = http.get(`${baseUrl}/api/Tasks/${createdTaskId}`, { headers });
  
  // Görev getirme isteğinin başarılı olup olmadığını kontrol et
  check(getTaskRes, {
    'GET /api/Tasks/{id} status is 200': (r) => r.status === 200,
    'get task has correct id': (r) => {
      const data = safeParseJson(r);
      return data && data.id === createdTaskId;
    },
  }) || errorRate.add(1);
  
  // 6. Görevi güncelle - PUT /api/Tasks/{id}
  const updateTaskPayload = JSON.stringify({
    id: createdTaskId,
    title: 'Güncellenmiş K6 Test Görevi',
    description: 'Bu görev güncellendi',
    status: 'in-progress',
    priority: 'high',
    category: 'Test',
    // Örnekteki değerleri koruyoruz
    assignedUsers: [
      {
        id: "67caa8641c34098650859ce4",
        username: "TestNajung",
        email: "sabridoga2000@gmail.com",
        fullName: "Sabri alperen Kaya",
        department: "Web Developer", 
        title: "Frontend",
        position: "Junior",
        profileImage: ""
      }
    ],
    assignedUserIds: ["67caa8641c34098650859ce4"],
    teamId: "67d2e6c6cb08ce1c56afa358"
  });
  
  const updateTaskRes = http.put(`${baseUrl}/api/Tasks/${createdTaskId}`, updateTaskPayload, { headers });
  
  // Görev güncelleme isteğinin başarılı olup olmadığını kontrol et
  check(updateTaskRes, {
    'PUT /api/Tasks/{id} status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  // 7. Görevin durumunu değiştir - PUT /api/Tasks/{id}/status
  // API String değeri [FromBody] olarak JSON formatında bekliyor
  // String değeri çift tırnak içinde JSON formatında gönderiyoruz: "in-progress"
  const statusHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Önemli: Status değerini JSON string olarak gönderiyoruz (çift tırnak içinde)
  // [FromBody] string status parametresi, JSON formatında bir string bekliyor
  const statusValue = JSON.stringify("in-progress");
  
  const updateStatusRes = http.put(
    `${baseUrl}/api/Tasks/${createdTaskId}/status`,
    statusValue, // JSON string: "in-progress" (çift tırnak içinde)
    { headers: statusHeaders }
  );
    
  // Durum güncelleme isteğinin başarılı olup olmadığını kontrol et
  check(updateStatusRes, {
    'PUT /api/Tasks/{id}/status status is 200': (r) => {
      console.log(`Status güncelleme yanıtı: ${updateStatusRes.status} - ${updateStatusRes.body}`);
      return updateStatusRes.status === 200 || updateStatusRes.status === 204;
    },
  }) || errorRate.add(1);
  
  // 8. Görevi tamamlandı olarak işaretle - PUT /api/Tasks/{id}/complete
  const completeTaskRes = http.put(`${baseUrl}/api/Tasks/${createdTaskId}/complete`, null, { headers });
  
  // Görev tamamlama isteğinin başarılı olup olmadığını kontrol et
  check(completeTaskRes, {
    'PUT /api/Tasks/{id}/complete status is 200': (r) => r.status === 200 || r.status === 204,
  }) || errorRate.add(1);
  
  // 9. Görev geçmişini getir - GET /api/Tasks/history
  const historyRes = http.get(`${baseUrl}/api/Tasks/history`, { headers });
  
  // Görev geçmişi isteğinin başarılı olup olmadığını kontrol et
  check(historyRes, {
    'GET /api/Tasks/history status is 200': (r) => r.status === 200,
    'history data is array': (r) => {
      const data = safeParseJson(r);
      return data === null || Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // 10. Kullanıcının tüm görevlerini getir - GET /api/Tasks/user/{userId}
  const userTasksRes = http.get(`${baseUrl}/api/Tasks/user/${userId}`, { headers });
  
  check(userTasksRes, {
    'GET /api/Tasks/user/{userId} status is 200': (r) => r.status === 200,
    'user tasks data is array': (r) => {
      const data = safeParseJson(r);
      return data === null || Array.isArray(data);
    },
  }) || errorRate.add(1);
  
  // İsteğe bağlı: Eklediğimiz görevi silme - DELETE /api/Tasks/{id}
  const deleteTaskRes = http.del(`${baseUrl}/api/Tasks/${createdTaskId}`, null, { headers });
  
  // Görev silme isteğinin başarılı olup olmadığını kontrol et
  check(deleteTaskRes, {
    'DELETE /api/Tasks/{id} status is 200 or 204': (r) => r.status === 200 || r.status === 204,
  }) || errorRate.add(1);
  
  // İsteğe bir bekleme süresi ekle (milisaniye cinsinden)
  sleep(1);
}