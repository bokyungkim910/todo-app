import React, { useState, useCallback, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { googleProvider } from '../firebase/config';
import { signInWithPopup } from 'firebase/auth';

// ============================================
// 타입 정의
// ============================================

type AuthMode = 'login' | 'register';

interface AuthModalProps {
  /** 모달 표시 여부 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 초기 모드 (기본값: 'login') */
  initialMode?: AuthMode;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  nickname: string;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  nickname?: string;
}

// ============================================
// 유효성 검사 함수
// ============================================

/**
 * 이메일 유효성 검사
 */
const validateEmail = (email: string): string | undefined => {
  if (!email.trim()) {
    return '이메일을 입력해주세요.';
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return '유효한 이메일 주소를 입력해주세요.';
  }
  return undefined;
};

/**
 * 비밀번호 유효성 검사
 */
const validatePassword = (password: string): string | undefined => {
  if (!password) {
    return '비밀번호를 입력해주세요.';
  }
  if (password.length < 6) {
    return '비밀번호는 최소 6자 이상이어야 합니다.';
  }
  return undefined;
};

/**
 * 비밀번호 확인 유효성 검사
 */
const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
  if (!confirmPassword) {
    return '비밀번호 확인을 입력해주세요.';
  }
  if (password !== confirmPassword) {
    return '비밀번호가 일치하지 않습니다.';
  }
  return undefined;
};

/**
 * 닉네임 유효성 검사
 */
const validateNickname = (nickname: string): string | undefined => {
  if (!nickname.trim()) {
    return '닉네임을 입력해주세요.';
  }
  if (nickname.trim().length < 2) {
    return '닉네임은 최소 2자 이상이어야 합니다.';
  }
  if (nickname.trim().length > 20) {
    return '닉네임은 최대 20자까지 가능합니다.';
  }
  return undefined;
};

// ============================================
// AuthModal 컴포넌트
// ============================================

/**
 * 로그인/회원가입 모달 컴포넌트
 *
 * Firebase Authentication을 사용한 이메일/비밀번호 인증 UI를 제공합니다.
 *
 * @example
 * ```tsx
 * function App() {
 *   const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
 *
 *   return (
 *     <>
 *       <button onClick={() => setIsAuthModalOpen(true)}>로그인</button>
 *       <AuthModal
 *         isOpen={isAuthModalOpen}
 *         onClose={() => setIsAuthModalOpen(false)}
 *         initialMode="login"
 *       />
 *     </>
 *   );
 * }
 * ```
 */
