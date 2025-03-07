import axiosInstance from './axiosInstance';
import { Team, TeamMember } from '../types/team';

const API_URL = 'http://localhost:5193/api';


const teamService = {
    // Kullanıcının sahibi olduğu tüm ekipleri getirir
    getMyTeams: async (): Promise<Team[]> => {
        try {
            const response = await axiosInstance.get<Team[]>(`${API_URL}/team/my-teams`);
            return response.data;
        } catch (error) {
            console.error('Error fetching my teams:', error);
            throw error;
        }
    },

    // Belirli bir takımın üyelerini getirir
    getTeamMembers: async (teamId: string): Promise<TeamMember[]> => {
        try {
            const response = await axiosInstance.get<TeamMember[]>(`${API_URL}/team/${teamId}/members`);
            return response.data;
        } catch (error) {
            console.error('Error fetching team members:', error);
            throw error;
        }
    },
    
    // Takım davet bağlantısı oluştur
    generateInviteLink: async (teamId: string): Promise<string> => {
        try {
            const response = await axiosInstance.post<{ inviteLink: string }>(`${API_URL}/team/${teamId}/generate-invite-link`);
            return response.data.inviteLink;
        } catch (error) {
            console.error('Error generating invite link:', error);
            throw error;
        }
    },
    
    // Davet bağlantısını getir
    getInviteLink: async (teamId: string): Promise<string> => {
        try {
            const response = await axiosInstance.get<{ inviteLink: string }>(`${API_URL}/team/${teamId}/invite-link`);
            return response.data.inviteLink;
        } catch (error) {
            console.error('Error getting invite link:', error);
            throw error;
        }
    },
    
    // Davet bağlantısını ayarla
    setInviteLink: async (teamId: string, inviteLink: string): Promise<string> => {
        try {
            const response = await axiosInstance.post<{ inviteLink: string }>(`${API_URL}/team/${teamId}/set-invite-link`, { teamId, inviteLink });
            return response.data.inviteLink;
        } catch (error) {
            console.error('Error setting invite link:', error);
            throw error;
        }
    },
    
    // Davet bağlantısını temizle
    clearInviteLink: async (teamId: string): Promise<void> => {
        try {
            await axiosInstance.post(`${API_URL}/team/${teamId}/clear-invite-link`);
        } catch (error) {
            console.error('Error clearing invite link:', error);
            throw error;
        }
    },
    
    // Davet koduyla takıma katıl
    joinTeamWithInviteCode: async (inviteCode: string): Promise<Team> => {
        try {
            const response = await axiosInstance.post<Team>(`${API_URL}/team/join-with-code/${inviteCode}`);
            return response.data;
        } catch (error) {
            console.error('Error joining team with invite code:', error);
            throw error;
        }
    },
    
    // Takım sahibi rolünü ata
    assignOwnerRole: async (teamId: string, userId: string): Promise<boolean> => {
        try {
            const response = await axiosInstance.post<{ success: boolean }>(`${API_URL}/team/${teamId}/assign-owner`, { userId });
            return response.data.success;
        } catch (error) {
            console.error('Error assigning owner role:', error);
            throw error;
        }
    },
    
    // Takımdan üye çıkar
    removeTeamMember: async (teamId: string, memberId: string): Promise<{ success: boolean, message: string }> => {
        try {
            const response = await axiosInstance.post<{ success: boolean, message: string }>(`${API_URL}/team/${teamId}/remove-member`, { memberId });
            return response.data;
        } catch (error) {
            console.error('Error removing team member:', error);
            throw error;
        }
    },
    
    // Uzmanlık alanları ekle
    addExpertise: async (memberId: string, expertise: string): Promise<Team> => {
        try {
            const response = await axiosInstance.post<Team>(`${API_URL}/team/add-expertise`, { memberId, expertise });
            return response.data;
        } catch (error) {
            console.error('Error adding expertise:', error);
            throw error;
        }
    }
};

export default teamService;