import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';
import { User } from '../../types/task';
import { fetchMemberActiveTasks } from './teamSlice';

export interface Task {
    id?: string;
    title: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    status: 'todo' | 'in-progress' | 'completed' | 'overdue';
    category: string;
    assignedUsers: User[];
    subTasks: { id?: string; title: string; completed: boolean }[];
    dependencies: string[];
    attachments: { fileName: string; fileUrl: string; fileType: string; uploadDate: string }[];
    createdAt: string;
    updatedAt: string;
}

interface TaskState {
    items: Task[];
    loading: boolean;
    error: string | null;
}

const initialState: TaskState = {
    items: [],
    loading: false,
    error: null
};

export const fetchTasks = createAsyncThunk(
    'tasks/fetchTasks',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/Tasks');
            console.log('Fetched tasks response:', response.data);
            if (!response.data) {
                throw new Error('No data received from the server');
            }
            return response.data;
        } catch (error: any) {
            console.error('Error fetching tasks:', error);
            return rejectWithValue(error.response?.data?.message || 'Görevler yüklenirken bir hata oluştu');
        }
    }
);

export const createTask = createAsyncThunk(
    'tasks/createTask',
    async (task: Omit<Task, 'id'>, { dispatch, rejectWithValue }) => {
        try {
            const response = await axiosInstance.post('/Tasks', task);
            dispatch(fetchMemberActiveTasks());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Görev oluşturulurken bir hata oluştu');
        }
    }
);

export const updateTask = createAsyncThunk(
    'tasks/updateTask',
    async (task: Task, { dispatch, rejectWithValue }) => {
        try {
            // Ensure all required fields are present before sending
            if (!task.id) {
                return rejectWithValue('Task ID is required for updates');
            }

            const response = await axiosInstance.put(`/Tasks/${task.id}`, {
                ...task,
                // Ensure subtasks have all required fields
                subTasks: task.subTasks.map(st => ({
                    id: st.id,
                    title: st.title,
                    completed: st.completed
                }))
            });

            if (response.status === 200) {
                dispatch(fetchMemberActiveTasks());
                return response.data;
            } else {
                return rejectWithValue('Görev güncellenirken bir hata oluştu');
            }
        } catch (error: any) {
            console.error('Task update error:', error);
            return rejectWithValue(error.response?.data?.message || 'Görev güncellenirken bir hata oluştu');
        }
    }
);

export const deleteTask = createAsyncThunk(
    'tasks/deleteTask',
    async (taskId: string, { dispatch, rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/Tasks/${taskId}`);
            dispatch(fetchMemberActiveTasks());
            return taskId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete task');
        }
    }
);

export const updateTaskStatus = createAsyncThunk(
    'tasks/updateStatus',
    async ({ taskId, status }: { taskId: string; status: 'todo' | 'in-progress' | 'completed' | 'overdue' }, { dispatch }) => {
        try {
            await axiosInstance.put(`/Tasks/${taskId}/status`, JSON.stringify(status), {
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            dispatch(fetchMemberActiveTasks());
            return { taskId, status };
        } catch (error) {
            console.error('Görev durumu güncellenirken hata oluştu:', error);
            throw error;
        }
    }
);
export const fileUpload = createAsyncThunk(
    'tasks/fileUpload',
    async ({ taskId, file }: { taskId: string; file: File }, { dispatch, rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await axiosInstance.post(`/Tasks/${taskId}/file`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            dispatch(fetchMemberActiveTasks());
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to upload file');
        }
    }
);

export const downloadFile = createAsyncThunk(
    'tasks/downloadFile',
    async ({ attachmentId, fileName }: { attachmentId: string; fileName: string }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get(`/Tasks/download/${attachmentId}/${fileName}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            return { success: true };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Dosya indirilirken bir hata oluştu');
        }
    }
);

export const completeTask = createAsyncThunk(
    'tasks/completeTask',
    async (taskId: string, { dispatch, rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/Tasks/${taskId}/complete`);
            if (response.status === 200) {
                dispatch(fetchMemberActiveTasks());
                return { taskId, status: 'completed' as const };
            } else {
                return rejectWithValue(response.data?.message || 'Görev tamamlanırken bir hata oluştu');
            }
        } catch (error: any) {
            if (error.response?.status === 400) {
                return rejectWithValue(error.response.data?.message || 'Tüm alt görevler tamamlanmadan görev tamamlanamaz');
            }
            return rejectWithValue(error.response?.data?.message || 'Görev tamamlanırken bir hata oluştu');
        }
    }
);

const taskSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
            })
            .addCase(fetchTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(createTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createTask.fulfilled, (state, action) => {
                state.loading = false;
                state.items.push(action.payload);
            })
            .addCase(createTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(updateTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fileUpload.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fileUpload.fulfilled, (state, action) => {
                state.loading = false;
                const taskIndex = state.items.findIndex(task => task.id === action.payload.taskId);
                if (taskIndex !== -1) {
                    state.items[taskIndex].attachments.push(action.payload.attachment);
                }
            })
            .addCase(fileUpload.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(updateTask.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.items.findIndex(task => task.id === action.payload.id);
                if (index !== -1) {
                    state.items[index] = action.payload;
                }
            })
            .addCase(updateTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(deleteTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteTask.fulfilled, (state, action) => {
                state.loading = false;
                state.items = state.items.filter(task => task.id !== action.payload);
            })
            .addCase(deleteTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(updateTaskStatus.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateTaskStatus.fulfilled, (state, action) => {
                state.loading = false;
                const taskIndex = state.items.findIndex(t => t.id === action.payload.taskId);
                if (taskIndex !== -1) {
                    state.items[taskIndex] = {
                        ...state.items[taskIndex],
                        status: action.payload.status
                    };
                }
            })
            .addCase(updateTaskStatus.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to update task status';
            })
            .addCase(completeTask.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(completeTask.fulfilled, (state, action) => {
                state.loading = false;
                const taskIndex = state.items.findIndex(t => t.id === action.payload.taskId);
                if (taskIndex !== -1) {
                    state.items[taskIndex] = {
                        ...state.items[taskIndex],
                        status: action.payload.status
                    };
                }
            })
            .addCase(completeTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export default taskSlice.reducer;