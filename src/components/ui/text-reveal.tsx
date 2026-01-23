'use client';

import { cn } from '@/lib/utils';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

interface TextRevealProps {
  children: string;
  className?: string;
  delay?: number;
}

/**
 * Text Reveal - 文字揭示效果
 * 极简 SaaS 风格 - 平滑的文字出现动画
 */
export function TextReveal({ children, className, delay = 0 }: TextRevealProps) {
  const [isVisible, setIsVisible] = useState(false);

  const spring = useSpring(0, {
    bounce: 0,
    duration: 1000,
  });

  const opacity = useTransform(spring, [0, 1], [0, 1]);
  const y = useTransform(spring, [0, 1], [20, 0]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      spring.set(1);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, spring]);

  return (
    <motion.span
      className={cn('inline-block', className)}
      style={{ opacity, y }}
    >
      {children}
    </motion.span>
  );
}
