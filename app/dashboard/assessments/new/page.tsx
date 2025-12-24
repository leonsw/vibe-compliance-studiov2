"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { 
  HiOutlineTemplate, 
  HiServer, 
  HiCheck, 
  HiArrowRight,
  HiLibrary,
  HiPlus, 
  HiCubeTransparent,
  HiDocumentText
} from "react-icons/hi";

export default function NewAssessmentWizard() {
  const router = useRouter();
  const supabase = createClient();
  
  // Data State
  const [systems, setSystems] = useState<any[]>([]);
  const [standards, setStandards] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Form State
  const [name, setName] = useState("");
  const [selectedSystem, setSelectedSystem] = useState("");
  const [selectedStandardId, setSelectedStandardId] = useState(""); 
  const [selectedStandardName, setSelectedStandardName] = useState(""); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Options
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      const { data: sys } = await supabase.from("systems").select("*");
      if (sys) setSystems(sys);

      const { data: std } = await supabase
        .from("standards_library")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (std) setStandards(std);
      setLoadingData(false);
    };
    fetchData();
  }, []);

  // 2. Creation Logic
  const handleCreate = async () => {
    if (!name || !selectedSystem || !selectedStandardId) return;
    setIsSubmitting(true);

    try {
      // Create Assessment
      const { data: assessment, error: asmError } = await supabase
        .from("assessments")
        .insert({
          title: name,
          system_id: selectedSystem,
          standard: selectedStandardName, 
          standard_id: selectedStandardId, 
          status: 'In Progress',
          progress: 0
        })
        .select()
        .single();

      if (asmError) throw asmError;

      // Fetch Master Controls
      const { data: masters } = await supabase
        .from("master_controls")
        .select("*")
        .eq("standard_id", selectedStandardId);

      if (!masters || masters.length === 0) {
        alert("Standard has no controls. Please check the Library.");
        setIsSubmitting(false);
        return;
      }

      // Clone Controls
      const controlsToInsert = masters.map(m => ({
        assessment_id: assessment.id,
        control_code: m.control_code,
        family: m.family,
        description: m.description,
        status: 'not_started'
      }));

      const { error: cloneError } = await supabase.from("controls").insert(controlsToInsert);
      if (cloneError) throw cloneError;

      router.push(`/dashboard/assessments/${assessment.id}`);

    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 h-full flex items-center justify-center overflow-y-auto min-h-screen">
      <div className="w-full max-w-4xl bg-[#1e293b] border border-gray-800 rounded-2xl p-8 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#38bdf8]/10 text-[#38bdf8] mb-4">
            <HiOutlineTemplate className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">New Assessment</h1>
          <p className="text-gray-400 text-sm">Select a target system and a compliance standard.</p>
        </div>

        {/* Wizard Form */}
        <div className="space-y-10">
          
          {/* STEP 1: TITLE */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">1. Assessment Name</label>
            <input 
              type="text" 
              placeholder="e.g. 2025 Production Security Audit"
              className="w-full bg-[#0f172a] border border-gray-700 rounded-xl p-4 text-white placeholder-gray-600 focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] outline-none transition"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* STEP 2: ASSET SELECTION (Grid Layout) */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
               2. Target Asset <span className="text-gray-500 font-normal normal-case">(What are we auditing?)</span>
            </label>
            
            {loadingData ? (
                <div className="h-24 bg-gray-800 animate-pulse rounded-xl" />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {/* Option A: Existing Systems */}
                   {systems.map(sys => (
                     <div 
                       key={sys.id}
                       onClick={() => setSelectedSystem(sys.id)}
                       className={`
                         relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-2 h-32 justify-between
                         ${selectedSystem === sys.id 
                           ? "bg-[#38bdf8]/10 border-[#38bdf8] shadow-[0_0_20px_rgba(56,189,248,0.2)]" 
                           : "bg-[#0f172a] border-gray-800 hover:border-gray-600 hover:bg-gray-800/50"}
                       `}
                     >
                       <div className="flex justify-between items-start">
                          <HiCubeTransparent className={`w-6 h-6 ${selectedSystem === sys.id ? "text-[#38bdf8]" : "text-gray-500"}`} />
                          {selectedSystem === sys.id && <div className="bg-[#38bdf8] text-black p-1 rounded-full"><HiCheck className="w-3 h-3" /></div>}
                       </div>
                       <div>
                          <h3 className={`font-bold truncate ${selectedSystem === sys.id ? "text-white" : "text-gray-300"}`}>{sys.name}</h3>
                          <p className="text-xs text-gray-500 truncate">{sys.type || "System"}</p>
                       </div>
                     </div>
                   ))}

                   {/* Option B: ADD NEW (Always Visible) */}
                   <Link href="/dashboard/assets" className="group p-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-[#38bdf8] hover:bg-[#38bdf8]/5 transition-all duration-200 flex flex-col items-center justify-center gap-2 h-32 text-gray-500 hover:text-[#38bdf8]">
                      <div className="p-2 rounded-full bg-gray-800 group-hover:bg-[#38bdf8]/20 transition">
                        <HiPlus className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">Add New Asset</span>
                   </Link>
                </div>
            )}
          </div>

          {/* STEP 3: STANDARD SELECTION (Grid Layout) */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
               3. Compliance Standard <span className="text-gray-500 font-normal normal-case">(Which rules apply?)</span>
            </label>
            
            {loadingData ? (
                <div className="h-24 bg-gray-800 animate-pulse rounded-xl" />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                   {/* Option A: Existing Standards */}
                   {standards.map(std => (
                     <div 
                       key={std.id}
                       onClick={() => {
                          setSelectedStandardId(std.id);
                          setSelectedStandardName(std.name);
                       }}
                       className={`
                         relative cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex flex-col gap-2 h-32 justify-between
                         ${selectedStandardId === std.id 
                           ? "bg-[#38bdf8]/10 border-[#38bdf8] shadow-[0_0_20px_rgba(56,189,248,0.2)]" 
                           : "bg-[#0f172a] border-gray-800 hover:border-gray-600 hover:bg-gray-800/50"}
                       `}
                     >
                       <div className="flex justify-between items-start">
                          <HiDocumentText className={`w-6 h-6 ${selectedStandardId === std.id ? "text-[#38bdf8]" : "text-gray-500"}`} />
                          {selectedStandardId === std.id && <div className="bg-[#38bdf8] text-black p-1 rounded-full"><HiCheck className="w-3 h-3" /></div>}
                       </div>
                       <div>
                          <h3 className={`font-bold truncate ${selectedStandardId === std.id ? "text-white" : "text-gray-300"}`}>{std.name}</h3>
                          <p className="text-xs text-gray-500">{std.total_controls || 0} Controls</p>
                       </div>
                     </div>
                   ))}

                   {/* Option B: ADD NEW (Always Visible) */}
                   <Link href="/dashboard/standards" className="group p-4 rounded-xl border-2 border-dashed border-gray-700 hover:border-[#38bdf8] hover:bg-[#38bdf8]/5 transition-all duration-200 flex flex-col items-center justify-center gap-2 h-32 text-gray-500 hover:text-[#38bdf8]">
                      <div className="p-2 rounded-full bg-gray-800 group-hover:bg-[#38bdf8]/20 transition">
                        <HiLibrary className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium">Import Standard</span>
                   </Link>
                </div>
            )}
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-6 border-t border-gray-800">
             <button 
                onClick={handleCreate}
                disabled={!name || !selectedSystem || !selectedStandardId || isSubmitting}
                className="w-full py-4 bg-[#38bdf8] text-[#0f172a] font-bold rounded-xl hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg shadow-lg hover:shadow-[#38bdf8]/25"
             >
                {isSubmitting ? "Building Assessment..." : "Launch Assessment"} 
                {!isSubmitting && <HiArrowRight className="w-5 h-5" />}
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}