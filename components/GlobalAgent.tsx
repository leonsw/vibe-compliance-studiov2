"use client";

import { useState, useRef, useEffect } from "react";
import { 
  HiChatAlt2, 
  HiX, 
  HiSparkles, 
  HiPaperAirplane 
} from "react-icons/hi";

// Define our own simple Message type to avoid library conflicts
type Message = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    toolInvocations?: any[];
};

export default function GlobalAgent() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Manually Manage State (Bypassing the broken useChat hook)
  const [messages, setMessages] = useState<Message[]>([
    {
        id: 'welcome',
        role: 'assistant',
        content: "Hello Admin. I am VibeBot. I can run audits, answer policy questions, or create Jira tickets. How can I help?"
    }
  ]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // 2. THE MANUAL SUBMIT FUNCTION (No Libraries)
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    
    // Update UI immediately
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
        // A. Send Request
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })) 
            })
        });

        if (!response.body) throw new Error("No response body");

        // B. Set up the Assistant Message Placeholder
        const botMessageId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: botMessageId, role: 'assistant', content: "" }]);

        // C. Read the Stream (Manual Parse)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulatedText = "";

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;
            const chunkValue = decoder.decode(value, { stream: true });
            
            // Simple Parse: The AI SDK sends chunks like '0:"text"'. 
            // We just want the text. We filter out the protocol characters roughly.
            // This is a "Dirty Parse" to get you working immediately.
            const cleanChunk = chunkValue
                .replace(/0:"/g, "")   // Remove start of text block
                .replace(/"\n/g, "")   // Remove end of text block
                .replace(/\\n/g, "\n"); // Fix newlines

            // Filter out Tool Calls (JSON) from the display for now so it doesn't look messy
            if (!cleanChunk.includes('tool_call') && !cleanChunk.includes('execute_assessment')) {
                accumulatedText += cleanChunk;
                
                // Update the last message with new text
                setMessages(prev => prev.map(m => 
                    m.id === botMessageId ? { ...m, content: accumulatedText } : m
                ));
            }
        }

    } catch (err) {
        console.error("Chat Error:", err);
        setMessages(prev => [...prev, { id: 'err', role: 'assistant', content: "Sorry, I encountered a network error. Please check the console." }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {isOpen && (
        <div className="mb-4 w-[400px] h-[600px] bg-[#0f172a] border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          
          {/* Header */}
          <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/10 rounded-lg">
                    <HiSparkles className="text-[#38bdf8]" />
                </div>
                <div>
                    <h3 className="text-white font-bold text-sm">Vibe AI Officer</h3>
                    <p className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                        Online
                    </p>
                </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                <HiX />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0f172a]">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`
                    max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed
                    ${m.role === 'user' 
                        ? 'bg-[#38bdf8] text-[#0f172a] font-medium rounded-tr-none' 
                        : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'}
                `}>
                    {m.content}
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="bg-gray-800 rounded-2xl p-3 rounded-tl-none flex gap-1">
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></span>
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleCustomSubmit} className="p-3 bg-gray-900 border-t border-gray-800">
            <div className="relative">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask to run an audit..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl py-3 pl-4 pr-10 text-white focus:outline-none focus:border-[#38bdf8] text-sm shadow-inner"
                />
                <button 
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 top-2 p-1.5 bg-[#38bdf8] text-[#0f172a] rounded-lg hover:bg-sky-400 disabled:opacity-50 transition"
                >
                    <HiPaperAirplane className="w-4 h-4 transform rotate-90" />
                </button>
            </div>
          </form>
        </div>
      )}

      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#38bdf8] text-[#0f172a] rounded-full shadow-lg shadow-sky-900/40 hover:bg-sky-400 hover:scale-105 transition flex items-center justify-center"
      >
        {isOpen ? <HiX className="w-6 h-6" /> : <HiChatAlt2 className="w-7 h-7" />}
      </button>
    </div>
  );
}