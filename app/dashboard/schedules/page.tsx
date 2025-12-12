"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  HiClock, 
  HiPlus, 
  HiTrash, 
  HiPlay, 
  HiX
} from "react-icons/hi";

export default function SchedulerPage() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [standardId, setStandardId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [frequency, setFrequency] = useState("Weekly");

  // Options Data (Fetched Separately)
  const [standardsList, setStandardsList] = useState<any[]>([]);
  const [systemsList, setSystemsList] = useState<any[]>([]);

  // 1. Fetch Data (The Fix: No Joins in SQL)
  const fetchData = async () => {
    setLoading(true);
    try {
      // A. Get Dropdown Options
      const { data: stds } = await supabase.from("standards_library").select("id, name");
      if (stds) setStandardsList(stds);

      const { data: sys } = await supabase.from("systems").select("id, name");
      if (sys) setSystemsList(sys);

      // B. Get Schedules (Raw Data Only)
      const { data: schedData, error: schedError } = await supabase
        .from("assessment_schedules")
        .select("*") 
        .order("created_at", { ascending: false });

      if (schedError) throw schedError;
      setSchedules(schedData || []);

    } catch (err: any) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // 2. Helper Functions (The "Client-Side Join")
  const getSystemName = (id: string) => {
    const sys = systemsList.find(s => s.id === id);
    return sys ? sys.name : "Unknown Asset";
  };

  const getStandardName = (id: string) => {
    const std = standardsList.find(s => s.id === id);
    return std ? std.name : "Unknown Standard";
  };

  // 3. Create Schedule Handler
  const handleCreate = async () => {
    if (!name || !standardId || !assetId) {
        alert("Please fill in all fields.");
        return;
    }
    
    setIsSaving(true);
    try {
        const nextRun = new Date();
        if (frequency === 'Weekly') nextRun.setDate(nextRun.getDate() + 7);
        if (frequency === 'Monthly') nextRun.setDate(nextRun.getDate() + 30);
        if (frequency === 'Quarterly') nextRun.setDate(nextRun.getDate() + 90);

        const payload = {
            name,
            standard_id: standardId,
            asset_group: assetId, // Storing System UUID here
            frequency,
            next_run: nextRun.toISOString(),
            status: 'Active'
        };

        const { error } = await supabase
            .from("assessment_schedules")
            .insert(payload);

        if (error) throw error;

        // Reset and Refresh
        setIsModalOpen(false);
        setName("");
        setStandardId("");
        setAssetId("");
        fetchData(); // Reload list to show new item
        alert("Schedule Created Successfully!");

    } catch (err: any) {
        console.error("Save Error:", err);
        alert("Failed to save: " + err.message);
    } finally {
        setIsSaving(false);
    }
  };

  // 4. Delete Handler
  const handleDelete = async (id: string) => {
      if(!confirm("Stop and delete this schedule?")) return;
      await supabase.from("assessment_schedules").delete().eq("id", id);
      fetchData();
  };

  // 5. Run Now Handler
  const handleRunNow = async (scheduleId: string) => {
      const confirmRun = confirm("Run this audit immediately? This will create a new Assessment.");
      if (!confirmRun) return;

      try {
          const res = await fetch('/api/scheduler/run', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ scheduleId })
          });
          
          const result = await res.json();
          if (!res.ok) throw new Error(result.error);

          alert("Success! Automation triggered. Check your Assessments list.");
          // Ideally update last_run here too, fetchData handles it
          fetchData();

      } catch (err: any) {
          alert("Automation Failed: " + err.message);
      }
  };

  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <HiClock className="text-[#38bdf8]" /> Audit Scheduler
          </h1>
          <p className="text-sm text-gray-400">Configure recurring compliance scans.</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#38bdf8] text-[#0f172a] font-bold rounded-lg hover:bg-sky-400 transition"
        >
            <HiPlus /> Create Schedule
        </button>
      </div>

      {/* Schedules Table */}
      <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        {loading ? (
             <div className="p-12 text-center text-gray-500">Loading schedules...</div>
        ) : schedules.length === 0 ? (
             <div className="p-12 text-center text-gray-500">No automated audits configured.</div>
        ) : (
             <table className="w-full text-left text-sm">
                <thead className="bg-gray-900/50 text-gray-400 uppercase font-medium">
                    <tr>
                        <th className="px-6 py-4">Schedule Name</th>
                        <th className="px-6 py-4">Target</th>
                        <th className="px-6 py-4">Frequency</th>
                        <th className="px-6 py-4">Next Run</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {schedules.map((sch) => (
                        <tr key={sch.id} className="hover:bg-gray-800/30 transition">
                            <td className="px-6 py-4 font-bold text-white">{sch.name}</td>
                            <td className="px-6 py-4">
                                <div className="text-white">{getStandardName(sch.standard_id)}</div>
                                <div className="text-xs text-gray-500">{getSystemName(sch.asset_group)}</div>
                            </td>
                            <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs">
                                    {sch.frequency}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-[#38bdf8] font-mono">
                                {new Date(sch.next_run).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4">
                                <span className="flex items-center gap-1 text-green-400 text-xs uppercase font-bold">
                                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                                    {sch.status}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button 
                                    onClick={() => handleRunNow(sch.id)}
                                    className="p-2 text-green-400 hover:bg-green-900/20 rounded border border-transparent hover:border-green-900 transition"
                                    title="Run Now"
                                >
                                    <HiPlay />
                                </button>
                                <button 
                                    onClick={() => handleDelete(sch.id)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition"
                                >
                                    <HiTrash />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-gray-700 rounded-xl w-full max-w-md p-6 relative shadow-2xl">
                <button 
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    <HiX />
                </button>
                
                <h2 className="text-xl font-bold text-white mb-6">New Audit Schedule</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">Schedule Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-[#38bdf8] outline-none"
                            placeholder="e.g. Monthly Prod Scan"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">Standard to Audit</label>
                        <select 
                            className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-[#38bdf8] outline-none"
                            value={standardId}
                            onChange={(e) => setStandardId(e.target.value)}
                        >
                            <option value="">Select Standard...</option>
                            {standardsList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">Target Asset</label>
                        <select 
                            className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-[#38bdf8] outline-none"
                            value={assetId}
                            onChange={(e) => setAssetId(e.target.value)}
                        >
                            <option value="">Select Asset...</option>
                            {systemsList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 uppercase font-bold">Frequency</label>
                        <select 
                            className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mt-1 focus:border-[#38bdf8] outline-none"
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                        >
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                        </select>
                    </div>

                    <button 
                        onClick={handleCreate}
                        disabled={isSaving}
                        className="w-full py-3 bg-[#38bdf8] text-[#0f172a] font-bold rounded hover:bg-sky-400 transition mt-4 disabled:opacity-50"
                    >
                        {isSaving ? "Scheduling..." : "Save Schedule"}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}