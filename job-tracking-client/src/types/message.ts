export interface Attachment {
    url: string;
    fileName?: string;
    fileType?: string;
}

export interface FileAttachment {
    fileName: string;
    filePath: string;
    contentType: string;
    fileSize: number;
}

export interface Message {
    id?: string;
    senderId: string;
    receiverId: string;
    content: string;
    subject?: string;
    sentAt: string;
    isRead: boolean;
    senderName?: string;
    receiverName?: string;
    attachments?: Attachment[];
    fileAttachment?: FileAttachment;
}

export interface MessageResponse extends Message {
    senderName: string;
    receiverName: string;
}
