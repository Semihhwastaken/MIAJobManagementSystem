/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';
import { Task } from '../../types/task';
import { fetchMemberActiveTasks } from './teamSlice';
import { RESET_STATE } from './actionTypes';

interface TaskState {
    items: Task[];
    loading: boolean;
    error: string | null;
    lastFetch: number | null;
    cachedTasks: { [key: string]: Task };
    taskHistory: Task[];
    lastHistoryFetch: number | null;
    lastUserTasksFetch: { [userId: string]: number };
}

// Cache süreleri
const ACTIVE_TASKS_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika
const COMPLETED_TASKS_CACHE_DURATION = 30 * 60 * 1000; // 30 dakika


const initialState: TaskState = {
    items: [],
    loading: false,
    error: null,
    lastFetch: null,
    cachedTasks: {},
    taskHistory: [],
    lastHistoryFetch: null,
    lastUserTasksFetch: {}
};

export const fetchTasks = createAsyncThunk(
    'tasks/fetchTasks',
    async (_, { getState, rejectWithValue }) => {
        const state = getState() as { tasks: TaskState };
        const now = Date.now();

        // Cache kontrolü
        if (state.tasks.lastFetch && (now - state.tasks.lastFetch < ACTIVE_TASKS_CACHE_DURATION)) {
            return state.tasks.items;
        }

        try {
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

export const fetchTaskHistory = createAsyncThunk(
    'tasks/fetchHistory',
    async (_, { getState, rejectWithValue }) => {
        const state = getState() as { tasks: TaskState };
        const now = Date.now();

        // Cache kontrolü
        if (state.tasks.lastHistoryFetch && (now - state.tasks.lastHistoryFetch < COMPLETED_TASKS_CACHE_DURATION)) {
            return state.tasks.taskHistory;
        }

        try {
            const response = await axiosInstance.get('/Tasks/history');
            if (!response.data) {
                throw new Error('Sunucudan veri alınamadı');
            }
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Görev geçmişi yüklenirken bir hata oluştu');
        }
    }
);

export const createTask = createAsyncThunk(
    'tasks/createTask',
    async (task: Omit<Task, 'id'>, { rejectWithValue }) => {
        try {
            const dueDate = task.dueDate ? new Date(task.dueDate) : new Date();
            
            // Process subtasks - don't include IDs for new subtasks
            const processedSubTasks = (task.subTasks || []).map(st => ({
                title: st.title,
                completed: false,
                completedDate: null,
                AssignedUserId: null
            }));

            // Process assigned users and their IDs
            const assignedUserIds = task.assignedUsers
                ?.filter(user => user && user.id)
                .map(user => user.id as string) || [];

            const taskToSend = {
                // Remove id from payload for new tasks
                title: task.title || '',
                description: task.description || '',
                status: task.status || 'todo',
                priority: task.priority || 'medium',
                category: task.category || 'Bug',
                teamId: task.teamId || '',
                dueDate: dueDate.toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                subTasks: processedSubTasks,
                dependencies: task.dependencies || [],
                attachments: task.attachments || [],
                assignedUserIds: assignedUserIds,
                assignedUsers: task.assignedUsers?.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    fullName: user.fullName || '',
                    department: user.department || '',
                    title: user.title || '',
                    position: user.position || '',
                    profileImage: user.profileImage || ''
                })) || [],
                completedDate: null,
                isLocked: false
            };
            
            const response = await axiosInstance.post('/Tasks', taskToSend);
            return response.data;
        } catch (error: any) {
            // Enhanced error logging to better understand validation issues
            console.error('Error creating task:', error);
            
            if (error.response) {
                console.log('Error response data:', error.response.data);
                console.log('Error response status:', error.response.status);
                console.log('Error response headers:', error.response.headers);
                
                // If there are validation errors, log them specifically
                if (error.response.data.errors) {
                    console.log('Validation errors:', error.response.data.errors);
                }
            }
            
            return rejectWithValue(error.response?.data?.title || error.message || 'An error occurred while creating the task');
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

            // AssignedUserIds'i AssignedUsers'dan güncelle
            if (task.assignedUsers && task.assignedUsers.length > 0) {
                task.assignedUserIds = task.assignedUsers.map(user => user.id).filter(Boolean) as string[];
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
        const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'docx'];
        const maxFileSize = 5 * 1024 * 1024; // 5 MB
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
  
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
    async (taskId: string, { dispatch, getState, rejectWithValue }) => {
        try {
            // Get current task state
            const state = getState() as { tasks: { items: Task[] } };
            const task = state.tasks.items.find(t => t.id === taskId);

            // Check if task exists and is not already completed
            if (!task) {
                return rejectWithValue('Task not found');
            }

            if (task.status === 'completed') {
                return rejectWithValue('Task is already completed');
            }

            // Only proceed if task is not completed
            const response = await axiosInstance.post(`/Tasks/${taskId}/complete`);
            
            if (response.status === 200) {
                // Update member active tasks in a separate async operation
                dispatch(fetchMemberActiveTasks());
                
                return { 
                    taskId, 
                    status: 'completed' as const,
                    ...response.data 
                };
            }
            
            return rejectWithValue('Failed to complete task');
        } catch (error: any) {
            if (error.response?.status === 400) {
                return rejectWithValue(error.response.data?.message || 'All subtasks must be completed before completing the task');
            }
            return rejectWithValue(error.response?.data?.message || 'Failed to complete task');
        }
    }
);

const taskSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        clearTaskCache: (state) => {
            state.lastFetch = null;
            state.cachedTasks = {};
        },
        clearHistoryCache: (state) => {
            state.lastHistoryFetch = null;
            state.taskHistory = [];
        },
        clearTasksCache: (state) => {
            state.lastFetch = null;
            state.cachedTasks = {};
        },
        invalidateUserTasksCache: (state, action) => {
            const userId = action.payload;
            state.lastUserTasksFetch[userId] = 0;
        }
    },
    extraReducers: (builder) => {
        builder
            // Global reset state action
            .addCase(RESET_STATE, () => {
                return initialState;
            })
            .addCase(fetchTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.items = action.payload;
                state.lastFetch = Date.now();
                
                // Tekil görevleri cache'le
                action.payload.forEach((task: Task) => {
                    if (task.id) {
                        state.cachedTasks[task.id] = task;
                    }
                });
            })
            .addCase(fetchTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchTaskHistory.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTaskHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.taskHistory = action.payload;
                state.lastHistoryFetch = Date.now();
                state.error = null;
            })
            .addCase(fetchTaskHistory.rejected, (state, action) => {
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
                if (action.payload.id) {
                    state.cachedTasks[action.payload.id] = action.payload;
                }
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
                    if (action.payload.id) {
                        state.cachedTasks[action.payload.id] = action.payload;
                    }
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
                if (action.payload) {
                    delete state.cachedTasks[action.payload];
                }
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

export const { clearTaskCache, clearHistoryCache, clearTasksCache, invalidateUserTasksCache } = taskSlice.actions;
export default taskSlice.reducer;