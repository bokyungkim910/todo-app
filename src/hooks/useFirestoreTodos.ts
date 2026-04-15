import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
  initializeFirestore,
  getFirestore,
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import type { Todo } from '../types';

// Firebase 앱 인스턴스는 외부에서 초기화되어야 함
let firestoreInstance: ReturnType<typeof getFirestore> | null = null;

/**
 * Firestore 인스턴스 설정
 * 앱 초기화 시 한 번만 호출
 */
export function initializeFirestoreDB(app: any) {
  if (!firestoreInstance) {
    firestoreInstance = initializeFirestore(app, {
      cacheSizeBytes: CACHE_SIZE_UNLIMITED,
    });

    // 오프라인 지속성 활성화
    enableIndexedDbPersistence(firestoreInstance).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence not available in this browser');
      }
    });
  }
  return firestoreInstance;
}

/**
 * Firestore 인스턴스 getter
 */
export function getFirestoreDB(): ReturnType<typeof getFirestore> {
  if (!firestoreInstance) {
    throw new Error('Firestore not initialized. Call initializeFirestoreDB first.');
  }
  return firestoreInstance;
}

// Firestore 데이터를 Todo 타입으로 변환
function docToTodo(docData: any, id: string): Todo {
  return {
    id,
    text: docData.text || '',
    completed: docData.completed || false,
    priority: docData.priority || 'medium',
    dueDate: docData.dueDate || '',
    category: docData.category || '기타',
    createdAt: docData.createdAt?.toMillis?.() || docData.createdAt || Date.now(),
    order: docData.order || 0,
    goalType: docData.goalType || 'weekly',
  };
}

// Todo 타입을 Firestore 데이터로 변환
function todoToDoc(todo: Partial<Todo>): Record<string, any> {
  const docData: Record<string, any> = {};

  if (todo.text !== undefined) docData.text = todo.text;
  if (todo.completed !== undefined) docData.completed = todo.completed;
  if (todo.priority !== undefined) docData.priority = todo.priority;
  if (todo.dueDate !== undefined) docData.dueDate = todo.dueDate;
  if (todo.category !== undefined) docData.category = todo.category;
  if (todo.order !== undefined) docData.order = todo.order;
  if (todo.goalType !== undefined) docData.goalType = todo.goalType;
  if (todo.createdAt !== undefined) {
    docData.createdAt = Timestamp.fromMillis(todo.createdAt);
  }

  return docData;
}

/**
 * 현재 인증된 사용자 ID 가져오기
 */
function getCurrentUserId(): string | null {
  const auth = getAuth();
  return auth.currentUser?.uid || null;
}

/**
 * 공유 권한 체크 - 다른 사용자의 데이터 읽기 권한 확인
 */
async function checkReadPermission(
  db: ReturnType<typeof getFirestore>,
  targetUserId: string,
  currentUserId: string
): Promise<boolean> {
  if (targetUserId === currentUserId) return true;

  try {
    const sharingDoc = await getDoc(doc(db, 'sharing', targetUserId));
    if (!sharingDoc.exists()) return false;

    const sharedWith = sharingDoc.data()?.sharedWith || [];
    return sharedWith.includes(currentUserId);
  } catch (error) {
    console.error('Error checking read permission:', error);
    return false;
  }
}

/**
 * Firestore 월간 목표 훅
 * 실시간 동기화 + 오프라인 캐싱 지원
 */
