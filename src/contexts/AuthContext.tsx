import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  signInWithPopup,
  AuthError,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase/config';

// ============================================
// 타입 정의
// ============================================

export interface AuthContextType {
  /** 현재 로그인된 Firebase 사용자 */
  user: FirebaseUser | null;
  /** 인증 상태 로딩 중 */
  loading: boolean;
  /** 현재 진행 중인 작업 로딩 상태 */
  actionLoading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 이메일/비밀번호로 로그인 */
  login: (email: string, password: string) => Promise<void>;
  /** 이메일/비밀번호로 회원가입 (닉네임 포함) */
  register: (email: string, password: string, nickname: string) => Promise<void>;
  /** Google로 로그인 */
  loginWithGoogle: () => Promise<void>;
  /** 로그아웃 */
  logout: () => Promise<void>;
  /** 에러 초기화 */
  clearError: () => void;
  /** 사용자가 로그인되어 있는지 여부 */
  isAuthenticated: boolean;
}

// ============================================
// Context 생성
// ============================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// 에러 메시지 매핑
// ============================================

const ERROR_MESSAGES: Record<string, string> = {
  // 이메일/비밀번호 관련 에러
  'auth/invalid-email': '유효하지 않은 이메일 주소입니다.',
  'auth/user-disabled': '해당 계정이 비활성화되었습니다.',
  'auth/user-not-found': '등록되지 않은 이메일 주소입니다.',
  'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
  'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',

  // 회원가입 관련 에러
  'auth/email-already-in-use': '이미 사용 중인 이메일 주소입니다.',
  'auth/weak-password': '비밀번호는 최소 6자 이상이어야 합니다.',
  'auth/invalid-password': '비밀번호가 유효하지 않습니다.',

  // 네트워크/서버 관련 에러
  'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
  'auth/too-many-requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
  'auth/internal-error': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',

  // 기본 에러
  'auth/popup-closed-by-user': '로그인 창이 닫혔습니다.',
  'auth/cancelled-popup-request': '로그인 요청이 취소되었습니다.',
  'auth/popup-blocked': '팝업이 차단되었습니다. 팝업 차단을 해제해주세요.',
};

/**
 * Firebase Auth 에러 코드를 사용자 친화적인 메시지로 변환
 */
const getErrorMessage = (errorCode: string): string => {
  return ERROR_MESSAGES[errorCode] || '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.';
};

// ============================================
// Provider 컴포넌트
// ============================================

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthContext Provider 컴포넌트
 *
 * Firebase Authentication 상태를 관리하고 모든 자식 컴포넌트에 제공합니다.
 *
 * @example
 * ```tsx
 * // App.tsx
 * import { AuthProvider } from './contexts/AuthContext';
 *
 * function App() {
 *   return (
 *     <AuthProvider>
 *       <YourApp />
 *     </AuthProvider>
 *   );
 * }
 * ```
 */
export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 에러 상태를 초기화합니다.
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * 에러를 처리하고 상태를 설정합니다.
   */
  const handleError = useCallback((err: unknown) => {
    if (err && typeof err === 'object' && 'code' in err) {
      const authError = err as AuthError;
      setError(getErrorMessage(authError.code));
    } else if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('알 수 없는 오류가 발생했습니다.');
    }
  }, []);

  /**
   * 이메일과 비밀번호로 로그인합니다.
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        setActionLoading(true);
        setError(null);
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [handleError]
  );

  /**
   * 이메일과 비밀번호로 새 계정을 생성하고 닉네임을 설정합니다.
   */
  const register = useCallback(
    async (email: string, password: string, nickname: string): Promise<void> => {
      try {
        setActionLoading(true);
        setError(null);

        // 계정 생성
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        // 닉네임 설정
        await updateProfile(userCredential.user, {
          displayName: nickname,
        });

        // Firestore에 사용자 프로필 생성
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userDocRef, {
          email: email,
          nickname: nickname,
          createdAt: serverTimestamp(),
        });

        // 사용자 상태 업데이트 (displayName이 포함된 새로운 user 객체)
        setUser({ ...userCredential.user });
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setActionLoading(false);
      }
    },
    [handleError]
  );

  /**
   * Google로 로그인합니다.
   */
  const loginWithGoogle = useCallback(async (): Promise<void> => {
    try {
      setActionLoading(true);
      setError(null);

      const result = await signInWithPopup(auth, googleProvider);

      // Firestore에 프로필 자동 생성 (이미 있으면 무시)
      const userDocRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          email: result.user.email || '',
          nickname: result.user.displayName || result.user.email?.split('@')[0] || '사용자',
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [handleError]);

  /**
   * 로그아웃합니다.
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      setActionLoading(true);
      setError(null);
      await signOut(auth);
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  }, [handleError]);

  /**
   * 인증 상태 변경을 감시합니다.
   * 컴포넌트 언마운트 시 자동으로 구독을 해제합니다.
   */
  useEffect(() => {
    setLoading(true);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (currentUser) {
          // 사용자 프로필이 Firestore에 존재하는지 확인
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          // 프로필이 없으면 생성
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              email: currentUser.email || '',
              nickname: currentUser.displayName || currentUser.email?.split('@')[0] || '사용자',
              createdAt: serverTimestamp(),
            });
          }
        }
        setUser(currentUser);
        setLoading(false);
      },
      (err) => {
        handleError(err);
        setLoading(false);
      }
    );

    // 클린업 함수: 컴포넌트 언마운트 시 구독 해제
    return () => {
      unsubscribe();
    };
  }, [handleError]);

  // 메모이제이션된 컨텍스트 값
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      actionLoading,
      error,
      login,
      register,
      loginWithGoogle,
      logout,
      clearError,
      isAuthenticated: !!user,
    }),
    [user, loading, actionLoading, error, login, register, loginWithGoogle, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================
// Custom Hook
// ============================================

/**
 * AuthContext를 사용하는 커스텀 훅
 *
 * @returns {AuthContextType} 인증 상태와 관련 함수들
 * @throws {Error} AuthProvider 외부에서 사용될 경우 에러 발생
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, login, logout, isAuthenticated } = useAuthContext();
 *
 *   if (!isAuthenticated) {
 *     return <button onClick={() => login('email@test.com', 'password')}>로그인</button>;
 *   }
 *
 *   return (
 *     <div>
 *       <p>환영합니다, {user?.displayName || user?.email}!</p>
 *       <button onClick={logout}>로그아웃</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}

// 기본 export
export default AuthContext;
