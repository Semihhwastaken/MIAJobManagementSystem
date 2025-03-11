export type FeedbackStatus = 'new' | 'read' | 'responded' | 'archived';

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  rating: number;
  isPublic: boolean;
  createdAt: string;
  userAvatar?: string;
  status: FeedbackStatus;
  adminResponse?: string;
}
