import axios, { AxiosResponse } from 'axios';

// Extend AxiosResponse to include the fromCache property
declare module 'axios' {
  export interface AxiosResponse<T = any> {
    fromCache?: boolean;
  }
}

// Create cache storage
interface CacheItem {
  data: any;
  timestamp: number;
  expiry: number;
}

const cache: Record<string, CacheItem> = {};

// Default cache expiry time (5 minutes)
const DEFAULT_CACHE_EXPIRY = 5 * 60 * 1000;

// Create axios instance
const axiosInstance = axios.create({
  baseURL: 'http://localhost:5193/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if it exists
const token = localStorage.getItem('token');
if (token) {
  axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Check if we should use cached response for GET requests
    if (config.method?.toLowerCase() === 'get' && config.url) {
      const cacheKey = `${config.url}${JSON.stringify(config.params || {})}`;
      const cachedResponse = cache[cacheKey];
      
      if (cachedResponse && (Date.now() - cachedResponse.timestamp) < cachedResponse.expiry) {
        // Return cached response as a resolved promise with cached data
        // Use special flag to mark it's from cache
        config.adapter = () => {
          return Promise.resolve({
            data: cachedResponse.data,
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
            request: null,
            fromCache: true
          });
        };
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // Don't cache already cached responses
    if (response.config.method?.toLowerCase() === 'get' && !response.fromCache) {
      const cacheKey = `${response.config.url}${JSON.stringify(response.config.params || {})}`;
      
      // Get cache control header or use default expiry
      const cacheControl = response.headers['cache-control'];
      let expiry = DEFAULT_CACHE_EXPIRY;
      
      if (cacheControl && cacheControl.includes('max-age=')) {
        const maxAge = parseInt(cacheControl.split('max-age=')[1]);
        if (!isNaN(maxAge)) {
          expiry = maxAge * 1000;
        }
      }
      
      // Store response in cache
      cache[cacheKey] = {
        data: response.data,
        timestamp: Date.now(),
        expiry: expiry
      };
    }
    
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // If 401 Unauthorized, dispatch custom event for App to handle
      const authError = new Event('authError');
      window.dispatchEvent(authError);
    }
    return Promise.reject(error);
  }
);

// Function to invalidate cache for a specific URL or pattern
export const invalidateCache = (urlPattern: string): void => {
  if (urlPattern === '*') {
    // Clear entire cache
    Object.keys(cache).forEach(key => delete cache[key]);
    return;
  }
  
  // Remove matching cache entries
  Object.keys(cache).forEach(key => {
    if (key.includes(urlPattern)) {
      delete cache[key];
    }
  });
};

const NOTIFICATION_API_URL = 'http://localhost:8080/api';

const notificationAxiosInstance = axios.create({
    baseURL: NOTIFICATION_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Initialize token from localStorage
if (token) {
    notificationAxiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add request interceptors
[notificationAxiosInstance].forEach(instance => {
    instance.interceptors.request.use(
        (config) => {
            if (config.url?.includes('/login')) {
                return config;
            }

            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401 && !error.config.url?.includes('/login')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                const event = new CustomEvent('authError', {
                    detail: { message: 'Oturum süreniz doldu. Lütfen tekrar giriş yapın.' }
                });
                window.dispatchEvent(event);
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }
    );
});

export { axiosInstance as default, notificationAxiosInstance };
