import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TeamState, TeamMember, Team } from '../../types/team';
import axiosInstance from '../../services/axiosInstance';

interface ActiveTasksData {
    [key: string]: {
        totalActiveTasks: number;
        todoTasks: number;
        inProgressTasks: number;
        isBusy: boolean;
    };
}

const initialState: TeamState = {
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
    sortOrder: 'asc',
    activeTasksData: {},
};

// Response tipleri
interface DeleteTeamResponse {
    teamId: string;
    message: string;
}

interface RemoveTeamMemberResponse {
    teamId: string;
    memberId: string;
    message: string;
}

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
    async ({ name, description, department }: {
        name: string;
        description?: string;
        department: string;
    }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post('/Team/create', {
                name,
                description,
                department
            });
            return response.data;
        } catch (error: any) {
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
export const getTeamInviteLink = createAsyncThunk(
    'Team/getInviteLink',
    async (teamId: string) => {
        try {
            const response = await axiosInstance.get(`/Team/invite-link/${teamId}/get`);
            return response.data;
        } catch (error: any) {
            console.error('Davet linki alma hatası:', error.response?.data);
            return error.response?.data || error.message;
        }
    }
);

export const setTeamInviteLink = createAsyncThunk(
    'Team/setInviteLink',
    async ({ teamId, inviteLink }: { teamId: string; inviteLink: string }) => {
        try {
            const response = await axiosInstance.post(
                `/Team/invite-link/${teamId}/set`,
                { teamId, InviteLink: inviteLink }
            );
            return response.data;
        }
        catch (error: any) {
            console.error('Davet linki atama hatası:', error.response?.data);
            throw error.response?.data || error.message;
        }
    }
);

export const addExperties = createAsyncThunk(
    'Team/addExperties',
    async ({ memberId, experties }: { memberId: string; experties: string }) => {
        try {
            const response = await axiosInstance.post(`/Team/members/${memberId}/experties`, { experties });
            return response.data;
        } catch (error: any) {
            console.error('Hata:', error.response?.data);
            return error.response?.data || error.message;
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
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/Team');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Takımlar alınırken bir hata oluştu');
        }
    }
);

export const deleteTeam = createAsyncThunk<DeleteTeamResponse, string>(
    'Team/deleteTeam',
    async (teamId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.delete(`/Team/${teamId}`);
            return { teamId, ...response.data };
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

// Remove team member action
export const removeTeamMember = createAsyncThunk<RemoveTeamMemberResponse, { teamId: string; memberId: string }>(
    'Team/removeTeamMember',
    async ({ teamId, memberId }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.delete(`/Team/${teamId}/members/${memberId}`);
            return { teamId, memberId, ...response.data };
        } catch (error: any) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchMemberActiveTasks = createAsyncThunk(
    'Team/fetchMemberActiveTasks',
    async (teamId?: string, { getState, rejectWithValue }) => {
        try {
            const state = getState() as { team: TeamState };
            const activeTasksData: ActiveTasksData = {};

            // Backend'de takım üyelerinin durumlarını güncelleme API çağrısı
            await axiosInstance.post('/Team/update-member-statuses');

            // Tüm takımlar veya belirli bir takım
            const teamsToProcess = teamId
                ? state.team.teams.filter(t => t.id === teamId)
                : state.team.teams;

            // Her takım ve üye için aktif görev verilerini topla
            for (const team of teamsToProcess) {
                for (const member of team.members) {
                    const response = await axiosInstance.get(`/Tasks/user/${member.id}/active-tasks`);
                    activeTasksData[member.id] = response.data;
                }
            }

            return activeTasksData;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Aktif görevler alınırken bir hata oluştu');
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
            .addCase(getTeamInviteLink.fulfilled, (state, action) => {
                // İsteğe bağlı olarak state'i güncelleyebilirsiniz
            })
            .addCase(setTeamInviteLink.fulfilled, (state, action) => {
                // İsteğe bağlı olarak state'i güncelleyebilirsiniz
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
                state.error = action.payload as string;
            })
            .addCase(deleteTeam.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteTeam.fulfilled, (state, action) => {
                state.loading = false;
                // Takımı listeden çıkar
                state.teams = state.teams.filter(team => team.id !== action.payload.teamId);
            })
            .addCase(deleteTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(addExperties.fulfilled, (state, action) => {
                const updatedMember = action.payload;
                const index = state.members.findIndex(m => m.id === updatedMember.id);
                if (index !== -1) {
                    state.members[index] = updatedMember;
                }
            })
            // Remove team member reducers
            .addCase(removeTeamMember.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(removeTeamMember.fulfilled, (state, action) => {
                state.loading = false;
                // Üyeyi teams listesinden çıkar
                const team = state.teams.find(t => t.id === action.payload.teamId);
                if (team) {
                    team.members = team.members.filter(m => m.id !== action.payload.memberId);
                }
            })
            .addCase(removeTeamMember.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            .addCase(fetchMemberActiveTasks.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMemberActiveTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.activeTasksData = action.payload;
            })
            .addCase(fetchMemberActiveTasks.rejected, (state, action) => {
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