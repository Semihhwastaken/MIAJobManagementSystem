export interface TeamMember {
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
    members: TeamMember[];
    departments: string[];
    departmentProjects: {
        [key: string]: {
            totalProjects: number;
            completedProjects: number;
            ongoingProjects: number;
        };
    };
    loading: boolean;
    error: string | null;
    searchQuery: string;
    filters: {
        status: string[];
        expertise: string[];
        department: string[];
    };
    sortBy: 'name' | 'performance' | 'tasks' | 'seniority';
    sortOrder: 'asc' | 'desc';
}

export interface DepartmentStats {
    name: string;
    memberCount: number;
    completedTasks: number;
    ongoingTasks: number;
    performance: number;
}

export interface Team {
    id: string;
    name: string;
    createdBy: string;
    inviteLink?: string;
    members: TeamMember[];
    createdAt: string;
}