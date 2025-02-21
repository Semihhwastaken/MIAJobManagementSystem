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

    private constructor() {
        
        
        // Chat Hub bağlantısı
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5193/chatHub", {
                accessTokenFactory: () => localStorage.getItem('token') || ''
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Notification Hub bağlantısı
        this.notificationHubConnection = new signalR.HubConnectionBuilder()
            .withUrl("http://localhost:5193/notificationHub", {
                accessTokenFactory: () => localStorage.getItem('token') || ''
            })
            .withAutomaticReconnect()
            .configureLogging(signalR.LogLevel.Information)
            .build();

        // Chat event listeners
        this.hubConnection.on("ReceiveMessage", (message: Message) => {
            this.messageCallbacks.forEach(callback => callback(message));
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

            // Chat Hub bağlantısı
            if (this.hubConnection.state === signalR.HubConnectionState.Disconnected) {
                await this.hubConnection.start();
                console.log("Chat Hub Connected!");
                await this.hubConnection.invoke("RegisterUser", userId);
            }

            // Notification Hub bağlantısı
            if (this.notificationHubConnection.state === signalR.HubConnectionState.Disconnected) {
                await this.notificationHubConnection.start();
                console.log("Notification Hub Connected!");
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
                console.log("Chat Hub Disconnected!");
            }
            if (this.notificationHubConnection.state === signalR.HubConnectionState.Connected) {
                await this.notificationHubConnection.stop();
                console.log("Notification Hub Disconnected!");
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

    // Notification Methods
    onReceiveNotification(callback: (notification: Notification) => void): void {
        this.notificationHubConnection.on("ReceiveNotification", callback);
    }

    async sendTestNotification(): Promise<void> {
        if (!this.userId) throw new Error("User not authenticated");
        await this.notificationHubConnection.invoke("SendTestNotification", this.userId);
    }
}

export default SignalRService;
