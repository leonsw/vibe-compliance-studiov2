"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  AlertTriangle, CheckCircle, XCircle, Search, 
  Filter, Server, FileText, ChevronRight, X, ExternalLink, Loader2 
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Types ---
type Risk = {
  id: string;
  title: string;
  description: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Review' | 'Mitigated' | 'Accepted' | 'Closed';
  mitigating_controls?: string;
  jira_ticket_key?: string; // New
  jira_ticket_url?: string; // New
  control_id?: string;
  created_at: string;
  systems: { name: string };
  assessments: { title: string };
};

export default function RiskRegisterPage() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [filter, setFilter] = useState("Open");
  const [creatingTicket, setCreatingTicket] = useState(false); // UI State

  const [editForm, setEditForm] = useState<{ status: string; notes: string }>({ status: '', notes: '' });

  useEffect(() => {
    fetchRisks();
  }, []);

  async function fetchRisks() {
    setLoading(true);
    const { data, error } = await supabase
      .from("risks")
      .select("*, systems(name), assessments(title)")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching risks:", error);
    else setRisks(data || []);
    setLoading(false);
  }

  const handleRiskClick = (risk: Risk) => {
    setSelectedRisk(risk);
    setEditForm({ 
      status: risk.status, 
      notes: risk.mitigating_controls || '' 
    });
  };

  const handleUpdateRisk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRisk) return;

    const { error } = await supabase
      .from("risks")
      .update({ 
        status: editForm.status, 
        mitigating_controls: editForm.notes 
      })
      .eq("id", selectedRisk.id);

    if (error) {
      alert("Update failed");
    } else {
      setRisks(prev => prev.map(r => 
        r.id === selectedRisk.id 
        ? { ...r, status: editForm.status as any, mitigating_controls: editForm.notes } 
        : r
      ));
      setSelectedRisk(null);
    }
  };

  // --- NEW: Jira Creation Logic ---
  const handleCreateTicket = async () => {
    if (!selectedRisk) return;
    setCreatingTicket(true);

    try {
        const response = await fetch('/api/integrations/jira/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: selectedRisk.title,
                description: selectedRisk.description,
                controlId: selectedRisk.control_id, // Link evidence to control
                riskId: selectedRisk.id             // Link ticket to risk
            })
        });

        const data = await response.json();

        if (data.success) {
            alert(`Ticket Created: ${data.ticketKey}`);
            // Update local state to show the new ticket immediately
            const updatedRisk = { 
                ...selectedRisk, 
                jira_ticket_key: data.ticketKey, 
                jira_ticket_url: data.ticketUrl,
                status: 'In Review' as const 
            };
            
            setRisks(prev => prev.map(r => r.id === selectedRisk.id ? updatedRisk : r));
            setSelectedRisk(updatedRisk);
            setEditForm(prev => ({ ...prev, status: 'In Review' })); // Update dropdown
        } else {
            alert("Error: " + data.error);
        }
    } catch (err) {
        alert("Failed to create ticket.");
    } finally {
        setCreatingTicket(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case 'Critical': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'High': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const filteredRisks = risks.filter(r => {
    if (filter === "All") return true;
    if (filter === "Open") return r.status === 'Open' || r.status === 'In Review';
    return r.status === filter;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto text-gray-300 min-h-screen">
      
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
             <AlertTriangle className="w-8 h-8 text-red-500" /> Risk Register
          </h1>
          <p className="text-gray-400 mt-1">Track, triage, and remediate compliance findings.</p>
        </div>
        
        <div className="flex bg-[#1e293b] p-1 rounded-lg border border-gray-800">
          {["Open", "Mitigated", "Accepted", "All"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                filter === f ? "bg-[#38bdf8] text-[#0f172a] shadow-lg" : "text-gray-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading risk registry...</div>
      ) : (
        <div className="space-y-4">
          {filteredRisks.length === 0 && (
             <div className="text-center py-16 bg-[#1e293b]/50 rounded-xl border border-gray-800">
                <CheckCircle className="w-12 h-12 mx-auto text-green-500/50 mb-3" />
                <p className="text-gray-400">No risks found matching filter: {filter}</p>
             </div>
          )}

          {filteredRisks.map((risk) => (
            <div 
              key={risk.id} 
              onClick={() => handleRiskClick(risk)}
              className="bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 hover:bg-[#1e293b] hover:border-gray-600 transition cursor-pointer group"
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                   <div className={`p-3 rounded-lg h-fit border ${getSeverityColor(risk.severity)}`}>
                      <AlertTriangle className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-[#38bdf8] transition flex items-center gap-3">
                        {risk.title}
                        {risk.jira_ticket_key && (
                            <span className="text-xs bg-[#0f172a] border border-blue-900 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                                {risk.jira_ticket_key}
                            </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2 max-w-2xl">
                        {risk.description}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                         <span className="flex items-center gap-1 bg-gray-900 px-2 py-1 rounded border border-gray-800">
                            <Server className="w-3 h-3" /> {risk.systems?.name || "Unknown System"}
                         </span>
                         <span className="flex items-center gap-1">
                            <FileText className="w-3 h-3" /> {risk.assessments?.title || "Manual Entry"}
                         </span>
                         <span>Created: {new Date(risk.created_at).toLocaleDateString()}</span>
                      </div>
                   </div>
                </div>
                <div className="text-right">
                   <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      risk.status === 'Open' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      risk.status === 'In Review' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                      risk.status === 'Mitigated' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      'bg-gray-700 text-gray-300 border-gray-600'
                   }`}>
                      {risk.status}
                   </span>
                   <div className="mt-8 opacity-0 group-hover:opacity-100 transition text-[#38bdf8] text-sm flex items-center justify-end gap-1">
                      Manage Risk <ChevronRight className="w-4 h-4" />
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRisk && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
           <div className="bg-[#0f172a] border border-gray-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              
              <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
                 <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        {selectedRisk.title}
                        {selectedRisk.jira_ticket_key && (
                             <a 
                               href={selectedRisk.jira_ticket_url} 
                               target="_blank" 
                               rel="noreferrer"
                               className="text-sm bg-blue-900/30 border border-blue-800 text-blue-400 px-2 py-1 rounded hover:bg-blue-900/50 flex items-center gap-1"
                             >
                                {selectedRisk.jira_ticket_key} <ExternalLink className="w-3 h-3" />
                             </a>
                        )}
                    </h2>
                    <p className="text-gray-400 text-sm mt-1">ID: {selectedRisk.id.slice(0,8)}</p>
                 </div>
                 <button onClick={() => setSelectedRisk(null)} className="text-gray-500 hover:text-white">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <form onSubmit={handleUpdateRisk} className="space-y-6">
                 
                 <div className="bg-[#1e293b] p-4 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Findings</label>
                        
                        {/* JIRA BUTTON */}
                        {!selectedRisk.jira_ticket_key && (
                            <button
                                type="button" 
                                onClick={handleCreateTicket}
                                disabled={creatingTicket}
                                className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded flex items-center gap-2 transition disabled:opacity-50"
                            >
                                {creatingTicket ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                {creatingTicket ? "Creating..." : "Create Jira Ticket"}
                            </button>
                        )}
                    </div>
                    <p className="text-gray-300 text-sm">{selectedRisk.description}</p>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                       <label className="block text-sm font-medium text-gray-400 mb-2">Risk Status</label>
                       <select 
                          value={editForm.status}
                          onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                          className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-2.5 text-white focus:border-[#38bdf8] outline-none"
                       >
                          <option value="Open">Open</option>
                          <option value="In Review">In Review</option>
                          <option value="Mitigated">Mitigated (Closed)</option>
                          <option value="Accepted">Accepted (Risk Acceptance)</option>
                       </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Severity (Immutable)</label>
                        <div className={`p-2.5 rounded-lg border text-sm font-bold ${getSeverityColor(selectedRisk.severity)}`}>
                           {selectedRisk.severity}
                        </div>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Mitigating Controls / Remediation Notes</label>
                    <textarea 
                       value={editForm.notes}
                       onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                       className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white focus:border-[#38bdf8] outline-none h-32"
                       placeholder="Describe how this risk was addressed or why it is accepted..."
                    />
                 </div>

                 <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                    <button type="button" onClick={() => setSelectedRisk(null)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-[#38bdf8] text-[#0f172a] font-bold rounded-lg hover:bg-sky-400 transition">
                       Update Risk Record
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}