'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

interface HoverBorderGradientProps {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  gradientColors?: string;
  gradientSize?: number;
}

/**
 * Hover Border Gradient - 悬停渐变边框
 * 极简 SaaS 风格 - 微妙的悬停反馈
 */
export function HoverBorderGradient({
  children,
  className,
  containerClassName,
  gradientColors = 'rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05)',
  gradientSize = 200,
}: HoverBorderGradientProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative group', containerClassName)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Gradient Border Effect */}
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(${gradientSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${gradientColors}, transparent 40%)`,
        }}
      />

      {/* Inner Content */}
      <div className={cn('relative rounded-xl bg-white/[0.02] border border-white/10', className)}>
        {children}
      </div>
    </div>
  );
}
