import { useState, useEffect, useCallback, useMemo } from 'react';
import { SharedUser, ShareInvite, User } from '../types';

// ============================================
// 타입 정의
// ============================================

interface UseSharingReturn {
  /** 공유된 사용자 목록 (내가 공유한 사용자) */
  sharedUsers: SharedUser[];
  /** 나와 공유된 사용자 목록 */
  sharedWithMe: SharedUser[];
  /** 내가 보낸 대기 중인 초대 */
  pendingInvites: ShareInvite[];
  /** 내가 받은 초대 */
  receivedInvites: ShareInvite[];
  /** 로딩 상태 */
  loading: boolean;
  /** 에러 메시지 */
  error: string | null;
  /** 사용자 초대 */
  inviteUser: (email: string) => Promise<void>;
  /** 초대 수락 */
  acceptInvite: (inviteId: string) => Promise<void>;
  /** 초대 거부 */
  rejectInvite: (inviteId: string) => Promise<void>;
  /** 공유 해제 */
  removeSharedUser: (userId: string) => Promise<void>;
  /** 에러 초기화 */
  clearError: () => void;
  /** 데이터 새로고침 */
  refresh: () => Promise<void>;
}

interface UseSharingProps {
  currentUser: User | null;
}

// ============================================
// LocalStorage 키 생성
// ============================================

const getStorageKey = (userId: string, type: string) => `sharing-${type}-${userId}`;

// ============================================
// Mock 데이터 (데모용)
// ============================================

const MOCK_DELAY = 500; // API 호출 시뮬레이션 지연 시간

// ============================================
// Hook 구현
// ============================================

