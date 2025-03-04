export interface User {
  id: string;
  username?: string;
  fullName?: string;
  email?: string;
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
    id: string;
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
    id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    dueDate: string;
    completedDate?: string;
    teamId: string;
    attachments: TaskAttachment[];
    assignedUsers: AssignedUser[];
    subTasks: SubTask[];
    dependencies: string[];
    isLocked: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy?: UserReference;
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