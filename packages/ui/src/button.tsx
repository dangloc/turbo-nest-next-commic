"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

type ButtonVariant = "default" | "ghost" | "outline";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  children: ReactNode;
  appName?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
}

export const Button = ({
  children,
  className = "",
  variant = "default",
  size = "default",
  onClick,
  appName,
  type = "button",
  ...props
}: ButtonProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (appName) {
      alert(`Hello from your ${appName} app!`);
    }
  };

  return (
    <button
      type={type}
      className={`ui-button ui-button--${variant} ui-button--${size} ${className}`.trim()}
      onClick={handleClick}
      {...props}
    >
      {children}
    </button>
  );
};
