import * as React from 'react';

/**
 * Input组件 - 输入框
 * 极简 SaaS 风格
 */
const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className = '', type = 'text', ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={`
        flex h-10 w-full rounded-xl border bg-white/5 px-4 py-2 text-sm
        text-white placeholder:text-white/30
        border-white/10
        focus:outline-none focus:border-white/20
        transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
