import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TeamState, TeamMember } from '../../types/team';
import axiosInstance from '../../services/axiosInstance';

const initialState: TeamState = {
    members: [],
    departments: [],
    departmentProjects: {},
    loading: false,
    error: null,
    searchQuery: '',
    filters: {
        status: [],
        expertise: [],
        department: []
    },
    sortBy: 'name',
    sortOrder: 'asc'
};

export const fetchTeamMembers = createAsyncThunk(
    'team/fetchTeamMembers',
    async () => {
        const response = await axiosInstance.get('/team/members');
        return response.data;
    }
);

export const fetchDepartments = createAsyncThunk(
    'team/fetchDepartments',
    async () => {
        const response = await axiosInstance.get('/team/departments');
        return response.data;
    }
);

export const fetchTeamMembersByDepartment = createAsyncThunk(
    'team/fetchTeamMembersByDepartment',
    async (department: string) => {
        const response = await axiosInstance.get(`/team/members/department/${department}`);
        return response.data;
    }
);

export const updateMemberStatus = createAsyncThunk(
    'team/updateMemberStatus',
    async ({ memberId, status }: { memberId: string; status: string }) => {
        const response = await axiosInstance.patch(`/team/members/${memberId}/status`, { status });
        return response.data;
    }
);

export const updateMemberProfile = createAsyncThunk(
    'team/updateMemberProfile',
    async ({ memberId, profileData }: { memberId: string; profileData: Partial<TeamMember> }) => {
        const response = await axiosInstance.patch(`/team/members/${memberId}`, profileData);
        return response.data;
    }
);

const teamSlice = createSlice({
    name: 'team',
    initialState,
    reducers: {
        setSearchQuery: (state, action) => {
            state.searchQuery = action.payload;
        },
        setFilters: (state, action) => {
            state.filters = { ...state.filters, ...action.payload };
        },
        setSortBy: (state, action) => {
            state.sortBy = action.payload;
        },
        setSortOrder: (state, action) => {
            state.sortOrder = action.payload;
        },
        updateMemberOnlineStatus: (state, action) => {
            const { memberId, status } = action.payload;
            const member = state.members.find(m => m.id === memberId);
            if (member) {
                member.onlineStatus = status;
            }
        }
    },
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
                state.error = action.error.message || 'Ekip üyeleri yüklenirken bir hata oluştu';
            })
            .addCase(fetchDepartments.fulfilled, (state, action) => {
                state.departments = action.payload;
            })
            .addCase(fetchTeamMembersByDepartment.fulfilled, (state, action) => {
                state.members = action.payload;
            })
            .addCase(updateMemberStatus.fulfilled, (state, action) => {
                const updatedMember = action.payload;
                const index = state.members.findIndex(m => m.id === updatedMember.id);
                if (index !== -1) {
                    state.members[index] = updatedMember;
                }
            })
            .addCase(updateMemberProfile.fulfilled, (state, action) => {
                const updatedMember = action.payload;
                const index = state.members.findIndex(m => m.id === updatedMember.id);
                if (index !== -1) {
                    state.members[index] = updatedMember;
                }
            });
    }
});

export const { 
    setSearchQuery, 
    setFilters, 
    setSortBy, 
    setSortOrder,
    updateMemberOnlineStatus 
} = teamSlice.actions;

export default teamSlice.reducer;
