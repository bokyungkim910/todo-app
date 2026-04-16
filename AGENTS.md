# Agent Coding Guidelines for todo-app

> This file provides guidelines and commands for AI coding agents working in this repository.

---

## 📦 Build & Development Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Production build
npm run build

# Type checking
npm run build  # tsc -b && vite build

# Lint code
npm run lint

# Preview production build locally
npm run preview

# Run single test (if tests exist)
npm test -- --run
```

### Android / Capacitor Commands

```bash
# Build web and sync to Android
npm run android

# Build with live reload
npm run android:live

# Sync only
npm run cap:sync

# Open Android Studio
npm run cap:open:android

# Build Android APK
npm run cap:build:android
```

---

## 📁 Project Structure

```
todo-app/
├── src/
│   ├── components/       # React UI components
│   ├── contexts/         # React Context providers
│   ├── hooks/            # Custom React hooks
│   ├── firebase/         # Firebase SDK config
│   ├── config/           # App configuration
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── constants/        # App constants
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── firestore.rules       # Firestore security rules
├── firestore.indexes.json
├── vite.config.ts
└── package.json
```

---

## 🎨 Code Style Guidelines

### TypeScript

- **Use TypeScript** for all new code
- **Prefer explicit types** for function parameters and return values
- **Use interface** for object shapes, type for unions/primitives
- **Avoid `any`** - use `unknown` when type is truly unknown

```typescript
// Good
interface User {
  uid: string;
  email: string;
  nickname: string;
}

// Avoid
const user: any = getUser();
```

### React Components

- **Functional components** with hooks only (no class components)
- **Use named exports** for components
- **Co-locate** component styles if using CSS-in-JS

```tsx
// Good
export function ProfileMenu({ user }: ProfileMenuProps) {
  return <div>{user.name}</div>;
}

// Avoid
export default function ({ user }) {
  return <div>{user.name}</div>;
}
```

### Imports

- **Order imports**: React → external libraries → internal modules
- **Use absolute imports** from `src/` (configured in Vite)
- **No default re-exports** - prefer named exports

```typescript
// Good
import { useState, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import type { User } from '../types';

// Bad
import React, { useState } from 'react';
import Auth from '../contexts/AuthContext';
```

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `ProfileMenu.tsx` |
| Hooks | camelCase, `use` prefix | `useAuth.ts` |
| Types/Interfaces | PascalCase | `UserProfile` |
| Constants | SCREAMING_SNAKE | `MAX_USERS` |
| Files (components) | PascalCase.tsx | `ProfileMenu.tsx` |
| Files (hooks/utils) | camelCase.ts | `useAuth.ts` |

### Error Handling

- **Use try-catch** for async operations
- **Provide user-friendly error messages** (Korean for this project)
- **Log errors** to console with context

```typescript
// Good
try {
  await login(email, password);
} catch (err) {
  console.error('Login failed:', err);
  setError('로그인에 실패했습니다. 다시 시도해주세요.');
}
```

### State Management

- **Use `useState`** for simple local state
- **Use `useMemo`** for expensive computations
- **Use `useCallback`** for callbacks passed to child components
- **Avoid prop drilling** - use Context when needed

### Firebase

- **Use `import.meta.env`** for Vite environment variables (NOT `process.env`)
- **Initialize Firebase** once, export instances
- **Use real-time listeners** (`onSnapshot`) for Firestore data

```typescript
// Good
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
};

// Bad
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
};
```

### Firestore Collections Structure

```
users/{userId}/
  └── monthly/{yearMonth}/todos/{todoId}
  └── daily/{dateKey}/todos/{todoId}
  └── shares/{shareId}
