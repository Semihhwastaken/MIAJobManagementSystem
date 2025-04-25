/* 
 * This file contains debug utilities for API calls
 */

import axios from 'axios';

// Create an axios instance with debug interceptors
export const createDebugAxios = (baseURL = 'https://miajobmanagementsystem.onrender.com/api') => {
    const instance = axios.create({
        baseURL,
        timeout: 15000, // Longer timeout for render.com cold starts
    });

    // Request interceptor
    instance.interceptors.request.use(
        (config) => {
            // Add authorization header if token exists
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, config);
            return config;
        },
        (error) => {
            console.error('❌ Request Error:', error);
            return Promise.reject(error);
        }
    );

    // Response interceptor
    instance.interceptors.response.use(
        (response) => {
            console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
                status: response.status,
                headers: response.headers,
                data: response.data
            });
            return response;
        },
        (error) => {
            console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });

            // Check for specific error conditions
            if (error.response?.status === 401) {
                console.warn('⚠️ Authentication error detected. Token may be invalid or expired.');

                // Check token expiration
                const token = localStorage.getItem('token');
                if (token) {
                    try {
                        // Extract payload from JWT
                        const payload = JSON.parse(atob(token.split('.')[1]));
                        const expiration = payload.exp * 1000; // Convert to milliseconds
                        const now = Date.now();
                        console.log(`Token expires in ${Math.floor((expiration - now) / 1000 / 60)} minutes`);
                    } catch (e) {
                        console.error('Failed to parse token:', e);
                    }
                }
            }

            return Promise.reject(error);
        }
    );

    return instance;
};

export const debugFetch = async (url, options = {}) => {
    console.log(`🚀 Fetch Request: ${url}`, options);
    try {
        const response = await fetch(url, options);
        const responseData = await response.clone().json().catch(() => 'No JSON data');
        console.log(`✅ Fetch Response: ${url}`, {
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData
        });
        return response;
    } catch (error) {
        console.error(`❌ Fetch Error: ${url}`, error);
        throw error;
    }
};

// Export a pre-configured axios instance
export const debugAxios = createDebugAxios();
