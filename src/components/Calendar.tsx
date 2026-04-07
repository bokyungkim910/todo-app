import { useMemo } from 'react';
import type { Todo } from '../types';
import { 
  getWeekDates, 
  getNextDay, 
  getPrevDay, 
  formatDateKey,
  formatMonthYear,
  formatDayName,
  formatDateDisplay,
  formatShortDate,
  isToday
} from '../utils/dateUtils';

interface CalendarProps {
  todos: Todo[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function Calendar({ todos, selectedDate, onDateChange }: CalendarProps) {
  // 선택된 날짜 기준으로 주간 날짜 계산
  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);

  const todosByDate = useMemo(() => {
    const map: Record<string, number> = {};
    todos.forEach(todo => {
      if (todo.dueDate) {
        map[todo.dueDate] = (map[todo.dueDate] || 0) + 1;
      }
    });
    return map;
  }, [todos]);

  // 양방향 동기화: 화살표 클릭 시 selectedDate 변경
  const handlePrevDay = () => onDateChange(getPrevDay(selectedDate));
  const handleNextDay = () => onDateChange(getNextDay(selectedDate));
  const handleToday = () => onDateChange(new Date());

  const currentDateLabel = formatShortDate(selectedDate);
  const isCurrentDateToday = isToday(selectedDate);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            title="전날"
          >
            ←
          </button>
          <button
            onClick={handleToday}
            className={`px-3 py-1 text-sm rounded-lg transition-colors font-medium ${
              isCurrentDateToday
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {currentDateLabel}
          </button>
          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            title="다음날"
          >
            →
          </button>
        </div>
        <h2 className="text-lg font-semibold text-gray-800">
          {formatMonthYear(selectedDate)}
        </h2>
      </div>

      {/* 주별 그리드 */}
      <div className="grid grid-cols-7 divide-x divide-gray-200">
        {weekDates.map((date) => {
          const dateKey = formatDateKey(date);
          const todoCount = todosByDate[dateKey] || 0;
          const isSelected = formatDateKey(selectedDate) === dateKey;

          return (
            <button
              key={dateKey}
              onClick={() => onDateChange(date)}
              className={`p-4 min-h-[100px] text-left transition-all hover:bg-gray-50 ${
                isSelected ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex flex-col h-full">
                {/* 요일 */}
                <span className={`text-xs mb-1 font-bold ${
                  isSelected
                    ? 'text-blue-500' 
                    : date.getDay() === 0 
                      ? 'text-[#f82601]' 
                      : date.getDay() === 6 
                        ? 'text-[#0160f8]' 
                        : 'text-gray-500'
                }`}>
                  {formatDayName(date.getDay())}
                </span>
                
                {/* 날짜 */}
                <span className={`text-xl mb-2 ${
                  isSelected
                    ? 'text-blue-500 font-bold' 
                    : 'text-gray-800 font-semibold'
                }`}>
                  {date.getDate()}
                </span>

                {/* 할 일 개수 */}
                {todoCount > 0 && (
                  <div className="mt-auto">
                    <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-medium bg-blue-500 text-white rounded-full">
                      {todoCount}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜 정보 */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">선택된 날짜</p>
            <p className="text-lg font-semibold text-gray-800">
              {formatDateDisplay(selectedDate)}
            </p>
          </div>
          {todosByDate[formatDateKey(selectedDate)] > 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">예정된 할 일</p>
              <p className="text-lg font-semibold text-blue-600">
                {todosByDate[formatDateKey(selectedDate)]}개
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
