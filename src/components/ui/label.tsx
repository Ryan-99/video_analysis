import * as React from 'react';

/**
 * Label组件 - 标签
 * 极简 SaaS 风格
 */
const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className = '', ...props }, ref) => (
  <label
    ref={ref}
    className={`
      text-sm font-medium leading-none
      text-white/50
      peer-disabled:cursor-not-allowed peer-disabled:opacity-50
      ${className}
    `}
    {...props}
  />
));
Label.displayName = 'Label';

export { Label };
