import { useState, useEffect, useCallback } from 'react';
import type { Todo } from '../types';
import { db } from '../firebase/config';
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
  writeBatch,
  getDocs,
  enableIndexedDbPersistence,
  getFirestore,
} from 'firebase/firestore';

// Firestore 오프라인 지원 활성화 (한 번만 실행)
let persistenceEnabled = false;
const enablePersistence = async () => {
  if (persistenceEnabled) return;
  try {
    const firestore = getFirestore();
    await enableIndexedDbPersistence(firestore);
    persistenceEnabled = true;
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not supported in this browser');
    }
  }
};

// 오프라인 지원 초기화
enablePersistence();

// ============================================
// LocalStorage 기반 훅 (Fallback / 마이그레이션용)
// ============================================

export function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

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

// ============================================
// Firestore 기반 훅
// ============================================

// 월간 목표용: 특정 월의 데이터만 관리
export function useMonthlyTodos(userId: string | null, year: number, month: number) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 실시간 동기화
  useEffect(() => {
    if (!userId) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Firestore 경로: users/{userId}/monthly/{year}-{month}/todos
    const todosRef = collection(db, 'users', userId, 'monthly', `${year}-${month}`, 'todos');
    const q = query(
      todosRef,
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const todosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Todo[];
        setTodos(todosData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching monthly todos:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, year, month]);

  // 할 일 추가
  const addTodo = useCallback(
    async (text: string, options: Partial<Todo> = {}) => {
      if (!userId) return;

      const todosRef = collection(db, 'users', userId, 'monthly', `${year}-${month}`, 'todos');
      const newTodo = {
        text,
        completed: false,
        priority: options.priority || 'medium',
        dueDate: options.dueDate || '',
        category: options.category || '기타',
        createdAt: Date.now(),
        order: todos.length,
        goalType: 'monthly' as const,
        year,
        month,
        ...options,
      };

      await addDoc(todosRef, newTodo);
    },
    [userId, year, month, todos.length]
  );

  // 할 일 완료 토글
  const toggleTodo = useCallback(
    async (id: string) => {
      if (!userId) return;

      const todoRef = doc(db, 'users', userId, 'monthly', `${year}-${month}`, 'todos', id);
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        await updateDoc(todoRef, {
          completed: !todo.completed,
          updatedAt: serverTimestamp(),
        });
      }
    },
    [userId, year, month, todos]
  );

  // 할 일 수정
  const editTodo = useCallback(
    async (id: string, updates: Partial<Todo>) => {
      if (!userId) return;

      const todoRef = doc(db, 'users', userId, 'monthly', `${year}-${month}`, 'todos', id);
      await updateDoc(todoRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    },
    [userId, year, month]
  );

  // 할 일 삭제
  const deleteTodo = useCallback(
    async (id: string) => {
      if (!userId) return;

      const todoRef = doc(db, 'users', userId, 'monthly', `${year}-${month}`, 'todos', id);
      await deleteDoc(todoRef);
    },
    [userId, year, month]
  );

  // 순서 변경 (드래그앤드롭)
  const reorderTodos = useCallback(
    async (newOrder: Todo[]) => {
      if (!userId) return;

      const batch = writeBatch(db);
      newOrder.forEach((todo, index) => {
        const todoRef = doc(db, 'users', userId, 'monthly', `${year}-${month}`, 'todos', todo.id);
        batch.update(todoRef, { order: index });
      });
      await batch.commit();
    },
    [userId, year, month]
  );

  return {
    todos,
    loading,
    error,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    reorderTodos,
  };
}

// 일별 할 일용: 특정 날짜의 데이터만 관리
export function useDailyTodos(userId: string | null, dateKey: string) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 실시간 동기화
  useEffect(() => {
    if (!userId) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Firestore 경로: users/{userId}/daily/{dateKey}/todos
    const todosRef = collection(db, 'users', userId, 'daily', dateKey, 'todos');
    const q = query(
      todosRef,
      orderBy('order', 'asc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const todosData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Todo[];
        setTodos(todosData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching daily todos:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, dateKey]);

  // 할 일 추가
  const addTodo = useCallback(
    async (text: string, options: Partial<Todo> = {}) => {
      if (!userId) return;

      const todosRef = collection(db, 'users', userId, 'daily', dateKey, 'todos');
      const newTodo = {
        text,
        completed: false,
        priority: options.priority || 'medium',
        dueDate: dateKey, // 일별 목록이므로 해당 날짜로 자동 설정
        category: options.category || '기타',
        createdAt: Date.now(),
        order: todos.length,
        goalType: 'weekly' as const,
        dateKey,
        ...options,
      };

      await addDoc(todosRef, newTodo);
    },
    [userId, dateKey, todos.length]
  );

  // 할 일 완료 토글
  const toggleTodo = useCallback(
    async (id: string) => {
      if (!userId) return;

      const todoRef = doc(db, 'users', userId, 'daily', dateKey, 'todos', id);
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        await updateDoc(todoRef, {
          completed: !todo.completed,
          updatedAt: serverTimestamp(),
        });
      }
    },
    [userId, dateKey, todos]
  );

  // 할 일 수정
  const editTodo = useCallback(
    async (id: string, updates: Partial<Todo>) => {
      if (!userId) return;

      const todoRef = doc(db, 'users', userId, 'daily', dateKey, 'todos', id);
      await updateDoc(todoRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    },
    [userId, dateKey]
  );

  // 할 일 삭제
  const deleteTodo = useCallback(
    async (id: string) => {
      if (!userId) return;

      const todoRef = doc(db, 'users', userId, 'daily', dateKey, 'todos', id);
      await deleteDoc(todoRef);
    },
    [userId, dateKey]
  );

  // 순서 변경 (드래그앤드롭)
  const reorderTodos = useCallback(
    async (newOrder: Todo[]) => {
      if (!userId) return;

      const batch = writeBatch(db);
      newOrder.forEach((todo, index) => {
        const todoRef = doc(db, 'users', userId, 'daily', dateKey, 'todos', todo.id);
        batch.update(todoRef, { order: index });
      });
      await batch.commit();
    },
    [userId, dateKey]
  );

  return {
    todos,
    loading,
    error,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    reorderTodos,
  };
}

// ============================================
// LocalStorage → Firestore 마이그레이션 함수
// ============================================

export async function migrateLocalStorageToFirestore(userId: string): Promise<{
  monthlyMigrated: number;
  dailyMigrated: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let monthlyMigrated = 0;
  let dailyMigrated = 0;

  try {
    // 월간 목표 마이그레이션
    const monthlyKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('todo-monthly-')
    );

    for (const key of monthlyKeys) {
      try {
        const data = localStorage.getItem(key);
        if (!data) continue;

        const todos: Todo[] = JSON.parse(data);
        const match = key.match(/todo-monthly-(\d+)-(\d+)/);
        if (!match) continue;

        const [, year, month] = match;
        const todosRef = collection(db, 'users', userId, 'monthly', `${year}-${month}`, 'todos');

        // 배치 쓰기로 마이그레이션
        const batch = writeBatch(db);
        for (const todo of todos) {
          const docRef = doc(todosRef);
          batch.set(docRef, {
            ...todo,
            year: parseInt(year),
            month: parseInt(month),
            migratedAt: serverTimestamp(),
          });
        }
        await batch.commit();
        monthlyMigrated += todos.length;

        // 마이그레이션 완료된 LocalStorage 항목 삭제 (선택사항)
        // localStorage.removeItem(key);
      } catch (err: any) {
        errors.push(`Failed to migrate ${key}: ${err.message}`);
      }
    }

    // 일별 할 일 마이그레이션
    const dailyKeys = Object.keys(localStorage).filter((key) =>
      key.startsWith('todo-daily-')
    );

    for (const key of dailyKeys) {
      try {
        const data = localStorage.getItem(key);
        if (!data) continue;

        const todos: Todo[] = JSON.parse(data);
        const match = key.match(/todo-daily-(.+)/);
        if (!match) continue;

        const [, dateKey] = match;
        const todosRef = collection(db, 'users', userId, 'daily', dateKey, 'todos');

        // 배치 쓰기로 마이그레이션
        const batch = writeBatch(db);
        for (const todo of todos) {
          const docRef = doc(todosRef);
          batch.set(docRef, {
            ...todo,
            dateKey,
            migratedAt: serverTimestamp(),
          });
        }
        await batch.commit();
        dailyMigrated += todos.length;

        // 마이그레이션 완료된 LocalStorage 항목 삭제 (선택사항)
        // localStorage.removeItem(key);
      } catch (err: any) {
        errors.push(`Failed to migrate ${key}: ${err.message}`);
      }
    }
  } catch (err: any) {
    errors.push(`Migration failed: ${err.message}`);
  }

  return { monthlyMigrated, dailyMigrated, errors };
}

// ============================================
// Firestore → LocalStorage 백업 함수
// ============================================

export async function backupFirestoreToLocalStorage(
  userId: string,
  year: number,
  month: number
): Promise<boolean> {
  try {
    // 월간 목표 백업
    const monthlyRef = collection(db, 'users', userId, 'monthly', `${year}-${month}`, 'todos');
    const monthlySnapshot = await getDocs(monthlyRef);
    const monthlyTodos = monthlySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Todo[];
    localStorage.setItem(`backup-monthly-${year}-${month}`, JSON.stringify(monthlyTodos));

    return true;
  } catch (err) {
    console.error('Backup failed:', err);
    return false;
  }
}
