import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "outline";
}

export function Button({
  variant = "primary",
  className,
  children,
  ...rest
}: ButtonProps) {
  const variantClass = styles[variant];
  const classes = [styles.btn, variantClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
