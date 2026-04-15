export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate: string;
  category: string;
  createdAt: number;
  order: number;
  goalType: 'monthly' | 'weekly';
}

export interface FilterState {
  status: 'all' | 'completed' | 'active';
  category: string;
  searchQuery: string;
  sortBy: 'order' | 'dueDate' | 'priority';
}

export type Priority = 'high' | 'medium' | 'low';

// 사용자 관련 타입
export interface User {
  uid: string;
  email: string;
  nickname: string;
  createdAt: number;
}

export interface SharedUser {
  uid: string;
  nickname: string;
  email: string;
  sharedAt: number;
  status: 'active' | 'pending';
  isOwner?: boolean;
}

export interface ShareInvite {
  id: string;
  inviterId: string;
  inviterEmail: string;
  inviterNickname: string;
  inviteeId?: string;
  inviteeEmail?: string;
  invitedAt?: number;
  createdAt?: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export type ViewMode = 'edit' | 'view';

export interface UserState {
  currentUser: User | null;
  viewingUser: User | null;
  viewMode: ViewMode;
}
