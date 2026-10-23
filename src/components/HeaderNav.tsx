/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Eye, Glasses, Info, RotateCcw } from 'lucide-react';
import { ScaleLevel } from '../types/biomedical.ts';

interface HeaderNavProps {
  currentScale: ScaleLevel;
  onSelectScale: (scale: ScaleLevel) => void;
  onOpenProvenance: () => void;
  onResetCamera: () => void;
  onToggleXR: () => void;
  isXRSupported: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentScale,
  onSelectScale,
  onOpenProvenance,
  onResetCamera,
  onToggleXR,
  isXRSupported,
}) => {
  const scaleTabs: { id: ScaleLevel; label: string; metric: string }[] = [
    { id: 'microscopic', label: 'Microscopic Fibrin', metric: '50 µm' },
    { id: 'clot', label: 'Clot Architecture', metric: '4 mm' },
    { id: 'vessel', label: 'Artery Cutaway', metric: '8 mm' },
    { id: 'thoracic', label: 'Thoracic Organ', metric: '30 cm' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between gap-8 px-6 py-3.5 bg-[#080808]/90 border-b border-[#2a2b2e] select-none">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
          Pulmonary Embolism
        </span>
        <span className="text-xs text-[#a0a5b0] whitespace-nowrap hidden sm:inline">
          Disease Intelligence Engine
        </span>
      </div>

      {/* Zone 2: Scale Navigation Tabs */}
      <nav className="flex items-center gap-1.5 p-1 bg-[#131416] border border-[#2a2b2e] rounded-lg">
        {scaleTabs.map((tab) => {
          const isActive = currentScale === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectScale(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#202227] text-[#e6b65c] shadow-sm'
                  : 'text-[#8a8f9d] hover:text-white hover:bg-[#1a1b1f]'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[11px] font-mono text-[#6c7280]">
                {tab.metric}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onResetCamera}
          title="Reset View"
          className="p-2 text-[#8a8f9d] hover:text-white bg-[#131416] hover:bg-[#1c1d22] border border-[#2a2b2e] rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenProvenance}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#c5c9d3] hover:text-white bg-[#131416] hover:bg-[#1c1d22] border border-[#2a2b2e] rounded-lg transition-colors whitespace-nowrap"
        >
          <Info className="w-3.5 h-3.5 text-[#b08d46]" />
          <span>Scientific Provenance</span>
        </button>

        <button
          onClick={onToggleXR}
          title={isXRSupported ? 'Enter WebXR Immersive Session' : 'Desktop 3D (XR Ready for Quest / Vision Pro)'}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-black bg-[#e6b65c] hover:bg-[#f3ca76] rounded-lg transition-colors whitespace-nowrap"
        >
          <Glasses className="w-3.5 h-3.5" />
          <span>{isXRSupported ? 'Enter VR / Spatial' : 'WebXR Mode'}</span>
        </button>
      </div>
    </header>
  );
};
