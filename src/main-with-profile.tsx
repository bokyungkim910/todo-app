/**
 * 프로필 기능이 통합된 main.tsx 예시
 * 
 * 사용 방법:
 * 1. 이 파일을 main.tsx로 복사하거나
 * 2. 기존 main.tsx에 UserProvider를 추가
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { UserProvider } from './contexts/UserContext'
import AppWithProfile from './AppWithProfile'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UserProvider>
      <AppWithProfile />
    </UserProvider>
  </StrictMode>,
)
