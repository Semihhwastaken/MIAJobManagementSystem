export interface User {
    id?: string;
    username: string;
    email: string;
    fullName?: string;
    department?: string;
    title?: string;
    position?: string;
    profileImage?: string;
}

export interface SubTask {
    id?: string;  // Make ID optional
    title: string;
    completed: boolean;
    completedDate: string | null; // Changed from Date to string | null
    AssignedUserId: string | null;
}

export interface Attachment {
    id?: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadDate: string;
}

export interface Task {
    id?: string;  // Make ID optional
    title: string;
    description: string;
    dueDate: string;
    priority: 'low' | 'medium' | 'high';
    status: 'todo' | 'in-progress' | 'completed' | 'overdue';
    category: string;
    assignedUsers: User[];
    assignedUserIds: string[];
    subTasks: SubTask[];
    dependencies: string[];
    attachments: Attachment[];
    teamId?: string;
    createdAt: string;
    updatedAt: string;
    completedDate: string | null;  // Update this line to allow null
    isLocked: boolean;
}

export type NewTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;