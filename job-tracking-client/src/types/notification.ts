export interface Notification {
    id?: string;
    userId: string;
    title: string;
    message: string;
    type: string;
    relatedJobId?: string | null;
    isRead: boolean;
    createdDate: string;
    link?: string;
}
