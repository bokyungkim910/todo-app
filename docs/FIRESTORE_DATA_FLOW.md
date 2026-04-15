# Firestore 데이터 흐름 다이어그램

## 개요

이 문서는 To Do List 앱의 Firestore 데이터 흐름과 아키텍처를 설명합니다.

## 데이터 구조

```
Firestore Database
│
├── users/
│   └── {userId}/
│       ├── profile/
│       │   └── main/
│       │       ├── displayName: string
│       │       ├── email: string
│       │       ├── photoURL: string
│       │       └── createdAt: timestamp
│       │
│       ├── monthly/
│       │   └── {year-month}/          (예: "2026-04")
│       │       └── todos/
│       │           └── {todoId}/
│       │               ├── text: string
│       │               ├── completed: boolean
│       │               ├── priority: "high" | "medium" | "low"
│       │               ├── dueDate: string
│       │               ├── category: string
│       │               ├── createdAt: timestamp
│       │               ├── order: number
│       │               └── goalType: "monthly"
│       │
│       └── daily/
│           └── {dateKey}/             (예: "2026-04-08")
│               └── todos/
│                   └── {todoId}/
│                       ├── text: string
│                       ├── completed: boolean
│                       ├── priority: "high" | "medium" | "low"
│                       ├── dueDate: string
│                       ├── category: string
│                       ├── createdAt: timestamp
│                       ├── order: number
│                       └── goalType: "weekly"
│
└── sharing/
    └── {userId}/
        ├── sharedWith: string[]       // 공유 대상 사용자 ID 목록
        └── createdAt: timestamp
```

## 데이터 흐름 다이어그램

### 1. 월간 목표 CRUD 흐름

```
┌─────────────────┐
│   React Component   │
│  (MonthlyGoalsView) │
└────────┬────────┘
         │ useFirestoreMonthlyTodos(year, month)
         ▼
┌─────────────────┐
│  useFirestoreMonthlyTodos  │
│      Hook       │
└────────┬────────┘
         │ onSnapshot subscription
         ▼
┌─────────────────┐
│   Firestore DB  │
│  /users/{uid}/  │
│ /monthly/{ym}/  │
│   /todos/{id}   │
└─────────────────┘
         │
         ▼ Real-time updates
┌─────────────────┐
│   Local State   │
│  (todos, loading) │
└─────────────────┘
```

### 2. 일별 할 일 CRUD 흐름

```
┌─────────────────┐
│   React Component   │
│   (DailyTodoView)   │
└────────┬────────┘
         │ useFirestoreDailyTodos(dateKey)
         ▼
┌─────────────────┐
│  useFirestoreDailyTodos   │
│      Hook       │
└────────┬────────┘
         │ onSnapshot subscription
         ▼
┌─────────────────┐
│   Firestore DB  │
│  /users/{uid}/  │
│  /daily/{date}/ │
│   /todos/{id}   │
└─────────────────┘
         │
         ▼ Real-time updates
┌─────────────────┐
│   Local State   │
│  (todos, loading) │
└─────────────────┘
```

### 3. 공유 권한 체크 흐름

```
┌─────────────────┐
│  Component requests  │
│  targetUserId data   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ checkReadPermission() │
│    (Hook 내부)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     No     ┌─────────────────┐
│ targetUserId == │───────────▶│  Return false   │
│ currentUserId?  │            │ (Access Denied) │
└────────┬────────┘            └─────────────────┘
         │ Yes
         ▼
┌─────────────────┐
│ Query sharing/  │
│ {targetUserId}  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     No     ┌─────────────────┐
│ currentUserId in│───────────▶│  Return false   │
│  sharedWith[]?  │            │ (Access Denied) │
└────────┬────────┘            └─────────────────┘
         │ Yes
         ▼
┌─────────────────┐
│  Return true    │
│ (Access Granted)│
└─────────────────┘
```

### 4. 오프라인 지원 흐름

```
┌─────────────────┐
│   User Action   │
│ (Add/Edit/Delete) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Firestore SDK  │
│  (Local Cache)  │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────┐
│ Online│ │ Offline   │
│       │ │           │
│ Write │ │ Queue     │
│ to    │ │ Operation │
│ Server│ │           │
└───┬───┘ └─────┬─────┘
    │           │
    ▼           ▼ (Reconnect)
┌─────────────────┐
│  Sync Pending   │
│  Operations     │
└─────────────────┘
```

## 실시간 동기화 시퀀스

```
Client A                          Firestore                          Client B
   │                                 │                                  │
   │─── addTodo() ─────────────────▶│                                  │
   │                                 │                                  │
   │                                 │─────── Document Update ─────────▶│
   │                                 │                                  │
   │◀── onSnapshot Callback ────────│                                  │
   │   (Local state updated)         │                                  │
   │                                 │                                  │
   │                                 │◀─── onSnapshot Callback ─────────│
   │                                 │    (Local state updated)         │
   │                                 │                                  │
```

## 상태 관리 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Component                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   todos     │  │   loading   │  │         error           │  │
│  │   (state)   │  │   (state)   │  │        (state)          │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────────┘  │
│         │                                                       │
│         │ useFirestoreMonthlyTodos() / useFirestoreDailyTodos() │
│         ▼                                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Custom Hook                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │    │
│  │  │  onSnapshot │  │   CRUD      │  │  Error Handler  │  │    │
│  │  │  Listener   │  │  Operations │  │                 │  │    │
│  │  └──────┬──────┘  └─────────────┘  └─────────────────┘  │    │
│  └─────────┼───────────────────────────────────────────────┘    │
│            │                                                    │
│            ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   Firestore SDK                         │    │
│  │         (Offline Persistence Enabled)                   │    │
│  └─────────────────────────┬───────────────────────────────┘    │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   Firestore DB  │
                    └─────────────────┘
```

## 보안 규칙 적용 흐름

```
┌─────────────────┐
│  Client Request │
│ (Read/Write)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Firestore Rules │
│   Evaluation    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────────┐
│ ALLOW │ │   DENY    │
│       │ │           │
│Execute│ │ Return    │
│Request│ │ Permission│
│       │ │   Error   │
└───┬───┘ └─────┬─────┘
    │           │
    ▼           ▼
┌─────────────────┐
│  Request Result │
│  (Success/Error)│
└─────────────────┘
```

## 마이그레이션 전략

### Phase 1: 병렬 운영 (현재)
```
App
├── useTodos.ts (LocalStorage) - 기존 기능 유지
└── useFirestoreTodos.ts (Firestore) - 새 기능 추가
```

### Phase 2: 점진적 마이그레이션
```
App
├── useTodos.ts (LocalStorage) - Fallback
├── useFirestoreTodos.ts (Firestore) - Primary
└── Migration Utility - LocalStorage → Firestore 데이터 이전
```

### Phase 3: 완전 전환
```
App
└── useFirestoreTodos.ts (Firestore) - Only
    └── LocalStorage backup (optional)
```

## 성능 최적화

### 인덱스 설정
- `order` 필드: 정렬 성능
- `completed` + `order`: 필터링 + 정렬
- `category` + `order`: 카테고리별 정렬

### 캐싱 전략
- `enableIndexedDbPersistence()`: 오프라인 캐싱
- `CACHE_SIZE_UNLIMITED`: 캐시 크기 무제한
- `onSnapshot`: 실시간 업데이트 구독

### 쿼리 최적화
- 컬렉션 그룹 쿼리 대신 명시적 경로 사용
- `orderBy`로 정렬 보장
- 필요한 필드만 선택 (선택적)
