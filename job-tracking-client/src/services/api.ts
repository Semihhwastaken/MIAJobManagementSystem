import axios from 'axios';
import { LoginRequest, AuthResponse } from '../types/auth';
import axiosInstance from './axiosInstance';

export interface InitiateRegistrationRequest {
    username: string;
    email: string;
    password: string;
    fullName: string;
    department: string;
    title: string;
    phone: string;
    position: string;
    profileImage?: string;
}

export interface VerificationRequest {
    email: string;
    code: string;
    username: string;
    password: string;
    fullName: string;
    department: string;
    title: string;
    phone: string;
    position: string;
    profileImage?: string;
}

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
    try {
        const response = await axiosInstance.post<AuthResponse>('/auth/login', data);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            throw {
                message: error.response.data.message || 'Giriş işlemi başarısız oldu',
                error: error.response.data.error || error.response.data.message
            };
        }
        throw {
            message: 'Bir hata oluştu',
            error: 'Sunucu ile bağlantı kurulamadı'
        };
    }
};

export const initiateRegister = async (data: InitiateRegistrationRequest): Promise<any> => {
    try {
        console.log('Sending registration request:', data);
        const response = await axiosInstance.post('/auth/register/initiate', data);
        console.log('Registration response:', response.data);
        
        // Başarılı yanıt kontrolü
        if (response.data && !response.data.error) {
            return response.data;
        } else {
            throw new Error(response.data.error || 'Kayıt işlemi başarısız oldu');
        }
    } catch (error) {
        console.error('Registration error:', error);
        if (axios.isAxiosError(error) && error.response) {
            throw new Error(error.response.data.message || 'Kayıt işlemi başarısız oldu');
        }
        throw new Error('Sunucu ile bağlantı kurulamadı');
    }
};

export const verifyAndRegister = async (data: VerificationRequest): Promise<AuthResponse> => {
    try {
        const response = await axiosInstance.post<AuthResponse>('/auth/register/verify', data);
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            throw {
                message: error.response.data.message || 'Doğrulama işlemi başarısız oldu',
                error: error.response.data.error || error.response.data.message
            };
        }
        throw {
            message: 'Bir hata oluştu',
            error: 'Sunucu ile bağlantı kurulamadı'
        };
    }
};

export const getCurrentUser = async (): Promise<any> => {
    try {
        const response = await axiosInstance.get('/auth/me');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            throw {
                message: error.response.data.message || 'Failed to get user data',
                error: error.response.data.error || error.response.data.message
            };
        }
        throw {
            message: 'An error occurred',
            error: 'Could not connect to server'
        };
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    delete axiosInstance.defaults.headers.common['Authorization'];
};

export const getCurrentUser = async (): Promise<AuthResponse> => {
    try {
        const response = await axiosInstance.get<AuthResponse>('/auth/current-user');
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            return {
                message: error.response.data.message || 'Kullanıcı bilgileri alınamadı',
                error: error.response.data.error || error.response.data.message
            };
        }
        return {
            message: 'Bir hata oluştu',
            error: 'Sunucu ile bağlantı kurulamadı'
        };
    }
};

// Add token to requests if it exists
const token = localStorage.getItem('token');
if (token) {
    axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

export default axiosInstance;
