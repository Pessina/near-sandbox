import React, { forwardRef } from "react";
import Label from "./Label"; // Import the Label component

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...rest }, ref) => {
    return (
      <div>
        {label && <Label>{label}</Label>}
        <input
          {...rest}
          ref={ref}
          className="block appearance-none w-full bg-gray-800 text-white border border-gray-600 hover:border-gray-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
        />
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
