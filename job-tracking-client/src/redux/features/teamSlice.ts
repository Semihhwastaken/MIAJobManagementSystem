<<<<<<< HEAD
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TeamState, TeamMember, Team } from '../../types/team';
import axiosInstance from '../../services/axiosInstance';

const initialState: TeamState & { teams: Team[] } = {
=======
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSlice, createAsyncThunk, createAction, isPending, isRejected } from '@reduxjs/toolkit';
import { TeamState, TeamMember, Team } from '../../types/team';
import axiosInstance from '../../services/axiosInstance';
import { RESET_STATE } from './actionTypes';

interface MemberMetricsUpdateDto {
    teamId: string;
    performanceScore: number;
    completedTasks: number;
    overdueTasks: number;
    totalTasks: number;
}

// Simple request debouncer - helps to prevent multiple identical API calls
const pendingRequests: Record<string, boolean> = {};
let lastMemberStatusUpdate = 0;

interface ActiveTasksData {
    [key: string]: {
        totalActiveTasks: number;
        todoTasks: number;
        inProgressTasks: number;
        isBusy: boolean;
    };
}

const initialState: TeamState = {
>>>>>>> newdb1
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
<<<<<<< HEAD
    sortOrder: 'asc'
};

// Response tipleri
=======
    sortOrder: 'asc',
    activeTasksData: {},
    performanceScores: {},
    lastCacheTimes: {
        members: 0,
        teams: 0,
        departments: 0
    }
};

// Response types
>>>>>>> newdb1
interface DeleteTeamResponse {
    teamId: string;
    message: string;
}

interface RemoveTeamMemberResponse {
    teamId: string;
    memberId: string;
    message: string;
}