export function AuthModal({ isOpen, onClose, initialMode = 'login' }: AuthModalProps): React.ReactElement | null {
  const { login, register, loginWithGoogle, error: authError, actionLoading, clearError, isAuthenticated } = useAuthContext();

  // 모드 상태
  const [mode, setMode] = useState<AuthMode>(initialMode);

  // 폼 데이터 상태
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    nickname: '',
  });

  // 폼 에러 상태
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // 성공 메시지 상태
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ============================================
  // 핸들러 함수
  // ============================================

  /**
   * 모달이 열릴 때 초기 상태 설정
   */
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        nickname: '',
      });
      setFormErrors({});
      setSuccessMessage(null);
      clearError();
    }
  }, [isOpen, initialMode, clearError]);

  /**
   * 인증 성공 시 모달 닫기
   */
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      setSuccessMessage(mode === 'login' ? '로그인되었습니다!' : '회원가입이 완료되었습니다!');
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isOpen, mode, onClose]);

  /**
   * 입력 필드 변경 핸들러
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // 실시간 유효성 검사
    let error: string | undefined;
    switch (name) {
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        // 비밀번호가 변경되면 확인 필드도 재검사
        if (formData.confirmPassword) {
          const confirmError = validateConfirmPassword(value, formData.confirmPassword);
          setFormErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
        }
        break;
      case 'confirmPassword':
        error = validateConfirmPassword(formData.password, value);
        break;
      case 'nickname':
        error = validateNickname(value);
        break;
    }
    setFormErrors((prev) => ({ ...prev, [name]: error }));
  }, [formData.password, formData.confirmPassword]);

  /**
   * 모드 전환 핸들러
   */
  const handleModeSwitch = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    setFormErrors({});
    clearError();
    setFormData((prev) => ({
      ...prev,
      password: '',
      confirmPassword: '',
    }));
  }, [clearError]);

  /**
   * 폼 제출 핸들러
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // 모든 필드 유효성 검사
      const errors: FormErrors = {
        email: validateEmail(formData.email),
        password: validatePassword(formData.password),
      };

      if (mode === 'register') {
        errors.confirmPassword = validateConfirmPassword(formData.password, formData.confirmPassword);
        errors.nickname = validateNickname(formData.nickname);
      }

      // 에러가 있으면 중단
      if (Object.values(errors).some((error) => error !== undefined)) {
        setFormErrors(errors);
        return;
      }

      // 인증 요청
      try {
        if (mode === 'login') {
          await login(formData.email, formData.password);
        } else {
          await register(formData.email, formData.password, formData.nickname);
        }
      } catch {
        // 에러는 AuthContext에서 처리됨
      }
    },
    [mode, formData, login, register]
  );

  /**
   * 모달 외부 클릭 핸들러
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && !actionLoading) {
        onClose();
      }
    },
    [onClose, actionLoading]
  );

  /**
   * Google 로그인 핸들러
   */
  const handleGoogleLogin = useCallback(async () => {
    try {
      clearError();
      await loginWithGoogle();
    } catch {
      // 에러는 AuthContext에서 처리됨
    }
  }, [loginWithGoogle, clearError]);

  // ============================================
  // 렌더링
  // ============================================

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        {/* 헤더 */}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {mode === 'login' ? '로그인' : '회원가입'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {mode === 'login'
              ? '계정에 로그인하여 Todo List를 관리하세요'
              : '새 계정을 만들어 Todo List를 시작하세요'}
          </p>
        </div>

        {/* 탭 전환 */}
        <div className="mb-6 flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => handleModeSwitch('login')}
            className={`flex-1 pb-3 text-center font-medium transition-colors ${
              mode === 'login'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={actionLoading}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => handleModeSwitch('register')}
            className={`flex-1 pb-3 text-center font-medium transition-colors ${
              mode === 'register'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            disabled={actionLoading}
          >
            회원가입
          </button>
        </div>

        {/* 성공 메시지 */}
        {successMessage && (
          <div className="mb-4 rounded-lg bg-green-50 p-3 text-center text-sm text-green-600">
            {successMessage}
          </div>
        )}

        {/* 에러 메시지 */}
        {authError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
            {authError}
          </div>
        )}

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이메일 입력 */}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
              이메일
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="example@email.com"
              className={`w-full rounded-lg border px-4 py-2.5 text-gray-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={actionLoading}
              autoComplete="email"
            />
            {formErrors.email && (
              <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>
            )}
          </div>

          {/* 비밀번호 입력 */}
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="••••••••"
              className={`w-full rounded-lg border px-4 py-2.5 text-gray-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                formErrors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={actionLoading}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {formErrors.password && (
              <p className="mt-1 text-xs text-red-500">{formErrors.password}</p>
            )}
          </div>

          {/* 회원가입 전용 필드 */}
          {mode === 'register' && (
            <>
              {/* 비밀번호 확인 */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className={`w-full rounded-lg border px-4 py-2.5 text-gray-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    formErrors.confirmPassword ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={actionLoading}
                  autoComplete="new-password"
                />
                {formErrors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.confirmPassword}</p>
                )}
              </div>

              {/* 닉네임 */}
              <div>
                <label htmlFor="nickname" className="mb-1 block text-sm font-medium text-gray-700">
                  닉네임
                </label>
                <input
                  type="text"
                  id="nickname"
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleInputChange}
                  placeholder="홍길동"
                  className={`w-full rounded-lg border px-4 py-2.5 text-gray-800 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                    formErrors.nickname ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={actionLoading}
                  autoComplete="nickname"
                />
                {formErrors.nickname && (
                  <p className="mt-1 text-xs text-red-500">{formErrors.nickname}</p>
                )}
              </div>
            </>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={actionLoading}
            className="w-full rounded-lg bg-blue-500 py-3 font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {actionLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {mode === 'login' ? '로그인 중...' : '회원가입 중...'}
              </span>
            ) : (
              mode === 'login' ? '로그인' : '회원가입'
            )}
          </button>
        </form>

        {/* 구분선 */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-500">또는</span>
          </div>
        </div>

        {/* Google 로그인 버튼 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={actionLoading}
          className="relative flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 로그인
        </button>

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          disabled={actionLoading}
          className="mt-4 w-full rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

export default AuthModal;
