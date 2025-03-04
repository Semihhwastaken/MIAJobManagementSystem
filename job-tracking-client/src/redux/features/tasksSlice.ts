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
    teamId?: string;
    createdAt: string;
    updatedAt: string;
    completedDate: Date;
}

interface TaskState {
    items: Task[];
    assignedTasks: Task[];
    historyItems: Task[];
    loading: boolean;
    error: string | null;
    lastFetchTime: number;
    lastHistoryFetchTime: number;
}

const initialState: TaskState = {
    items: [],
    assignedTasks: [],
    historyItems: [],
    loading: false,
    error: null,
    lastFetchTime: 0,
    lastHistoryFetchTime: 0
};

// Cache timeout in milliseconds (5 minutes)
const CACHE_TIMEOUT = 5 * 60 * 1000;

// Check if cache is valid
const isCacheValid = (lastFetchTime: number): boolean => {
    return lastFetchTime > 0 && (Date.now() - lastFetchTime < CACHE_TIMEOUT);
};

export const fetchTasks = createAsyncThunk(
    'tasks/fetchTasks',
    async (_, { getState, rejectWithValue }) => {
        try {
            const state = getState() as { tasks: TaskState };
            
            // Use cached data if valid and available
            if (state.tasks.items.length > 0 && isCacheValid(state.tasks.lastFetchTime)) {
                return state.tasks.items;
            }
            
            // Log that we're making a request
            console.log('Fetching tasks from API...');
            const response = await axiosInstance.get('/Tasks');
            
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

export const fetchAssignedTasks = createAsyncThunk(
    'tasks/fetchAssignedTasks',
    async (_, { getState, rejectWithValue }) => {
        try {
            const state = getState() as { tasks: TaskState };
            
            // Use cached data if valid and available
            if (state.tasks.assignedTasks.length > 0 && isCacheValid(state.tasks.lastFetchTime)) {
                return state.tasks.assignedTasks;
            }
            
            const response = await axiosInstance.get('/Tasks/assigned-to-me');
            
            if (!response.data) {
                throw new Error('No data received from the server');
            }
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Atanan görevler yüklenirken bir hata oluştu');
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
        const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
        const maxFileSize = 5 * 1024 * 1024; // 5 MB
        const fileExtension = file.name.split('.').pop().toLowerCase();
  
        if (file.size > maxFileSize) {
            throw new Error('Dosya boyutu izin verilen limitin üzerinde.');
        }
    
        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error('Bu dosya uzantısına izin verilmiyor.');
        }
        // 1. Dosya içeriğini ArrayBuffer'a dönüştürün.
        const arrayBuffer = await file.arrayBuffer();
  
        // 2. AES-GCM algoritması ile simetrik anahtar oluşturun.
        const key = await window.crypto.subtle.generateKey(
          {
            name: 'AES-GCM',
            length: 256, // 256-bit güvenlik seviyesi
          },
          true, // anahtar dışa aktarılabilir
          ['encrypt', 'decrypt']
        );
  
        // 3. Şifreleme için 12 byte uzunluğunda random bir initialization vector (iv) oluşturun.
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
        // 4. Dosya içeriğini şifreleyin.
        const encryptedContent = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          arrayBuffer
        );
  
        // 5. Şifreli veriyi ve iv'yi birleştirerek tek bir Blob oluşturun.
        // iv, deşifreleme sırasında ihtiyaç duyulacağından şifreli veriye eklenir.
        const encryptedBlob = new Blob(
          [new Uint8Array(iv.buffer), new Uint8Array(encryptedContent)],
          { type: file.type }
        );
  
        // 6. FormData'ya şifrelenmiş dosya ekleyin. (Dosya ismine .enc ekleyebilirsiniz.)
        const formData = new FormData();
        formData.append('file', encryptedBlob, file.name + ".enc");
  
        // 7. (Opsiyonel) Anahtarı dışa aktarın ve güvenli bir yerde saklayın.
        // Bu örnekte, JWK formatında anahtarı localStorage'a kaydediyoruz.
        const exportedKey = await window.crypto.subtle.exportKey('jwk', key);
        localStorage.setItem(`encryptionKey_${taskId}`, JSON.stringify(exportedKey));
  
        // 8. Şifrelenmiş dosyayı backend'e gönderin.
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
    async (
      { taskId, attachmentId, fileName }: { taskId: string; attachmentId: string; fileName: string },
      { rejectWithValue }
    ) => {
      try {
        // 1. Şifrelenmiş dosyayı blob olarak indiriyoruz.
        const response = await axiosInstance.get(
          `/Tasks/download/${attachmentId}/${fileName}`,
          { responseType: 'blob' }
        );
        
        // Remove debug console logs
        // 2. Blob'u ArrayBuffer'a dönüştürüyoruz.
        const blobArrayBuffer = await response.data.arrayBuffer();
        
        // Kontrol: Dosya boyutunun IV (12 byte) ve şifreli veriyi kapsadığından emin olun.
        if (blobArrayBuffer.byteLength <= 12) {
          throw new Error('İndirilen dosya boyutu beklenenden küçük.');
        }
  
        // 3. İlk 12 byte'ı IV olarak alıyoruz.
        const iv = new Uint8Array(blobArrayBuffer.slice(0, 12));
        
        // 4. Geri kalan kısmı şifreli içerik olarak alıyoruz.
        const encryptedContent = blobArrayBuffer.slice(12);
        
        // 5. Daha önce upload sırasında localStorage'a kaydedilen JWK formatındaki anahtarı alıyoruz.
        const storedKey = localStorage.getItem(`encryptionKey_${taskId}`);
        if (!storedKey) {
          throw new Error('Bu task için şifreleme anahtarı bulunamadı.');
        }
        const jwkKey = JSON.parse(storedKey);
        
        // 6. AES-GCM için anahtarı import ediyoruz.
        const key = await window.crypto.subtle.importKey(
          "jwk",
          jwkKey,
          { name: "AES-GCM" },
          true,
          ["decrypt"]
        );
  
        // 7. Şifrelenmiş veriyi deşifre ediyoruz.
        const decryptedBuffer = await window.crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          key,
          encryptedContent
        );
        
        // 8. Deşifre edilmiş veriden yeni bir Blob oluşturup indirme linki oluşturuyoruz.
        const decryptedBlob = new Blob([new Uint8Array(decryptedBuffer)], { type: response.data.type });
        const url = window.URL.createObjectURL(decryptedBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName.replace(/\.enc$/, ''));
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        
        return { success: true };
      } catch (error: any) {
        console.error('Download error detail:', error);
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
                // Fetch member active tasks to update the performance scores
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

export const fetchTaskHistory = createAsyncThunk(
    'tasks/fetchTaskHistory',
    async (_, { getState, rejectWithValue }) => {
        try {
            const state = getState() as { tasks: TaskState };
            
            // Use cached data if valid and available
            if (state.tasks.historyItems.length > 0 && isCacheValid(state.tasks.lastHistoryFetchTime)) {
                return state.tasks.historyItems;
            }
            
            console.log('Fetching task history from API...');
            const response = await axiosInstance.get('/Tasks/history');
            
            if (!response.data) {
                throw new Error('No history data received from the server');
            }
            return response.data;
        } catch (error: any) {
            console.error('Error fetching task history:', error);
            return rejectWithValue(error.response?.data?.message || 'Görev geçmişi yüklenirken bir hata oluştu');
        }
    }
);

const taskSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        invalidateTasksCache: (state) => {
            state.lastFetchTime = 0;
        },
        invalidateHistoryCache: (state) => {
            state.lastHistoryFetchTime = 0;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
                state.lastFetchTime = Date.now();
            })
            .addCase(fetchTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchAssignedTasks.pending, (state) => {
                if (state.assignedTasks.length === 0) {
                    state.loading = true;
                }
                state.error = null;
            })
            .addCase(fetchAssignedTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.assignedTasks = action.payload;
                // Don't update lastFetchTime as it's for all tasks
            })
            .addCase(fetchAssignedTasks.rejected, (state, action) => {
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
                // Also update assigned tasks if it belongs to current user
                if (action.payload.assignedUsers?.some(u => u.id === (action.meta as any).userId)) {
                    state.assignedTasks.push(action.payload);
                }
                // Reset lastFetchTime to force refresh on next fetch
                state.lastFetchTime = 0;
                // Reset history cache
                state.lastHistoryFetchTime = 0;
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
                
                // Also update in assignedTasks if present
                const assignedIndex = state.assignedTasks.findIndex(task => task.id === action.payload.id);
                if (assignedIndex !== -1) {
                    state.assignedTasks[assignedIndex] = action.payload;
                }
                
                // Reset lastFetchTime to force refresh on next fetch
                state.lastFetchTime = 0;
                // Reset history cache
                state.lastHistoryFetchTime = 0;
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
                state.assignedTasks = state.assignedTasks.filter(task => task.id !== action.payload);
                // Reset lastFetchTime to force refresh on next fetch
                state.lastFetchTime = 0;
                // Reset history cache
                state.lastHistoryFetchTime = 0;
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
                // Reset history cache
                state.lastHistoryFetchTime = 0;
            })
            .addCase(completeTask.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchTaskHistory.pending, (state) => {
                if (state.historyItems.length === 0) {
                    state.loading = true;
                }
                state.error = null;
            })
            .addCase(fetchTaskHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.historyItems = action.payload;
                state.lastHistoryFetchTime = Date.now();
            })
            .addCase(fetchTaskHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export const { invalidateTasksCache, invalidateHistoryCache } = taskSlice.actions;
export default taskSlice.reducer;