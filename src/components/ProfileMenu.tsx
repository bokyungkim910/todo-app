import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { User, SharedUser } from '../types';

interface ProfileMenuProps {
  currentUser: User | null;
  sharedUsers: SharedUser[];
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  onOpenSettings: () => void;
  isReadOnly: boolean;
}

export function ProfileMenu({
  currentUser,
  sharedUsers,
  selectedUserId,
  onSelectUser,
  onOpenSettings,
  isReadOnly,
}: ProfileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // ESC 키로 메뉴 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const openMenu = useCallback(() => {
    setIsAnimating(true);
    setIsOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsOpen(false);
    }, 150);
  }, []);

  const toggleMenu = useCallback(() => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }, [isOpen, openMenu, closeMenu]);

  const handleUserSelect = useCallback(
    (userId: string) => {
      if (userId !== selectedUserId) {
        onSelectUser(userId);
      }
      closeMenu();
    },
    [selectedUserId, onSelectUser, closeMenu]
  );

  const handleSettingsClick = useCallback(() => {
    onOpenSettings();
    closeMenu();
  }, [onOpenSettings, closeMenu]);

  // 아바타 이니셜 생성
  const getInitials = useCallback((nickname: string) => {
    return nickname.slice(0, 2).toUpperCase();
  }, []);

  // 현재 선택된 사용자 정보
  const selectedUser = useMemo(() => {
    if (selectedUserId === currentUser?.uid) {
      return currentUser;
    }
    const shared = sharedUsers.find(u => u.uid === selectedUserId);
    return shared || currentUser;
  }, [selectedUserId, currentUser, sharedUsers]);

  // 활성화된 공유 사용자만 필터링
  const activeSharedUsers = useMemo(() => {
    return sharedUsers.filter(u => u.status === 'active');
  }, [sharedUsers]);

  // 프로필 색상 생성 (uid 기반)
  const getProfileColor = useCallback((uid: string) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  if (!currentUser) {
    return null;
  }

  return (
    <div className="relative">
      {/* 프로필 버튼 */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="프로필 메뉴 열기"
        className={`
          flex items-center justify-center
          w-10 h-10 sm:w-12 sm:h-12
          rounded-full
          text-white font-semibold text-sm sm:text-base
          transition-all duration-200 ease-in-out
          hover:scale-105 active:scale-95
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          shadow-md hover:shadow-lg
          ${isOpen ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
          ${isReadOnly ? 'ring-2 ring-amber-400' : ''}
        `}
        style={{ backgroundColor: getProfileColor(selectedUserId) }}
      >
        <span>{getInitials(selectedUser?.nickname || 'User')}</span>
      </button>

      {/* 읽기 전용 배지 */}
      {isReadOnly && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
          <svg
            className="w-2.5 h-2.5 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          className={`
            absolute right-0 mt-2
            w-72 sm:w-80
            bg-white rounded-xl
            shadow-xl border border-gray-100
            origin-top-right
            transition-all duration-150 ease-out
            ${isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2'}
            z-50
          `}
        >
          {/* 현재 사용자 섹션 */}
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-white rounded-t-xl">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
              현재 사용자
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold shadow-sm"
                style={{ backgroundColor: getProfileColor(currentUser.uid) }}
              >
                <span className="text-sm">{getInitials(currentUser.nickname)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {currentUser.nickname}
                </p>
                <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
              </div>
              {selectedUserId === currentUser.uid && (
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* 공유된 사용자 목록 */}
          {activeSharedUsers.length > 0 && (
            <>
              <div className="border-t border-gray-100" />
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  공유된 사용자
                </p>
                <div className="space-y-1">
                  {activeSharedUsers.map((user) => (
                    <button
                      key={user.uid}
                      onClick={() => handleUserSelect(user.uid)}
                      role="menuitem"
                      className={`
                        w-full flex items-center gap-3 px-2 py-2
                        rounded-lg
                        text-left
                        transition-colors duration-150
                        ${selectedUserId === user.uid 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'hover:bg-gray-50'
                        }
                        focus:outline-none focus:bg-gray-50
                        active:bg-gray-100
                      `}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                        style={{ backgroundColor: getProfileColor(user.uid) }}
                      >
                        <span>{getInitials(user.nickname)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-700 truncate block">
                          {user.nickname}
                        </span>
                        <span className="text-xs text-gray-400 truncate block">
                          {user.email}
                        </span>
                      </div>
                      {selectedUserId === user.uid && (
                        <svg
                          className="w-4 h-4 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 읽기 전용 모드 표시 */}
          {isReadOnly && (
            <>
              <div className="border-t border-gray-100" />
              <div className="px-4 py-2 bg-amber-50">
                <div className="flex items-center gap-2 text-amber-700">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-xs font-medium">읽기 전용 모드</span>
                </div>
                <p className="text-xs text-amber-600 mt-1">
                  다른 사용자의 체크리스트를 보고 있습니다.
                </p>
              </div>
            </>
          )}

          {/* 구분선 */}
          <div className="border-t border-gray-100" />

          {/* 설정 버튼 */}
          <div className="p-2">
            <button
              onClick={handleSettingsClick}
              role="menuitem"
              className="
                w-full flex items-center gap-3 px-3 py-2.5
                rounded-lg
                text-sm text-gray-700
                transition-colors duration-150
                hover:bg-gray-50
                focus:outline-none focus:bg-gray-50
                active:bg-gray-100
              "
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>공유 관리</span>
              {activeSharedUsers.length > 0 && (
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  {activeSharedUsers.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
