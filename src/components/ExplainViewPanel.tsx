/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  HelpCircle,
  ExternalLink,
  Send,
  ShieldAlert,
  ChevronRight,
  BookOpen,
  Info,
  Minimize2,
  Maximize2,
  X,
  Compass,
} from 'lucide-react';
import {
  ExplorerAnatomyId,
  ExplainViewResponse,
  ExplainViewSource,
} from '../types/biomedical.ts';
import { EXPLORER_ANATOMY_STRUCTURES } from '../data/explorerAnatomyData.ts';
import { ClotHemodynamicsChart } from './ClotHemodynamicsChart.tsx';

interface ExplainViewPanelProps {
  selectedStructureId: ExplorerAnatomyId;
  onSelectStructure: (id: ExplorerAnatomyId) => void;
  clotPathProgress: number;
  onSeekClotPath?: (progress: number) => void;
  lyticFraction?: number;
  isOpen: boolean;
  onClose: () => void;
  isDarkTheme?: boolean;
}

interface MessageEntry {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: ExplainViewSource[];
  apiProvider?: string;
  isEmergency?: boolean;
  emergencyNotice?: string | null;
  disclaimer?: string;
}

export const ExplainViewPanel: React.FC<ExplainViewPanelProps> = ({
  selectedStructureId,
  onSelectStructure,
  clotPathProgress,
  onSeekClotPath,
  lyticFraction = 0,
  isOpen,
  onClose,
  isDarkTheme = true,
}) => {
  const currentStructure =
    EXPLORER_ANATOMY_STRUCTURES[selectedStructureId] ||
    EXPLORER_ANATOMY_STRUCTURES.pulmonaryArtery;
  const [typedQuestion, setTypedQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle asking question (typed or suggested)
  const handleAskQuestion = async (q: string) => {
    const questionText = q.trim();
    if (!questionText || isLoading) return;

    const userMsgId = `user_${Date.now()}`;
    const userMsg: MessageEntry = {
      id: userMsgId,
      sender: 'user',
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setTypedQuestion('');
    setIsLoading(true);

    try {
      const resp = await fetch('/api/explain-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: questionText,
          anatomyLabel: currentStructure.label,
        }),
      });

      const data: ExplainViewResponse = await resp.json();

      const aiMsg: MessageEntry = {
        id: `ai_${Date.now()}`,
        sender: 'assistant',
        text: data.answer || 'Reliable educational sources could not be confirmed from You.com.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: data.sources || [],
        apiProvider: data.apiProvider || 'You.com API',
        isEmergency: data.isEmergencyPrompt,
        emergencyNotice: data.emergencyNotice,
        disclaimer: data.disclaimer,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to reach the You.com search endpoint right now. Please verify your connection and retry your disease anatomy question.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: [],
          apiProvider: 'You.com Unavailable',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <aside
      className={`fixed top-0 left-16 sm:left-64 z-40 w-[440px] max-w-[calc(100vw-4rem)] h-full flex flex-col border-r shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        isDarkTheme
          ? 'bg-[#0f1014]/98 border-[#282a30] text-slate-100 shadow-black/80'
          : 'bg-white/98 border-slate-300 text-slate-900 shadow-slate-300/60'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 border-b select-none shrink-0 ${
          isDarkTheme ? 'border-[#22242b]' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight uppercase">Disease POV • Explain</h2>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-400/30">
                You.com API
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Source-Agnostic PE Pathophysiology & Hemodynamics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized((prev) => !prev)}
            title={isMinimized ? 'Expand Panel' : 'Minimize Panel'}
            className={`p-1.5 rounded-md transition-colors ${
              isDarkTheme ? 'hover:bg-neutral-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            title="Close Panel"
            className={`p-1.5 rounded-md transition-colors ${
              isDarkTheme ? 'hover:bg-neutral-800 text-slate-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* General Education Notice Banner */}
          <div
            className={`px-3.5 py-2 border-b flex items-center justify-between text-xs font-medium ${
              isDarkTheme
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>General Education Only • Illustrative 3D</span>
            </span>
            <span className="text-xs font-mono opacity-85">Not for diagnosis</span>
          </div>

          {/* Anatomical Structure Selector Bar */}
          <div
            className={`p-3 border-b shrink-0 ${
              isDarkTheme ? 'bg-[#141519] border-[#22242b]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                Select Anatomical View:
              </span>
              <span className="text-xs font-bold text-sky-400">{currentStructure.badge}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(EXPLORER_ANATOMY_STRUCTURES) as ExplorerAnatomyId[]).map((id) => {
                const struct = EXPLORER_ANATOMY_STRUCTURES[id];
                const isActive = selectedStructureId === id;
                return (
                  <button
                    key={id}
                    onClick={() => onSelectStructure(id)}
                    className={`px-3 py-2 rounded-lg text-left text-sm transition-all border flex items-center justify-between ${
                      isActive
                        ? isDarkTheme
                          ? 'bg-sky-500/20 text-white border-sky-400 font-bold shadow-xs'
                          : 'bg-sky-50 text-sky-950 border-sky-400 font-bold shadow-xs'
                        : isDarkTheme
                        ? 'bg-[#18191e] text-slate-300 border-transparent hover:border-[#2a2c34] hover:text-white'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{struct.label}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable Conversation and Prewritten Explanation */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* Real-Time D3.js Clot Path Hemodynamics Chart (mPAP & Vascular Resistance) */}
            <ClotHemodynamicsChart
              clotPathProgress={clotPathProgress}
              lyticFraction={lyticFraction}
              onSeekClotPath={onSeekClotPath}
              onSelectStructure={onSelectStructure}
              isDarkTheme={isDarkTheme}
            />

            {/* Prewritten Structure Context Card */}
            <div
              className={`p-3.5 rounded-xl border transition-all ${
                isDarkTheme
                  ? 'bg-[#16181e] border-[#2a2c34] text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {currentStructure.label} Architecture
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300">
                  Clinical Guide
                </span>
              </div>
              <p className={`text-sm leading-relaxed mb-2 ${isDarkTheme ? 'text-slate-200' : 'text-slate-700'}`}>
                {currentStructure.prewrittenExplanation}
              </p>
              <div className="pt-2 border-t border-slate-700/30 flex items-center justify-between text-xs text-slate-400">
                <span>Role: {currentStructure.clinicalRole}</span>
              </div>
            </div>

            {/* Suggested Questions Section */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                Suggested Questions on this View:
              </span>
              <div className="space-y-1.5">
                {currentStructure.suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAskQuestion(q)}
                    disabled={isLoading}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm leading-snug border transition-all flex items-center justify-between group ${
                      isDarkTheme
                        ? 'bg-[#18191f] hover:bg-[#20222a] border-[#272932] text-slate-200 hover:text-white'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{q}</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-400 shrink-0 ml-2 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Q&A Thread */}
            {messages.length > 0 && (
              <div className="pt-3 border-t border-slate-700/40 space-y-3.5">
                <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                  Cited Educational Dialogue:
                </span>

                {messages.map((msg) => (
                  <div key={msg.id} className="space-y-2.5">
                    {msg.sender === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[88%] px-3.5 py-2.5 rounded-xl bg-sky-600 text-white text-[15px] leading-relaxed shadow-sm">
                          <p>{msg.text}</p>
                          <span className="text-[11px] text-sky-200 font-mono block text-right mt-1">
                            {msg.timestamp}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {/* Emergency Notice if symptoms detected */}
                        {msg.isEmergency && msg.emergencyNotice && (
                          <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 text-red-100 text-sm leading-relaxed shadow-sm animate-pulse">
                            <div className="flex items-center gap-2 font-bold text-red-400 mb-1">
                              <ShieldAlert className="w-4 h-4" />
                              <span>URGENT MEDICAL NOTICE</span>
                            </div>
                            <p className="text-sm">{msg.emergencyNotice}</p>
                          </div>
                        )}

                        {/* Educational Sourced Answer */}
                        <div
                          className={`p-3.5 rounded-xl border text-[15px] leading-relaxed shadow-sm ${
                            isDarkTheme
                              ? 'bg-[#181a22] border-[#2b2d38] text-slate-100'
                              : 'bg-slate-50 border-slate-200 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5 text-xs text-sky-400 font-mono">
                            <span className="font-bold flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              {msg.apiProvider || 'You.com Agnostic Sources'}
                            </span>
                            <span className="text-slate-400">{msg.timestamp}</span>
                          </div>

                          <div className="whitespace-pre-line text-[15px] leading-relaxed">
                            {msg.text}
                          </div>

                          {/* Sourced Citations & Clickable Links */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-3.5 pt-3 border-t border-slate-700/40 space-y-2">
                              <span className="text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                                Source-Agnostic References ({msg.sources.length}):
                              </span>
                              <div className="space-y-1.5">
                                {msg.sources.map((src, i) => (
                                  <a
                                    key={i}
                                    href={src.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`flex items-start justify-between gap-2 p-2 rounded-lg border text-xs transition-all group ${
                                      isDarkTheme
                                        ? 'bg-[#121317] hover:bg-[#1a1c22] border-[#22242b] text-slate-200'
                                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-sm font-semibold truncate text-sky-400 group-hover:underline flex items-center gap-1.5">
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono shrink-0">
                                          [{i + 1}]
                                        </span>
                                        <span className="truncate">{src.title}</span>
                                      </div>
                                      <div className="text-xs text-slate-400 font-mono truncate mt-0.5">
                                        {src.organization}{src.accessDate ? ` · ${src.accessDate}` : ''}
                                      </div>
                                    </div>
                                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 shrink-0 mt-1" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div
                className={`p-3.5 rounded-xl border text-sm flex items-center gap-3 ${
                  isDarkTheme ? 'bg-[#181a22] border-[#2b2d38] text-slate-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin shrink-0" />
                <div>
                  <span className="font-semibold text-sky-400">Searching You.com index...</span>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Gathering source-agnostic disease evidence for {currentStructure.label}.
                  </p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Question Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskQuestion(typedQuestion);
            }}
            className={`p-3 border-t shrink-0 flex items-center gap-2 ${
              isDarkTheme ? 'bg-[#111216] border-[#22242b]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <input
              type="text"
              value={typedQuestion}
              onChange={(e) => setTypedQuestion(e.target.value)}
              placeholder={`Ask about ${currentStructure.label} or PE anatomy...`}
              disabled={isLoading}
              className={`flex-1 px-3.5 py-2.5 text-sm rounded-xl border outline-none transition-colors ${
                isDarkTheme
                  ? 'bg-[#18191f] border-[#282a32] text-white placeholder-slate-500 focus:border-sky-400'
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
              }`}
            />
            <button
              type="submit"
              disabled={isLoading || !typedQuestion.trim()}
              title="Send question"
              className="p-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
};
