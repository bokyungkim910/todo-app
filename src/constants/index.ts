export const PRIORITY_COLORS = {
  high: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-500',
  },
  medium: {
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-500',
  },
  low: {
    text: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    badge: 'bg-green-500',
  },
} as const;

export const CATEGORIES = ['업무', '개인', '쇼핑', '공부', '기타'];

export const PRIORITY_OPTIONS = [
  { value: 'high', label: '높음' },
  { value: 'medium', label: '중간' },
  { value: 'low', label: '낮음' },
] as const;
