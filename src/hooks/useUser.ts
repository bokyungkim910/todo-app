import { useUserContext } from '../contexts/UserContext';
import type { User } from '../types';

// 기본 useUser 훅
export function useUser() {
  const context = useUserContext();
  
  return {
    // 상태
    currentUser: context.currentUser,
    viewingUser: context.viewingUser,
    viewMode: context.viewMode,
    isReadOnly: context.isReadOnly,
    users: context.users,
    
    // 액션
    setCurrentUser: context.setCurrentUser,
    switchUser: context.switchUser,
    returnToOwn: context.returnToOwn,
    setViewMode: context.setViewMode,
    updateUserProfile: context.updateUserProfile,
    logout: context.logout,
    addUser: context.addUser,
    removeUser: context.removeUser,
  };
}

// 인증 여부 확인 훅
export function useIsAuthenticated(): boolean {
  const { currentUser } = useUserContext();
  return currentUser !== null;
}

// 읽기 전용 모드 확인 훅
export function useIsReadOnly(): boolean {
  const { isReadOnly } = useUserContext();
  return isReadOnly;
}

// 현재 활성 사용자 반환 (viewingUser가 있으면 그것을, 없으면 currentUser를 반환)
export function useActiveUser(): User | null {
  const { currentUser, viewingUser } = useUserContext();
  return viewingUser || currentUser;
}

// 현재 보고 있는 사용자의 이름 반환
export function useActiveUserName(): string {
  const activeUser = useActiveUser();
  return activeUser?.nickname || '사용자';
}

// 다른 사용자 목록 반환 (현재 사용자 제외)
export function useOtherUsers(): User[] {
  const { users, currentUser } = useUserContext();
  return users.filter(u => u.id !== currentUser?.id);
}

export default useUser;
