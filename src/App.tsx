import { useMemo, useState } from 'react';
import { useMonthlyTodos, useDailyTodos } from './hooks/useTodos';
import { TodoInput } from './components/TodoInput';
import { TodoList } from './components/TodoList';
import { FilterBar } from './components/FilterBar';
import { ProgressBar } from './components/ProgressBar';
import { Stats } from './components/Stats';
import { Calendar } from './components/Calendar';
import type { FilterState } from './types';
import { formatDateKey, formatMonthYear, getNextMonth, getPrevMonth } from './utils/dateUtils';

type ViewMode = 'list' | 'calendar';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
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

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📝 To Do List</h1>
          <p className="text-gray-600">효율적인 할 일 관리</p>
        </header>

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
          <Calendar
            todos={todos}
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />
        )}

        {/* 입력 및 검색 기능 */}
        <TodoInput onAdd={addTodo} />
        <FilterBar filters={filters} onFilterChange={setFilters} />

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {viewMode === 'list' 
                ? `${selectedDate.getMonth() + 1}월 목표 (${filteredTodos.length})`
                : `${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일의 할 일 (${filteredTodos.length})`
              }
            </h2>
          </div>
          <TodoList
            todos={filteredTodos}
            onToggle={toggleTodo}
            onEdit={editTodo}
            onDelete={deleteTodo}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
