import React, { forwardRef } from "react";
import Label from "./Label";
import { AiOutlineDown } from "react-icons/ai";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
  label?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, placeholder, label, ...rest }, ref) => {
    return (
      <div>
        {label && <Label>{label}</Label>}
        <div className="inline-block relative w-64">
          <select
            ref={ref}
            {...rest}
            className="block appearance-none w-full bg-gray-800 text-white border border-gray-600 hover:border-gray-500 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
          >
            {placeholder && (
              <option value="" disabled style={{ color: "gray" }}>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                style={{ color: "black" }}
              >
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-300">
            <AiOutlineDown className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
