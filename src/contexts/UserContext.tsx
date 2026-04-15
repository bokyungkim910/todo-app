import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import type { User, ViewMode } from '../types';

// UserContext 타입 정의
interface UserContextType {
  // 상태
  currentUser: User | null;
  viewingUser: User | null;
  viewMode: ViewMode;
  isReadOnly: boolean;
  users: User[];

  // 액션
  setCurrentUser: (user: User) => void;
  switchUser: (userId: string) => void;
  returnToOwn: () => void;
  setViewMode: (mode: ViewMode) => void;
  updateUserProfile: (updates: Partial<User>) => void;
  logout: () => void;
  addUser: (userData: Omit<User, 'id'>) => void;
  removeUser: (userId: string) => void;
}

// Context 생성
const UserContext = createContext<UserContextType | null>(null);

// localStorage 키
const STORAGE_KEYS = {
  CURRENT_USER: 'todo-app-current-user',
  USERS: 'todo-app-users',
  VIEWING_USER: 'todo-app-viewing-user',
  VIEW_MODE: 'todo-app-view-mode',
};

// Mock 사용자 데이터 (초기 데이터) - Firebase Auth 사용으로 인해 실제로는 사용되지 않음
const MOCK_USERS: User[] = [
  { uid: '1', email: 'user1@example.com', nickname: '나', color: '#3B82F6' },
  { uid: '2', email: 'user2@example.com', nickname: '엄마', color: '#EC4899' },
  { uid: '3', email: 'user3@example.com', nickname: '아빠', color: '#10B981' },
];

// Provider 컴포넌트
interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  // 상태 초기화 (localStorage에서 로드)
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return stored ? JSON.parse(stored) : MOCK_USERS[0];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.USERS);
    return stored ? JSON.parse(stored) : MOCK_USERS;
  });

  const [viewingUser, setViewingUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.VIEWING_USER);
    if (stored) {
      const userId = stored;
      const allUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]') as User[];
      return allUsers.find(u => u.id === userId) || null;
    }
    return null;
  });

  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.VIEW_MODE);
    return (stored as ViewMode) || 'edit';
  });

  // Derived state: 읽기 전용 여부
  const isReadOnly = useMemo(() => {
    if (!viewingUser) return false;
    if (!currentUser) return true;
    return viewingUser.id !== currentUser.id;
  }, [viewingUser, currentUser]);

  // localStorage 동기화
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (viewingUser) {
      localStorage.setItem(STORAGE_KEYS.VIEWING_USER, viewingUser.id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.VIEWING_USER);
    }
  }, [viewingUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VIEW_MODE, viewMode);
  }, [viewMode]);

  // 액션 함수들
  const setCurrentUser = useCallback((user: User) => {
    setCurrentUserState(user);
    // 현재 사용자가 변경되면 viewingUser도 리셋
    setViewingUser(null);
    setViewModeState('edit');
  }, []);

  const switchUser = useCallback((userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (targetUser) {
      if (targetUser.id === currentUser?.id) {
        // 자신을 선택하면 viewingUser 리셋
        setViewingUser(null);
        setViewModeState('edit');
      } else {
        // 다른 사용자를 선택하면 view 모드로 전환
        setViewingUser(targetUser);
        setViewModeState('view');
      }
    }
  }, [users, currentUser]);

  const returnToOwn = useCallback(() => {
    setViewingUser(null);
    setViewModeState('edit');
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
  }, []);

  const updateUserProfile = useCallback((updates: Partial<User>) => {
    if (currentUser) {
      const updated = { ...currentUser, ...updates };
      setCurrentUserState(updated);
      // users 배열에서도 업데이트
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    }
  }, [currentUser]);

  const logout = useCallback(() => {
    setCurrentUserState(null);
    setViewingUser(null);
    setViewModeState('edit');
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.VIEWING_USER);
  }, []);

  const addUser = useCallback((userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`,
    };
    setUsers(prev => [...prev, newUser]);
  }, []);

  const removeUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
    // 현재 보고 있는 사용자가 삭제되면 리셋
    if (viewingUser?.id === userId) {
      setViewingUser(null);
      setViewModeState('edit');
    }
    // 현재 사용자가 삭제되면 로그아웃
    if (currentUser?.id === userId) {
      logout();
    }
  }, [viewingUser, currentUser, logout]);

  // Context 값
  const value = useMemo(() => ({
    currentUser,
    viewingUser,
    viewMode,
    isReadOnly,
    users,
    setCurrentUser,
    switchUser,
    returnToOwn,
    setViewMode,
    updateUserProfile,
    logout,
    addUser,
    removeUser,
  }), [
    currentUser,
    viewingUser,
    viewMode,
    isReadOnly,
    users,
    setCurrentUser,
    switchUser,
    returnToOwn,
    setViewMode,
    updateUserProfile,
    logout,
    addUser,
    removeUser,
  ]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook
export function useUserContext(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  return context;
}

export default UserContext;
