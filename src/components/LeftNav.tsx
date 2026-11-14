/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Glasses,
  Info,
  RotateCcw,
  Sun,
  Moon,
  Sparkles,
  Layers,
  Route,
  ChevronLeft,
  ChevronRight,
  Compass,
  Heart,
  Droplet,
  Wind,
  Box,
  Stethoscope,
  Blocks,
} from 'lucide-react';
import { ScaleLevel, ExplorerAnatomyId } from '../types/biomedical.ts';
import { EXPLORER_ANATOMY_STRUCTURES } from '../data/explorerAnatomyData.ts';

export interface LeftNavProps {
  currentScale: ScaleLevel;
  onSelectScale: (scale: ScaleLevel) => void;
  selectedStructureId: ExplorerAnatomyId;
  onSelectStructure: (id: ExplorerAnatomyId) => void;
  onOpenProvenance: () => void;
  onResetCamera: () => void;
  onToggleXR: () => void;
  isXRSupported: boolean;
  isXRSessionActive?: boolean;
  isWebXRPanelOpen?: boolean;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onToggleExplainPanel: () => void;
  isExplainPanelOpen: boolean;
  onToggleClotPath: () => void;
  isClotPathActive: boolean;
  onTogglePatientContext: () => void;
  isPatientContextOpen: boolean;
  onOpenBlockchainSearch: () => void;
  isBlockchainSearchOpen: boolean;
  onOpenXdcNetwork: () => void;
}

