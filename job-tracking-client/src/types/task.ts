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
    id?: string;
    title: string;
    completed: boolean;
}

export interface Attachment {
    id?: string;
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadDate: string;
}

export interface Task {
    id?: string;
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'completed' | 'overdue';
    priority: 'low' | 'medium' | 'high';
    category: string;
    dueDate: string;
    isLocked?: boolean;
    teamId?: string;
    assignedUsers: User[];
    subTasks: SubTask[];
    dependencies: string[]; // Bağımlı olduğu task ID'leri
    attachments: Attachment[];
    createdAt: string;
    updatedAt: string;
    completedDate?: Date | null;
}

export type NewTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;