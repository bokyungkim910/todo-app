import { useState, useCallback, useMemo } from 'react';
import { User, SharedUser, ShareInvite } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  sharedUsers: SharedUser[];
  pendingInvites: ShareInvite[];
  receivedInvites: ShareInvite[];
  onInvite: (email: string) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onAcceptInvite: (inviteId: string) => Promise<void>;
  onRejectInvite: (inviteId: string) => Promise<void>;
  maxSharedUsers?: number;
}

export function ShareModal({
  isOpen,
  onClose,
  currentUser,
  sharedUsers,
  pendingInvites,
  receivedInvites,
  onInvite,
  onRemove,
  onAcceptInvite,
  onRejectInvite,
  maxSharedUsers = 2,
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isProcessingInvite, setIsProcessingInvite] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'shared' | 'invites'>('shared');

  const activeSharedUsers = useMemo(() => {
    return sharedUsers.filter(u => u.status === 'active');
  }, [sharedUsers]);

  const canInviteMore = activeSharedUsers.length < maxSharedUsers;
  const remainingSlots = maxSharedUsers - activeSharedUsers.length;

  const getProfileColor = useCallback((uid: string) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, []);

  const getInitials = useCallback((nickname: string) => {
    return nickname.slice(0, 2).toUpperCase();
  }, []);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const handleInvite = useCallback(async () => {
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }

    if (email === currentUser.email) {
      setError('자신을 초대할 수 없습니다.');
      return;
    }

    if (sharedUsers.some(u => u.email === email)) {
      setError('이미 공유된 사용자입니다.');
      return;
    }

    clearMessages();
    setIsInviting(true);

    try {
      await onInvite(email.trim());
      setEmail('');
      setSuccessMessage('초대가 전송되었습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 전송에 실패했습니다.');
    } finally {
      setIsInviting(false);
    }
  }, [email, currentUser.email, sharedUsers, onInvite, clearMessages]);

  const handleRemove = useCallback(async (userId: string) => {
    setIsRemoving(userId);
    clearMessages();

    try {
      await onRemove(userId);
      setSuccessMessage('공유가 해제되었습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '공유 해제에 실패했습니다.');
    } finally {
      setIsRemoving(null);
    }
  }, [onRemove, clearMessages]);

  const handleAcceptInvite = useCallback(async (inviteId: string) => {
    setIsProcessingInvite(inviteId);
    clearMessages();

    try {
      await onAcceptInvite(inviteId);
      setSuccessMessage('초대를 수락했습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 수락에 실패했습니다.');
    } finally {
      setIsProcessingInvite(null);
    }
  }, [onAcceptInvite, clearMessages]);

  const handleRejectInvite = useCallback(async (inviteId: string) => {
    setIsProcessingInvite(inviteId);
    clearMessages();

    try {
      await onRejectInvite(inviteId);
      setSuccessMessage('초대를 거부했습니다.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '초대 거부에 실패했습니다.');
    } finally {
      setIsProcessingInvite(null);
    }
  }, [onRejectInvite, clearMessages]);

  const handleClose = useCallback(() => {
    setEmail('');
    clearMessages();
    onClose();
  }, [onClose, clearMessages]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white">
          <div>
            <h2 className="text-lg font-bold text-gray-900">공유 관리</h2>
            <p className="text-sm text-gray-500">
              최대 {maxSharedUsers}명과 체크리스트를 공유할 수 있습니다
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('shared')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors
              ${activeTab === 'shared'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            공유된 사용자
            {activeSharedUsers.length > 0 && (
              <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                {activeSharedUsers.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors
              ${activeTab === 'invites'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            받은 초대
            {receivedInvites.length > 0 && (
              <span className="ml-1.5 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                {receivedInvites.length}
              </span>
            )}
          </button>
        </div>

        {/* 알림 메시지 */}
        {(error || successMessage) && (
          <div className="px-6 py-3">
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            {successMessage && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </div>
            )}
          </div>
        )}

        {/* 공유된 사용자 탭 */}
        {activeTab === 'shared' && (
          <div className="p-6 space-y-4">
            {/* 초대 입력 */}
            {canInviteMore ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  사용자 초대
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일 주소 입력"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isInviting}
                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={isInviting || !email.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    {isInviting ? (
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    )}
                    초대
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  {remainingSlots}명 더 초대할 수 있습니다
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-700">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm">최대 공유 인원에 도달했습니다</span>
              </div>
            )}

            {/* 공유된 사용자 목록 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                공유된 사용자
              </label>
              {activeSharedUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm">공유된 사용자가 없습니다</p>
                  <p className="text-xs text-gray-400 mt-1">이메일로 사용자를 초대해보세요</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activeSharedUsers.map((user) => (
                    <div
                      key={user.uid}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: getProfileColor(user.uid) }}
                      >
                        {getInitials(user.nickname)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.nickname}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemove(user.uid)}
                        disabled={isRemoving === user.uid}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="공유 해제"
                      >
                        {isRemoving === user.uid ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 보낸 초대 목록 */}
            {pendingInvites.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  보낸 초대
                </label>
                <div className="space-y-2">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg"
                    >
                      <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {invite.inviterNickname}
                        </p>
                        <p className="text-xs text-amber-600">수락 대기 중</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 받은 초대 탭 */}
        {activeTab === 'invites' && (
          <div className="p-6">
            {receivedInvites.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">받은 초대가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedInvites.map((invite) => (
                  <div
                    key={invite.id}
                    className="p-4 bg-blue-50 border border-blue-100 rounded-lg"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                        style={{ backgroundColor: getProfileColor(invite.inviterId) }}
                      >
                        {getInitials(invite.inviterNickname)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {invite.inviterNickname}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {invite.inviterEmail}
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          체크리스트 공유 초대
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptInvite(invite.id)}
                        disabled={isProcessingInvite === invite.id}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                      >
                        {isProcessingInvite === invite.id ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        수락
                      </button>
                      <button
                        onClick={() => handleRejectInvite(invite.id)}
                        disabled={isProcessingInvite === invite.id}
                        className="flex-1 px-3 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        거부
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
