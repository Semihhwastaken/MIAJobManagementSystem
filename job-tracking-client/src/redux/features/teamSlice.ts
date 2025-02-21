import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TeamState, TeamMember, Team } from '../../types/team';
import axiosInstance from '../../services/axiosInstance';

const initialState: TeamState & { teams: Team[] } = {
    members: [],
    teams: [],
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
    'Team/fetchTeamMembers',
    async () => {
        const response = await axiosInstance.get('/Team/members');
        return response.data;
    }
);

export const fetchDepartments = createAsyncThunk(
    'Team/fetchDepartments',
    async () => {
        const response = await axiosInstance.get('/Team/departments');
        return response.data;
    }
);

export const fetchTeamMembersByDepartment = createAsyncThunk(
    'Team/fetchTeamMembersByDepartment',
    async (department: string) => {
        const response = await axiosInstance.get(`/Team/members/department/${department}`);
        return response.data;
    }
);

export const updateMemberStatus = createAsyncThunk(
    'Team/updateMemberStatus',
    async ({ memberId, status }: { memberId: string; status: string }) => {
        const response = await axiosInstance.patch(`/Team/members/${memberId}/status`, { status });
        return response.data;
    }
);

export const updateMemberProfile = createAsyncThunk(
    'Team/updateMemberProfile',
    async ({ memberId, profileData }: { memberId: string; profileData: Partial<TeamMember> }) => {
        const response = await axiosInstance.patch(`/Team/members/${memberId}`, profileData);
        return response.data;
    }
);

export const createTeam = createAsyncThunk(
    'Team/createTeam',
    async ({ name, description }: { name: string; description?: string }, { rejectWithValue }) => {
        try {
            console.log('Gönderilen veri:', { name, description: description || '' }); // Debug için
            const response = await axiosInstance.post('/Team/create', {
                name,
                description: description || ''
            });
            return response.data;
        } catch (error: any) {
            console.error('API Hatası:', error.response?.data); // Debug için
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const generateTeamInviteLink = createAsyncThunk(
    'Team/generateInviteLink',
    async (teamId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/Team/invite-link/${teamId}`);
            return response.data;
        } catch (error: any) {
            console.error('Davet linki oluşturma hatası:', error.response?.data);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const joinTeamWithInviteLink = createAsyncThunk(
    'Team/joinWithInviteLink',
    async (inviteCode: string) => {
        const response = await axiosInstance.post(`${axiosInstance.defaults.baseURL}/Team/join-with-code/${inviteCode}`);
        return response.data;
    }
);

export const fetchTeams = createAsyncThunk(
    'Team/fetchTeams',
    async () => {
        const response = await axiosInstance.get('/Team');
        return response.data;
    }
);

export const deleteTeam = createAsyncThunk(
    'Team/deleteTeam',
    async (teamId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`Team/${teamId}`);
            return teamId;
        } catch (error: any) {
            return rejectWithValue(error.response?.data || 'Takım silinirken bir hata oluştu');
        }
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
            })
            .addCase(createTeam.pending, (state) => {
                state.loading = true;
            })
            .addCase(createTeam.fulfilled, (state, action) => {
                state.loading = false;
                state.teams.push(action.payload);
            })
            .addCase(createTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(generateTeamInviteLink.fulfilled, (state, action) => {
                // İsteğe bağlı olarak state'i güncelleyebilirsiniz
            })
            .addCase(joinTeamWithInviteLink.fulfilled, (state, action) => {
                // Takıma katılma başarılı olduğunda teams listesini güncelle
                fetchTeams();
            })
            .addCase(fetchTeams.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTeams.fulfilled, (state, action) => {
                state.loading = false;
                state.teams = action.payload;
            })
            .addCase(fetchTeams.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Bir hata oluştu';
            })
            .addCase(deleteTeam.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteTeam.fulfilled, (state, action) => {
                state.loading = false;
                state.teams = state.teams.filter(team => team.id !== action.payload);
            })
            .addCase(deleteTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
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
