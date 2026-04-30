"use client";

import { ReactNode, SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: ReactNode;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  onValueChange?: (value: string) => void;
}

export const Select = ({
  options,
  onValueChange,
  onChange,
  className = "",
  children,
  ...props
}: SelectProps) => {
  return (
    <select
      className={`ui-select ${className}`.trim()}
      onChange={(e) => {
        onValueChange?.(e.target.value);
        onChange?.(e);
      }}
      {...props}
    >
      {options
        ? options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))
        : children}
    </select>
  );
};
