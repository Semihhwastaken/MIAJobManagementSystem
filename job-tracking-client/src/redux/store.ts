/* eslint-disable @typescript-eslint/no-explicit-any */
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import tasksReducer from './features/tasksSlice';
import teamReducer from './features/teamSlice';
import calendarReducer from './features/calendarSlice';
import authReducer from './features/authSlice';
import themeReducer from './features/themeSlice';
import { RESET_STATE } from './features/actionTypes';

// Tüm reducer'ları birleştir
const appReducer = combineReducers({
    tasks: tasksReducer,
    team: teamReducer,
    calendar: calendarReducer,
    auth: authReducer,
    theme: themeReducer
});

// Root reducer: RESET_STATE action geldiğinde tüm state'i sıfırlar
const rootReducer = (state: any, action: any) => {
    // RESET_STATE action'ı geldiğinde tüm state'i sıfırla
    if (action.type === RESET_STATE) {
        // Tema ayarlarını korumak istiyorsak:
        // const { theme } = state;
        state = undefined;
        // return appReducer(undefined, action);
    }
    
    return appReducer(state, action);
};

export const store = configureStore({
    reducer: rootReducer
});

export type RootState = ReturnType<typeof appReducer>;
export type AppDispatch = typeof store.dispatch;

export default store;
