import { useMemo, useState, useCallback, useEffect } from 'react';
import { useMonthlyTodos, useDailyTodos } from './hooks/useTodos';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { FilterBar } from './components/FilterBar';
import { ProgressBar } from './components/ProgressBar';
import { Stats } from './components/Stats';
import { Calendar } from './components/Calendar';
import { ReadOnlyBanner } from './components/ReadOnlyBanner';
import { ProfileMenu } from './components/ProfileMenu';
import { ShareModal } from './components/ShareModal';
import { AuthModal } from './components/AuthModal';
import { useAuthContext } from './contexts/AuthContext';
import type { FilterState, User, SharedUser, ShareInvite } from './types';
import { formatDateKey, formatMonthYear, getNextMonth, getPrevMonth } from './utils/dateUtils';
import { db } from './firebase/config';
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';

type ViewMode = 'list' | 'calendar';

// ============================================
// 공유 관리 훅
// ============================================

function useShareManagement(currentUserId: string | null) {
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ShareInvite[]>([]);
  const [receivedInvites, setReceivedInvites] = useState<ShareInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // 공유된 사용자 실시간 구독
  useEffect(() => {
    if (!currentUserId) {
      setSharedUsers([]);
      setPendingInvites([]);
      setReceivedInvites([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // 공유된 사용자 구독
    const sharesRef = collection(db, 'users', currentUserId, 'shares');
    const sharesUnsubscribe = onSnapshot(
      query(sharesRef, orderBy('createdAt', 'desc')),
      (snapshot) => {
        const users: SharedUser[] = [];
        const pending: ShareInvite[] = [];

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'active') {
            users.push({
              uid: data.sharedWithId,
              email: data.sharedWithEmail,
              nickname: data.sharedWithNickname,
              status: 'active',
              sharedAt: data.createdAt?.toMillis?.() || Date.now(),
            });
          } else if (data.status === 'pending') {
            pending.push({
              id: doc.id,
              inviterId: currentUserId,
              inviterEmail: data.inviterEmail || '',
              inviterNickname: data.inviterNickname || '',
              inviteeEmail: data.sharedWithEmail,
              inviteeId: data.sharedWithId,
              status: 'pending',
              createdAt: data.createdAt?.toMillis?.() || Date.now(),
            });
          }
        });

        setSharedUsers(users);
        setPendingInvites(pending);
      },
      (err) => {
        console.error('Error fetching shares:', err);
      }
    );

    // 받은 초대 구독
    const invitesRef = collection(db, 'invites');
    const invitesUnsubscribe = onSnapshot(
      query(invitesRef, where('inviteeId', '==', currentUserId), where('status', '==', 'pending')),
      (snapshot) => {
        const invites: ShareInvite[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toMillis?.() || Date.now(),
        })) as ShareInvite[];
        setReceivedInvites(invites);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching invites:', err);
        setLoading(false);
      }
    );

    return () => {
      sharesUnsubscribe();
      invitesUnsubscribe();
    };
  }, [currentUserId]);

  // 사용자 초대
  const inviteUser = useCallback(
    async (email: string): Promise<void> => {
      if (!currentUserId) throw new Error('로그인이 필요합니다');

      // 이메일로 사용자 검색 (간단한 구현)
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('해당 이메일의 사용자를 찾을 수 없습니다');
      }

      const targetUser = snapshot.docs[0];
      const targetUserId = targetUser.id;
      const targetUserData = targetUser.data();

      // 이미 공유된 사용자인지 확인
      const existingShare = await getDocs(
        query(
          collection(db, 'users', currentUserId, 'shares'),
          where('sharedWithId', '==', targetUserId)
        )
      );

      if (!existingShare.empty) {
        throw new Error('이미 공유된 사용자입니다');
      }

      // 초대 생성
      const inviteRef = collection(db, 'invites');
      await addDoc(inviteRef, {
        inviterId: currentUserId,
        inviterEmail: currentUserId, // 실제로는 현재 사용자 이메일
        inviterNickname: '나', // 실제로는 현재 사용자 닉네임
        inviteeId: targetUserId,
        inviteeEmail: email,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // 내 shares에도 pending으로 추가
      await addDoc(collection(db, 'users', currentUserId, 'shares'), {
        sharedWithId: targetUserId,
        sharedWithEmail: email,
        sharedWithNickname: targetUserData.nickname || email.split('@')[0],
        status: 'pending',
        createdAt: serverTimestamp(),
      });
    },
    [currentUserId]
  );

  // 공유 해제
  const removeUser = useCallback(
    async (userId: string): Promise<void> => {
      if (!currentUserId) throw new Error('로그인이 필요합니다');

      const sharesRef = collection(db, 'users', currentUserId, 'shares');
      const q = query(sharesRef, where('sharedWithId', '==', userId));
      const snapshot = await getDocs(q);

      const batch = [];
      snapshot.docs.forEach((docSnapshot) => {
        batch.push(deleteDoc(doc(db, 'users', currentUserId, 'shares', docSnapshot.id)));
      });

      await Promise.all(batch);
    },
    [currentUserId]
  );

  // 초대 수락
  const acceptInvite = useCallback(
    async (inviteId: string): Promise<void> => {
      if (!currentUserId) throw new Error('로그인이 필요합니다');

      const inviteRef = doc(db, 'invites', inviteId);
      await updateDoc(inviteRef, { status: 'accepted', acceptedAt: serverTimestamp() });

      // 상대방의 shares에서도 active로 업데이트
      const inviteData = (await getDocs(query(collection(db, 'invites'), where('__name__', '==', inviteId)))).docs[0]?.data();
      if (inviteData) {
        const sharesRef = collection(db, 'users', inviteData.inviterId, 'shares');
        const q = query(sharesRef, where('sharedWithId', '==', currentUserId));
        const snapshot = await getDocs(q);
        snapshot.docs.forEach((docSnapshot) => {
          updateDoc(doc(db, 'users', inviteData.inviterId, 'shares', docSnapshot.id), {
            status: 'active',
            acceptedAt: serverTimestamp(),
          });
        });
      }
    },
    [currentUserId]
  );

  // 초대 거부
  const rejectInvite = useCallback(
    async (inviteId: string): Promise<void> => {
      if (!currentUserId) throw new Error('로그인이 필요합니다');

      const inviteRef = doc(db, 'invites', inviteId);
      await updateDoc(inviteRef, { status: 'rejected', rejectedAt: serverTimestamp() });
    },
    [currentUserId]
  );

  return {
    sharedUsers,
    pendingInvites,
    receivedInvites,
    loading,
    inviteUser,
    removeUser,
    acceptInvite,
    rejectInvite,
  };
}

