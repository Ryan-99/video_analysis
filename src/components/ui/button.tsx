import * as React from 'react';

/**
 * Button组件 - 按钮
 */
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'default' | 'outline' | 'ghost';
    asChild?: boolean;
  }
>(({ className = '', variant = 'default', asChild = false, children, ...props }, ref) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  const variantStyles = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-white hover:bg-gray-50',
    ghost: 'hover:bg-gray-100',
  };

  // 如果是asChild模式，直接渲染子元素并添加样式
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: `${baseStyles} ${variantStyles[variant]} ${className}`,
      ...props,
    } as any);
  }

  return (
    <button
      ref={ref}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
Button.displayName = 'Button';

export { Button };
