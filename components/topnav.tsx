"use client";

import { Menu } from "lucide-react";

export default function TopNav({ user }: { user: any }) {
  return (
    <div className="md:hidden flex items-center justify-between p-4 bg-[#1e293b] border-b border-gray-800 text-white">
      <span className="font-bold">Vibe Compliance</span>
      <button className="p-2 text-gray-400 hover:text-white">
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );
}