// 기존 LocalStorage 훅 (백업용)
export {
  useLocalStorage,
  useMonthlyTodos,
  useDailyTodos,
} from './useTodos';

// Firestore 훅 (새로운 기능)
export {
  useFirestoreMonthlyTodos,
  useFirestoreDailyTodos,
  useSharing,
  useUserProfile,
  useAuthState,
  initializeFirestoreDB,
  getFirestoreDB,
} from './useFirestoreTodos';

// Auth 훅
export { useAuth, useAuthContext } from './useAuth';
export type { AuthContextType } from '../contexts/AuthContext';

// 타입
export type {
  FirestoreTodoHookReturn,
  SharingHookReturn,
  UserProfileHookReturn,
} from './useFirestoreTodos.types';
