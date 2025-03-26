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
  
  // Token'ı al
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
  
  // Kullanıcı profilini al - GET /api/Users/profile
  const profileRes = http.get(`${baseUrl}/api/Users/profile`, { headers });
  const userProfile = safeParseJson(profileRes);
  
  // Profil bilgisi kontrolü
  if (!userProfile) {
    console.log('Kullanıcı profili alınamadı!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Kullanıcı bilgilerini doğru bir şekilde ayarla
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
  
  // TaskItem modeline uygun görev nesnesi
  const taskId = generateObjectId();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Başarılı tasks-api-test.js'deki formata uygun görev oluşturma isteği
  const newTaskPayload = JSON.stringify({
    id: taskId,
    title: 'K6 Test Görevi ' + new Date().toISOString(),
    description: 'Bu bir k6 performans testi için oluşturulmuş test görevidir',
    status: 'pending',
    priority: 'medium',
    category: 'Bug',
    isLocked: false,
    // Sabit değerlerle assignedUsers dizisi
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
    // Sabit assignedUserIds dizisi
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
    teamId: "67d2e6c6cb08ce1c56afa358",
    dependencies: [],
    completedDate: null,
    assignedJobs: [],
    history: []
  });
  
  // Görev oluştur
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
  
  // Test 1: Yorum oluştur - POST /api/Comment
  const commentPayload = JSON.stringify({
    taskId: createdTaskId,
    userId: userProfile.id,
    content: 'Bu bir test yorumudur - ' + new Date().toISOString(),
    priority: 'medium',
    tags: ['test', 'k6'],
    dueDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(),
    mentions: [],
    attachments: []
  });
  
  const createCommentRes = http.post(`${baseUrl}/api/Comment`, commentPayload, { headers });
  
  const commentCreationSuccess = check(createCommentRes, {
    'POST /api/Comment status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'created comment has id': (r) => {
      const data = safeParseJson(r);
      return data && data.id;
    },
  });
  
  if (!commentCreationSuccess) {
    errorRate.add(1);
    console.log(`Yorum oluşturma hatası: ${createCommentRes.status} - ${createCommentRes.body}`);
    sleep(1);
    return;
  }
  
  // Oluşturulan yorumun ID'sini al
  const commentData = safeParseJson(createCommentRes);
  const commentId = commentData ? commentData.id : '';
  
  if (!commentId) {
    console.log('Yorum ID\'si alınamadı!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Test 2: Göreve ait tüm yorumları listele - GET /api/Comment/task/{taskId}
  const getCommentsRes = http.get(`${baseUrl}/api/Comment/task/${createdTaskId}`, { headers });
  
  check(getCommentsRes, {
    'GET /api/Comment/task/{taskId} status is 200': (r) => r.status === 200,
    'comments data is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    },
    'comments array contains our comment': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data) && data.some(c => c.id === commentId);
    }
  }) || errorRate.add(1);
  
  // Test 3: Yoruma dosya ekle - POST /api/Comment/{commentId}/attachments
  const attachmentPayload = JSON.stringify({
    fileName: 'test-attachment.png',
    fileUrl: 'https://example.com/test-image.png',
    fileType: 'image/png',
    fileSize: 12345
  });
  
  const addAttachmentRes = http.post(
    `${baseUrl}/api/Comment/${commentId}/attachments`, 
    attachmentPayload, 
    { headers }
  );
  
  check(addAttachmentRes, {
    'POST /api/Comment/{commentId}/attachments status is 200': (r) => r.status === 200,
    'attachment added successfully': (r) => {
      const data = safeParseJson(r);
      return data && data.fileName === 'test-attachment.png';
    }
  }) || errorRate.add(1);
  
  // Test 4: Kullanıcı görev yorumu oluştur - POST /api/Comment/user-task-comment
  const userTaskCommentPayload = JSON.stringify({
    taskId: createdTaskId,
    content: 'Bu bir kullanıcı görev yorumudur - ' + new Date().toISOString(),
    priority: 'high',
    tags: ['user-task', 'test'],
    dueDate: new Date(new Date().getTime() + 48 * 60 * 60 * 1000).toISOString()
  });
  
  const createUserTaskCommentRes = http.post(
    `${baseUrl}/api/Comment/user-task-comment`,
    userTaskCommentPayload,
    { headers }
  );
  
  const userTaskCommentSuccess = check(createUserTaskCommentRes, {
    'POST /api/Comment/user-task-comment status is 200': (r) => r.status === 200,
    'user task comment created successfully': (r) => {
      const data = safeParseJson(r);
      return data && data.id && data.content.includes('kullanıcı görev yorumudur');
    }
  });
  
  if (!userTaskCommentSuccess) {
    errorRate.add(1);
    console.log(`Kullanıcı görev yorumu oluşturma hatası: ${createUserTaskCommentRes.status} - ${createUserTaskCommentRes.body}`);
  }
  
  // Oluşturulan kullanıcı görev yorumunun ID'sini al
  const userTaskCommentData = safeParseJson(createUserTaskCommentRes);
  const userTaskCommentId = userTaskCommentData ? userTaskCommentData.id : '';
  
  // Test yorumlarını listele (önceki yorumların da göründüğünü doğrula)
  const getCommentsAfterRes = http.get(`${baseUrl}/api/Comment/task/${createdTaskId}`, { headers });
  
  check(getCommentsAfterRes, {
    'GET comments after user-task-comment status is 200': (r) => r.status === 200,
    'comments include both comments': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data) && 
             data.some(c => c.id === commentId) &&
             (userTaskCommentId === '' || data.some(c => c.id === userTaskCommentId));
    }
  }) || errorRate.add(1);
  
  // Test 5: Yorum sil - DELETE /api/Comment/{id}
  const deleteCommentRes = http.del(`${baseUrl}/api/Comment/${commentId}`, null, { headers });
  
  check(deleteCommentRes, {
    'DELETE /api/Comment/{id} status is 204 or 200': (r) => r.status === 204 || r.status === 200
  }) || errorRate.add(1);
  
  // Silinen yorumun artık listede olmadığını doğrula
  const getCommentsAfterDeleteRes = http.get(`${baseUrl}/api/Comment/task/${createdTaskId}`, { headers });
  
  check(getCommentsAfterDeleteRes, {
    'GET comments after delete status is 200': (r) => r.status === 200,
    'deleted comment is not in the list': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data) && !data.some(c => c.id === commentId);
    }
  }) || errorRate.add(1);
  
  // Oluşturduğumuz görevi sil (temizlik için)
  http.del(`${baseUrl}/api/Tasks/${createdTaskId}`, null, { headers });
  
  // İsteklerin arasına bir bekleme süresi ekle
  sleep(1);
}