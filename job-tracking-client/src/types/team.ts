export interface TeamMember {
    id: string;
    username: string;
    email: string;
    fullName: string;
    department: string;
    title?: string;
    position?: string;
    profileImage?: string;
    role: string;
    status: string;
    onlineStatus: string;
    assignedJobs: string[];
    experties?: string[];
}

export interface TeamState {
    members: TeamMember[];
    teams: Team[];
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
    activeTasksData: {
        [key: string]: {
            totalActiveTasks: number;
            todoTasks: number;
            inProgressTasks: number;
            isBusy: boolean;
        };
    };
    performanceScores: Record<string, any>; // Add performanceScores property
    lastCacheTimes: {
        members: number;
        teams: number;
        departments: number;
    };
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
    description: string;
    createdById: string;
    createdAt: string;
    updatedAt: string;
    departments: DepartmentStats[];
    members: TeamMember[];
    inviteLink?: string;
    inviteCode?: string;
}

export interface PerformanceScore {
    id: string;
    userId: string;
    teamId: string;
    taskCompletion: number;
    taskDeadlineMet: number;
    taskQuality: number;
    collaborationScore: number;
    overallScore: number;
    lastUpdated: string;
    completedTasks: number;
    ongoingTasks: number;
}