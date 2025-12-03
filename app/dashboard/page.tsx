"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useEffect } from "react";

import {
  HiOutlineMenu,
  HiOutlineCog,
  HiOutlineUserCircle,
  HiOutlineViewGrid,
  HiOutlineFolderOpen,
  HiOutlineDocumentText,
  HiOutlineChevronDown,
  HiOutlineClipboardCheck,
  HiShieldCheck,
  HiExclamation,
  HiServer,
} from "react-icons/hi";

// Utility for classnames
function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Dashboard() {
  // --- Mock Data Models ---
  const systems = [
    { name: "HR Portal", type: "Internal", env: "Prod", riskScore: 88, criticalFindings: 3 },
    { name: "Payroll SaaS", type: "3rd Party", env: "Prod", riskScore: 69, criticalFindings: 6 },
    { name: "DevOps Pipeline", type: "Internal", env: "Dev", riskScore: 32, criticalFindings: 0 },
    { name: "Customer CRM", type: "Internal", env: "Prod", riskScore: 75, criticalFindings: 4 },
    { name: "Billing API", type: "3rd Party", env: "Prod", riskScore: 64, criticalFindings: 2 },
    { name: "QA Environment", type: "Internal", env: "Dev", riskScore: 22, criticalFindings: 0 },
    { name: "Supplier Portal", type: "3rd Party", env: "Prod", riskScore: 55, criticalFindings: 1 },
    { name: "Marketing Tool", type: "3rd Party", env: "Dev", riskScore: 40, criticalFindings: 0 },
  ];

  const [assessments, setAssessments] = useState<any[]>([]);

  useEffect(() => {
    const fetchAssessments = async () => {
      const { data, error } = await supabase.from('assessments').select('*');
      
      if (error) console.error("Supabase error:", error);
      else console.log("Raw Data from DB:", data); // <--- ADD THIS LINE
      
      if (data) setAssessments(data);
    };
    fetchAssessments();
  }, []);

  // Failing controls
  const topFailingControls = [
    { code: "IA-5", name: "MFA Enforcement", count: 5 },
    { code: "AC-2", name: "Account Management", count: 6 },
    { code: "SC-7", name: "Boundary Protection", count: 4 },
    { code: "AU-6", name: "Audit Review", count: 3 },
    { code: "CM-6", name: "Configuration Changes", count: 3 },
  ];

  // --- Derived KPI stats ---
  const complianceScores = assessments.filter(a => a.status !== "Complete").map(a => a.progress);
  const recentComplianceScore = complianceScores.length
    ? Math.round(complianceScores.reduce((a, b) => a + b, 0) / complianceScores.length)
    : 0;

  // Critical Open Risks: sum of #criticalFindings for all Prod systems
  const criticalOpenRisks = systems
    .filter(sys => sys.env === "Prod")
    .reduce((acc, sys) => acc + sys.criticalFindings, 0);

  // At-Risk Assets: count of Prod systems with at least 1 failing recent assessment (progress < 80 or criticalFindings > 0)
  const prodSystemNames = systems.filter(s => s.env === "Prod").map(s => s.name);
  const atRiskAssets = prodSystemNames.filter(systemName => {
    // If it has a low assessment or critical findings
    const sys = systems.find(s => s.name === systemName);
    const assessmentsForSys = assessments.filter(a => a.system === systemName);
    return (
      (sys && sys.criticalFindings > 0) ||
      assessmentsForSys.some(a => a.progress < 80)
    );
  }).length;

  // --- Sidebar nav config---
  const navLinks = [
    {
      name: "Overview",
      icon: HiOutlineViewGrid,
      href: "#",
    },
    {
      name: "Assessments",
      icon: HiOutlineClipboardCheck,
      href: "#",
    },
    {
      name: "Controls",
      icon: HiOutlineFolderOpen,
      subItems: [
        {
          name: "NIST 800-171",
          href: "#",
        },
        {
          name: "CMMC 2.0",
          href: "#",
        },
      ],
    },
    {
      name: "Evidence Library",
      icon: HiOutlineFolderOpen,
      href: "#",
    },
    {
      name: "Settings",
      icon: HiOutlineCog,
      href: "#",
    },
  ];

  // Sidebar/controls
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);

  // Helper for app-id - Simulate slugify for system/app names  
  const getAppId = (name: string) => encodeURIComponent(name.replace(/\s+/g, '-').toLowerCase());
  // Helper for control code link
  const getControlId = (code: string) => encodeURIComponent(code);

  // --- Render Executive CISO Dashboard ---
  return (
    <div className="min-h-screen flex bg-slate-900 text-white font-sans selection:bg-sky-500/30">
      {/* Sidebar */}
      <aside
        className={classNames(
          "fixed z-40 inset-y-0 left-0 w-64 bg-slate-800 border-r border-slate-700/70 flex flex-col py-8 px-4 transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-64",
          "lg:translate-x-0 lg:static lg:block"
        )}
      >
        <div className="flex items-center mb-10 px-2">
          <span className="text-2xl font-bold tracking-tighter cursor-pointer">
            Vibe<span className="text-[#38bdf8]">Compliance</span>
          </span>
        </div>
        <nav className="flex-1">
          <ul className="space-y-2">
            {navLinks.map((item) =>
              item.subItems ? (
                <li key={item.name} className="relative">
                  <button
                    type="button"
                    onClick={() => setControlsOpen((prev) => !prev)}
                    className="flex w-full items-center px-3 py-2 rounded-lg hover:bg-slate-700/60 transition-colors group font-medium text-sm"
                  >
                    <item.icon className="mr-3 text-lg text-[#38bdf8] group-hover:text-sky-400 transition-colors" />
                    {item.name}
                    <HiOutlineChevronDown
                      className={`ml-auto text-base transition-transform duration-200 ${
                        controlsOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {controlsOpen && (
                    <ul className="ml-7 mt-1 space-y-1">
                      {item.subItems.map((sub) => (
                        <li key={sub.name}>
                          <a
                            href={sub.href}
                            className="flex items-center px-2 py-1.5 rounded-md text-sm text-slate-200 hover:bg-slate-700/30 transition"
                          >
                            {sub.name}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ) : (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="flex items-center px-3 py-2 rounded-lg hover:bg-slate-700/60 transition-colors group font-medium text-sm"
                  >
                    <item.icon className="mr-3 text-lg text-[#38bdf8] group-hover:text-sky-400 transition-colors" />
                    {item.name}
                  </a>
                </li>
              )
            )}
          </ul>
        </nav>
        <div className="mt-auto pt-8 flex items-center gap-2 text-slate-500 text-xs px-1">
          <span className="w-2 h-2 rounded-full bg-green-400 mr-1 animate-pulse" />
          Secure SaaS v0.1
        </div>
      </aside>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* Main layout column */}
      <div className="flex-1 min-h-screen lg:ml-64 flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/95 sticky top-0 z-30 shadow-sm">
          {/* Mobile sidebar toggle */}
          <button
            className="lg:hidden mr-3 text-2xl text-slate-100 hover:text-[#38bdf8] p-1"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Open sidebar"
          >
            <HiOutlineMenu />
          </button>
          {/* Breadcrumbs */}
          <nav
            className="flex items-center gap-2 text-sm text-slate-400 font-medium"
            aria-label="Breadcrumb"
          >
            <Link
              href="/dashboard"
              className="hover:text-[#38bdf8] transition-colors"
            >
              Dashboard
            </Link>
            <span className="mx-1">&gt;</span>
            <span className="text-white">Executive View</span>
          </nav>
          {/* User profile menu */}
          <div className="relative">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700/70 shadow-sm transition-all text-base group focus:outline-none">
              <HiOutlineUserCircle className="text-2xl text-[#38bdf8]" />
              <span className="hidden sm:block font-medium">
                ciso@acme.com
              </span>
              <HiOutlineChevronDown className="text-lg ml-1 text-slate-400 group-hover:text-white transition" />
            </button>
          </div>
        </header>
        {/* Main Content */}
        <main className="flex-1 py-10 px-4 sm:px-8 bg-slate-900/98">
          {/* --- KPI Cards --- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Compliance Score */}
            <div className="flex flex-col h-full">
              <Link
                href="/dashboard/compliance"
                className="transform transition-transform duration-150 hover:scale-105 focus:scale-105 outline-none flex-1 flex flex-col"
                tabIndex={0}
                aria-label="Go to Compliance Score"
              >
                <div className="bg-slate-800 rounded-xl border border-slate-700/60 shadow p-6 flex flex-col items-start relative overflow-hidden cursor-pointer h-full">
                  <div className="text-slate-400 text-base font-semibold mb-2 flex items-center">
                    <HiShieldCheck className="text-xl text-yellow-400 mr-2" />
                    Global Compliance Score
                  </div>
                  <div className="flex items-end gap-3 mb-3">
                    <span className={classNames(
                        "text-4xl sm:text-5xl font-extrabold",
                        recentComplianceScore >= 90
                          ? "text-green-400"
                          : recentComplianceScore >= 80
                          ? "text-[#38bdf8]"
                          : "text-yellow-400"
                      )}>
                      {recentComplianceScore}%
                    </span>
                    <span className={classNames(
                      "text-xs font-medium pb-1",
                      recentComplianceScore >= 90
                        ? "text-green-400"
                        : recentComplianceScore >= 80
                        ? "text-[#38bdf8]"
                        : "text-yellow-400"
                    )}>
                      {recentComplianceScore >= 90
                        ? "Excellent"
                        : recentComplianceScore >= 80
                        ? "Good"
                        : "Needs Attention"}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-slate-700/40 rounded-full h-3 overflow-hidden">
                    <div
                      className={classNames(
                        "h-3 rounded-full",
                        recentComplianceScore >= 90
                          ? "bg-green-400"
                          : recentComplianceScore >= 80
                          ? "bg-sky-400"
                          : "bg-yellow-400"
                      )}
                      style={{ width: `${recentComplianceScore}%` }}
                    ></div>
                  </div>
                  {/* View Details */}
                  <div className="mt-5 w-full">
                    <span className="text-sky-400 font-semibold text-sm hover:underline transition-all">
                      View Details &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </div>
            {/* Critical Open Risks KPI */}
            <div className="flex flex-col h-full">
              <Link
                href="/dashboard/risks"
                className="transform transition-transform duration-150 hover:scale-105 focus:scale-105 outline-none flex-1 flex flex-col"
                tabIndex={0}
                aria-label="Go to Open Risks"
              >
                <div className="bg-slate-800 rounded-xl border border-slate-700/60 shadow p-6 flex flex-col items-start relative overflow-hidden cursor-pointer h-full">
                  <div className="text-slate-400 text-base font-semibold mb-2 flex items-center">
                    <HiExclamation className="text-xl text-red-500 mr-2" />
                    Critical Open Risks
                  </div>
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-4xl sm:text-5xl font-extrabold text-red-400">
                      {criticalOpenRisks}
                    </span>
                    <span className="text-xs pb-1 text-red-300 font-semibold">
                      {"High/Critical in Prod"}
                    </span>
                  </div>
                  <div className="mt-5 w-full">
                    <span className="text-sky-400 font-semibold text-sm hover:underline transition-all">
                      View Details &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </div>
            {/* At-Risk Assets KPI */}
            <div className="flex flex-col h-full">
              <Link
                href="/dashboard/assets"
                className="transform transition-transform duration-150 hover:scale-105 focus:scale-105 outline-none flex-1 flex flex-col"
                tabIndex={0}
                aria-label="Go to At-Risk Assets"
              >
                <div className="bg-slate-800 rounded-xl border border-slate-700/60 shadow p-6 flex flex-col items-start relative overflow-hidden cursor-pointer h-full">
                  <div className="text-slate-400 text-base font-semibold mb-2 flex items-center">
                    <HiServer className="text-xl text-fuchsia-400 mr-2" />
                    At-Risk Assets
                  </div>
                  <div className="flex items-end gap-3 mb-3">
                    <span className="text-4xl sm:text-5xl font-extrabold text-fuchsia-300">
                      {atRiskAssets}
                    </span>
                    <span className="text-xs pb-1 text-fuchsia-200 font-semibold">
                      {"Prod systems with risk"}
                    </span>
                  </div>
                  <div className="mt-5 w-full">
                    <span className="text-sky-400 font-semibold text-sm hover:underline transition-all">
                      View Details &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
          {/* --- Risk Hotspots --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Left Col: Top Risky Applications */}
            <div className="rounded-xl border border-slate-700/70 bg-slate-800 shadow p-6">
              <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <HiServer className="text-xl text-yellow-400" />
                Top Risky Applications
              </h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400">
                    <th className="text-left font-semibold pb-2">App Name</th>
                    <th className="text-left font-semibold pb-2">Environment</th>
                    <th className="text-right font-semibold pb-2"># Critical Findings</th>
                  </tr>
                </thead>
                <tbody>
                  {systems
                    .filter(s => s.criticalFindings > 0)
                    .sort((a, b) => b.criticalFindings - a.criticalFindings)
                    .slice(0, 5)
                    .map((sys) => (
                      <tr key={sys.name} className="border-b border-slate-700/40 last:border-none">
                        <td className="py-2 font-medium">
                          <Link
                            href={`/dashboard/assets/${getAppId(sys.name)}`}
                            className="text-[#38bdf8] hover:underline transition-colors font-semibold"
                          >
                            {sys.name}
                            <div className="block text-xs text-slate-400 font-normal">
                              View Risk Profile
                            </div>
                          </Link>
                        </td>
                        <td className="py-2">
                          <span
                            className={classNames(
                              "px-2 py-0.5 text-xs rounded font-semibold",
                              sys.env === "Prod"
                                ? "bg-red-500/30 text-red-300"
                                : "bg-slate-600/60 text-slate-300"
                            )}
                          >
                            {sys.env}
                          </span>
                        </td>
                        <td className="py-2 text-right text-yellow-300 font-mono font-bold">
                          {sys.criticalFindings}
                        </td>
                      </tr>
                    ))}
                  {systems.filter(s => s.criticalFindings > 0).length === 0 && (
                    <tr>
                      <td colSpan={3}>
                        <span className="text-slate-500 text-center block py-5">No risky applications found.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Right Col: Top Failing Controls */}
            <div className="rounded-xl border border-slate-700/70 bg-slate-800 shadow p-6">
              <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
                <HiExclamation className="text-xl text-red-400" />
                Top Failing Controls
              </h3>
              <ul className="space-y-3">
                {topFailingControls
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((item) => (
                  <li key={item.code} className="flex items-center justify-between gap-2 bg-slate-700/40 rounded-lg px-4 py-2 group hover:bg-slate-700/80 transition">
                    <div>
                      <Link
                        href={`/dashboard/controls/${getControlId(item.code)}`}
                        className="font-mono font-semibold text-[#38bdf8] mr-2 hover:underline transition-colors"
                        title="View affected applications"
                      >
                        {item.code}
                      </Link>
                      <span className="text-white">{item.name}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="bg-red-400/20 text-red-300 rounded-full px-3 py-0.5 text-xs font-semibold">
                        {item.count}{" "}
                        <span className="hidden sm:inline">occurrence{item.count > 1 ? "s" : ""}</span>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* --- Operational View: Recent Assessments, by Standard --- */}
          <div className="rounded-xl border border-slate-700/70 bg-slate-800 shadow p-8 max-w-5xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-7 flex items-center gap-2">
              <HiOutlineClipboardCheck className="text-2xl text-[#38bdf8]" />
              Recent Assessments
            </h2>
            <div className="space-y-8">
            {["NIST 800-171", "CMMC 2.0"].map((standardKey) => {
                const assessmentsByStandard = assessments
                  .filter(a => a.standard === standardKey)
                  .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
                return (
                  <div key={standardKey}>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={classNames(
                          "inline-block px-2 py-0.5 rounded text-xs font-bold tracking-wider",
                          standardKey === "NIST 800-171" ? "bg-sky-700/50 text-sky-200" : "bg-fuchsia-700/40 text-fuchsia-200"
                        )}
                      >
                        {standardKey}
                      </span>
                    </div>
                    <ul className="divide-y divide-slate-700/60">
                      {assessmentsByStandard.length === 0 && (
                        <li className="py-5 text-slate-500">No recent assessments.</li>
                      )}
                      {assessmentsByStandard.map(assessment => (
                        <Link
                          key={assessment.id}
                          href={`/dashboard/assessments/${assessment.id}`}
                          className="block group"
                          tabIndex={0}
                          aria-label={`Go to assessment ${assessment.title}`}
                        >
                          <li className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4 cursor-pointer group-hover:bg-gray-800/50 transition">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-[#38bdf8] truncate group-hover:underline transition-colors">
                                  {assessment.title}
                                </span>
                                <span className={"ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-slate-700/60 text-slate-200"}>
                                  {assessment.system}
                                </span>
                              </div>
                              <span className="block text-xs text-slate-400 mt-1">
                                Last updated: {assessment.updated}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-2 md:mt-0 min-w-[200px]">
                              <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className={
                                    classNames(
                                      "h-full rounded-full transition-all",
                                      assessment.progress === 100
                                        ? "bg-green-500"
                                        : assessment.progress >= 80
                                        ? "bg-sky-400"
                                        : assessment.progress >= 50
                                        ? "bg-yellow-400"
                                        : "bg-red-400"
                                    )
                                  }
                                  style={{
                                    width: `${assessment.progress}%`
                                  }}
                                ></div>
                              </div>
                              <span className={
                                classNames(
                                  "text-xs font-semibold font-mono w-10 text-right",
                                  assessment.progress === 100
                                    ? "text-green-400"
                                    : assessment.progress >= 80
                                    ? "text-sky-300"
                                    : assessment.progress >= 50
                                    ? "text-yellow-300"
                                    : "text-red-300"
                                )}
                              >
                                {assessment.progress}%
                              </span>
                            </div>
                            <span
                              className={classNames(
                                "text-xs font-bold px-2 rounded py-0.5 ml-2",
                                assessment.status === "Complete"
                                  ? "bg-green-700/60 text-green-300"
                                  : "bg-yellow-700/40 text-yellow-200"
                              )}
                            >
                              {assessment.status}
                            </span>
                          </li>
                        </Link>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
          {/* Footer/Info */}
          <div className="mt-12 text-slate-500 text-center text-sm">
            <span>
              Executive (CISO) dashboard — View organization-wide risk and compliance posture in real time.
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
