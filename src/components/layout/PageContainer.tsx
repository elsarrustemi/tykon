import { type ReactNode } from "react";
import Navigation from "~/app/_components/Navigation";
import { Footer } from "./Footer";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  showFooter?: boolean;
}

export function PageContainer({ 
  children, 
  className = "", 
  showFooter = true 
}: PageContainerProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />
      
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      
      {showFooter && <Footer />}
    </div>
  );
} 