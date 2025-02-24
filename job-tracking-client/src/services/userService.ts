import { User } from '../types/task';
import axios from 'axios';

const API_URL = 'http://localhost:5193/api';

const userService = {
    getAllUsers: async (): Promise<User[]> => {
        try {
            const response = await axios.get(`${API_URL}/users`);
            return response.data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }
};

export default userService;
