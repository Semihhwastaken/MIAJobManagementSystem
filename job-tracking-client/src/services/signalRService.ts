import * as signalR from "@microsoft/signalr";
import { Message } from "../types/message";
import { Notification } from "../types/notification";

class SignalRService {
    private hubConnection: signalR.HubConnection;
    private notificationHubConnection: signalR.HubConnection;
    private static instance: SignalRService;
    private userId: string | null = null;
    private messageCallbacks: ((message: Message) => void)[] = [];
    private typingCallbacks: ((userId: string) => void)[] = [];
    private stoppedTypingCallbacks: ((userId: string) => void)[] = [];
    private messageReadCallbacks: ((messageId: string) => void)[] = [];
    private userConnectedCallbacks: ((userId: string) => void)[] = [];
    private userDisconnectedCallbacks: ((userId: string) => void)[] = [];

    private constructor() {
        // Chat Hub bağlantısı
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl("/chatHub", {
                accessTokenFactory: () => localStorage.getItem('token') || ''
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information) // Changed from Information to Warning
            .build();

        // Notification Hub bağlantısı
        this.notificationHubConnection = new signalR.HubConnectionBuilder()
            .withUrl("/notificationHub", {
                accessTokenFactory: () => localStorage.getItem('token') || ''
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information) // Changed from Information to Warning
            .build();

        // Chat event listeners
        this.hubConnection.on("ReceiveMessage", (message: Message) => {
            this.messageCallbacks.forEach(callback => callback(message));
        });

        this.hubConnection.on("UserConnected", (userId: string) => {
            this.userConnectedCallbacks.forEach(callback => callback(userId));
        });

        this.hubConnection.on("UserDisconnected", (userId: string) => {
            this.userDisconnectedCallbacks.forEach(callback => callback(userId));
        });

        this.hubConnection.on("UserIsTyping", (userId: string) => {
            this.typingCallbacks.forEach(callback => callback(userId));
        });

        this.hubConnection.on("UserStoppedTyping", (userId: string) => {
            this.stoppedTypingCallbacks.forEach(callback => callback(userId));
        });

        this.hubConnection.on("MessageRead", (messageId: string) => {
            this.messageReadCallbacks.forEach(callback => callback(messageId));
        });

        // Changed to only log actual errors
        this.hubConnection.on("ErrorOccurred", (error: string) => {
            console.error("SignalR Error:", error);
        });
    }

    public static getInstance(): SignalRService {
        if (!SignalRService.instance) {
            SignalRService.instance = new SignalRService();
        }
        return SignalRService.instance;
    }

    async startConnection(userId: string): Promise<void> {
        try {
            this.userId = userId;

            // Start Chat Hub connection
            if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
                await this.hubConnection.start();
            }

            // Start Notification Hub connection
            if (this.notificationHubConnection.state === signalR.HubConnectionState.Disconnected) {
                await this.notificationHubConnection.start();
            }
        } catch (err) {
            console.error("Error while establishing connection: ", err);
            throw err;
        }
    }

    async stopConnection(): Promise<void> {
        try {
            if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
                await this.hubConnection.stop();
            }
            if (this.notificationHubConnection.state === signalR.HubConnectionState.Connected) {
                await this.notificationHubConnection.stop();
            }
        } catch (err) {
            console.error("Error while stopping connection: ", err);
            throw err;
        }
    }

    // Chat Methods
    async sendMessage(receiverId: string, content: string): Promise<void> {
        if (!this.userId) throw new Error("User not authenticated");
        await this.hubConnection.invoke("SendDirectMessage", this.userId, receiverId, content);
    }

    async markMessageAsRead(messageId: string): Promise<void> {
        await this.hubConnection.invoke("MarkMessageAsRead", messageId);
    }

    async sendTypingIndicator(receiverId: string): Promise<void> {
        if (!this.userId) throw new Error("User not authenticated");
        await this.hubConnection.invoke("IsTyping", this.userId, receiverId);
    }

    async sendStoppedTypingIndicator(receiverId: string): Promise<void> {
        if (!this.userId) throw new Error("User not authenticated");
        await this.hubConnection.invoke("StoppedTyping", this.userId, receiverId);
    }

    // Public methods for message handling
    public addMessageCallback(callback: (message: Message) => void): void {
        this.messageCallbacks.push(callback);
    }

    public removeMessageCallback(callback: (message: Message) => void): void {
        const index = this.messageCallbacks.indexOf(callback);
        if (index > -1) {
            this.messageCallbacks.splice(index, 1);
        }
    }

    public addTypingCallback(callback: (userId: string) => void): void {
        this.typingCallbacks.push(callback);
    }

    public removeTypingCallback(callback: (userId: string) => void): void {
        const index = this.typingCallbacks.indexOf(callback);
        if (index > -1) {
            this.typingCallbacks.splice(index, 1);
        }
    }

    public addStoppedTypingCallback(callback: (userId: string) => void): void {
        this.stoppedTypingCallbacks.push(callback);
    }

    public removeStoppedTypingCallback(callback: (userId: string) => void): void {
        const index = this.stoppedTypingCallbacks.indexOf(callback);
        if (index > -1) {
            this.stoppedTypingCallbacks.splice(index, 1);
        }
    }

    // Event Listeners
    onReceiveMessage(callback: (message: Message) => void): void {
        this.messageCallbacks.push(callback);
    }

    onUserTyping(callback: (userId: string) => void): void {
        this.typingCallbacks.push(callback);
    }

    onUserStoppedTyping(callback: (userId: string) => void): void {
        this.stoppedTypingCallbacks.push(callback);
    }

    onMessageRead(callback: (messageId: string) => void): void {
        this.messageReadCallbacks.push(callback);
    }

    onUserConnected(callback: (userId: string) => void): void {
        this.userConnectedCallbacks.push(callback);
    }

    onUserDisconnected(callback: (userId: string) => void): void {
        this.userDisconnectedCallbacks.push(callback);
    }

    // Notification Methods
    onReceiveNotification(callback: (notification: Notification) => void): void {
        console.log("SignalR: Bildirim dinleyicisi eklendi");
        console.log("SignalR bağlantı durumu:", this.notificationHubConnection.state);

        
        this.notificationHubConnection.on("ReceiveNotification", (notification) => {
            console.log("SignalR: Yeni bildirim alındı ->", notification);
            callback(notification);
        });
    }

    async sendTestNotification(): Promise<void> {
        if (!this.userId) throw new Error("User not authenticated");
        await this.notificationHubConnection.invoke("SendTestNotification", this.userId);
    }
}

export default SignalRService;
