/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { X, Search, ExternalLink, History, ShieldAlert } from 'lucide-react';
import { ExplorerAnatomyId } from '../types/biomedical.ts';
import {
  EvidenceSourceMode,
  FederatedEvidenceItem,
  ResearchFederationResult,
} from '../types/federatedEvidence.ts';
import {
  formatVerificationStateLabel,
  researchFederationService,
} from '../services/researchFederationService.ts';
import {
  clearAllRecentSearches,
  deleteRecentSearch,
  getShortAnatomyCode,
  loadRecentSearches,
  RecentClinicalSearch,
  recordRecentSearch,
  XDC_RECENT_SEARCHES_KEY,
} from '../services/recentSearchesStorage.ts';
import { EXPLORER_ANATOMY_STRUCTURES } from '../data/explorerAnatomyData.ts';
import { EvidenceProvenancePanel } from './EvidenceProvenancePanel.tsx';

interface EnthalpyXdcSearchWindowProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStructureId: ExplorerAnatomyId;
  onSelectStructure: (id: ExplorerAnatomyId) => void;
  clotPathProgress: number;
  onSeekClotPath?: (progress: number) => void;
  isDarkTheme?: boolean;
}

const EVIDENCE_MODE_OPTIONS: Array<{ id: EvidenceSourceMode; label: string }> = [
  { id: 'all', label: 'All Evidence' },
  { id: 'off-chain', label: 'Off-Chain' },
  { id: 'on-chain', label: 'On-Chain' },
];

const QUICK_ENTITY_QUERIES = [
  'PLG / tPA Fibrin Cleavage',
  'D-Dimer Biomarker Correlation',
  'NT-proBNP RV Strain',
  'NAPQI CYP2E1 Toxicological Exposure',
  'Saddle Bifurcation Anomaly',
];

