"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { provisionUser, deleteUser, updateUser } from "@/app/actions/iam"; 
import { 
  Users, 
  UserPlus, 
  Shield, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Lock,
  Unlock,
  Edit,
  Building
} from "lucide-react";

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    email: "",
    fullName: "",
    roleId: "",
    groupId: "",
    departmentId: "",
    tempPassword: "ChangeMe123!" 
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch Data on Load
  useEffect(() => {
    fetchDirectory();
  }, []);

  const fetchDirectory = async () => {
    setLoading(true);
    
    // A. Fetch from View
    const { data: userData, error } = await supabase
      .from("admin_users_view")
      .select("*")
      .order('full_name');
    
    if (error) console.error("Error fetching users:", error);

    // B. Fetch Dropdowns
    const { data: roleData } = await supabase.from("roles").select("*");
    const { data: groupData } = await supabase.from("groups").select("*");
    const { data: deptData } = await supabase.from("departments").select("*");

    setUsers(userData || []);
    setRoles(roleData || []);
    setGroups(groupData || []);
    setDepartments(deptData || []);
    setLoading(false);
  };

  // 2. Open Modal (Create Mode)
  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
        email: "",
        fullName: "",
        roleId: "",
        groupId: "",
        departmentId: "",
        tempPassword: "ChangeMe123!"
    });
    setIsModalOpen(true);
  };

  // 3. Open Modal (Edit Mode)
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setFormData({
        email: user.email, // Read Only in Edit
        fullName: user.full_name,
        roleId: user.role_id || "",
        groupId: user.group_id || "",
        departmentId: user.department_id || "",
        tempPassword: "" // Not needed for edit
    });
    setIsModalOpen(true);
  };

  // 4. Handle Save (Create OR Update)
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const payload = new FormData();
    payload.append("fullName", formData.fullName);
    payload.append("roleId", formData.roleId);
    payload.append("groupId", formData.groupId);
    payload.append("departmentId", formData.departmentId);

    let result;

    if (editingUser) {
        // UPDATE
        payload.append("userId", editingUser.id);
        result = await updateUser(payload);
    } else {
        // CREATE
        payload.append("email", formData.email);
        payload.append("tempPassword", formData.tempPassword);
        result = await provisionUser(payload);
    }

    if (result.success) {
      setIsModalOpen(false);
      fetchDirectory(); 
    } else {
      alert("Error: " + result.error);
    }
    setIsSubmitting(false);
  };

  // 5. Handle Toggle Lockout
  const toggleLockout = async (user: any) => {
      const isLocked = user.locked_until && new Date(user.locked_until) > new Date();
      const action = isLocked ? "unlock" : "lock_forever";
      
      if(!confirm(`Are you sure you want to ${isLocked ? "Un-Lock" : "LOCK"} ${user.email}?`)) return;

      const payload = new FormData();
      payload.append("userId", user.id);
      payload.append("fullName", user.full_name); // Required by update function
      payload.append("lockedUntil", action);
      
      await updateUser(payload);
      fetchDirectory();
  };

  // 6. Handle Deletion
  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure you want to deprovision this user?")) return;
    const result = await deleteUser(userId);
    if (result.success) fetchDirectory();
    else alert("Failed to delete: " + result.error);
  };

  return (
    <div className="p-8 text-gray-300 min-h-screen">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-500" /> User Management
          </h1>
          <p className="text-gray-400">Provision accounts, assign roles, and manage access policies.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition shadow-lg shadow-purple-900/20"
        >
          <UserPlus className="w-4 h-4" /> Provision User
        </button>
      </div>

      {/* Directory Table */}
      <div className="bg-[#1e293b] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-gray-800 flex gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-purple-500 outline-none"
                />
            </div>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0f172a] text-xs font-bold text-gray-500 uppercase">
              <th className="p-4">User</th>
              <th className="p-4">Role</th>
              <th className="p-4">Department / Group</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm">
            {loading ? (
               <tr><td colSpan={5} className="p-8 text-center">Loading directory...</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="hover:bg-white/5 transition group">
                <td className="p-4">
                    <div className="font-bold text-white">{user.full_name}</div>
                    <div className="text-gray-500 text-xs">{user.email}</div>
                </td>
                <td className="p-4">
                    {user.role_name ? (
                         <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-900/30 text-purple-300 rounded border border-purple-500/20 text-xs font-bold">
                            <Shield className="w-3 h-3" /> {user.role_name}
                         </span>
                    ) : (
                        <span className="text-gray-600 italic">No Role</span>
                    )}
                </td>
                <td className="p-4">
                    <div className="text-white flex items-center gap-2">
                        {user.department_name ? (
                            <><Building className="w-3 h-3 text-gray-500"/> {user.department_name}</>
                        ) : "—"}
                    </div>
                    <div className="text-gray-500 text-xs mt-1">{user.group_name}</div>
                </td>
                <td className="p-4">
                    {user.locked_until && new Date(user.locked_until) > new Date() ? (
                        <span className="flex items-center gap-1 text-red-400 text-xs font-bold bg-red-900/20 px-2 py-1 rounded w-fit">
                            <Lock className="w-3 h-3" /> LOCKED
                        </span>
                    ) : user.force_password_change ? (
                        <span className="flex items-center gap-1 text-orange-400 text-xs">
                            <AlertCircle className="w-3 h-3" /> Reset Pending
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-green-500 text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                    )}
                </td>
                <td className="p-4 text-right flex justify-end gap-2">
                    {/* LOCK BUTTON */}
                    <button 
                        onClick={() => toggleLockout(user)}
                        className="p-2 text-gray-500 hover:text-white hover:bg-gray-700 rounded transition"
                        title={user.locked_until ? "Unlock User" : "Lock User"}
                    >
                        {user.locked_until && new Date(user.locked_until) > new Date() 
                            ? <Unlock className="w-4 h-4 text-green-400"/> 
                            : <Lock className="w-4 h-4"/>
                        }
                    </button>

                    {/* EDIT BUTTON */}
                    <button 
                        onClick={() => handleOpenEdit(user)}
                        className="p-2 text-gray-500 hover:text-purple-400 hover:bg-purple-900/20 rounded transition"
                        title="Edit User"
                    >
                        <Edit className="w-4 h-4" />
                    </button>

                    {/* DELETE BUTTON */}
                    <button 
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition"
                        title="Deprovision"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (Create & Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[#1e293b] border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">
                        {editingUser ? "Edit User Details" : "Provision New User"}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">✕</button>
                </div>

                <form onSubmit={handleSaveUser} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Name</label>
                        <input 
                            required
                            type="text" 
                            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Email Address</label>
                        <input 
                            required
                            type="email" 
                            disabled={!!editingUser} // Disabled in edit mode
                            className={`w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none ${editingUser ? 'opacity-50 cursor-not-allowed' : ''}`}
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Role</label>
                            <select 
                                required
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                value={formData.roleId}
                                onChange={(e) => setFormData({...formData, roleId: e.target.value})}
                            >
                                <option value="">Select Role...</option>
                                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Group</label>
                            <select 
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                                value={formData.groupId}
                                onChange={(e) => setFormData({...formData, groupId: e.target.value})}
                            >
                                <option value="">None</option>
                                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Department</label>
                        <select 
                            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                            value={formData.departmentId}
                            onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                        >
                            <option value="">No Department</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    {/* ONLY SHOW PASSWORD WHEN CREATING */}
                    {!editingUser && (
                        <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg flex gap-3">
                            <Lock className="w-5 h-5 text-yellow-500 shrink-0" />
                            <div className="text-xs text-yellow-200/80">
                                <strong>Temporary Password:</strong> {formData.tempPassword}
                                <br/>
                                User will be forced to change this on first login.
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 py-3 bg-transparent border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 font-bold"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : (editingUser ? <Edit className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />)}
                            {editingUser ? "Save Changes" : "Create User"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

    </div>
  );
}