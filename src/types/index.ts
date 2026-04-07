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