export function useFirestoreMonthlyTodos(
  year: number,
  month: number,
  options: { targetUserId?: string; readOnly?: boolean } = {}
) {
  const { targetUserId, readOnly = false } = options;
  const db = getFirestoreDB();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasPermission, setHasPermission] = useState(true);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

  // 실시간 구독 설정
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentUserId = getCurrentUserId();
        const effectiveUserId = targetUserId || currentUserId;

        if (!effectiveUserId) {
          setError(new Error('User not authenticated'));
          setLoading(false);
          return;
        }

        // 권한 체크 (다른 사용자 데이터 접근 시)
        if (targetUserId && targetUserId !== currentUserId) {
          const permitted = await checkReadPermission(db, targetUserId, currentUserId!);
          setHasPermission(permitted);
          if (!permitted) {
            setError(new Error('No permission to read this data'));
            setLoading(false);
            return;
          }
        }

        // Firestore 쿼리 설정
        const todosRef = collection(
          db,
          'users',
          effectiveUserId,
          'monthly',
          yearMonth,
          'todos'
        );
        const q = query(todosRef, orderBy('order', 'asc'));

        // 실시간 구독
        unsubscribeRef.current = onSnapshot(
          q,
          (snapshot) => {
            const todosData: Todo[] = [];
            snapshot.forEach((doc) => {
              todosData.push(docToTodo(doc.data(), doc.id));
            });
            setTodos(todosData);
            setLoading(false);
          },
          (err) => {
            console.error('Firestore subscription error:', err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up subscription:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    setupSubscription();

    // 클린업
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [db, year, month, targetUserId]);

  // CRUD Operations
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addTodo = useCallback(
    async (text: string, todoOptions: Partial<Todo> = {}) => {
      if (readOnly) {
        console.warn('Cannot add todo in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const newTodo: Todo = {
          id: generateId(),
          text,
          completed: false,
          priority: todoOptions.priority || 'medium',
          dueDate: todoOptions.dueDate || '',
          category: todoOptions.category || '기타',
          createdAt: Date.now(),
          order: todos.length,
          goalType: 'monthly',
          ...todoOptions,
        };

        const todoRef = doc(
          db,
          'users',
          currentUserId,
          'monthly',
          yearMonth,
          'todos',
          newTodo.id
        );

        await setDoc(todoRef, todoToDoc(newTodo));
      } catch (err) {
        console.error('Error adding todo:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, todos.length, yearMonth, readOnly]
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      if (readOnly) {
        console.warn('Cannot toggle todo in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const todoRef = doc(db, 'users', currentUserId, 'monthly', yearMonth, 'todos', id);
        const todo = todos.find((t) => t.id === id);

        if (todo) {
          await updateDoc(todoRef, { completed: !todo.completed });
        }
      } catch (err) {
        console.error('Error toggling todo:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, todos, yearMonth, readOnly]
  );

  const editTodo = useCallback(
    async (id: string, updates: Partial<Todo>) => {
      if (readOnly) {
        console.warn('Cannot edit todo in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const todoRef = doc(db, 'users', currentUserId, 'monthly', yearMonth, 'todos', id);
        await updateDoc(todoRef, todoToDoc(updates));
      } catch (err) {
        console.error('Error editing todo:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, yearMonth, readOnly]
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      if (readOnly) {
        console.warn('Cannot delete todo in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const todoRef = doc(db, 'users', currentUserId, 'monthly', yearMonth, 'todos', id);
        await deleteDoc(todoRef);
      } catch (err) {
        console.error('Error deleting todo:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, yearMonth, readOnly]
  );

  const reorderTodos = useCallback(
    async (newOrder: Todo[]) => {
      if (readOnly) {
        console.warn('Cannot reorder todos in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const batch = writeBatch(db);

        newOrder.forEach((todo, index) => {
          const todoRef = doc(db, 'users', currentUserId, 'monthly', yearMonth, 'todos', todo.id);
          batch.update(todoRef, { order: index });
        });

        await batch.commit();
      } catch (err) {
        console.error('Error reordering todos:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, yearMonth, readOnly]
  );

  return {
    todos,
    loading,
    error,
    hasPermission,
    isReadOnly: readOnly,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    reorderTodos,
  };
}

/**
 * Firestore 일별 할 일 훅
 * 실시간 동기화 + 오프라인 캐싱 지원
 */
export function useFirestoreDailyTodos(
  dateKey: string,
  options: { targetUserId?: string; readOnly?: boolean } = {}
) {
  const { targetUserId, readOnly = false } = options;
  const db = getFirestoreDB();

  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasPermission, setHasPermission] = useState(true);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 실시간 구독 설정
  useEffect(() => {
    const setupSubscription = async () => {
      try {
        setLoading(true);
        setError(null);

        const currentUserId = getCurrentUserId();
        const effectiveUserId = targetUserId || currentUserId;

        if (!effectiveUserId) {
          setError(new Error('User not authenticated'));
          setLoading(false);
          return;
        }

        // 권한 체크 (다른 사용자 데이터 접근 시)
        if (targetUserId && targetUserId !== currentUserId) {
          const permitted = await checkReadPermission(db, targetUserId, currentUserId!);
          setHasPermission(permitted);
          if (!permitted) {
            setError(new Error('No permission to read this data'));
            setLoading(false);
            return;
          }
        }

        // Firestore 쿼리 설정
        const todosRef = collection(db, 'users', effectiveUserId, 'daily', dateKey, 'todos');
        const q = query(todosRef, orderBy('order', 'asc'));

        // 실시간 구독
        unsubscribeRef.current = onSnapshot(
          q,
          (snapshot) => {
            const todosData: Todo[] = [];
            snapshot.forEach((doc) => {
              todosData.push(docToTodo(doc.data(), doc.id));
            });
            setTodos(todosData);
            setLoading(false);
          },
          (err) => {
            console.error('Firestore subscription error:', err);
            setError(err);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error setting up subscription:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    setupSubscription();

    // 클린업
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [db, dateKey, targetUserId]);

  // CRUD Operations
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addTodo = useCallback(
    async (text: string, todoOptions: Partial<Todo> = {}) => {
      if (readOnly) {
        console.warn('Cannot add todo in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const newTodo: Todo = {
          id: generateId(),
          text,
          completed: false,
          priority: todoOptions.priority || 'medium',
          dueDate: dateKey, // 일별 목록이므로 해당 날짜로 자동 설정
          category: todoOptions.category || '기타',
          createdAt: Date.now(),
          order: todos.length,
          goalType: 'weekly',
          ...todoOptions,
        };

        const todoRef = doc(db, 'users', currentUserId, 'daily', dateKey, 'todos', newTodo.id);

        await setDoc(todoRef, todoToDoc(newTodo));
      } catch (err) {
        console.error('Error adding todo:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, todos.length, dateKey, readOnly]
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      if (readOnly) {
        console.warn('Cannot toggle todo in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const todoRef = doc(db, 'users', currentUserId, 'daily', dateKey, 'todos', id);
        const todo = todos.find((t) => t.id === id);

        if (todo) {
          await updateDoc(todoRef, { completed: !todo.completed });
        }
      } catch (err) {
        console.error('Error toggling todo:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, todos, dateKey, readOnly]
  );

  const editTodo = useCallback(
    async (id: string, updates: Partial<Todo>) => {
      if (readOnly) {
        console.warn('Cannot edit todo in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const todoRef = doc(db, 'users', currentUserId, 'daily', dateKey, 'todos', id);
        await updateDoc(todoRef, todoToDoc(updates));
      } catch (err) {
        console.error('Error editing todo:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, dateKey, readOnly]
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      if (readOnly) {
        console.warn('Cannot delete todo in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const todoRef = doc(db, 'users', currentUserId, 'daily', dateKey, 'todos', id);
        await deleteDoc(todoRef);
      } catch (err) {
        console.error('Error deleting todo:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, dateKey, readOnly]
  );

  const reorderTodos = useCallback(
    async (newOrder: Todo[]) => {
      if (readOnly) {
        console.warn('Cannot reorder todos in read-only mode');
        return;
      }

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) throw new Error('User not authenticated');

        const batch = writeBatch(db);

        newOrder.forEach((todo, index) => {
          const todoRef = doc(db, 'users', currentUserId, 'daily', dateKey, 'todos', todo.id);
          batch.update(todoRef, { order: index });
        });

        await batch.commit();
      } catch (err) {
        console.error('Error reordering todos:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, dateKey, readOnly]
  );

  return {
    todos,
    loading,
    error,
    hasPermission,
    isReadOnly: readOnly,
    addTodo,
    toggleTodo,
    editTodo,
    deleteTodo,
    reorderTodos,
  };
}

/**
 * 공유 설정 관리 훅
 */
export function useSharing() {
  const db = getFirestoreDB();
  const [sharedUsers, setSharedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const currentUserId = getCurrentUserId();

  // 공유 목록 실시간 구독
  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const sharingRef = doc(db, 'sharing', currentUserId);

    const unsubscribe = onSnapshot(
      sharingRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setSharedUsers(snapshot.data()?.sharedWith || []);
        } else {
          setSharedUsers([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error loading sharing settings:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, currentUserId]);

  const shareWithUser = useCallback(
    async (targetUserId: string) => {
      try {
        if (!currentUserId) throw new Error('User not authenticated');

        const sharingRef = doc(db, 'sharing', currentUserId);
        const sharingDoc = await getDoc(sharingRef);

        if (sharingDoc.exists()) {
          const currentShared = sharingDoc.data()?.sharedWith || [];
          if (!currentShared.includes(targetUserId)) {
            await updateDoc(sharingRef, {
              sharedWith: [...currentShared, targetUserId],
            });
          }
        } else {
          await setDoc(sharingRef, {
            sharedWith: [targetUserId],
            createdAt: Timestamp.now(),
          });
        }
      } catch (err) {
        console.error('Error sharing with user:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, currentUserId]
  );

  const unshareWithUser = useCallback(
    async (targetUserId: string) => {
      try {
        if (!currentUserId) throw new Error('User not authenticated');

        const sharingRef = doc(db, 'sharing', currentUserId);
        const sharingDoc = await getDoc(sharingRef);

        if (sharingDoc.exists()) {
          const currentShared = sharingDoc.data()?.sharedWith || [];
          await updateDoc(sharingRef, {
            sharedWith: currentShared.filter((id: string) => id !== targetUserId),
          });
        }
      } catch (err) {
        console.error('Error unsharing with user:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, currentUserId]
  );

  return {
    sharedUsers,
    loading,
    error,
    shareWithUser,
    unshareWithUser,
  };
}

/**
 * 사용자 프로필 관리 훅
 */
export function useUserProfile() {
  const db = getFirestoreDB();
  const [profile, setProfile] = useState<{
    displayName?: string;
    email?: string;
    photoURL?: string;
    createdAt?: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const currentUserId = getCurrentUserId();

  useEffect(() => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    const profileRef = doc(db, 'users', currentUserId, 'profile', 'main');

    const unsubscribe = onSnapshot(
      profileRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setProfile({
            displayName: data.displayName,
            email: data.email,
            photoURL: data.photoURL,
            createdAt: data.createdAt?.toMillis?.(),
          });
        } else {
          setProfile(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error loading profile:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, currentUserId]);

  const updateProfile = useCallback(
    async (updates: { displayName?: string; photoURL?: string }) => {
      try {
        if (!currentUserId) throw new Error('User not authenticated');

        const profileRef = doc(db, 'users', currentUserId, 'profile', 'main');
        await updateDoc(profileRef, updates);
      } catch (err) {
        console.error('Error updating profile:', err);
        setError(err as Error);
        throw err;
      }
    },
    [db, currentUserId]
  );

  return {
    profile,
    loading,
    error,
    updateProfile,
  };
}

/**
 * 인증 상태 훅
 */
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
