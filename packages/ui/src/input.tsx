"use client";

import type { InputHTMLAttributes } from "react";

type NativeInputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", type = "text", ...props }: NativeInputProps) {
  const isBareControl = type === "checkbox" || type === "radio" || type === "range";
  const classes = isBareControl ? className : `ui-input ${className}`.trim();

  return <input type={type} className={classes} {...props} />;
}
