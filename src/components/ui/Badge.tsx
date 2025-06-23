interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ 
  children, 
  variant = "default", 
  size = "md",
  className = "" 
}: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
  };

  const combinedClasses = `inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]} ${className}`.trim();

  return (
    <span className={combinedClasses}>
      {children}
    </span>
  );
} 