// ============================================
// 메인 App 컴포넌트
// ============================================

function App() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuthContext();
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 선택된 사용자 ID (공유된 사용자의 체크리스트를 볼 때 사용)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // 모달 상태
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // 공유 관리
  const {
    sharedUsers,
    pendingInvites,
    receivedInvites,
    inviteUser,
    removeUser,
    acceptInvite,
    rejectInvite,
  } = useShareManagement(user?.uid || null);

  // 읽기 전용 모드 계산
  const isReadOnly = selectedUserId !== null && selectedUserId !== user?.uid;
  const ownerName = isReadOnly
    ? sharedUsers.find((u) => u.uid === selectedUserId)?.nickname || '사용자'
    : null;

  // 현재 보고 있는 사용자 ID (내 체크리스트 또는 공유된 사용자)
  const effectiveUserId = selectedUserId || user?.uid || null;

  // 통합된 날짜 상태 (양방향 동기화)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // 월간 목표: 선택된 날짜의 월 사용
  const monthlyTodosData = useMonthlyTodos(
    effectiveUserId,
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1
  );

  // 할 일 목록: 선택된 날짜 사용
  const dailyTodosData = useDailyTodos(effectiveUserId, formatDateKey(selectedDate));

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    category: '',
    searchQuery: '',
    sortBy: 'order',
  });

  // 현재 탭에 따라 데이터 선택
  const currentTodosData = viewMode === 'list' ? monthlyTodosData : dailyTodosData;
  const { todos, addTodo, toggleTodo, editTodo, deleteTodo } = currentTodosData;

  // 내 체크리스트로 돌아가기
  const handleReturnToMine = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  // 사용자 선택 핸들러
  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  // 현재 사용자 정보
  const currentUser: User | null = user
    ? {
        uid: user.uid,
        email: user.email || '',
        nickname: user.displayName || user.email?.split('@')[0] || '사용자',
      }
    : null;

  const filteredTodos = useMemo(() => {
    let result = [...todos];

    // 상태 필터
    if (filters.status === 'active') {
      result = result.filter((t) => !t.completed);
    } else if (filters.status === 'completed') {
      result = result.filter((t) => t.completed);
    }

    // 카테고리 필터
    if (filters.category) {
      result = result.filter((t) => t.category === filters.category);
    }

    // 검색
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter((t) => t.text.toLowerCase().includes(query));
    }

    // 정렬
    result.sort((a, b) => {
      if (filters.sortBy === 'order') {
        return a.order - b.order;
      } else if (filters.sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (filters.sortBy === 'priority') {
        const priorityMap = { high: 3, medium: 2, low: 1 };
        return priorityMap[b.priority] - priorityMap[a.priority];
      }
      return 0;
    });

    return result;
  }, [todos, filters]);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const active = total - completed;
    const highPriority = todos.filter((t) => t.priority === 'high' && !t.completed).length;
    const overdue = todos.filter((t) => {
      if (!t.dueDate || t.completed) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return { total, completed, active, highPriority, overdue };
  }, [todos]);

  const handlePrevMonth = () => setSelectedDate((prev) => getPrevMonth(prev));
  const handleNextMonth = () => setSelectedDate((prev) => getNextMonth(prev));

  // 양방향 동기화를 위한 날짜 변경 핸들러
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  // 인증되지 않은 상태 처리
  if (!authLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* 우측 상단 로그인 버튼 */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-md"
          >
            로그인
          </button>
        </div>
        <div className="flex items-center justify-center px-4 min-h-screen">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📝</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">To Do List</h1>
              <p className="text-gray-600">효율적인 할 일 관리를 시작하세요</p>
            </div>
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              로그인 / 회원가입
            </button>
            <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
          </div>
        </div>
      </div>
    );
  }

  // 로딩 중 (Firebase Auth 초기화 대기)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* 우측 상단 로그인 버튼 */}
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-md"
          >
            로그인
          </button>
        </div>
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-3 text-gray-600">
            <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>로딩 중...</span>
          </div>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 헤더 영역 */}
        <div className="relative">
          {/* 프로필 메뉴 (우측 상단) */}
          {currentUser && (
            <div className="absolute top-0 right-0">
              <ProfileMenu
                currentUser={currentUser}
                sharedUsers={sharedUsers}
                selectedUserId={selectedUserId || currentUser.uid}
                onSelectUser={handleSelectUser}
                onOpenSettings={() => setIsShareModalOpen(true)}
                onLogout={logout}
                isReadOnly={isReadOnly}
              />
            </div>
          )}

          <header className="text-center pt-2">
            {isReadOnly && ownerName && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm">
                  👤 {ownerName}님의 체크리스트
                </span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-800 mb-2">📝 To Do List</h1>
            <p className="text-gray-600">
              {isReadOnly ? '체크리스트 열람 중' : '효율적인 할 일 관리'}
            </p>
          </header>
        </div>

        {/* 읽기 전용 배너 */}
        {isReadOnly && ownerName && (
          <ReadOnlyBanner ownerName={ownerName} onReturnToMine={handleReturnToMine} />
        )}

        <ProgressBar total={stats.total} completed={stats.completed} />

        <Stats
          total={stats.total}
          completed={stats.completed}
          active={stats.active}
          highPriority={stats.highPriority}
          overdue={stats.overdue}
        />

        {/* 뷰 모드 탭 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setViewMode('list');
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📋 월간 목표
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📅 할 일 목록
            </button>
          </div>
        </div>

        {/* 월간 목표 탭: 월 네비게이터 */}
        {viewMode === 'list' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title="이전 달"
              >
                ←
              </button>
              <h2 className="text-xl font-bold text-gray-800 min-w-[140px] text-center">
                {formatMonthYear(selectedDate)}
              </h2>
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
                title="다음 달"
              >
                →
              </button>
            </div>
          </div>
        )}

        {/* 할 일 목록 탭: 캘린더 */}
        {viewMode === 'calendar' && (
          <Calendar todos={todos} selectedDate={selectedDate} onDateChange={handleDateChange} />
        )}

        {/* 입력 및 검색 기능 */}
        <TodoInput onAdd={addTodo} isReadOnly={isReadOnly} />
        <FilterBar filters={filters} onFilterChange={setFilters} />

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {viewMode === 'list'
                ? `${selectedDate.getMonth() + 1}월 목표 (${filteredTodos.length})`
                : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일의 할 일 (${filteredTodos.length})`}
            </h2>
          </div>
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onEdit={editTodo}
            onDelete={deleteTodo}
            isReadOnly={isReadOnly}
            ownerName={ownerName}
          />
        </div>
      </div>

      {/* 공유 관리 모달 */}
      {currentUser && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          currentUser={currentUser}
          sharedUsers={sharedUsers}
          pendingInvites={pendingInvites}
          receivedInvites={receivedInvites}
          onInvite={inviteUser}
          onRemove={removeUser}
          onAcceptInvite={acceptInvite}
          onRejectInvite={rejectInvite}
        />
      )}

      {/* 인증 모달 */}
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default App;
