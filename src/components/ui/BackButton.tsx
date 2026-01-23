'use client';

// src/components/ui/BackButton.tsx
// 返回主页按钮组件
import { useRouter } from 'next/navigation';

interface BackButtonProps {
  label?: string;
  className?: string;
}

/**
 * 返回主页按钮组件
 * 用于各个子页面返回主页
 */
export function BackButton({ label = '返回首页', className = '' }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push('/')}
      className={`
        flex items-center gap-2 px-4 py-2
        bg-white/5 border border-white/10
        rounded-lg text-sm text-white/60
        hover:text-white hover:bg-white/[0.02]
        transition-colors
        ${className}
      `}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
