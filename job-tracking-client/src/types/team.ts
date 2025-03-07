<<<<<<< HEAD
=======
/* eslint-disable @typescript-eslint/no-explicit-any */
>>>>>>> newdb1
export interface TeamMember {
    id: string;
    username: string;
    email: string;
    fullName: string;
    department: string;
<<<<<<< HEAD
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
=======
    role: string;
    assignedJobs: string[];
    profileImage?: string;
    expertise: string[];
    phone?: string;
    status: string;
    completedTasksCount: number;
    performanceScore: number;
    onlineStatus: string;
>>>>>>> newdb1
    availabilitySchedule?: {
        startTime: string;
        endTime: string;
    };
    joinedAt: string;
<<<<<<< HEAD
=======
    title?: string;
    position?: string;
    metrics?: any;
>>>>>>> newdb1
}

export interface TeamState {
    members: TeamMember[];
<<<<<<< HEAD
=======
    teams: Team[];
>>>>>>> newdb1
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
<<<<<<< HEAD
=======
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
>>>>>>> newdb1
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
<<<<<<< HEAD
    inviteLink?: string;
    members: TeamMember[];
    createdAt: string;
=======
    createdById?: string;
    inviteLink?: string;
    inviteCode?: string;
    description?: string;
    members: TeamMember[];
    createdAt: string;
    status?: string;
>>>>>>> newdb1
}