export const LeftNav: React.FC<LeftNavProps> = ({
  currentScale,
  onSelectScale,
  selectedStructureId,
  onSelectStructure,
  onOpenProvenance,
  onResetCamera,
  onToggleXR,
  isXRSupported,
  isXRSessionActive = false,
  isWebXRPanelOpen = false,
  isDarkTheme,
  onToggleTheme,
  onToggleExplainPanel,
  isExplainPanelOpen,
  onToggleClotPath,
  isClotPathActive,
  onTogglePatientContext,
  isPatientContextOpen,
  onOpenBlockchainSearch,
  isBlockchainSearchOpen,
  onOpenXdcNetwork,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const scaleTabs: { id: ScaleLevel; label: string; metric: string }[] = [
    { id: 'thoracic', label: 'Thoracic System', metric: '30 cm' },
    { id: 'vessel', label: 'Artery Cutaway', metric: '8 mm' },
    { id: 'clot', label: 'Thrombus Body', metric: '4 mm' },
    { id: 'microscopic', label: 'Fibrin Matrix', metric: '50 µm' },
  ];

  const anatomyIcons: Record<ExplorerAnatomyId, React.ReactNode> = {
    deepVeins: <Droplet className="w-3.5 h-3.5 text-blue-400 shrink-0" />,
    heart: <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />,
    pulmonaryArtery: <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />,
    lungs: <Wind className="w-3.5 h-3.5 text-sky-400 shrink-0" />,
  };

  return (
    <nav
      className={`fixed top-0 left-0 bottom-0 z-30 flex flex-col border-r select-none transition-all duration-300 backdrop-blur-xl ${
        isCollapsed ? 'w-16' : 'w-64'
      } ${
        isDarkTheme
          ? 'bg-[#0a0b0e]/95 border-[#22242c] text-white shadow-2xl shadow-black/80'
          : 'bg-white/95 border-slate-300 text-slate-900 shadow-xl shadow-slate-200/60'
      }`}
    >
      {/* 1. Header */}
      <div
        className={`p-3.5 border-b flex items-center justify-between shrink-0 ${
          isDarkTheme ? 'border-[#1f2129]' : 'border-slate-200'
        }`}
      >
        {!isCollapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-base font-bold tracking-tight truncate leading-tight">
              Embolism Explorer
            </span>
            <span className="text-xs text-slate-400 truncate leading-tight font-mono mt-0.5">
              Disease POV • PE
            </span>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
          className={`p-1.5 rounded-md transition-colors ${
            isCollapsed ? 'mx-auto' : ''
          } ${
            isDarkTheme
              ? 'hover:bg-neutral-800 text-slate-400 hover:text-white'
              : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* 2. Disease POV Controls */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4">
        {/* Disease Progression Landmarks (4 Core PE Structures) */}
        <div className="space-y-1.5">
          {!isCollapsed && (
            <div className="px-2 py-0.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400" />
                Disease Stages
              </span>
              <span className="text-[11px] text-sky-400 font-bold">PE Path</span>
            </div>
          )}

          {(['deepVeins', 'heart', 'pulmonaryArtery', 'lungs'] as ExplorerAnatomyId[]).map((id) => {
            const struct = EXPLORER_ANATOMY_STRUCTURES[id];
            const isSelected = selectedStructureId === id;
            return (
              <button
                key={id}
                onClick={() => onSelectStructure(id)}
                title={`${struct.label} (${struct.sublabel})`}
                className={`w-full text-left rounded-lg text-sm transition-all border flex items-center ${
                  isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2 justify-between gap-2'
                } ${
                  isSelected
                    ? isDarkTheme
                      ? 'bg-sky-500/20 text-white border-sky-400 font-bold shadow-xs'
                      : 'bg-sky-50 text-sky-950 border-sky-400 font-bold shadow-xs'
                    : isDarkTheme
                    ? 'bg-[#121318] text-slate-200 border-transparent hover:border-[#262832] hover:bg-[#181920]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {anatomyIcons[id]}
                  {!isCollapsed && <span className="truncate">{struct.label}</span>}
                </div>
                {!isCollapsed && isSelected && (
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Educational Layer & Animation */}
        <div className="space-y-1.5 pt-2.5 border-t border-slate-700/30">
          {!isCollapsed && (
            <div className="px-2 py-0.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Agnostic Learning
            </div>
          )}

          <button
            onClick={onToggleExplainPanel}
            title="Open 'Explain this view' cited learning layer & D3 hemodynamics"
            className={`w-full text-left rounded-lg text-sm font-semibold transition-all border flex items-center ${
              isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2 justify-between gap-2'
            } ${
              isExplainPanelOpen
                ? 'bg-sky-500 text-black border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)]'
                : isDarkTheme
                ? 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-500/30'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className={`w-4 h-4 shrink-0 ${isExplainPanelOpen ? 'text-black' : 'text-sky-400'}`} />
              {!isCollapsed && <span className="truncate">Explain View</span>}
            </div>
            {!isCollapsed && (
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                  isExplainPanelOpen ? 'bg-black/20 text-black' : 'bg-sky-500/30 text-sky-300'
                }`}
              >
                You.com
              </span>
            )}
          </button>

          <button
            onClick={onToggleClotPath}
            title="Toggle Clot Path Animation Bar (DVT to PE)"
            className={`w-full text-left rounded-lg text-sm font-semibold transition-all border flex items-center ${
              isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2 justify-between gap-2'
            } ${
              isClotPathActive
                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-[0_0_12px_rgba(251,191,36,0.35)]'
                : isDarkTheme
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Route className={`w-4 h-4 shrink-0 ${isClotPathActive ? 'text-black' : 'text-amber-400'}`} />
              {!isCollapsed && <span className="truncate">Clot Path Bar</span>}
            </div>
            {!isCollapsed && (
              <span
                className={`text-[11px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                  isClotPathActive ? 'bg-black/20 text-black' : 'bg-amber-500/30 text-amber-300'
                }`}
              >
                DVT→PE
              </span>
            )}
          </button>

          <button
            onClick={onTogglePatientContext}
            aria-pressed={isPatientContextOpen}
            title="Toggle Patient Clinical Context card for current clot stage"
            className={`w-full text-left rounded-lg text-sm font-semibold transition-all border flex items-center ${
              isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2 justify-between gap-2'
            } ${
              isPatientContextOpen
                ? 'bg-emerald-500 text-black border-emerald-400 font-bold shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                : isDarkTheme
                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Stethoscope
                className={`w-4 h-4 shrink-0 ${
                  isPatientContextOpen ? 'text-black' : 'text-emerald-400'
                }`}
              />
              {!isCollapsed && <span className="truncate">Patient Clinical Context</span>}
            </div>
          </button>

          <button
            onClick={onOpenBlockchainSearch}
            aria-pressed={isBlockchainSearchOpen}
            title="Open ENTHALPY × XDC Blockchain Research Search in a separate popup window"
            className={`w-full text-left text-sm font-semibold transition-all border flex items-center ${
              isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2 justify-between gap-2'
            } ${
              isBlockchainSearchOpen
                ? isDarkTheme
                  ? 'bg-white text-black border-white font-bold'
                  : 'bg-black text-white border-black font-bold'
                : isDarkTheme
                ? 'bg-[#101216] hover:bg-[#171920] text-neutral-100 border-white/25'
                : 'bg-white hover:bg-neutral-100 text-neutral-900 border-black/30'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <Blocks className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate font-mono text-xs uppercase">ENTHALPY × XDC</span>}
            </div>
            {!isCollapsed && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 border shrink-0 ${
                  isBlockchainSearchOpen
                    ? isDarkTheme
                      ? 'border-black/40 text-black'
                      : 'border-white/40 text-white'
                    : isDarkTheme
                    ? 'border-white/30 text-neutral-300'
                    : 'border-black/30 text-neutral-700'
                }`}
              >
                Search ↗
              </span>
            )}
          </button>
        </div>

        {/* Disease Spatial Scale */}
        <div className="space-y-1.5 pt-2.5 border-t border-slate-700/30">
          {!isCollapsed && (
            <div className="px-2 py-0.5 text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
              Anatomical Scale
            </div>
          )}

          {scaleTabs.map((tab) => {
            const isActive = currentScale === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectScale(tab.id)}
                title={`${tab.label} (${tab.metric})`}
                className={`w-full text-left rounded-lg text-sm transition-all border flex items-center ${
                  isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2 justify-between gap-2'
                } ${
                  isActive
                    ? isDarkTheme
                      ? 'bg-neutral-800 text-white border-neutral-600 font-bold shadow-xs'
                      : 'bg-slate-200 text-slate-900 border-slate-400 font-bold shadow-xs'
                    : isDarkTheme
                    ? 'bg-[#121318] text-slate-300 border-transparent hover:border-[#262832] hover:text-white'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Box className="w-4 h-4 text-slate-400 shrink-0" />
                  {!isCollapsed && <span className="truncate">{tab.label}</span>}
                </div>
                {!isCollapsed && (
                  <span className="text-xs font-mono text-slate-400 shrink-0">{tab.metric}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Educational Safety Note */}
        {!isCollapsed && (
          <div
            className={`p-3 rounded-xl border text-xs leading-relaxed ${
              isDarkTheme
                ? 'bg-[#121318] border-[#22242d] text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div className="font-bold text-amber-400 mb-0.5">Illustrative Disease Model</div>
            Not to scale and not patient-specific. General pathophysiology education only.
          </div>
        )}
      </div>

      {/* 3. Footer Utilities */}
      <div
        className={`p-2 border-t shrink-0 flex items-center justify-between gap-1 ${
          isDarkTheme ? 'border-[#1f2129] bg-[#0c0d11]' : 'border-slate-200 bg-slate-50'
        }`}
      >
        <button
          onClick={onResetCamera}
          title="Reset 3D View"
          className={`p-2 rounded-lg border transition-colors ${
            isDarkTheme
              ? 'hover:bg-neutral-800 text-slate-400 hover:text-white border-[#262832]'
              : 'hover:bg-slate-200 text-slate-600 border-slate-300'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleTheme}
          title={isDarkTheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className={`p-2 rounded-lg border transition-colors ${
            isDarkTheme
              ? 'hover:bg-neutral-800 text-slate-400 hover:text-white border-[#262832]'
              : 'hover:bg-slate-200 text-slate-600 border-slate-300'
          }`}
        >
          {isDarkTheme ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
        </button>

        <button
          onClick={onOpenProvenance}
          title="Model Provenance & Educational Disclaimer"
          className={`p-2 rounded-lg border transition-colors ${
            isDarkTheme
              ? 'hover:bg-neutral-800 text-slate-400 hover:text-white border-[#262832]'
              : 'hover:bg-slate-200 text-slate-600 border-slate-300'
          }`}
        >
          <Info className="w-3.5 h-3.5 text-[#b08d46]" />
        </button>

        <button
          onClick={onOpenXdcNetwork}
          title="XDC Network JSON-RPC & Provenance Verification"
          className={`p-2 rounded-lg border transition-colors ${
            isDarkTheme
              ? 'hover:bg-neutral-800 text-sky-400 hover:text-sky-300 border-[#262832]'
              : 'hover:bg-slate-200 text-sky-700 border-slate-300'
          }`}
        >
          <Blocks className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleXR}
          title={
            isXRSessionActive
              ? 'VR Session Active — Manage or Exit VR'
              : isXRSupported
              ? 'Enter VR & Open WebXR Diagnostics'
              : 'WebXR Fallback & Diagnostics'
          }
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap shadow-xs border ${
            isXRSessionActive
              ? 'bg-rose-500 text-white border-rose-400 hover:bg-rose-400'
              : isWebXRPanelOpen
              ? 'bg-sky-400 text-black border-sky-300'
              : 'text-black bg-[#e6b65c] border-[#d4a13f] hover:bg-[#f3ca76]'
          }`}
        >
          <Glasses className="w-3.5 h-3.5" />
          {!isCollapsed && <span>{isXRSessionActive ? 'VR Live' : isXRSupported ? 'Enter VR' : 'WebXR'}</span>}
        </button>
      </div>
    </nav>
  );
};
