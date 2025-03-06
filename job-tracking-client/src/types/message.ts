export interface Attachment {
    url: string;
    fileName?: string;
    fileType?: string;
}

export interface Message {
    id?: string;
    senderId: string;
    receiverId: string;
    content: string;
    subject?: string;
    sentAt: Date;
    isRead: boolean;
    senderName?: string;
    receiverName?: string;
    attachments?: Attachment[];
}

export interface MessageResponse extends Message {
    senderName: string;
    receiverName: string;
}
