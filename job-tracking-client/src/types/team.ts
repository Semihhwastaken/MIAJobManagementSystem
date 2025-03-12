/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TeamMember {
    id: string;
    username: string;
    email: string;
    fullName: string;
    department: string;
    role: string;
    assignedJobs: string[];
    profileImage?: string;
    expertise: string[];
    phone?: string;
    status: string;
    completedTasksCount: number;
    performanceScore: number;
    onlineStatus: string;
    availabilitySchedule?: {
        startTime: string;
        endTime: string;
    };
    joinedAt: string;
    title?: string;
    position?: string;
    metrics?: any;
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
    createdBy: string;
    memberIds: string[];
    createdById?: string;
    inviteLink?: string;
    inviteCode?: string;
    description?: string;
    members: TeamMember[];
    createdAt: string;
    status?: string;
}