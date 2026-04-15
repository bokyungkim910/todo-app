# 프로필 UI 및 사용자 전환 기능 통합 가이드

## 📋 개요

이 가이드는 To Do List 앱에 프로필 메뉴, 사용자 전환, 읽기 전용 모드 기능을 통합하는 방법을 설명합니다.

## 🏗️ 생성된 파일 목록

### 새로 생성된 파일
| 파일 경로 | 설명 |
|-----------|------|
| `src/components/ProfileMenu.tsx` | 우측 상단 프로필 버튼 및 드롭다운 메뉴 |
| `src/components/UserSettingsModal.tsx` | 사용자 설정 모달 (닉네임, 프로필 사진, 색상) |
| `src/components/ReadOnlyBanner.tsx` | 읽기 전용 모드 상단 배너 |
| `src/contexts/UserContext.tsx` | 사용자 상태 관리 Context |
| `src/hooks/useUser.ts` | 사용자 관련 커스텀 훅 |
| `src/AppWithProfile.tsx` | 프로필 기능이 통합된 App 예시 |
| `src/main-with-profile.tsx` | UserProvider가 적용된 main 예시 |

### 수정된 파일
| 파일 경로 | 변경 내용 |
|-----------|-----------|
| `src/types/index.ts` | User, ViewMode, UserState 타입 추가 |
| `src/components/TodoList.tsx` | isReadOnly, ownerName prop 추가 |
| `src/components/TodoItem.tsx` | isReadOnly prop 추가, 읽기 전용 UI 구현 |

## 🚀 빠른 시작

### 방법 1: 완전 교체 (권장)

1. `main.tsx`를 `main-with-profile.tsx` 내용으로 교체:
```bash
cp src/main-with-profile.tsx src/main.tsx
```

2. `App.tsx`를 `AppWithProfile.tsx` 내용으로 교체:
```bash
cp src/AppWithProfile.tsx src/App.tsx
```

3. 개발 서버 재시작:
```bash
npm run dev
```

### 방법 2: 기존 코드에 통합

#### 1. main.tsx 수정
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { UserProvider } from './contexts/UserContext'  // 추가
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>  {/* 추가 */}
      <App />
    </UserProvider>  {/* 추가 */}
  </StrictMode>,
)
```

#### 2. App.tsx에 프로필 메뉴 추가
```tsx
import { ProfileMenu } from './components/ProfileMenu'
import { UserSettingsModal } from './components/UserSettingsModal'
import { ReadOnlyBanner } from './components/ReadOnlyBanner'
import { useUser, useIsReadOnly, useActiveUserName, useOtherUsers } from './hooks/useUser'

function App() {
  const { currentUser, users, switchUser, returnToOwn, updateUserProfile, logout } = useUser()
  const isReadOnly = useIsReadOnly()
  const activeUserName = useActiveUserName()
  const otherUsers = useOtherUsers()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // ... 기존 코드

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      {/* 헤더에 프로필 메뉴 추가 */}
      <header className="flex items-center justify-between">
        <div>
          <h1>📝 To Do List</h1>
        </div>
        <ProfileMenu
          currentUser={currentUser}
          users={otherUsers}
          onUserSwitch={switchUser}
          onSettingsClick={() => setIsSettingsOpen(true)}
          onLogout={logout}
        />
      </header>

      {/* 읽기 전용 배너 */}
      {isReadOnly && (
        <ReadOnlyBanner
          ownerName={activeUserName}
          onEditMode={returnToOwn}
        />
      )}

      {/* TodoList에 isReadOnly 전달 */}
      <TodoList
        todos={filteredTodos}
        onToggle={toggleTodo}
        onEdit={editTodo}
        onDelete={deleteTodo}
        isReadOnly={isReadOnly}
      />

      {/* 설정 모달 */}
      <UserSettingsModal
        isOpen={isSettingsOpen}
        user={currentUser}
        onClose={() => setIsSettingsOpen(false)}
        onSave={updateUserProfile}
        onLogout={logout}
      />
    </div>
  )
}
```

## 📖 주요 기능 설명

### 1. ProfileMenu 컴포넌트

우측 상단에 위치하는 프로필 버튼과 드롭다운 메뉴입니다.

**기능:**
- 원형 아바타 버튼 (이니셜 또는 프로필 사진)
- 클릭 시 사용자 목록 드롭다운
- 현재 사용자 하이라이트 (체크마크)
- 다른 사용자 선택 시 읽기 전용 모드로 전환
- 설정/로그아웃 버튼

**Props:**
```typescript
interface ProfileMenuProps {
  currentUser: User
  users: User[]
  onUserSwitch: (userId: string) => void
  onSettingsClick: () => void
  onLogout: () => void
}
```

### 2. UserSettingsModal 컴포넌트

사용자 정보를 수정하는 모달입니다.

**기능:**
- 프로필 사진 업로드/제거 (2MB 제한)
- 닉네임 변경 (20자 제한, 특수문자 불가)
- 테마 색상 선택 (8가지 프리셋)
- 로그아웃 버튼

**Props:**
```typescript
interface UserSettingsModalProps {
  isOpen: boolean
  user: User
  onClose: () => void
  onSave: (updates: Partial<User>) => void
  onLogout: () => void
}
```

### 3. ReadOnlyBanner 컴포넌트

읽기 전용 모드임을 알리는 상단 배너입니다.

**기능:**
- "OOO님의 체크리스트를 보고 있습니다" 메시지
- 편집하기 버튼 (자신의 체크리스트로 돌아가기)
- 닫기 버튼

**Props:**
```typescript
interface ReadOnlyBannerProps {
  ownerName: string
  onEditMode?: () => void
  onClose?: () => void
}
```

### 4. useUser 훅

사용자 상태와 액션을 제공하는 커스텀 훅입니다.

```typescript
const {
  currentUser,      // 현재 로그인한 사용자
  viewingUser,      // 현재 보고 있는 사용자 (null이면 자신)
  viewMode,         // 'edit' | 'view'
  isReadOnly,       // 읽기 전용 여부
  users,            // 모든 사용자 목록
  switchUser,       // 사용자 전환
  returnToOwn,      // 자신의 체크리스트로 돌아가기
  updateUserProfile,// 프로필 업데이트
  logout,           // 로그아웃
} = useUser()
```

### 5. TodoList 읽기 전용 모드

`isReadOnly` prop을 통해 읽기 전용 모드를 활성화합니다.

```typescript
<TodoList
  todos={todos}
  onToggle={toggleTodo}
  onEdit={editTodo}
  onDelete={deleteTodo}
  isReadOnly={true}  // 읽기 전용 모드
  ownerName="홍길동"
