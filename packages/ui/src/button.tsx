"use client";

import { ReactNode, CSSProperties } from "react";

type ButtonVariant = "default" | "ghost" | "outline";
type ButtonSize = "default" | "sm" | "lg" | "icon";

interface ButtonProps {
  children: ReactNode;
  className?: string;
  appName?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: () => void;
  style?: CSSProperties;
  ["aria-label"]?: string;
  title?: string;
}

const getButtonStyles = (
  variant: ButtonVariant,
  size: ButtonSize,
): CSSProperties => {
  // Base styles
  const baseStyles: CSSProperties = {
    borderRadius: "0.375rem",
    border: "1px solid transparent",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
    outline: "none",
  };

  // Size styles
  const sizeStyles: Record<ButtonSize, CSSProperties> = {
    default: {
      padding: "0.5rem 1rem",
      fontSize: "0.875rem",
    },
    sm: {
      padding: "0.375rem 0.75rem",
      fontSize: "0.75rem",
    },
    lg: {
      padding: "0.75rem 1.5rem",
      fontSize: "1rem",
    },
    icon: {
      padding: "0.5rem",
      width: "2.5rem",
      height: "2.5rem",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
  };

  // Variant styles
  const variantStyles: Record<ButtonVariant, CSSProperties> = {
    default: {
      backgroundColor: "var(--accent, #b85c2f)",
      color: "white",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "var(--ink, #1f1c1a)",
    },
    outline: {
      backgroundColor: "transparent",
      color: "var(--ink, #1f1c1a)",
      borderColor: "var(--line, #d7c9b2)",
    },
  };

  return { ...baseStyles, ...sizeStyles[size], ...variantStyles[variant] };
};

export const Button = ({
  children,
  className = "",
  variant = "default",
  size = "default",
  onClick,
  appName,
  style,
  ["aria-label"]: ariaLabel,
  title,
}: ButtonProps) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (appName) {
      alert(`Hello from your ${appName} app!`);
    }
  };

  const buttonStyles: CSSProperties = {
    ...getButtonStyles(variant, size),
    ...style,
  };

  return (
    <button
      className={`button-base ${className}`}
      style={buttonStyles}
      onClick={handleClick}
      aria-label={ariaLabel}
      title={title}
      onMouseEnter={(e) => {
        if (variant === "ghost") {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "rgba(184, 92, 47, 0.1)";
        }
      }}
      onMouseLeave={(e) => {
        if (variant === "ghost") {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "transparent";
        }
      }}
    >
      {children}
    </button>
  );
};
