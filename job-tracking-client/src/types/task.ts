export interface User {
    id: string;
    fullName?: string;
    username?: string;
    email?: string;
    department?: string;
    title?: string;
    position?: string;
    profileImage?: string;
}

export interface AssignedUser {
    id: string;
    username: string;
    email: string;
    fullName: string;
    department: string;
    title?: string;
    position?: string;
    profileImage?: string;
}

export interface TaskAttachment {
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadDate: string;
}

export interface SubTask {
    id: string;
    title: string;
    completed: boolean;
    completedDate?: string;
    assignedUserId?: string;
}

export interface UserReference {
    id: string;
    username: string;
    fullName: string;
    profileImage?: string;
}

export interface Task {
    id?: string;
    title: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    status: 'todo' | 'in-progress' | 'completed' | 'overdue';
    category: string;
    assignedUsers: User[];
    subTasks: { id?: string; title: string; completed: boolean }[];
    dependencies: string[];
    attachments: { fileName: string; fileUrl: string; fileType: string; uploadDate: string }[];
    teamId?: string;
    createdAt: string;
    updatedAt: string;
    completedDate: Date;
    isLocked?: boolean;
}

export interface TaskComment {
    id: string;
    taskId: string;
    content: string;
    createdAt: string;
    user: UserReference;
}

export interface TaskHistoryDto {
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    dueDate: string;
    assignedUsers: { id: string; fullName: string }[];
}