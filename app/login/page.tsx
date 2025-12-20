"use client";

import { useState } from "react";
import { login } from "@/app/actions/auth"; // Import the action we just made
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await login(formData);

    // If login function returns anything, it's an error 
    // (Success redirects automatically)
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4">
      
      {/* Brand Logo */}
      <div className="mb-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-900/40 mb-4">
            <ShieldCheck className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Vibe Compliance</h1>
        <p className="text-gray-500 mt-2">Secure Access Portal</p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-[#1e293b] border border-gray-800 rounded-xl p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
            <input 
              name="email"
              type="email" 
              required
              placeholder="name@company.com"
              className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-500 uppercase">Password</label>
                <a href="#" className="text-xs text-purple-400 hover:text-purple-300">Forgot password?</a>
            </div>
            <input 
              name="password"
              type="password" 
              required
              placeholder="••••••••"
              className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg shadow-purple-900/20 transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : "Sign In"}
          </button>
        </form>
      </div>

      <p className="mt-8 text-gray-600 text-xs">
        &copy; 2025 Vibe Studio. All rights reserved.
      </p>
    </div>
  );
}