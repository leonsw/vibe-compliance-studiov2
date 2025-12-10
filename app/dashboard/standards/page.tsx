"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  HiUpload, 
  HiLibrary, 
  HiRefresh, 
  HiCheckCircle,
  HiTrash
} from "react-icons/hi";

export default function StandardsLibrary() {
  const [standards, setStandards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [stdName, setStdName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Standards
  const fetchStandards = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("standards_library")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) setStandards(data);
    setLoading(false);
  };

  useEffect(() => { fetchStandards(); }, []);

  // 2. Handle File Selection
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (!stdName) setStdName(f.name.replace(/\.[^/.]+$/, "")); // Remove extension
    }
  };

  // 3. Upload & Ingest
  const handleIngest = async () => {
    if (!file || !stdName) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", stdName);

      const res = await fetch('/api/standards/ingest', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      alert(`Success! Imported ${result.count} master controls.`);
      
      // Reset
      setFile(null);
      setStdName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchStandards();

    } catch (err: any) {
      console.error(err);
      alert("Ingest failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // 4. Delete Standard
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this standard? This will NOT delete active assessments using it.")) return;
    await supabase.from("standards_library").delete().eq("id", id);
    fetchStandards();
  };

  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Standards Library</h1>
          <p className="text-sm text-gray-400">Import compliance frameworks (NIST, ISO, SOC2) via Excel/CSV.</p>
        </div>
        <button onClick={fetchStandards} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg"><HiRefresh /></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Import Form */}
        <div className="lg:col-span-1 bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 h-fit">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <HiUpload className="text-[#38bdf8]" /> Import Standard
            </h2>
            
            <div className="space-y-4">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${file ? 'border-[#38bdf8] bg-blue-900/10' : 'border-gray-700 hover:border-gray-500'}`}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={onFileChange} />
                    <HiLibrary className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-[#38bdf8]' : 'text-gray-500'}`} />
                    <p className="text-sm text-gray-300">{file ? file.name : "Click to select Spreadsheet"}</p>
                </div>

                {file && (
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Standard Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white mt-1 focus:border-[#38bdf8] outline-none"
                            value={stdName}
                            onChange={(e) => setStdName(e.target.value)}
                        />
                    </div>
                )}

                <button 
                    onClick={handleIngest}
                    disabled={isUploading || !file}
                    className="w-full py-3 bg-[#38bdf8] text-[#0f172a] font-bold rounded hover:bg-sky-400 transition disabled:opacity-50"
                >
                    {isUploading ? "Parsing & Vectorizing..." : "Import Standard"}
                </button>
            </div>
        </div>

        {/* RIGHT: Library List */}
        <div className="lg:col-span-2 space-y-4">
            {standards.length === 0 ? (
                <div className="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-xl">No standards imported yet.</div>
            ) : (
                standards.map((std) => (
                    <div key={std.id} className="p-5 bg-[#1e293b]/50 border border-gray-800 rounded-xl flex items-center justify-between hover:border-gray-600 transition group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-900/20 text-purple-400 rounded-lg">
                                <HiLibrary className="w-6 h-6"/>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{std.name}</h3>
                                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                    <span>{new Date(std.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className="text-[#38bdf8]">{std.total_controls} Controls Indexed</span>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => handleDelete(std.id)} className="p-2 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><HiTrash/></button>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
}