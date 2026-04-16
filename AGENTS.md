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

*Last Updated: 2026-04-15*
