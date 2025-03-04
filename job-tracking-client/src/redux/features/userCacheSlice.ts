import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axiosInstance from '../../services/axiosInstance';
import { User } from '../../types/user';
import { Team } from '../../types/team';
import { Task } from '../../types/task';

// Cache timeout in milliseconds (5 minutes)
const CACHE_EXPIRY = 5 * 60 * 1000;

interface CacheTimestamps {
  user: number;
  teams: number;
  tasks: number;
}

interface UserCacheState {
  currentUser: User | null;
  userTeams: Team[];
  userTasks: Task[];
  lastCacheUpdate: CacheTimestamps;
  loading: {
    user: boolean;
    teams: boolean;
    tasks: boolean;
  };
  error: {
    user: string | null;
    teams: string | null;
    tasks: string | null;
  };
}

const initialState: UserCacheState = {
  currentUser: null,
  userTeams: [],
  userTasks: [],
  lastCacheUpdate: {
    user: 0,
    teams: 0,
    tasks: 0
  },
  loading: {
    user: false,
    teams: false,
    tasks: false
  },
  error: {
    user: null,
    teams: null,
    tasks: null
  }
};

// Helper to check if cache is valid
const isCacheValid = (timestamp: number): boolean => {
  return timestamp > 0 && (Date.now() - timestamp) < CACHE_EXPIRY;
};

// Async thunks for fetching data
export const fetchCurrentUser = createAsyncThunk(
  'userCache/fetchCurrentUser',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { userCache: UserCacheState };
    
    // Use cached data if valid
    if (state.userCache.currentUser && isCacheValid(state.userCache.lastCacheUpdate.user)) {
      return state.userCache.currentUser;
    }

    try {
      const response = await axiosInstance.get('/Users/profile');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user data');
    }
  }
);

export const fetchUserTeams = createAsyncThunk(
  'userCache/fetchUserTeams',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { userCache: UserCacheState };
    
    // Use cached data if valid
    if (state.userCache.userTeams.length > 0 && isCacheValid(state.userCache.lastCacheUpdate.teams)) {
      return state.userCache.userTeams;
    }

    try {
      const response = await axiosInstance.get('/team');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user teams');
    }
  }
);

export const fetchUserTasks = createAsyncThunk(
  'userCache/fetchUserTasks',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as { userCache: UserCacheState };
    
    // Use cached data if valid
    if (state.userCache.userTasks.length > 0 && isCacheValid(state.userCache.lastCacheUpdate.tasks)) {
      return state.userCache.userTasks;
    }

    try {
      const response = await axiosInstance.get('/tasks/assigned-to-me');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user tasks');
    }
  }
);

// Action to force refresh the cache
export const invalidateCache = createAsyncThunk(
  'userCache/invalidateCache',
  async (cacheType: 'user' | 'teams' | 'tasks' | 'all', { dispatch }) => {
    if (cacheType === 'user' || cacheType === 'all') {
      dispatch(fetchCurrentUser());
    }
    if (cacheType === 'teams' || cacheType === 'all') {
      dispatch(fetchUserTeams());
    }
    if (cacheType === 'tasks' || cacheType === 'all') {
      dispatch(fetchUserTasks());
    }
    return cacheType;
  }
);

const userCacheSlice = createSlice({
  name: 'userCache',
  initialState,
  reducers: {
    clearCache: (state) => {
      state.currentUser = null;
      state.userTeams = [];
      state.userTasks = [];
      state.lastCacheUpdate = {
        user: 0,
        teams: 0,
        tasks: 0
      };
    },
    updateCacheTimestamp: (state, action: PayloadAction<'user' | 'teams' | 'tasks'>) => {
      state.lastCacheUpdate[action.payload] = Date.now();
    }
  },
  extraReducers: (builder) => {
    // Current user actions
    builder.addCase(fetchCurrentUser.pending, (state) => {
      state.loading.user = true;
      state.error.user = null;
    });
    builder.addCase(fetchCurrentUser.fulfilled, (state, action) => {
      state.currentUser = action.payload;
      state.lastCacheUpdate.user = Date.now();
      state.loading.user = false;
    });
    builder.addCase(fetchCurrentUser.rejected, (state, action) => {
      state.loading.user = false;
      state.error.user = action.payload as string;
    });

    // User teams actions
    builder.addCase(fetchUserTeams.pending, (state) => {
      state.loading.teams = true;
      state.error.teams = null;
    });
    builder.addCase(fetchUserTeams.fulfilled, (state, action) => {
      state.userTeams = action.payload;
      state.lastCacheUpdate.teams = Date.now();
      state.loading.teams = false;
    });
    builder.addCase(fetchUserTeams.rejected, (state, action) => {
      state.loading.teams = false;
      state.error.teams = action.payload as string;
    });

    // User tasks actions
    builder.addCase(fetchUserTasks.pending, (state) => {
      state.loading.tasks = true;
      state.error.tasks = null;
    });
    builder.addCase(fetchUserTasks.fulfilled, (state, action) => {
      state.userTasks = action.payload;
      state.lastCacheUpdate.tasks = Date.now();
      state.loading.tasks = false;
    });
    builder.addCase(fetchUserTasks.rejected, (state, action) => {
      state.loading.tasks = false;
      state.error.tasks = action.payload as string;
    });
  }
});

export const { clearCache, updateCacheTimestamp } = userCacheSlice.actions;
export default userCacheSlice.reducer;
