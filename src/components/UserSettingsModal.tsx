import { useState, useRef, useEffect } from 'react';
import type { User } from '../types';

interface UserSettingsModalProps {
  isOpen: boolean;
  user: User;
  onClose: () => void;
  onSave: (updates: Partial<User>) => void;
  onLogout: () => void;
}

// 프리셋 색상 팔레트
const PRESET_COLORS = [
  { name: '블루', value: '#3b82f6' },
  { name: '그린', value: '#10b981' },
  { name: '퍼플', value: '#8b5cf6' },
  { name: '핑크', value: '#ec4899' },
  { name: '오렌지', value: '#f97316' },
  { name: '레드', value: '#ef4444' },
  { name: '시안', value: '#06b6d4' },
  { name: '그레이', value: '#6b7280' },
];

// 기본 아바타 SVG
const DefaultAvatar = ({ color }: { color: string }) => (
  <svg
    className="w-full h-full"
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="50" cy="50" r="50" fill={color} opacity="0.2" />
    <circle cx="50" cy="40" r="18" fill={color} />
    <ellipse cx="50" cy="85" rx="30" ry="25" fill={color} />
  </svg>
);

export function UserSettingsModal({
  isOpen,
  user,
  onClose,
  onSave,
  onLogout,
}: UserSettingsModalProps) {
  const [nickname, setNickname] = useState(user.nickname);
  const [selectedColor, setSelectedColor] = useState(user.color);
  const [avatar, setAvatar] = useState<string | undefined>(user.avatar);
  const [nicknameError, setNicknameError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // 모달 열림/닫힘 애니메이션 처리
  useEffect(() => {
    if (isOpen) {
      // 초기값 설정
      setNickname(user.nickname);
      setSelectedColor(user.color);
      setAvatar(user.avatar);
      setNicknameError('');
      // 애니메이션을 위해 약간의 지연 후 visible 상태로
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);
    }
  }, [isOpen, user]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 닉네임 유효성 검사
  const validateNickname = (value: string): boolean => {
    if (!value.trim()) {
      setNicknameError('닉네임을 입력해주세요.');
      return false;
    }
    if (value.length > 20) {
      setNicknameError('닉네임은 20자 이하여야 합니다.');
      return false;
    }
    // 특수문자 제한 (알파벳, 숫자, 한글, 공백만 허용)
    const specialCharsRegex = /[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s]/;
    if (specialCharsRegex.test(value)) {
      setNicknameError('특수문자는 사용할 수 없습니다.');
      return false;
    }
    setNicknameError('');
    return true;
  };

  const handleNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNickname(value);
    if (nicknameError) {
      validateNickname(value);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 파일 크기 제한 (2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('파일 크기는 2MB 이하여야 합니다.');
        return;
      }
      // 이미지 파일만 허용
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드할 수 있습니다.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatar(undefined);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!validateNickname(nickname)) {
      return;
    }
    onSave({
      nickname: nickname.trim(),
      color: selectedColor,
      avatar,
    });
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      onClick={handleOverlayClick}
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* 오버레이 배경 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* 모달 컨텐츠 */}
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800">사용자 설정</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-6 py-6 space-y-6">
          {/* 프로필 사진 영역 */}
          <div className="flex flex-col items-center">
            <div
              className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg"
              style={{ borderColor: selectedColor + '40' }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  alt="프로필"
                  className="w-full h-full object-cover"
                />
              ) : (
                <DefaultAvatar color={selectedColor} />
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                사진 변경
              </button>
              {avatar && (
                <button
                  onClick={handleRemoveAvatar}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  사진 제거
                </button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* 닉네임 입력 필드 */}
          <div>
            <label
              htmlFor="nickname"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={handleNicknameChange}
              maxLength={20}
              placeholder="닉네임을 입력하세요"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all ${
                nicknameError
                  ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                  : 'border-gray-200 focus:ring-blue-200 focus:border-blue-400'
              }`}
            />
            <div className="flex justify-between mt-1">
              {nicknameError ? (
                <span className="text-sm text-red-500">{nicknameError}</span>
              ) : (
                <span className="text-sm text-gray-400">
                  알파벳, 숫자, 한글만 사용 가능
                </span>
              )}
              <span className="text-sm text-gray-400">
                {nickname.length}/20
              </span>
            </div>
          </div>

          {/* 색상 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              테마 색상
            </label>
            <div className="grid grid-cols-4 gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={`relative w-full aspect-square rounded-xl transition-all ${
                    selectedColor === color.value
                      ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                >
                  {selectedColor === color.value && (
                    <svg
                      className="absolute inset-0 m-auto w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-100" />

        {/* 버튼 영역 */}
        <div className="px-6 py-4 space-y-3">
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!!nicknameError || !nickname.trim()}
              className="flex-1 px-4 py-3 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: selectedColor,
              }}
              onMouseEnter={(e) => {
                if (!nicknameError && nickname.trim()) {
                  e.currentTarget.style.backgroundColor = selectedColor + 'dd';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = selectedColor;
              }}
            >
              저장
            </button>
          </div>
          <button
            onClick={onLogout}
            className="w-full px-4 py-3 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
}

/* 사용 예시:

import { useState } from 'react';
import { UserSettingsModal } from './components/UserSettingsModal';
import type { User } from './types';

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<User>({
    id: '1',
    nickname: '사용자',
    color: '#3b82f6',
  });

  const handleSave = (updates: Partial<User>) => {
    setUser((prev) => ({ ...prev, ...updates }));
    // API 호출 등 추가 로직
  };

  const handleLogout = () => {
    // 로그아웃 로직
    console.log('로그아웃');
  };

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>
        설정 열기
      </button>
      
      <UserSettingsModal
        isOpen={isModalOpen}
        user={user}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        onLogout={handleLogout}
      />
    </div>
  );
}

*/
