"use client";

import { useState } from "react";
import { 
  provisionUser, 
  updateUser, 
  deleteUser, 
  toggleUserStatus 
} from "@/app/actions/iam"; 
import { 
  Users, 
  Plus, 
  Mail,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Pencil,
  Trash2,
  Lock,
  Unlock
} from "lucide-react";
import { useRouter } from "next/navigation";

// Define the Props we expect from the Server
interface UserClientProps {
  initialUsers: any[];
  roles: any[];
  groups: any[];
  departments: any[];
}

export default function UserClient({ initialUsers, roles, groups, departments }: UserClientProps) {
  const router = useRouter();
  
  // Use the data passed from the server
  // We don't need 'loading' state for data anymore because it arrives pre-loaded!
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [actionStatus, setActionStatus] = useState<{success: boolean, msg: string} | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Close menus when clicking outside
  const handleMenuClick = (id: string | null) => setActiveMenuId(id);

  // --- HANDLERS ---
  const handleOpenCreate = () => { setEditingUser(null); setActionStatus(null); setShowModal(true); };
  const handleOpenEdit = (user: any) => { setEditingUser(user); setActionStatus(null); setShowModal(true); };
  
  const handleSubmit = async (formData: FormData) => {
    setActionStatus(null);
    let result;
    if (editingUser) result = await updateUser(editingUser.id, formData);
    else result = await provisionUser(formData);
    
    if (result.success) {
        setActionStatus({ success: true, msg: result.message! });
        router.refresh(); // <--- MAGIC: Reloads the Server Data without full page reload
        setTimeout(() => setShowModal(false), 1500);
    } else {
        setActionStatus({ success: false, msg: result.error || "Operation failed." });
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm("Are you sure?")) return;
    const result = await deleteUser(userId);
    if (result.success) router.refresh();
  };

  const handleToggleLock = async (user: any) => {
    const result = await toggleUserStatus(user.id, !user.locked_until); 
    if (result.success) router.refresh();
  };

  return (
    <div className="p-8 text-gray-300 min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-purple-500" /> User Management
          </h1>
          <p className="text-gray-400">Manage access, roles, and security policies.</p>
        </div>
        <button onClick={handleOpenCreate} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition shadow-lg">
          <Plus className="w-4 h-4" /> Provision User
        </button>
      </div>

      {/* USER TABLE */}
      <div className="bg-[#1e293b] border border-gray-800 rounded-xl overflow-hidden shadow-xl min-h-[400px]">
         <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-gray-800/50 text-gray-200 uppercase font-bold text-xs">
                <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Org</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
                {initialUsers.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center">No users found.</td></tr>
                )}
                {initialUsers.map((u) => {
                    const isLocked = u.locked_until && new Date(u.locked_until) > new Date();
                    return (
                    <tr key={u.id} className="hover:bg-white/5 transition group">
                        <td className="p-4">
                            <div className="font-bold text-white flex items-center gap-2">
                                {u.full_name}
                                {isLocked && <Lock className="w-3 h-3 text-red-500" />}
                            </div>
                            <div className="text-xs">{u.email}</div>
                        </td>
                        <td className="p-4">
                            {u.user_roles?.[0]?.roles?.name || <span className="text-gray-600">No Role</span>}
                        </td>
                        <td className="p-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-xs text-white">{u.departments?.name || "-"}</span>
                                <span className="text-[10px] uppercase">{u.groups?.name}</span>
                            </div>
                        </td>
                        <td className="p-4">
                           <span className={`px-2 py-1 rounded text-xs font-bold ${isLocked ? "bg-red-500/20 text-red-400" : u.is_active ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"}`}>
                                {isLocked ? "Locked" : u.is_active ? "Active" : "Invited"}
                           </span>
                        </td>
                        <td className="p-4 text-right relative">
                            <button onClick={() => handleMenuClick(activeMenuId === u.id ? null : u.id)} className="p-2 hover:text-white transition">
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            {activeMenuId === u.id && (
                                <>
                                <div className="fixed inset-0 z-40" onClick={() => handleMenuClick(null)}></div>
                                <div className="absolute right-8 top-8 w-48 bg-[#0f172a] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden text-left">
                                    <button onClick={() => handleOpenEdit(u)} className="w-full px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-2"><Pencil className="w-4 h-4" /> Edit Details</button>
                                    <button onClick={() => handleToggleLock(u)} className="w-full px-4 py-3 text-sm hover:bg-white/5 flex items-center gap-2 text-yellow-500">{isLocked ? "Unlock" : "Lock"} Account</button>
                                    <button onClick={() => handleDelete(u.id)} className="w-full px-4 py-3 text-sm hover:bg-red-900/20 flex items-center gap-2 text-red-400"><Trash2 className="w-4 h-4" /> Delete User</button>
                                </div>
                                </>
                            )}
                        </td>
                    </tr>
                )})}
            </tbody>
         </table>
      </div>

      {/* MODAL (Same as before) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1e293b] border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{editingUser ? "Edit User Details" : "Invite New Team Member"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6">
                {actionStatus && (
                    <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 text-sm ${actionStatus.success ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300"}`}>
                        {actionStatus.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        <p>{actionStatus.msg}</p>
                    </div>
                )}
                {!actionStatus?.success && (
                    <form action={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                            <input name="fullName" defaultValue={editingUser?.full_name || ""} required className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none" />
                        </div>
                        {!editingUser && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input name="email" type="email" required className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none" />
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                                <select name="roleId" defaultValue={editingUser?.user_roles?.[0]?.role_id || ""} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none">
                                    <option value="">Select Role...</option>
                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Group</label>
                                <select name="groupId" defaultValue={editingUser?.groups?.id || ""} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none">
                                    <option value="">Select Group...</option>
                                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                            <select name="departmentId" defaultValue={editingUser?.departments?.id || ""} className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none">
                                <option value="">Select Department...</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                        <div className="pt-4 flex gap-3">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 bg-transparent hover:bg-white/5 border border-gray-600 text-white font-bold rounded-lg transition">Cancel</button>
                            <button type="submit" className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition">{editingUser ? "Save" : "Send Invite"}</button>
                        </div>
                    </form>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}