"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  HiCode, 
  HiTicket, 
  HiShieldCheck, 
  HiCheckCircle, 
  HiPlus,
  HiX 
} from "react-icons/hi";

// --- Types ---
interface Integration {
  id: string;
  provider: string;
  name: string;
  status: string;
  created_at: string;
  config: { org?: string };
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Form State
  const [githubOrg, setGithubOrg] = useState("");
  const [githubToken, setGithubToken] = useState("");

  // 1. Fetch Existing Integrations
  const fetchIntegrations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("integrations")
      .select("*");
      
    if (error) console.error("Error fetching integrations:", error);
    else setIntegrations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  // 2. Handle Connection (Save to DB)
  const handleConnectGitHub = async () => {
    if (!githubOrg || !githubToken) return;
    setIsConnecting(true);

    try {
      // Simulate API validation delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Save to Supabase
      const { error } = await supabase
        .from("integrations")
        .upsert({
          provider: 'github',
          name: `${githubOrg} (GitHub)`,
          config: { org: githubOrg },
          encrypted_key: githubToken, // In prod, encrypt this before sending!
          status: 'Connected'
        }, { onConflict: 'provider' });

      if (error) throw error;

      // Reset and Refresh
      setIsModalOpen(false);
      setGithubOrg("");
      setGithubToken("");
      fetchIntegrations();

    } catch (err) {
      console.error("Connection failed:", err);
      alert("Failed to connect GitHub. Check console.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Helper to check if a provider is connected
  const isConnected = (provider: string) => integrations.some(i => i.provider === provider);

  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto relative">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Integrations Hub</h1>
        <p className="text-sm text-gray-400">Connect external tools to automate evidence collection.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* --- GITHUB CARD --- */}
        <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 flex flex-col justify-between hover:border-gray-700 transition">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-900 rounded-lg">
                <HiCode className="w-8 h-8 text-white" />
              </div>
              {isConnected('github') && (
                <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-900 flex items-center gap-1">
                  <HiCheckCircle /> Connected
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white">GitHub</h3>
            <p className="text-sm text-gray-400 mt-2">
              Automate code security, PR reviews, and branch protection evidence.
            </p>
          </div>
          <div className="mt-6">
            {isConnected('github') ? (
              <button
                onClick={() => {
                  // Find the connected integration and prefill org
                  const githubIntegration = integrations.find(i => i.provider === 'github');
                  setGithubOrg(githubIntegration?.config?.org || "");
                  setIsModalOpen(true);
                }}
                className="w-full py-2 bg-gray-800 text-gray-100 font-bold rounded border border-gray-500 hover:bg-gray-700 transition"
              >
                Edit Configuration
              </button>
            ) : (
              <button
                onClick={() => setIsModalOpen(true)}
                className="w-full py-2 bg-white text-black font-bold rounded border border-gray-200 hover:bg-gray-200 transition"
              >
                Connect GitHub
              </button>
            )}
          </div>
        </div>

        {/* --- JIRA CARD (Placeholder) --- */}
        <div className="bg-[#1e293b]/30 border border-gray-800 rounded-xl p-6 flex flex-col justify-between opacity-75">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-900 rounded-lg">
                <HiTicket className="w-8 h-8 text-blue-400" />
              </div>
              <span className="px-2 py-1 bg-gray-800 text-gray-500 text-xs rounded-full border border-gray-700">Coming Soon</span>
            </div>
            <h3 className="text-lg font-bold text-gray-400">Jira</h3>
            <p className="text-sm text-gray-500 mt-2">
              Link tickets to controls and track remediation workflows.
            </p>
          </div>
          <div className="mt-6">
            <button className="w-full py-2 bg-gray-900 text-gray-600 rounded cursor-not-allowed border border-gray-800" disabled>
              Notify Me
            </button>
          </div>
        </div>

        {/* --- OKTA CARD (Placeholder) --- */}
        <div className="bg-[#1e293b]/30 border border-gray-800 rounded-xl p-6 flex flex-col justify-between opacity-75">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-900 rounded-lg">
                <HiShieldCheck className="w-8 h-8 text-blue-400" />
              </div>
              <span className="px-2 py-1 bg-gray-800 text-gray-500 text-xs rounded-full border border-gray-700">Coming Soon</span>
            </div>
            <h3 className="text-lg font-bold text-gray-400">Okta</h3>
            <p className="text-sm text-gray-500 mt-2">
              Sync user lists and validate MFA enforcement policies.
            </p>
          </div>
          <div className="mt-6">
            <button className="w-full py-2 bg-gray-900 text-gray-600 rounded cursor-not-allowed border border-gray-800" disabled>
              Notify Me
            </button>
          </div>
        </div>
      </div>

      {/* --- SIMPLE MODAL (No external libraries needed) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <HiX className="w-5 h-5" />
            </button>
            
            <div className="mb-6">
              <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <HiCode className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-white">Connect GitHub</h2>
              <p className="text-sm text-gray-400">Enter your credentials to enable automated scanning.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Organization Name</label>
                <input 
                  type="text" 
                  value={githubOrg}
                  onChange={(e) => setGithubOrg(e.target.value)}
                  placeholder="e.g. acme-corp"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-white outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Personal Access Token (PAT)</label>
                <input 
                  type="password" 
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white focus:border-white outline-none transition"
                />
                <p className="text-xs text-gray-600 mt-1">Required scopes: `repo`, `read:org`</p>
              </div>

              <button 
                onClick={handleConnectGitHub}
                disabled={isConnecting || !githubOrg || !githubToken}
                className="w-full py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition disabled:opacity-50 mt-2"
              >
                {isConnecting ? "Verifying Connection..." : "Save Connection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}