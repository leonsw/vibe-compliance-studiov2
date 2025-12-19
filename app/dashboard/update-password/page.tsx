"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Update Auth Password
      const { error: authError } = await supabase.auth.updateUser({ 
        password: password 
      });
      if (authError) throw authError;

      // 2. Update Profile Flag (Release the user)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          force_password_change: false,
          last_password_change: new Date().toISOString()
        }).eq("id", user.id);
      }

      // 3. Redirect to Dashboard
      router.push("/dashboard");
      router.refresh(); // Clear cache to lift the layout block
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-[#1e293b] border border-gray-700 p-8 rounded-2xl max-w-md w-full shadow-2xl">
        <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Security Update Required</h1>
            <p className="text-gray-400 mt-2 text-sm">
                For your security, you must update your password before continuing to Vibe Compliance Studio.
            </p>
        </div>

        {error && (
            <div className="bg-red-900/20 border border-red-500/50 p-3 rounded-lg flex items-center gap-3 text-red-300 text-sm mb-6">
                <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </div>
        )}

        <form onSubmit={handleUpdate} className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                <input 
                    type="password" 
                    required
                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
                <input 
                    type="password" 
                    required
                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 mt-4"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Set Password & Enter
            </button>
        </form>
      </div>
    </div>
  );
}