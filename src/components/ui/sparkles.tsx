'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useMemo } from 'react';

interface SparklesProps {
  className?: string;
  count?: number;
}

interface Sparkle {
  id: number;
  x: string;
  y: string;
  size: number;
  delay: number;
}

/**
 * Sparkles - 闪烁星星效果
 * 极简 SaaS 风格 - 微妙的装饰动画
 * 使用 useMemo 避免 hydration mismatch
 */
export function Sparkles({ className, count = 20 }: SparklesProps) {
  // 使用 useMemo 确保服务端和客户端生成相同的值
  const sparkles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // 使用确定性算法替代 Math.random()
      const seed = i * 9876543;
      const random1 = (seed % 1000) / 1000;
      const random2 = ((seed * 2) % 1000) / 1000;
      const random3 = ((seed * 3) % 1000) / 1000;
      const random4 = ((seed * 4) % 1000) / 1000;

      return {
        id: i,
        x: `${random1 * 100}%`,
        y: `${random2 * 100}%`,
        size: random3 * 2 + 1,
        delay: random4 * 5,
      };
    });
  }, [count]);

  return (
    <div className={cn('absolute inset-0 pointer-events-none', className)}>
      {sparkles.map((sparkle) => (
        <motion.div
          key={sparkle.id}
          className="absolute rounded-full bg-white/20"
          style={{
            left: sparkle.x,
            top: sparkle.y,
            width: sparkle.size,
            height: sparkle.size,
          }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2 + sparkle.delay,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
