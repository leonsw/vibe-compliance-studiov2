"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; 
import {
  HiChevronDown,
  HiChevronRight,
  HiCheckCircle,
  HiExclamationCircle, // Used for Risk Icon
  HiCloudUpload,
  HiChatAlt2,
  HiLightningBolt,
  HiDocumentSearch,
  HiPaperAirplane,
  HiExternalLink,
  HiClock,
  HiXCircle,    // New: Fail Icon
  HiMinusCircle // New: N/A Icon
} from "react-icons/hi";

// --- Types ---
interface Evidence {
  id: string;
  name: string;
  source_type: 'Integration' | 'Policy_AI' | 'Manual';
  status: 'Verified' | 'Pending' | 'Missing' | 'Failed';
  url?: string;
  snippet?: string;
  ai_feedback?: string;
  confidence_score?: number;
}

interface Control {
  id: string; 
  control_code: string; 
  family: string;
  description: string;
  status: 'Compliant' | 'Non-Compliant' | 'Review Required' | 'Missing' | 'Not Started' | 'Failed' | 'N/A'; // Added N/A
  evidence?: Evidence[];
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export default function AssessmentWorkbench() {
  const params = useParams();
  const assessmentId = params?.id as string;

  // --- Data State ---
  const [assessment, setAssessment] = useState<any>(null);
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- UI State ---
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [scanLoadingId, setScanLoadingId] = useState<string | null>(null);
  const [manualUploadLoadingId, setManualUploadLoadingId] = useState<string | null>(null);
  const manualUploadInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // --- Chat State ---
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'ai', content: 'I am ready to help you map controls and find evidence. What should we work on?' }
  ]);
  const [input, setInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // --- Fetch Data ---
  useEffect(() => {
    if (!assessmentId) return;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assessmentId)) return;

    const fetchData = async () => {
      setLoading(true);
      
      const { data: asmData, error: asmError } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();

      if (asmError) console.error("Error fetching assessment:", asmError);
      else setAssessment(asmData);

      const { data: ctrlData, error: ctrlError } = await supabase
        .from("controls")
        .select(`*, evidence (*)`)
        .eq("assessment_id", assessmentId)
        .order('control_code', { ascending: true });

      if (ctrlError) console.error("Error fetching controls:", ctrlError);
      else setControls(ctrlData || []);

      setLoading(false);
    };

    fetchData();
  }, [assessmentId]);

  // --- NEW: Handle Control Status Update (Pass/Fail/NA) ---
  const updateControlStatus = async (e: React.MouseEvent, controlId: string, newStatus: string) => {
    e.stopPropagation(); // Prevent toggling the accordion

    // 1. Optimistic Update
    setControls(prev => prev.map(c => c.id === controlId ? { ...c, status: newStatus as any } : c));

    // 2. Database Update
    const { error } = await supabase
        .from("controls")
        .update({ status: newStatus })
        .eq("id", controlId);

    if (error) {
        alert("Error updating status");
        return;
    }

    // 3. Update Assessment Progress
    const total = controls.length;
    const doneCount = controls.map(c => c.id === controlId ? { ...c, status: newStatus } : c)
                              .filter(c => c.status !== 'Not Started').length;
    const newProgress = Math.round((doneCount / total) * 100);

    await supabase.from("assessments").update({ progress: newProgress }).eq("id", assessmentId);
    setAssessment((prev: any) => ({ ...prev, progress: newProgress }));
  };

  // --- Existing Chat Handler ---
  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = input;
    setInput(""); 
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          context: {
            assessmentTitle: assessment?.title || "Unknown Assessment",
            standard: assessment?.standard || "General",
            visibleControls: controls.map(c => ({
              id: c.control_code, 
              status: c.status, 
              evidenceCount: c.evidence?.length || 0
            }))
          }
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { role: 'ai', content: data.reply || "Error connecting to AI." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "System Error: Failed to reach Copilot." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- Existing Auto-Scan Handler ---
  const handleAutoScan = async (control: Control) => {
    setScanLoadingId(control.id);
    try {
      const response = await fetch('/api/integrations/github/scan');
      const data = await response.json();

      if (data.status === 'success') {
        const { data: newEvidence, error } = await supabase
          .from("evidence")
          .insert({
            control_id: control.id,
            name: `GitHub MFA Settings (${data.org})`,
            source_type: 'Integration',
            status: data.mfa_enabled ? 'Verified' : 'Missing',
            url: `https://github.com/orgs/${data.org}/settings/security`
          })
          .select()
          .single();

        if (error) throw error;
        updateControlEvidence(control.id, newEvidence);
        alert(`Scan Complete: MFA is ${data.mfa_enabled ? 'Enabled' : 'Disabled'}`);
      } else {
        alert("Scan Failed: " + data.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("System Error during scan.");
    } finally {
      setScanLoadingId(null);
    }
  };

  // --- Existing Policy Mapper ---
  const handleLinkPolicy = async (control: Control) => {
    setScanLoadingId(control.id);
    try {
        const response = await fetch('/api/policy/map', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                controlId: control.id,
                controlCode: control.control_code,
                controlDescription: control.description
            })
        });

        const result = await response.json();

        if (result.found) {
            const { data: newEvidence, error } = await supabase
              .from("evidence")
              .insert({
                control_id: control.id,
                name: result.evidenceData.name, 
                source_type: 'Policy_AI', 
                status: 'Pending', 
                snippet: result.evidenceData.snippet,
                confidence_score: result.evidenceData.confidence,
                ai_feedback: `AI matched this policy section with ${result.evidenceData.confidence}% similarity.`
              })
              .select()
              .single();

            if (error) throw error;
            updateControlEvidence(control.id, newEvidence as any);
            alert(`Policy Linked!\n\nDocument: ${result.evidenceData.name}\nMatch Score: ${result.evidenceData.confidence}%`);
        } else {
            alert("Analysis Complete: No relevant policy documents found.");
        }
    } catch (err: any) {
        console.error(err);
        alert("Policy Scan Error: " + err.message);
    } finally {
        setScanLoadingId(null);
    }
  };

  // --- Existing Manual Upload ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, control: Control) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanLoadingId(control.id);
    setManualUploadLoadingId(control.id);

    try {
      const path = `${assessmentId}/${control.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("evidence-files")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("evidence-files")
        .getPublicUrl(path);

      const { data: newEvidence, error: dbError } = await supabase
        .from("evidence")
        .insert({
          control_id: control.id,
          name: file.name,
          source_type: 'Manual',
          status: 'Pending',
          url: publicUrl
        })
        .select()
        .single();

      if (dbError) throw dbError;
      updateControlEvidence(control.id, newEvidence as any);

      // AI Validator
      fetch('/api/evidence/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evidenceId: newEvidence.id,
          controlDescription: control.description,
          fileUrl: publicUrl
        })
      })
      .then(res => res.json())
      .then(aiResult => {
        if (aiResult.verdict) {
            const verdictStatus = aiResult.verdict.status === 'Verified' ? 'Verified' : 'Failed';
            alert(`AI VERDICT: ${verdictStatus}\n\nReason: ${aiResult.verdict.reasoning}\nConfidence: ${aiResult.verdict.confidence_score}%`);
 
            
        }  
      });

    } catch (err: any) {
      console.error("Upload failed:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setScanLoadingId(null);
      setManualUploadLoadingId(null);
      if (manualUploadInputRefs.current[control.id]) {
        manualUploadInputRefs.current[control.id]!.value = "";
      }
    }
  };

  // --- Existing Jira Sync ---
  const handleSyncJira = async (evidence: Evidence, control: Control) => {
    const isClosed = confirm(`Simulating Jira Sync for ${evidence.name}...\n\nIs the ticket closed in Jira? (Click OK to simulate 'Done')`);
    
    if (isClosed) {
        try {
            const { error: evError } = await supabase.from("evidence").update({ status: 'Verified' }).eq("id", evidence.id);
            if (evError) throw evError;

            const { error: ctrlError } = await supabase.from("controls").update({ status: 'Review Required' }).eq("id", control.id);
            if (ctrlError) throw ctrlError;

            setControls(prev => prev.map(c => {
                if (c.id === control.id) {
                    const updatedEv = c.evidence?.map(e => e.id === evidence.id ? { ...e, status: 'Verified' as 'Verified' } : e);
                    return { ...c, status: 'Review Required' as 'Review Required', evidence: updatedEv };
                }
                return c;
            }));
            alert("Synced! Ticket closed. Control marked for review.");
        } catch (err: any) {
            console.error("Sync error:", err);
            alert("Sync failed: " + err.message);
        }
    }
  };

  const updateControlEvidence = (controlId: string, newEvidence: Evidence) => {
    setControls(prev => prev.map(c => {
        if (c.id === controlId) {
          return { ...c, evidence: [...(c.evidence || []), newEvidence] };
        }
        return c;
    }));
  };

  const toggleControl = (id: string) => {
    setExpandedControl(expandedControl === id ? null : id);
  };

  if (loading) return <div className="p-10 text-gray-400 flex items-center gap-2"><HiClock className="animate-spin"/> Loading workbench...</div>;
  if (!assessment) return <div className="p-10 text-red-400">Assessment not found.</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0f172a] text-gray-300">
      
      {/* LEFT: Control Matrix */}
      <div className="flex-1 flex flex-col border-r border-gray-800 overflow-hidden">
        <header className="px-8 py-6 border-b border-gray-800 bg-[#0f172a]">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white mb-2">{assessment.title}</h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800">{assessment.standard}</span>
                        <span>{controls.length} Controls Scoped</span>
                    </div>
                </div>
            </div>
            <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-[#38bdf8] h-full" style={{ width: `${assessment.progress || 0}%` }}></div>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-4">
            {controls.map((control) => (
                <div key={control.id} className="border border-gray-800 rounded-lg bg-[#1e293b]/50 overflow-hidden">
                    <div 
                        onClick={() => toggleControl(control.id)}
                        className="flex items-center p-4 cursor-pointer hover:bg-gray-800/50 transition group"
                    >
                        <div className="mr-4 text-gray-500">
                            {expandedControl === control.id ? <HiChevronDown size={20}/> : <HiChevronRight size={20}/>}
                        </div>
                        <div className="w-24 font-mono text-sm font-bold text-gray-400">{control.control_code}</div>
                        <div className="flex-1">
                            <div className="text-gray-200 font-medium">{control.description}</div>
                            {/* RISK ALERT (Shown if Failed) */}
                            {(control.status === 'Failed' || control.status === 'Non-Compliant') && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-red-400 font-bold animate-pulse">
                                    <HiExclamationCircle /> Risk Record Created
                                </div>
                            )}
                        </div>
                        
                        {/* --- NEW: STATUS TOGGLE BUTTONS --- */}
                        <div className="flex items-center gap-1 ml-4 bg-[#0f172a] p-1 rounded border border-gray-700/50">
                            <button
                                onClick={(e) => updateControlStatus(e, control.id, 'Compliant')}
                                className={`p-1.5 rounded transition ${
                                    control.status === 'Compliant' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-green-400'
                                }`}
                                title="Pass"
                            >
                                <HiCheckCircle size={18} />
                            </button>
                            <button
                                onClick={(e) => updateControlStatus(e, control.id, 'Failed')}
                                className={`p-1.5 rounded transition ${
                                    control.status === 'Failed' || control.status === 'Non-Compliant' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-red-400'
                                }`}
                                title="Fail (Creates Risk)"
                            >
                                <HiXCircle size={18} />
                            </button>
                            <button
                                onClick={(e) => updateControlStatus(e, control.id, 'N/A')}
                                className={`p-1.5 rounded transition ${
                                    control.status === 'N/A' ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'
                                }`}
                                title="Not Applicable"
                            >
                                <HiMinusCircle size={18} />
                            </button>
                        </div>
                    </div>

                    {expandedControl === control.id && (
                        <div className="bg-[#0f172a] border-t border-gray-800 p-6">
                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">Evidence</h4>
                            
                            <div className="space-y-2 mb-6">
                                {control.evidence?.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">No evidence linked.</p>
                                ) : (
                                    control.evidence?.map((ev) => (
                                        <div key={ev.id} className="p-3 bg-gray-900 border border-gray-800 rounded mb-2 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                {ev.source_type === 'Integration' && <HiLightningBolt className="text-blue-400"/>}
                                                {ev.source_type === 'Policy_AI' && <HiDocumentSearch className="text-purple-400"/>}
                                                {ev.source_type === 'Manual' && <HiCloudUpload className="text-gray-400"/>}
                                                
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-white flex items-center gap-2">
                                                        {ev.name}
                                                        {ev.url && (
                                                            <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-blue-400">
                                                                <HiExternalLink />
                                                            </a>
                                                        )}
                                                    </span>
                                                    {ev.confidence_score !== undefined && ev.confidence_score > 0 && (
                                                        <span className={`text-[10px] ${ev.confidence_score > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                        AI Confidence: {ev.confidence_score}%
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                    
                                            <div className="flex items-center gap-3">
                                                {ev.name.includes("Remediation Ticket") && ev.status !== 'Verified' && (
                                                    <button 
                                                        onClick={() => handleSyncJira(ev, control)}
                                                        className="text-[10px] px-2 py-1 bg-blue-900/30 text-blue-300 border border-blue-800 rounded hover:bg-blue-800 transition"
                                                    >
                                                        Sync Status
                                                    </button>
                                                )}
                                                <span className={`text-xs px-2 py-0.5 rounded border ${
                                                    ev.status === 'Verified' ? 'text-green-400 border-green-900 bg-green-900/20' : 
                                                    ev.status === 'Failed' ? 'text-red-400 border-red-900 bg-red-900/20' :
                                                    ev.status === 'Missing' ? 'text-gray-400 border-gray-700 bg-gray-900/50' :
                                                    'text-yellow-400 border-yellow-900 bg-yellow-900/20'
                                                }`}>
                                                    {ev.status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex gap-3 mt-4 border-t border-gray-800 pt-4">
                                <input
                                    type="file"
                                    className="hidden"
                                    ref={(el) => { manualUploadInputRefs.current[control.id] = el; }}
                                    onChange={(e) => handleFileUpload(e, control)}
                                />

                                <button 
                                    onClick={() => manualUploadInputRefs.current[control.id]?.click()}
                                    disabled={manualUploadLoadingId === control.id}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium text-white transition disabled:opacity-50"
                                >
                                    <HiCloudUpload className={manualUploadLoadingId === control.id ? "animate-spin" : "text-gray-400"}/> 
                                    {manualUploadLoadingId === control.id ? "Uploading..." : "Upload Evidence"}
                                </button>

                                <button 
                                    onClick={() => handleAutoScan(control)}
                                    disabled={scanLoadingId === control.id}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium text-white transition disabled:opacity-50"
                                >
                                    <HiLightningBolt className={scanLoadingId === control.id ? "animate-spin" : "text-yellow-400"}/> 
                                    {scanLoadingId === control.id ? "Scanning..." : "Auto-Scan GitHub"}
                                </button>
                                
                                <button 
                                    onClick={() => handleLinkPolicy(control)}
                                    disabled={scanLoadingId === control.id}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded text-xs font-medium text-white transition disabled:opacity-50"
                                >
                                    <HiDocumentSearch className={scanLoadingId === control.id ? "animate-spin" : "text-purple-400"}/> 
                                    {scanLoadingId === control.id ? "Analyzing..." : "Link Policy Document"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>
     </div>
  );
}