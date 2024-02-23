import React from "react";
import { AiOutlineLoading } from "react-icons/ai";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, isLoading, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-opacity-50 ${className}`}
        {...props}
        disabled={isLoading}
      >
        {isLoading ? <AiOutlineLoading className="animate-spin" /> : children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
