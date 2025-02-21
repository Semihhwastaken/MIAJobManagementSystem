import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './features/tasksSlice';
import teamReducer from './features/teamSlice';
import calendarReducer from './features/calendarSlice';
import authReducer from './features/authSlice';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    team: teamReducer,
    calendar: calendarReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
