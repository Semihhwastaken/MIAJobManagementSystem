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
}

export interface MessageResponse extends Message {
    senderName: string;
    receiverName: string;
}
