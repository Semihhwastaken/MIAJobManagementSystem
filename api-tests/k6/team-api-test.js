import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Hata oranı metriği tanımlama
export const errorRate = new Rate('errors');
export const successRate = new Rate('success_rate');

// Test konfigürasyonu
export const options = {
  stages: [
    { duration: '10s', target: 5 },  // 10 saniyede kademeli olarak 5 sanal kullanıcıya çıkar
    { duration: '20s', target: 5 },  // 20 saniye boyunca 5 kullanıcıda kal
    { duration: '10s', target: 0 },  // 10 saniyede kademeli olarak trafiği durdur
  ],
  thresholds: {
    'success_rate': ['rate>0.95'], // %95'den fazla başarı oranı bekle
    'errors': ['rate<0.1'],        // %10'dan az hata oranı bekle
    'http_req_duration': ['p(95)<500'], // İsteklerin %95'i 500ms'den kısa sürmeli
  },
};

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
  const baseUrl = 'http://localhost:5193'; // JobTrackingAPI için URL
  
  // Test için kullanıcı girişi yap
  const userToken = loginUser('semihg18', 'Semih123.');
  
  if (!userToken) {
    console.log('Token alınamadı!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // Kullanıcının takımlarını getir
  group('Get Teams', function() {
    testGetTeams(baseUrl, userToken);
  });
  
  // Yeni takım oluştur
  let teamId = null;
  group('Create Team', function() {
    teamId = testCreateTeam(baseUrl, userToken);
  });
  
  if (teamId) {
    // Takım detaylarını getir
    group('Get Team Members', function() {
      testGetTeamMembers(baseUrl, userToken, teamId);
    });
    
    // Takım davet linki oluştur
    group('Generate Invite Link', function() {
      testGenerateInviteLink(baseUrl, userToken, teamId);
    });
    
    // Takımı güncelle
    group('Update Team', function() {
      testUpdateTeam(baseUrl, userToken, teamId);
    });
    
    // Takım aktivitelerini getir
    group('Get Team Activity', function() {
      testGetTeamActivity(baseUrl, userToken, teamId);
    });
    
    // Takımı sil
    group('Delete Team', function() {
      testDeleteTeam(baseUrl, userToken, teamId);
    });
  }
  
  // Departmanları getir
  group('Get Departments', function() {
    testGetDepartments(baseUrl, userToken);
  });
  
  // Tüm üyeleri getir
  group('Get All Members', function() {
    testGetAllMembers(baseUrl, userToken);
  });
  
  // Test tamamlandı
  sleep(1);
}

// Kullanıcı girişi yapan yardımcı fonksiyon
function loginUser(username, password) {
  const loginPayload = JSON.stringify({
    username: username,
    password: password
  });
  
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Login endpoint'ine POST isteği
  const loginRes = http.post(`http://localhost:5193/api/Auth/login`, loginPayload, loginParams);
  
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
    return null;
  }
  
  // Token'ı al
  const loginData = safeParseJson(loginRes);
  return loginData ? loginData.token : null;
}

