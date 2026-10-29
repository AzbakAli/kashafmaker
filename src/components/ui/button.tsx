import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, AnchorHTMLAttributes, forwardRef } from "react";

const variants = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm active:bg-indigo-800",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 active:bg-slate-300",
  outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm active:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 active:bg-slate-200",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm active:bg-red-800",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm active:bg-emerald-800",
  warning: "bg-amber-500 text-white hover:bg-amber-600 shadow-sm active:bg-amber-700",
};

const sizes = {
  xs: "px-2.5 py-1 text-xs rounded-md",
  sm: "px-3 py-1.5 text-xs rounded-lg",
  md: "px-4 py-2 text-sm rounded-lg",
  lg: "px-5 py-2.5 text-sm rounded-lg",
};

const baseClass =
  "inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  href?: string;
  target?: AnchorHTMLAttributes<HTMLAnchorElement>["target"];
  rel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", href, target, rel, ...props }, ref) => {
    const classes = cn(baseClass, variants[variant], sizes[size], className);
    if (href) {
      return (
        <a href={href} target={target} rel={rel} className={classes}>
          {props.children}
        </a>
      );
    }
    return <button ref={ref} className={classes} {...props} />;
  }
);
Button.displayName = "Button";
