export interface TeamMember {
    userId: string;
    role: string;
    joinDate: string;
    status: 'active' | 'inactive' | 'pending';
}

export interface Team {
    id: string;
    username: string;
    email: string;
    fullName: string;
    department: string;
    role: 'Owner' | 'Master' | 'Member';
    assignedJobs: string[];
    // Yeni eklenecek alanlar
    profileImage?: string;
    expertise: string[];
    phone?: string;
    status: 'available' | 'busy' | 'away' | 'offline';
    completedTasksCount: number;
    performanceScore: number;
    onlineStatus: 'online' | 'offline';
    availabilitySchedule?: {
        startTime: string;
        endTime: string;
    };
    joinedAt: string;
}

export interface TeamState {
    leadingTeams: Team[];
    memberTeams: Team[];
    allTeams: Team[];
    departments: string[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    filters: {
        status: string[];
        department: string[];
    };
    sortBy: 'name' | 'members' | 'created';
    sortOrder: 'asc' | 'desc';
}

export interface DepartmentStats {
    departmentName: string;
    memberCount: number;
    completedTaskCount: number;
    averagePerformance: number;
}

export interface Team {
    id: string;
    name: string;
    createdBy: string;
    inviteLink?: string;
    members: TeamMember[];
    createdAt: string;
}
