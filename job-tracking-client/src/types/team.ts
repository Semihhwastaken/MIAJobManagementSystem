export interface TeamMember {
    id: string;
    username: string;
    email: string;
    fullName: string;
    department: string;
    assignedJobs: string[];
}

export interface TeamState {
    members: TeamMember[];
    departments: string[];
    loading: boolean;
    error: string | null;
}
