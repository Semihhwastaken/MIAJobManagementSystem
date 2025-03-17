/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';
import { User } from '../../types/task';
import { fetchMemberActiveTasks } from './teamSlice';
import { RESET_STATE } from './actionTypes';
import axios from 'axios';

export interface Task {
    id?: string;
    title: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    status: 'todo' | 'in-progress' | 'completed' | 'overdue';
    category: string;
    assignedUsers: User[];
    assignedUserIds: string[];
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
const USER_TASKS_CACHE_DURATION = 15 * 60 * 1000; // 15 dakika

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

// Cache kontrolü için yardımcı fonksiyon
const isCacheValid = (lastFetch: number, duration: number) => {
    return Date.now() - lastFetch < duration;
};

export const fetchTasks = createAsyncThunk(
    'tasks/fetchTasks',
    async (_, { getState, rejectWithValue }) => {
        try {
            console.log('Fetching tasks from server (bypassing cache)');
            const response = await axiosInstance.get('/Tasks');
            
            if (!response.data) {
                throw new Error('No data received from the server');
            }
            
            console.log(`Received ${response.data.length} tasks from server`);
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
    async (task: Omit<Task, 'id'>, { dispatch, rejectWithValue }) => {
        try {
            // Make sure assignedUserIds is properly set from assignedUsers
            if (task.assignedUsers && task.assignedUsers.length > 0) {
                task.assignedUserIds = task.assignedUsers
                    .filter(user => user && user.id)  // Filter out any users without valid IDs
                    .map(user => user.id as string);  // Convert user IDs to an array of strings
            } else {
                task.assignedUserIds = [];  // Ensure it's an empty array, not undefined
            }
            
            // Format the due date properly to ensure UTC ISO format
            const dueDate = task.dueDate ? new Date(task.dueDate) : new Date();
            
            // Process subtasks to omit id field for new subtasks (don't use empty strings for ids)
            const processedSubTasks = (task.subTasks || []).map(st => {
                // If the subtask has a valid MongoDB ObjectId (24 hex chars), keep it
                // Otherwise, omit the id field so MongoDB will generate it
                if (st.id && /^[0-9a-fA-F]{24}$/.test(st.id)) {
                    return {
                        id: st.id,
                        title: st.title || '',
                        completed: Boolean(st.completed)
                    };
                } else {
                    // Return subtask without id field for new subtasks
                    return {
                        title: st.title || '',
                        completed: Boolean(st.completed)
                    };
                }
            });
            
            // Make sure all required fields are present with proper defaults
            const taskToSend = {
                Id: '', // Add empty Id field to satisfy the server's validation
                title: task.title || '',
                description: task.description || '',
                status: task.status || 'todo',
                priority: task.priority || 'medium',
                category: task.category || 'Bug',
                teamId: task.teamId || '', // Ensure teamId is not undefined
                dueDate: dueDate.toISOString(),
                createdAt: task.createdAt || new Date().toISOString(),
                updatedAt: task.updatedAt || new Date().toISOString(),
                subTasks: processedSubTasks,
                dependencies: task.dependencies || [],
                attachments: task.attachments || [],
                assignedUserIds: task.assignedUserIds || [],
                assignedUsers: (task.assignedUsers || []).map(user => ({
                    id: user.id || '',
                    username: user.username || '',
                    email: user.email || '',
                    fullName: user.fullName || '',
                    department: user.department || '',
                    title: user.title || '',
                    position: user.position || '',
                    profileImage: user.profileImage || ''
                }))
            };
            
            console.log('Creating task with payload:', JSON.stringify(taskToSend, null, 2));
            
            // Send the prepared taskToSend object to the API using axiosInstance
            const response = await axiosInstance.post('/Tasks', taskToSend);
            
            if (!response.data || !response.data.id) {
                console.error('Invalid response from server:', response);
                return rejectWithValue('Server returned invalid task data');
            }
            
            // Log success details for debugging
            console.log('Task created successfully with response:', response.data);
            
            // Make sure we invalidate all relevant caches after task creation
            // Immediately force refresh member tasks to update UI
            dispatch(fetchMemberActiveTasks());
            
            // If the task is assigned to specific users, ensure their data is refreshed
            if (task.assignedUserIds && task.assignedUserIds.length > 0) {
                task.assignedUserIds.forEach(userId => {
                    dispatch(invalidateUserTasksCache(userId));
                });
            }
            
            // Return the newly created task from the API
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

            // Process subtasks to handle ID field properly for MongoDB
            const processedSubTasks = (task.subTasks || []).map(st => {
                // For existing subtasks with valid MongoDB ObjectId
                if (st.id && /^[0-9a-fA-F]{24}$/.test(st.id)) {
                    return {
                        id: st.id,
                        title: st.title || '',
                        completed: Boolean(st.completed)
                    };
                } 
                // For new subtasks without ID or with invalid ID
                else {
                    return {
                        title: st.title || '',
                        completed: Boolean(st.completed)
                    };
                }
            });

            const response = await axiosInstance.put(`/Tasks/${task.id}`, {
                ...task,
                subTasks: processedSubTasks
            });

            if (response.status === 200) {
                dispatch(fetchMemberActiveTasks());
                return response.data;
            } else {
                return rejectWithValue('Görev güncellenirken bir hata oluştu');
            }
        } catch (error: any) {
            console.error('Task update error:', error);
            
            if (error.response) {
                console.log('Error response data:', error.response.data);
                console.log('Error response status:', error.response.status);
                console.log('Error response headers:', error.response.headers);
            }
            
            return rejectWithValue(error.response?.data?.message || 'Görev güncellenirken bir hata oluştu');
        }
    }
);

export const deleteTask = createAsyncThunk(
    'tasks/deleteTask',
    async (taskId: string, { dispatch, rejectWithValue, getState }) => {
        try {
            // Silmeden önce state'deki görev için yerel bir kopyayı sakla
            const state = getState() as { tasks: TaskState };
            const taskToDelete = state.tasks.items.find(task => task.id === taskId);

            if (!taskToDelete) {
                throw new Error('Silinecek görev bulunamadı');
            }

            // API'ye silme isteği gönder
            await axiosInstance.delete(`/Tasks/${taskId}`);
            
            // Görev silindikten sonra diğer verilerle ilgili state'leri güncelle
            dispatch(fetchMemberActiveTasks());
            
            // Tüm ekip üyeleri ve atanmış kullanıcılar için görev bilgilerini güncellemek önemli
            if (taskToDelete.teamId) {
                // Takım bilgilerini güncelle (görev sahibi takım bilgilerinde gözükmemeli)
                // İlgili diğer dispatch'ler buraya eklenebilir
            }
            
            // Silinen görev ID'sini döndür
            return taskId;
        } catch (error: any) {
            console.error('Görev silme hatası:', error);
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
  
        // 7. Anahtarı dışa aktarın ve güvenli bir şekilde saklayın.
        // JWK formatında anahtarı hem taskId hem de dosya adıyla ilişkilendirerek localStorage'a kaydedelim
        const exportedKey = await window.crypto.subtle.exportKey('jwk', key);
        const keyData = JSON.stringify(exportedKey);
        
        // Hem taskId hem de dosya adıyla anahtarı kaydedelim (daha spesifik bir anahtar)
        localStorage.setItem(`encryptionKey_${taskId}`, keyData);
        localStorage.setItem(`encryptionKey_${taskId}_${file.name}`, keyData);
  
        // 8. Şifrelenmiş dosyayı backend'e gönderin.
        const response = await axiosInstance.post(`/Tasks/${taskId}/file`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        
        // 9. Eğer sunucu bir attachmentId döndürdüyse, o ID ile de anahtarı ilişkilendir
        if (response.data && response.data.attachment && response.data.attachment.id) {
          localStorage.setItem(`encryptionKey_attachment_${response.data.attachment.id}`, keyData);
        }
  
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
    
    // 5. Farklı yöntemlerle saklanan şifreleme anahtarını bulmaya çalışalım
    let storedKey = null;
    
    // Önce attachmentId ile ilişkilendirilmiş anahtarı arayalım (en spesifik)
    storedKey = localStorage.getItem(`encryptionKey_attachment_${attachmentId}`);
    
    // Bulunamadıysa, taskId ve dosya adı kombinasyonunu deneyelim
    if (!storedKey) {
      storedKey = localStorage.getItem(`encryptionKey_${taskId}_${fileName.replace(/\.enc$/, '')}`);
    }
    
    // Yine bulunamadıysa, yalnızca taskId ile ilişkilendirilmiş anahtarı deneyelim (en genel)
    if (!storedKey) {
      storedKey = localStorage.getItem(`encryptionKey_${taskId}`);
    }
    
    // Şifreleme anahtarı bulunamadıysa, şifrelenmemiş dosyayı indirme seçeneği sunuyoruz
    if (!storedKey) {
      console.warn("Şifreleme anahtarı bulunamadı. Şifrelenmemiş dosya indirilecek.");
      
      // Kullanıcıya şifrelenmemiş dosyayı indirme seçeneği sunuyoruz
      const blob = new Blob([new Uint8Array(blobArrayBuffer)], { type: response.data.type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName.replace(/\.enc$/, ''));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, encrypted: false };
    }
    
    // Anahtar bulunduysa şifre çözme işlemine devam ediyoruz
    const jwkKey = JSON.parse(storedKey);
    
    // 6. AES-GCM için anahtarı import ediyoruz.
    const key = await window.crypto.subtle.importKey(
      "jwk",
      jwkKey,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );

    try {
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
      
      return { success: true, encrypted: true };
    } catch (decryptError) {
      // Şifre çözme başarısız olursa, kullanıcıya şifrelenmemiş dosyayı indirme seçeneği sun
      console.warn("Şifre çözme başarısız oldu, şifrelenmemiş dosya indirilecek:", decryptError);
      
      const blob = new Blob([new Uint8Array(blobArrayBuffer)], { type: response.data.type });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName.replace(/\.enc$/, ''));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true, encrypted: false };
    }
  } catch (error: any) {
    console.error('Download error detail:', error);
    return rejectWithValue(error.message || 'Dosya indirilirken bir hata oluştu');
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
        console.log('Tasks cache cleared');
    },
    invalidateUserTasksCache: (state, action) => {
        const userId = action.payload;
        state.lastUserTasksFetch[userId] = 0;
    },
    // Yerel olarak bir görevi silmek için reducer (UI anında güncelleme amaçlı)
    removeTaskLocally: (state, action) => {
        const taskId = action.payload;
        state.items = state.items.filter(task => task.id !== taskId);
        if (taskId in state.cachedTasks) {
            delete state.cachedTasks[taskId];
        }
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
            state.cachedTasks = {};  // Önce cache'i temizle
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
            
            // Yeni görevi items'a ekle
            if (action.payload) {
                state.items.push(action.payload);
                
                // Cache'i güncelle
                if (action.payload.id) {
                    state.cachedTasks[action.payload.id] = action.payload;
                }
            }
            
            // Cache'in bir sonraki fetchTasks çağrısında yenilenmesi için lastFetch'i sıfırla
            state.lastFetch = null;
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
            
            // Dosya yükleme sonrası ilgili task'ı güncelle
            const taskIndex = state.items.findIndex(task => task.id === action.payload.taskId);
            if (taskIndex !== -1) {
                // Attachment'ı güncelle
                state.items[taskIndex].attachments = [
                    ...state.items[taskIndex].attachments || [],
                    action.payload.attachment
                ];
                
                // Cache'i de güncelle
                if (state.items[taskIndex].id) {
                    state.cachedTasks[state.items[taskIndex].id!] = state.items[taskIndex];
                }
            }
            
            // Cache'in bir sonraki fetchTasks çağrısında yenilenmesi için lastFetch'i sıfırla
            state.lastFetch = null;
        })
        .addCase(fileUpload.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        })
        .addCase(updateTask.fulfilled, (state, action) => {
            state.loading = false;
            
            // Güncellenen task'ı state'de bul ve güncelle
            const index = state.items.findIndex(task => task.id === action.payload.id);
            if (index !== -1) {
                state.items[index] = action.payload;
                
                // Cache'i güncelle
                if (action.payload.id) {
                    state.cachedTasks[action.payload.id] = action.payload;
                }
            }
            
            // Cache'in bir sonraki fetchTasks çağrısında yenilenmesi için lastFetch'i sıfırla
            state.lastFetch = null;
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
            
            // Silinen görevi items listesinden çıkar
            const taskId = action.payload;
            state.items = state.items.filter(task => task.id !== taskId);
            
            // Önbellekten de temizle
            if (taskId) {
                delete state.cachedTasks[taskId];
            }
            
            // Cache'in bir sonraki fetchTasks çağrısında yenilenmesi için lastFetch'i sıfırla
            state.lastFetch = null;
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
            
            // Durumu güncellenen task'ı bul ve güncelle
            const taskIndex = state.items.findIndex(t => t.id === action.payload.taskId);
            if (taskIndex !== -1) {
                state.items[taskIndex] = {
                    ...state.items[taskIndex],
                    status: action.payload.status
                };
                
                // Cache'i güncelle
                if (state.items[taskIndex].id) {
                    state.cachedTasks[state.items[taskIndex].id!] = state.items[taskIndex];
                }
            }
            
            // Cache'in bir sonraki fetchTasks çağrısında yenilenmesi için lastFetch'i sıfırla
            state.lastFetch = null;
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
            
            // Tamamlanan görevi güncelle
            const taskIndex = state.items.findIndex(t => t.id === action.payload.taskId);
            if (taskIndex !== -1) {
                state.items[taskIndex] = {
                    ...state.items[taskIndex],
                    status: action.payload.status
                };
                
                // Cache'i güncelle
                if (state.items[taskIndex].id) {
                    state.cachedTasks[state.items[taskIndex].id!] = state.items[taskIndex];
                }
            }
            
            // Cache'in bir sonraki fetchTasks çağrısında yenilenmesi için lastFetch'i sıfırla
            state.lastFetch = null;
        })
        .addCase(completeTask.rejected, (state, action) => {
            state.loading = false;
            state.error = action.payload as string;
        });
}
});

export const { clearTaskCache, clearHistoryCache, clearTasksCache, invalidateUserTasksCache, removeTaskLocally } = taskSlice.actions;
export default taskSlice.reducer;