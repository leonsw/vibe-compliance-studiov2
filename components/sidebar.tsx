"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  ShieldAlert, 
  FileText, 
  Users, 
  Settings, 
  ShieldCheck,
  LogOut,
  Layers,
  FileCheck,
  Scale,
  Briefcase,
  Calendar,
  BookOpen,
  BarChart3,
  Zap,
  AlertTriangle, // Added
  Server         // Added
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Sidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const menuGroups = [
    {
      label: "Overview",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "My Tasks", href: "/dashboard/tasks", icon: ClipboardCheck }, 
      ]
    },
    {
      label: "Compliance Engine",
      items: [
        { name: "Assessments", href: "/dashboard/assessments", icon: FileCheck },
        { name: "Controls Library", href: "/dashboard/standards", icon: Layers },
        { name: "Frameworks", href: "/dashboard/frameworks", icon: Scale },
        { name: "Evidence Locker", href: "/dashboard/evidence", icon: Briefcase },
        { name: "Schedules", href: "/dashboard/schedules", icon: Calendar },
      ]
    },
    {
      label: "Risk & Governance",
      items: [
        { name: "Risk Register", href: "/dashboard/risks/register", icon: ShieldAlert },
        { name: "Policy Center", href: "/dashboard/documents", icon: FileText },
        { name: "Risk Manager", href: "/dashboard/risks/manager", icon: AlertTriangle },
        { name: "Reports", href: "/dashboard/reports", icon: BarChart3 },
      ]
    },
    {
      label: "Administration",
      items: [
        { name: "User Management", href: "/dashboard/admin/users", icon: Users },
        { name: "Settings", href: "/dashboard/settings", icon: Settings },
        { name: "Asset Inventory", href: "/dashboard/assets", icon: Server },
        { name: "Integrations", href: "/dashboard/integrations", icon: Zap },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#1e293b] text-white border-r border-gray-800">
      
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3 border-b border-gray-800">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center shadow-lg shadow-purple-900/20">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
            <span className="font-bold text-lg tracking-tight block">Vibe Studio</span>
            <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Compliance OS</span>
        </div>
      </div>

      {/* Scrollable Nav */}
      <nav className="flex-1 p-4 overflow-y-auto space-y-6">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <p className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    isActive(item.href)
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-900/20 translate-x-1"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <item.icon className={`w-4 h-4 transition-colors ${isActive(item.href) ? "text-white" : "text-gray-500 group-hover:text-white"}`} />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-800 bg-[#0f172a]/30">
        <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center border border-gray-600 text-xs font-bold text-white shadow-inner">
                {user?.full_name?.[0] || "U"}
            </div>
            <div className="overflow-hidden">
                <p className="text-sm font-bold text-white truncate">{user?.full_name || "User"}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
        </div>
        <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-400 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition border border-transparent hover:border-red-900/30"
        >
            <LogOut className="w-3 h-3" /> Sign Out
        </button>
      </div>
    </div>
  );
}