// Kullanıcının takımlarını getiren test fonksiyonu
function testGetTeams(baseUrl, token) {
  const teamsRes = http.get(`${baseUrl}/api/Team`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(teamsRes, {
    'get teams status is 200': (r) => r.status === 200,
    'teams data is returned': (r) => {
      const data = safeParseJson(r);
      return Array.isArray(data);
    },
  });
  
  if (success) {
    successRate.add(1);
    console.log('Takımlar başarıyla alındı');
  } else {
    errorRate.add(1);
    console.log(`Takımlar alınırken hata: ${teamsRes.status} ${teamsRes.body}`);
  }
}

// Yeni takım oluşturan test fonksiyonu
function testCreateTeam(baseUrl, token) {
  // Önce mevcut takımları kontrol et
  const teamsRes = http.get(`${baseUrl}/api/Team`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const teamsData = safeParseJson(teamsRes);
  
  // Eğer kullanıcının zaten 5 takımı varsa, en eski takımı sil
  if (Array.isArray(teamsData) && teamsData.length >= 5) {
    console.log('Kullanıcı maksimum takım sayısına ulaştı. En eski takım siliniyor...');
    const oldestTeamId = teamsData[0].id; // İlk takımı en eski kabul ediyoruz
    
    const deleteRes = http.del(`${baseUrl}/api/Team/${oldestTeamId}`, null, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (deleteRes.status !== 200) {
      console.log(`Eski takım silinemedi: ${deleteRes.status} ${deleteRes.body}`);
      // Silme başarısız olsa bile devam et
    } else {
      console.log(`Eski takım silindi: ${oldestTeamId}`);
    }
  }
  
  const teamName = `Test Team ${randomString(5)}`;
  const createTeamPayload = JSON.stringify({
    name: teamName,
    description: 'Bu bir test takımıdır',
    department: 'Engineering'
  });
  
  const createTeamRes = http.post(`${baseUrl}/api/Team/create`, createTeamPayload, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  // 400 yanıtı ve "En fazla 5 takıma sahip olabilirsiniz" mesajı için özel kontrol
  if (createTeamRes.status === 400 && createTeamRes.body.includes('En fazla 5 takıma sahip olabilirsiniz')) {
    console.log('Takım limiti aşıldı. Mevcut takımlardan biri kullanılacak.');
    
    // Mevcut takımlardan birini kullan
    if (Array.isArray(teamsData) && teamsData.length > 0) {
      const existingTeam = teamsData[0];
      console.log(`Mevcut takım kullanılıyor: ${existingTeam.name}, ID: ${existingTeam.id}`);
      return existingTeam.id;
    }
    
    return null;
  }
  
  const success = check(createTeamRes, {
    'create team status is 200': (r) => r.status === 200,
    'team data is returned': (r) => {
      const data = safeParseJson(r);
      return data && data.id !== undefined;
    },
  });
  
  if (success) {
    successRate.add(1);
    const teamData = safeParseJson(createTeamRes);
    console.log(`Takım başarıyla oluşturuldu: ${teamData.name}, ID: ${teamData.id}`);
    return teamData.id;
  } else {
    errorRate.add(1);
    console.log(`Takım oluşturulurken hata: ${createTeamRes.status} ${createTeamRes.body}`);
    return null;
  }
}

// Takım üyelerini getiren test fonksiyonu
function testGetTeamMembers(baseUrl, token, teamId) {
  const membersRes = http.get(`${baseUrl}/api/Team/${teamId}/members`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(membersRes, {
    'get team members status is 200': (r) => r.status === 200,
    'team members data is returned': (r) => {
      const data = safeParseJson(r);
      return Array.isArray(data);
    },
  });
  
  if (success) {
    successRate.add(1);
    console.log('Takım üyeleri başarıyla alındı');
  } else {
    errorRate.add(1);
    console.log(`Takım üyeleri alınırken hata: ${membersRes.status} ${membersRes.body}`);
  }
}

// Takım davet linki oluşturan test fonksiyonu
function testGenerateInviteLink(baseUrl, token, teamId) {
  const inviteLinkRes = http.post(`${baseUrl}/api/Team/invite-link/${teamId}`, null, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(inviteLinkRes, {
    'generate invite link status is 200': (r) => r.status === 200,
    'invite link is returned': (r) => {
      const data = safeParseJson(r);
      return data && data.inviteLink !== undefined;
    },
  });
  
  if (success) {
    successRate.add(1);
    const inviteData = safeParseJson(inviteLinkRes);
    console.log(`Davet linki başarıyla oluşturuldu: ${inviteData.inviteLink}`);
  } else {
    errorRate.add(1);
    console.log(`Davet linki oluşturulurken hata: ${inviteLinkRes.status} ${inviteLinkRes.body}`);
  }
}

// Takımı güncelleyen test fonksiyonu
function testUpdateTeam(baseUrl, token, teamId) {
  // Önce takım bilgilerini al
  const getTeamRes = http.get(`${baseUrl}/api/Team/${teamId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (getTeamRes.status !== 200) {
    errorRate.add(1);
    console.log(`Takım bilgileri alınamadı: ${getTeamRes.status}`);
    return;
  }
  
  const teamData = safeParseJson(getTeamRes);
  if (!teamData) {
    errorRate.add(1);
    console.log('Takım verisi ayrıştırılamadı');
    return;
  }
  
  // Takım bilgilerini güncelle
  teamData.description = `Updated description ${randomString(5)}`;
  
  const updateTeamRes = http.put(`${baseUrl}/api/Team/${teamId}`, JSON.stringify(teamData), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(updateTeamRes, {
    'update team status is 200': (r) => r.status === 200,
  });
  
  if (success) {
    successRate.add(1);
    console.log('Takım başarıyla güncellendi');
  } else {
    errorRate.add(1);
    console.log(`Takım güncellenirken hata: ${updateTeamRes.status} ${updateTeamRes.body}`);
  }
}

// Takım aktivitelerini getiren test fonksiyonu
function testGetTeamActivity(baseUrl, token, teamId) {
  const activityRes = http.get(`${baseUrl}/api/Team/${teamId}/activity`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  // 200 OK yanıtı başarılı kabul edilir, "No tasks found" mesajı da geçerli bir durumdur
  const success = check(activityRes, {
    'get team activity status is 200': (r) => r.status === 200,
    'team activity data is valid': (r) => {
      const data = safeParseJson(r);
      // "No tasks found" mesajı da geçerli bir yanıt olarak kabul edilir
      return data && (data.activity !== undefined || data.message === "No tasks found");
    },
  });
  
  if (success) {
    successRate.add(1);
    const data = safeParseJson(activityRes);
    if (data && data.message === "No tasks found") {
      console.log('Takım için aktivite bulunamadı');
    } else {
      console.log('Takım aktiviteleri başarıyla alındı');
    }
  } else {
    errorRate.add(1);
    console.log(`Takım aktiviteleri alınırken hata: ${activityRes.status} ${activityRes.body}`);
  }
}

// Takımı silen test fonksiyonu
function testDeleteTeam(baseUrl, token, teamId) {
  const deleteTeamRes = http.del(`${baseUrl}/api/Team/${teamId}`, null, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(deleteTeamRes, {
    'delete team status is 200': (r) => r.status === 200,
  });
  
  if (success) {
    successRate.add(1);
    console.log('Takım başarıyla silindi');
  } else {
    errorRate.add(1);
    console.log(`Takım silinirken hata: ${deleteTeamRes.status} ${deleteTeamRes.body}`);
  }
}

// Departmanları getiren test fonksiyonu
function testGetDepartments(baseUrl, token) {
  const departmentsRes = http.get(`${baseUrl}/api/Team/departments`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(departmentsRes, {
    'get departments status is 200': (r) => r.status === 200,
    'departments data is returned': (r) => {
      const data = safeParseJson(r);
      return Array.isArray(data);
    },
  });
  
  if (success) {
    successRate.add(1);
    console.log('Departmanlar başarıyla alındı');
  } else {
    errorRate.add(1);
    console.log(`Departmanlar alınırken hata: ${departmentsRes.status} ${departmentsRes.body}`);
  }
}

// Tüm üyeleri getiren test fonksiyonu
function testGetAllMembers(baseUrl, token) {
  const membersRes = http.get(`${baseUrl}/api/Team/members`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const success = check(membersRes, {
    'get all members status is 200': (r) => r.status === 200,
    'members data is returned': (r) => {
      const data = safeParseJson(r);
      return Array.isArray(data);
    },
  });
  
  if (success) {
    successRate.add(1);
    console.log('Tüm üyeler başarıyla alındı');
  } else {
    errorRate.add(1);
    console.log(`Tüm üyeler alınırken hata: ${membersRes.status} ${membersRes.body}`);
  }
}