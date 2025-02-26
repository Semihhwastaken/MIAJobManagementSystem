import axiosInstance from './axiosInstance';

export interface TaskItem {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    dueDate: Date;
    assignedUsers: Array<{
        id: string;
        username: string;
        role: string;
    }>;
    subTasks: Array<{
        id: string;
        title: string;
        completed: boolean;
    }>;
    dependencies: string[];
    attachments: Array<{
        id: string;
        fileName: string;
        fileUrl: string;
    }>;
}

const taskService = {
    getAllTasks: async (): Promise<TaskItem[]> => {
        const response = await axiosInstance.get('/tasks');
        return response.data;
    },

    getMyTasks: async (): Promise<TaskItem[]> => {
        const response = await axiosInstance.get('/tasks/my-tasks');
        return response.data;
    },

    createTask: async (task: Partial<TaskItem>): Promise<TaskItem> => {
        const response = await axiosInstance.post('/tasks', task);
        return response.data;
    },

    updateTask: async (id: string, task: Partial<TaskItem>): Promise<TaskItem> => {
        const response = await axiosInstance.put(`/tasks/${id}`, task);
        return response.data;
    },

    deleteTask: async (id: string): Promise<void> => {
        await axiosInstance.delete(`/tasks/${id}`);
    },

    async checkOverdueTasks() {
        try {
            const response = await axiosInstance.post('Tasks/check-overdue');
            return response.data;
        } catch (error) {
            console.error('Overdue kontrolü sırasında hata:', error);
            throw error;
        }
    },

    async getOverdueCheckStatus() {
        try {
            const response = await axiosInstance.get('Tasks/overdue-check-status');
            return response.data;
        } catch (error) {
            console.error('Overdue durum kontrolü sırasında hata:', error);
            throw error;
        }
    }
};

export default taskService;