export const EnthalpyXdcSearchWindow: React.FC<EnthalpyXdcSearchWindowProps> = ({
  isOpen,
  onClose,
  selectedStructureId,
  onSelectStructure,
  clotPathProgress,
  onSeekClotPath,
  isDarkTheme = true,
}) => {
  const currentStructure =
    EXPLORER_ANATOMY_STRUCTURES[selectedStructureId] ||
    EXPLORER_ANATOMY_STRUCTURES.pulmonaryArtery;

  const [queryInput, setQueryInput] = useState('');
  const [evidenceSourceMode, setEvidenceSourceMode] = useState<EvidenceSourceMode>('on-chain');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ResearchFederationResult | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<FederatedEvidenceItem | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentClinicalSearch[]>(() =>
    loadRecentSearches(XDC_RECENT_SEARCHES_KEY)
  );

  // Close popup on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const executeSearch = async (
    rawQuery: string,
    overrides?: {
      mode?: EvidenceSourceMode;
      anatomyId?: ExplorerAnatomyId;
      anatomyLabel?: string;
      clotProgress?: number;
    }
  ) => {
    const trimmed = rawQuery.trim();
    if (!trimmed || isLoading) return;

    const targetMode = overrides?.mode ?? evidenceSourceMode;
    const targetAnatomyId = overrides?.anatomyId ?? selectedStructureId;
    const targetAnatomyLabel = overrides?.anatomyLabel ?? currentStructure.label;
    const targetClotProgress = overrides?.clotProgress ?? clotPathProgress;

    const updatedHistory = recordRecentSearch(
      {
        query: trimmed,
        anatomyId: targetAnatomyId,
        anatomyLabel: targetAnatomyLabel,
        clotPathProgress: targetClotProgress,
        mode: targetMode,
      },
      XDC_RECENT_SEARCHES_KEY
    );
    setRecentSearches(updatedHistory);
    setQueryInput(trimmed);
    setIsLoading(true);
    setSelectedEvidence(null);

    try {
      const federated = await researchFederationService.searchFederatedEvidence({
        query: trimmed,
        anatomyId: targetAnatomyId,
        anatomyLabel: targetAnatomyLabel,
        mode: targetMode,
      });
      setResult(federated);
      if (federated.evidenceItems.length > 0) {
        setSelectedEvidence(federated.evidenceItems[0]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Run an initial contextual blockchain query automatically on first open if empty
  useEffect(() => {
    if (isOpen && !result && !isLoading) {
      void executeSearch(`${currentStructure.label} PE biomarkers`, {
        mode: evidenceSourceMode,
        anatomyId: selectedStructureId,
        anatomyLabel: currentStructure.label,
        clotProgress: clotPathProgress,
      });
    }
  }, [isOpen]);

  const handleRevisitRecentSearch = (entry: RecentClinicalSearch) => {
    if (isLoading) return;
    setEvidenceSourceMode(entry.mode);
    if (entry.anatomyId !== selectedStructureId) {
      onSelectStructure(entry.anatomyId);
    }
    if (onSeekClotPath && Number.isFinite(entry.clotPathProgress)) {
      onSeekClotPath(entry.clotPathProgress);
    }
    const anatomyLabel =
      EXPLORER_ANATOMY_STRUCTURES[entry.anatomyId]?.label || entry.anatomyLabel;
    void executeSearch(entry.query, {
      mode: entry.mode,
      anatomyId: entry.anatomyId,
      anatomyLabel,
      clotProgress: entry.clotPathProgress,
    });
  };

  if (!isOpen) return null;

  // Strictly black-and-white wireframe tokens paired with app's dark/light base
  const windowShell = isDarkTheme
    ? 'bg-[#090a0d] text-white border-white/40 shadow-2xl shadow-black/90'
    : 'bg-white text-black border-black/50 shadow-2xl shadow-black/25';
  const subBar = isDarkTheme
    ? 'bg-[#101216] border-white/20'
    : 'bg-neutral-50 border-black/20';
  const mutedText = isDarkTheme ? 'text-neutral-400' : 'text-neutral-600';
  const wireframeBorder = isDarkTheme ? 'border-white/25' : 'border-black/25';
  const inverseButton = isDarkTheme
    ? 'bg-white text-black border-white hover:bg-neutral-200'
    : 'bg-black text-white border-black hover:bg-neutral-800';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ENTHALPY x XDC Blockchain Research Search Window"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-5xl h-[86vh] max-h-[820px] border flex flex-col overflow-hidden ${windowShell}`}
      >
        {/* Top Window Header */}
        <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${subBar}`}>
          <div className="min-w-0 flex flex-wrap items-center gap-2">
            <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-widest">
              ENTHALPY × XDC // BLOCKCHAIN RESEARCH SEARCH
            </span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${wireframeBorder}`}>
              MOCK / SIMULATED SUBNET
            </span>
            <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 border ${wireframeBorder} ${mutedText}`}>
              SCOPE: {currentStructure.label} · {Math.round(clotPathProgress * 100)}% CLOT PATH
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close blockchain search window (Esc)"
            className={`px-2 py-1 border text-xs font-mono uppercase inline-flex items-center gap-1 transition-colors shrink-0 ${
              isDarkTheme
                ? 'border-white/30 text-neutral-200 hover:bg-white hover:text-black'
                : 'border-black/30 text-neutral-800 hover:bg-black hover:text-white'
            }`}
          >
            <X className="w-3.5 h-3.5" />
            <span>Close</span>
          </button>
        </div>

        {/* Search Input + 3-Mode Selector + Quick Entities + Recent Searches */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void executeSearch(queryInput);
          }}
          className={`p-3.5 border-b space-y-2.5 shrink-0 ${subBar}`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className={`w-4 h-4 absolute left-3 pointer-events-none ${mutedText}`} />
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Search disease, protein, biomarker, toxicological exposure, or anomaly..."
                disabled={isLoading}
                className={`w-full pl-9 pr-3 py-2 text-sm border outline-none font-sans transition-colors ${
                  isDarkTheme
                    ? 'bg-black border-white/30 text-white placeholder-neutral-500 focus:border-white'
                    : 'bg-white border-black/30 text-black placeholder-neutral-400 focus:border-black'
                }`}
              />
            </div>

            {/* Three-mode Evidence Source Selector */}
            <div
              role="group"
              aria-label="Blockchain window evidence source selector"
              className={`inline-flex border shrink-0 ${wireframeBorder} ${
                isDarkTheme ? 'bg-black' : 'bg-white'
              }`}
            >
              {EVIDENCE_MODE_OPTIONS.map((opt) => {
                const active = evidenceSourceMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEvidenceSourceMode(opt.id)}
                    className={`px-2.5 py-2 text-[11px] font-mono uppercase tracking-wide transition-colors ${
                      active
                        ? isDarkTheme
                          ? 'bg-white text-black font-bold'
                          : 'bg-black text-white font-bold'
                        : isDarkTheme
                        ? 'text-neutral-300 hover:bg-white/10'
                        : 'text-neutral-700 hover:bg-black/5'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={isLoading || !queryInput.trim()}
              className={`px-4 py-2 border text-xs font-mono font-bold uppercase tracking-wider transition-colors disabled:opacity-40 shrink-0 ${inverseButton}`}
            >
              {isLoading ? 'Querying...' : 'Search'}
            </button>
          </div>

          {/* Quick Entity Queries */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`text-[10px] font-mono uppercase tracking-wider mr-1 ${mutedText}`}>
              Entities:
            </span>
            {QUICK_ENTITY_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isLoading}
                onClick={() => void executeSearch(q)}
                className={`px-2 py-0.5 border text-[11px] font-mono transition-colors ${
                  isDarkTheme
                    ? 'border-white/20 text-neutral-300 hover:border-white hover:bg-white hover:text-black'
                    : 'border-black/20 text-neutral-700 hover:border-black hover:bg-black hover:text-white'
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          {/* LocalStorage-Backed Recent Blockchain Searches */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-dashed border-current/15">
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase ${mutedText}`}>
                <History className="w-3 h-3" />
                <span>Recent:</span>
              </span>
              {recentSearches.map((entry) => {
                const clotPct = Math.round(entry.clotPathProgress * 100);
                const modeTag =
                  entry.mode === 'on-chain' ? 'ON' : entry.mode === 'off-chain' ? 'OFF' : 'ALL';
                return (
                  <div
                    key={entry.id}
                    className={`inline-flex items-center border text-[11px] ${
                      isDarkTheme
                        ? 'border-white/25 bg-black/50 text-neutral-200'
                        : 'border-black/25 bg-white text-neutral-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleRevisitRecentSearch(entry)}
                      disabled={isLoading}
                      className="px-2 py-0.5 flex items-center gap-1.5 hover:underline"
                    >
                      <span className="truncate max-w-[160px]">{entry.query}</span>
                      <span className={`text-[9px] font-mono uppercase ${mutedText}`}>
                        {getShortAnatomyCode(entry.anatomyId)}·{clotPct}%·{modeTag}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRecentSearches(deleteRecentSearch(entry.id, XDC_RECENT_SEARCHES_KEY))
                      }
                      aria-label={`Remove ${entry.query}`}
                      className={`px-1 py-0.5 border-l ${
                        isDarkTheme
                          ? 'border-white/15 hover:bg-white hover:text-black'
                          : 'border-black/15 hover:bg-black hover:text-white'
                      }`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setRecentSearches(clearAllRecentSearches(XDC_RECENT_SEARCHES_KEY))}
                className={`text-[10px] font-mono uppercase underline underline-offset-2 ml-auto ${mutedText}`}
              >
                Clear
              </button>
            </div>
          )}
        </form>

        {/* Main Split Content: Left = Results List, Right = Compact Wireframe Provenance */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Pane: Federated Results */}
          <div className="lg:col-span-7 h-full overflow-y-auto p-3.5 space-y-3 border-b lg:border-b-0 lg:border-r border-current/15">
            {result?.isEmergencyPrompt && result.emergencyNotice && (
              <div className="p-3 border border-red-500/60 bg-red-500/10 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-red-400 mb-1">
                  <ShieldAlert className="w-4 h-4" />
                  <span>URGENT MEDICAL NOTICE</span>
                </div>
                <p>{result.emergencyNotice}</p>
              </div>
            )}

            {isLoading && (
              <div className={`p-4 border text-xs font-mono ${subBar}`}>
                Executing {evidenceSourceMode.toUpperCase()} query across shared research federation service...
              </div>
            )}

            {!isLoading && result && (
              <>
                <div className={`p-3 border text-xs space-y-1.5 ${subBar}`}>
                  <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase">
                    <span>{result.apiProvider}</span>
                    <span>{result.evidenceItems.length} RECORD(S)</span>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-line">{result.answer}</p>
                </div>

                <div className="space-y-2">
                  {result.evidenceItems.map((ev, i) => {
                    const isSelected = selectedEvidence?.id === ev.id;
                    return (
                      <div
                        key={ev.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedEvidence(ev)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedEvidence(ev);
                          }
                        }}
                        className={`p-3 border text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? isDarkTheme
                              ? 'bg-white text-black border-white'
                              : 'bg-black text-white border-black'
                            : isDarkTheme
                            ? 'bg-[#0e1014] hover:bg-[#16181f] border-white/25 text-neutral-100'
                            : 'bg-white hover:bg-neutral-100 border-black/25 text-neutral-900'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex items-start gap-1.5">
                            <span
                              className={`text-[10px] font-mono px-1 py-0.5 border shrink-0 ${
                                isSelected
                                  ? isDarkTheme
                                    ? 'border-black/40 text-black'
                                    : 'border-white/40 text-white'
                                  : wireframeBorder
                              }`}
                            >
                              [{i + 1}]
                            </span>
                            <span className="text-[13px] font-semibold leading-snug">{ev.title}</span>
                          </div>
                          {ev.url && (
                            <a
                              href={ev.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              title="Open external source URL"
                              className="p-0.5 opacity-75 hover:opacity-100 shrink-0"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-1 mt-2 font-mono text-[10px] uppercase">
                          <span
                            className={`px-1.5 py-0.5 border ${
                              isSelected
                                ? isDarkTheme
                                  ? 'border-black/45 text-black'
                                  : 'border-white/45 text-white'
                                : isDarkTheme
                                ? 'border-white/45 text-white'
                                : 'border-black/45 text-black'
                            }`}
                          >
                            {ev.channel === 'on-chain' ? 'ON-CHAIN' : 'OFF-CHAIN'}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 border ${
                              isSelected
                                ? isDarkTheme
                                  ? 'border-black/35 text-black'
                                  : 'border-white/35 text-white'
                                : wireframeBorder
                            }`}
                          >
                            {formatVerificationStateLabel(ev.verificationState)}
                          </span>
                          {ev.isMock && (
                            <span
                              className={`px-1.5 py-0.5 border ${
                                isSelected
                                  ? isDarkTheme
                                    ? 'border-black/35 text-black'
                                    : 'border-white/35 text-white'
                                  : wireframeBorder
                              }`}
                            >
                              MOCK
                            </span>
                          )}
                        </div>

                        <div
                          className={`mt-2 pt-1.5 border-t grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] font-mono ${
                            isSelected
                              ? isDarkTheme
                                ? 'border-black/20 text-neutral-800'
                                : 'border-white/20 text-neutral-200'
                              : isDarkTheme
                              ? 'border-white/15 text-neutral-400'
                              : 'border-black/15 text-neutral-600'
                          }`}
                        >
                          <div className="truncate">
                            <span className="uppercase opacity-75">Source: </span>
                            <span>{ev.evidenceSource}</span>
                          </div>
                          <div className="truncate">
                            <span className="uppercase opacity-75">Assoc: </span>
                            <span>{ev.associationType}</span>
                          </div>
                          <div className="truncate sm:col-span-2">
                            <span className="uppercase opacity-75">Term: </span>
                            <span>{ev.researchTerminology}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Right Pane: Compact Evidence-Provenance Inspector */}
          <div className="lg:col-span-5 h-full p-3.5 overflow-hidden">
            <EvidenceProvenancePanel
              item={selectedEvidence}
              onClose={() => setSelectedEvidence(null)}
              layoutMode="pane"
              isDarkTheme={isDarkTheme}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
