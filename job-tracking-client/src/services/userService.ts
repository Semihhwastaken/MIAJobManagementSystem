import { User } from '../types/task';
import axiosInstance from './axiosInstance';

const API_URL = 'http://miajobmanagementsystem-wd5a.onrender.com/api';

const userService = {
    getAllUsers: async (): Promise<User[]> => {
        try {
            const response = await axiosInstance.get(`${API_URL}/users`);
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    },

    // Belirli ID'ye sahip kullanıcıları getir
    getUsersByIds: async (userIds: string[]): Promise<User[]> => {
        try {
            const response = await axiosInstance.post(`${API_URL}/users/get-by-ids`, { userIds });
            return response.data;
        } catch (error) {
            console.error('Error fetching users by IDs:', error);
            throw error;
        }
    },

    // Kullanıcı takım ilişkileri

    // Kullanıcının sahibi olduğu takımları getir
    getOwnerTeams: async (userId: string): Promise<string[]> => {
        try {
            const response = await axiosInstance.get(`${API_URL}/users/${userId}/owner-teams`);
            return response.data;
        } catch (error) {
            console.error('Error fetching owner teams:', error);
            throw error;
        }
    },

    // Kullanıcının üye olduğu takımları getir
    getMemberTeams: async (userId: string): Promise<string[]> => {
        try {
            const response = await axiosInstance.get(`${API_URL}/users/${userId}/member-teams`);
            return response.data;
        } catch (error) {
            console.error('Error fetching member teams:', error);
            throw error;
        }
    },

    // Kullanıcının sahip olduğu takıma yeni takım ekle
    addOwnerTeam: async (userId: string, teamId: string): Promise<boolean> => {
        try {
            const response = await axiosInstance.post(`${API_URL}/users/${userId}/add-owner-team`, { teamId });
            return response.data.success;
        } catch (error) {
            console.error('Error adding owner team:', error);
            throw error;
        }
    },

    // Kullanıcının üye olduğu takımlara yeni takım ekle
    addMemberTeam: async (userId: string, teamId: string): Promise<boolean> => {
        try {
            const response = await axiosInstance.post(`${API_URL}/users/${userId}/add-member-team`, { teamId });
            return response.data.success;
        } catch (error) {
            console.error('Error adding member team:', error);
            throw error;
        }
    },

    // Kullanıcıya atanan işlerle ilgili işlemler

    // Kullanıcıya görev ata
    addToAssignedJobs: async (userId: string, taskId: string): Promise<boolean> => {
        try {
            const response = await axiosInstance.post(`${API_URL}/users/${userId}/add-assigned-job`, { taskId });
            return response.data.success;
        } catch (error) {
            console.error('Error adding assigned job:', error);
            throw error;
        }
    },

    // Kullanıcıdan görev çıkar
    removeFromAssignedJobs: async (userId: string, taskId: string): Promise<boolean> => {
        try {
            const response = await axiosInstance.post(`${API_URL}/users/${userId}/remove-assigned-job`, { taskId });
            return response.data.success;
        } catch (error) {
            console.error('Error removing assigned job:', error);
            throw error;
        }
    }
};

export default userService;
