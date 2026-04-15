import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useFirestoreMonthlyTodos,
  useFirestoreDailyTodos,
  useSharing,
  initializeFirestoreDB,
} from './useFirestoreTodos';

// Firebase 모킹
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  writeBatch: vi.fn(),
  Timestamp: {
    fromMillis: vi.fn((ms) => ({ toMillis: () => ms })),
    now: vi.fn(() => ({ toMillis: () => Date.now() })),
  },
  enableIndexedDbPersistence: vi.fn().mockResolvedValue(undefined),
  CACHE_SIZE_UNLIMITED: 104857600,
  initializeFirestore: vi.fn(() => ({})),
  getFirestore: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: { uid: 'test-user-123' },
  })),
  onAuthStateChanged: vi.fn((auth, callback) => {
    callback({ uid: 'test-user-123' });
    return vi.fn();
  }),
}));

import * as firestore from 'firebase/firestore';

describe('useFirestoreTodos', () => {
  const mockUnsubscribe = vi.fn();
  const mockBatch = {
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // writeBatch 모킹
    (firestore.writeBatch as any).mockReturnValue(mockBatch);

    // onSnapshot 모킹 - 실시간 업데이트 시뮬레이션
    (firestore.onSnapshot as any).mockImplementation((query, onNext, onError) => {
      // 초기 빈 데이터 반환
      onNext({
        forEach: vi.fn(),
        docs: [],
      });
      return mockUnsubscribe;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useFirestoreMonthlyTodos', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useFirestoreMonthlyTodos(2026, 4));

      expect(result.current.loading).toBe(true);
      expect(result.current.todos).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should load todos from Firestore', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          data: () => ({
            text: 'Test Todo 1',
            completed: false,
            priority: 'high',
            dueDate: '2026-04-08',
            category: 'Work',
            createdAt: { toMillis: () => 1234567890 },
            order: 0,
            goalType: 'monthly',
          }),
        },
      ];

      (firestore.onSnapshot as any).mockImplementation((query, onNext) => {
        onNext({
          forEach: (callback: any) => mockTodos.forEach(callback),
          docs: mockTodos,
        });
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useFirestoreMonthlyTodos(2026, 4));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].text).toBe('Test Todo 1');
    });

    it('should add a new todo', async () => {
      (firestore.setDoc as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestoreMonthlyTodos(2026, 4));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addTodo('New Todo', { priority: 'high' });
      });

      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('should toggle todo completion', async () => {
      const mockTodos = [
        {
          id: 'todo-1',
          data: () => ({
            text: 'Test Todo',
            completed: false,
            priority: 'medium',
            dueDate: '',
            category: '기타',
            createdAt: { toMillis: () => 1234567890 },
            order: 0,
            goalType: 'monthly',
          }),
        },
      ];

      (firestore.onSnapshot as any).mockImplementation((query, onNext) => {
        onNext({
          forEach: (callback: any) => mockTodos.forEach(callback),
          docs: mockTodos,
        });
        return mockUnsubscribe;
      });

      (firestore.updateDoc as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestoreMonthlyTodos(2026, 4));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleTodo('todo-1');
      });

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { completed: true }
      );
    });

    it('should delete a todo', async () => {
      (firestore.deleteDoc as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestoreMonthlyTodos(2026, 4));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.deleteTodo('todo-1');
      });

      expect(firestore.deleteDoc).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Firestore error');
      (firestore.onSnapshot as any).mockImplementation((query, onNext, onError) => {
        onError(error);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useFirestoreMonthlyTodos(2026, 4));

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.loading).toBe(false);
    });

    it('should not allow modifications in read-only mode', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useFirestoreMonthlyTodos(2026, 4, { readOnly: true })
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addTodo('Test');
      });

      expect(consoleSpy).toHaveBeenCalledWith('Cannot add todo in read-only mode');
      expect(firestore.setDoc).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should reorder todos using batch', async () => {
      const mockTodos = [
        { id: 'todo-1', text: 'First' },
        { id: 'todo-2', text: 'Second' },
      ];

      (firestore.onSnapshot as any).mockImplementation((query, onNext) => {
        onNext({
          forEach: (callback: any) => {
            mockTodos.forEach((todo, i) =>
              callback({
                id: todo.id,
                data: () => ({
                  ...todo,
                  completed: false,
                  priority: 'medium',
                  dueDate: '',
                  category: '기타',
                  createdAt: { toMillis: () => 1234567890 },
                  order: i,
                  goalType: 'monthly',
                }),
              })
            );
          },
          docs: mockTodos,
        });
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useFirestoreMonthlyTodos(2026, 4));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const reordered = [...result.current.todos].reverse();

      await act(async () => {
        await result.current.reorderTodos(reordered);
      });

      expect(firestore.writeBatch).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('useFirestoreDailyTodos', () => {
    it('should load daily todos', async () => {
      const mockTodos = [
        {
          id: 'daily-1',
          data: () => ({
            text: 'Daily Task',
            completed: false,
            priority: 'medium',
            dueDate: '2026-04-08',
            category: 'Personal',
            createdAt: { toMillis: () => 1234567890 },
            order: 0,
            goalType: 'weekly',
          }),
        },
      ];

      (firestore.onSnapshot as any).mockImplementation((query, onNext) => {
        onNext({
          forEach: (callback: any) => mockTodos.forEach(callback),
          docs: mockTodos,
        });
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useFirestoreDailyTodos('2026-04-08'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.todos).toHaveLength(1);
      expect(result.current.todos[0].goalType).toBe('weekly');
    });

    it('should automatically set dueDate to dateKey', async () => {
      (firestore.setDoc as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useFirestoreDailyTodos('2026-04-08'));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.addTodo('New Daily Task');
      });

      expect(firestore.setDoc).toHaveBeenCalled();
      const callArgs = (firestore.setDoc as any).mock.calls[0];
      expect(callArgs[1].dueDate).toBe('2026-04-08');
    });
  });

  describe('useSharing', () => {
    it('should load shared users', async () => {
      const mockSharing = {
        exists: () => true,
        data: () => ({
          sharedWith: ['user-1', 'user-2'],
          createdAt: { toMillis: () => 1234567890 },
        }),
      };

      (firestore.onSnapshot as any).mockImplementation((doc, onNext) => {
        onNext(mockSharing);
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useSharing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.sharedUsers).toEqual(['user-1', 'user-2']);
    });

    it('should share with a new user', async () => {
      (firestore.getDoc as any).mockResolvedValue({
        exists: () => false,
      });
      (firestore.setDoc as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSharing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.shareWithUser('new-user-123');
      });

      expect(firestore.setDoc).toHaveBeenCalled();
    });

    it('should unshare with a user', async () => {
      (firestore.getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({
          sharedWith: ['user-1', 'user-2'],
        }),
      });
      (firestore.updateDoc as any).mockResolvedValue(undefined);

      const { result } = renderHook(() => useSharing());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.unshareWithUser('user-1');
      });

      expect(firestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        { sharedWith: ['user-2'] }
      );
    });
  });

  describe('initializeFirestoreDB', () => {
    it('should initialize Firestore with persistence', () => {
      const mockApp = {};

      initializeFirestoreDB(mockApp);

      expect(firestore.initializeFirestore).toHaveBeenCalledWith(mockApp, {
        cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
      });
      expect(firestore.enableIndexedDbPersistence).toHaveBeenCalled();
    });

    it('should return existing instance if already initialized', () => {
      const mockApp = {};

      const instance1 = initializeFirestoreDB(mockApp);
      const instance2 = initializeFirestoreDB(mockApp);

      expect(firestore.initializeFirestore).toHaveBeenCalledTimes(1);
    });
  });
});
