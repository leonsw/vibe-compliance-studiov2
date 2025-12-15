"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Plus, Server, Shield, Users, Globe, 
  Trash2, Edit2, X 
} from "lucide-react";

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type System = {
  id?: string; // Optional because new assets won't have one yet
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

  // Form State
  const [formData, setFormData] = useState<System>(INITIAL_FORM_STATE);

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
    setFormData(INITIAL_FORM_STATE); // Clear form for new entry
    setIsModalOpen(true);
  };

  const openEditModal = (sys: System) => {
    setFormData(sys); // Load existing data (including ID)
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Upsert: If 'id' exists, it updates. If 'id' is missing, it creates.
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
    
    const { error } = await supabase.from("systems").delete().eq("id", id);
    if (error) {
      alert("Error deleting: " + error.message);
    } else {
      fetchSystems();
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Asset Inventory</h1>
          <p className="text-gray-500 mt-1">Manage your in-scope systems and their regulatory requirements.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-black text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 transition shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading your assets...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {systems.length === 0 && (
            <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">No assets found. Add your first system to get started.</p>
            </div>
          )}
          
          {systems.map((sys) => (
            <div key={sys.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${sys.criticality === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                    <Server className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 leading-tight">{sys.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide mt-1 inline-block ${
                      sys.criticality === 'Critical' ? 'bg-red-100 text-red-700' : 
                      sys.criticality === 'High' ? 'bg-orange-100 text-orange-700' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {sys.criticality}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(sys)} 
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Edit Asset"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => sys.id && handleDelete(sys.id)} 
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Delete Asset"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                {sys.description || "No description provided."}
              </p>

              <div className="space-y-3 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold"><Globe className="w-3 h-3" /> Exposure</span>
                  <span className="font-medium text-gray-900">{sys.exposure}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold"><Users className="w-3 h-3" /> Users</span>
                  <span className="font-medium text-gray-900">{sys.user_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs uppercase tracking-wide font-semibold"><Shield className="w-3 h-3" /> PII Data</span>
                  <span className={`font-medium ${sys.data_sensitivity ? 'text-red-600' : 'text-gray-900'}`}>
                    {sys.data_sensitivity ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  {sys.applicable_standards && sys.applicable_standards.length > 0 ? (
                    sys.applicable_standards.map((std) => (
                      <span key={std} className="text-[10px] font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                        {std}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400 italic">No standards assigned</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {formData.id ? "Edit Asset" : "Add New Asset"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Name & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Asset Name</label>
                  <input required name="name" value={formData.name} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition" placeholder="e.g. HR Payroll Portal" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white">
                    <option>Internal</option>
                    <option>Third Party</option>
                    <option>Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1.5 text-gray-700">Description</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none transition" rows={3} placeholder="Describe the system's function and scope..." />
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Criticality</label>
                  <select name="criticality" value={formData.criticality || "Medium"} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Exposure</label>
                  <select name="exposure" value={formData.exposure} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg bg-white">
                    <option>Internal</option>
                    <option>External</option>
                    <option>Public</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">User Count</label>
                  <input type="number" name="user_count" value={formData.user_count} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg" />
                </div>
              </div>

              {/* PII Toggle */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input type="checkbox" name="data_sensitivity" checked={formData.data_sensitivity} onChange={handleInputChange} className="w-5 h-5 text-black rounded focus:ring-black" />
                <label className="text-sm font-medium text-gray-700">Does this system process sensitive data (PII/PHI)?</label>
              </div>

              {/* Standards Selection */}
              <div>
                <label className="block text-sm font-medium mb-3 text-gray-700">Applicable Standards</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STANDARD_OPTIONS.map((std) => (
                    <button
                      key={std}
                      type="button"
                      onClick={() => toggleStandard(std)}
                      className={`text-sm px-3 py-2.5 rounded-lg border font-medium transition-all ${
                        formData.applicable_standards?.includes(std)
                          ? "bg-black text-white border-black shadow-md"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                      }`}
                    >
                      {std}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 font-medium shadow-lg transition">
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