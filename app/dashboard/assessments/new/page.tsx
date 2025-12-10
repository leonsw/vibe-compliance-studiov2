"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  HiOutlineTemplate, 
  HiServer, 
  HiCheck, 
  HiArrowRight,
  HiLibrary
} from "react-icons/hi";

export default function NewAssessmentWizard() {
  const router = useRouter();
  
  // Data State
  const [systems, setSystems] = useState<any[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  
  // Form State
  const [name, setName] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");
  const [selectedStandardId, setSelectedStandardId] = useState(""); // This is the UUID
  const [selectedStandardName, setSelectedStandardName] = useState(""); // This is the Name
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Options (Systems + Dynamic Standards Library)
  useEffect(() => {
    const fetchData = async () => {
      // Get Assets
      const { data: sys } = await supabase.from("systems").select("*");
      if (sys) setSystems(sys);

      // Get Your Uploaded Standards (The New Table)
      const { data: std } = await supabase
        .from("standards_library")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (std) setStandards(std);
    };
    fetchData();
  }, []);

  // 2. The "Cloning" Logic
  const handleCreate = async () => {
    if (!name || !selectedSystem || !selectedStandardId) return;
    setIsSubmitting(true);

    try {
      // A. Create the Assessment Container
      const { data: assessment, error: asmError } = await supabase
        .from("assessments")
        .insert({
          title: name,
          system_id: selectedSystem,
          standard: selectedStandardName, // Store the name for display (e.g. "NIST 800-171")
          status: 'In Progress',
          progress: 0
        })
        .select()
        .single();

      if (asmError) throw asmError;

      // B. Fetch the Master Controls (From the imported spreadsheet)
      const { data: masters } = await supabase
        .from("master_controls")
        .select("*")
        .eq("standard_id", selectedStandardId);

      if (!masters || masters.length === 0) {
        alert("Error: This standard has no controls indexed. Did the import finish?");
        setIsSubmitting(false);
        return;
      }

      // C. Bulk Insert (Clone Master -> Active Controls)
      const controlsToInsert = masters.map(m => ({
        assessment_id: assessment.id,
        control_code: m.control_code,
        family: m.family,
        description: m.description,
        status: 'Not Started'
      }));

      const { error: cloneError } = await supabase
        .from("controls")
        .insert(controlsToInsert);

      if (cloneError) throw cloneError;

      // D. Redirect
      router.push(`/dashboard/assessments/${assessment.id}`);

    } catch (err: any) {
      console.error("Wizard failed:", err);
      alert("Failed to create assessment: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 h-full flex items-center justify-center overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#1e293b]/50 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] mb-4">
            <HiOutlineTemplate className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Start New Assessment</h1>
          <p className="text-gray-400">Launch a compliance audit based on your imported standards.</p>
        </div>

        {/* Form */}
        <div className="space-y-8">
          
          {/* 1. Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Assessment Title</label>
            <input 
              type="text" 
              placeholder="e.g. Q1 Security Review"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-[#38bdf8] outline-none transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* 2. System (Asset) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <HiServer /> Target Asset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {systems.map(sys => (
                <div 
                  key={sys.id}
                  onClick={() => setSelectedSystem(sys.id)}
                  className={`
                    cursor-pointer p-4 rounded-lg border transition flex items-center justify-between
                    ${selectedSystem === sys.id 
                      ? "bg-[#38bdf8]/10 border-[#38bdf8] text-white" 
                      : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600"}
                  `}
                >
                  <span className="font-medium">{sys.name}</span>
                  {selectedSystem === sys.id && <HiCheck className="text-[#38bdf8]" />}
                </div>
              ))}
            </div>
          </div>

          {/* 3. Standard (Dynamic Library) */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
              <HiLibrary /> Select Standard
            </label>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {standards.length === 0 ? (
                  <div className="p-4 border border-dashed border-gray-700 rounded text-gray-500 text-center text-xs">
                      No standards found. Go to Library to import one.
                  </div>
              ) : (
                  standards.map(std => (
                    <div 
                      key={std.id}
                      onClick={() => {
                          setSelectedStandardId(std.id);
                          setSelectedStandardName(std.name);
                      }}
                      className={`
                        cursor-pointer p-4 rounded-lg border transition flex items-center gap-4
                        ${selectedStandardId === std.id 
                          ? "bg-[#38bdf8]/10 border-[#38bdf8]" 
                          : "bg-gray-900 border-gray-800 hover:border-gray-600"}
                      `}
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedStandardId === std.id ? "border-[#38bdf8]" : "border-gray-600"}`}>
                        {selectedStandardId === std.id && <div className="w-2 h-2 rounded-full bg-[#38bdf8]" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                            <h3 className={`font-bold ${selectedStandardId === std.id ? "text-white" : "text-gray-300"}`}>{std.name}</h3>
                            <span className="text-xs text-gray-500">{std.total_controls} Controls</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{std.description || "Imported Standard"}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Submit Action */}
          <button 
            onClick={handleCreate}
            disabled={!name || !selectedSystem || !selectedStandardId || isSubmitting}
            className="w-full py-4 bg-[#38bdf8] text-[#0f172a] font-bold rounded-xl hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
          >
            {isSubmitting ? "Cloning Controls..." : "Launch Assessment"} 
            {!isSubmitting && <HiArrowRight />}
          </button>

        </div>
      </div>
    </div>
  );
}