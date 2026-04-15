/**
 * ProfileMenu, ShareModal, useSharing 사용 예시
 * 
 * 이 파일은 세 가지 컴포넌트/Hook을 함께 사용하는 방법을 보여줍니다.
 */

import { useState, useCallback } from 'react';
import { ProfileMenu } from './ProfileMenu';
import { ShareModal } from './ShareModal';
import { useSharing } from '../hooks/useSharing';
import { User } from '../types';

// ============================================
// 예시: App 컴포넌트에서 사용
// ============================================

interface AppWithSharingProps {
  currentUser: User;
}

export function AppWithSharing({ currentUser }: AppWithSharingProps) {
  // 현재 선택된 사용자 ID (기본값: 자신)
  const [selectedUserId, setSelectedUserId] = useState(currentUser.uid);
  
  // 공유 모달 표시 상태
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // 공유 관리 Hook 사용
  const {
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
  } = useSharing({ currentUser });

  // 사용자 선택 핸들러
  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    // TODO: 선택된 사용자의 데이터 로드
    console.log('사용자 전환:', userId);
  }, []);

  // 읽기 전용 모드 확인
  const isReadOnly = selectedUserId !== currentUser.uid;

  // 활성화된 공유 사용자만 필터링
  const activeSharedUsers = sharedUsers.filter(u => u.status === 'active');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm px-4 py-3 sticky top-0 z-40">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-900">Todo App</h1>
          
          {/* 프로필 메뉴 */}
          <ProfileMenu
            currentUser={currentUser}
            sharedUsers={activeSharedUsers}
            selectedUserId={selectedUserId}
            onSelectUser={handleSelectUser}
            onOpenSettings={() => setIsShareModalOpen(true)}
            isReadOnly={isReadOnly}
          />
        </div>
      </header>

      {/* 읽기 전용 배너 */}
      {isReadOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-4xl mx-auto flex items-center gap-2 text-amber-700">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium">
              읽기 전용 모드: 다른 사용자의 체크리스트를 보고 있습니다
            </span>
            <button
              onClick={() => setSelectedUserId(currentUser.uid)}
              className="ml-auto text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              내 체크리스트로 돌아가기
            </button>
          </div>
        </div>
      )}

      {/* 메인 콘텐츠 */}
      <main className="max-w-4xl mx-auto p-4">
        {/* TODO: TodoList 컴포넌트에 selectedUserId 전달 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isReadOnly ? '공유된 체크리스트' : '내 체크리스트'}
          </h2>
          <p className="text-gray-500">
            선택된 사용자: {selectedUserId === currentUser.uid ? '나' : selectedUserId}
          </p>
          {/* 여기에 TodoList 컴포넌트 */}
        </div>
      </main>

      {/* 공유 관리 모달 */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentUser={currentUser}
        sharedUsers={sharedUsers}
        pendingInvites={pendingInvites}
        receivedInvites={receivedInvites}
        onInvite={inviteUser}
        onRemove={removeSharedUser}
        onAcceptInvite={acceptInvite}
        onRejectInvite={rejectInvite}
        maxSharedUsers={2}
      />
    </div>
  );
}

// ============================================
// 예시: 개별 컴포넌트 사용
// ============================================

/**
 * ProfileMenu 단독 사용 예시
 */
export function ProfileMenuExample() {
  const currentUser: User = {
    uid: 'user-1',
    email: 'me@example.com',
    nickname: '김보경',
    createdAt: Date.now(),
  };

  const sharedUsers: SharedUser[] = [
    {
      uid: 'user-2',
      email: 'friend@example.com',
      nickname: '홍길동',
      sharedAt: Date.now(),
      status: 'active',
    },
  ];

  const [selectedUserId, setSelectedUserId] = useState(currentUser.uid);
  const isReadOnly = selectedUserId !== currentUser.uid;

  return (
    <ProfileMenu
      currentUser={currentUser}
      sharedUsers={sharedUsers}
      selectedUserId={selectedUserId}
      onSelectUser={setSelectedUserId}
      onOpenSettings={() => console.log('설정 열기')}
      isReadOnly={isReadOnly}
    />
  );
}

/**
 * ShareModal 단독 사용 예시
 */
export function ShareModalExample() {
  const currentUser: User = {
    uid: 'user-1',
    email: 'me@example.com',
    nickname: '김보경',
    createdAt: Date.now(),
  };

  const [isOpen, setIsOpen] = useState(true);

  const sharedUsers: SharedUser[] = [
    {
      uid: 'user-2',
      email: 'friend@example.com',
      nickname: '홍길동',
      sharedAt: Date.now(),
      status: 'active',
    },
  ];

  const pendingInvites: ShareInvite[] = [];
  const receivedInvites: ShareInvite[] = [
    {
      id: 'invite-1',
      inviterId: 'user-3',
      inviterEmail: 'other@example.com',
      inviterNickname: '이순신',
      invitedAt: Date.now(),
      status: 'pending',
    },
  ];

  const handleInvite = async (email: string) => {
    console.log('초대:', email);
    // API 호출
  };

  const handleRemove = async (userId: string) => {
    console.log('공유 해제:', userId);
    // API 호출
  };

  const handleAccept = async (inviteId: string) => {
    console.log('초대 수락:', inviteId);
    // API 호출
  };

  const handleReject = async (inviteId: string) => {
    console.log('초대 거부:', inviteId);
    // API 호출
  };

  return (
    <ShareModal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      currentUser={currentUser}
      sharedUsers={sharedUsers}
      pendingInvites={pendingInvites}
      receivedInvites={receivedInvites}
      onInvite={handleInvite}
      onRemove={handleRemove}
      onAcceptInvite={handleAccept}
      onRejectInvite={handleReject}
    />
  );
}

/**
 * useSharing Hook 단독 사용 예시
 */
export function UseSharingExample() {
  const currentUser: User = {
    uid: 'user-1',
    email: 'me@example.com',
    nickname: '김보경',
    createdAt: Date.now(),
  };

  const {
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
  } = useSharing({ currentUser });

  const handleInvite = async () => {
    try {
      await inviteUser('friend@example.com');
      alert('초대가 전송되었습니다!');
    } catch (err) {
      alert(err instanceof Error ? err.message : '초대 실패');
    }
  };

  return (
    <div className="p-4">
      <h2>공유 관리</h2>
      
      {loading && <p>로딩 중...</p>}
      {error && (
        <div className="text-red-600">
          {error}
          <button onClick={clearError}>닫기</button>
        </div>
      )}

      <div>
        <h3>공유된 사용자 ({sharedUsers.length})</h3>
        <ul>
          {sharedUsers.map(user => (
            <li key={user.uid}>
              {user.nickname} ({user.email})
              <button onClick={() => removeSharedUser(user.uid)}>
                공유 해제
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3>받은 초대 ({receivedInvites.length})</h3>
        <ul>
          {receivedInvites.map(invite => (
            <li key={invite.id}>
              {invite.inviterNickname}님의 초대
              <button onClick={() => acceptInvite(invite.id)}>수락</button>
              <button onClick={() => rejectInvite(invite.id)}>거부</button>
            </li>
          ))}
        </ul>
      </div>

      <button onClick={handleInvite} disabled={loading}>
        사용자 초대
      </button>

      <button onClick={refresh}>새로고침</button>
    </div>
  );
}

// ============================================
// 타입 import (실제 사용 시 types/index.ts에서 import)
// ============================================

import { SharedUser, ShareInvite } from '../types';

export default AppWithSharing;
