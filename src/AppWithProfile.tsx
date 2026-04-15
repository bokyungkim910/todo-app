/**
 * 프로필 기능이 통합된 App 예시
 * 
 * 사용 방법:
 * 1. main.tsx에서 App 대신 AppWithProfile을 사용하거나
 * 2. App.tsx의 내용을 이 파일 내용으로 교체
 */

import { useMemo, useState } from 'react';
import { useMonthlyTodos, useDailyTodos } from './hooks/useTodos';
import { useUser, useIsReadOnly, useActiveUserName, useOtherUsers } from './hooks/useUser';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { FilterBar } from './components/FilterBar';
import { ProgressBar } from './components/ProgressBar';
import { Stats } from './components/Stats';
import { Calendar } from './components/Calendar';
import { ProfileMenu } from './components/ProfileMenu';
import { UserSettingsModal } from './components/UserSettingsModal';
import { ReadOnlyBanner } from './components/ReadOnlyBanner';
import type { FilterState } from './types';
import { formatDateKey, formatMonthYear, getNextMonth, getPrevMonth } from './utils/dateUtils';

type ViewMode = 'list' | 'calendar';

function AppWithProfile() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // 사용자 상태
  const { 
    currentUser, 
    users, 
    switchUser, 
    returnToOwn, 
    updateUserProfile, 
    logout 
  } = useUser();
  
  const isReadOnly = useIsReadOnly();
  const activeUserName = useActiveUserName();
  const otherUsers = useOtherUsers();
  
  // 통합된 날짜 상태 (양방향 동기화)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // 월간 목표: 선택된 날짜의 월 사용
  const monthlyTodosData = useMonthlyTodos(
    selectedDate.getFullYear(),
    selectedDate.getMonth() + 1
  );
  
  // 할 일 목록: 선택된 날짜 사용
  const dailyTodosData = useDailyTodos(formatDateKey(selectedDate));
  
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    category: '',
    searchQuery: '',
    sortBy: 'order',
  });

  // 현재 탭에 따라 데이터 선택
  const currentTodosData = viewMode === 'list' ? monthlyTodosData : dailyTodosData;
  const { todos, addTodo, toggleTodo, editTodo, deleteTodo } = currentTodosData;

  const filteredTodos = useMemo(() => {
    let result = [...todos];

    // 상태 필터
    if (filters.status === 'active') {
      result = result.filter(t => !t.completed);
    } else if (filters.status === 'completed') {
      result = result.filter(t => t.completed);
    }

    // 카테고리 필터
    if (filters.category) {
      result = result.filter(t => t.category === filters.category);
    }

    // 검색
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(t => t.text.toLowerCase().includes(query));
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
    const completed = todos.filter(t => t.completed).length;
    const active = total - completed;
    const highPriority = todos.filter(t => t.priority === 'high' && !t.completed).length;
    const overdue = todos.filter(t => {
      if (!t.dueDate || t.completed) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return { total, completed, active, highPriority, overdue };
  }, [todos]);

  const handlePrevMonth = () => setSelectedDate(prev => getPrevMonth(prev));
  const handleNextMonth = () => setSelectedDate(prev => getNextMonth(prev));

  // 양방향 동기화를 위한 날짜 변경 핸들러
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  // 사용자 전환 핸들러
  const handleUserSwitch = (userId: string) => {
    switchUser(userId);
  };

  // 설정 저장 핸들러
  const handleSaveSettings = (updates: Parameters<typeof updateUserProfile>[0]) => {
    updateUserProfile(updates);
  };

  // 로그아웃 핸들러
  const handleLogout = () => {
    if (confirm('정말 로그아웃하시겠습니까?')) {
      logout();
    }
  };

  // 읽기 전용 모드 종료
  const handleExitReadOnly = () => {
    returnToOwn();
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👤</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">로그인이 필요합니다</h1>
          <p className="text-gray-600 mb-6">체크리스트를 사용하려면 로그인해주세요.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 헤더 영역 - 프로필 메뉴 포함 */}
        <header className="flex items-center justify-between">
          <div className="flex-1">
            {isReadOnly && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  👤 {activeUserName}님의 체크리스트
                </span>
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              📝 To Do List
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {isReadOnly ? '체크리스트 열람 중' : '효율적인 할 일 관리'}
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <ProfileMenu
              currentUser={currentUser}
              users={otherUsers}
              onUserSwitch={handleUserSwitch}
              onSettingsClick={() => setIsSettingsOpen(true)}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* 읽기 전용 모드 배너 */}
        {isReadOnly && (
          <ReadOnlyBanner
            ownerName={activeUserName}
            onEditMode={handleExitReadOnly}
            onClose={handleExitReadOnly}
          />
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
              onClick={() => setViewMode('list')}
              disabled={isReadOnly}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              📋 월간 목표
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              disabled={isReadOnly}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              } ${isReadOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                disabled={isReadOnly}
                className={`p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 ${
                  isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="이전 달"
              >
                ←
              </button>
              <h2 className="text-xl font-bold text-gray-800 min-w-[140px] text-center">
                {formatMonthYear(selectedDate)}
              </h2>
              <button
                onClick={handleNextMonth}
                disabled={isReadOnly}
                className={`p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 ${
                  isReadOnly ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                title="다음 달"
              >
                →
              </button>
            </div>
          </div>
        )}

        {/* 할 일 목록 탭: 캘린더 */}
        {viewMode === 'calendar' && (
          <Calendar
            todos={todos}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />
        )}

        {/* 입력 및 검색 기능 - 읽기 전용 모드에서는 숨김 */}
        {!isReadOnly && (
          <>
            <TodoInput onAdd={addTodo} />
            <FilterBar filters={filters} onFilterChange={setFilters} />
          </>
        )}

        <div className={`rounded-lg p-4 ${isReadOnly ? 'bg-blue-50/30 border border-blue-100' : 'bg-gray-50'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {viewMode === 'list' 
                ? `${selectedDate.getMonth() + 1}월 목표 (${filteredTodos.length})`
                : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일의 할 일 (${filteredTodos.length})`
              }
            </h2>
            {isReadOnly && (
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                읽기 전용
              </span>
            )}
          </div>
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onEdit={editTodo}
            onDelete={deleteTodo}
            isReadOnly={isReadOnly}
            ownerName={activeUserName}
          />
        </div>
      </div>

      {/* 사용자 설정 모달 */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        user={currentUser}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onLogout={handleLogout}
      />
    </div>
  );
}

export default AppWithProfile;
