import React from "react";
import { AiOutlineLoading } from "react-icons/ai";

type ButtonVariant = "primary" | "secondary" | "danger";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  isLoading?: boolean;
  variant?: ButtonVariant;
}

const variantStyles = {
  primary: "bg-blue-500 hover:bg-blue-600 text-white",
  secondary: "bg-gray-800 hover:bg-gray-700 text-white",
  danger: "bg-red-500 hover:bg-red-600 text-white",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, isLoading, variant = "primary", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`flex items-center justify-center px-4 py-2 border border-gray-600 hover:border-gray-500 rounded shadow leading-tight focus:outline-none focus:shadow-outline ${variantStyles[variant]} ${className}`}
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
