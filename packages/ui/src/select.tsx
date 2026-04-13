"use client";

import { ReactNode, CSSProperties } from "react";

interface SelectOption {
  value: string;
  label: ReactNode;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  className?: string;
  style?: CSSProperties;
  ["aria-label"]?: string;
}

export const Select = ({
  value,
  onValueChange,
  options,
  className = "",
  style,
  ["aria-label"]: ariaLabel,
}: SelectProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`
        px-3 py-2 rounded-md border text-sm font-medium
        transition-colors duration-200
        cursor-pointer
        ${className}
      `}
      style={{
        backgroundColor: "var(--panel, #fffaf2)",
        color: "var(--ink, #1f1c1a)",
        borderColor: "var(--line, #d7c9b2)",
        ...style,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLSelectElement;
        el.style.opacity = "0.8";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLSelectElement;
        el.style.opacity = "1";
      }}
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {typeof option.label === "string" ? option.label : option.label}
        </option>
      ))}
    </select>
  );
};
