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
    }
};

export default teamService;