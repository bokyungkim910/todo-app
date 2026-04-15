import { useContext } from 'react';
import { AuthContext, useAuthContext, type AuthContextType } from '../contexts/AuthContext';

/**
 * @deprecated useAuthContext를 사용하세요. 이 훅은 하위 호환성을 위해 유지됩니다.
 *
 * Firebase 인증 기능을 제공하는 커스텀 훅
 *
 * @returns {AuthContextType} 인증 상태와 관련 함수들
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, loading, error, login, register, logout, clearError, isAuthenticated } = useAuth();
 *
 *   if (loading) return <div>로딩 중...</div>;
 *
 *   if (isAuthenticated) {
 *     return (
 *       <div>
 *         <p>환영합니다, {user?.displayName || user?.email}!</p>
 *         <button onClick={logout}>로그아웃</button>
 *       </div>
 *     );
 *   }
 *
 *   return (
 *     <div>
 *       {error && <p style={{ color: 'red' }}>{error}</p>}
 *       <button onClick={() => login('user@example.com', 'password')}>로그인</button>
 *       <button onClick={() => register('user@example.com', 'password', '닉네임')}>회원가입</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  return useAuthContext();
}

/**
 * AuthContext를 직접 사용하는 대신 이 훅을 사용하세요.
 * useAuthContext와 동일한 기능을 제공합니다.
 */
export { useAuthContext };

/**
 * AuthContextType 타입을 export
 */
export type { AuthContextType };

// 기본 export
export default useAuth;
