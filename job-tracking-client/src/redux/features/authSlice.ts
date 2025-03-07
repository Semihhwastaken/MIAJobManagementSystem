import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

interface AuthState {
    token: string | null;
    user: {
        id: string;
        email: string;
        fullName: string;
        role: string;
    } | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    dataPreloaded: boolean;
}

const initialState: AuthState = {
    token: localStorage.getItem('token'),
    user: (() => {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Kullanıcı verisi ayrıştırılamadı:', error);
            localStorage.removeItem('user'); // Bozuk verileri temizle
            return null;
        }
    })(),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
    dataPreloaded: false
};

export const login = createAsyncThunk(
    'auth/login',
    async (credentials: { email: string; password: string }, { rejectWithValue }) => {
        try {
            const response = await axios.post('/api/auth/login', credentials);
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            
            return { token, user };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Giriş yapılırken bir hata oluştu');
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout: (state) => {
            state.token = null;
            state.user = null;
            state.isAuthenticated = false;
            state.dataPreloaded = false;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
        },
        setUser: (state, action) => {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
            if (action.payload) {
                localStorage.setItem('user', JSON.stringify(action.payload));
            }
        },
        setToken: (state, action) => {
            state.token = action.payload;
            state.isAuthenticated = !!action.payload;
            if (action.payload) {
                localStorage.setItem('token', action.payload);
            }
        },
        setDataPreloaded: (state, action) => {
            state.dataPreloaded = action.payload;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false;
                state.token = action.payload.token;
                state.user = action.payload.user;
                state.isAuthenticated = true;
                state.error = null;
                // Login başarılı olduğunda preload başlatılacak
                state.dataPreloaded = false;
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    }
});

export const { logout, setUser, setToken, setDataPreloaded } = authSlice.actions;
export default authSlice.reducer;
