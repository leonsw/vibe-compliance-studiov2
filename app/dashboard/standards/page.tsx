"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Upload, 
  Library, 
  RefreshCw, 
  Trash2, 
  DownloadCloud, 
  Sparkles, 
  X, 
  FileSpreadsheet 
} from "lucide-react";

export default function StandardsLibrary() {
  // --- STATE ---
  const [standards, setStandards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [stdName, setStdName] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal State
  const [inspectStd, setInspectStd] = useState<any | null>(null);
  const [controls, setControls] = useState<any[]>([]);
  const [loadingControls, setLoadingControls] = useState(false);

  // --- 1. FETCH STANDARDS ---
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

  // --- 2. FILE SELECTION ---
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      if (!stdName) {
        setStdName(f.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  // --- 3. UPLOAD HANDLER ---
  const handleIngest = async () => {
    if (!file || !stdName) return;
    setIsUploading(true);
    setUploadStatus("Uploading File...");

    try {
      // A. Upload to Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${stdName.replace(/\s/g, '_')}.${fileExt}`;
      const filePath = `imports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("standards-files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("standards-files")
        .getPublicUrl(filePath);

      // B. Send to API
      setUploadStatus("Parsing & Indexing...");
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", stdName);
      formData.append("url", publicUrlData.publicUrl);
      formData.append("storage_path", filePath);

      const res = await fetch('/api/standards/ingest', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      alert(`Success! Imported ${result.count} master controls.`);
      
      // Reset Form
      setFile(null);
      setStdName("");
      setUploadStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchStandards();

    } catch (err: any) {
      console.error(err);
      alert("Ingest failed: " + err.message);
      setUploadStatus("Failed");
    } finally {
      setIsUploading(false);
    }
  };

  // --- 4. DELETE HANDLER ---
  const handleDelete = async (id: string, storagePath?: string) => {
    if (typeof window !== "undefined" && !window.confirm("Delete this standard?")) return;
    
    await supabase.from("standards_library").delete().eq("id", id);
    
    if (storagePath) {
        await supabase.storage.from("standards-files").remove([storagePath]);
    }
    
    fetchStandards();
  };

  // --- 5. INSPECT HANDLER ---
  const handleInspect = async (std: any) => {
    setInspectStd(std);
    setLoadingControls(true);
    
    const { data, error } = await supabase
        .from("master_controls") 
        .select("*")
        .eq("standard_id", std.id)
        .limit(100); 

    if (error) {
        console.error("Error fetching controls:", error);
    } else {
        setControls(data || []);
    }
    setLoadingControls(false);
  }; 
  // ^^^ This brace closes handleInspect. The error usually happens if this is missing.

  // --- RENDER ---
  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto min-h-screen">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Standards Library</h1>
          <p className="text-sm text-gray-400">Import compliance frameworks (NIST, ISO, SOC2) via Excel/CSV.</p>
        </div>
        <button onClick={fetchStandards} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-white">
            <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Import Form */}
        <div className="lg:col-span-1 bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 h-fit">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Upload className="text-[#38bdf8] w-5 h-5" /> Import Standard
            </h2>
            
            <div className="space-y-4">
                <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition 
                        ${file ? 'border-[#38bdf8] bg-blue-900/10' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'}`}
                >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.xlsx,.xls" onChange={onFileChange} />
                    
                    {file ? (
                        <div>
                            <FileSpreadsheet className="w-8 h-8 text-[#38bdf8] mx-auto mb-2"/>
                            <p className="text-white text-sm font-medium truncate max-w-[200px] mx-auto">{file.name}</p>
                        </div>
                    ) : (
                        <div>
                            <Library className="w-8 h-8 text-gray-500 mx-auto mb-2"/>
                            <p className="text-gray-400 text-sm">Select Excel / CSV</p>
                        </div>
                    )}
                </div>

                {file && (
                    <div>
                        <label className="text-xs text-gray-500 uppercase font-bold">Standard Name</label>
                        <input 
                            type="text" 
                            className="w-full bg-[#0f172a] border border-gray-700 rounded p-2 text-white mt-1 focus:border-[#38bdf8] outline-none transition"
                            value={stdName}
                            onChange={(e) => setStdName(e.target.value)}
                        />
                    </div>
                )}

                <button 
                    onClick={handleIngest}
                    disabled={isUploading || !file}
                    className="w-full py-2.5 bg-[#38bdf8] text-[#0f172a] font-bold rounded hover:bg-sky-400 transition disabled:opacity-50 flex justify-center items-center gap-2"
                >
                    {isUploading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Upload className="w-4 h-4"/>}
                    {isUploading ? (uploadStatus || "Processing...") : "Import Standard"}
                </button>
            </div>
        </div>

        {/* RIGHT: Library List */}
        <div className="lg:col-span-2 space-y-4">
            {loading ? (
                 <div className="text-center py-12 text-gray-500">Loading library...</div>
            ) : standards.length === 0 ? (
                <div className="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-xl bg-[#1e293b]/20">
                    <Library className="mx-auto h-12 w-12 text-gray-600 mb-3" />
                    No standards imported yet.
                </div>
            ) : (
                standards.map((std) => (
                    <div key={std.id} className="p-5 bg-[#1e293b]/50 border border-gray-800 rounded-xl flex items-center justify-between hover:border-gray-600 transition group">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-900/20 text-purple-400 rounded-lg border border-purple-900/30">
                                <Library className="w-6 h-6"/>
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-lg">{std.name}</h3>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                    <span>{new Date(std.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span className="text-[#38bdf8]">{std.total_controls} Controls</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                             {/* DOWNLOAD */}
                             {std.url && (
                                <a 
                                   href={std.url} 
                                   target="_blank" 
                                   rel="noopener noreferrer"
                                   className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
                                   title="Download Original File"
                                >
                                    <DownloadCloud className="w-5 h-5" />
                                </a>
                            )}

                             {/* INSPECT */}
                             <button 
                                onClick={() => handleInspect(std)} 
                                className="p-2 text-gray-400 hover:text-[#38bdf8] hover:bg-blue-900/20 rounded transition"
                                title="Inspect Controls"
                             >
                                <Sparkles className="w-5 h-5" />
                             </button>

                             {/* DELETE */}
                             <button 
                                onClick={() => handleDelete(std.id, std.storage_path)} 
                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition"
                                title="Delete"
                             >
                                <Trash2 className="w-5 h-5" />
                             </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

      {/* INSPECT MODAL */}
      {inspectStd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1e293b] w-full max-w-4xl rounded-xl border border-gray-700 shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="text-[#38bdf8]" /> {inspectStd.name}
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">Parsed Controls Preview</p>
                    </div>
                    <button onClick={() => setInspectStd(null)} className="text-gray-500 hover:text-white transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-0">
                    {loadingControls ? (
                        <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                            <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                            Loading controls...
                        </div>
                    ) : controls.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            No controls found. 
                            <br/><span className="text-xs">Check 'master_controls' table connection.</span>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-[#0f172a] text-gray-200 sticky top-0">
                                <tr>
                                    <th className="p-4 border-b border-gray-800 w-32">Control ID</th>
                                    <th className="p-4 border-b border-gray-800">Description</th>
                                    <th className="p-4 border-b border-gray-800 w-32">Domain</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {controls.map((ctrl) => (
                                    <tr key={ctrl.id} className="hover:bg-white/5 transition">
                                        <td className="p-4 font-mono text-[#38bdf8]">{ctrl.control_code || ctrl.control_id || "N/A"}</td>
                                        <td className="p-4 line-clamp-2">{ctrl.description || ctrl.control_text}</td>
                                        <td className="p-4">{ctrl.family || ctrl.domain || "General"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}