/**
 * 읽기 전용 모드 사용 예시 컴포넌트
 * 
 * 이 파일은 읽기 전용 모드를 어떻게 구현하는지 보여주는 예시입니다.
 * 실제 사용 시에는 App.tsx나 다른 컴포넌트에서 참고하세요.
 */

import { useState } from 'react';
import { TodoList } from './TodoList';
import { ReadOnlyBanner } from './ReadOnlyBanner';
import type { Todo } from '../types';

// 예시 데이터
const exampleTodos: Todo[] = [
  {
    id: '1',
    text: '프로젝트 기획서 작성',
    completed: true,
    priority: 'high',
    dueDate: '2026-04-10',
    category: '업무',
    createdAt: Date.now(),
    order: 1,
    goalType: 'monthly',
  },
  {
    id: '2',
    text: '주간 회의 참석',
    completed: false,
    priority: 'medium',
    dueDate: '2026-04-08',
    category: '업무',
    createdAt: Date.now(),
    order: 2,
    goalType: 'monthly',
  },
  {
    id: '3',
    text: '운동 30분',
    completed: false,
    priority: 'low',
    dueDate: '',
    category: '건강',
    createdAt: Date.now(),
    order: 3,
    goalType: 'monthly',
  },
];

export function ReadOnlyExample() {
  // 읽기 전용 모드 상태
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [ownerName, setOwnerName] = useState('홍길동');

  // 읽기 전용 모드로 전환 (예: 공유된 체크리스트 열람 시)
  const enterReadOnlyMode = (sharedUserName: string) => {
    setIsReadOnly(true);
    setOwnerName(sharedUserName);
  };

  // 편집 모드로 전환
  const enterEditMode = () => {
    setIsReadOnly(false);
  };

  // 배너 닫기
  const closeReadOnlyMode = () => {
    setIsReadOnly(false);
    // 또는 다른 페이지로 이동
    console.log('읽기 전용 모드 종료');
  };

  // 핸들러 (읽기 전용 모드에서는 실제로 동작하지 않음)
  const handleToggle = (id: string) => {
    if (!isReadOnly) {
      console.log('Toggle:', id);
    }
  };

  const handleEdit = (id: string, updates: Partial<Todo>) => {
    if (!isReadOnly) {
      console.log('Edit:', id, updates);
    }
  };

  const handleDelete = (id: string) => {
    if (!isReadOnly) {
      console.log('Delete:', id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 읽기 전용 모드 배너 */}
        {isReadOnly && (
          <ReadOnlyBanner
            ownerName={ownerName}
            onEditMode={enterEditMode}
            onClose={closeReadOnlyMode}
          />
        )}

        {/* 헤더 영역 - 읽기 전용일 때 스타일 변경 */}
        <header className={`text-center ${isReadOnly ? 'bg-blue-50/50 rounded-lg p-4' : ''}`}>
          {isReadOnly && ownerName && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                👤 {ownerName}님의 체크리스트
              </span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-800 mb-2">📝 To Do List</h1>
          <p className="text-gray-600">
            {isReadOnly ? '체크리스트 열람 중' : '효율적인 할 일 관리'}
          </p>
        </header>

        {/* 모드 전환 버튼 (테스트용) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              현재 모드: <span className={`font-medium ${isReadOnly ? 'text-blue-600' : 'text-green-600'}`}>
                {isReadOnly ? '읽기 전용' : '편집 모드'}
              </span>
            </span>
            <button
              onClick={() => isReadOnly ? enterEditMode() : enterReadOnlyMode('홍길동')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isReadOnly
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isReadOnly ? '편집 모드로' : '읽기 전용 모드로'}
            </button>
          </div>
        </div>

        {/* TodoList - isReadOnly prop 전달 */}
        <div className={`rounded-lg p-4 ${isReadOnly ? 'bg-gray-50 border border-gray-200' : 'bg-white shadow-sm border border-gray-200'}`}>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {isReadOnly ? `${ownerName}님의 할 일 목록` : '내 할 일 목록'}
            <span className="ml-2 text-sm text-gray-500">({exampleTodos.length})</span>
          </h2>
          <TodoList
            todos={exampleTodos}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isReadOnly={isReadOnly}
            ownerName={ownerName}
          />
        </div>

        {/* 사용 방법 설명 */}
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
          <h3 className="font-semibold mb-2">💡 읽기 전용 모드 특징</h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>체크박스가 비활성화되어 클릭할 수 없습니다</li>
            <li>수정(✏️) 및 삭제(🗑️) 버튼이 숨겨집니다</li>
            <li>항목 텍스트를 클릭해도 편집 모드로 전환되지 않습니다</li>
            <li>배경색이 미세하게 다르게 표시됩니다 (gray-50)</li>
            <li>태그와 텍스트 색상이 약간 흐리게 표시됩니다</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default ReadOnlyExample;
