"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { 
  HiOutlineTemplate, 
  HiServer, 
  HiCheck, 
  HiArrowRight 
} from "react-icons/hi";

export default function NewAssessmentWizard() {
  const router = useRouter();
  
  // Data State
  const [systems, setSystems] = useState<any[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  
  // Form State
  const [name, setName] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");
  const [selectedStandard, setSelectedStandard] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Options on Load
  useEffect(() => {
    const fetchData = async () => {
      const { data: sys } = await supabase.from("systems").select("*");
      const { data: std } = await supabase.from("compliance_standards").select("*");
      
      if (sys) setSystems(sys);
      if (std) setStandards(std);
    };
    fetchData();
  }, []);

  // 2. The "Magic" Cloning Logic
  const handleCreate = async () => {
    if (!name || !selectedSystem || !selectedStandard) return;
    setIsSubmitting(true);

    try {
      // A. Create the Assessment
      const { data: assessment, error: asmError } = await supabase
        .from("assessments")
        .insert({
          title: name,
          system_id: selectedSystem,
          standard: selectedStandard, // e.g. 'CMMC-L2' (Matches the ID in compliance_standards)
          status: 'In Progress',
          progress: 0
        })
        .select()
        .single();

      if (asmError) throw asmError;

      // B. Fetch the Template Controls
      const { data: templates } = await supabase
        .from("template_controls")
        .select("*")
        .eq("standard_id", selectedStandard); // Get only CMMC controls

      if (!templates || templates.length === 0) {
        alert("No template controls found for this standard! Did you run the seed script?");
        return;
      }

      // C. Bulk Insert Clones
      // We map the template data to the new 'controls' schema
      const controlsToInsert = templates.map(t => ({
        assessment_id: assessment.id,
        control_code: t.control_id, // Mapping 'AC.1.001' to the new text column
        family: t.family,
        description: t.description,
        status: 'Not Started'
      }));

      const { error: cloneError } = await supabase
        .from("controls")
        .insert(controlsToInsert);

      if (cloneError) throw cloneError;

      // D. Redirect to the new Workbench
      router.push(`/dashboard/assessments/${assessment.id}`);

    } catch (err: any) {
      console.error("Wizard failed:", err);
      alert("Failed to create assessment: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 h-full flex items-center justify-center">
      <div className="w-full max-w-2xl bg-[#1e293b]/50 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] mb-4">
            <HiOutlineTemplate className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Start New Assessment</h1>
          <p className="text-gray-400">Launch a compliance audit for a specific asset.</p>
        </div>

        {/* Form */}
        <div className="space-y-8">
          
          {/* 1. Name */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Assessment Title</label>
            <input 
              type="text" 
              placeholder="e.g. Q4 Payroll System Audit"
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
            {systems.length === 0 && <p className="text-xs text-yellow-500 mt-2">No systems found. Add one in the DB first.</p>}
          </div>

          {/* 3. Standard */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Compliance Standard</label>
            <div className="space-y-3">
              {standards.map(std => (
                <div 
                  key={std.id}
                  onClick={() => setSelectedStandard(std.id)}
                  className={`
                    cursor-pointer p-4 rounded-lg border transition flex items-center gap-4
                    ${selectedStandard === std.id 
                      ? "bg-[#38bdf8]/10 border-[#38bdf8]" 
                      : "bg-gray-900 border-gray-800 hover:border-gray-600"}
                  `}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedStandard === std.id ? "border-[#38bdf8]" : "border-gray-600"}`}>
                    {selectedStandard === std.id && <div className="w-2 h-2 rounded-full bg-[#38bdf8]" />}
                  </div>
                  <div>
                    <h3 className={`font-bold ${selectedStandard === std.id ? "text-white" : "text-gray-300"}`}>{std.name}</h3>
                    <p className="text-xs text-gray-500">{std.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Action */}
          <button 
            onClick={handleCreate}
            disabled={!name || !selectedSystem || !selectedStandard || isSubmitting}
            className="w-full py-4 bg-[#38bdf8] text-[#0f172a] font-bold rounded-xl hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
          >
            {isSubmitting ? "Generating Controls..." : "Launch Assessment"} 
            {!isSubmitting && <HiArrowRight />}
          </button>

        </div>
      </div>
    </div>
  );
}