export function useSharing({ currentUser }: UseSharingProps): UseSharingReturn {
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [sharedWithMe, setSharedWithMe] = useState<SharedUser[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ShareInvite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<ShareInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // 데이터 로드
  // ==========================================

  const loadData = useCallback(async () => {
    if (!currentUser) {
      setSharedUsers([]);
      setSharedWithMe([]);
      setPendingInvites([]);
      setReceivedInvites([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // LocalStorage에서 데이터 로드
      const sharedKey = getStorageKey(currentUser.uid, 'shared');
      const withMeKey = getStorageKey(currentUser.uid, 'with-me');
      const pendingKey = getStorageKey(currentUser.uid, 'pending');
      const receivedKey = getStorageKey(currentUser.uid, 'received');

      const storedShared = localStorage.getItem(sharedKey);
      const storedWithMe = localStorage.getItem(withMeKey);
      const storedPending = localStorage.getItem(pendingKey);
      const storedReceived = localStorage.getItem(receivedKey);

      setSharedUsers(storedShared ? JSON.parse(storedShared) : []);
      setSharedWithMe(storedWithMe ? JSON.parse(storedWithMe) : []);
      setPendingInvites(storedPending ? JSON.parse(storedPending) : []);
      setReceivedInvites(storedReceived ? JSON.parse(storedReceived) : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // 초기 로드
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // 데이터 저장
  // ==========================================

  const saveData = useCallback(() => {
    if (!currentUser) return;

    try {
      localStorage.setItem(getStorageKey(currentUser.uid, 'shared'), JSON.stringify(sharedUsers));
      localStorage.setItem(getStorageKey(currentUser.uid, 'with-me'), JSON.stringify(sharedWithMe));
      localStorage.setItem(getStorageKey(currentUser.uid, 'pending'), JSON.stringify(pendingInvites));
      localStorage.setItem(getStorageKey(currentUser.uid, 'received'), JSON.stringify(receivedInvites));
    } catch (err) {
      console.error('Failed to save sharing data:', err);
    }
  }, [currentUser, sharedUsers, sharedWithMe, pendingInvites, receivedInvites]);

  // 데이터 변경 시 자동 저장
  useEffect(() => {
    saveData();
  }, [saveData]);

  // ==========================================
  // 사용자 초대
  // ==========================================

  const inviteUser = useCallback(async (email: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    // 최대 2인 제한 확인
    const activeShared = sharedUsers.filter(u => u.status === 'active');
    if (activeShared.length >= 2) {
      throw new Error('최대 2명까지만 공유할 수 있습니다.');
    }

    // 이미 공유된 사용자 확인
    if (sharedUsers.some(u => u.email === email)) {
      throw new Error('이미 공유된 사용자입니다.');
    }

    // 이미 초대한 사용자 확인
    if (pendingInvites.some(i => i.inviterEmail === email)) {
      throw new Error('이미 초대한 사용자입니다.');
    }

    setLoading(true);
    setError(null);

    try {
      // Mock API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

      // 새 초대 생성
      const newInvite: ShareInvite = {
        id: `invite-${Date.now()}`,
        inviterId: currentUser.uid,
        inviterEmail: currentUser.email,
        inviterNickname: currentUser.nickname,
        invitedAt: Date.now(),
        status: 'pending',
      };

      setPendingInvites(prev => [...prev, newInvite]);

      // TODO: 실제 구현에서는 서버에 초대 전송
      // - 이메일로 초대 알림 발송
      // - 수신자의 receivedInvites에 추가
    } catch (err) {
      const message = err instanceof Error ? err.message : '초대 전송에 실패했습니다.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, sharedUsers, pendingInvites]);

  // ==========================================
  // 초대 수락
  // ==========================================

  const acceptInvite = useCallback(async (inviteId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    setLoading(true);
    setError(null);

    try {
      // Mock API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

      const invite = receivedInvites.find(i => i.id === inviteId);
      if (!invite) {
        throw new Error('초대를 찾을 수 없습니다.');
      }

      // 받은 초대 목록에서 제거
      setReceivedInvites(prev => prev.filter(i => i.id !== inviteId));

      // 공유된 사용자로 추가
      const newSharedUser: SharedUser = {
        uid: invite.inviterId,
        nickname: invite.inviterNickname,
        email: invite.inviterEmail,
        sharedAt: Date.now(),
        status: 'active',
      };

      setSharedWithMe(prev => [...prev, newSharedUser]);

      // TODO: 실제 구현에서는 서버에 수락 알림
      // - 초대자의 sharedUsers에 현재 사용자 추가
      // - 양방향 실시간 동기화 설정
    } catch (err) {
      const message = err instanceof Error ? err.message : '초대 수락에 실패했습니다.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, receivedInvites]);

  // ==========================================
  // 초대 거부
  // ==========================================

  const rejectInvite = useCallback(async (inviteId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    setLoading(true);
    setError(null);

    try {
      // Mock API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

      // 받은 초대 목록에서 제거
      setReceivedInvites(prev => prev.filter(i => i.id !== inviteId));

      // TODO: 실제 구현에서는 서버에 거부 알림
    } catch (err) {
      const message = err instanceof Error ? err.message : '초대 거부에 실패했습니다.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // ==========================================
  // 공유 해제
  // ==========================================

  const removeSharedUser = useCallback(async (userId: string): Promise<void> => {
    if (!currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    setLoading(true);
    setError(null);

    try {
      // Mock API 호출 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY));

      // 공유된 사용자 목록에서 제거
      setSharedUsers(prev => prev.filter(u => u.uid !== userId));

      // TODO: 실제 구현에서는 서버에 공유 해제 알림
      // - 상대방의 sharedWithMe에서도 제거
      // - 실시간 동기화 해제
    } catch (err) {
      const message = err instanceof Error ? err.message : '공유 해제에 실패했습니다.';
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // ==========================================
  // 유틸리티 함수
  // ==========================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // ==========================================
  // 실시간 동기화 (Mock)
  // ==========================================

  useEffect(() => {
    if (!currentUser) return;

    // TODO: 실제 구현에서는 WebSocket 또는 Firebase Realtime Database 사용
    // - 공유된 사용자의 데이터 변경 감지
    // - 초대 수락/거부 실시간 반영

    const interval = setInterval(() => {
      // 주기적으로 데이터 동기화 (폴링)
      loadData();
    }, 30000); // 30초마다

    return () => clearInterval(interval);
  }, [currentUser, loadData]);

  // ==========================================
  // 반환값
  // ==========================================

  return useMemo(() => ({
    sharedUsers,
    sharedWithMe,
    pendingInvites,
    receivedInvites,
    loading,
    error,
    inviteUser,
    acceptInvite,
    rejectInvite,
    removeSharedUser,
    clearError,
    refresh,
  }), [
    sharedUsers,
    sharedWithMe,
    pendingInvites,
    receivedInvites,
    loading,
    error,
    inviteUser,
    acceptInvite,
    rejectInvite,
    removeSharedUser,
    clearError,
    refresh,
  ]);
}

// ============================================
// 추가 유틸리티 함수
// ============================================

/**
 * 사용자가 특정 사용자의 데이터에 접근할 수 있는지 확인
 */
export function canAccessUserData(
  currentUserId: string,
  targetUserId: string,
  sharedUsers: SharedUser[]
): boolean {
  if (currentUserId === targetUserId) return true;
  return sharedUsers.some(u => u.uid === targetUserId && u.status === 'active');
}

/**
 * 읽기 전용 모드인지 확인
 */
export function isReadOnlyMode(
  currentUserId: string,
  viewingUserId: string
): boolean {
  return currentUserId !== viewingUserId;
}

export default useSharing;
