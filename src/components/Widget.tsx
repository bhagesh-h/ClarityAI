import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Maximize2, Minimize2, Copy, RefreshCw, Settings, 
  BookOpen, MessageSquare, Link as LinkIcon, FileText, ChevronRight,
  Loader2, AlertCircle, Linkedin, Github
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useClarityStore } from '../store';
import { formatCitation, CitationStyle } from '../formatters/citations';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Widget() {
  const { isOpen, setOpen, isLoading, result, error, config } = useClarityStore();
  const [activeTab, setActiveTab] = useState<'summary' | 'explanation' | 'reply' | 'reference'>('summary');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>('APA 7');
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (result?.contentType === 'email') {
      setActiveTab('summary');
    }
  }, [result]);

  if (!isOpen) return null;

  const tabs = [
    { id: 'summary', name: 'Summary', icon: BookOpen },
    { id: 'explanation', name: 'Explanation', icon: FileText },
    ...(result?.contentType === 'email' ? [{ id: 'reply', name: 'Reply', icon: MessageSquare }] : []),
    ...(result?.contentType !== 'email' ? [{ id: 'reference', name: 'Reference', icon: LinkIcon }] : [])
  ];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed top-0 right-0 h-full z-[999999] flex items-center">
      <AnimatePresence>
        {!isCollapsed ? (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="w-[400px] h-full glass-effect shadow-2xl flex flex-col text-[#E5E5E5] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/20">
              <div className="flex items-center gap-2">
                <img 
                  src={typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL ? chrome.runtime.getURL('icon.svg') : '/icon.svg'} 
                  className="w-7 h-7 rounded-lg" 
                  alt="Clarity AI"
                />
                <h1 className="font-display font-medium text-white tracking-tight text-lg">Clarity<span className="text-blue-500 ml-0.5">AI</span></h1>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase ml-2 border border-blue-500/20">
                  {result?.contentType || 'Detecting...'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setIsCollapsed(true)} className="p-1.5 hover:bg-white/5 rounded text-gray-400 transition-colors">
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/5 rounded text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Content Area Tabs */}
            <div className="flex border-b border-white/5 text-[13px] font-bold uppercase tracking-wider">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "flex-1 py-3 transition-colors",
                    activeTab === tab.id 
                      ? "text-[#3B82F6] border-bottom-2 border-[#3B82F6]" 
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                  style={activeTab === tab.id ? { borderBottom: '2px solid #3B82F6' } : {}}
                >
                  {tab.name}
                </button>
              ))}
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto content-area p-5 custom-scrollbar">
              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-500">
                  <Loader2 className="animate-spin text-blue-500" size={28} />
                  <p className="text-xs font-bold uppercase tracking-widest">Synthesizing...</p>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 shrink-0" size={18} />
                  <div>
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">Error</h3>
                    <p className="text-sm text-red-400/80 mt-1 leading-relaxed">{error}</p>
                  </div>
                </div>
              ) : result ? (
                <div className="space-y-8">
                  {activeTab === 'summary' && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <h3 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest mb-4">High-Level Summary</h3>
                      <p className="text-[15px] leading-relaxed text-zinc-100">
                        {result.summary}
                      </p>
                    </section>
                  )}

                  {activeTab === 'explanation' && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <h3 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Deep Explanation</h3>
                      <div className="prose prose-invert prose-sm max-w-none text-zinc-200 leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {result.explanation.markdown}
                        </ReactMarkdown>
                      </div>
                    </section>
                  )}

                  {activeTab === 'reply' && result.nextReply && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
                      <h3 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest">Formal Reply</h3>
                      <div className="space-y-3">
                        {result.nextReply.subject && (
                          <div className="p-3 bg-zinc-900/50 rounded-lg border border-white/5">
                            <span className="text-[11px] font-bold text-zinc-500 uppercase block mb-1">Suggested Subject</span>
                            <p className="text-[15px] text-zinc-200 font-medium">{result.nextReply.subject}</p>
                          </div>
                        )}
                        <div className="p-5 bg-black/40 rounded-xl border border-white/5 relative group">
                          <p className="text-[15px] text-zinc-100 whitespace-pre-wrap leading-relaxed">{result.nextReply.body}</p>
                          <button 
                            onClick={() => handleCopy(result.nextReply?.body || '')}
                            className="absolute top-3 right-3 p-1.5 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/10"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </div>
                    </section>
                  )}

                  {activeTab === 'reference' && (
                    <section className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                      <h3 className="text-[13px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Citation Library</h3>
                      <div className="flex gap-2 flex-wrap">
                        {(['APA 7', 'MLA 9', 'IEEE', 'BibTeX'] as CitationStyle[]).map(style => (
                          <button
                            key={style}
                            onClick={() => setCitationStyle(style)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-tight border transition-all",
                              citationStyle === style 
                                ? "bg-white text-black border-white" 
                                : "bg-white/5 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300"
                            )}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                      <div className="p-5 bg-black/40 rounded-xl border border-white/5 font-mono text-xs leading-relaxed text-zinc-200 break-words">
                        {formatCitation(result.referenceMetadata, citationStyle)}
                      </div>
                    </section>
                  )}

                   {/* Confidence Badge */}
                   <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <div className="text-[11px] font-bold text-blue-400/90 uppercase mb-2">AI Reasoning Confidence</div>
                    <div className="w-full bg-blue-900/30 h-1 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full transition-all duration-1000" style={{ width: `${(result.confidence || 0.9) * 100}%` }}></div>
                    </div>
                    <div className="flex justify-between mt-2 text-[11px] text-zinc-300 font-medium font-mono">
                      <span>{Math.round((result.confidence || 0.9) * 100)}% Accurate</span>
                      <span>English Output</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                    <BookOpen size={32} className="text-blue-500" />
                  </div>
                  <h2 className="text-white font-display font-medium text-lg mb-2">Clarity Ready</h2>
                  <p className="text-sm text-zinc-400 leading-relaxed mb-8 max-w-[240px]">
                    Analysis is pending for this tab. Click below to synthesize the current content.
                  </p>
                  <button
                    onClick={() => {
                      if (typeof (window as any).triggerClarity === 'function') {
                        (window as any).triggerClarity();
                      }
                    }}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-bold uppercase rounded-xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 group"
                  >
                    Analyze Tab Content
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-900/40 border-t border-white/10 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button 
                    onClick={() => result && handleCopy(result.summary + "\n\n" + result.explanation.markdown)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[13px] font-bold uppercase rounded-lg transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                  >
                    <Copy size={12} /> Copy All
                  </button>
                  <button 
                    onClick={() => {
                      if (isLoading) return;
                      if (typeof (window as any).triggerClarity === 'function') {
                        (window as any).triggerClarity();
                      } else if (typeof (window as any).window?.triggerClarity === 'function') {
                        (window as any).window.triggerClarity();
                      } else {
                        window.postMessage({ action: 'TOGGLE_WIDGET' }, '*');
                      }
                    }}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-gray-300 transition-all active:scale-95 disabled:opacity-50"
                    title="Regenerate synthesis"
                    disabled={isLoading}
                  >
                    <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
                  </button>
                </div>
                <div className="text-[12px] text-zinc-200 font-bold font-mono tracking-tighter text-right">
                  v1.3.0 • PRO
                </div>
              </div>
              
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <p className="text-[11px] text-zinc-300 font-medium uppercase tracking-tight">
                  © {new Date().getFullYear()} Created by BHAGESH
                </p>
                <div className="flex items-center gap-2.5">
                  <a href="https://www.linkedin.com/in/bhagesh-hunakunti/" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-blue-400 transition-colors">
                    <Linkedin size={12} />
                  </a>
                  <a href="https://github.com/bhagesh-h" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white transition-colors">
                    <Github size={12} />
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsCollapsed(false)}
            className="w-10 h-10 bg-[#0a0a0a] border border-zinc-800 rounded-full mr-2 shadow-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100"
          >
            <ChevronRight size={20} className="rotate-180" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
