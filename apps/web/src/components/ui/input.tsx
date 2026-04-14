"use client";

import type { InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export function Input({ className, type = "text", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input type={type} className={cn("shd-input", className)} {...props} />;
}
