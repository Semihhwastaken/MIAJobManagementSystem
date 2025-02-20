import axios from 'axios';
import { LoginRequest, RegisterRequest, AuthResponse } from '../types/auth';
import axiosInstance from './axiosInstance';

const API_URL = 'http://localhost:5193/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
    try {
        const response = await axiosInstance.post<AuthResponse>('/auth/login', data);
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        }
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            // API'den gelen hata mesajını döndür
            return {
                message: error.response.data.message || 'Giriş işlemi başarısız oldu',
                error: error.response.data.error || error.response.data.message
            };
        }
        // Genel hata durumu
        return {
            message: 'Bir hata oluştu',
            error: 'Sunucu ile bağlantı kurulamadı'
        };
    }
};

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
    try {
        const response = await axiosInstance.post<AuthResponse>('/auth/register', data);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            // API'den gelen hata mesajını döndür
            return {
                message: error.response.data.message || 'Kayıt işlemi başarısız oldu',
                error: error.response.data.error || error.response.data.message
            };
        }
        // Genel hata durumu
        return {
            message: 'Bir hata oluştu',
            error: 'Sunucu ile bağlantı kurulamadı'
        };
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    delete axiosInstance.defaults.headers.common['Authorization'];
};

// Add token to requests if it exists
const token = localStorage.getItem('token');
if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default axiosInstance;
