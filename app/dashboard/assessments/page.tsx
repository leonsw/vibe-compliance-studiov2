"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { 
  HiOutlineTemplate, 
  HiPlus, 
  HiChevronRight,
  HiClock,
  HiCheckCircle,
  HiChartBar
} from "react-icons/hi";

export default function AssessmentManager() {
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessments = async () => {
      setLoading(true);
      // Fetch assessments and sort by newest first
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error("Error fetching assessments:", error);
      else setAssessments(data || []);
      
      setLoading(false);
    };

    fetchAssessments();
  }, []);

  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Assessment Manager</h1>
          <p className="text-sm text-gray-400">Track and manage all compliance audits.</p>
        </div>
        <Link 
          href="/dashboard/assessments/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#38bdf8] text-[#0f172a] font-bold rounded hover:bg-sky-400 transition"
        >
          <HiPlus /> Start New Assessment
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading audits...</div>
      ) : assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-gray-800 rounded-xl bg-[#1e293b]/30">
          <div className="p-4 bg-gray-900 rounded-full mb-4">
            <HiOutlineTemplate className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Assessments Found</h3>
          <p className="text-gray-500 mb-6">Get started by launching your first compliance audit.</p>
          <Link 
            href="/dashboard/assessments/new"
            className="px-6 py-3 bg-[#38bdf8] text-[#0f172a] font-bold rounded-lg hover:bg-sky-400 transition"
          >
            Launch Assessment Wizard
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {assessments.map((asm) => (
            <Link 
              key={asm.id}
              href={`/dashboard/assessments/${asm.id}`}
              className="group block bg-[#1e293b]/50 border border-gray-800 rounded-lg p-5 hover:border-[#38bdf8] transition relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                
                {/* Left: Info */}
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${asm.standard?.includes('CMMC') ? 'bg-blue-900/20 text-blue-400' : 'bg-purple-900/20 text-purple-400'}`}>
                    <HiCheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-[#38bdf8] transition">{asm.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><HiOutlineTemplate/> {asm.standard}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><HiClock/> {new Date(asm.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded ${asm.status === 'In Progress' ? 'bg-yellow-900/20 text-yellow-400' : 'bg-green-900/20 text-green-400'}`}>
                        {asm.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Progress & Arrow */}
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block w-32">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">Progress</span>
                      <span className="text-[#38bdf8] font-mono">{asm.progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#38bdf8] h-full transition-all duration-500" style={{ width: `${asm.progress || 0}%` }}></div>
                    </div>
                  </div>
                  <HiChevronRight className="text-gray-600 group-hover:text-white w-5 h-5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}