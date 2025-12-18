"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useParams } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Server, 
  AlertCircle, 
  CheckCircle2, 
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  RefreshCw
} from "lucide-react";
import Link from "next/link";

export default function AssessmentDetail() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState<any>(null);
  const [controls, setControls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  // 1. Fetch Data
  const fetchData = async () => {
    if (!id) return;
    
    // Only show full loading spinner on first load
    if (!assessment) setLoading(true);

    // A. Fetch Assessment + System Details
    const { data: asm, error: asmError } = await supabase
      .from("assessments")
      .select("*, systems(name, type, criticality)")
      .eq("id", id)
      .single();

    if (asmError) console.error(asmError);
    else setAssessment(asm);

    // B. Fetch Controls
    const { data: ctrls, error: ctrlError } = await supabase
      .from("controls")
      .select("*")
      .eq("assessment_id", id)
      .order("control_code", { ascending: true });

    if (ctrlError) console.error(ctrlError);
    else setControls(ctrls || []);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  // Toggle Row Expansion
  const toggleRow = (controlId: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(controlId)) newSet.delete(controlId);
    else newSet.add(controlId);
    setExpandedRows(newSet);
  };

  // --- THE INTELLIGENT AI TRIGGER ---
  const runAIAnalysis = async (controlId: string) => {
    // 1. UI Feedback: Mark this specific row as "Analyzing"
    const newAnalyzing = new Set(analyzingIds);
    newAnalyzing.add(controlId);
    setAnalyzingIds(newAnalyzing);

    try {
        const res = await fetch('/api/assessments/analyze', {
            method: 'POST',
            body: JSON.stringify({ controlId })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        // 2. Success: Refresh data to show the new "Met" status & Justification
        await fetchData();
        
        // Auto-expand the row so the user sees the result immediately
        const newExpanded = new Set(expandedRows);
        newExpanded.add(controlId);
        setExpandedRows(newExpanded);

    } catch (error: any) {
        console.error(error);
        alert("AI Analysis Failed: " + error.message);
    } finally {
        // Remove "Analyzing" state
        const resetAnalyzing = new Set(analyzingIds);
        resetAnalyzing.delete(controlId);
        setAnalyzingIds(resetAnalyzing);
    }
  };

  if (loading) return <div className="p-8 text-gray-400">Loading Assessment Context...</div>;
  if (!assessment) return <div className="p-8 text-red-400">Assessment not found.</div>;

  return (
    <div className="p-8 text-gray-300 min-h-screen pb-20">
      
      {/* Header & Context */}
      <div className="mb-8">
        <Link href="/dashboard/assessments" className="flex items-center gap-2 text-gray-500 hover:text-white mb-4 transition">
            <ArrowLeft className="w-4 h-4" /> Back to Manager
        </Link>
        
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">{assessment.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                        <ShieldCheck className="w-4 h-4 text-[#38bdf8]" />
                        {assessment.standard}
                    </span>
                    
                    {/* SYSTEM CONTEXT CARD */}
                    <span className="flex items-center gap-1 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                        <Server className="w-4 h-4 text-purple-400" />
                        Target: <span className="text-white font-medium">{assessment.systems?.name}</span>
                        <span className="text-gray-500">({assessment.systems?.type || "Generic System"})</span>
                    </span>
                </div>
            </div>

            {/* Global Stats */}
            <div className="flex gap-4 bg-[#1e293b] p-3 rounded-xl border border-gray-800">
                <div className="text-center px-4">
                    <div className="text-2xl font-bold text-white">{controls.length}</div>
                    <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center px-4 border-l border-gray-700">
                    <div className="text-2xl font-bold text-green-400">
                        {controls.filter(c => c.status === 'Met').length}
                    </div>
                    <div className="text-xs text-gray-500">Met</div>
                </div>
                <div className="text-center px-4 border-l border-gray-700">
                    <div className="text-2xl font-bold text-red-400">
                        {controls.filter(c => c.status === 'Not Met').length}
                    </div>
                    <div className="text-xs text-gray-500">Gaps</div>
                </div>
            </div>
        </div>
      </div>

      {/* Controls List */}
      <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="grid grid-cols-12 bg-[#0f172a] p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <div className="col-span-2">Control ID</div>
            <div className="col-span-6">Description</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-right">Action</div>
        </div>

        {controls.map((ctrl) => {
            const isAnalyzing = analyzingIds.has(ctrl.id);
            
            return (
            <div key={ctrl.id} className="border-b border-gray-800/50 hover:bg-white/5 transition group">
                {/* Main Row */}
                <div className="grid grid-cols-12 p-4 items-center">
                    <div className="col-span-2 font-mono text-[#38bdf8] font-bold">
                        {ctrl.control_code}
                    </div>
                    <div className="col-span-6 pr-4">
                        <p className="text-sm text-gray-300 line-clamp-2">{ctrl.description}</p>
                    </div>
                    <div className="col-span-2 text-center">
                        {isAnalyzing ? (
                            <span className="px-2 py-1 rounded text-xs font-bold bg-purple-900/20 text-purple-400 animate-pulse flex items-center justify-center gap-1">
                                <RefreshCw className="w-3 h-3 animate-spin"/> Analyzing
                            </span>
                        ) : (
                            <span className={`px-2 py-1 rounded text-xs font-bold 
                                ${ctrl.status === 'Met' ? 'bg-green-900/20 text-green-400 border border-green-900/30' : 
                                  ctrl.status === 'Not Met' ? 'bg-red-900/20 text-red-400 border border-red-900/30' : 
                                  ctrl.status === 'Partially Met' ? 'bg-yellow-900/20 text-yellow-400 border border-yellow-900/30' :
                                  'bg-gray-800 text-gray-500'}`}>
                                {ctrl.status}
                            </span>
                        )}
                    </div>
                    <div className="col-span-2 flex justify-end gap-2">
                        <button 
                            onClick={() => runAIAnalysis(ctrl.id)}
                            disabled={isAnalyzing}
                            className={`p-2 rounded transition flex items-center gap-1 text-xs font-bold border 
                                ${isAnalyzing 
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                    : 'text-purple-400 hover:bg-purple-900/20 border-transparent hover:border-purple-500/50'}`}
                            title="Run AI Analysis"
                        >
                            <BrainCircuit className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} /> 
                            {isAnalyzing ? "..." : "AI Check"}
                        </button>
                        <button 
                            onClick={() => toggleRow(ctrl.id)}
                            className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition"
                        >
                            {expandedRows.has(ctrl.id) ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                        </button>
                    </div>
                </div>

                {/* Expanded Details (Evidence & Justification) */}
                {expandedRows.has(ctrl.id) && (
                    <div className="bg-[#0f172a]/50 p-6 border-t border-gray-800 ml-4 border-l-2 border-l-[#38bdf8] shadow-inner">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Requirement</h4>
                                <p className="text-sm text-gray-300 mb-6 bg-[#1e293b] p-3 rounded border border-gray-800">{ctrl.description}</p>
                                
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                                    <BrainCircuit className="w-3 h-3 text-purple-400" /> AI Verdict & Justification
                                </h4>
                                {ctrl.ai_justification ? (
                                    <p className="text-sm text-gray-300 bg-purple-900/10 p-4 rounded border border-purple-900/30 leading-relaxed">
                                        {ctrl.ai_justification}
                                    </p>
                                ) : (
                                    <p className="text-sm text-gray-500 italic p-4 bg-gray-900 rounded">
                                        Click "AI Check" to analyze this control against your documents.
                                    </p>
                                )}
                            </div>
                            
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Evidence Links</h4>
                                {ctrl.evidence_links && ctrl.evidence_links.length > 0 ? (
                                    <ul className="space-y-2">
                                        {ctrl.evidence_links.map((link: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2 text-sm bg-gray-900 p-2 rounded hover:bg-gray-800 transition">
                                                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> 
                                                <a href={link} target="_blank" className="text-[#38bdf8] hover:underline truncate">
                                                    Evidence Document {i+1}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <div className="p-6 border border-dashed border-gray-700 rounded text-center">
                                        <AlertCircle className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                                        <p className="text-xs text-gray-500">No evidence linked yet.</p>
                                    </div>
                                )}
                                
                                {ctrl.last_assessed_at && (
                                    <div className="mt-4 text-right">
                                        <span className="text-[10px] text-gray-600 uppercase font-bold">Last Check: </span>
                                        <span className="text-xs text-gray-500">{new Date(ctrl.last_assessed_at).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )})}
      </div>
    </div>
  );
}