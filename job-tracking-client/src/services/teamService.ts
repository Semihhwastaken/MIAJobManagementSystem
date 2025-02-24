import axios from 'axios';
import { Team, TeamMember } from '../types/team';

const API_URL = 'http://localhost:5193/api';

// Axios instance oluştur
const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Request interceptor ekle
axiosInstance.interceptors.request.use(
    (config) => {
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

const teamService = {
    // Kullanıcının sahibi olduğu tüm ekipleri getirir
    getMyTeams: async (): Promise<Team[]> => {
        try {
            const response = await axiosInstance.get<Team[]>('/team/my-teams');
            return response.data;
        } catch (error) {
            console.error('Error fetching my teams:', error);
            throw error;
        }
    },

    // Belirli bir takımın üyelerini getirir
    getTeamMembers: async (teamId: string): Promise<TeamMember[]> => {
        try {
            const response = await axiosInstance.get<TeamMember[]>(`/team/${teamId}/members`);
            return response.data;
        } catch (error) {
            console.error('Error fetching team members:', error);
            throw error;
        }
    }
};

export default teamService;
