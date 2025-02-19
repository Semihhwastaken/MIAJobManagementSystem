import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { TeamState, TeamMember } from '../../types/team';

const initialState: TeamState = {
    members: [],
    departments: [],
    loading: false,
    error: null,
};

export const fetchTeamMembers = createAsyncThunk(
    'team/fetchMembers',
    async () => {
        const response = await axios.get<TeamMember[]>('http://localhost:5193/api/team');
        return response.data;
    }
);

export const fetchDepartments = createAsyncThunk(
    'team/fetchDepartments',
    async () => {
        const response = await axios.get<string[]>('http://localhost:5193/api/team/departments');
        return response.data;
    }
);

export const fetchTeamMembersByDepartment = createAsyncThunk(
    'team/fetchMembersByDepartment',
    async (department: string) => {
        const response = await axios.get<TeamMember[]>(`http://localhost:5193/api/team/by-department/${department}`);
        return response.data;
    }
);

const teamSlice = createSlice({
    name: 'team',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(fetchTeamMembers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTeamMembers.fulfilled, (state, action) => {
                state.loading = false;
                state.members = action.payload;
            })
            .addCase(fetchTeamMembers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Bir hata oluştu';
            })
            .addCase(fetchDepartments.fulfilled, (state, action) => {
                state.departments = action.payload;
            })
            .addCase(fetchTeamMembersByDepartment.fulfilled, (state, action) => {
                state.members = action.payload;
            });
    },
});

export default teamSlice.reducer;
