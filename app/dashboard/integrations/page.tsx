"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { 
  HiCode, 
  HiTicket, 
  HiShieldCheck, 
  HiCheckCircle, 
  HiX 
} from "react-icons/hi";

interface Integration {
  id: string;
  provider: string;
  name: string;
  status: string;
  created_at: string;
  config: { org?: string; domain?: string; email?: string; projectKey?: string };
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [activeModal, setActiveModal] = useState<'github' | 'jira' | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // GitHub Form
  const [githubOrg, setGithubOrg] = useState("");
  const [githubToken, setGithubToken] = useState("");

  // Jira Form
  const [jiraDomain, setJiraDomain] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraProject, setJiraProject] = useState("");

  const fetchIntegrations = async () => {
    setLoading(true);
    const { data } = await supabase.from("integrations").select("*");
    if (data) setIntegrations(data);
    setLoading(false);
  };

  useEffect(() => { fetchIntegrations(); }, []);

  // Generic Connect Handler
  const handleConnect = async (provider: string, config: any, secret: string, name: string) => {
    setIsConnecting(true);
    try {
      await new Promise(r => setTimeout(r, 1000)); // Simulating auth check
      const { error } = await supabase.from("integrations").upsert({
          provider,
          name,
          config,
          encrypted_key: secret, 
          status: 'Connected'
        }, { onConflict: 'provider' });

      if (error) throw error;
      setActiveModal(null);
      fetchIntegrations();
    } catch (err: any) {
      alert("Connection failed: " + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const isConnected = (provider: string) => integrations.some(i => i.provider === provider);

  return (
    <div className="p-8 text-gray-300 h-full overflow-y-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Integrations Hub</h1>
        <p className="text-sm text-gray-400">Connect external tools to automate evidence and remediation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* GITHUB CARD */}
        <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 flex flex-col justify-between hover:border-gray-700 transition">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-900 rounded-lg"><HiCode className="w-8 h-8 text-white" /></div>
              {isConnected('github') && <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-900 flex items-center gap-1"><HiCheckCircle /> Connected</span>}
            </div>
            <h3 className="text-lg font-bold text-white">GitHub</h3>
            <p className="text-sm text-gray-400 mt-2">Automate code security evidence.</p>
          </div>
          <div className="mt-6">
            <button onClick={() => setActiveModal('github')} className="w-full py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition">
                {isConnected('github') ? "Edit Configuration" : "Connect GitHub"}
            </button>
          </div>
        </div>

        {/* JIRA CARD (Active Now) */}
        <div className="bg-[#1e293b]/50 border border-gray-800 rounded-xl p-6 flex flex-col justify-between hover:border-gray-700 transition">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-gray-900 rounded-lg"><HiTicket className="w-8 h-8 text-blue-400" /></div>
              {isConnected('jira') && <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded-full border border-green-900 flex items-center gap-1"><HiCheckCircle /> Connected</span>}
            </div>
            <h3 className="text-lg font-bold text-white">Jira Software</h3>
            <p className="text-sm text-gray-400 mt-2">Auto-create tickets for failed controls and sync status.</p>
          </div>
          <div className="mt-6">
            <button onClick={() => setActiveModal('jira')} className="w-full py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 transition">
                {isConnected('jira') ? "Edit Configuration" : "Connect Jira"}
            </button>
          </div>
        </div>

      </div>

      {/* GITHUB MODAL */}
      {activeModal === 'github' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-gray-700 rounded-xl w-full max-w-md p-6 relative">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><HiX /></button>
            <h2 className="text-xl font-bold text-white mb-4">Connect GitHub</h2>
            <div className="space-y-4">
                <input type="text" placeholder="Org Name" className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white" value={githubOrg} onChange={(e) => setGithubOrg(e.target.value)} />
                <input type="password" placeholder="Personal Access Token" className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} />
                <button onClick={() => handleConnect('github', { org: githubOrg }, githubToken, `${githubOrg} (GitHub)`)} className="w-full py-3 bg-white text-black font-bold rounded">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* JIRA MODAL */}
      {activeModal === 'jira' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-gray-700 rounded-xl w-full max-w-md p-6 relative">
            <button onClick={() => setActiveModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><HiX /></button>
            <h2 className="text-xl font-bold text-white mb-4">Connect Jira</h2>
            <p className="text-xs text-gray-400 mb-4">You need an API Token from id.atlassian.com</p>
            <div className="space-y-4">
                <input type="text" placeholder="Domain (e.g. acme.atlassian.net)" className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white" value={jiraDomain} onChange={(e) => setJiraDomain(e.target.value)} />
                <input type="email" placeholder="Email Address" className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white" value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} />
                <input type="password" placeholder="API Token" className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} />
                <input type="text" placeholder="Project Key (e.g. SEC, VIBE)" className="w-full bg-gray-900 border border-gray-700 rounded p-3 text-white" value={jiraProject} onChange={(e) => setJiraProject(e.target.value)} />
                
                <button 
                    onClick={() => handleConnect('jira', { domain: jiraDomain, email: jiraEmail, projectKey: jiraProject }, jiraToken, `${jiraDomain} (Jira)`)} 
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-500"
                >
                    Save Connection
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}