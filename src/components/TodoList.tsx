import type { Todo } from '../types';
import { TodoItem } from './TodoItem';

interface TodoListProps {
  todos: Todo[];
  onToggle: (id: string) => void;
  onEdit: (id: string, updates: Partial<Todo>) => void;
  onDelete: (id: string) => void;
  isReadOnly?: boolean;
  ownerName?: string;
}

export function TodoList({ todos, onToggle, onEdit, onDelete, isReadOnly = false, ownerName }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <div className={`text-center py-12 ${isReadOnly ? 'text-gray-500' : 'text-gray-400'}`}>
        <p className="text-lg mb-2">📝</p>
        <p>할 일이 없습니다.</p>
        {!isReadOnly && <p className="text-sm">새로운 할 일을 추가해보세요!</p>}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${isReadOnly ? 'bg-gray-50/50 rounded-lg p-2' : ''}`}>
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          isReadOnly={isReadOnly}
        />
      ))}
    </div>
  );
}
