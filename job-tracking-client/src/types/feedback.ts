export type FeedbackStatus = 'new' | 'read' | 'responded' | 'archived';

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  content: string;
  rating: number;
  isPublic: boolean;
  createdAt: Date;
  userAvatar?: string;
  status: FeedbackStatus;
  adminResponse?: string;
  respondedAt?: Date;
}

export interface FeedbackStats {
  total: number;
  newCount: number;
  respondedCount: number;
  archivedCount: number;
  averageRating: number;
}
