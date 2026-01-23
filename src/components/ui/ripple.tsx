'use client';

import { cn } from '@/lib/utils';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface RippleProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Ripple Effect - 涟漪效果
 * 极简 SaaS 风格 - 微妙的鼠标跟随效果
 */
export function Ripple({ children, className }: RippleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const mouse = {
    x: useMotionValue(0),
    y: useMotionValue(0),
  };

  const rippleSize = 300;
  const rippleX = useTransform(mouse.x, (val) => val - rippleSize / 2);
  const rippleY = useTransform(mouse.y, (val) => val - rippleSize / 2);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { offsetTop, offsetLeft } = containerRef.current || { offsetTop: 0, offsetLeft: 0 };
    mouse.x.set(e.clientX - offsetLeft);
    mouse.y.set(e.clientY - offsetTop);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-white/5',
        className
      )}
    >
      {children}

      {/* 涟漪效果 */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)',
          width: rippleSize,
          height: rippleSize,
          x: rippleX,
          y: rippleY,
          opacity: isHovered ? 1 : 0,
        }}
        transition={{
          type: 'spring',
          stiffness: 200,
          damping: 30,
        }}
      />
    </div>
  );
}
