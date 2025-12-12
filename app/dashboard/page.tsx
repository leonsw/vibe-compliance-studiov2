"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  HiShieldCheck,
  HiExclamation,
  HiServer,
  HiCheckCircle,
  HiOutlineCheckCircle,
  HiArrowRight,
  HiTrendingDown,
  HiFire,
  HiDocumentText,
  HiDatabase,
  HiPuzzle
} from "react-icons/hi";

export default function DashboardPage() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [riskySystems, setRiskySystems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failingControls, setFailingControls] = useState<any[]>([]);

  // Onboarding steps state
  const [hasIntegration, setHasIntegration] = useState<boolean>(false);
  const [hasPolicy, setHasPolicy] = useState<boolean>(false);
  const [hasStandard, setHasStandard] = useState<boolean>(false);
  const [hasAssessment, setHasAssessment] = useState<boolean>(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);

  // Fetch Logic
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1. Fetch Active Assessments
      const { data: asmData } = await supabase
        .from("assessments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (asmData) setAssessments(asmData);

      // 2. Fetch Top Risky Assets (Real data from 'systems' table)
      const { data: sysData } = await supabase
        .from("systems")
        .select("*")
        .order("risk_score", { ascending: false }) // High risk first
        .limit(4);

      if (sysData) setRiskySystems(sysData);

      // 3. Fetch REAL Top Failing Controls (No more mocks)
      const { data: failingControls } = await supabase
        .from("controls")
        .select("control_code, description, status")
        .in("status", ["Failed", "Non-Compliant", "Missing"])
        .limit(5);

      if (failingControls) setFailingControls(failingControls);

      setLoading(false);

      // 4. Onboarding widget: Fetch existence of each requirement as count>0
      setOnboardingLoading(true);
      const [
        { count: integrationsCount },
        { count: policyCount },
        { count: standardsCount },
        { count: assessmentsCount },
      ] = await Promise.all([
        supabase.from("integrations").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("standards_library").select("id", { count: "exact", head: true }),
        supabase.from("assessments").select("id", { count: "exact", head: true }),
      ]);
      setHasIntegration(!!integrationsCount && integrationsCount > 0);
      setHasPolicy(!!policyCount && policyCount > 0);
      setHasStandard(!!standardsCount && standardsCount > 0);
      setHasAssessment(!!assessmentsCount && assessmentsCount > 0);
      setOnboardingLoading(false);
    };
    fetchData();
  }, []);

  // Calculate onboarding completion
  const steps = [
    {
      name: "Connect Integration",
      description: "Integrate with your existing services",
      href: "/dashboard/integrations",
      done: hasIntegration,
      icon: <HiPuzzle className="w-6 h-6" />,
    },
    {
      name: "Upload Policy",
      description: "Add your foundational policy documents",
      href: "/dashboard/documents",
      done: hasPolicy,
      icon: <HiDocumentText className="w-6 h-6" />,
    },
    {
      name: "Import Standard",
      description: "Import or select a compliance standard",
      href: "/dashboard/standards",
      done: hasStandard,
      icon: <HiDatabase className="w-6 h-6" />,
    },
    {
      name: "Run Assessment",
      description: "Start your first compliance assessment",
      href: "/dashboard/assessments/new",
      done: hasAssessment,
      icon: <HiCheckCircle className="w-6 h-6" />,
    },
  ];
  const completedSteps = steps.filter((s) => s.done).length;
  const progressPercent = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="p-8 text-gray-300 space-y-8">

      {/* ONBOARDING WIDGET */}
      <div className="w-full">
        <div className="bg-[#1e293b] border border-gray-800 rounded-xl px-6 py-7 mb-10 relative overflow-hidden">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            Welcome to Vibe Studio
          </h2>
          {onboardingLoading ? (
            <div className="py-8 text-gray-500">Checking environment setup...</div>
          ) : progressPercent === 100 ? (
            <div className="flex items-center justify-between p-6 rounded-lg bg-green-600/10 border border-green-800 my-3 mt-6">
              <div className="flex items-center gap-3">
                <HiCheckCircle className="w-8 h-8 text-green-400" />
                <span className="text-lg font-bold text-green-300">System Fully Operational</span>
              </div>
              <span className="text-green-400 font-mono text-md">
                All onboarding steps completed!
              </span>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-400">
                    Onboarding Progress:
                  </span>
                  <span className="font-bold text-white text-base">
                    {completedSteps}/{steps.length}
                  </span>
                  <div className="flex-1 flex items-center ml-4">
                    <div className="w-48 bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${progressPercent}%` }}
                        className={`h-full transition-all duration-300 ${
                          progressPercent === 100 ? "bg-green-500" : "bg-blue-500"
                        }`}
                      ></div>
                    </div>
                    <span className="ml-3 text-xs font-mono text-gray-400">
                      {progressPercent}%
                    </span>
                  </div>
                </div>
              </div>
              {/* Steps List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {steps.map((step, idx) => (
                  <Link
                    href={step.href}
                    key={idx}
                    className={`block rounded-xl border transition p-4 group relative h-full cursor-pointer ${
                      step.done
                        ? "border-green-700 bg-green-800/10 opacity-70"
                        : "border-blue-700 bg-blue-900/10 shadow-lg hover:bg-blue-900/30"
                    }`}
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {step.icon}
                      <span className={`font-semibold text-sm ${
                        step.done ? "text-green-300" : "text-[#38bdf8] group-hover:text-white"
                        }`}>
                        {step.name}
                      </span>
                      {step.done ? (
                        <HiCheckCircle className="w-5 h-5 ml-1 text-green-400" aria-label="completed"/>
                      ) : (
                        <HiOutlineCheckCircle className="w-5 h-5 ml-1 text-[#38bdf8]" aria-label="not completed"/>
                      )}
                    </div>
                    <div className={`text-xs ${
                      step.done ? "text-green-200" : "text-blue-200 group-hover:text-white"
                    }`}>
                      {step.description}
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* HEADER */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Security Overview</h1>
          <p className="text-gray-400">Real-time compliance posture and risk analysis.</p>
        </div>
        <div className="text-right hidden sm:block">
           <p className="text-sm text-gray-500">Last Scan</p>
           <p className="text-green-400 font-mono text-sm">Just now</p>
        </div>
      </div>

      {/* KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Compliance Score */}
        <Link href="/dashboard/assessments/new" className="block group">
          <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 hover:border-[#38bdf8] transition relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <HiShieldCheck className="w-24 h-24 text-[#38bdf8]" />
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">Global Compliance</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-white">78%</span>
              <span className="text-sm text-yellow-400">↑ 4%</span>
            </div>
            <div className="mt-4 w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#38bdf8] w-[78%] h-full"></div>
            </div>
            <p className="mt-4 text-xs text-[#38bdf8] group-hover:underline flex items-center gap-1">
              View Audit Details <HiArrowRight />
            </p>
          </div>
        </Link>

        {/* Critical Risks */}
        <Link href="/dashboard/risks" className="block group">
          <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 hover:border-red-500 transition relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <HiExclamation className="w-24 h-24 text-red-500" />
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">Critical Risks</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">12</span>
                <span className="text-sm text-red-400">+2 new</span>
              </div>
              <p className="mt-8 text-xs text-gray-500 group-hover:text-red-400 transition">
                Primary source: <span className="text-gray-300">Access Control (AC)</span>
              </p>
          </div>
        </Link>

        {/* At-Risk Assets */}
        <Link href="/dashboard/assets" className="block group">
          <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 hover:border-purple-500 transition relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <HiServer className="w-24 h-24 text-purple-500" />
              </div>
              <h3 className="text-gray-400 text-sm font-medium mb-1">At-Risk Assets</h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">{riskySystems.length}</span>
                <span className="text-sm text-yellow-500">Need Attention</span>
              </div>
               <p className="mt-8 text-xs text-gray-500 group-hover:text-purple-400 transition">
                3 Production, 1 Dev
              </p>
          </div>
        </Link>
      </div>

      {/* RISK LANDSCAPE (The Missing Row) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT: Top Risky Applications */}
        <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HiFire className="text-red-500" /> Top Risky Applications
            </h2>
            <div className="space-y-3">
                {riskySystems.map(sys => (
                    <div key={sys.id} className="flex items-center justify-between p-3 bg-gray-900/50 rounded border border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${sys.environment === 'Production' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                            <div>
                                <p className="text-sm font-medium text-white">{sys.name}</p>
                                <p className="text-xs text-gray-500">{sys.type} • {sys.environment}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-sm font-bold text-red-400">Score: {sys.risk_score}</span>
                        </div>
                    </div>
                ))}
                {riskySystems.length === 0 && <p className="text-gray-500 text-sm">No risky systems found.</p>}
            </div>
            <button className="w-full mt-4 py-2 text-xs font-medium text-gray-400 hover:text-white border border-gray-800 rounded hover:bg-gray-800 transition">
                View All Assets
            </button>
        </div>

        {/* RIGHT: Top Failing Controls (Mocked for MVP visualization) */}
        <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HiTrendingDown className="text-yellow-500" /> Top Failing Controls
            </h2>
            <div className="space-y-3">
                {!failingControls || failingControls.length === 0 ? (
                   <p className="text-gray-500 text-sm italic">All controls are compliant. Good job!</p>
                ) : (
                   // Simple aggregation (in a real app, we'd use a SQL View for counts)
                   failingControls.map((ctrl, idx) => (
                    <div key={idx} className="p-3 bg-gray-900/50 rounded border border-gray-800 hover:border-red-500/50 transition cursor-pointer group">
                        <div className="flex justify-between mb-1">
                            <span className="text-xs font-mono text-red-400 bg-red-900/20 px-1.5 py-0.5 rounded">{ctrl.control_code}</span>
                            <span className="text-xs text-red-500 font-bold">Action Required</span>
                        </div>
                        <p className="text-sm text-gray-300 group-hover:text-white truncate">{ctrl.description}</p>
                    </div>
                   ))
                )}
            </div>
            <Link href="/dashboard/assessments" className="block w-full mt-4 py-2 text-center text-xs font-medium text-gray-400 hover:text-white border border-gray-800 rounded hover:bg-gray-800 transition">
                View All Audits
            </Link>
        </div>
      </div>

      {/* RECENT ASSESSMENTS */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Active Assessments</h2>
        <div className="bg-[#1e293b]/30 border border-gray-800 rounded-xl overflow-hidden">
            {loading ? (
            <div className="p-8 text-center text-gray-500">Loading assessments...</div>
            ) : assessments.length === 0 ? (
            <div className="p-12 text-center">
                <p className="text-gray-400 mb-4">No assessments found.</p>
                <Link href="/dashboard/assessments/new" className="px-4 py-2 bg-[#38bdf8] text-[#0f172a] font-bold rounded hover:bg-sky-400">
                Start Your First Audit
                </Link>
            </div>
            ) : (
            <div className="divide-y divide-gray-800">
                {assessments.map((asm) => (
                <Link 
                    key={asm.id} 
                    href={`/dashboard/assessments/${asm.id}`}
                    className="block p-4 hover:bg-gray-800/50 transition flex items-center justify-between group"
                >
                    <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${asm.standard?.includes('CMMC') ? 'bg-blue-900/20 text-blue-400' : 'bg-purple-900/20 text-purple-400'}`}>
                        <HiCheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-200 group-hover:text-white transition">{asm.title}</h4>
                        <p className="text-xs text-gray-500">{asm.standard} • Updated today</p>
                    </div>
                    </div>
                    <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Progress</p>
                        <p className="text-sm font-mono text-[#38bdf8]">{asm.progress || 0}%</p>
                    </div>
                    <HiArrowRight className="text-gray-600 group-hover:text-white" />
                    </div>
                </Link>
                ))}
            </div>
            )}
        </div>
      </div>
    </div>
  );
}