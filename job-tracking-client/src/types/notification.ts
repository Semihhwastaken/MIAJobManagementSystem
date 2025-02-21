export interface Notification {
    id?: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | string;
    relatedJobId?: string | null;
    isRead: boolean;
    createdDate: string;
    link?: string;
}
