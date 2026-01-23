'use client';

import { cn } from '@/lib/utils';
import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ShimmerButtonProps {
  children: React.ReactNode;
  className?: string;
  shimmerColor?: string;
  shimmerSize?: string;
  shimmerDuration?: string;
  background?: string;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * Shimmer Button - 闪光按钮
 * 极简 SaaS 风格 - 流光效果
 */
export function ShimmerButton({
  children,
  className,
  shimmerColor = 'rgba(255, 255, 255, 0.3)',
  shimmerSize = '150px',
  shimmerDuration = '3s',
  background = 'transparent',
  onClick,
  disabled = false,
}: ShimmerButtonProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimation();

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  useEffect(() => {
    if (isHovered) {
      controls.start({
        opacity: 1,
        transition: { duration: 0.3 },
      });
    } else {
      controls.start({
        opacity: 0,
        transition: { duration: 0.3 },
      });
    }
  }, [isHovered, controls]);

  return (
    <motion.button
      className={cn(
        'relative overflow-hidden rounded-xl px-8 py-4 text-sm font-medium transition-all',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      style={{ background }}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      {/* Shimmer Effect */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={controls}
        style={{
          background: `radial-gradient(${shimmerSize} circle at ${mousePosition.x}px ${mousePosition.y}px, ${shimmerColor}, transparent 40%)`,
        }}
      />

      {/* Content */}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
