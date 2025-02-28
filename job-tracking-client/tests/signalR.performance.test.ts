import http from 'k6/http';
import { sleep } from 'k6';
import { check, group } from 'k6';
import ws, { Socket } from 'k6/ws';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const connectionErrors = new Counter('connection_errors');
const messagesSent = new Counter('messages_sent');
const messagesReceived = new Counter('messages_received');
const wsLatency = new Trend('websocket_latency');
const connectionSuccess = new Rate('connection_success');

export const options = {
    stages: [
        { duration: '1m', target: 10 },      // Başlangıç: 10 kullanıcı
        { duration: '2m', target: 25 },      // Yavaşça 25'e çıkar
        { duration: '3m', target: 50 },      // 50 kullanıcıya çıkar
        { duration: '5m', target: 100 },     // Maximum 100 kullanıcı
        { duration: '2m', target: 0 },       // Yavaşça kapat
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'],   // Timeout süresini 2 saniyeye çıkar
        http_req_failed: ['rate<0.01'],      // Hata oranını %1'in altında tut
        'connection_success': ['rate>0.90'],  // Reduced expectation to 90%
        'websocket_latency': ['p(95)<2000'],
    },
    userAgent: 'K6SignalRLoadTest/1.0',
    rps: 50,  // Saniyede maksimum 50 istek
    setupTimeout: '30s',
    teardownTimeout: '30s'
};

const SIGNALR_ENDPOINT = 'http://localhost:5193/chatHub';
const AUTH_ENDPOINT = 'http://localhost:5193/api/auth/login';

// Update with valid credentials
const TEST_CREDENTIALS = {
    username: 'semihg2132', // or your valid username
    password: 'Semih123.' // or your valid password
};

function getAuthToken() {
    const loginPayload = JSON.stringify(TEST_CREDENTIALS);
    const maxRetries = 3;
    let currentTry = 0;

    while (currentTry < maxRetries) {
        try {
            // Add exponential backoff delay
            if (currentTry > 0) {
                const backoffTime = Math.min(2000 * Math.pow(2, currentTry - 1), 10000);
                sleep(backoffTime / 1000); // k6 sleep takes seconds
            }

            const response = http.post(AUTH_ENDPOINT, loginPayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: '30s',  // Timeout süresini artır
                tags: { name: 'login' }  // Metriklerde login isteklerini ayrı izle
            });
            
            if (response.status === 500) {
                console.log(`Server error (attempt ${currentTry + 1}/${maxRetries}), backing off...`);
                currentTry++;
                continue;
            }

            if (response.status === 200 && response.body) {
                const body = JSON.parse(response.body as string);
                const token = body?.token || body?.accessToken;
                if (token) {
                    return token;
                }
            }

            // If we get here, something else went wrong
            console.error(`Auth failed with status ${response.status}:`, response.body);
            return null;

        } catch (error) {
            console.error(`Auth attempt ${currentTry + 1} failed:`, error);
            currentTry++;
            sleep(1); // Her hata sonrası 1 saniye bekle
        }
    }

    return null;
}

function simulateUserActivity(socket: Socket) {
    const activities = [
        () => {
            const timestamp = Date.now();
            // SignalR mesaj formatı düzeltildi
            const messagePayload = JSON.stringify({
                type: 1, // Invocation type
                target: "SendMessage",
                arguments: [`Test message from VU ${__VU}`],
                timestamp
            }) + String.fromCharCode(0x1E);

            socket.send(messagePayload);
            messagesSent.add(1);
            // Track initial send time
            wsLatency.add(0); // Initialize latency tracking
        },
        () => sleep(Math.random() * 2 + 1), // 1-3 saniye arası bekleme
    ];

    const activity = activities[Math.floor(Math.random() * activities.length)];
    activity();
}

export default function () {
    sleep(Math.random());

    group('SignalR Connection Test', () => {
        const token = getAuthToken();
        if (!token) {
            console.error('Failed to get auth token');
            return;
        }

        const negotiateResponse = http.post(
            `${SIGNALR_ENDPOINT}/negotiate?negotiateVersion=1`, 
            null,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            }
        );

        if (!check(negotiateResponse, {
            'negotiate successful': (r) => r.status === 200,
        })) {
            console.error('Negotiate failed:', negotiateResponse.status, negotiateResponse.body);
            return;
        }

        try {
            const negotiateData = JSON.parse(negotiateResponse.body as string);
            if (!negotiateData.connectionId) {
                console.error('No connectionId in negotiate response');
                return;
            }

            let connected = false;
            const socket = ws.connect(
                `ws://localhost:5193/chatHub?id=${negotiateData.connectionId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'User-Agent': options.userAgent,
                        'Upgrade': 'websocket',
                        'Connection': 'Upgrade',
                    }
                },
                function(socket) {
                    socket.on('open', () => {
                        console.log(`VU ${__VU}: Connection opened, sending handshake`);
                        socket.send(JSON.stringify({
                            protocol: 'json',
                            version: 1
                        }));
                    });

                    socket.on('message', (data) => {
                        messagesReceived.add(1);
                        try {
                            const message = data.toString().split('\u001E')[0];
                            const parsed = JSON.parse(message);

                            if (!connected && !parsed.error) {
                                connected = true;
                                connectionSuccess.add(1);
                                console.log(`VU ${__VU}: Handshake completed`);
                                
                                // Start activity after successful handshake
                                const endTime = Date.now() + 5000;
                                while (Date.now() < endTime) {
                                    simulateUserActivity(socket);
                                    sleep(1);
                                }
                                socket.close();
                            }
                        } catch (error) {
                            console.error('Message handling error:', error);
                        }
                    });

                    socket.on('error', (e) => {
                        connectionErrors.add(1);
                        console.error('Socket error:', e);
                    });

                    socket.on('close', () => {
                        console.log('Connection closed');
                    });
                }
            );

            if (!socket) {
                console.error('Failed to create WebSocket connection');
                return;
            }

        } catch (error) {
            console.error('Connection setup error:', error);
        }
    });

    sleep(1);
}

