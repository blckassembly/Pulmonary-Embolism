/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { ScaleLevel } from '../types/biomedical.ts';

interface HeroSliderProps {
  progress: number; // 0.0 to 1.0
  onProgressChange: (val: number) => void;
  currentScale: ScaleLevel;
  onSelectScale: (scale: ScaleLevel) => void;
  isUpsideDown: boolean;
  onToggleUpsideDown: () => void;
  showAdvancedTools: boolean;
  onToggleAdvancedTools: () => void;
  isDarkTheme: boolean;
}

export const HeroSlider: React.FC<HeroSliderProps> = ({
  progress,
  onProgressChange,
  currentScale,
  onSelectScale,
  isUpsideDown,
  onToggleUpsideDown,
  showAdvancedTools,
  onToggleAdvancedTools,
  isDarkTheme,
}) => {
  const scaleMilestones: { label: string; metric: string; p: number; id: ScaleLevel }[] = [
    { label: 'Microscopic Fibrin', metric: '50 µm', p: 0.08, id: 'microscopic' },
    { label: 'Clot Architecture', metric: '4 mm', p: 0.35, id: 'clot' },
    { label: 'Artery Cutaway', metric: '8 mm', p: 0.62, id: 'vessel' },
    { label: 'Thoracic Organ', metric: '30 cm', p: 0.92, id: 'thoracic' },
  ];

  const handleZoomInAllTheWay = () => {
    onProgressChange(0.0);
  };

  const handleZoomOutAllTheWay = () => {
    onProgressChange(1.0);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 w-[94vw] max-w-[880px] select-none transition-all duration-300">
      {/* Clean Glassmorphic Hero Control Dock */}
      <div
        className={`rounded-2xl border shadow-xl p-3 sm:p-4 transition-colors ${
          isDarkTheme
            ? 'bg-[#131416]/90 border-[#2a2b2e] text-white backdrop-blur-md shadow-2xl'
            : 'bg-white/90 border-slate-200/80 text-slate-900 backdrop-blur-md shadow-slate-200/50'
        }`}
      >
        {/* Top Row: Quick Milestones & Controls */}
        <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className={`text-xs font-semibold tracking-wide uppercase ${
                isDarkTheme ? 'text-[#e6b65c]' : 'text-[#b08d46]'
              }`}
            >
              Multiscale Hero Journey
            </span>
            <span
              className={`text-[11px] font-mono ${
                isDarkTheme ? 'text-[#8a8f9d]' : 'text-slate-500'
              }`}
            >
              · Parallax Scrub
            </span>
          </div>

          {/* Quick Action Pills */}
          <div className="flex items-center gap-1.5">
            {/* Zoom In All The Way */}
            <button
              onClick={handleZoomInAllTheWay}
              title="Zoom In All The Way (Microscopic Fibrin Mesh Chamber)"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                progress <= 0.05
                  ? isDarkTheme
                    ? 'bg-[#202227] text-[#e6b65c] border-[#e6b65c]'
                    : 'bg-slate-100 text-[#b08d46] border-[#b08d46]'
                  : isDarkTheme
                  ? 'text-[#c5c9d3] hover:text-white bg-[#1a1b1f] border-[#2a2b2e]'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-50 border-slate-200'
              }`}
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Zoom All The Way</span>
            </button>

            {/* Turn Screen Upside Down (180° Flip) */}
            <button
              onClick={onToggleUpsideDown}
              title={
                isUpsideDown
                  ? 'Restore Standard Orientation'
                  : 'Turn Screen / Anatomy Upside Down (180° Orientation Flip)'
              }
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                isUpsideDown
                  ? 'bg-[#e6b65c] text-black border-[#e6b65c] font-semibold'
                  : isDarkTheme
                  ? 'text-[#c5c9d3] hover:text-white bg-[#1a1b1f] border-[#2a2b2e]'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-50 border-slate-200'
              }`}
            >
              <RotateCw
                className={`w-3.5 h-3.5 transition-transform duration-500 ${
                  isUpsideDown ? 'rotate-180' : ''
                }`}
              />
              <span className="hidden sm:inline">
                {isUpsideDown ? 'Inverted 180°' : 'Turn Upside Down'}
              </span>
            </button>

            {/* Toggle Detailed Scientific Tools below */}
            <button
              onClick={onToggleAdvancedTools}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${
                showAdvancedTools
                  ? isDarkTheme
                    ? 'bg-[#202227] text-white border-slate-600'
                    : 'bg-slate-200 text-slate-900 border-slate-300'
                  : isDarkTheme
                  ? 'text-[#8a8f9d] hover:text-white bg-[#1a1b1f] border-[#2a2b2e]'
                  : 'text-slate-500 hover:text-slate-900 bg-slate-50 border-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {showAdvancedTools ? 'Hide Tools' : 'Scientific Tools'}
              </span>
              {showAdvancedTools ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Hero Continuous Parallax Slider Rail */}
        <div className="relative py-1">
          <input
            type="range"
            min="0"
            max="1"
            step="0.005"
            value={progress}
            onChange={(e) => onProgressChange(parseFloat(e.target.value))}
            className="w-full h-2.5 bg-gradient-to-r from-[#b08d46] via-[#3b82f6] to-[#64748b] rounded-lg appearance-none cursor-ew-resize accent-[#b08d46] focus:outline-none"
          />

          {/* Milestone Step Buttons underneath rail */}
          <div className="flex justify-between items-center mt-2 px-1">
            {scaleMilestones.map((m) => {
              const isActive = currentScale === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onSelectScale(m.id)}
                  className={`flex flex-col items-center transition-colors ${
                    isActive
                      ? isDarkTheme
                        ? 'text-[#e6b65c] font-semibold'
                        : 'text-[#b08d46] font-semibold'
                      : isDarkTheme
                      ? 'text-[#8a8f9d] hover:text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <span className="text-[11px] sm:text-xs tracking-tight">
                    {m.label}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {m.metric}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
