"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const Navigation = () => {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl text-blue-600"><i className="fa-solid fa-keyboard"></i></span>
          <span className="font-bold text-xl">Tykon</span>
        </div>
        <nav className="flex gap-8 text-gray-700 font-medium">
          <Link href="/" className={isActive("/") ? "text-blue-600 font-semibold" : undefined}>Home</Link>
          <Link href="/settings" className={isActive("/settings") ? "text-blue-600 font-semibold" : undefined}>Settings</Link>
        </nav>
      </div>
    </header>
  );
};

export default Navigation; 