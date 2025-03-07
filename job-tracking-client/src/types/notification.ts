export interface Notification {
    id?: string;
    userId: string;
    title: string;
    message: string;
<<<<<<< HEAD
    type: 'info' | 'success' | 'warning' | 'error' | string;
=======
    type: string;
>>>>>>> newdb1
    relatedJobId?: string | null;
    isRead: boolean;
    createdDate: string;
    link?: string;
}
