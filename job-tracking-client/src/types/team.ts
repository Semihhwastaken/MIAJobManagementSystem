export interface TeamMember {
    userId: string;
    role: string;
    joinDate: string;
    status: 'active' | 'inactive' | 'pending';
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    leaderId: string;
    createdAt: string;
    updatedAt?: string;
    members: TeamMember[];
    departments: string[];
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