<<<<<<< HEAD
export const fetchTeamMembers = createAsyncThunk(
    'Team/fetchTeamMembers',
    async () => {
        const response = await axiosInstance.get('/Team/members');
        return response.data;
=======
// Helper function to check if cache is valid (5 minutes)
const isCacheValid = (lastCacheTime: number): boolean => {
    return lastCacheTime > 0 && Date.now() - lastCacheTime < 5 * 60 * 1000; // 5 minutes
};

// Action to manually invalidate caches when needed
export const invalidateCache = createAction<string>('team/invalidateCache');

export const fetchTeamMembers = createAsyncThunk(
    'Team/fetchTeamMembers',
    async (_, { getState, rejectWithValue }) => {
        const state = getState() as { team: TeamState };
        
        // Use cached data if available and not expired
        if (isCacheValid(state.team.lastCacheTimes.members) && state.team.members.length > 0) {
            return state.team.members;
        }

        try {
            // Create a request key
            const requestKey = 'fetchTeamMembers';
            if (pendingRequests[requestKey]) {
                return state.team.members; // Return current state if request is already pending
            }
            
            pendingRequests[requestKey] = true;
            const response = await axiosInstance.get('/Team/members');
            pendingRequests[requestKey] = false;
            return response.data;
        } catch (error: any) {
            pendingRequests['fetchTeamMembers'] = false;
            return rejectWithValue(error.response?.data?.message || 'Ekip üyeleri yüklenirken bir hata oluştu');
        }
>>>>>>> newdb1
    }
);

export const fetchDepartments = createAsyncThunk(
    'Team/fetchDepartments',
<<<<<<< HEAD
    async () => {
        const response = await axiosInstance.get('/Team/departments');
        return response.data;
=======
    async (_, { getState, rejectWithValue }) => {
        const state = getState() as { team: TeamState };
        
        // Use cached data if available and not expired
        if (isCacheValid(state.team.lastCacheTimes.departments) && state.team.departments.length > 0) {
            return state.team.departments;
        }

        try {
            // Create a request key
            const requestKey = 'fetchDepartments';
            if (pendingRequests[requestKey]) {
                return state.team.departments;
            }
            
            pendingRequests[requestKey] = true;
            const response = await axiosInstance.get('/Team/departments');
            pendingRequests[requestKey] = false;
            return response.data;
        } catch (error: any) {
            pendingRequests['fetchDepartments'] = false;
            return rejectWithValue(error.response?.data?.message || 'Departmanlar yüklenirken bir hata oluştu');
        }
>>>>>>> newdb1
    }
);

export const fetchTeamMembersByDepartment = createAsyncThunk(
    'Team/fetchTeamMembersByDepartment',
<<<<<<< HEAD
    async (department: string) => {
        const response = await axiosInstance.get(`/Team/members/department/${department}`);
        return response.data;
=======
    async (department: string, { rejectWithValue }) => {
        try {
            // Create a request key using the department
            const requestKey = `fetchTeamMembersByDepartment_${department}`;
            if (pendingRequests[requestKey]) {
                return []; // Return empty if request is already pending
            }
            
            pendingRequests[requestKey] = true;
            const response = await axiosInstance.get(`/Team/members/department/${department}`);
            pendingRequests[requestKey] = false;
            return response.data;
        } catch (error: any) {
            pendingRequests[`fetchTeamMembersByDepartment_${department}`] = false;
            return rejectWithValue(error.response?.data?.message || 'Departman üyeleri yüklenirken bir hata oluştu');
        }
>>>>>>> newdb1
    }
);

export const updateMemberStatus = createAsyncThunk(
    'Team/updateMemberStatus',
<<<<<<< HEAD
    async ({ memberId, status }: { memberId: string; status: string }) => {
        const response = await axiosInstance.patch(`/Team/members/${memberId}/status`, { status });
        return response.data;
=======
    async ({ memberId, status }: { memberId: string; status: string }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.patch(`/Team/members/${memberId}/status`, { status });
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Üye durumu güncellenirken bir hata oluştu');
        }
>>>>>>> newdb1
    }
);

export const updateMemberProfile = createAsyncThunk(
    'Team/updateMemberProfile',
<<<<<<< HEAD
    async ({ memberId, profileData }: { memberId: string; profileData: Partial<TeamMember> }) => {
        const response = await axiosInstance.patch(`/Team/members/${memberId}`, profileData);
        return response.data;
=======
    async ({ memberId, profileData }: { memberId: string; profileData: Partial<TeamMember> }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.patch(`/Team/members/${memberId}`, profileData);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Üye profili güncellenirken bir hata oluştu');
        }
>>>>>>> newdb1
    }
);

export const createTeam = createAsyncThunk(
    'Team/createTeam',
<<<<<<< HEAD
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
=======
    async ({ name, description, department }: {
        name: string;
        description?: string;
        department: string;
    }, { rejectWithValue, dispatch }) => {
        try {
            const response = await axiosInstance.post('/Team/create', {
                name,
                description,
                department
            });
            
            // Invalidate teams cache after creating a new team
            dispatch(invalidateCache('teams'));
            
            return response.data;
        } catch (error: any) {
>>>>>>> newdb1
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

<<<<<<< HEAD
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

export const deleteTeam = createAsyncThunk<DeleteTeamResponse, string>(
    'Team/deleteTeam',
    async (teamId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.delete(`/Team/${teamId}`);
            return { teamId, ...response.data };
        } catch (error: any) {
=======
export const getTeamInviteLink = createAsyncThunk(
    'Team/getInviteLink',
    async (teamId: string, { rejectWithValue }) => {
        try {
            // Yeni API endpoint'ini kullan
            const response = await axiosInstance.get(`/Team/invite-link/${teamId}/get`);
            return response.data.inviteLink;
        } catch (error: any) {
            console.error('Davet linki alma hatası:', error.response?.data);
>>>>>>> newdb1
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

<<<<<<< HEAD
// Remove team member action
export const removeTeamMember = createAsyncThunk<RemoveTeamMemberResponse, { teamId: string; memberId: string }>(
    'Team/removeTeamMember',
    async ({ teamId, memberId }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.delete(`/Team/${teamId}/members/${memberId}`);
            return { teamId, memberId, ...response.data };
        } catch (error: any) {
=======
export const setTeamInviteLink = createAsyncThunk(
    'Team/setInviteLink',
    async ({ teamId, inviteLink }: { teamId: string; inviteLink: string }, { rejectWithValue }) => {
        try {
            // Yeni API endpoint'ini kullan
            const response = await axiosInstance.post(
                `/Team/${teamId}/set-invite-link`,
                { teamId, inviteLink }
            );
            return response.data.inviteLink;
        }
        catch (error: any) {
            console.error('Davet linki atama hatası:', error.response?.data);
>>>>>>> newdb1
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

<<<<<<< HEAD
=======
export const clearInviteLink = createAsyncThunk(
    'Team/clearInviteLink',
    async (teamId: string, { rejectWithValue }) => {
        try {
            await axiosInstance.post(`/Team/${teamId}/clear-invite-link`);
            return { success: true, teamId };
        } catch (error: any) {
            console.error('Davet linki temizleme hatası:', error.response?.data);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const joinTeamWithInviteCode = createAsyncThunk(
    'Team/joinTeamWithInviteCode',
    async (inviteCode: string, { rejectWithValue, dispatch }) => {
        try {
            // Backend API formatı: [HttpPost("join-with-code/{inviteCode}")]
            const response = await axiosInstance.post(`/Team/join-with-code/${inviteCode}`);
            
            // Tüm ilgili cacheleri güncelle
            dispatch(invalidateCache('all')); // 'all' tüm cacheleri temizler: teams, members, departments
            
            // Teams sayfasını yeniden yüklemek için gerekli dataları hemen fetch et
            dispatch(fetchTeams());
            
            // Kullanıcı takıma katıldıktan sonra takımla ilgili verileri önbelleğe al
            const teamId = response.data.teamId;
            if (teamId) {
                dispatch(getTeamMembersByTeamId(teamId));
            }
            
            return response.data;
        } catch (error: any) {
            console.error('Davet koduyla takıma katılma hatası:', error.response?.data);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const addExperties = createAsyncThunk(
    'Team/addExperties',
    async ({ memberId, experties }: { memberId: string; experties: string }, { rejectWithValue }) => {
        try {
            // Yeni API endpoint'ini kullan
            const response = await axiosInstance.post(`/Team/add-expertise`, { memberId, expertise: experties });
            return response.data;
        } catch (error: any) {
            console.error('Hata:', error.response?.data);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const assignOwnerRole = createAsyncThunk(
    'Team/assignOwnerRole',
    async ({ teamId, userId }: { teamId: string; userId: string }, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/Team/${teamId}/assign-owner`, { userId });
            return { success: response.data.success, teamId, userId };
        } catch (error: any) {
            console.error('Sahip rolü atama hatası:', error.response?.data);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const removeTeamMember = createAsyncThunk(
    'Team/removeTeamMember',
    async ({ teamId, memberId }: { teamId: string; memberId: string }, { rejectWithValue, dispatch }) => {
        try {
            const response = await axiosInstance.post(`/Team/${teamId}/remove-member`, { memberId });
            
            // Üyeleri yeniden yükle
            dispatch(invalidateCache('members'));
            
            return { success: response.data.success, message: response.data.message, teamId, memberId };
        } catch (error: any) {
            console.error('Takım üyesi çıkarma hatası:', error.response?.data);
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchTeams = createAsyncThunk(
    'Team/fetchTeams',
    async (_, { getState, rejectWithValue, dispatch }) => {
        const state = getState() as { team: TeamState; auth: { user: any } };
        
        // Use cached data if available and not expired
        if (isCacheValid(state.team.lastCacheTimes.teams) && state.team.teams.length > 0) {
            return state.team.teams;
        }

        try {
            // Create a request key
            const requestKey = 'fetchTeams';
            if (pendingRequests[requestKey]) {
                return state.team.teams;
            }
            
            pendingRequests[requestKey] = true;
            
            // Önce takımları getir
            const teamsResponse = await axiosInstance.get('/Team');
            
            // Ardından tam üye bilgilerini getir
            const membersResponse = await axiosInstance.get('/Team/members');
            
            // Kullanıcı ID'lerine göre üye bilgilerini map'le
            const membersMap = new Map();
            membersResponse.data.forEach((member: TeamMember) => {
                membersMap.set(member.id, member);
            });
            
            // Takımların üye listelerini tam üye bilgileriyle güncelle
            const enrichedTeams = teamsResponse.data.map((team: Team) => {
                const enrichedMembers = team.members.map((member: TeamMember) => {
                    const fullMemberInfo = membersMap.get(member.id);
                    
                    // Owner kontrolü - ownerTeams array'inden kontrol et
                    const isOwner = fullMemberInfo?.ownerTeams?.includes(team.id);
                    
                    // Eğer bu üye için tam bilgi varsa, birleştir
                    if (fullMemberInfo) {
                        return {
                            ...member,
                            profileImage: fullMemberInfo.profileImage || member.profileImage,
                            department: fullMemberInfo.department || member.department,
                            // Performans skorlarını ve tamamlanan görev sayısını sadece bu takım için olan metrics'ten al
                            performanceScore: member.metrics?.performanceScore || 50,
                            completedTasksCount: member.metrics?.completedTasks || 0,
                            expertise: fullMemberInfo.expertise || member.expertise || [],
                            status: fullMemberInfo.status || member.status,
                            onlineStatus: fullMemberInfo.onlineStatus || member.onlineStatus,
                            title: fullMemberInfo.title || member.title,
                            position: fullMemberInfo.position || member.position,
                            // Full name'i doğru şekilde göstermek için
                            fullName: member.fullName || fullMemberInfo.fullName,
                            // Owner rolünü kontrol et
                            role: isOwner ? 'Owner' : member.role || 'Member'
                        };
                    }
                    
                    return {
                        ...member,
                        performanceScore: member.metrics?.performanceScore || 50,
                        completedTasksCount: member.metrics?.completedTasks || 0,
                        role: isOwner ? 'Owner' : member.role || 'Member'
                    };
                });
                
                return {
                    ...team,
                    members: enrichedMembers
                };
            });
            
            pendingRequests[requestKey] = false;
            return enrichedTeams;
        } catch (error: any) {
            pendingRequests['fetchTeams'] = false;
            return rejectWithValue(error.response?.data?.message || 'Takımlar alınırken bir hata oluştu');
        }
    }
);

export const deleteTeam = createAsyncThunk<DeleteTeamResponse, string>(
    'Team/deleteTeam',
    async (teamId: string, { rejectWithValue, dispatch }) => {
        try {
            const response = await axiosInstance.delete(`/Team/${teamId}`);
            
            // Invalidate teams cache after deletion
            dispatch(invalidateCache('teams'));
            
            return { teamId, message: response.data.message };
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

export const fetchMemberActiveTasks = createAsyncThunk(
    'Team/fetchMemberActiveTasks',
    async (teamId: string | undefined, { getState, rejectWithValue }) => {
        try {
            const state = getState() as { team: TeamState };
            const activeTasksData: ActiveTasksData = {};
            
            const now = Date.now();
            if (now - lastMemberStatusUpdate < 60000) { // 60 seconds
                return state.team.activeTasksData;
            }
            
            // Get all tasks from the taskSlice
            const tasks = (getState() as any).tasks.items;

            // Calculate metrics
            const memberMetrics: MemberMetricsUpdateDto = {
                teamId: teamId || '',
                performanceScore: 0,
                completedTasks: tasks.filter((t: any) => t.status === 'completed' && t.teamId === teamId).length,
                overdueTasks: tasks.filter((t: any) => t.status === 'overdue' && t.teamId === teamId).length,
                totalTasks: tasks.filter((t: any) => t.teamId === teamId).length
            };

            // Calculate performance score (completed tasks / total tasks * 100)
            if (memberMetrics.totalTasks > 0) {
                memberMetrics.performanceScore = (memberMetrics.completedTasks / memberMetrics.totalTasks) * 100;
            }
            
            // Add explicit check for valid teamId
            if (memberMetrics.teamId && memberMetrics.teamId !== '') {
                try {
                    // Update member statuses with calculated metrics
                    await axiosInstance.post('/Team/update-member-statuses', memberMetrics);
                    lastMemberStatusUpdate = now;
                } catch (error: any) {
                    console.error('Failed to update member metrics:', error.response?.data || error.message);
                    // Continue execution even if metrics update fails
                }
            }

            // Tüm takımlar veya belirli bir takım
            const teamsToProcess = teamId
                ? state.team.teams.filter(t => t.id === teamId)
                : state.team.teams;

            // Get active tasks for each team and member in batch if possible
            const memberIds = teamsToProcess.flatMap(team => team.members.map(member => member.id));
            
            // Only request data for unique member IDs
            const uniqueIds = [...new Set(memberIds)];
            
            if (uniqueIds.length > 0) {
                // In a production app, consider creating a batch endpoint to get all in one request
                // For now, we'll limit parallel requests to avoid overloading the server
                const batchSize = 5;
                for (let i = 0; i < uniqueIds.length; i += batchSize) {
                    const batch = uniqueIds.slice(i, i + batchSize);
                    await Promise.all(batch.map(async (memberId) => {
                        try {
                            const response = await axiosInstance.get(`/Tasks/user/${memberId}/active-tasks`);
                            activeTasksData[memberId] = response.data;
                        } catch (error) {
                            console.error(`Error fetching tasks for member ${memberId}:`, error);
                        }
                    }));
                }
            }

            return activeTasksData;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Aktif görevler alınırken bir hata oluştu');
        }
    }
);

export const getMemberPerformance = createAsyncThunk(
    'Team/getMemberPerformance',
    async (userId: string, { getState, rejectWithValue }) => {
        try {
            // Check if we already have this user's performance score
            const state = getState() as { team: TeamState };
            if (state.team.performanceScores[userId]) {
                // Only re-fetch if it's been more than 5 minutes since last update
                const lastUpdate = new Date(state.team.performanceScores[userId].lastUpdated);
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                
                if (lastUpdate > fiveMinutesAgo) {
                    return state.team.performanceScores[userId];
                }
            }
            
            const response = await axiosInstance.get(`/Team/members/${userId}/performance`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch performance score');
        }
    }
);

export const updateMemberPerformance = createAsyncThunk(
    'Team/updateMemberPerformance',
    async (userId: string, { rejectWithValue }) => {
        try {
            const response = await axiosInstance.post(`/Team/members/${userId}/update-performance`);
            return response.data;
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update performance score');
        }
    }
);

export const getTeamMembersByTeamId = createAsyncThunk(
    'Team/getTeamMembersByTeamId',
    async (teamId: string, { getState, rejectWithValue }) => {
        const state = getState() as { team: TeamState };
        
        // Check if we already have this team's data
        const existingTeam = state.team.teams.find(t => t.id === teamId);
        if (existingTeam && existingTeam.members && existingTeam.members.length > 0) {
            // Only fetch if the team was loaded more than 1 minute ago
            if (isCacheValid(state.team.lastCacheTimes.teams)) {
                return existingTeam.members;
            }
        }
        
        try {
            const requestKey = `getTeamMembersByTeamId_${teamId}`;
            if (pendingRequests[requestKey]) {
                return existingTeam?.members || [];
            }
            
            pendingRequests[requestKey] = true;
            const response = await axiosInstance.get(`/Team/${teamId}/members`);
            pendingRequests[requestKey] = false;
            return response.data;
        } catch (error: any) {
            pendingRequests[`getTeamMembersByTeamId_${teamId}`] = false;
            return rejectWithValue(error.response?.data?.message || 'Takım üyeleri alınırken bir hata oluştu');
        }
    }
);

export const updateMemberStatuses = createAsyncThunk(
    'team/updateMemberStatuses',
    async (memberMetrics: MemberMetricsUpdateDto, { rejectWithValue }) => {
        try {
            const data = {
                ...memberMetrics,
                teamId: memberMetrics.teamId,
                performanceScore: memberMetrics.performanceScore,
                completedTasks: memberMetrics.completedTasks,
                overdueTasks: memberMetrics.overdueTasks,
                totalTasks: memberMetrics.totalTasks
            };

            const response = await axiosInstance.post('/Team/update-member-statuses', data);
            return response.data;
        } catch (error: any) {
            console.error('Error updating member metrics:', error.response?.data || error.message);
            return rejectWithValue(error.response?.data?.message || 'Failed to update member metrics');
        }
    }
);

>>>>>>> newdb1
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
<<<<<<< HEAD
=======
            // Global reset state action
            .addCase(RESET_STATE, () => {
                return initialState;
            })
            // Handle cache invalidation
            .addCase(invalidateCache, (state, action) => {
                const cacheType = action.payload;
                if (cacheType === 'members' || cacheType === 'all') {
                    state.lastCacheTimes.members = 0;
                }
                if (cacheType === 'teams' || cacheType === 'all') {
                    state.lastCacheTimes.teams = 0;
                }
                if (cacheType === 'departments' || cacheType === 'all') {
                    state.lastCacheTimes.departments = 0;
                }
            })
            // Team members
>>>>>>> newdb1
            .addCase(fetchTeamMembers.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTeamMembers.fulfilled, (state, action) => {
                state.loading = false;
<<<<<<< HEAD
                state.members = action.payload;
=======
                // Make sure each team member has default values for missing fields
                const membersWithDefaults = action.payload.map((member: TeamMember) => ({
                    ...member,
                    profileImage: member.profileImage || null,
                    performanceScore: typeof member.performanceScore === 'number' ? member.performanceScore : 50,
                    onlineStatus: member.onlineStatus || 'online',
                    expertise: member.expertise || [],
                    completedTasksCount: member.completedTasksCount || 0,
                    // Role bilgisini kontrol et
                    role: member.role || 'Member'
                }));
                state.members = membersWithDefaults;
                state.lastCacheTimes.members = Date.now();
>>>>>>> newdb1
            })
            .addCase(fetchTeamMembers.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Ekip üyeleri yüklenirken bir hata oluştu';
            })
<<<<<<< HEAD
            .addCase(fetchDepartments.fulfilled, (state, action) => {
                state.departments = action.payload;
            })
            .addCase(fetchTeamMembersByDepartment.fulfilled, (state, action) => {
                state.members = action.payload;
            })
=======
            // Departments
            .addCase(fetchDepartments.fulfilled, (state, action) => {
                state.departments = action.payload;
                state.lastCacheTimes.departments = Date.now();
            })
            // Department members
            .addCase(fetchTeamMembersByDepartment.fulfilled, (state, action) => {
                state.members = action.payload;
                state.lastCacheTimes.members = Date.now();
            })
            // Member status
>>>>>>> newdb1
            .addCase(updateMemberStatus.fulfilled, (state, action) => {
                const updatedMember = action.payload;
                const index = state.members.findIndex(m => m.id === updatedMember.id);
                if (index !== -1) {
                    state.members[index] = updatedMember;
                }
<<<<<<< HEAD
            })
=======
                
                // Also update in teams if present
                state.teams.forEach(team => {
                    const memberIndex = team.members.findIndex(m => m.id === updatedMember.id);
                    if (memberIndex !== -1) {
                        team.members[memberIndex] = {
                            ...team.members[memberIndex],
                            status: updatedMember.status
                        };
                    }
                });
            })
            // Member profile
>>>>>>> newdb1
            .addCase(updateMemberProfile.fulfilled, (state, action) => {
                const updatedMember = action.payload;
                const index = state.members.findIndex(m => m.id === updatedMember.id);
                if (index !== -1) {
                    state.members[index] = updatedMember;
                }
<<<<<<< HEAD
            })
=======
                
                // Also update in teams if present
                state.teams.forEach(team => {
                    const memberIndex = team.members.findIndex(m => m.id === updatedMember.id);
                    if (memberIndex !== -1) {
                        team.members[memberIndex] = {
                            ...team.members[memberIndex],
                            ...updatedMember
                        };
                    }
                });
            })
            // Team creation
>>>>>>> newdb1
            .addCase(createTeam.pending, (state) => {
                state.loading = true;
            })
            .addCase(createTeam.fulfilled, (state, action) => {
                state.loading = false;
                state.teams.push(action.payload);
<<<<<<< HEAD
=======
                // Reset teams cache time to force re-fetch
                state.lastCacheTimes.teams = 0;
>>>>>>> newdb1
            })
            .addCase(createTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
<<<<<<< HEAD
            .addCase(generateTeamInviteLink.fulfilled, (state, action) => {
                // İsteğe bağlı olarak state'i güncelleyebilirsiniz
            })
            .addCase(joinTeamWithInviteLink.fulfilled, (state, action) => {
                // Takıma katılma başarılı olduğunda teams listesini güncelle
                fetchTeams();
            })
=======
            // Team list
>>>>>>> newdb1
            .addCase(fetchTeams.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchTeams.fulfilled, (state, action) => {
                state.loading = false;
<<<<<<< HEAD
                state.teams = action.payload;
            })
            .addCase(fetchTeams.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Bir hata oluştu';
            })
=======
                
                // Process team data and ensure all members have default values
                const teamsWithDefaults = action.payload.map((team: Team) => {
                    // Process members in each team
                    const updatedMembers = team.members.map((member: TeamMember) => ({
                        ...member,
                        // Değerler artık enrichedTeams işlemi sırasında eklendi, burada yalnızca boş olanlar için varsayılan değerler ekleniyor
                        profileImage: member.profileImage || null,
                        performanceScore: typeof member.performanceScore === 'number' ? member.performanceScore : 50,
                        onlineStatus: member.onlineStatus || 'online',
                        expertise: member.expertise || [],
                        completedTasksCount: member.completedTasksCount || 0,
                        department: member.department || 'Genel',
                        role: member.role || 'Member'
                    }));
                    
                    return {
                        ...team,
                        members: updatedMembers,
                        // Backend'de CreatedById olarak gelen değeri createdBy ile eşleştir
                        createdBy: team.createdById || team.createdBy
                    };
                });
                
                state.teams = teamsWithDefaults;
                state.lastCacheTimes.teams = Date.now();
            })
            .addCase(fetchTeams.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Team deletion
>>>>>>> newdb1
            .addCase(deleteTeam.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteTeam.fulfilled, (state, action) => {
                state.loading = false;
                // Takımı listeden çıkar
                state.teams = state.teams.filter(team => team.id !== action.payload.teamId);
<<<<<<< HEAD
=======
                // Reset teams cache time
                state.lastCacheTimes.teams = 0;
>>>>>>> newdb1
            })
            .addCase(deleteTeam.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
<<<<<<< HEAD
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
=======
            // Team members by team ID
            .addCase(getTeamMembersByTeamId.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getTeamMembersByTeamId.fulfilled, (state, action) => {
                state.loading = false;
                
                // action.meta.arg içinde teamId bulunur (ilk parametredir)
                const teamId = action.meta.arg;
                
                if (action.payload && action.payload.length > 0) {
                    // teamId'yi kullanarak doğru takımı bul
                    const team = state.teams.find(t => t.id === teamId);
                    if (team) {
                        // Takımın üyelerini API yanıtıyla güncelle
                        team.members = action.payload;
                    }
                }
            })
            .addCase(getTeamMembersByTeamId.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Member performance
            .addCase(getMemberPerformance.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getMemberPerformance.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    state.performanceScores[action.meta.arg] = action.payload;
                }
            })
            .addCase(getMemberPerformance.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload as string;
            })
            // Update member performance
            .addCase(updateMemberPerformance.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateMemberPerformance.fulfilled, (state, action) => {
                state.loading = false;
                if (action.payload) {
                    state.performanceScores[action.meta.arg] = action.payload;
                }
            })
            .addCase(updateMemberPerformance.rejected, (state, action) => {
>>>>>>> newdb1
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