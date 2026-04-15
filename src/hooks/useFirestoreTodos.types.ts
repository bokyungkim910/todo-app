import type { Todo } from '../types';

/**
 * Firestore Todo Hook 반환 타입
 */
export interface FirestoreTodoHookReturn {
  /** 현재 할 일 목록 */
  todos: Todo[];
  /** 데이터 로딩 상태 */
  loading: boolean;
  /** 에러 객체 (발생 시) */
  error: Error | null;
  /** 데이터 접근 권한 여부 */
  hasPermission: boolean;
  /** 읽기 전용 모드 여부 */
  isReadOnly: boolean;
  /** 할 일 추가 */
  addTodo: (text: string, options?: Partial<Todo>) => Promise<void>;
  /** 할 일 완료 토글 */
  toggleTodo: (id: string) => Promise<void>;
  /** 할 일 수정 */
  editTodo: (id: string, updates: Partial<Todo>) => Promise<void>;
  /** 할 일 삭제 */
  deleteTodo: (id: string) => Promise<void>;
  /** 할 일 순서 변경 */
  reorderTodos: (newOrder: Todo[]) => Promise<void>;
}

/**
 * 공유 설정 Hook 반환 타입
 */
export interface SharingHookReturn {
  /** 공유된 사용자 ID 목록 */
  sharedUsers: string[];
  /** 데이터 로딩 상태 */
  loading: boolean;
  /** 에러 객체 (발생 시) */
  error: Error | null;
  /** 사용자와 공유 */
  shareWithUser: (userId: string) => Promise<void>;
  /** 사용자와 공유 해제 */
  unshareWithUser: (userId: string) => Promise<void>;
}

/**
 * 사용자 프로필 Hook 반환 타입
 */
export interface UserProfileHookReturn {
  /** 사용자 프로필 정보 */
  profile: {
    displayName?: string;
    email?: string;
    photoURL?: string;
    createdAt?: number;
  } | null;
  /** 데이터 로딩 상태 */
  loading: boolean;
  /** 에러 객체 (발생 시) */
  error: Error | null;
  /** 프로필 업데이트 */
  updateProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<void>;
}

/**
 * 인증 상태 Hook 반환 타입
 */
export interface AuthStateHookReturn {
  /** 현재 인증된 사용자 */
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  } | null;
  /** 인증 상태 로딩 중 */
  loading: boolean;
}

/**
 * Firestore Todo Hook 옵션
 */
export interface FirestoreTodoOptions {
  /** 조회할 대상 사용자 ID (공유 데이터 조회 시) */
  targetUserId?: string;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
}
