"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { 
  ShieldAlert, 
  Activity, 
  ArrowRight, 
  BrainCircuit, 
  Loader2 
} from "lucide-react";

// Types
type Risk = { id: string; title: string; severity: string; likelihood: string };

export default function RiskManager() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);

  // AI Scorer State
  const [threatInput, setThreatInput] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    const { data } = await supabase.from("risks").select("id, title, severity, likelihood");
    setRisks(data || []);
    setLoading(false);
  };

  // --- HEATMAP LOGIC ---
  const getRiskCount = (sev: string, like: string) => {
    return risks.filter(r => r.severity === sev && r.likelihood === like).length;
  };

  const getCellColor = (sev: string, like: string) => {
    // Logic: High Sev + High Like = Red (Critical)
    if (sev === 'Critical' || (sev === 'High' && like === 'High')) return "bg-red-500/20 border-red-500/50 text-red-500";
    if (sev === 'High' || like === 'High') return "bg-orange-500/20 border-orange-500/50 text-orange-500";
    if (sev === 'Medium' && like === 'Medium') return "bg-yellow-500/20 border-yellow-500/50 text-yellow-500";
    return "bg-green-500/20 border-green-500/50 text-green-500";
  };

  // --- AI SCORER LOGIC ---
  const runRiskAnalysis = async () => {
    if (!threatInput) return;
    setAnalyzing(true);
    setAnalysis(null);

    try {
        const res = await fetch('/api/risks/analyze', {
            method: 'POST',
            body: JSON.stringify({ threat: threatInput })
        });
        const data = await res.json();
        setAnalysis(data.result);
    } catch (e) {
        alert("AI Analysis failed.");
    } finally {
        setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 text-gray-300 min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
            <h1 className="text-3xl font-bold text-white mb-2">Risk Manager</h1>
            <p className="text-gray-400">Strategic view of your threat landscape.</p>
        </div>
        <Link href="/dashboard/risks/register" className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] border border-gray-700 hover:border-[#38bdf8] text-white rounded-lg transition group">
            <Activity className="w-4 h-4 text-[#38bdf8]" /> View Risk Register
            <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 1. THE HEATMAP (2/3 width) */}
        <div className="lg:col-span-2 bg-[#1e293b] border border-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-purple-400" /> Risk Heatmap
            </h3>
            
            {loading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">Loading Matrix...</div>
            ) : (
                <div className="relative">
                    {/* Y-AXIS LABEL */}
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold uppercase text-gray-500 tracking-widest">
                        Likelihood
                    </div>

                    <div className="ml-6">
                        {/* THE GRID */}
                        <div className="grid grid-cols-4 gap-2 mb-2">
                            {/* Header Row (Empty corner + X-Labels) */}
                            <div className="text-right pr-4 pt-8 text-xs font-bold text-gray-500">High</div>
                            <div className="text-right pr-4 pt-8 text-xs font-bold text-gray-500">Med</div>
                            <div className="text-right pr-4 pt-8 text-xs font-bold text-gray-500">Low</div>
                            <div className="row-span-4 grid grid-rows-3 gap-2">
                                {/* This creates the 4x3 matrix structure */}
                            </div>
                        </div>

                        {/* ROW 1: HIGH LIKELIHOOD */}
                        <div className="grid grid-cols-5 gap-4 mb-4">
                            <div className="text-xs font-bold text-gray-500 flex items-center justify-end pr-2">High</div>
                            {['Low', 'Medium', 'High', 'Critical'].map(sev => (
                                <div key={sev} className={`h-24 rounded-lg border-2 flex flex-col items-center justify-center ${getCellColor(sev, 'High')}`}>
                                    <span className="text-2xl font-bold">{getRiskCount(sev, 'High')}</span>
                                </div>
                            ))}
                        </div>

                        {/* ROW 2: MEDIUM LIKELIHOOD */}
                        <div className="grid grid-cols-5 gap-4 mb-4">
                            <div className="text-xs font-bold text-gray-500 flex items-center justify-end pr-2">Med</div>
                            {['Low', 'Medium', 'High', 'Critical'].map(sev => (
                                <div key={sev} className={`h-24 rounded-lg border-2 flex flex-col items-center justify-center ${getCellColor(sev, 'Medium')}`}>
                                    <span className="text-2xl font-bold">{getRiskCount(sev, 'Medium')}</span>
                                </div>
                            ))}
                        </div>

                        {/* ROW 3: LOW LIKELIHOOD */}
                        <div className="grid grid-cols-5 gap-4">
                            <div className="text-xs font-bold text-gray-500 flex items-center justify-end pr-2">Low</div>
                            {['Low', 'Medium', 'High', 'Critical'].map(sev => (
                                <div key={sev} className={`h-24 rounded-lg border-2 flex flex-col items-center justify-center ${getCellColor(sev, 'Low')}`}>
                                    <span className="text-2xl font-bold">{getRiskCount(sev, 'Low')}</span>
                                </div>
                            ))}
                        </div>

                        {/* X-AXIS LABELS */}
                        <div className="grid grid-cols-5 gap-4 mt-2 text-center">
                            <div></div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Low</div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Medium</div>
                            <div className="text-xs font-bold text-gray-500 uppercase">High</div>
                            <div className="text-xs font-bold text-gray-500 uppercase">Critical</div>
                        </div>
                        <div className="text-center text-xs font-bold uppercase text-gray-500 tracking-widest mt-2 ml-16">
                            Severity (Impact)
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* 2. AI RISK SCORER (1/3 width) */}
        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-purple-400" /> AI Risk Scorer
            </h3>
            <p className="text-sm text-gray-400 mb-4">
                Describe a threat scenario. The AI will estimate Severity and Likelihood for you.
            </p>
            
            <textarea
                className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white text-sm min-h-[100px] mb-4 focus:border-purple-500 outline-none"
                placeholder="E.g., Ransomware attack on the customer database via phishing..."
                value={threatInput}
                onChange={(e) => setThreatInput(e.target.value)}
            />
            
            <button
                onClick={runRiskAnalysis}
                disabled={analyzing || !threatInput}
                className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin"/> : <BrainCircuit className="w-4 h-4" />}
                Analyze Threat
            </button>

            {/* ANALYSIS RESULT */}
            {analysis && (
                <div className="mt-6 border-t border-gray-800 pt-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center bg-gray-800 rounded p-2">
                            <div className="text-xs text-gray-500 uppercase">Severity</div>
                            <div className="text-lg font-bold text-white">{analysis.severity}</div>
                        </div>
                        <div className="text-center bg-gray-800 rounded p-2">
                            <div className="text-xs text-gray-500 uppercase">Likelihood</div>
                            <div className="text-lg font-bold text-white">{analysis.likelihood}</div>
                        </div>
                    </div>
                    <div className="text-sm text-gray-300 bg-gray-800/50 p-3 rounded border border-gray-700">
                        <span className="font-bold text-purple-400">AI Reasoning:</span> {analysis.reasoning}
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}