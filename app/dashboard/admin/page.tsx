"use client";

import { useState } from "react";
import { 
  User, 
  Building, 
  Globe, 
  Save, 
  Bell, 
  ShieldCheck,
  CreditCard
} from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="p-8 text-gray-300 min-h-screen pb-20">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-gray-400">Manage your profile, organization, and system preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* SIDEBAR NAVIGATION */}
        <div className="md:col-span-3">
            <div className="bg-[#1e293b] rounded-xl border border-gray-800 overflow-hidden sticky top-8">
                <nav className="flex flex-col p-2 space-y-1">
                    <button 
                        onClick={() => setActiveTab("profile")}
                        className={`p-3 text-sm font-medium rounded-lg text-left flex items-center gap-3 transition ${activeTab === 'profile' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                        <User className="w-4 h-4" /> My Profile
                    </button>
                    <button 
                        onClick={() => setActiveTab("org")}
                        className={`p-3 text-sm font-medium rounded-lg text-left flex items-center gap-3 transition ${activeTab === 'org' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                        <Building className="w-4 h-4" /> Organization
                    </button>
                    <button 
                        onClick={() => setActiveTab("integrations")}
                        className={`p-3 text-sm font-medium rounded-lg text-left flex items-center gap-3 transition ${activeTab === 'integrations' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                        <Globe className="w-4 h-4" /> Integrations
                    </button>
                    <button 
                        onClick={() => setActiveTab("notifications")}
                        className={`p-3 text-sm font-medium rounded-lg text-left flex items-center gap-3 transition ${activeTab === 'notifications' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                    >
                        <Bell className="w-4 h-4" /> Notifications
                    </button>
                </nav>
            </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="md:col-span-9">
            <div className="bg-[#1e293b] border border-gray-800 rounded-xl p-8 min-h-[500px]">
                
                {/* 1. PROFILE TAB */}
                {activeTab === "profile" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="border-b border-gray-700 pb-4 mb-6">
                            <h2 className="text-xl font-bold text-white">Profile Settings</h2>
                            <p className="text-sm text-gray-500">Manage your personal account details.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Full Name</label>
                                <input type="text" className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition" defaultValue="Admin User" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Address</label>
                                <input type="email" className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-gray-400 cursor-not-allowed outline-none" defaultValue="admin@vibestudio.com" disabled />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Job Title</label>
                                <input type="text" className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none transition" defaultValue="Compliance Officer" />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-700 flex justify-end">
                            <button className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center gap-2 transition">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. ORGANIZATION TAB */}
                {activeTab === "org" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                         <div className="border-b border-gray-700 pb-4 mb-6">
                            <h2 className="text-xl font-bold text-white">Organization Details</h2>
                            <p className="text-sm text-gray-500">Company information for reports and audits.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Company Name</label>
                                <input type="text" className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none" defaultValue="Acme Corp, Inc." />
                            </div>
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Industry</label>
                                <select className="w-full bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none">
                                    <option>FinTech</option>
                                    <option>Healthcare</option>
                                    <option>SaaS / Technology</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-gray-700 flex justify-end">
                            <button className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center gap-2 transition">
                                <Save className="w-4 h-4" /> Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. INTEGRATIONS TAB */}
                {activeTab === "integrations" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                        <div className="border-b border-gray-700 pb-4 mb-6">
                            <h2 className="text-xl font-bold text-white">Active Integrations</h2>
                            <p className="text-sm text-gray-500">Connect external tools to automate evidence collection.</p>
                        </div>

                        <div className="space-y-4">
                            {/* Jira Card */}
                            <div className="flex items-center justify-between p-4 bg-[#0f172a] border border-gray-700 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-400">
                                        <ShieldCheck className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">Jira Software</h4>
                                        <p className="text-xs text-gray-400">Connected for Risk Ticketing</p>
                                    </div>
                                </div>
                                <span className="px-2 py-1 bg-green-900/20 text-green-400 text-xs font-bold rounded border border-green-900/30">Active</span>
                            </div>

                            {/* AWS Card (Placeholder) */}
                            <div className="flex items-center justify-between p-4 bg-[#0f172a] border border-gray-700 rounded-xl opacity-75">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-400">
                                        <Globe className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white">AWS Cloud</h4>
                                        <p className="text-xs text-gray-400">Evidence Collection</p>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 text-xs font-bold bg-gray-800 text-gray-300 rounded hover:bg-gray-700 transition">Connect</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. NOTIFICATIONS TAB */}
                {activeTab === "notifications" && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                         <div className="border-b border-gray-700 pb-4 mb-6">
                            <h2 className="text-xl font-bold text-white">Notification Preferences</h2>
                            <p className="text-sm text-gray-500">Control when and how you receive alerts.</p>
                        </div>
                        <div className="space-y-4">
                            {["Assessment Completed", "New Risk Identified", "Control Gap Detected", "Weekly Summary Report"].map((item) => (
                                <div key={item} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-lg transition">
                                    <span className="text-gray-300 text-sm font-medium">{item}</span>
                                    <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                        <input type="checkbox" name="toggle" id={item} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-purple-600"/>
                                        <label htmlFor={item} className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer"></label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
}