/>
```

읽기 전용 모드에서:
- 체크박스 비활성화
- 수정/삭제 버튼 숨김
- 배경색 및 테두리 변경
- 텍스트 흐리게 표시

## 🎨 스타일 가이드

### 색상 팔레트
```typescript
const PRESET_COLORS = [
  { name: '블루', value: '#3b82f6' },
  { name: '그린', value: '#10b981' },
  { name: '퍼플', value: '#8b5cf6' },
  { name: '핑크', value: '#ec4899' },
  { name: '오렌지', value: '#f97316' },
  { name: '레드', value: '#ef4444' },
  { name: '시안', value: '#06b6d4' },
  { name: '그레이', value: '#6b7280' },
]
```

### 읽기 전용 모드 스타일
- 배경: `bg-gray-50` 또는 `bg-blue-50/30`
- 테두리: `border-gray-200` 또는 `border-blue-100`
- 텍스트: `opacity-50` ~ `opacity-90`
- 체크박스: `cursor-not-allowed opacity-60`

### 프로필 버튼 스타일
- 크기: `w-10 h-10 sm:w-12 sm:h-12`
- 모양: `rounded-full`
- 그림자: `shadow-md hover:shadow-lg`
- 호버: `hover:scale-105 active:scale-95`

## 📱 모바일 최적화

### 반응형 브레이크포인트
- `sm:` (640px 이상): 데스크톱 스타일
- 기본: 모바일 스타일

### 터치 친화적 크기
- 버튼 최소 크기: 44x44px
- 입력 필드: 충분한 패딩
- 드롭다운: 전체 너비 사용

## 🔒 localStorage 키

```typescript
const STORAGE_KEYS = {
  CURRENT_USER: 'todo-app-current-user',   // 현재 로그인한 사용자
  USERS: 'todo-app-users',                  // 등록된 사용자 목록
  VIEWING_USER: 'todo-app-viewing-user',    // 현재 보고 있는 사용자 ID
  VIEW_MODE: 'todo-app-view-mode',          // 'edit' | 'view'
}
```

## 🧪 테스트 방법

### 1. 사용자 전환 테스트
1. 프로필 버튼 클릭
2. 다른 사용자 선택
3. 읽기 전용 모드로 전환 확인
4. 편집 버튼 비활성화 확인

### 2. 설정 변경 테스트
1. 프로필 메뉴 → 설정 클릭
2. 닉네임 변경
3. 색상 변경
4. 저장 후 반영 확인

### 3. 읽기 전용 모드 테스트
1. 다른 사용자 선택
2. 할 일 체크 불가 확인
3. 수정/삭제 버튼 숨김 확인
4. "편집하기" 버튼으로 돌아가기 확인

## 🐛 문제 해결

### Context not found 에러
```
Error: useUserContext must be used within a UserProvider
```
**해결:** `UserProvider`가 최상위에 있는지 확인

### 사용자 데이터가 유지되지 않음
**해결:** localStorage 확인 (개발자 도구 → Application → Local Storage)

### 스타일이 적용되지 않음
**해결:** Tailwind CSS가 올바르게 설정되어 있는지 확인

## 📝 추가 개선 아이디어

- [ ] 사용자 아바타 업로드 (이미지 파일)
- [ ] 사용자 추가/삭제 기능
- [ ] 체크리스트 공유 기능 (링크 생성)
- [ ] 읽기 전용 모드에서도 체크 가능 (권한 설정)
- [ ] 사용자별 테마 색상 적용

---

*Last Updated: 2026-04-08*
