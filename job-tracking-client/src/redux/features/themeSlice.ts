import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RESET_STATE } from './actionTypes';

interface ThemeState {
    isDarkMode: boolean;
}

const initialState: ThemeState = {
    isDarkMode: false,
};

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme: (state) => {
            state.isDarkMode = !state.isDarkMode;
        },
        setTheme: (state, action: PayloadAction<boolean>) => {
            state.isDarkMode = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            // Global reset state action
            .addCase(RESET_STATE, () => {
                return initialState;
            });
    }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
