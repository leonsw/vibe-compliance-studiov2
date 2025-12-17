"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Activity, ShieldCheck, AlertTriangle, FileText, 
  ArrowUpRight, CheckCircle, Clock 
} from "lucide-react";
import Link from "next/link";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type DashboardMetrics = {
  totalScore: number;
  activeAssessments: number;
  totalControls: number;
  passedControls: number;
  criticalSystems: number;
};

type RecentAssessment = {
  id: string;
  title: string;
  standard: string;
  status: string;
  updated_at: string;
  progress: number;
};

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalScore: 0,
    activeAssessments: 0,
    totalControls: 0,
    passedControls: 0,
    criticalSystems: 0,
  });
  const [recents, setRecents] = useState<RecentAssessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    try {
      // 1. Get Assessment Stats
      const { data: assessments, error: asmError } = await supabase
        .from("assessments")
        .select("id, status, progress, title, standard, updated_at")
        .order("updated_at", { ascending: false });

      if (asmError) throw asmError;

      // 2. Control Stats
      const { count: totalControls } = await supabase
        .from("controls")
        .select("*", { count: "exact", head: true });

      const { count: passedControls } = await supabase
        .from("controls")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pass"); 

      // 3. Critical Systems Count (High + Critical)
      const { count: criticalCount } = await supabase
        .from("systems")
        .select("*", { count: "exact", head: true })
        .in("criticality", ["High", "Critical"]);

      // Calculate Global Score
      const validTotal = totalControls || 1;
      const score = Math.round(((passedControls || 0) / validTotal) * 100);

      setMetrics({
        totalScore: score,
        activeAssessments: assessments?.filter(a => a.status === "In Progress").length || 0,
        totalControls: totalControls || 0,
        passedControls: passedControls || 0,
        criticalSystems: criticalCount || 0,
      });

      setRecents(assessments?.slice(0, 5) || []);

    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 50) return "text-orange-500";
    return "text-red-600";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Executive Overview</h1>
          <p className="text-gray-500 mt-1">Real-time governance and compliance monitoring.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-400">Last updated</p>
          <p className="text-sm font-medium text-gray-700">{new Date().toLocaleTimeString()}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Score (No link, purely informational) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-gray-50 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-gray-700" />
            </div>
            <span className={`text-3xl font-bold ${getScoreColor(metrics.totalScore)}`}>
              {metrics.totalScore}%
            </span>
          </div>
          <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide">Global Compliance</h3>
          <div className="w-full bg-gray-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                metrics.totalScore >= 80 ? 'bg-green-500' : metrics.totalScore >= 50 ? 'bg-orange-400' : 'bg-red-500'
              }`} 
              style={{ width: `${metrics.totalScore}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Active Assessments (Clickable) */}
        <Link href="/dashboard/assessments" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-blue-400 hover:shadow-md transition duration-200 h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{metrics.activeAssessments}</span>
            </div>
            <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide flex items-center gap-1">
              Active Audits <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </h3>
            <p className="text-xs text-gray-400 mt-2">
              Assessments currently in progress
            </p>
          </div>
        </Link>

        {/* Card 3: At-Risk Assets (Clickable) */}
        <Link href="/dashboard/assets" className="block group">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-red-400 hover:shadow-md transition duration-200 h-full">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-red-50 rounded-lg group-hover:bg-red-100 transition">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <span className="text-3xl font-bold text-gray-900">{metrics.criticalSystems}</span>
            </div>
            <h3 className="text-gray-500 font-medium text-sm uppercase tracking-wide flex items-center gap-1">
              High Risk Assets <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
            </h3>
            <p className="text-xs text-gray-400 mt-2">
              Systems marked Critical or High
            </p>
          </div>
        </Link>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-400" /> Recent Activity
          </h2>
          <Link href="/dashboard/assessments" className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
            View Full List <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
            <tr>
              <th className="px-6 py-4">Assessment Title</th>
              <th className="px-6 py-4">Standard</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Progress</th>
              <th className="px-6 py-4 text-right">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading data...</td></tr>
            ) : recents.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No assessments found. Start one with the AI Agent!</td></tr>
            ) : (
              recents.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <Link href={`/dashboard/assessments/${item.id}`} className="hover:underline">
                      {item.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs border border-gray-200">
                      {item.standard}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {item.status === 'Completed' ? (
                      <span className="flex items-center gap-1.5 text-green-700 bg-green-50 px-2 py-1 rounded-full w-fit text-xs font-medium">
                        <CheckCircle className="w-3 h-3" /> Completed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-2 py-1 rounded-full w-fit text-xs font-medium">
                        <Clock className="w-3 h-3" /> In Progress
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-black h-full rounded-full" 
                          style={{ width: `${item.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">{item.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}