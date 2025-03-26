import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import ws from 'k6/ws';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

// Hata oranı metriği tanımlama
export const errorRate = new Rate('errors');
export const signalRConnectionRate = new Rate('signalr_connections');
export const messageReceiveRate = new Rate('message_received');

// Test konfigürasyonu
export const options = {
  stages: [
    { duration: '10s', target: 5 },  // 10 saniyede kademeli olarak 5 sanal kullanıcıya çıkar
    { duration: '20s', target: 5 },  // 20 saniye boyunca 5 kullanıcıda kal
    { duration: '10s', target: 0 },  // 10 saniyede kademeli olarak trafiği durdur
  ],
  thresholds: {
    'signalr_connections': ['rate>0.95'], // %95'den fazla bağlantı başarılı olmalı
    'message_received': ['rate>0.9'],     // %90'dan fazla mesaj alımı başarılı olmalı
    'errors': ['rate<0.1'],               // %10'dan az hata oranı bekle
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

// Rastgele mesaj içeriği oluşturma
function getRandomMessageContent() {
  const messages = [
    'Merhaba, nasılsın?',
    'Proje ile ilgili güncellemeler var mı?',
    'Toplantı saati değişti mi?',
    'Dosyayı inceleyebildin mi?',
    'Bugün öğle yemeğinde buluşalım mı?',
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}

// SignalR bağlantı URL'sini oluşturma
function getSignalRConnectionUrl(token, connectionId) {
  // SignalR bağlantı URL'si - ChatHub için
  if (connectionId) {
    return `ws://localhost:5193/chatHub?id=${connectionId}&access_token=${token}`;
  }
  return `ws://localhost:5193/chatHub?access_token=${token}`;
}

// SignalR için negotiation isteği yapan fonksiyon
function negotiateSignalRConnection(token) {
  const negotiateUrl = 'http://localhost:5193/chatHub/negotiate';
  const negotiateRes = http.post(negotiateUrl, null, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
  });
  
  console.log(`Negotiation response: ${negotiateRes.status} ${negotiateRes.body}`);
  
  const success = check(negotiateRes, {
    'Negotiation başarılı': (r) => r.status === 200,
  });
  
  if (!success) {
    console.log(`Negotiation hatası: ${negotiateRes.status} ${negotiateRes.body}`);
    errorRate.add(1);
    return null;
  }
  
  const negotiateData = safeParseJson(negotiateRes);
  return negotiateData ? negotiateData.connectionId : null;
}

// SignalR protokolü için gerekli handshake mesajı
function getHandshakeMessage() {
  return JSON.stringify({
    protocol: 'json',
    version: 1
  }) + '\u001e'; // Add record separator character for SignalR protocol
}

// Test senaryosu
export default function() {
  // API'nın çalıştığı URL'i tanımla
  const baseUrl = 'http://localhost:5193'; // JobTrackingAPI için URL
  
  // İki kullanıcı için login işlemi gerçekleştir
  const user1 = loginUser('semihg18', 'Semih123.');
  const user2 = loginUser('semihg18', 'Semih123.');
  
  if (!user1.token || !user2.token) {
    console.log('Token alınamadı!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  // User1 için SignalR bağlantısı kur
  const user1ConnectionResult = connectToSignalR(user1);
  
  // User2 için SignalR bağlantısı kur
  const user2ConnectionResult = connectToSignalR(user2);
  
  // Her iki kullanıcı da bağlantı kurabildiyse mesaj gönderme testini yap
  if (user1ConnectionResult && user2ConnectionResult) {
    // User1'den User2'ye mesaj gönder
    const messageContent = getRandomMessageContent();
    const sendMessageRes = http.post(
      `${baseUrl}/api/Messages/send/${user1.userId}`,
      JSON.stringify({
        receiverId: user2.userId,
        content: messageContent,
        subject: 'SignalR Test'
      }),
      { 
        headers: {
          'Authorization': `Bearer ${user1.token}`,
          'Content-Type': 'application/json',
        }
      }
    );
    
    check(sendMessageRes, {
      'Mesaj gönderimi başarılı': (r) => r.status === 200,
    }) || errorRate.add(1);
    
    // Mesajın SignalR üzerinden alınması için biraz bekle
    sleep(2);
  }
  
  // Test tamamlandı, bağlantıları kapat
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
    return { token: null, userId: null };
  }
  
  // Token'ı al
  const loginData = safeParseJson(loginRes);
  const token = loginData ? loginData.token : '';
  const userId = loginData && loginData.user ? loginData.user.id : '';
  
  return { token, userId };
}

// SignalR'a bağlanan yardımcı fonksiyon
function connectToSignalR(user) {
  let connectionSuccess = false;
  let messageReceived = false;
  const connectionId = uuidv4();
  
  // Önce negotiation isteği yap
  const negotiatedConnectionId = negotiateSignalRConnection(user.token);
  
  if (!negotiatedConnectionId) {
    console.log(`Negotiation başarısız oldu, bağlantı kurulamıyor. User: ${user.userId}`);
    errorRate.add(1);
    return false;
  }
  
  console.log(`Negotiation başarılı, connectionId: ${negotiatedConnectionId}`);
  
  // WebSocket bağlantı URL'sini oluştur
  const wsUrl = getSignalRConnectionUrl(user.token, negotiatedConnectionId);
  console.log(`WebSocket URL: ${wsUrl}`);
  
  // WebSocket bağlantısı kur
  const res = ws.connect(wsUrl, {}, function(socket) {
    // Bağlantı açılmadan önce hata durumu için handler
    socket.on('error', (e) => {
      console.log(`WebSocket bağlantı hatası: ${e.error()}`);
      errorRate.add(1);
      connectionSuccess = false;
    });
    
    socket.on('open', () => {
      console.log(`WebSocket bağlantısı açıldı, handshake gönderiliyor...`);
      
      // Handshake mesajını gönder
      const handshakeMsg = getHandshakeMessage();
      console.log(`Handshake mesajı: ${handshakeMsg}`);
      socket.send(handshakeMsg);
      
      // Mesaj dinleme için event handler
      socket.on('message', (message) => {
        try {
          console.log(`Alınan mesaj: ${message}`);
          
          // Check if message contains record separator character
          const messages = message.split('\u001e').filter(m => m.trim() !== '');
          
          for (const msg of messages) {
            if (!msg) continue;
            
            const data = JSON.parse(msg);
            
            // Error handling
            if (data.error) {
              console.log(`SignalR error: ${data.error}`);
              errorRate.add(1);
              return;
            }
            
            // Handshake yanıtını kontrol et
            if (data.type === 1) { // Invocation mesajı
              if (data.target === 'ReceiveMessage') {
                console.log(`User ${user.userId} mesaj aldı:`, data.arguments[0]);
                messageReceived = true;
                messageReceiveRate.add(1);
              } else if (data.target === 'UserIsTyping') {
                console.log(`User ${data.arguments[0]} yazıyor...`);
              } else if (data.target === 'UserConnected') {
                console.log(`User ${data.arguments[0]} bağlandı`);
              }
            } else if (data.type === 6) { // Handshake yanıtı
              console.log(`Handshake başarılı, bağlantı kuruldu`);
              connectionSuccess = true;
              signalRConnectionRate.add(1);
              
              // Bağlantı kurulduktan sonra kullanıcı grubuna katıl
              const joinGroupMessage = JSON.stringify({
                type: 1, // Invocation
                target: 'JoinUserGroupToChat',
                arguments: [user.userId],
                invocationId: connectionId
              }) + '\u001e'; // Add record separator for SignalR protocol
              
              console.log(`Grup katılım mesajı gönderiliyor: ${joinGroupMessage}`);
              socket.send(joinGroupMessage);
            }
          }
        } catch (e) {
          console.log(`Mesaj ayrıştırma hatası: ${e.message}, mesaj: ${message}`);
        }
      });
      
      // Bağlantı hatası için event handler
      socket.on('error', (e) => {
        console.log(`WebSocket hatası: ${e.error()}`);
        errorRate.add(1);
        connectionSuccess = false;
      });
      
      // Bağlantı kapanması için event handler
      socket.on('close', (code, reason) => {
        console.log(`User ${user.userId} SignalR bağlantısı kapandı. Kod: ${code}, Sebep: ${reason}`);
      });
    });
  });
  
  // Bağlantı için biraz bekle
  sleep(2);
  
  // Bağlantı sonucunu kontrol et
  check(res, {
    'SignalR bağlantısı başarılı': (r) => connectionSuccess,
  }) || errorRate.add(1);
  
  return connectionSuccess;
}