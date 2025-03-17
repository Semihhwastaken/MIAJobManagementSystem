export enum FeedbackStatus {
  New = 0,
  Read = 1,
  Responded = 2,
  Archived = 3
}

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
  lastUpdated: Date;
  isRead: boolean;
}

export interface FeedbackStats {
  total: number;
  newCount: number;
  respondedCount: number;
  archivedCount: number;
  averageRating: number;
}
