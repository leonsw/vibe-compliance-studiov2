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
} from "react-icons/hi";

// --- Types ---
interface Evidence {
  id: string;
  name: string;
  source_type: 'Integration' | 'Policy_AI' | 'Manual'; // Matches SQL enum
  status: 'Verified' | 'Pending' | 'Missing';
  url?: string;
  snippet?: string;
}

interface Control {
  id: string;
  family: string;
  description: string;
  status: 'Compliant' | 'Non-Compliant' | 'Review Required' | 'Missing';
  evidence?: Evidence[];
}

interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export default function AssessmentWorkbench() {
  const params = useParams();
  const assessmentId = params?.id as string;
  const [scanLoadingId, setScanLoadingId] = useState<string | null>(null);

  // --- Data State ---
  const [assessment, setAssessment] = useState<any>(null);
  const [controls, setControls] = useState<Control[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedControl, setExpandedControl] = useState<string | null>(null);

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
        .eq("assessment_id", assessmentId);

      if (ctrlError) console.error("Error fetching controls:", ctrlError);
      else setControls(ctrlData || []);

      setLoading(false);
    };

    fetchData();
  }, [assessmentId]);

  // --- Chat Handler ---
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput(""); // Clear input
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
            // WE ARE ADDING THIS: Passing the visible controls to the AI
            visibleControls: controls.map(c => ({
                id: c.id, 
                status: c.status, 
                evidenceCount: c.evidence?.length || 0
            }))
          }
        })
      });

      const data = await response.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'ai', content: data.reply }]);
      } else {
         setMessages(prev => [...prev, { role: 'ai', content: "I encountered an error connecting to the AI." }]);
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'ai', content: "System Error: Failed to reach Copilot." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const toggleControl = (id: string) => {
    setExpandedControl(expandedControl === id ? null : id);
  };

  if (loading) return <div className="p-10 text-gray-400">Loading workbench...</div>;
  if (!assessment) return <div className="p-10 text-red-400">Assessment not found.</div>;

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0f172a] text-gray-300">
      
      {/* LEFT: Control Matrix (Scrollable) */}
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
                        <div className="w-24 font-mono text-sm font-bold text-gray-400">{control.id}</div>
                        <div className="flex-1 text-gray-200 font-medium">{control.description}</div>
                        <div className="text-sm text-gray-500">{control.status}</div>
                    </div>

                    {expandedControl === control.id && (
                        <div className="bg-[#0f172a] border-t border-gray-800 p-6 flex flex-col gap-5">
                            <div>
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-4">Evidence</h4>
                                {control.evidence?.length === 0 ? (
                                    <p className="text-sm text-gray-500 italic">No evidence linked.</p>
                                ) : (
                                    control.evidence?.map((ev, idx) => (
                                        <div key={ev.id ?? ev.name ?? idx} className="p-3 bg-gray-900 border border-gray-800 rounded mb-2 flex justify-between items-center">
                                            <div className="flex items-center gap-2">
                                                {ev.source_type === 'Integration' && <HiLightningBolt className="text-blue-400" />}
                                                {ev.source_type === 'Policy_AI' && <HiDocumentSearch className="text-purple-400" />}
                                                <span className="text-sm text-white">{ev.name}</span>
                                            </div>
                                            <span className="text-xs text-green-400 border border-green-900 px-2 rounded">{ev.status}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            {/* Action Bar */}
                            <div className="flex gap-3 pt-2 border-t border-gray-800 mt-4">
                                <button
                                    type="button"
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-200 rounded font-medium border border-gray-700 hover:bg-gray-700 transition disabled:opacity-60"
                                    style={{ outline: "none" }}
                                    tabIndex={0}
                                    disabled={scanLoadingId === control.id}
                                    onClick={async () => {
                                        setScanLoadingId(control.id);
                                        try {
                                            // 1. Call the GitHub scan API
                                            const resp = await fetch('/api/integrations/github/scan');
                                            const result = await resp.json();

                                            if (result.status === "success") {
                                                // Assume org name is part of result.raw_data.login or result.raw_data.login
                                                const orgName = result.raw_data?.login || "org";
                                                const mfaEnabled = result.mfa_enabled === true;
                                                // Compose the evidence object
                                                const evidence = {
                                                    control_id: control.id,
                                                    name: 'GitHub MFA Settings',
                                                    source_type: 'Integration',
                                                    status: mfaEnabled ? 'Verified' : 'Missing',
                                                    url: `https://github.com/orgs/${orgName}/settings/security`,
                                                };

                                                // 2. Save the evidence in the DB
                                                const { data, error } = await supabase
                                                    .from('evidence')
                                                    .insert([evidence])
                                                    .select()
                                                    .single();

                                                if (error) {
                                                    console.error("Supabase insert error:", error);
                                                } else if (data) {
                                                    // 3. Update local state
                                                    setControls(prevControls =>
                                                        prevControls.map(c =>
                                                            c.id === control.id
                                                                ? {
                                                                    ...c,
                                                                    evidence: [
                                                                        ...(c.evidence || []),
                                                                        data
                                                                    ]
                                                                }
                                                                : c
                                                        )
                                                    );
                                                }
                                            } else {
                                                alert(result.message || "Scan failed");
                                            }
                                        } catch (err) {
                                            console.error("Unexpected error conducting GitHub Scan:", err);
                                            alert("Error running GitHub Scan. Check console.");
                                        } finally {
                                            setScanLoadingId(null);
                                        }
                                    }}
                                >
                                    <HiLightningBolt className="text-blue-400" />
                                    {scanLoadingId === control.id ? "Scanning..." : "Auto-Scan GitHub"}
                                </button>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-700 text-white rounded font-medium border border-purple-800 hover:bg-purple-800 transition disabled:opacity-60"
                                    style={{ outline: "none" }}
                                    tabIndex={0}
                                    disabled={scanLoadingId === control.id}
                                    onClick={async (e) => {
                                        setScanLoadingId(control.id);
                                        await new Promise((res) => setTimeout(res, 2000));

                                        try {
                                            // Replace with your import path if not already imported
                                            // import { supabase } from '@/lib/supabaseClient';
                                            const { data, error } = await supabase
                                                .from('evidence')
                                                .insert([{
                                                    control_id: control.id,
                                                    name: 'Corp_InfoSec_Policy_v2.pdf',
                                                    source_type: 'Policy_AI',
                                                    status: 'Pending',
                                                    snippet: 'Matched Section 3.1'
                                                }])
                                                .select()
                                                .single();

                                            if (error) {
                                                console.error("Supabase insert error:", error);
                                            } else if (data) {
                                                setControls(prevControls =>
                                                    prevControls.map(c =>
                                                        c.id === control.id
                                                            ? {
                                                                ...c,
                                                                evidence: [
                                                                    ...(c.evidence || []),
                                                                    data
                                                                ]
                                                            }
                                                            : c
                                                    )
                                                );
                                            }
                                        } catch (err) {
                                            console.error("Unexpected error inserting evidence:", err);
                                        } finally {
                                            setScanLoadingId(null);
                                        }
                                    }}
                                >
                                    <HiDocumentSearch className="text-white" />
                                    {scanLoadingId === control.id ? "Scanning Library..." : "Link Policy Document"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
      </div>
      
      {/* RIGHT: Vibe Copilot (Fixed Width) */}
      <div className="w-[350px] bg-[#0f172a] border-l border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2 bg-[#1e293b]/30">
            <HiChatAlt2 className="text-[#38bdf8]"/>
            <span className="font-bold text-white">Vibe Copilot</span>
        </div>
        
        {/* Chat History */}
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

        {/* Chat Input */}
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