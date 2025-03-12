/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Activity {
    id: string;
    type: 'user' | 'task' | 'team' | 'login' | 'system';
    description: string;
    userId: string;
    timestamp: string;
    metadata?: Record<string, any>;
}
