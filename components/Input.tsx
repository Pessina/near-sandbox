import React, { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ ...rest }, ref) => {
  return (
    <input
      {...rest}
      ref={ref}
      className="block appearance-none w-full bg-gray-800 text-white border border-gray-600 hover:border-gray-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
    />
  );
});

Input.displayName = "Input";

export default Input;
