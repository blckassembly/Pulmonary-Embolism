/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
  Server,
  Zap,
  Code2,
  Terminal,
  FileCode,
  Layers,
  FlaskConical,
  X,
  RefreshCw,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { YouSearchResponse, YouSearchResultItem, YouMcpInfoResponse } from '../types/biomedical.ts';

interface YouSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  isDarkTheme?: boolean;
  onApplyDrugSearch?: (drugTerm: string) => void;
}

const PRESET_QUERIES = [
  'Acetaminophen 2200mg pulmonary embolism lysis efficacy',
  'Alteplase tPA vs Tenecteplase massive PE mortality',
  'Factor XIIIa crosslink density thrombus stiffness',
  'Airway mucus accumulation CAD biomechanics shear',
  'EKOS ultrasound catheter directed thrombolysis outcomes',
  'Direct oral anticoagulants apixaban rivaroxaban pulmonary embolism guidelines',
];

export const YouSearchModal: React.FC<YouSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  isDarkTheme = true,
  onApplyDrugSearch,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'mcp_setup'>('search');
  const [query, setQuery] = useState(initialQuery || 'pulmonary embolism tPA tenecteplase clinical trial');
  const [searchMode, setSearchMode] = useState<'search' | 'answer'>('answer');
  const [filterCategory, setFilterCategory] = useState<'all' | 'trials' | 'biochem' | 'cad'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [searchData, setSearchData] = useState<YouSearchResponse | null>(null);
  const [mcpInfo, setMcpInfo] = useState<YouMcpInfoResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (isOpen) {
      fetchMcpInfo();
      if (!searchData) {
        handleSearch(query || 'pulmonary embolism tenecteplase dose', searchMode);
      }
    }
  }, [isOpen]);

  const fetchMcpInfo = async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/you/mcp-info');
      const data = await res.json();
      if (data.success) {
        setMcpInfo(data);
      }
    } catch (err) {
      console.warn('Failed to fetch MCP info:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const handleSearch = async (searchQuery: string, mode: 'search' | 'answer') => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/you/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), mode }),
      });
      const data: YouSearchResponse = await res.json();
      setSearchData(data);
    } catch (err) {
      console.error('You.com search error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  // Filter results client-side by query category if selected
  const filteredResults = (searchData?.results || []).filter((item) => {
    if (filterCategory === 'all') return true;
    const combined = `${item.title} ${item.description} ${item.url}`.toLowerCase();
    if (filterCategory === 'trials') {
      return combined.includes('trial') || combined.includes('study') || combined.includes('clinical') || combined.includes('cochrane');
    }
    if (filterCategory === 'biochem') {
      return combined.includes('fibrin') || combined.includes('plasmin') || combined.includes('thrombin') || combined.includes('enzyme') || combined.includes('receptor');
    }
    if (filterCategory === 'cad') {
      return combined.includes('flow') || combined.includes('hemodynamic') || combined.includes('shear') || combined.includes('wall') || combined.includes('fluid') || combined.includes('lumen');
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-5xl h-[92vh] max-h-[880px] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-colors ${
          isDarkTheme
            ? 'bg-[#0b0c0e] border-[#2a2b2e] text-neutral-100'
            : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b shrink-0 ${
            isDarkTheme ? 'border-[#22242a] bg-[#101216]' : 'border-slate-100 bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-sky-500 to-amber-500 p-0.5 shadow-sm">
              <div className="w-full h-full bg-[#0b0c0e] rounded-[10px] flex items-center justify-center">
                <Globe className="w-4 h-4 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">You.com (u.com) Medical Intelligence</h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                  MCP & REST API
                </span>
                {mcpInfo?.status?.mcpHealthy && (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 rounded">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online ({mcpInfo.status.mcpPingMs}ms)
                  </span>
                )}
              </div>
              <p className={`text-xs ${isDarkTheme ? 'text-neutral-400' : 'text-slate-500'}`}>
                Query live web evidence, clinical trials, and configure You.com's Model Context Protocol (MCP) server
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Navigation */}
            <div className={`flex rounded-lg p-1 border text-xs font-medium ${isDarkTheme ? 'bg-neutral-900 border-neutral-800' : 'bg-slate-200/80 border-slate-300'}`}>
              <button
                onClick={() => setActiveTab('search')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'search'
                    ? isDarkTheme
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : isDarkTheme
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Search className="w-3.5 h-3.5 text-sky-400" />
                <span>Search & Answer</span>
              </button>
              <button
                onClick={() => setActiveTab('mcp_setup')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                  activeTab === 'mcp_setup'
                    ? isDarkTheme
                      ? 'bg-neutral-800 text-white shadow-xs'
                      : 'bg-white text-slate-900 shadow-xs'
                    : isDarkTheme
                    ? 'text-neutral-400 hover:text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Server className="w-3.5 h-3.5 text-amber-400" />
                <span>MCP & API Setup Hub</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className={`p-2 rounded-lg border transition-colors ${
                isDarkTheme
                  ? 'border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white'
                  : 'border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        {activeTab === 'search' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Search Input Bar */}
            <div className="space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSearch(query, searchMode);
                }}
                className={`flex items-center gap-2 p-1.5 rounded-xl border transition-all ${
                  isDarkTheme
                    ? 'bg-[#131519] border-[#2e3138] focus-within:border-sky-500/80 shadow-inner'
                    : 'bg-slate-50 border-slate-300 focus-within:border-sky-500 shadow-sm'
                }`}
              >
                <div className="pl-3">
                  <Search className="w-4 h-4 text-sky-400" />
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a clinical question or search You.com web index..."
                  className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-1 placeholder:text-neutral-500"
                />

                {/* Mode Selector Toggle */}
                <div className="flex items-center gap-1 border-l pl-2 pr-1 border-neutral-700/60">
                  <button
                    type="button"
                    onClick={() => setSearchMode('answer')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded transition-all ${
                      searchMode === 'answer'
                        ? 'bg-amber-400 text-black font-semibold shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>AI Answer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode('search')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-medium rounded transition-all ${
                      searchMode === 'search'
                        ? 'bg-sky-500 text-white font-semibold shadow-xs'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>Web Search</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold tracking-wider transition-all flex items-center gap-1.5 shadow-md shrink-0 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <span>Search</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Preset Queries */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
                <span className="text-neutral-500 shrink-0 font-medium mr-1">SUGGESTIONS:</span>
                {PRESET_QUERIES.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(preset);
                      handleSearch(preset, searchMode);
                    }}
                    className={`px-2.5 py-1 rounded-md border whitespace-nowrap transition-colors ${
                      isDarkTheme
                        ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-800 hover:border-neutral-600'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Results Header & Stats */}
            {searchData && (
              <div className="flex items-center justify-between border-b pb-2 pt-1 border-neutral-800/80 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-neutral-200">
                    Found {searchData.count} results for <span className="text-sky-400">"{searchData.query}"</span>
                  </span>
                  <span className="text-neutral-500 font-mono text-[11px]">
                    Latency: {searchData.latencyMs}ms · Source: {searchData.source === 'you_rest_api' ? 'REST API (ydc-index.io)' : 'Hosted MCP Profile (api.you.com/mcp)'}
                  </span>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1 text-[11px] font-mono">
                  {(['all', 'trials', 'biochem', 'cad'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2 py-0.5 rounded border uppercase transition-colors ${
                        filterCategory === cat
                          ? 'bg-sky-500/20 text-sky-300 border-sky-500/50 font-bold'
                          : 'text-neutral-400 hover:text-neutral-200 border-transparent hover:border-neutral-700'
                      }`}
                    >
                      {cat === 'all' ? 'All' : cat === 'trials' ? 'Clinical Trials' : cat === 'biochem' ? 'Biochemistry' : 'CAD & Fluids'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Synthesized Answer Box (when mode === 'answer' or answer present) */}
            {searchData?.answer && (
              <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-neutral-900/90 to-neutral-950 p-4 shadow-lg space-y-2">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-widest">
                      Synthesized Medical Answer (You.com + Clinical LLM)
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopy(searchData.answer || '', 'ai_answer')}
                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-neutral-400 hover:text-white rounded border border-neutral-800 hover:border-neutral-700 transition-colors"
                  >
                    {copiedKey === 'ai_answer' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'ai_answer' ? 'Copied' : 'Copy Synthesis'}</span>
                  </button>
                </div>
                <div className="text-sm font-sans text-neutral-200 leading-relaxed whitespace-pre-line">
                  {searchData.answer}
                </div>
              </div>
            )}

            {/* Results List */}
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-neutral-400">
                <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
                <p className="text-sm font-mono tracking-wider">Querying You.com Search & MCP index...</p>
              </div>
            ) : filteredResults.length > 0 ? (
              <div className="space-y-3">
                {filteredResults.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all hover:border-neutral-600 ${
                      isDarkTheme
                        ? 'bg-[#121316] border-[#22242a] hover:bg-[#16181d]'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1">
                        {/* Domain & Date Badge */}
                        <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
                          {item.favicon ? (
                            <img src={item.favicon} alt="" className="w-3.5 h-3.5 rounded-xs" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-neutral-500" />
                          )}
                          <span className="font-semibold text-neutral-300">{item.domain}</span>
                          {item.pageAge && (
                            <>
                              <span className="text-neutral-600">·</span>
                              <span className="flex items-center gap-1 text-neutral-500">
                                <Clock className="w-3 h-3" />
                                {new Date(item.pageAge).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Title */}
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-semibold text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1.5 group"
                        >
                          <span>{item.title}</span>
                          <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
                        </a>

                        {/* Description */}
                        <p className={`text-xs leading-relaxed ${isDarkTheme ? 'text-neutral-300' : 'text-slate-600'}`}>
                          {item.description}
                        </p>

                        {/* Highlights Snippets */}
                        {item.highlights && item.highlights.length > 0 && (
                          <div className={`mt-2 p-2.5 rounded-lg text-xs font-mono leading-relaxed border ${
                            isDarkTheme ? 'bg-neutral-950/70 border-neutral-800 text-neutral-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}>
                            <span className="text-amber-400/90 font-bold block mb-1 text-[10px] tracking-wider uppercase">
                              Extracted Evidence Highlight:
                            </span>
                            {item.highlights.slice(0, 2).map((h, hIdx) => (
                              <p key={hIdx} className="line-clamp-2 mb-1 last:mb-0">
                                "{h.replace(/^#+\s*/g, '')}"
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-1.5 shrink-0 pt-1">
                        <button
                          onClick={() => handleCopy(`[${item.title}](${item.url}): ${item.description}`, `res_${idx}`)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono border rounded hover:bg-neutral-800 text-neutral-300 border-neutral-700 transition-colors"
                          title="Copy reference citation"
                        >
                          {copiedKey === `res_${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === `res_${idx}` ? 'Copied' : 'Cite'}</span>
                        </button>

                        {onApplyDrugSearch && (
                          <button
                            onClick={() => {
                              onApplyDrugSearch(item.title);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-mono bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:bg-amber-500/25 rounded transition-colors"
                            title="Load terms into Drug Simulator"
                          >
                            <FlaskConical className="w-3 h-3 text-amber-400" />
                            <span>Simulate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : searchData ? (
              <div className="py-16 text-center text-neutral-400">
                <p className="text-sm font-mono">No matching results found for this category filter.</p>
              </div>
            ) : null}
          </div>
        ) : (
          /* MCP & API Setup Hub Tab */
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            {/* Overview Banner */}
            <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                <Server className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-neutral-100">
                  You.com (u.com) Architecture: Model Context Protocol (MCP) & REST API
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  You.com provides two unified integration avenues: <strong>Hosted MCP Servers</strong> (enabling LLM coding agents like Claude Code, Cursor, and VS Code to natively invoke web search as an autonomous tool) and standard <strong>REST APIs</strong> (for direct programmatic search and AI answer generation).
                </p>
              </div>
            </div>

            {/* Architecture Comparison Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-neutral-800 bg-[#121316] space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-sm text-neutral-100">1. Model Context Protocol (MCP)</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                    Active & Zero-Key Supported
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  MCP is an open standard that allows AI assistants (Claude, Cursor, Copilot) to automatically query You.com's web search tool (<code className="text-amber-400">you-search</code>) during live generation.
                </p>
                <div className="text-xs font-mono space-y-1.5 bg-neutral-950 p-2.5 rounded border border-neutral-800">
                  <div className="text-neutral-500">Free Profile Endpoint (Keyless):</div>
                  <div className="text-sky-400 select-all font-semibold">https://api.you.com/mcp?profile=free</div>
                  <div className="text-neutral-500 mt-2">Tools Provided:</div>
                  <div className="text-neutral-300">• you-search (Web search & highlights)</div>
                  <div className="text-neutral-300">• you-discover (Emerging research trends)</div>
                  <div className="text-neutral-300">• you-contents (Clean URL markdown extractor)</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-neutral-800 bg-[#121316] space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-sky-400" />
                    <span className="font-bold text-sm text-neutral-100">2. Programmatic REST API</span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-sky-950 text-sky-300 border border-sky-800 rounded">
                    YDC Index API
                  </span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  For high-throughput server backends, You.com's YDC Index REST API provides direct web search, verified answer generation with citations, and URL scraping via API keys.
                </p>
                <div className="text-xs font-mono space-y-1.5 bg-neutral-950 p-2.5 rounded border border-neutral-800">
                  <div className="text-neutral-500">Primary Endpoints:</div>
                  <div className="text-neutral-300">POST https://ydc-index.io/v1/search</div>
                  <div className="text-neutral-300">POST https://ydc-index.io/v1/answer</div>
                  <div className="text-neutral-300">POST https://ydc-index.io/v1/contents</div>
                  <div className="text-neutral-500 mt-1">Auth Header:</div>
                  <div className="text-emerald-400">X-API-Key: YOUR_YOU_API_KEY</div>
                </div>
              </div>
            </div>

            {/* How to Add You.com MCP to Your Agent / IDE */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-neutral-200 tracking-wider uppercase font-mono flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                Client Setup Configurations (One-Click Copy)
              </h4>

              {/* Claude Code CLI Setup */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-[#121316] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 font-mono">Claude Code CLI</span>
                  <button
                    onClick={() => handleCopy('claude mcp add --transport http youdotcom "https://api.you.com/mcp?profile=free"', 'claude_cli')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-neutral-300 transition-colors"
                  >
                    {copiedKey === 'claude_cli' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'claude_cli' ? 'Copied' : 'Copy Command'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-neutral-950 rounded-lg text-xs font-mono text-amber-300 overflow-x-auto border border-neutral-800">
                  claude mcp add --transport http youdotcom "https://api.you.com/mcp?profile=free"
                </pre>
              </div>

              {/* Cursor IDE Configuration */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-[#121316] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 font-mono">Cursor IDE (.cursor/mcp.json)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        JSON.stringify(
                          {
                            mcpServers: {
                              youDotCom: {
                                url: 'https://api.you.com/mcp?profile=free',
                              },
                            },
                          },
                          null,
                          2
                        ),
                        'cursor_mcp'
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-neutral-300 transition-colors"
                  >
                    {copiedKey === 'cursor_mcp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'cursor_mcp' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-neutral-950 rounded-lg text-xs font-mono text-sky-300 overflow-x-auto border border-neutral-800">
{`{
  "mcpServers": {
    "youDotCom": {
      "url": "https://api.you.com/mcp?profile=free"
    }
  }
}`}
                </pre>
              </div>

              {/* Node.js / TypeScript App Integration */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-[#121316] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-200 font-mono">Node.js / Express Backend Proxy (/api/you/search)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        `// Query You.com via MCP JSON-RPC\nconst res = await fetch('https://api.you.com/mcp?profile=free', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },\n  body: JSON.stringify({\n    jsonrpc: '2.0',\n    id: 1,\n    method: 'tools/call',\n    params: { name: 'you-search', arguments: { query: 'pulmonary embolism tPA' } }\n  })\n});`,
                        'node_snippet'
                      )
                    }
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 rounded text-neutral-300 transition-colors"
                  >
                    {copiedKey === 'node_snippet' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'node_snippet' ? 'Copied' : 'Copy Code'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-neutral-950 rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-neutral-800">
{`// Already integrated in this application's server.ts:
const res = await fetch('/api/you/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'pulmonary embolism tPA tenecteplase', mode: 'answer' })
});
const data = await res.json();
console.log(data.answer, data.results);`}
                </pre>
              </div>

              {/* Environment Variable Setup */}
              <div className="p-4 rounded-xl border border-neutral-800 bg-[#121316] space-y-2">
                <span className="text-xs font-bold text-neutral-200 font-mono block">Environment Key Setup (.env)</span>
                <p className="text-xs text-neutral-400">
                  To enable authenticated rate limits and direct Answer API synthesis, add your API key from <a href="https://you.com/platform" target="_blank" rel="noopener noreferrer" className="text-sky-400 underline">you.com/platform</a>:
                </p>
                <pre className="p-2.5 bg-neutral-950 rounded text-xs font-mono text-neutral-300 border border-neutral-800">
                  YOU_API_KEY="your_api_key_here"
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between text-xs font-mono shrink-0 ${
          isDarkTheme ? 'border-[#22242a] bg-[#101216] text-neutral-400' : 'border-slate-100 bg-slate-50 text-slate-500'
        }`}>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Real-Time Web Provenance</span>
            </span>
            <span className="text-neutral-600">|</span>
            <span>You.com MCP Free Profile Active</span>
          </div>

          <button
            onClick={fetchMcpInfo}
            disabled={statusLoading}
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
            <span>Diagnostic Ping</span>
          </button>
        </div>
      </div>
    </div>
  );
};
