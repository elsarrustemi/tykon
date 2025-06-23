import { type HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outlined" | "elevated";
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", variant = "default", children, ...props }, ref) => {
    const variants = {
      default: "bg-white shadow-sm border border-gray-200",
      outlined: "bg-white border border-gray-300",
      elevated: "bg-white shadow-lg border border-gray-200",
    };

    const combinedClasses = `rounded-xl p-6 ${variants[variant]} ${className}`.trim();

    return (
      <div ref={ref} className={combinedClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card }; 