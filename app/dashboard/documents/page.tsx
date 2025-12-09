"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  HiUpload, 
  HiDocumentText, 
  HiTrash, 
  HiRefresh,
  HiCloudUpload
} from "react-icons/hi";

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch Documents
  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
      
    if (error) console.error("Error fetching docs:", error);
    else setDocuments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  // 2. Handle File Selection
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto-fill name if empty
      if (!customName) setCustomName(file.name.replace('.pdf', ''));
    }
  };

  // 3. Handle Smart Ingestion Upload
  const handleUpload = async () => {
    if (!selectedFile || !customName) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", customName);

      const response = await fetch("/api/documents/ingest", {
        method: "POST",
        body: formData, // Browser handles headers for FormData automatically
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");

      alert(`Success! Ingested ${result.chunks} smart chunks.`);
      
      // Reset
      setSelectedFile(null);
      setCustomName("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocuments();

    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this document and all its knowledge chunks?")) return;
    await supabase.from("documents").delete().eq("id", id);
    fetchDocuments();
  };

  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Knowledge Base</h1>
          <p className="text-sm text-gray-400">Upload policies (PDF) to train the AI.</p>
        </div>
        <button onClick={fetchDocuments} className="p-2 hover:bg-gray-800 rounded-full transition">
            <HiRefresh />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: PDF Upload Form */}
        <div className="lg:col-span-1 bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <HiCloudUpload className="text-[#38bdf8]" /> Upload Policy (PDF)
          </h2>
          
          <div className="space-y-4">
            {/* File Drop Area */}
            <div 
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition
                    ${selectedFile ? 'border-[#38bdf8] bg-blue-900/10' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800/50'}
                `}
                onClick={() => fileInputRef.current?.click()}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="application/pdf,text/plain"
                    onChange={onFileChange}
                />
                
                {selectedFile ? (
                    <div>
                        <HiDocumentText className="w-8 h-8 text-[#38bdf8] mx-auto mb-2"/>
                        <p className="text-white text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                ) : (
                    <div>
                        <HiUpload className="w-8 h-8 text-gray-500 mx-auto mb-2"/>
                        <p className="text-gray-400 text-sm">Click to select PDF</p>
                    </div>
                )}
            </div>

            {selectedFile && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Document Name</label>
                    <input 
                        type="text" 
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-[#38bdf8] outline-none"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                    />
                </div>
            )}

            <button 
              onClick={handleUpload}
              disabled={isUploading || !selectedFile}
              className="w-full py-2.5 bg-[#38bdf8] text-[#0f172a] font-bold rounded hover:bg-sky-400 transition disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isUploading ? "Reading & Chunking..." : "Ingest Document"}
            </button>
          </div>
        </div>

        {/* RIGHT: Document List */}
        <div className="lg:col-span-2 space-y-4">
           {/* ... (Existing List Logic) ... */}
           {loading ? (
             <div className="text-center py-10 text-gray-500">Loading library...</div>
           ) : documents.length === 0 ? (
             <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
               <HiDocumentText className="mx-auto h-10 w-10 text-gray-600 mb-2" />
               <p className="text-gray-500">No documents indexed yet.</p>
             </div>
           ) : (
             documents.map((doc) => (
               <div key={doc.id} className="flex items-center justify-between p-4 bg-[#1e293b]/30 border border-gray-800 rounded-lg hover:border-gray-700 transition group">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-900/20 text-blue-400 rounded-lg">
                     <HiDocumentText className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-200">{doc.name}</h3>
                     <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                       <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                       <span>•</span>
                       <span>{doc.chunk_count} Chunks</span>
                       <span>•</span>
                       <span className={`px-2 py-0.5 rounded ${doc.status === 'Ready' ? 'bg-green-900/30 text-green-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
                         {doc.status}
                       </span>
                     </div>
                   </div>
                 </div>
                 <button 
                   onClick={() => handleDelete(doc.id)}
                   className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-900/20 rounded transition opacity-0 group-hover:opacity-100"
                 >
                   <HiTrash />
                 </button>
               </div>
             ))
           )}
        </div>
      </div>
    </div>
  );
}