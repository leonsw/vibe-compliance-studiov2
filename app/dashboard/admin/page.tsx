"use client";

import { useState, useEffect } from "react";
import { 
  HiOutlineCog, 
  HiTrash, 
  HiRefresh, 
  HiMail, 
  HiPlus,
  HiUser,
  HiX 
} from "react-icons/hi";

export default function AdminPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 1. Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Update Role (The Dropdown Logic)
  const handleRoleChange = async (userId: string, newRole: string) => {
    // Optimistic Update
    setUsers(prev => prev.map(u => 
        u.id === userId 
          ? { ...u, app_metadata: { ...u.app_metadata, role: newRole } }
          : u
    ));

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (!res.ok) throw new Error("Update failed");
      alert(`Role updated to: ${newRole}`);
      
    } catch (err: any) {
      alert("Error updating role: " + err.message);
      fetchUsers(); // Revert on error
    }
  };

  // 3. Invite User
  const handleInvite = async () => {
    if (!inviteEmail) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail })
      });
      
      if (!res.ok) throw new Error("Invite failed");
      
      alert(`Invitation sent to ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail("");
      fetchUsers(); 
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Delete User
  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete ${email}? This cannot be undone.`)) return;
    
    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!res.ok) throw new Error("Delete failed");
      
      fetchUsers(); 
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <HiOutlineCog className="text-[#38bdf8]" /> Admin Portal
          </h1>
          <p className="text-sm text-gray-400">Manage users, roles, and system permissions.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={fetchUsers} 
                className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition"
                title="Refresh List"
            >
                <HiRefresh />
            </button>
            <button 
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#38bdf8] text-[#0f172a] font-bold rounded-lg hover:bg-sky-400 transition"
            >
                <HiPlus /> Invite User
            </button>
        </div>
      </div>

      {/* Tabs (Updated with Audit Log) */}
      <div className="flex gap-6 border-b border-gray-800 mb-6 text-sm font-medium">
        <button className="pb-3 border-b-2 border-[#38bdf8] text-white">Users</button>
        <button className="pb-3 text-gray-500 hover:text-gray-300 cursor-not-allowed">Roles & Permissions (Pro)</button>
        <button className="pb-3 text-gray-500 hover:text-gray-300 cursor-not-allowed">Audit Log (Ent)</button>
      </div>

      {/* User Table */}
      <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900/50 text-gray-400 uppercase font-medium">
            <tr>
              <th className="px-6 py-4">User</th>
              <th className="px-6 py-4">Role</th>
              <th className="px-6 py-4">Last Sign In</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading ? (
                <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">Loading users...</td>
                </tr>
            ) : users.length === 0 ? (
                <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">No users found.</td>
                </tr>
            ) : (
                users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/30 transition">
                        {/* 1. User Info */}
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                                    {user.email ? user.email[0].toUpperCase() : '?'}
                                </div>
                                <div>
                                    <div className="font-medium text-white">{user.email}</div>
                                    <div className="text-xs text-gray-500">
                                        {/* DEBUG: Show the raw role to see if data exists */}
                                        Role: {user.app_metadata?.role || 'None detected'}
                                    </div>
                                </div>
                            </div>
                        </td>

                        {/* 2. ROLE DROPDOWN (High Visibility Config) */}
                        <td className="px-6 py-4">
                            <div className="relative">
                                <select 
                                    value={user.app_metadata?.role || 'User'}
                                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                    className="appearance-none bg-[#0f172a] border border-[#38bdf8] text-white text-sm rounded-md py-2 pl-3 pr-8 focus:outline-none focus:ring-2 focus:ring-[#38bdf8] cursor-pointer shadow-lg"
                                >
                                    <option value="User">User</option>
                                    <option value="Auditor">Auditor</option>
                                    <option value="Admin">Admin</option>
                                </select>
                                {/* Chevron Icon to make it obvious it's a dropdown */}
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[#38bdf8]">
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </td>

                        {/* 3. Last Sign In */}
                        <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                            {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                        </td>

                        {/* 4. Actions */}
                        <td className="px-6 py-4 text-right">
                            <button 
                                onClick={() => handleDelete(user.id, user.email)}
                                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition"
                                title="Delete User"
                            >
                                <HiTrash />
                            </button>
                        </td>
                    </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-gray-700 rounded-xl w-full max-w-md p-6 relative">
                <button 
                    onClick={() => setIsInviteModalOpen(false)}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white"
                >
                    <HiX />
                </button>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <HiMail className="text-[#38bdf8]"/> Invite Team Member
                </h2>
                <input 
                    type="email" 
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white mb-4 focus:border-[#38bdf8] outline-none"
                />
                <button 
                    onClick={handleInvite}
                    disabled={actionLoading || !inviteEmail}
                    className="w-full py-3 bg-[#38bdf8] text-[#0f172a] font-bold rounded hover:bg-sky-400 transition disabled:opacity-50"
                >
                    {actionLoading ? "Sending..." : "Send Invitation"}
                </button>
            </div>
        </div>
      )}
    </div>
  );
}