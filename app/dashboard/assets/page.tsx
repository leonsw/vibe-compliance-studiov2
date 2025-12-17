"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Plus, Server, Shield, Users, Globe, 
  Trash2, Edit2, X, AlertTriangle, Cloud, Building, Lock, Search 
} from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type System = {
  id?: string;
  name: string;
  description: string;
  type: string;
  exposure: string;
  user_count: number;
  criticality: string;
  data_sensitivity: boolean;
  applicable_standards: string[];
};

const STANDARD_OPTIONS = ["CMMC 2.0", "ISO 27001", "PCI DSS", "SOC 2", "HIPAA", "FFIEC"];

const INITIAL_FORM_STATE: System = {
  name: "",
  description: "",
  type: "Internal",
  exposure: "Internal",
  user_count: 0,
  criticality: "Medium",
  data_sensitivity: false,
  applicable_standards: [],
};

export default function AssetsPage() {
  const [systems, setSystems] = useState<System[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<System>(INITIAL_FORM_STATE);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchSystems();
  }, []);

  async function fetchSystems() {
    setLoading(true);
    const { data, error } = await supabase.from("systems").select("*").order("name");
    if (error) console.error(error);
    else setSystems(data || []);
    setLoading(false);
  }

  const handleInputChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleStandard = (std: string) => {
    setFormData((prev) => {
      const current = prev.applicable_standards || [];
      if (current.includes(std)) {
        return { ...prev, applicable_standards: current.filter((s) => s !== std) };
      } else {
        return { ...prev, applicable_standards: [...current, std] };
      }
    });
  };

  const openAddModal = () => {
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(true);
  };

  const openEditModal = (sys: System) => {
    setFormData(sys);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("systems").upsert(formData);
    if (error) {
      alert("Error saving asset: " + error.message);
    } else {
      setIsModalOpen(false);
      fetchSystems();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will delete the asset and all its assessments.")) return;
    await supabase.from("systems").delete().eq("id", id);
    fetchSystems();
  };

  // Helper for Card Styling based on Risk
  const getCardStyle = (criticality: string) => {
    switch (criticality) {
      case "Critical":
        return "border-l-4 border-l-red-500 bg-red-900/10";
      case "High":
        return "border-l-4 border-l-orange-500 bg-orange-900/10";
      default:
        return "border-l-4 border-l-gray-700 bg-[#1e293b]/50";
    }
  };

  // Filter Logic
  const filteredSystems = systems.filter(sys => 
    sys.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    sys.exposure.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto text-gray-300">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Asset Inventory</h1>
          <p className="text-gray-400 mt-1">Manage in-scope systems and regulatory requirements.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Search assets..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-[#1e293b] border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-[#38bdf8] transition"
                />
            </div>

            {/* Add Button */}
            <button 
            onClick={openAddModal}
            className="bg-[#38bdf8] text-[#0f172a] px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-sky-400 font-bold transition shadow-lg shadow-sky-900/20"
            >
            <Plus className="w-4 h-4" /> Add Asset
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading your assets...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSystems.length === 0 && (
            <div className="col-span-full text-center py-16 bg-[#1e293b]/30 rounded-xl border border-dashed border-gray-800">
              <Server className="w-12 h-12 mx-auto text-gray-700 mb-3" />
              <p className="text-gray-500">No assets found matching your criteria.</p>
            </div>
          )}
          
          {filteredSystems.map((sys) => (
            <div 
              key={sys.id} 
              className={`border border-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition relative group ${getCardStyle(sys.criticality)}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${sys.criticality === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {sys.criticality === 'Critical' ? <AlertTriangle className="w-6 h-6" /> : <Server className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white leading-tight">{sys.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide mt-1 inline-block ${
                      sys.criticality === 'Critical' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 
                      sys.criticality === 'High' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 
                      'bg-green-500/20 text-green-400 border border-green-500/30'
                    }`}>
                      {sys.criticality} Risk
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditModal(sys)} className="p-2 text-gray-400 hover:text-[#38bdf8] hover:bg-gray-800 rounded-lg transition">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => sys.id && handleDelete(sys.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
                {sys.description || "No description provided."}
              </p>

              <div className="space-y-3 text-sm text-gray-400 bg-[#0f172a]/50 p-3 rounded-lg border border-gray-800/50">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-gray-500"><Globe className="w-3 h-3" /> Exposure</span>
                  <span className="font-medium text-gray-200 flex items-center gap-1">
                    {sys.exposure === 'Public' ? <Globe className="w-3 h-3 text-blue-400"/> : 
                     sys.exposure === 'External' ? <Cloud className="w-3 h-3 text-sky-400"/> : 
                     <Building className="w-3 h-3 text-gray-500"/>}
                    {sys.exposure}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-gray-500"><Users className="w-3 h-3" /> Users</span>
                  <span className="font-medium text-gray-200">{sys.user_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold text-gray-500"><Shield className="w-3 h-3" /> PII Data</span>
                  <span className={`font-medium ${sys.data_sensitivity ? 'text-purple-400 flex items-center gap-1' : 'text-gray-500'}`}>
                    {sys.data_sensitivity ? <><Lock className="w-3 h-3"/> Yes</> : "No"}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-800">
                <div className="flex flex-wrap gap-2">
                  {sys.applicable_standards && sys.applicable_standards.length > 0 ? (
                    sys.applicable_standards.map((std) => (
                      <span key={std} className="text-[10px] font-bold bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-700">
                        {std}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-600 italic">No standards assigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal (Dark Mode) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] border border-gray-700 rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
              <h2 className="text-xl font-bold text-white">
                {formData.id ? "Edit Asset" : "Add New Asset"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-400">Asset Name</label>
                  <input 
                    required 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className="w-full p-2.5 bg-[#0f172a] border border-gray-700 rounded-lg text-white focus:border-[#38bdf8] focus:outline-none transition" 
                    placeholder="e.g. HR Payroll Portal" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-400">Type</label>
                  <select name="type" value={formData.type || "Internal"} onChange={handleInputChange} className="w-full p-2.5 bg-[#0f172a] border border-gray-700 rounded-lg text-white">
                    <option>Internal</option>
                    <option>Third Party</option>
                    <option>Hybrid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-400">Description</label>
                <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleInputChange} 
                    className="w-full p-2.5 bg-[#0f172a] border border-gray-700 rounded-lg text-white focus:border-[#38bdf8] focus:outline-none transition" 
                    rows={3} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-400">Criticality</label>
                  <select name="criticality" value={formData.criticality || "Medium"} onChange={handleInputChange} className="w-full p-2.5 bg-[#0f172a] border border-gray-700 rounded-lg text-white">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-400">Exposure</label>
                  <select name="exposure" value={formData.exposure || "Internal"} onChange={handleInputChange} className="w-full p-2.5 bg-[#0f172a] border border-gray-700 rounded-lg text-white">
                    <option>Internal</option>
                    <option>External</option>
                    <option>Public</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-400">User Count</label>
                  <input type="number" name="user_count" value={formData.user_count} onChange={handleInputChange} className="w-full p-2.5 bg-[#0f172a] border border-gray-700 rounded-lg text-white focus:border-[#38bdf8] focus:outline-none" />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                <input type="checkbox" name="data_sensitivity" checked={formData.data_sensitivity} onChange={handleInputChange} className="w-5 h-5 text-[#38bdf8] rounded focus:ring-0 bg-[#0f172a] border-gray-600" />
                <label className="text-sm font-medium text-gray-300">Does this system process sensitive data (PII/PHI)?</label>
              </div>

              <div>
                <label className="block text-sm font-medium mb-3 text-gray-400">Applicable Standards</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STANDARD_OPTIONS.map((std) => (
                    <button
                      key={std}
                      type="button"
                      onClick={() => toggleStandard(std)}
                      className={`text-sm px-3 py-2.5 rounded-lg border font-medium transition-all ${
                        formData.applicable_standards?.includes(std)
                          ? "bg-[#38bdf8] text-[#0f172a] border-[#38bdf8]"
                          : "bg-[#0f172a] text-gray-400 border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      {std}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg font-medium transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-[#38bdf8] text-[#0f172a] rounded-lg hover:bg-sky-400 font-bold shadow-lg shadow-sky-900/20 transition">
                  {formData.id ? "Update Asset" : "Create Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}