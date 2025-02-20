export interface LoginRequest {
    username: string;
    password: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    message: string;
    token?: string;
    error?: string;
    user?: {
        id: string;
        username: string;
        email: string;
    };
}
