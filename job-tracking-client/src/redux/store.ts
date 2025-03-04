import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './features/tasksSlice';
import teamReducer from './features/teamSlice';
import calendarReducer from './features/calendarSlice';
import authReducer from './features/authSlice';
import themeReducer from './features/themeSlice';
import userCacheReducer from './features/userCacheSlice';

export const store = configureStore({
    reducer: {
        tasks: tasksReducer,
        team: teamReducer,
        calendar: calendarReducer,
        auth: authReducer,
        theme: themeReducer,
        userCache: userCacheReducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
