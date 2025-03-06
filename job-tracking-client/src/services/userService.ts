import { User } from '../types/task';
import axiosInstance from './axiosInstance';

const API_URL = 'http://localhost:5193/api';

const userService = {
    getAllUsers: async (): Promise<User[]> => {
        try {
            const response = await axiosInstance.get(`${API_URL}/users`);
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }
};

export default userService;
