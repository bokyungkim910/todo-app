import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '../types';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T) => void] {
  // key가 변경될 때마다 localStorage에서 즉시 로드
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // key가 변경되면 다시 로드
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      } else {
        setStoredValue(initialValue);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      setStoredValue(initialValue);
    }
  }, [key, initialValue]);

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}

// 월간 목표용: 특정 월의 데이터만 관리
export function useMonthlyTodos(year: number, month: number) {
  const storageKey = `todo-monthly-${year}-${month}`;
  const [todos, setTodos] = useLocalStorage<Todo[]>(storageKey, []);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addTodo = useCallback((text: string, options: Partial<Todo> = {}) => {
    const newTodo: Todo = {
      id: generateId(),
      text,
      completed: false,
      priority: options.priority || 'medium',
      dueDate: options.dueDate || '',
      category: options.category || '기타',
      createdAt: Date.now(),
      order: todos.length,
      goalType: 'monthly',
      ...options,
    };
    setTodos([...todos, newTodo]);
  }, [todos, setTodos]);

  const toggleTodo = useCallback((id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  }, [todos, setTodos]);

  const editTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, ...updates } : todo
    ));
  }, [todos, setTodos]);

  const deleteTodo = useCallback((id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  }, [todos, setTodos]);

  return {
    todos,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
  };
}

// 일별 할 일용: 특정 날짜의 데이터만 관리
export function useDailyTodos(dateKey: string) {
  const storageKey = `todo-daily-${dateKey}`;
  const [todos, setTodos] = useLocalStorage<Todo[]>(storageKey, []);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addTodo = useCallback((text: string, options: Partial<Todo> = {}) => {
    const newTodo: Todo = {
      id: generateId(),
      text,
      completed: false,
      priority: options.priority || 'medium',
      dueDate: dateKey, // 일별 목록이므로 해당 날짜로 자동 설정
      category: options.category || '기타',
      createdAt: Date.now(),
      order: todos.length,
      goalType: 'weekly',
      ...options,
    };
    setTodos([...todos, newTodo]);
  }, [todos, setTodos, dateKey]);

  const toggleTodo = useCallback((id: string) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  }, [todos, setTodos]);

  const editTodo = useCallback((id: string, updates: Partial<Todo>) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, ...updates } : todo
    ));
  }, [todos, setTodos]);

  const deleteTodo = useCallback((id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  }, [todos, setTodos]);

  return {
    todos,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
  };
}
