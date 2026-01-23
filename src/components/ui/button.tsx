import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Button组件 - 按钮
 * 极简 SaaS 风格
 */
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'outline' | 'ghost';
    size?: 'default' | 'sm' | 'lg';
  }
>(({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50';

  const sizeStyles = {
    default: 'h-10 px-4 py-2',
    sm: 'h-8 px-3 text-xs',
    lg: 'h-12 px-6 text-base',
  };

  const variantStyles = {
    default: 'text-white',
    outline: 'border border-white/10 text-white/60 hover:text-white hover:bg-white/5',
    ghost: 'text-white/60 hover:text-white hover:bg-white/5',
  };

  return (
    <button
      ref={ref}
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = 'Button';

export { Button };
