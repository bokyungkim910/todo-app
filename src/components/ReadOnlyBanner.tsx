import React from 'react';

interface ReadOnlyBannerProps {
  ownerName: string;
  onReturnToMine?: () => void;
  onClose?: () => void;
}

export function ReadOnlyBanner({ ownerName, onReturnToMine, onClose }: ReadOnlyBannerProps) {
  return (
    <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        {/* 왼쪽: 아이콘과 메시지 */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white text-lg shadow-sm">
            🔒
          </div>
          <div className="min-w-0">
            <p className="text-amber-900 font-medium text-sm sm:text-base truncate">
              <span className="font-bold">{ownerName}</span>님의 체크리스트 (읽기 전용)
            </p>
            <p className="text-amber-700 text-xs sm:text-sm mt-0.5">
              편집 권한이 없습니다. 읽기만 가능합니다.
            </p>
          </div>
        </div>

        {/* 오른쪽: 액션 버튼들 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {onReturnToMine && (
            <button
              onClick={onReturnToMine}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              내 체크리스트로
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-200/50 rounded-lg transition-colors"
              title="닫기"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 모바일용 버튼 (sm 이하에서만 표시) */}
      {onReturnToMine && (
        <button
          onClick={onReturnToMine}
          className="sm:hidden w-full mt-3 flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          내 체크리스트로 돌아가기
        </button>
      )}
    </div>
  );
}

export default ReadOnlyBanner;
