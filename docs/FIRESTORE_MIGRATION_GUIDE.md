# Firestore 마이그레이션 가이드

## 개요

이 가이드는 LocalStorage 기반 To Do List 앱을 Firestore로 마이그레이션하는 방법을 설명합니다.

## 사전 준비사항

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 새 프로젝트 생성
3. Firestore Database 활성화
4. Authentication 활성화 (Google 로그인 권장)

### 2. Firebase SDK 설치

```bash
npm install firebase
```

### 3. 환경 변수 설정

`.env` 파일 생성:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## 마이그레이션 단계

### Step 1: Firebase 초기화

`src/config/firebase.ts` 파일 확인:

```typescript
import { initializeFirebase } from './config/firebase';

// App.tsx 또는 main.tsx에서 초기화
initializeFirebase();
```

### Step 2: Firestore 보안 규칙 배포

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 초기화
firebase init firestore

# 규칙 배포
firebase deploy --only firestore:rules
```

### Step 3: 인덱스 설정

```bash
# 인덱스 배포
firebase deploy --only firestore:indexes
```

### Step 4: 컴포넌트 업데이트

기존 컴포넌트에서 Firestore 훅 사용:

```typescript
// Before (LocalStorage)
import { useMonthlyTodos } from '../hooks/useTodos';

function MonthlyGoalsView({ year, month }) {
  const { todos, addTodo, toggleTodo } = useMonthlyTodos(year, month);
  // ...
}

// After (Firestore)
import { useFirestoreMonthlyTodos } from '../hooks/useFirestoreTodos';

function MonthlyGoalsView({ year, month }) {
  const { todos, loading, error, addTodo, toggleTodo } = useFirestoreMonthlyTodos(year, month);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  // ...
}
```

### Step 5: 데이터 마이그레이션 (선택사항)

LocalStorage 데이터를 Firestore로 이전:

```typescript
// src/utils/migrateData.ts
import { getFirestoreDB } from '../hooks/useFirestoreTodos';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';

export async function migrateLocalStorageToFirestore() {
  const db = getFirestoreDB();
  const batch = writeBatch(db);
  
  // LocalStorage에서 모든 데이터 읽기
  const keys = Object.keys(localStorage).filter(key => 
    key.startsWith('todo-monthly-') || key.startsWith('todo-daily-')
  );
  
  for (const key of keys) {
    const todos = JSON.parse(localStorage.getItem(key) || '[]');
    const userId = getCurrentUserId(); // 현재 사용자 ID
    
    if (key.startsWith('todo-monthly-')) {
      const yearMonth = key.replace('todo-monthly-', '');
      for (const todo of todos) {
        const ref = doc(db, 'users', userId, 'monthly', yearMonth, 'todos', todo.id);
        batch.set(ref, todoToDoc(todo));
      }
    }
    // ... daily 데이터도 동일하게 처리
  }
  
  await batch.commit();
  console.log('Migration complete!');
}
```

## API 비교

### useMonthlyTodos

| 기능 | LocalStorage | Firestore |
|------|-------------|-----------|
| 데이터 저장소 | LocalStorage | Firestore |
| 실시간 동기화 | ❌ | ✅ onSnapshot |
| 오프라인 지원 | ✅ | ✅ enablePersistence |
| 반환값 | `{ todos, addTodo, ... }` | `{ todos, loading, error, addTodo, ... }` |
| 에러 처리 | 콘솔 로그 | Error 상태 반환 |
| 로딩 상태 | 없음 | loading 상태 제공 |

### useDailyTodos

동일한 패턴 적용

## 새로운 기능

### 공유 기능

```typescript
import { useSharing } from '../hooks/useFirestoreTodos';

function SharingSettings() {
  const { sharedUsers, shareWithUser, unshareWithUser } = useSharing();
  
  const handleShare = async (userId: string) => {
    await shareWithUser(userId);
  };
  
  return (
    <div>
      <h3>공유 설정</h3>
      {sharedUsers.map(userId => (
        <div key={userId}>
          {userId}
          <button onClick={() => unshareWithUser(userId)}>제거</button>
        </div>
      ))}
    </div>
  );
}
```

### 다른 사용자 데이터 보기

```typescript
function SharedTodoView({ targetUserId }: { targetUserId: string }) {
  const { todos, loading, hasPermission } = useFirestoreMonthlyTodos(2026, 4, {
    targetUserId,
    readOnly: true
  });
  
  if (!hasPermission) return <div>접근 권한이 없습니다</div>;
  if (loading) return <div>로딩 중...</div>;
  
  return <TodoList todos={todos} readOnly />;
}
```

## 에러 처리

### 일반적인 에러

```typescript
const { todos, error, loading } = useFirestoreMonthlyTodos(year, month);

if (error) {
  return (
    <div className="error-container">
      <h3>데이터 로딩 실패</h3>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>재시도</button>
    </div>
  );
}
```

### 오프라인 처리

```typescript
const { todos, loading } = useFirestoreMonthlyTodos(year, month);

// 오프라인 상태에서도 todos는 캐시된 데이터 제공
// loading은 false로 변경되지만 네트워크 에러는 발생하지 않음
```

## 성능 팁

### 1. 구독 관리

```typescript
useEffect(() => {
  // 컴포넌트 언마운트 시 자동으로 구독 해제
  return () => {
    // cleanup handled by hook
  };
}, [year, month]);
```

### 2. 배치 작업

```typescript
// 개별 업데이트 대신 배치 사용
const { reorderTodos } = useFirestoreMonthlyTodos(year, month);

// reorderTodos는 내부적으로 writeBatch 사용
await reorderTodos(newOrder);
```

### 3. 인덱스 활용

`firestore.indexes.json`에 정의된 인덱스를 통해 쿼리 성능 최적화

## 문제 해결

### Q: 데이터가 실시간으로 업데이트되지 않음
A: 
- Firestore 규칙 확인
- 네트워크 연결 확인
- onSnapshot 콜백 에러 확인

### Q: 오프라인 모드에서 데이터가 저장되지 않음
A:
- `enableIndexedDbPersistence()` 호출 확인
- 브라우저 지원 확인 (Chrome, Firefox 권장)
- 시크릿 모드에서는 IndexedDB 사용 불가

### Q: 권한 에러 발생
A:
- Firestore 규칙에서 사용자 인증 확인
- `request.auth != null` 조건 확인
- 공유 설정이 올바르게 되어 있는지 확인

## 참고 자료

- [Firebase Firestore 문서](https://firebase.google.com/docs/firestore)
- [Firestore 보안 규칙](https://firebase.google.com/docs/rules)
- [Firestore 오프라인 지원](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
