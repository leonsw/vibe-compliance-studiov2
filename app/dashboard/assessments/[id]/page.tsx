"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"; 
import {
  HiChevronDown,
  HiChevronRight,
  HiCheckCircle,
  HiExclamationCircle,
  HiCloudUpload,
  HiChatAlt2,
  HiLightningBolt,
  HiDocumentSearch,
  HiPaperAirplane,
  HiExternalLink,
  HiClock
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
  id: string; // UUID
  control_code: string; // Label like 'AC.1.001'
  family: string;
  description: string;
  status: 'Compliant' | 'Non-Compliant' | 'Review Required' | 'Missing' | 'Not Started' | 'Failed';
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

  // --- Scroll to bottom of chat ---
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // --- Fetch Data ---
  useEffect(() => {
    if (!assessmentId) return;

    // Guard against "new" or invalid IDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assessmentId)) return;

    const fetchData = async () => {
      setLoading(true);
      
      // 1. Fetch Assessment
      const { data: asmData, error: asmError } = await supabase
        .from("assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();

      if (asmError) console.error("Error fetching assessment:", asmError);
      else setAssessment(asmData);

      // 2. Fetch Controls & Evidence
      const { data: ctrlData, error: ctrlError } = await supabase
        .from("controls")
        .select(`
            *,
            evidence (*)
        `)
        .eq("assessment_id", assessmentId)
        .order('control_code', { ascending: true });

      if (ctrlError) console.error("Error fetching controls:", ctrlError);
      else setControls(ctrlData || []);

      setLoading(false);
    };

    fetchData();
  }, [assessmentId]);

  // --- 1. Chat Handler (RAG) ---
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

  // --- 2. Auto-Scan Handler (GitHub Integration) ---
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

  // --- 3. Real Policy Mapper (RAG) ---
  const handleLinkPolicy = async (control: Control) => {
    setScanLoadingId(control.id);
    try {
        // Call the Mapper API
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
            // Success: We found a matching policy paragraph!
            const { data: newEvidence, error } = await supabase
              .from("evidence")
              .insert({
                control_id: control.id,
                name: result.evidenceData.name, 
                source_type: 'Policy_AI', 
                status: 'Pending', // Pending human review
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
            // Failure: No policy matches this requirement
            alert("Analysis Complete: No relevant policy documents found in your library for this specific requirement.");
        }

    } catch (err: any) {
        console.error(err);
        alert("Policy Scan Error: " + err.message);
    } finally {
        setScanLoadingId(null);
    }
  };

  // --- 4. Manual Upload + AI Validator (Multimodal Agent) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, control: Control) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanLoadingId(control.id);
    setManualUploadLoadingId(control.id);

    try {
      // A. Upload to Supabase Storage
      const path = `${assessmentId}/${control.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("evidence-files")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // B. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("evidence-files")
        .getPublicUrl(path);

      // C. Create DB Record
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

      // Update UI (Cast newEvidence to 'any' to bypass strict DB type mismatch)
      updateControlEvidence(control.id, newEvidence as any);

      // D. Trigger AI Validator
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
           // UPDATED ALERT: Now shows the Status (VERIFIED/REJECTED) at the top
           alert(`AI VERDICT: ${aiResult.verdict.status.toUpperCase()}\n\nReason: ${aiResult.verdict.reasoning}\n\nConfidence: ${aiResult.verdict.confidence_score}%`);
           
           // Update UI with Verdict
           setControls(prev => prev.map(c => {
             if (c.id === control.id) {
               const updatedEv = (c.evidence || []).map((ev) => {
                 if (ev.id === newEvidence.id) {
                    return { 
                       ...ev, 
                       // Map 'Rejected' or 'Inconclusive' to 'Missing' (Red) for the UI Badge
                       status: (aiResult.verdict.status === 'Verified' ? 'Verified' : 'Failed') as 'Verified' | 'Failed',
                       ai_feedback: aiResult.verdict.reasoning,
                       confidence_score: aiResult.verdict.confidence_score
                     };
                 }
                 return ev;
               });
               return { ...c, evidence: updatedEv };
             }
             return c;
           }));
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

  // Helper to update state safely
  // Helper to update state safely
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
                        <div className="flex-1 text-gray-200 font-medium">{control.description}</div>
                        <div className={`text-xs px-2 py-1 rounded border font-medium ${
                        control.status === 'Compliant' ? 'bg-green-900/20 text-green-400 border-green-900' :
                        control.status === 'Failed' ? 'bg-red-900/20 text-red-400 border-red-900' : // <--- "Failed" is Red
                        control.status === 'Review Required' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900' :
                        'bg-gray-800 text-gray-400 border-gray-700'
                    }`}>
                        {control.status}
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
                                                   <span className="text-sm text-white">{ev.name}</span>
                                                   {/* Show AI Confidence if available */}
                                                   {ev.confidence_score !== undefined && ev.confidence_score > 0 && (
                                                      <span className={`text-[10px] ${ev.confidence_score > 80 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                        AI Confidence: {ev.confidence_score}%
                                                      </span>
                                                   )}
                                                </div>
                                                
                                                {ev.url && <a href={ev.url} target="_blank" className="text-gray-500 hover:text-white ml-2"><HiExternalLink/></a>}
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded border ${
                                                ev.status === 'Verified' ? 'text-green-400 border-green-900 bg-green-900/20' : 
                                                ev.status === 'Failed' ? 'text-red-400 border-red-900 bg-red-900/20' :
                                                ev.status === 'Missing' ? 'text-red-400 border-red-900 bg-red-900/20' :
                                                'text-yellow-400 border-yellow-900 bg-yellow-900/20'
                                            }`}>{ev.status}</span>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="flex gap-3 mt-4 border-t border-gray-800 pt-4">
                                {/* Hidden Input for File Upload */}
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
      
      {/* RIGHT: Vibe Copilot */}
      <div className="w-[350px] bg-[#0f172a] border-l border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2 bg-[#1e293b]/30">
            <HiChatAlt2 className="text-[#38bdf8]"/>
            <span className="font-bold text-white">Vibe Copilot</span>
        </div>
        
        <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'ai' ? 'bg-gradient-to-tr from-blue-600 to-purple-600' : 'bg-gray-700'}`}>
                        {msg.role === 'ai' ? <HiLightningBolt className="text-white w-4 h-4"/> : <span className="text-xs">You</span>}
                    </div>
                    <div className={`p-3 rounded-lg text-sm max-w-[80%] ${msg.role === 'ai' ? 'bg-gray-800 border border-gray-700 text-gray-300 rounded-tl-none' : 'bg-[#38bdf8] text-[#0f172a] rounded-tr-none'}`}>
                        {msg.content}
                    </div>
                </div>
            ))}
            {isChatLoading && (
                <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex-shrink-0 animate-pulse"></div>
                     <div className="bg-gray-800 p-3 rounded-lg text-sm text-gray-400 italic">Thinking...</div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-gray-800 bg-[#1e293b]/30">
            <div className="relative">
                <input 
                    type="text" 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about this control..." 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-4 pr-10 py-3 text-sm text-white focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-all"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={isChatLoading}
                    className="absolute right-2 top-2 p-1.5 bg-[#38bdf8] text-[#0f172a] rounded hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <HiPaperAirplane className="rotate-90 text-sm"/>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}