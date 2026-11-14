/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Glasses,
  Info,
  RotateCcw,
  Activity,
  Sun,
  Moon,
  Sparkles,
  Dna,
  Image as ImageIcon,
  Film,
  Menu,
  Layers,
  Globe,
  Route,
  PlayCircle,
  BookOpen,
} from 'lucide-react';
import { ScaleLevel } from '../types/biomedical.ts';

interface HeaderNavProps {
  currentScale: ScaleLevel;
  onSelectScale: (scale: ScaleLevel) => void;
  onOpenProvenance: () => void;
  onResetCamera: () => void;
  onToggleXR: () => void;
  isXRSupported: boolean;
  isDarkTheme: boolean;
  onToggleTheme: () => void;
  onOpenBioTargets: () => void;
  onOpenImageStudio: () => void;
  onOpenVideoStudio: () => void;
  onOpenHamburger: () => void;
  onOpenFibrinInspector: () => void;
  onOpenYouSearch?: () => void;
  onToggleExplainPanel?: () => void;
  isExplainPanelOpen?: boolean;
  onToggleClotPath?: () => void;
  isClotPathActive?: boolean;
  activePresentationTitle?: string;
  activePresentationSub?: string;
  scaleLabels?: {
    microscopic: string;
    clot: string;
    vessel: string;
    thoracic: string;
  };
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentScale,
  onSelectScale,
  onOpenProvenance,
  onResetCamera,
  onToggleXR,
  isXRSupported,
  isDarkTheme,
  onToggleTheme,
  onOpenBioTargets,
  onOpenImageStudio,
  onOpenVideoStudio,
  onOpenHamburger,
  onOpenFibrinInspector,
  onOpenYouSearch,
  onToggleExplainPanel,
  isExplainPanelOpen = false,
  onToggleClotPath,
  isClotPathActive = false,
  activePresentationTitle = 'Embolism Explorer',
  activePresentationSub = '3D Medical Education • Pulmonary Embolism',
  scaleLabels,
}) => {
  const scaleTabs: { id: ScaleLevel; label: string; metric: string }[] = [
    {
      id: 'microscopic',
      label: scaleLabels?.microscopic || 'Microscopic Fibrin',
      metric: '50 µm',
    },
    {
      id: 'clot',
      label: scaleLabels?.clot || 'Clot Architecture',
      metric: '4 mm',
    },
    {
      id: 'vessel',
      label: scaleLabels?.vessel || 'Artery Cutaway',
      metric: '8 mm',
    },
    {
      id: 'thoracic',
      label: scaleLabels?.thoracic || 'Thoracic Organ',
      metric: '30 cm',
    },
    {
      id: 'industrialCutaway',
      label: 'Industrial CAD Cutaway',
      metric: 'Sketch A',
    },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 border-b select-none transition-colors ${
        isDarkTheme
          ? 'bg-[#080808]/90 border-[#2a2b2e] text-white'
          : 'bg-[#ebedf2]/90 border-slate-300 text-slate-900 shadow-sm backdrop-blur-md'
      }`}
    >
      {/* Zone 1: Hamburger Menu & Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Hamburger Menu Toggle Button */}
        <button
          onClick={onOpenHamburger}
          title="Open 3D Presentation Studio (Upload Body Parts)"
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${
            isDarkTheme
              ? 'bg-[#15161a] hover:bg-[#202227] border-[#deb35a]/40 text-[#deb35a]'
              : 'bg-white hover:bg-amber-50 border-amber-300 text-[#b08d46] shadow-xs'
          }`}
        >
          <Menu className="w-4 h-4" />
          <span className="text-xs font-bold hidden sm:inline">Body Parts</span>
        </button>

        <div className="flex flex-col">
          <span className="text-sm sm:text-base font-bold tracking-tight whitespace-nowrap leading-tight">
            {activePresentationTitle}
          </span>
          <span
            className={`text-[11px] whitespace-nowrap leading-tight ${
              isDarkTheme ? 'text-[#8a8f9d]' : 'text-slate-500'
            }`}
          >
            {activePresentationSub}
          </span>
        </div>
      </div>

      {/* Zone 2: Scale Navigation Tabs */}
      <nav
        className={`hidden lg:flex items-center gap-1 p-1 border rounded-lg ${
          isDarkTheme
            ? 'bg-[#131416] border-[#2a2b2e]'
            : 'bg-white border-slate-200'
        }`}
      >
        {scaleTabs.map((tab) => {
          const isActive = currentScale === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectScale(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                isActive
                  ? isDarkTheme
                    ? 'bg-[#202227] text-[#e6b65c] shadow-sm'
                    : 'bg-slate-100 text-[#b08d46] font-semibold shadow-sm'
                  : isDarkTheme
                  ? 'text-[#8a8f9d] hover:text-white hover:bg-[#1a1b1f]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[11px] font-mono text-slate-400">
                {tab.metric}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* "Explain This View" (Conversational Sourced Explainer) */}
        {onToggleExplainPanel && (
          <button
            onClick={onToggleExplainPanel}
            title="Open 'Explain this view' cited educational layer"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-sm ${
              isExplainPanelOpen
                ? 'bg-sky-500 text-black border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.5)]'
                : isDarkTheme
                ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isExplainPanelOpen ? 'text-black' : 'text-sky-400'}`} />
            <span className="whitespace-nowrap">Explain View</span>
            <span className={`text-[9px] font-mono px-1 py-0.2 rounded ${isExplainPanelOpen ? 'bg-black/20 text-black' : 'bg-sky-500/30 text-sky-300'}`}>
              Cited
            </span>
          </button>
        )}

        {/* Clot Trajectory Guide (DVT to PE Animation) */}
        {onToggleClotPath && (
          <button
            onClick={onToggleClotPath}
            title="Toggle Clot Path Animation (Leg DVT to Pulmonary Artery)"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
              isClotPathActive
                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-[0_0_12px_rgba(251,191,36,0.4)]'
                : isDarkTheme
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
            }`}
          >
            <Route className={`w-3.5 h-3.5 ${isClotPathActive ? 'text-black' : 'text-amber-400'}`} />
            <span className="hidden sm:inline">Clot Path</span>
          </button>
        )}

        {/* Industrial CAD Cutaway Mode (Sketch A) */}
        <button
          onClick={() => onSelectScale(currentScale === 'industrialCutaway' ? 'microscopic' : 'industrialCutaway')}
          title="Industrial Anatomy Simulation (Sketch A Cutaway)"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold tracking-wider uppercase border transition-all ${
            currentScale === 'industrialCutaway'
              ? 'bg-white text-black border-white shadow-[0_0_14px_rgba(255,255,255,0.4)]'
              : isDarkTheme
              ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700'
              : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">CAD Cutaway</span>
        </button>

        {/* You.com Search & MCP Intelligence */}
        {onOpenYouSearch && (
          <button
            onClick={onOpenYouSearch}
            title="Search You.com (u.com) & MCP Setup Hub"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-all shadow-xs ${
              isDarkTheme
                ? 'bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border-sky-400/40 shadow-[0_0_10px_rgba(56,189,248,0.15)]'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-300 shadow-xs'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span className="font-bold">You.com</span>
            <span className="hidden lg:inline text-[10px] uppercase font-mono px-1 py-0.2 rounded bg-sky-500/20 text-sky-300">MCP</span>
          </button>
        )}

        {/* Fibrin Network Inspector (Panels A–F) */}
        <button
          onClick={onOpenFibrinInspector}
          title="Fibrin Network: 3D Microstructural Inspector (Panels A–F)"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border rounded-lg transition-all shadow-xs ${
            isDarkTheme
              ? 'bg-[#deb35a]/15 hover:bg-[#deb35a]/25 text-[#deb35a] border-[#deb35a]/40'
              : 'bg-amber-50 hover:bg-amber-100 text-[#b08d46] border-amber-300'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#deb35a]" />
          <span className="hidden md:inline">Fibrin Panels A–F</span>
        </button>

        {/* Theme Switcher */}
        <button
          onClick={onToggleTheme}
          title={isDarkTheme ? 'Switch to Light Gray Laboratory' : 'Switch to Dark Obsidian'}
          className={`p-2 rounded-lg border transition-colors ${
            isDarkTheme
              ? 'text-[#8a8f9d] hover:text-white bg-[#131416] hover:bg-[#1c1d22] border-[#2a2b2e]'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-300'
          }`}
        >
          {isDarkTheme ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Reset View */}
        <button
          onClick={onResetCamera}
          title="Reset Camera & Center View"
          className={`p-2 rounded-lg border transition-colors ${
            isDarkTheme
              ? 'text-[#8a8f9d] hover:text-white bg-[#131416] hover:bg-[#1c1d22] border-[#2a2b2e]'
              : 'text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-300'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
        </button>


        {/* Bio Targets Inspector */}
        <button
          onClick={onOpenBioTargets}
          title="Inspect Molecular Targets (UniProt, ChEMBL, PDB)"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap ${
            isDarkTheme
              ? 'text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30'
              : 'text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
          }`}
        >
          <Dna className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden sm:inline">Bio Targets</span>
        </button>

        {/* Medical Imaging AI Studio */}
        <button
          onClick={onOpenImageStudio}
          title="Synthesize and Edit Medical Images with gemini-nano-banana-2.1"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap ${
            isDarkTheme
              ? 'text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 border-sky-500/30'
              : 'text-sky-800 hover:text-sky-950 bg-sky-50 hover:bg-sky-100 border-sky-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
          <span className="hidden md:inline">Imaging AI</span>
        </button>

        {/* Video Simulation Studio */}
        <button
          onClick={onOpenVideoStudio}
          title="Generate Simulation Videos with gemini-omni-1.1-flash"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap ${
            isDarkTheme
              ? 'text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30'
              : 'text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border-amber-200'
          }`}
        >
          <Film className="w-3.5 h-3.5 text-amber-500" />
          <span className="hidden md:inline">Video Sim</span>
        </button>

        {/* Scientific Provenance */}
        <button
          onClick={onOpenProvenance}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors whitespace-nowrap ${
            isDarkTheme
              ? 'text-[#c5c9d3] hover:text-white bg-[#131416] hover:bg-[#1c1d22] border-[#2a2b2e]'
              : 'text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border-slate-300'
          }`}
        >
          <Info className="w-3.5 h-3.5 text-[#b08d46]" />
          <span className="hidden sm:inline">Provenance</span>
        </button>

        {/* WebXR Spatial Button */}
        <button
          onClick={onToggleXR}
          title={isXRSupported ? 'Enter WebXR Spatial Session' : 'Spatial 3D Ready (Quest & Vision Pro)'}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-black bg-[#e6b65c] hover:bg-[#f3ca76] rounded-lg transition-colors whitespace-nowrap shadow-sm"
        >
          <Glasses className="w-3.5 h-3.5" />
          <span>Spatial</span>
        </button>
      </div>
    </header>
  );
};
