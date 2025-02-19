import { configureStore } from '@reduxjs/toolkit';
import tasksReducer from './features/tasksSlice';
import teamReducer from './features/teamSlice';

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    team: teamReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
