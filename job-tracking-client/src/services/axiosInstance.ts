import axios from 'axios';

const API_URL = 'http://localhost:5193/api';
<<<<<<< HEAD
=======
const NOTIFICATION_API_URL = 'http://localhost:8080/api';
>>>>>>> newdb1

const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

<<<<<<< HEAD
=======
const notificationAxiosInstance = axios.create({
    baseURL: NOTIFICATION_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

>>>>>>> newdb1
// Initialize token from localStorage
const token = localStorage.getItem('token');
if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
<<<<<<< HEAD
}

// Add a request interceptor to add the token to all requests
axiosInstance.interceptors.request.use(
    (config) => {
        // Login işlemleri için token kontrolü yapmaya gerek yok
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

// Add a response interceptor to handle token expiration
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config.url?.includes('/login')) {
            // Token expired or invalid - but only for non-login endpoints
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

export { axiosInstance as default };
=======
    notificationAxiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add request interceptors
[axiosInstance, notificationAxiosInstance].forEach(instance => {
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
>>>>>>> newdb1
