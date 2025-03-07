export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
    fullName: string;
    department: string;
    title: string;
    phone: string;
    position: string;
    profileImage?: string;
}

export interface AuthResponse {
    message: string;
    token?: string;
    error?: string;
    user?: {
        id: string;
        username: string;
        email: string;
        fullName: string;
        department: string;
        title: string;
        phone: string;
        position: string;
        profileImage?: string;
    };
}
