'use client';

import { cn } from '@/lib/utils';

interface AuroraBackgroundProps {
  className?: string;
  children?: React.ReactNode;
  showRadialGradient?: boolean;
}

/**
 * Aurora Background - 极光背景效果
 * 极简 SaaS 风格 - 微妙的渐变动画
 */
export function AuroraBackground({
  className,
  children,
  showRadialGradient = false,
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        'relative flex min-h-screen flex-col items-center justify-center bg-[#09090b] text-white transition-bg',
        className
      )}
    >
      {/* 背景光晕 - 极低透明度保持极简 */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={cn(
            `
            [--white-gradient:repeating-linear-gradient(100deg,var(--white)_0%,var(--white)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--white)_16%)]
            [--dark-gradient:repeating-linear-gradient(100deg,var(--black)_0%,var(--black)_7%,var(--transparent)_10%,var(--transparent)_12%,var(--black)_16%)]
            [--aurora:repeating-linear-gradient(100deg,var(--white)_10%,var(--transparent)_20%,var(--white)_30%,var(--transparent)_40%,var(--white)_50%)]
            [background-image:var(--white-gradient)]
            [background-size:300%_100%]

            after:content-[""] after:absolute after:inset-0 after:bg-[var(--aurora)]
            after:opacity-5 after:mix-blend-difference

            animate-aurora
          `,
            showRadialGradient &&
              '[mask-image:radial-gradient(ellipse_at_100%_0%,black_10%,var(--transparent)_70%)]'
          )}
        />
      </div>

      {/* 内容 */}
      {children && (
        <div className="relative z-10">{children}</div>
      )}
    </div>
  );
}
