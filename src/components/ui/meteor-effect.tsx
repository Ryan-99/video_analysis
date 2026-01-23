'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';

interface Meteor {
  id: number;
  left: string;
  delay: number;
  size: number;
  duration: number;
}

interface MeteorEffectProps {
  count?: number;
  className?: string;
  minSize?: number;
  maxSize?: number;
}

/**
 * Meteor Effect - 流星划过效果
 * 极简 SaaS 风格 - 微妙的动态装饰
 * 使用 useMemo 避免 hydration mismatch
 */
export function MeteorEffect({
  count = 10,
  className,
  minSize = 1,
  maxSize = 2,
}: MeteorEffectProps) {
  // 使用 useMemo 而不是 useState，确保服务端和客户端生成相同的值
  const meteors = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // 使用确定性算法替代 Math.random()
      const seed = i * 1234567;
      const random1 = (seed % 1000) / 1000;
      const random2 = ((seed * 2) % 1000) / 1000;
      const random3 = ((seed * 3) % 1000) / 1000;

      return {
        id: i,
        left: `${random1 * 100}%`,
        delay: random2 * 5,
        size: random3 * (maxSize - minSize) + minSize,
        duration: 3 + random1 * 5,
      };
    });
  }, [count, maxSize, minSize]);

  return (
    <div className={cn('absolute inset-0 overflow-hidden pointer-events-none', className)}>
      {meteors.map((meteor) => (
        <span
          key={meteor.id}
          className="absolute top-0 rounded-full bg-white/20 shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          style={{
            left: meteor.left,
            animationDelay: `${meteor.delay}s`,
            animationDuration: `${meteor.duration}s`,
            width: `${meteor.size}px`,
            height: `${meteor.size}px`,
          }}
        >
          <style>{`
            @keyframes meteor {
              0% {
                transform: rotate(215deg) translateX(0);
                opacity: 1;
              }
              70% {
                opacity: 1;
              }
              100% {
                transform: rotate(215deg) translateX(-1000px);
                opacity: 0;
              }
            }
          `}</style>
        </span>
      ))}
    </div>
  );
}
