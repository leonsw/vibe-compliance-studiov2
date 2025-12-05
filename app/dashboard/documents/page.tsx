"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  HiUpload, 
  HiDocumentText, 
  HiTrash, 
  HiSearch,
  HiCheckCircle,
  HiRefresh
} from "react-icons/hi";

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  
  // New Document Form State
  const [newDocName, setNewDocName] = useState("");
  const [newDocContent, setNewDocContent] = useState(""); // Simple text paste for MVP

  // 1. Fetch Documents (Use Case 6.2)
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

  useEffect(() => {
    fetchDocuments();
  }, []);

  // 2. Handle Upload (Simulated for now, will connect to RAG API next)
  const handleUpload = async () => {
    if (!newDocName || !newDocContent) return;
    setIsUploading(true);

    try {
      // A. Create the Metadata Record (You already have this)
      const { data: doc, error } = await supabase
        .from("documents")
        .insert({
          name: newDocName,
          status: "Processing",
          chunk_count: 0
        })
        .select()
        .single();

      if (error) throw error;

      // B. Call the Ingest API (THE NEW PART)
      const response = await fetch("/api/documents/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: doc.id,
          content: newDocContent,
        }),
      });

      if (!response.ok) throw new Error("Ingestion failed");

      // C. Reset Form
      setNewDocName("");
      setNewDocContent("");
      fetchDocuments(); // Refresh list to see "Ready" status

    } catch (err) {
      console.error("Upload failed:", err);
      // Optional: Update DB status to 'Failed' if API crashes
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("documents").delete().eq("id", id);
    fetchDocuments();
  };

  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Document Library</h1>
          <p className="text-sm text-gray-400">Manage policy documents for the AI Knowledge Base.</p>
        </div>
        <button onClick={fetchDocuments} className="p-2 hover:bg-gray-800 rounded-full transition">
            <HiRefresh />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT: Upload Form (Use Case 6.1) */}
        <div className="lg:col-span-1 bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 h-fit">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <HiUpload className="text-[#38bdf8]" /> Upload Policy
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Document Name</label>
              <input 
                type="text" 
                placeholder="e.g. Access Control Policy 2025"
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-[#38bdf8] outline-none"
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Content (Paste Text)</label>
              <textarea 
                rows={8}
                placeholder="Paste the policy text here..."
                className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-white focus:border-[#38bdf8] outline-none resize-none font-mono"
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                * For MVP, please paste text. PDF parsing integration coming in Phase 4.1.
              </p>
            </div>

            <button 
              onClick={handleUpload}
              disabled={isUploading || !newDocName}
              className="w-full py-2.5 bg-[#38bdf8] text-[#0f172a] font-bold rounded hover:bg-sky-400 transition disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {isUploading ? "Processing..." : "Ingest Document"}
            </button>
          </div>
        </div>

        {/* RIGHT: Document List (Use Case 6.2) */}
        <div className="lg:col-span-2 space-y-4">
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
                   title="Delete Document"
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