import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white font-sans selection:bg-sky-500/30">
      
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 border-b border-gray-800/50 backdrop-blur-md sticky top-0 z-50 bg-[#0f172a]/80">
        <div className="text-2xl font-bold tracking-tighter cursor-pointer">
          Vibe<span className="text-[#38bdf8]">Compliance</span>
        </div>
        <div className="hidden md:flex space-x-8 text-sm font-medium text-gray-400">
          <a href="#" className="hover:text-white transition-colors duration-200">Platform</a>
          <a href="#" className="hover:text-white transition-colors duration-200">Solutions</a>
          <a href="#" className="hover:text-white transition-colors duration-200">Pricing</a>
          <a href="#" className="text-[#38bdf8] hover:text-white transition-colors duration-200">Login</a>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-24 text-center">
        
        {/* Badge */}
        <div className="inline-flex gap-3 mb-8">
          {/* Blue Badge */}
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gray-900 border border-gray-700/50 text-xs font-semibold text-[#38bdf8] uppercase tracking-wide hover:border-[#38bdf8]/50 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] mr-2 animate-pulse"></span>
            Now in Private Beta
          </div>
          {/* Green Badge */}
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-gray-900 border border-green-700/50 text-xs font-semibold text-green-400 uppercase tracking-wide hover:border-green-400/50 transition-colors cursor-default">
            <span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span>
            NIST 800-171 Ready
          </div>
        </div>
        
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
          Build secure workflows <br />
          at the speed of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38bdf8] to-blue-600">vibe coding</span>.
        </h1>
        
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Empower IT and security teams to co-create internal tools safely. 
          Automated compliance mapping for NIST 800-171 and CMMC 2.0 built-in.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-20">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-[#38bdf8] text-[#0f172a] font-bold rounded-lg hover:bg-sky-300 transition-all duration-200 shadow-[0_0_20px_-5px_rgba(56,189,248,0.5)] flex items-center justify-center"
          >
            Start Building
          </Link>
          <button className="px-8 py-4 bg-gray-800/50 border border-gray-700 text-white font-medium rounded-lg hover:bg-gray-700 transition-all duration-200 backdrop-blur-sm">
            Book Demo
          </button>
        </div>

        {/* The "Terminal" Dashboard Preview */}
        <div className="relative mx-auto max-w-5xl rounded-xl border border-gray-800 bg-[#020617] shadow-2xl overflow-hidden text-left">
          {/* Window Controls */}
          <div className="flex items-center gap-2 px-4 py-3 bg-[#1e293b] border-b border-gray-800">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            <div className="ml-4 text-xs text-gray-500 font-mono">vibe-compliance-agent — -zsh — 80x24</div>
          </div>
          
          {/* Terminal Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0 h-96">
            {/* Sidebar */}
            <div className="hidden md:block col-span-1 border-r border-gray-800 bg-[#0f172a]/50 p-4 space-y-3">
               <div className="h-2 w-20 bg-gray-700 rounded opacity-50"></div>
               <div className="h-2 w-16 bg-gray-800 rounded opacity-50"></div>
               <div className="h-2 w-24 bg-gray-800 rounded opacity-50"></div>
               <div className="mt-8 h-2 w-12 bg-gray-700 rounded opacity-50"></div>
            </div>

            {/* Code Area */}
            <div className="col-span-3 p-6 font-mono text-sm">
                <div className="text-green-400 mb-2">$ vibe run audit --target=s3-buckets</div>
                <div className="text-gray-400 space-y-1">
                    <p>Initializing NIST 800-171 Scanner...</p>
                    <p>[+] Authenticated as Admin (MFA Verified)</p>
                    <p>[+] Scanning 14 buckets in us-east-1...</p>
                    <p className="text-yellow-400">[!] Alert: Bucket 'customer-logs-backup' is public.</p>
                    <p className="text-[#38bdf8]">[i] Auto-remediation script generated.</p>
                </div>
                <div className="mt-4 flex items-center">
                    <span className="text-green-400 mr-2">➜</span>
                    <span className="w-2 h-5 bg-gray-500 animate-pulse"></span>
                </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer Strip */}
      <footer className="border-t border-gray-800 py-8 text-center text-gray-600 text-sm">
        <p>&copy; 2025 Vibe Compliance Studio. All systems operational.</p>
      </footer>
    </div>
  );
}