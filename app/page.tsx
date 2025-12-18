import Link from "next/link";
import { 
  HiLightningBolt, 
  HiShieldCheck, 
  HiChip, 
  HiArrowRight 
} from "react-icons/hi";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-[#38bdf8] selection:text-[#0f172a]">
      
      {/* NAVIGATION */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-gray-800/50 backdrop-blur-md sticky top-0 z-50 bg-[#0f172a]/80">
        <div className="text-2xl font-bold tracking-tighter flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#38bdf8] animate-pulse"></div>
          Vibe<span className="text-[#38bdf8]">Compliance</span>
        </div>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-400">
          <a href="#features" className="hover:text-white transition">Capabilities</a>
          <a href="#workflow" className="hover:text-white transition">Workflow</a>
          <Link href="/dashboard" className="text-[#38bdf8] hover:text-white transition font-bold">
            Enter Studio &rarr;
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-20">
        
        {/* HERO SECTION */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 rounded-full bg-blue-900/10 border border-blue-800 text-xs font-bold text-[#38bdf8] uppercase tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            System Operational
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
            Compliance on <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-blue-600">
              Autopilot.
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Stop manually chasing evidence. Vibe ingests your Excel standards, schedules autonomous audits, and uses Vision AI to validate proof.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/dashboard">
              <button className="w-full sm:w-auto px-8 py-4 bg-[#38bdf8] text-[#0f172a] font-bold rounded-xl hover:bg-sky-400 transition shadow-lg shadow-sky-900/20 flex items-center justify-center gap-2">
                Launch Console <HiArrowRight />
              </button>
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 bg-gray-900 border border-gray-800 text-gray-300 font-medium rounded-xl hover:bg-gray-800 transition">
              View Architecture
            </button>
          </div>
        </div>

        {/* THE TERMINAL (UPDATED SCRIPT) */}
        <div className="relative mx-auto max-w-4xl rounded-xl border border-gray-800 bg-[#020617] shadow-2xl overflow-hidden mb-32 group hover:border-gray-700 transition duration-500">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/50 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-xs text-gray-500 font-mono">vibe-auditor — bash — 80x24</div>
            </div>
            
            {/* Terminal Content */}
            <div className="p-6 font-mono text-sm leading-relaxed h-80 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020617]/90 z-10"></div>
                
                <div className="space-y-2">
                    <div className="text-gray-400">$ vibe schedule --run="Monthly CMMC Scan"</div>
                    <div className="text-blue-400">[i] Initializing Autonomous Auditor...</div>
                    <div className="text-gray-300">[+] Loaded Standard: <span className="text-white font-bold">CMMC Level 2 (Imported)</span></div>
                    <div className="text-gray-300">[+] Target Asset: <span className="text-white font-bold">Production AWS (us-east-1)</span></div>
                    <div className="text-yellow-400 animate-pulse">[~] Scanning S3 Buckets for Public Access...</div>
                    <div className="text-gray-500 ml-4"> Checking bucket: customer-logs-backup...</div>
                    <div className="text-red-400 font-bold ml-4">[!] ALERT: Bucket is Public (Violates AC.3.1)</div>
                    <div className="text-gray-300">[+] Capturing Evidence Screenshot... Done.</div>
                    <div className="text-blue-400">[i] AI Analyzer Verdict:</div>
                    <div className="text-gray-300 ml-4">Confidence: 98%</div>
                    <div className="text-gray-300 ml-4">Status: <span className="text-red-400">FAILED</span></div>
                    <div className="text-green-400">[✓] Triggering Jira Integration...</div>
                    <div className="text-white"> Created Ticket: <span className="underline decoration-dashed">SEC-402</span></div>
                    <div className="text-gray-400">$ _</div>
                </div>
            </div>
        </div>

        {/* FEATURE GRID */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="p-8 rounded-2xl bg-[#1e293b]/30 border border-gray-800 hover:border-[#38bdf8]/50 transition duration-300 group">
            <div className="w-12 h-12 bg-blue-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <HiChip className="w-6 h-6 text-[#38bdf8]" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Universal Ingest</h3>
            <p className="text-gray-400 leading-relaxed">
              Don't change your process. Drag & drop any spreadsheet (NIST, ISO, Custom) and Vibe builds the audit environment instantly.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#1e293b]/30 border border-gray-800 hover:border-[#38bdf8]/50 transition duration-300 group">
            <div className="w-12 h-12 bg-purple-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <HiLightningBolt className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Autonomous Scheduler</h3>
            <p className="text-gray-400 leading-relaxed">
              Set it and forget it. Define recurring audit rules (Weekly, Monthly) and let the "Run Now" API handle the heavy lifting.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#1e293b]/30 border border-gray-800 hover:border-[#38bdf8]/50 transition duration-300 group">
            <div className="w-12 h-12 bg-green-900/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
              <HiShieldCheck className="w-6 h-6 text-green-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-white">Self-Healing</h3>
            <p className="text-gray-400 leading-relaxed">
              Closed-loop security. When AI detects a failure, it auto-creates Jira tickets and verifies the fix when closed.
            </p>
          </div>
        </div>

      </main>
      
      <footer className="border-t border-gray-900 py-12 text-center text-gray-600 text-sm">
        <p>&copy; 2024 Vibe Compliance Studio. </p>
      </footer>
    </div>
  );
}