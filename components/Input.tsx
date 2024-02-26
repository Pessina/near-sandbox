import React, { forwardRef, ReactNode } from "react";
import Label from "./Label";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  disabled?: boolean;
  icon?: {
    icon: ReactNode;
    onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  };
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, disabled, icon, onClick, ...rest }, ref) => {
    return (
      <div>
        {label && <Label>{label}</Label>}
        <div className="flex items-center gap-1">
          <input
            {...rest}
            ref={ref}
            disabled={disabled}
            className={`block appearance-none w-full bg-gray-800 text-white border border-gray-600 ${
              !disabled ? "hover:border-gray-500" : ""
            } px-4 py-2 rounded shadow leading-tight focus:outline-none focus:shadow-outline ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          {icon && (
            <div className="ml-2 cursor-pointer" onClick={icon.onClick}>
              {icon.icon}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
