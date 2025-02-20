import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Task, NewTask } from '../../types/task';

interface TasksState {
  items: Task[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: TasksState = {
  items: [],
  status: 'idle',
  error: null,
};

// Async thunks
export const fetchTasks = createAsyncThunk('tasks/fetchTasks', async () => {
  const response = await fetch('http://localhost:5193/api/tasks');
  const data = await response.json();
  return data;
});

export const addTask = createAsyncThunk('tasks/addTask', async (task: Task) => {
  const response = await fetch('http://localhost:5193/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });
  const data = await response.json();
  return data;
});

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async (task: Task, { rejectWithValue }) => {
    try {
      const response = await fetch(`http://localhost:5193/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Update task error:', errorData);
        return rejectWithValue(errorData || 'Görev güncellenirken bir hata oluştu');
      }

      // 204 No Content durumunda response.json() çağrılmamalı
      if (response.status === 204) {
        return task; // Mevcut task'i geri döndür
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('Update task error:', error);
      return rejectWithValue(error.message || 'Görev güncellenirken bir hata oluştu');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (taskId: string) => {
    await fetch(`http://localhost:5193/api/tasks/${taskId}`, {
      method: 'DELETE',
    });
    return taskId;
  }
);

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchTasks.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Görevler yüklenirken bir hata oluştu';
      })
      // Add task
      .addCase(addTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.items.push(action.payload);
      })
      // Update task
      .addCase(updateTask.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(updateTask.fulfilled, (state, action: PayloadAction<Task>) => {
        state.status = 'succeeded';
        const index = state.items.findIndex((task) => task.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      .addCase(updateTask.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Görev güncellenirken bir hata oluştu';
      })
      // Delete task
      .addCase(deleteTask.fulfilled, (state, action: PayloadAction<string>) => {
        state.items = state.items.filter((task) => task.id !== action.payload);
      });
  },
});

export default tasksSlice.reducer;
