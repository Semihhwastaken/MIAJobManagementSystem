export interface User {
    id?: string;
    name: string;
    email: string;
    avatar?: string;
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
    status: 'todo' | 'in-progress' | 'completed';
    priority: 'low' | 'medium' | 'high';
    dueDate: string;
    assignedUsers: User[];
    subTasks: SubTask[];
    dependencies: string[]; // Bağımlı olduğu task ID'leri
    attachments: Attachment[];
    createdAt: string;
    updatedAt: string;
}

export type NewTask = Omit<Task, 'id' | 'createdAt' | 'updatedAt'>;

// Mock kullanıcı verileri
export const mockUsers: User[] = [
    { id: '1', name: 'Ahmet Yılmaz', email: 'ahmet@example.com', avatar: 'https://i.pravatar.cc/150?u=1' },
    { id: '2', name: 'Mehmet Demir', email: 'mehmet@example.com', avatar: 'https://i.pravatar.cc/150?u=2' },
    { id: '3', name: 'Ayşe Kaya', email: 'ayse@example.com', avatar: 'https://i.pravatar.cc/150?u=3' },
];
