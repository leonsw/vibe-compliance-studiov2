"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineHome,
  HiOutlineTemplate,
  HiOutlineFolderOpen,
  HiOutlineLightningBolt,
  HiOutlineCog,
  HiOutlineUserCircle,
  HiMenuAlt2,
  HiX
} from "react-icons/hi";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Navigation Config
  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: HiOutlineHome },
    { name: "Documents", href: "/dashboard/documents", icon: HiOutlineFolderOpen },
    { name: "Integrations", href: "/dashboard/integrations", icon: HiOutlineLightningBolt },
    // We will add the Wizard link here soon
    { name: "New Assessment", href: "/dashboard/assessments/new", icon: HiOutlineTemplate }, 
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#1e293b]/50 border-r border-gray-800 
        transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="text-xl font-bold tracking-tighter text-white">
            Vibe<span className="text-[#38bdf8]">Studio</span>
          </div>
          <button 
            className="ml-auto lg:hidden text-gray-400"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive 
                    ? "bg-[#38bdf8]/10 text-[#38bdf8]" 
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"}
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile (Bottom) */}
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
              LW
            </div>
            <div className="text-sm">
              <p className="text-white font-medium">Leon W.</p>
              <p className="text-gray-500 text-xs">Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 flex items-center px-4 border-b border-gray-800 bg-[#0f172a]">
          <button 
            className="text-gray-400 p-2 -ml-2"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <HiMenuAlt2 className="w-6 h-6" />
          </button>
          <span className="ml-4 font-bold text-white">Vibe Compliance</span>
        </header>

        {/* Page Content Injection Point */}
        <main className="flex-1 overflow-auto relative">
          {children}
        </main>
      </div>
    </div>
  );
}