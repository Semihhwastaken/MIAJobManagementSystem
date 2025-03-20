import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Error rate metric definition
export const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '20s', target: 10 }, // Ramp up to 10 virtual users over 20 seconds
    { duration: '30s', target: 10 }, // Stay at 10 users for 30 seconds
    { duration: '20s', target: 0 },  // Ramp down to 0 users over 20 seconds
  ],
  thresholds: {
    'http_req_duration': ['p(95)<3000'], // Expect 95% of requests to be faster than 3000ms
    'errors': ['rate<0.1'],               // Expect error rate to be less than 10%
  },
};

// Helper function to generate MongoDB ObjectID
function generateObjectId() {
  const timestamp = Math.floor(new Date().getTime() / 1000).toString(16).padStart(8, '0');
  const machineId = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  const processId = Math.floor(Math.random() * 65536).toString(16).padStart(4, '0');
  const counter = Math.floor(Math.random() * 16777216).toString(16).padStart(6, '0');
  return timestamp + machineId + processId + counter;
}

// Helper function to safely parse JSON response
function safeParseJson(response) {
  try {
    if (!response.body || response.body.trim() === '') {
      return null;
    }
    return JSON.parse(response.body);
  } catch (e) {
    console.log(`JSON parsing error: ${e.message}, response: ${response.body}`);
    return null;
  }
}

// Helper function to generate test event data
function generateTestEvent() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    title: 'Test Calendar Event',
    description: 'This is a test event created by the API test',
    startDate: today.toISOString().split('T')[0],
    endDate: tomorrow.toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    priority: 'Medium',
    participants: ['test@example.com'],
    category: 'meeting',
    meetingLink: 'https://meet.example.com/test'
  };
}

// Main test scenario
export default function() {
  const baseUrl = 'http://localhost:5193';
  
  // Login to get authentication token
  const loginPayload = JSON.stringify({
    username: 'TestNajung',
    password: 'asker123'
  });
  
  const loginParams = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginRes = http.post(`${baseUrl}/api/Auth/login`, loginPayload, loginParams);
  
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
  
  const loginData = safeParseJson(loginRes);
  const token = loginData ? loginData.token : '';
  
  if (!token) {
    console.log('Failed to get token!');
    errorRate.add(1);
    sleep(1);
    return;
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // 1. Create a new calendar event
  const eventData = generateTestEvent();
  const createEventRes = http.post(
    `${baseUrl}/api/calendar/events`,
    JSON.stringify(eventData),
    { headers }
  );

  check(createEventRes, {
    'create event status is 201': (r) => r.status === 201,
    'created event has valid id': (r) => {
      const data = safeParseJson(r);
      return data && data.id !== undefined;
    },
    'event data is correct': (r) => {
      const data = safeParseJson(r);
      return data && 
        data.title === eventData.title &&
        data.startDate === eventData.startDate &&
        data.endDate === eventData.endDate;
    }
  });

  const createdEvent = safeParseJson(createEventRes);
  if (!createdEvent || !createdEvent.id) {
    errorRate.add(1);
    sleep(1);
    return;
  }

  // 2. Test invalid event creation
  const invalidEventData = {
    ...eventData,
    startDate: 'invalid-date',
    endDate: 'invalid-date'
  };

  const invalidCreateRes = http.post(
    `${baseUrl}/api/calendar/events`,
    JSON.stringify(invalidEventData),
    { headers }
  );

  check(invalidCreateRes, {
    'invalid create returns 400': (r) => r.status === 400,
    'invalid create has error message': (r) => {
      const data = safeParseJson(r);
      return data && data.error && data.error.includes('Invalid date format');
    }
  });

  // 3. Get events for date range
  const getEventsRes = http.get(
    `${baseUrl}/api/calendar/events?startDate=${eventData.startDate}&endDate=${eventData.endDate}`,
    { headers }
  );

  check(getEventsRes, {
    'get events status is 200': (r) => r.status === 200,
    'events list is not empty': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data) && data.length > 0;
    }
  });

  // 4. Get event by ID
  const getEventRes = http.get(
    `${baseUrl}/api/calendar/events/${createdEvent.id}`,
    { headers }
  );

  check(getEventRes, {
    'get event status is 200': (r) => r.status === 200,
    'event data matches': (r) => {
      const data = safeParseJson(r);
      return data && data.id === createdEvent.id;
    }
  });

  // 5. Get events for user
  const getUserEventsRes = http.get(
    `${baseUrl}/api/calendar/events/user/${loginData.userId}`,
    { headers }
  );

  check(getUserEventsRes, {
    'get user events status is 200': (r) => r.status === 200,
    'user events list is array': (r) => {
      const data = safeParseJson(r);
      return data && Array.isArray(data);
    }
  });

  // 6. Update the created event
  const updateData = {
    ...eventData,
    id: createdEvent.id,
    title: 'Updated Test Event',
    description: 'This event was updated by the API test'
  };

  const updateEventRes = http.put(
    `${baseUrl}/api/calendar/events/${createdEvent.id}`,
    JSON.stringify(updateData),
    { headers }
  );

  check(updateEventRes, {
    'update event status is 200': (r) => r.status === 200,
    'event was updated': (r) => {
      const data = safeParseJson(r);
      return data && 
        data.title === 'Updated Test Event' &&
        data.description === 'This event was updated by the API test';
    }
  });

  // 7. Test invalid update
  const invalidUpdateData = {
    ...updateData,
    startDate: 'invalid-date'
  };

  const invalidUpdateRes = http.put(
    `${baseUrl}/api/calendar/events/${createdEvent.id}`,
    JSON.stringify(invalidUpdateData),
    { headers }
  );

  check(invalidUpdateRes, {
    'invalid update returns 400': (r) => r.status === 400,
    'invalid update has error message': (r) => {
      const data = safeParseJson(r);
      return data && data.error && data.error.includes('Invalid date format');
    }
  });

  // 8. Delete the event
  const deleteEventRes = http.del(
    `${baseUrl}/api/calendar/events/${createdEvent.id}`,
    null,
    { headers }
  );

  check(deleteEventRes, {
    'delete event status is 204': (r) => r.status === 204
  });

  // 9. Verify event is deleted
  const getDeletedEventRes = http.get(
    `${baseUrl}/api/calendar/events/${createdEvent.id}`,
    { headers }
  );

  check(getDeletedEventRes, {
    'get deleted event returns 404': (r) => r.status === 404
  });

  // Add small delay between iterations
  sleep(1);
}