invites/{inviteId}
```

### Security Rules

- **Always check authentication** with `request.auth != null`
- **Always check ownership** with `request.auth.uid == userId`
- **Use helper functions** for reusable conditions

---

## 🔍 Linting

ESLint is configured with:
- `@eslint/js` - ESLint recommended
- `typescript-eslint` - TypeScript support
- `eslint-plugin-react-hooks` - React hooks rules
- `eslint-plugin-react-refresh` - Vite HMR compatibility

Run linting:
```bash
npm run lint
```

---

## 🚀 Deployment

### Vercel (Production)

1. Push to GitHub `main` branch
2. Vercel auto-deploys
3. Set environment variables in Vercel Dashboard

### Required Environment Variables

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

---

## ⚠️ Common Pitfalls

1. **Don't use `process.env`** - use `import.meta.env` for Vite
2. **Don't use default exports** for components
3. **Don't forget to handle loading states** for Firebase Auth/Firestore
4. **Don't use `any`** - use `unknown` or proper types
5. **Don't ignore TypeScript strict mode warnings**

---

## 📝 Commit Messages

Use clear, descriptive commit messages:
```
feat: add user sharing functionality
fix: resolve auth state loading issue
docs: update deployment guide
refactor: simplify todo filtering logic
```

---

## 📝 개발 활동 기록 (2026-04-16)

### 색인 생성 (Firestore Indexes)
- **문제**: 일별/월별 할 일 조회 시 `The query requires an index` 오류 발생
- **원인**: `order ASC + createdAt DESC` 조합의 복합 색인 부재
- **해결**: `firestore.indexes.json`에 다음 색인 추가
  ```json
  {
    "collectionGroup": "todos",
    "fields": [
      { "fieldPath": "order", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  }
  ```
- **커밋**: `c90a52f` - fix: remove debug log and add Firestore composite index

### DEBUG 로그 제거
- **문제**: 프로필 메뉴 우측 상단에 DEBUG 정보 표시
- **해결**: `src/App.tsx`에서 DEBUG 로그 컴포넌트 제거
- **커밋**: `c90a52f`

### Firebase Auth 연동 - 사용자 프로필 자동 생성
- **문제**: `users` 컬렉션이 비어있어서 사용자 초대 시 "해당 이메일의 사용자를 찾을 수 없습니다" 오류
- **원인**: 회원가입 시 Firebase Auth 사용자는 생성되지만 Firestore `users` 문서가 생성되지 않음
- **해결**: `src/contexts/AuthContext.tsx` 수정
  - 회원가입 시 `users/{userId}` 프로필 자동 생성
  - 로그인 시 프로필이 없으면 자동 생성
  - 저장 필드: `email`, `nickname`, `createdAt`
- **추가**: `firestore.indexes.json`에 `users` 컬렉션의 `email` 필드 색인 추가 (이메일 검색용)
- **커밋**: `c120a30` - fix: auto-create user profile in Firestore on registration/login

### 로그아웃 버튼 추가
- **문제**: ProfileMenu에 로그아웃 버튼이 없음
- **해결**: `src/components/ProfileMenu.tsx`에 `onLogout` prop 추가 및 로그아웃 버튼 UI 구현
- **커밋**: `8308efc` - feat: add logout button to ProfileMenu

### Firestore Security Rules 수정
- **문제 1**: `users` 컬렉션의 이메일 검색 시 `Missing or insufficient permissions`
  - **원인**: `match /users/{userId}` 규칙에서 다른 사용자의 문서를 읽을 수 없음
  - **해결**: `match /users` (컬렉션 레벨)에 `allow read: if isAuthenticated()` 추가

- **문제 2**: 초대 생성 시 `Missing or insufficient permissions`
  - **원인**: `invites/{inviteId}`에서 `allow write: if isOwner(inviteId)` - `inviteId`는 자동 생성된 문서 ID로, 사용자의 UID와 다름
  - **해결**: `allow create: if isAuthenticated()`로 변경

- **문제 3**: 초대 수락 시 `Missing or insufficient permissions`
  - **원인**: 초대받은 사람이 초대자의 `users/{inviterId}/shares`에 쓸 권한 없음
  - **해결**: `shares/{shareId}` 규칙에 조건부 쓰기 권한 추가
    ```rules
    allow write: if isOwner(userId) ||
      (resource.data.sharedWithId == request.auth.uid && request.resource.data.status == 'active');
    ```

- **문제 4**: 초대 거부 시 `Missing or insufficient permissions`
  - **원인**: 초대자/초대받거자 모두 `inviteId`(문서 ID)가 자신의 UID가 아니므로 수정 권한 없음
  - **해결**: 아직 수정 안 됨 - 아래 제안된 규칙 적용 필요
    ```rules
    allow update: if request.auth.uid == resource.data.inviterId || 
                     request.auth.uid == resource.data.inviteeId;
    ```

### 초대 수락 시 양방향 공유 로직 수정
- **문제**: 초대 수락 시 초대자의 shares만 active로 변경, 초대받은 사람은 공유看不到
- **원인**: 초대받은 사람의 shares에 초대자를 추가하는 로직缺失
- **해결**: `src/App.tsx`의 `acceptInvite` 함수 수정
  - 초대자의 shares 상태를 active로 변경
  - **초대받은 사람(나)의 shares에 초대자 추가** ← 핵심 수정
  - `writeBatch`를 사용해서 원자적 처리
- **커밋**: `4cb93d3` - fix: add inviter to invitee's shares when accepting invite

### 알려진 이슈
1. **초대 거부 여전히 오류 발생**: `invites/{inviteId}` 규칙에서 `update` 권한이 초대자/초대받거자 모두에게 없음
2. **이메일 초대 기능 미구현**: 초대 링크나 이메일을 통한 초대 기능 필요 (Firebase Invites deprecated됨)

---

*Last Updated: 2026-04-16*
