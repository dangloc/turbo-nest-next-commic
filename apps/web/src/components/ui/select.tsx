"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

interface SelectOption {
  value: string;
  label: ReactNode;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  onValueChange?: (value: string) => void;
}

export function Select({
  className,
  options,
  children,
  onValueChange,
  onChange,
  ...props
}: SelectProps) {
  return (
    <select
      className={cn("shd-select", className)}
      onChange={(event) => {
        onValueChange?.(event.target.value);
        onChange?.(event);
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
}
