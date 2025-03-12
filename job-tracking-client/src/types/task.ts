export interface User {
    _id?: string; // MongoDB format
    username?: string;
    email?: string;
    fullName?: string;
    department?: string;
    title?: string;
    position?: string;
    profileImage?: string;
}

export interface SubTask {
    _id?: string; // MongoDB format
    title: string;
    completed: boolean;
    completedDate?: Date | null;
    assignedUserId?: string | null;
}

export interface Attachment {
    _id?: string; // MongoDB format
    fileName: string;
    fileUrl: string;
    fileType: string;
    uploadDate: string;
}

export interface Comment {
    _id?: string; // MongoDB format
    userId: string;
    userName: string;
    userProfileImage?: string;
    text: string;
    createdAt: string;
    updatedAt?: string;
}

export interface HistoryItem {
    id?: string;
    action: string;
    userId?: string;
    userName?: string;
    details?: string;
    timestamp: string;
}

export interface Creator {
    _id?: string; // MongoDB format
    username: string;
    fullName: string;
    profileImage: string | null;
}

export interface Task {
    _id?: string; // MongoDB format
    title: string;
    description: string;
    status: 'todo' | 'in-progress' | 'completed' | 'overdue';
    priority: 'low' | 'medium' | 'high';
    category: string;
    dueDate: string | { $date: string }; // Support both formats
    isLocked?: boolean;
    teamId?: string;
    assignedUsers: User[];
    assignedUserIds?: string[]; // Added to match MongoDB structure
    subTasks: SubTask[];
    dependencies: string[]; // Bağımlı olduğu task ID'leri
    attachments: Attachment[];
    comments?: Comment[]; // Added to match MongoDB structure
    history?: HistoryItem[]; // Added to match MongoDB structure
    createdAt: string | { $date: string }; // Support both formats
    createdBy?: Creator; // Added to match MongoDB structure
    updatedAt: string | { $date: string }; // Support both formats
    completedDate?: Date | null;
    assignedJobs?: string[]; // Added to match MongoDB structure
}

// MongoDB verilerini API formatına dönüştürmek için yardımcı fonksiyon
export function normalizeTaskData(task: any): Task {
    return {
        _id: task._id?.$oid || task._id || task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        category: task.category,
        dueDate: task.dueDate?.$date || task.dueDate,
        isLocked: task.isLocked,
        teamId: task.teamId,
        assignedUsers: task.assignedUsers?.map((user: any) => ({
            id: user._id || user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            department: user.department,
            title: user.title,
            position: user.position,
            profileImage: user.profileImage
        })) || [],
        assignedUserIds: task.assignedUserIds,
        subTasks: task.subTasks?.map((subTask: any) => ({
            id: subTask._id || subTask.id,
            title: subTask.title,
            completed: subTask.completed,
            completedDate: subTask.completedDate,
            assignedUserId: subTask.assignedUserId
        })) || [],
        dependencies: task.dependencies || [],
        attachments: task.attachments || [],
        comments: task.comments || [],
        history: task.history || [],
        createdAt: task.createdAt?.$date || task.createdAt,
        createdBy: task.createdBy ? {
            _id: task.createdBy._id || task.createdBy.id,
            username: task.createdBy.username,
            fullName: task.createdBy.fullName,
            profileImage: task.createdBy.profileImage
        } : undefined,
        updatedAt: task.updatedAt?.$date || task.updatedAt,
        completedDate: task.completedDate,
        assignedJobs: task.assignedJobs || []
    };
}

export type NewTask = Omit<Task, 'id' | '_id' | 'createdAt' | 'updatedAt'>;