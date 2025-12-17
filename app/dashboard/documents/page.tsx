"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  Upload, FileText, Trash2, RefreshCw, CloudUpload, 
  Eye, X, DownloadCloud, Sparkles, Maximize2 
} from "lucide-react";

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(""); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals State
  const [previewChunksDoc, setPreviewChunksDoc] = useState<any | null>(null); // AI Chunks
  const [previewChunks, setPreviewChunks] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  
  const [viewFileDoc, setViewFileDoc] = useState<any | null>(null); // PDF Viewer

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

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!customName) setCustomName(file.name.replace('.pdf', ''));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !customName) return;
    setIsUploading(true);
    setUploadStatus("Uploading PDF...");

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${customName.replace(/\s/g, '_')}.${fileExt}`;
      const filePath = `policies/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("policy-documents")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("policy-documents")
        .getPublicUrl(filePath);

      setUploadStatus("AI Indexing...");
      
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", customName);
      formData.append("url", publicUrl); 
      formData.append("storage_path", filePath); 

      const response = await fetch("/api/documents/ingest", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");

      alert(`Success! Document Saved & Indexed.\n${result.chunks} AI chunks created.`);
      
      setSelectedFile(null);
      setCustomName("");
      setUploadStatus("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchDocuments();

    } catch (err: any) {
      console.error(err);
      alert("Error: " + err.message);
      setUploadStatus("Failed.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, storagePath?: string) => {
    if(!confirm("Delete this document and all its knowledge chunks?")) return;
    await supabase.from("documents").delete().eq("id", id);
    if (storagePath) {
        await supabase.storage.from("policy-documents").remove([storagePath]);
    }
    fetchDocuments();
  };

  const handlePreviewChunks = async (doc: any) => {
    setPreviewChunksDoc(doc);
    setLoadingPreview(true);
    const { data } = await supabase
        .from("document_chunks") 
        .select("content, chunk_index")
        .eq("document_id", doc.id)
        .order("chunk_index", { ascending: true })
        .limit(50);
    setPreviewChunks(data || []);
    setLoadingPreview(false);
  };

  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto min-h-screen">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Knowledge Base</h1>
          <p className="text-sm text-gray-400">Upload policies to train the AI & store records.</p>
        </div>
        <button onClick={fetchDocuments} className="p-2 hover:bg-gray-800 rounded-full transition text-gray-400 hover:text-white">
            <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Upload Form */}
        <div className="lg:col-span-1 bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CloudUpload className="text-[#38bdf8] w-5 h-5" /> Upload Policy
          </h2>
          
          <div className="space-y-4">
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
                        <FileText className="w-8 h-8 text-[#38bdf8] mx-auto mb-2"/>
                        <p className="text-white text-sm font-medium truncate max-w-[200px] mx-auto">{selectedFile.name}</p>
                    </div>
                ) : (
                    <div>
                        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2"/>
                        <p className="text-gray-400 text-sm">Click to select PDF</p>
                    </div>
                )}
            </div>

            {selectedFile && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Document Name</label>
                    <input 
                        type="text" 
                        className="w-full bg-[#0f172a] border border-gray-700 rounded p-2 text-sm text-white focus:border-[#38bdf8] outline-none transition"
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
              {isUploading ? <RefreshCw className="w-4 h-4 animate-spin"/> : <CloudUpload className="w-4 h-4"/>}
              {isUploading ? (uploadStatus || "Processing...") : "Upload & Index"}
            </button>
          </div>
        </div>

        {/* Document List */}
        <div className="lg:col-span-2 space-y-4">
           {loading ? (
             <div className="text-center py-12 text-gray-500">Loading library...</div>
           ) : documents.length === 0 ? (
             <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl bg-[#1e293b]/20">
               <FileText className="mx-auto h-12 w-12 text-gray-600 mb-3" />
               <p className="text-gray-500">No documents indexed yet.</p>
             </div>
           ) : (
             documents.map((doc) => (
               <div key={doc.id} className="flex items-center justify-between p-4 bg-[#1e293b]/50 border border-gray-800 rounded-lg hover:border-gray-600 transition group">
                 <div className="flex items-center gap-4">
                   <div className="p-3 bg-blue-900/20 text-blue-400 rounded-lg border border-blue-900/30">
                     <FileText className="w-6 h-6" />
                   </div>
                   <div>
                     <h3 className="font-bold text-gray-200">{doc.name}</h3>
                     <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                       <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                       <span>•</span>
                       <span>{doc.chunk_count} Chunks</span>
                       {doc.status && (
                        <>
                           <span>•</span>
                           <span className={`px-2 py-0.5 rounded ${doc.status === 'Ready' ? 'bg-green-900/30 text-green-400 border border-green-900/50' : 'bg-yellow-900/30 text-yellow-400'}`}>
                             {doc.status}
                           </span>
                        </>
                       )}
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex items-center gap-1">
                    {/* 1. PDF VIEWER (Quick Action) */}
                    {doc.url && (
                        <button 
                            onClick={() => setViewFileDoc(doc)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
                            title="Quick View PDF"
                        >
                            <Eye className="w-5 h-5" />
                        </button>
                    )}

                    {/* 2. DOWNLOAD (Backup) */}
                    {doc.url && (
                        <a 
                           href={doc.url} 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition"
                           title="Download"
                        >
                            <DownloadCloud className="w-5 h-5" />
                        </a>
                    )}
                    
                    {/* 3. AI CHUNKS (Inspector) */}
                    <button 
                        onClick={() => handlePreviewChunks(doc)}
                        className="p-2 text-gray-400 hover:text-[#38bdf8] hover:bg-blue-900/20 rounded transition"
                        title="Inspect AI Knowledge"
                    >
                        <Sparkles className="w-5 h-5" />
                    </button>

                    {/* 4. DELETE */}
                    <button 
                        onClick={() => handleDelete(doc.id, doc.storage_path)}
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

      {/* MODAL 1: PDF VIEWER (The New Window) */}
      {viewFileDoc && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex flex-col p-4 animate-in fade-in duration-200">
             {/* Header */}
             <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileText className="text-[#38bdf8]" /> {viewFileDoc.name}
                </h2>
                <div className="flex items-center gap-4">
                     {/* Open in New Tab Button */}
                    <a 
                        href={viewFileDoc.url} 
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
                    >
                        <Maximize2 className="w-4 h-4" /> New Tab
                    </a>
                    <button 
                        onClick={() => setViewFileDoc(null)} 
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
             </div>

             {/* The PDF Viewer (iFrame) */}
             <div className="flex-1 bg-[#1e293b] rounded-xl overflow-hidden border border-gray-700 shadow-2xl relative">
                <iframe 
                    src={viewFileDoc.url} 
                    className="w-full h-full"
                    title="PDF Viewer"
                />
             </div>
        </div>
      )}

      {/* MODAL 2: AI CHUNKS INSPECTOR */}
      {previewChunksDoc && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1e293b] w-full max-w-3xl rounded-xl border border-gray-700 shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-800">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="text-[#38bdf8]" /> AI Knowledge Base
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Viewing cached chunks for: <span className="text-white">{previewChunksDoc.name}</span>
                        </p>
                    </div>
                    <button onClick={() => setPreviewChunksDoc(null)} className="text-gray-500 hover:text-white transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0f172a]">
                    {loadingPreview ? (
                        <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                            <RefreshCw className="w-8 h-8 animate-spin mb-2" />
                            Loading...
                        </div>
                    ) : previewChunks.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No content indexed.</div>
                    ) : (
                        previewChunks.map((chunk, i) => (
                            <div key={i} className="p-4 rounded-lg bg-[#1e293b] border border-gray-800 text-sm leading-relaxed text-gray-300">
                                <span className="block text-xs font-bold text-[#38bdf8] mb-2 uppercase">Chunk #{chunk.chunk_index || i + 1}</span>
                                {chunk.content}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
}