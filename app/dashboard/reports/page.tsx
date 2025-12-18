"use client";

import Link from "next/link";
import { 
  FileText, 
  ShieldAlert, 
  ClipboardList, 
  ChevronRight, 
  BarChart3,
  PieChart
} from "lucide-react";

export default function ReportsHub() {
  return (
    <div className="p-8 text-gray-300 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Reports Center</h1>
        <p className="text-gray-400">Generate, view, and export intelligence on your security posture.</p>
      </div>

      {/* Main Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        {/* 1. Compliance Reports (The one we have built) */}
        <Link href="/dashboard/reports/compliance" className="group block">
          <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800 hover:border-[#38bdf8] transition shadow-lg hover:shadow-[#38bdf8]/10 h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-900/20 rounded-lg text-[#38bdf8]">
                <FileText className="w-6 h-6" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Compliance Reports</h3>
            <p className="text-sm text-gray-400 mb-4">
              System Security Plans (SSP), Audit Findings, and Executive Summaries for your assessments (SOC 2, ISO, etc.).
            </p>
            <span className="text-xs font-bold text-[#38bdf8] uppercase tracking-wider">View Available Reports &rarr;</span>
          </div>
        </Link>

        {/* 2. Risk Reports (Placeholder) */}
        <div className="group block opacity-75 hover:opacity-100 transition cursor-pointer">
          <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800 hover:border-yellow-500/50 transition h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-yellow-900/20 rounded-lg text-yellow-500">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <span className="px-2 py-1 bg-gray-800 text-[10px] uppercase font-bold text-gray-500 rounded">Coming Soon</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Risk Register</h3>
            <p className="text-sm text-gray-400 mb-4">
              Risk Heatmaps, Top Vulnerabilities, and Impact Analysis reports.
            </p>
          </div>
        </div>

        {/* 3. POAMs (Placeholder) */}
        <div className="group block opacity-75 hover:opacity-100 transition cursor-pointer">
          <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-800 hover:border-green-500/50 transition h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-green-900/20 rounded-lg text-green-500">
                <ClipboardList className="w-6 h-6" />
              </div>
              <span className="px-2 py-1 bg-gray-800 text-[10px] uppercase font-bold text-gray-500 rounded">Coming Soon</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">POAM Tracking</h3>
            <p className="text-sm text-gray-400 mb-4">
              Plan of Action and Milestones. Track remediation progress and timelines for auditors.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Stats / Recent Activity (Optional Visual Flair) */}
      <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-8">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" /> Executive Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-center justify-center bg-[#1e293b]/50 p-8 rounded-lg border border-dashed border-gray-700">
                <div className="text-center">
                    <PieChart className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Compliance Score Trends will appear here.</p>
                </div>
            </div>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[#1e293b] rounded border-l-4 border-green-500">
                    <span className="text-sm text-gray-300">SOC 2 Audit (Okta)</span>
                    <span className="text-xs font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded">Report Ready</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#1e293b] rounded border-l-4 border-yellow-500">
                    <span className="text-sm text-gray-300">Q4 Risk Assessment</span>
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">Drafting</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}