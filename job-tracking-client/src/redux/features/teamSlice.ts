import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TeamState, Team, TeamMember } from '../../types/team';
import axiosInstance from '../../services/axiosInstance';

const initialState: TeamState = {
    leadingTeams: [],
    memberTeams: [],
    allTeams: [],
    departments: [],
    loading: false,
    error: null,
    searchQuery: '',
    filters: {
        status: [],
        department: []
    },
    sortBy: 'name',
    sortOrder: 'asc'
};

export const fetchMyTeams = createAsyncThunk(
    'team/fetchMyTeams',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/team/my-teams');
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 401) {
                return rejectWithValue('Unauthorized');
            }
            return rejectWithValue(error.response?.data?.message || 'Bir hata oluştu');
        }
    }
);

export const fetchLeadingTeams = createAsyncThunk(
    'team/fetchLeadingTeams',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/team/leading');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Bir hata oluştu');
        }
    }
);

export const fetchMemberTeams = createAsyncThunk(
    'team/fetchMemberTeams',
    async (_, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.get('/team/member');
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Bir hata oluştu');
        }
    }
);

export const createTeam = createAsyncThunk(
    'team/createTeam',
    async (team: Partial<Team>, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post('/team', team);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Bir hata oluştu');
        }
    }
);

export const addTeamMember = createAsyncThunk(
    'team/addTeamMember',
    async ({ teamId, userId }: { teamId: string; userId: string }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/team/${teamId}/members`, { userId });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Üye eklenirken bir hata oluştu');
        }
    }
);

export const removeTeamMember = createAsyncThunk(
    'team/removeTeamMember',
    async ({ teamId, userId }: { teamId: string; userId: string }, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/team/${teamId}/members/${userId}`);
            return { teamId, userId };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Üye çıkarılırken bir hata oluştu');
        }
    }
);

export const updateTeam = createAsyncThunk(
    'team/updateTeam',
    async ({ id, team }: { id: string; team: Partial<Team> }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.put(`/team/${id}`, team);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Takım güncellenirken bir hata oluştu');
        }
    }
);

export const deleteTeam = createAsyncThunk(
    'team/deleteTeam',
    async (id: string, { rejectWithValue }) => {
        try {
            await axiosInstance.delete(`/team/${id}`);
            return id;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Takım silinirken bir hata oluştu');
        }
    }
);

const teamSlice = createSlice({
    name: 'team',
    initialState,
    reducers: {
        setSearchQuery(state, action) {
            state.searchQuery = action.payload;
        },
        setFilters(state, action) {
            state.filters = action.payload;
        },
        setSortBy(state, action) {
            state.sortBy = action.payload;
        },
        setSortOrder(state, action) {
            state.sortOrder = action.payload;
        },
    },
    extraReducers: (builder) => {
        // fetchMyTeams
        builder
            .addCase(fetchMyTeams.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMyTeams.fulfilled, (state, action) => {
                state.loading = false;
                state.allTeams = action.payload;
            })
            .addCase(fetchMyTeams.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // fetchLeadingTeams
            .addCase(fetchLeadingTeams.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchLeadingTeams.fulfilled, (state, action) => {
                state.loading = false;
                state.leadingTeams = action.payload;
            })
            .addCase(fetchLeadingTeams.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // fetchMemberTeams
            .addCase(fetchMemberTeams.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMemberTeams.fulfilled, (state, action) => {
                state.loading = false;
                state.memberTeams = action.payload;
            })
            .addCase(fetchMemberTeams.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // createTeam
            .addCase(createTeam.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(createTeam.fulfilled, (state, action) => {
                state.loading = false;
                state.allTeams = [...state.allTeams, action.payload];
            })
            .addCase(createTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // addTeamMember
            .addCase(addTeamMember.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(addTeamMember.fulfilled, (state, action) => {
                state.loading = false;
                const team = state.allTeams.find(t => t.id === action.payload.teamId);
                if (team) {
                    team.members.push(action.payload.member);
                }
            })
            .addCase(addTeamMember.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // removeTeamMember
            .addCase(removeTeamMember.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(removeTeamMember.fulfilled, (state, action) => {
                state.loading = false;
                const team = state.allTeams.find(t => t.id === action.payload.teamId);
                if (team) {
                    team.members = team.members.filter(m => m.userId !== action.payload.userId);
                }
            })
            .addCase(removeTeamMember.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // updateTeam
            .addCase(updateTeam.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateTeam.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.allTeams.findIndex(t => t.id === action.payload.id);
                if (index !== -1) {
                    state.allTeams[index] = action.payload;
                }
            })
            .addCase(updateTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })

            // deleteTeam
            .addCase(deleteTeam.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteTeam.fulfilled, (state, action) => {
                state.loading = false;
                state.allTeams = state.allTeams.filter(t => t.id !== action.payload);
            })
            .addCase(deleteTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            });
    },
});

export const { setSearchQuery, setFilters, setSortBy, setSortOrder } = teamSlice.actions;

export default teamSlice.reducer;
